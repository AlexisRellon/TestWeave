import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import type { CliContext } from './context.js';
import { workspacePath } from '../engine/files.js';
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
  if (options.model || options.context || options.module || options.baseUrl) throw new Error('--model, --context, --module and --base-url require --provider');
  const artifact = generateExport(await context.store.read(), {
    target: options.target, format: options.format, ...(options.projectKey ? { projectKey: options.projectKey } : {}),
  });
  await emit(context, artifact.content, options.output);
}
async function emit(context: CliContext, content: string, output?: string): Promise<void> {
  if (!output || output === '-') { context.output.log(content.trimEnd()); return; }
  const target = await workspacePath(context.root, output);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, { encoding: 'utf8', flag: 'wx' });
  context.output.error(`Wrote ${target}`);
}
