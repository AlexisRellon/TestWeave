import { fileURLToPath } from 'node:url';
import { runtimeLaunch } from './runtime.js';
import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';

const rootSchema = z.object({ servers: z.record(z.string(), z.unknown()).optional() }).passthrough();
export interface VsCodeServerConfig { type: 'stdio'; command: string; args: string[] }
export function vscodeServerConfig(root: string): VsCodeServerConfig {
  const launch = runtimeLaunch(fileURLToPath(new URL('../cli/index.js', import.meta.url)));
  return { type: 'stdio', command: launch.command, args: [...launch.args, '--cwd', root, 'mcp'] };
}
function parseConfig(text: string): z.infer<typeof rootSchema> {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });
  if (errors.length) throw new Error('Invalid .vscode/mcp.json; repair JSON syntax before installing TestWeave');
  return rootSchema.parse(value);
}
export async function installVsCodeServer(root: string): Promise<void> {
  const file = await workspacePath(root, '.vscode/mcp.json');
  const text = await readOptional(file) ?? '{}\n';
  parseConfig(text);
  const edits = modify(text, ['servers', 'testweave'], vscodeServerConfig(root), {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  });
  await atomicWrite(file, applyEdits(text, edits));
}
export async function hasVsCodeServer(root: string): Promise<boolean> {
  const text = await readOptional(await workspacePath(root, '.vscode/mcp.json'));
  if (text === undefined) return false;
  const value = parseConfig(text).servers?.testweave;
  const server = z.object({ type: z.literal('stdio'), command: z.string(), args: z.array(z.string()) }).safeParse(value);
  return server.success && JSON.stringify(server.data) === JSON.stringify(vscodeServerConfig(root));
}
