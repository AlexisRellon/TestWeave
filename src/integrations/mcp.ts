import { fileURLToPath } from 'node:url';
import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';
import { runtimeLaunch } from './runtime.js';

export interface McpTarget { file: string; key: 'mcpServers' | 'servers'; type?: 'stdio' }
const targets: Record<string, McpTarget> = {
  cursor: { file: '.cursor/mcp.json', key: 'mcpServers' },
  claude: { file: '.mcp.json', key: 'mcpServers' },
  'claude-code': { file: '.mcp.json', key: 'mcpServers' },
  vscode: { file: '.vscode/mcp.json', key: 'servers', type: 'stdio' },
};

export function mcpTarget(integration: string): McpTarget | undefined {
  return Object.hasOwn(targets, integration) ? targets[integration] : undefined;
}

export function mcpServerConfig(root: string, target: McpTarget): { type?: 'stdio'; command: string; args: string[] } {
  const launch = runtimeLaunch(fileURLToPath(new URL('../cli/index.js', import.meta.url)));
  return { ...(target.type ? { type: target.type } : {}), command: launch.command, args: [...launch.args, '--cwd', root, 'mcp'] };
}

function parseConfig(text: string, target: McpTarget): Record<string, unknown> {
  const errors: ParseError[] = [];
  const value: unknown = parse(text, errors, { allowTrailingComma: true });
  if (errors.length) throw new Error(`Invalid ${target.file}; repair JSON syntax before installing TestWeave`);
  const result = z.object({ [target.key]: z.record(z.string(), z.unknown()).optional() }).passthrough().safeParse(value);
  if (!result.success) throw new Error(`Invalid ${target.file}; expected an object with an optional ${target.key} object`);
  return result.data;
}

export async function installMcpServer(root: string, target: McpTarget): Promise<void> {
  const file = await workspacePath(root, target.file);
  const text = await readOptional(file) ?? '{}\n';
  parseConfig(text, target);
  const output = applyEdits(text, modify(text, [target.key, 'testweave'], mcpServerConfig(root, target), {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  }));
  if (output !== text) await atomicWrite(file, output);
}

export async function hasMcpServer(root: string, target: McpTarget): Promise<boolean> {
  const text = await readOptional(await workspacePath(root, target.file));
  if (text === undefined) return false;
  const servers = parseConfig(text, target)[target.key] as Record<string, unknown> | undefined;
  const server = z.object({ type: z.literal('stdio').optional(), command: z.string(), args: z.array(z.string()) }).safeParse(servers?.testweave);
  return server.success && JSON.stringify(server.data) === JSON.stringify(mcpServerConfig(root, target));
}
