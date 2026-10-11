import { z } from 'zod';
import type { CliContext } from './context.js';
import { installMcpServer, mcpProviderConfig, mcpTarget, type McpTarget } from '../integrations/mcp.js';
import { tomlServerEntry } from '../integrations/mcp-toml.js';

const keySchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]*$/)
  .refine((key) => !['__proto__', 'constructor', 'prototype'].includes(key), 'Reserved config key');

function providerTarget(root: string, provider: string): McpTarget {
  const target = mcpTarget(provider, root);
  if (!target) throw new Error(`No verified project MCP registration for ${provider}; use mcp config for manual configuration`);
  return target;
}

export async function runMcpConfig(context: CliContext, options: unknown): Promise<void> {
  const { format, key, provider } = z.object({
    format: z.enum(['json', 'toml']).optional(),
    key: keySchema.optional(),
    provider: z.string().min(1).optional(),
  }).parse(options);
  if (provider && key) throw new Error('Use either --provider or --key');
  const target = provider ? providerTarget(context.root, provider) : { file: '', key: key ?? 'mcpServers' };
  const outputFormat = format ?? target.format ?? 'json';
  if (provider && outputFormat !== (target.format ?? 'json')) throw new Error(`Use ${target.format ?? 'json'} output for ${provider}`);
  const server = mcpProviderConfig(context.root, target);
  context.output.log(outputFormat === 'toml'
    ? tomlServerEntry(server, target.arrayTable).trimEnd()
    : JSON.stringify({ [target.key]: { testweave: mcpProviderConfig(context.root, target) } }, null, 2));
}

export async function runMcpInstall(context: CliContext, options: unknown): Promise<void> {
  const { config, key, provider } = z.object({
    config: z.string().min(1).optional(),
    key: keySchema.optional(),
    provider: z.string().min(1).optional(),
  }).parse(options);
  if (provider && (config || key)) throw new Error('Use either --provider or --config/--key');
  if (!provider && !config) throw new Error('Specify --provider or --config');
  const target = provider ? providerTarget(context.root, provider) : { file: config!, key: key ?? 'mcpServers' };
  await installMcpServer(context.root, target);
  context.output.log(`Configured TestWeave MCP in ${target.file}`);
}
