import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parse } from 'jsonc-parser';
import { installIdeRules, hasIdeRules } from '../src/integrations/ide.js';
import { installMcpServer, mcpServerConfig, mcpTarget } from '../src/integrations/mcp.js';
import { runInit } from '../src/cli/init.js';
import { runUpdate } from '../src/cli/update.js';
import { diagnose, repair } from '../src/engine/doctor.js';
import { repositoryFixture, temporaryDirectory } from './helpers.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

for (const integration of ['cursor', 'claude', 'claude-code', 'vscode']) {
  test(`${integration} setup preserves MCP settings and is idempotent`, async (t) => {
    const root = await temporaryDirectory(t);
    const target = mcpTarget(integration)!;
    const file = path.join(root, target.file);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, `{\n // Team configuration\n "${target.key}": { "other": { "command": "team-tool" }, },\n "settings": { "keep": true },\n}\n`);
    await installIdeRules(root, [integration]);
    const first = await readFile(file, 'utf8');
    assert.match(first, /Team configuration/);
    assert.deepEqual(parse(first).settings, { keep: true });
    assert.deepEqual(parse(first)[target.key].other, { command: 'team-tool' });
    assert.deepEqual(parse(first)[target.key].testweave, mcpServerConfig(root, target));
    assert.equal(await hasIdeRules(root, integration), true);
    await installIdeRules(root, [integration]);
    assert.equal(await readFile(file, 'utf8'), first);
  });

  test(`${integration} refuses malformed MCP config without overwriting it`, async (t) => {
    const root = await temporaryDirectory(t);
    const target = mcpTarget(integration)!;
    const file = path.join(root, target.file);
    await mkdir(path.dirname(file), { recursive: true });
    for (const invalid of ['{ broken', 'null', '[]', `{ "${target.key}": [] }`]) {
      await writeFile(file, invalid);
      await assert.rejects(installMcpServer(root, target), /Invalid/);
      assert.equal(await readFile(file, 'utf8'), invalid);
    }
  });
}

test('setup configures MCP, update refreshes launch paths, and doctor repairs missing servers', async (t) => {
  const { context } = await repositoryFixture(t);
  const root = context.root;
  await runInit(context, { yes: true });
  const target = mcpTarget('cursor')!;
  const file = path.join(root, target.file);
  const configured = JSON.parse(await readFile(file, 'utf8'));
  configured.mcpServers.testweave.command = '/obsolete/node';
  configured.mcpServers.other = { command: 'preserve-tool' };
  await writeFile(file, JSON.stringify(configured));
  assert.equal(await hasIdeRules(root, 'cursor'), false);
  await runUpdate(context, { yes: true });
  assert.equal(await hasIdeRules(root, 'cursor'), true);
  assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).mcpServers.other, { command: 'preserve-tool' });
  await rm(file);
  const checks = await diagnose(context);
  assert.equal(checks.find((check) => check.id === 'ide:cursor')?.repairable, true);
  assert.ok((await repair(context, checks)).every((check) => check.ok));

  // Refresh through the installed entrypoint to verify the compiled launch path.
  await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../dist/cli/index.js', import.meta.url)), '--cwd', root, 'update', '--yes']);
  const server = JSON.parse(await readFile(file, 'utf8')).mcpServers.testweave;
  const client = new Client({ name: 'automatic-mcp-test', version: '1.0.0' });
  try {
    await client.connect(new StdioClientTransport({ command: server.command, args: server.args, stderr: 'pipe' }));
    assert.equal((await client.listTools()).tools.length, 3);
    assert.equal((await client.listResources()).resources.length, 1);
  } finally { await client.close(); }
});

test('unselected clients do not receive MCP configuration', async (t) => {
  const root = await temporaryDirectory(t);
  await installIdeRules(root, ['universal']);
  for (const integration of ['cursor', 'claude', 'vscode']) {
    await assert.rejects(readFile(path.join(root, mcpTarget(integration)!.file)), { code: 'ENOENT' });
  }
  assert.equal(mcpTarget('unsupported'), undefined);
  assert.equal(mcpTarget('constructor'), undefined);
});

test('MCP installation refuses paths resolving outside the project', async (t) => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  await symlink(outside, path.join(root, '.cursor'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(installMcpServer(root, mcpTarget('cursor')!), /outside the workspace/);
  await assert.rejects(readFile(path.join(outside, 'mcp.json')), { code: 'ENOENT' });
});
