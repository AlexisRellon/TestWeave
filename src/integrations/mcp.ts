import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { applyEdits, modify, parse, type ParseError } from 'jsonc-parser';
import { z } from 'zod';
import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';
import { runtimeLaunch } from './runtime.js';
import { mergeMcpToml, parseMcpToml } from './mcp-toml.js';

export interface McpTarget {
  file: string;
  key: string;
  type?: 'stdio';
  format?: 'toml';
  arrayTable?: boolean;
  commandArray?: boolean;
  alternatives?: string[];
}
const targets: Record<string, McpTarget> = {
  cursor: { file: '.cursor/mcp.json', key: 'mcpServers' },
  claude: { file: '.mcp.json', key: 'mcpServers' },
  'claude-code': { file: '.mcp.json', key: 'mcpServers' },
  vscode: { file: '.vscode/mcp.json', key: 'servers', type: 'stdio' },
  amp: { file: '.amp/settings.json', key: 'amp.mcpServers' },
  bob: { file: '.bob/mcp.json', key: 'mcpServers' },
  deepagents: { file: '.mcp.json', key: 'mcpServers' },
  firebender: { file: 'firebender.json', key: 'mcpServers', type: 'stdio' },
  'command-code': { file: '.mcp.json', key: 'mcpServers' },
  forgecode: { file: '.mcp.json', key: 'mcpServers' },
  'posit-assistant': { file: '.posit/assistant/settings.json', key: 'mcpServers', commandArray: true },
  codex: { file: '.codex/config.toml', key: 'mcp_servers', format: 'toml' },
  grok: { file: '.grok/config.toml', key: 'mcp_servers', format: 'toml' },
  'mistral-vibe': { file: '.vibe/config.toml', key: 'mcp_servers', format: 'toml', arrayTable: true },
  pochi: { file: '.pochi/config.jsonc', key: 'mcp' },
  continue: { file: '.continue/mcpServers/testweave.json', key: 'mcpServers' },
  'gemini-cli': { file: '.gemini/settings.json', key: 'mcpServers' },
  'github-copilot': { file: '.mcp.json', key: 'mcpServers' },
  'qwen-code': { file: '.qwen/settings.json', key: 'mcpServers' },
  'kimi-code-cli': { file: '.kimi-code/mcp.json', key: 'mcpServers' },
  'kiro-cli': { file: '.kiro/settings/mcp.json', key: 'mcpServers' },
  roo: { file: '.roo/mcp.json', key: 'mcpServers' },
  droid: { file: '.factory/mcp.json', key: 'mcpServers', type: 'stdio' },
  qoder: { file: '.qoder/settings.json', key: 'mcpServers' },
  junie: { file: '.junie/mcp/mcp.json', key: 'mcpServers' },
  opencode: { file: 'opencode.json', key: 'mcp', commandArray: true, alternatives: ['opencode.jsonc'] },
  kilo: { file: '.kilo/kilo.jsonc', key: 'mcp', commandArray: true, alternatives: ['kilo.jsonc', 'kilo.json', '.kilo/kilo.json'] },
};

export const MCP_INTEGRATIONS = Object.keys(targets);

export function mcpTarget(integration: string, root?: string): McpTarget | undefined {
  if (!Object.hasOwn(targets, integration)) return undefined;
  const target = targets[integration]!;
  const file = root && [...target.alternatives ?? [], target.file].find((file) => existsSync(path.join(root, file)));
  return file ? { ...target, file } : target;
}

export function mcpServerConfig(root: string, target: McpTarget): { type?: 'stdio'; command: string; args: string[] } {
  const launch = runtimeLaunch(fileURLToPath(new URL('../cli/index.js', import.meta.url)));
  return { ...(target.type ? { type: target.type } : {}), command: launch.command, args: [...launch.args, '--cwd', root, 'mcp'] };
}

export function mcpProviderConfig(root: string, target: McpTarget) {
  const server = mcpServerConfig(root, target);
  if (target.arrayTable) return { name: 'testweave', transport: 'stdio' as const, ...server };
  return target.commandArray
    ? { type: 'local' as const, command: [server.command, ...server.args], enabled: true }
    : server;
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
  if (target.format === 'toml') {
    const text = await readOptional(file) ?? '';
    const output = mergeMcpToml(text, target.file, mcpProviderConfig(root, target), target.arrayTable);
    if (output !== text) await atomicWrite(file, output);
    return;
  }
  const text = await readOptional(file) ?? '{}\n';
  parseConfig(text, target);
  const output = applyEdits(text, modify(text, [target.key, 'testweave'], mcpProviderConfig(root, target), {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  }));
  if (output !== text) await atomicWrite(file, output);
}

export async function hasMcpServer(root: string, target: McpTarget): Promise<boolean> {
  const text = await readOptional(await workspacePath(root, target.file));
  if (text === undefined) return false;
  const servers = target.format === 'toml'
    ? parseMcpToml(text, target.file, target.arrayTable).data.mcp_servers
    : parseConfig(text, target)[target.key] as Record<string, unknown> | undefined;
  const entry = Array.isArray(servers) ? servers.find((entry) => entry.name === 'testweave') : servers?.testweave;
  if (entry && typeof entry === 'object' && 'url' in entry) return false;
  const schema = target.arrayTable
    ? z.object({ name: z.literal('testweave'), transport: z.literal('stdio'), command: z.string(), args: z.array(z.string()) })
    : target.commandArray
    ? z.object({ type: z.literal('local'), command: z.array(z.string()), enabled: z.literal(true) })
    : z.object({ type: z.literal('stdio').optional(), command: z.string(), args: z.array(z.string()) });
  const server = schema.safeParse(entry);
  return server.success && JSON.stringify(server.data) === JSON.stringify(mcpProviderConfig(root, target));
}
