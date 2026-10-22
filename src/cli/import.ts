import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import type { CliContext } from './context.js';
import { workspacePath } from '../engine/files.js';
import { importCases, importOptionsSchema } from '../integrations/importers.js';
import { testModuleSchema } from '../schema/test-truth.js';

export async function runImport(context: CliContext, file: string, input: unknown): Promise<void> {
  const options = importOptionsSchema.parse(input);
  const target = await workspacePath(context.root, file);
  const info = await stat(target);
  if (!info.isFile() || info.size > 10_000_000) throw new Error('Import must be a file no larger than 10 MB');
  const tests = importCases(await readFile(target, 'utf8'), options.source, options.format);
  const contract = await context.store.read();
  const existing = contract.modules.find((module) => module.id === options.module);
  if (!existing && !options.paths) throw new Error('New modules require --paths');
  for (const test of tests) {
    const before = existing?.tests.find((entry) => entry.id === test.id);
    if (before && JSON.stringify(before) !== JSON.stringify(test)) throw new Error(`Existing case differs: ${test.id}; review it before replacing`);
  }
  const module = testModuleSchema.parse(existing ? { ...existing,
    tests: [...existing.tests, ...tests.filter((test) => !existing.tests.some((entry) => entry.id === test.id))],
  } : { id: options.module, name: options.name ?? options.module,
    description: `Manual QA definitions imported from ${options.source} (${path.basename(file)}).`,
    paths: options.paths!.split(',').map((pattern) => pattern.trim()), tests });
  await context.store.upsert(module, contract);
  context.output.log(`Imported ${tests.length} test definitions into ${module.id}.`);
}
