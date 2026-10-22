import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { CliContext } from './context.js';
import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';
import { exportOptionsSchema, generateExport } from '../integrations/exporters.js';
import { createModuleAuthor, providerSchema } from '../llm/factory.js';
import { readSpecSlice } from '../engine/specs.js';
import { specContext } from '../engine/queries.js';
import { wireJson } from '../engine/wire.js';

export const generateOptionsSchema = exportOptionsSchema.extend({
  output: z.string().min(1).optional(), provider: providerSchema.optional(),
  model: z.string().min(1).optional(), context: z.string().min(1).optional(), module: z.string().min(1).optional(),
  baseUrl: z.string().min(1).optional(), compact: z.boolean().optional(),
});
export type GenerateOptions = z.infer<typeof generateOptionsSchema>;
export async function runGenerate(context: CliContext, input: unknown): Promise<void> {
  const options = generateOptionsSchema.parse(input);
  if (options.provider) {
    if (options.tags || options.priority || options.changedSince) throw new Error('--tags, --priority and --changed-since filter exports; they cannot be used with --provider');
    if (!options.model || (!options.context && !options.module)) throw new Error('AI authoring requires --model and --context or --module; only scoped context is sent');
    const contract = await context.store.read();
    const existing = options.module ? contract.modules.find((module) => module.id === options.module) : undefined;
    if (options.module && !existing) throw new Error(`Unknown module: ${options.module}`);
    const scoped = existing ? await specContext(context.root, contract, existing.id) : undefined;
    const source = wireJson({ ...(options.context ? { context: await readSpecSlice(context.root, options.context) } : {}), ...(scoped ?? {}) }, options.compact);
    const author = await createModuleAuthor(options.provider, options.model, process.env, options.baseUrl);
    const draft = await author.author({ context: source, ...(existing ? { existing } : {}), ...(options.compact ? { compact: true } : {}) });
    await emit(context, wireJson(draft, options.compact) + '\n', options.output);
    return;
  }
  if (options.model || options.context || options.baseUrl) throw new Error('--model, --context and --base-url require --provider');
  const changedFiles = options.changedSince ? await context.git.changedFiles(await context.git.resolve(options.changedSince)) : undefined;
  let drift: Record<string, string> = {};
  if (['obsidian', 'canvas', 'graph'].includes(options.target)) {
    let base = options.changedSince;
    if (!base) base = await context.git.upstream().catch(() => undefined);
    if (base) {
      const report = await context.analyzer.analyze({ base });
      const contract = await context.store.read();
      drift = Object.fromEntries(contract.modules.map((module) => [module.id,
        report.issues.find((issue) => issue.moduleId === module.id)?.kind ?? 'aligned']));
    }
  }
  const artifact = generateExport(await context.store.read(), {
    target: options.target, format: options.format, ...(options.projectKey ? { projectKey: options.projectKey } : {}),
    ...(options.module ? { module: options.module } : {}), ...(options.tags ? { tags: options.tags } : {}),
    ...(options.priority ? { priority: options.priority } : {}), ...(options.changedSince ? { changedSince: options.changedSince } : {}),
  }, { ...(changedFiles ? { changedFiles } : {}), drift });
  if (artifact.files && options.output && options.output !== '-') {
    const start = '---\n# testweave:projection:start';
    const end = '<!-- testweave:projection:end -->';
    const pending = [];
    for (const [file, content] of Object.entries(artifact.files)) {
      const target = await workspacePath(context.root, path.posix.join(options.output, file));
      const existing = await readOptional(target);
      if (content.includes(start) || content.includes(end)) throw new Error('Projection content contains reserved managed markers');
      if (existing !== undefined && (!existing.startsWith(start) || existing.split(start).length !== 2 ||
        existing.split(end).length !== 2 || existing.indexOf(end) < existing.indexOf(start))) {
        throw new Error(`Refusing to overwrite an unmanaged note: ${target}`);
      }
      const block = `${start}\n${content.slice(4)}${end}`;
      pending.push({ target, content: existing === undefined ? block + '\n'
        : existing.slice(0, existing.indexOf(start)) + block + existing.slice(existing.indexOf(end) + end.length) });
    }
    for (const note of pending) await atomicWrite(note.target, note.content);
    context.output.error(`Wrote ${pending.length} Obsidian notes`);
    return;
  }
  await emit(context, artifact.content, options.output);
}
async function emit(context: CliContext, content: string, output?: string): Promise<void> {
  if (!output || output === '-') { context.output.log(content.trimEnd()); return; }
  const target = await workspacePath(context.root, output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { encoding: 'utf8', flag: 'wx' });
  context.output.error(`Wrote ${target}`);
}
