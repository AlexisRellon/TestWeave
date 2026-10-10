import { installMcpServer, hasMcpServer, mcpServerConfig, type McpTarget } from './mcp.js';

const target: McpTarget = { file: '.vscode/mcp.json', key: 'servers', type: 'stdio' };
export interface VsCodeServerConfig { type: 'stdio'; command: string; args: string[] }
export function vscodeServerConfig(root: string): VsCodeServerConfig {
  return { ...mcpServerConfig(root, target), type: 'stdio' };
}
export async function installVsCodeServer(root: string): Promise<void> {
  await installMcpServer(root, target);
}
export async function hasVsCodeServer(root: string): Promise<boolean> {
  return hasMcpServer(root, target);
}
