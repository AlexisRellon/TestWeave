import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parse } from 'jsonc-parser';
import { installIdeRules, hasIdeRules } from '../src/integrations/ide.js';
import { installMcpServer, mcpServerConfig, mcpProviderConfig, mcpTarget, hasMcpServer, MCP_INTEGRATIONS } from '../src/integrations/mcp.js';
import { getStaticTOMLValue, parseTOML } from 'toml-eslint-parser';
import { runInit } from '../src/cli/init.js';
import { runUpdate } from '../src/cli/update.js';
import { diagnose, repair } from '../src/engine/doctor.js';
import { repositoryFixture, temporaryDirectory } from './helpers.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { runMcpConfig, runMcpInstall } from '../src/cli/mcp.js';
import { detectIntegrations } from '../src/integrations/config.js';
import { SELECTABLE_AGENTS } from '../src/cli/agent-selector.js';

test('custom client injection preserves JSONC and validates config and workspace paths', async (t) => {
  const { context } = await repositoryFixture(t);
  const file = path.join(context.root, 'custom-client.json');
  await writeFile(file, '{\n // Preserve custom client\n "customServers": { "other": { "command": "keep" }, },\n}\n');
  await runMcpInstall(context, { config: 'custom-client.json', key: 'customServers' });
  const first = await readFile(file, 'utf8');
  assert.match(first, /Preserve custom client/);
  assert.equal(parse(first).customServers.other.command, 'keep');
  assert.deepEqual(parse(first).customServers.testweave, mcpServerConfig(context.root, { file: '', key: 'customServers' }));
  await runMcpInstall(context, { config: 'custom-client.json', key: 'customServers' });
  assert.equal(await readFile(file, 'utf8'), first);
  await assert.rejects(runMcpInstall(context, { config: '../outside.json' }), /inside the workspace/);
  await assert.rejects(runMcpInstall(context, { config: 'custom-client.json', key: '__proto__' }), /Reserved/);
  await writeFile(file, '{"customServers": []}');
  await assert.rejects(runMcpInstall(context, { config: 'custom-client.json', key: 'customServers' }), /Invalid/);
  assert.equal(await readFile(file, 'utf8'), '{"customServers": []}');
});

test('compiled CLI exports generic JSON and Codex TOML and injects custom configs', async (t) => {
  const { context } = await repositoryFixture(t);
  const cli = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
  const exec = promisify(execFile);
  const { stdout } = await exec(process.execPath, [cli, '--cwd', context.root, 'mcp', 'config']);
  const server = JSON.parse(stdout).mcpServers.testweave;
  await exec(process.execPath, [cli, '--cwd', context.root, 'mcp', 'install', '--config', '.custom/mcp.json', '--key', 'servers']);
  assert.deepEqual(JSON.parse(await readFile(path.join(context.root, '.custom/mcp.json'), 'utf8')).servers.testweave, server);
  const toml = await exec(process.execPath, [cli, '--cwd', context.root, 'mcp', 'config', '--format', 'toml']);
  assert.equal(toml.stdout, `[mcp_servers.testweave]\ncommand = ${JSON.stringify(server.command)}\nargs = ${JSON.stringify(server.args)}\n`);
  await assert.rejects(runMcpConfig(context, { format: 'yaml' }));
  const client = new Client({ name: 'custom-client-test', version: '1.0.0' });
  try {
    await client.connect(new StdioClientTransport({ ...server, stderr: 'pipe' }));
    assert.equal((await client.listTools()).tools.length, 3);
    const result = await client.callTool({ name: 'generate_qa_export', arguments: { target: 'xray', format: 'csv' } });
    assert.notEqual(result.isError, true);
    assert.equal((await client.listResources()).resources.length, 1);
  } finally { await client.close(); }
});

for (const integration of MCP_INTEGRATIONS.filter((id) => mcpTarget(id)!.format !== 'toml')) {
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
    assert.deepEqual(parse(first)[target.key].testweave, mcpProviderConfig(root, target));
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

test('Codex TOML installation preserves comments, other servers and multiline values', async (t) => {
  const root = await temporaryDirectory(t);
  const target = mcpTarget('codex')!;
  const file = path.join(root, target.file);
  await installIdeRules(root, ['codex']);
  assert.equal(await hasIdeRules(root, 'codex'), true);
  const initial = await readFile(file, 'utf8');
  await installIdeRules(root, ['codex']);
  assert.equal(await readFile(file, 'utf8'), initial);
  const original = '# Keep team settings\nmodel = "team-model"\n[mcp_servers.other]\ncommand = "keep"\n[mcp_servers."testweave"] # Keep header\ncommand = "old" # Keep launch comment\nargs = [\n  "old-arg",\n]\nstartup_timeout_sec = 30\n[mcp_servers.testweave.env]\nTEAM = "keep"\n';
  await writeFile(file, original);
  assert.equal(await hasMcpServer(root, target), false);
  await installMcpServer(root, target);
  const first = await readFile(file, 'utf8');
  assert.match(first, /# Keep team settings/);
  assert.match(first, /# Keep header/);
  assert.match(first, /# Keep launch comment/);
  const values = getStaticTOMLValue(parseTOML(first));
  assert.equal(values.model, 'team-model');
  assert.deepEqual(values.mcp_servers, {
    other: { command: 'keep' },
    testweave: { ...mcpServerConfig(root, target), startup_timeout_sec: 30, env: { TEAM: 'keep' } },
  });
  assert.equal(await hasMcpServer(root, target), true);
  await installMcpServer(root, target);
  assert.equal(await readFile(file, 'utf8'), first);
  await writeFile(file, '[mcp_servers.testweave]');
  await installMcpServer(root, target);
  assert.equal(await hasMcpServer(root, target), true);
  for (const invalid of ['[broken', 'mcp_servers = []', '[mcp_servers.testweave]\ncommand = "a"\ncommand = "b"']) {
    await writeFile(file, invalid);
    await assert.rejects(installMcpServer(root, target), /Invalid/);
    assert.equal(await readFile(file, 'utf8'), invalid);
  }
  const inline = 'mcp_servers = { testweave = { command = "keep" } }';
  await writeFile(file, inline);
  await assert.rejects(installMcpServer(root, target), /express TestWeave as/);
  assert.equal(await readFile(file, 'utf8'), inline);
  await writeFile(file, '[mcp_servers.testweave]\nurl = "https://old.example/mcp" # Keep comment\n');
  await installMcpServer(root, target);
  const local = await readFile(file, 'utf8');
  assert.match(local, /# Keep comment/);
  assert.deepEqual(getStaticTOMLValue(parseTOML(local)).mcp_servers, { testweave: mcpServerConfig(root, target) });
  assert.equal(await hasMcpServer(root, target), true);
});

test('provider CLI exports native formats and selects existing configuration files', async (t) => {
  const { context } = await repositoryFixture(t);
  const cli = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
  const exec = promisify(execFile);
  const base = [cli, '--cwd', context.root, 'mcp'];
  await writeFile(path.join(context.root, 'opencode.jsonc'), '{ // Keep project\n "model": "team/model" }');
  await exec(process.execPath, [...base, 'install', '--provider', 'opencode']);
  const opencode = parse(await readFile(path.join(context.root, 'opencode.jsonc'), 'utf8'));
  assert.equal(opencode.model, 'team/model');
  assert.equal(opencode.mcp.testweave.type, 'local');
  assert.equal(opencode.mcp.testweave.enabled, true);
  assert.ok(Array.isArray(opencode.mcp.testweave.command));
  assert.equal(opencode.mcp.testweave.args, undefined);
  await assert.rejects(readFile(path.join(context.root, 'opencode.json')), { code: 'ENOENT' });
  const json = await exec(process.execPath, [...base, 'config', '--provider', 'opencode']);
  assert.deepEqual(JSON.parse(json.stdout).mcp.testweave, opencode.mcp.testweave);
  await exec(process.execPath, [...base, 'install', '--provider', 'codex']);
  const toml = await exec(process.execPath, [...base, 'config', '--provider', 'codex']);
  assert.deepEqual(getStaticTOMLValue(parseTOML(toml.stdout)), getStaticTOMLValue(parseTOML(await readFile(path.join(context.root, '.codex/config.toml'), 'utf8'))));
  await mkdir(path.join(context.root, '.kilo'), { recursive: true });
  await writeFile(path.join(context.root, 'kilo.json'), '{}');
  await writeFile(path.join(context.root, '.kilo/kilo.jsonc'), '{}');
  assert.equal(mcpTarget('kilo', context.root)!.file, 'kilo.json');
  for (const options of [{}, { provider: 'universal' }, { provider: 'codex', config: 'custom.json' }, { provider: 'codex', key: 'servers' }]) {
    await assert.rejects(runMcpInstall(context, options));
  }
  await assert.rejects(runMcpConfig(context, { provider: 'opencode', format: 'toml' }));
});

test('clients sharing .mcp.json remain healthy when selected together', async (t) => {
  const root = await temporaryDirectory(t);
  const clients = ['claude-code', 'github-copilot', 'deepagents', 'command-code', 'forgecode'];
  await installIdeRules(root, clients);
  for (const client of clients) assert.equal(await hasIdeRules(root, client), true);
});

test('doctor repairs newly supported JSON, TOML and command-array clients', async (t) => {
  const { context } = await repositoryFixture(t);
  const integrations = ['amp', 'codex', 'gemini-cli', 'opencode'];
  await writeFile(path.join(context.root, '.testweave.json'), JSON.stringify({ version: 1, integrations, hook: false }));
  await runInit(context, { yes: true });
  for (const integration of integrations) await rm(path.join(context.root, mcpTarget(integration, context.root)!.file));
  const checks = await diagnose(context);
  for (const integration of integrations) assert.equal(checks.find((check) => check.id === `ide:${integration}`)?.repairable, true);
  assert.ok((await repair(context, checks)).every((check) => check.ok));
});

test('Mistral array tables preserve other servers and reject duplicate TestWeave names', async (t) => {
  const root = await temporaryDirectory(t);
  const target = mcpTarget('mistral-vibe')!;
  const file = path.join(root, target.file);
  await installIdeRules(root, ['mistral-vibe']);
  assert.equal(await hasIdeRules(root, 'mistral-vibe'), true);
  const original = '# Keep Vibe settings\nactive_model = "team-model"\n[[mcp_servers]]\nname = "other"\ncommand = "keep"\n[[mcp_servers]] # Keep TestWeave comment\nname = "testweave"\ntransport = "stdio"\ncommand = "old"\nargs = ["old"]\n';
  await writeFile(file, original);
  await installMcpServer(root, target);
  const first = await readFile(file, 'utf8');
  const values = getStaticTOMLValue(parseTOML(first));
  assert.equal(values.active_model, 'team-model');
  assert.deepEqual(values.mcp_servers, [{ name: 'other', command: 'keep' }, mcpProviderConfig(root, target)]);
  assert.match(first, /# Keep TestWeave comment/);
  assert.equal(await hasMcpServer(root, target), true);
  await installMcpServer(root, target);
  assert.equal(await readFile(file, 'utf8'), first);
  for (const invalid of ['mcp_servers = {}', '[[mcp_servers]]\nname = "testweave"\n[[mcp_servers]]\nname = "testweave"']) {
    await writeFile(file, invalid);
    await assert.rejects(installMcpServer(root, target), /Invalid/);
    assert.equal(await readFile(file, 'utf8'), invalid);
  }
  await runMcpInstall((await repositoryFixture(t)).context, { provider: 'grok' });
});

test('native MCP clients are selectable and detected without expanding universal skills', async (t) => {
  const root = await temporaryDirectory(t);
  for (const id of ['amp', 'codex', 'gemini-cli', 'opencode']) {
    assert.ok(SELECTABLE_AGENTS.some((agent) => agent.id === id));
  }
  for (const directory of ['.codex', '.gemini', '.vibe']) await mkdir(path.join(root, directory));
  await writeFile(path.join(root, 'opencode.jsonc'), '{}');
  const detected = detectIntegrations(root).ides;
  for (const id of ['codex', 'gemini-cli', 'mistral-vibe', 'opencode']) assert.ok(detected.includes(id));
  assert.equal(mcpTarget('universal'), undefined);
});
