import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createTestTruth, serializeTestTruth } from '../dist/index.js';

const exec = promisify(execFile);
const repository = fileURLToPath(new URL('../', import.meta.url));
const manager = process.argv[2];
const tools = path.join(repository, '.manager-tools/node_modules');
const nodeEntries = {
  npm: process.env.npm_execpath,
  pnpm: path.join(tools, 'pnpm/bin/pnpm.cjs'),
  'yarn-classic': path.join(tools, 'yarn/bin/yarn.js'),
  'yarn-pnp': path.join(tools, '@yarnpkg/cli-dist/bin/yarn.js'),
};
const bunCandidates = [
  path.join(tools, 'bun/bin', process.platform === 'win32' ? 'bun.exe' : 'bun'),
  path.join(tools, 'bun/bin/bun.exe'),
  path.join(tools, 'bun/bin/bun'),
  path.join(tools, '.bin', process.platform === 'win32' ? 'bun.cmd' : 'bun'),
  path.join(tools, '@oven/bun-linux-x64/bin/bun'),
  path.join(tools, '@oven/bun-windows-x64/bin/bun.exe'),
];
const bunExecutable = bunCandidates.find((candidate) => existsSync(candidate)) ?? bunCandidates[0];
if (manager === 'bun' && process.platform !== 'win32' && existsSync(bunExecutable)) {
  try { chmodSync(bunExecutable, 0o755); } catch { /* ignore */ }
}
if (!['npm', 'pnpm', 'yarn-classic', 'yarn-pnp', 'bun'].includes(manager)) {
  throw new Error('Choose npm, pnpm, yarn-classic, yarn-pnp, or bun');
}
const entry = manager === 'bun' ? bunExecutable : nodeEntries[manager];
if (!entry || !existsSync(entry)) throw new Error('Install verification tools first; run this script through npm run check:manager');
const binary = manager === 'bun' ? entry : process.execPath;
const prefix = manager === 'bun' ? [] : [entry];
const packageJson = JSON.parse(await readFile(path.join(repository, 'package.json'), 'utf8'));
const tarball = path.join(repository, `testweave-${packageJson.version}.tgz`);
if (!existsSync(tarball)) throw new Error('Run npm pack before checking package managers');
const directory = await mkdtemp(path.join(tmpdir(), 'testweave-manager-'));
const root = path.join(directory, 'project with spaces');
const remote = path.join(directory, 'remote');
await mkdir(root);
await mkdir(remote);
const cleanEnvironment = { ...process.env };
delete cleanEnvironment.NODE_OPTIONS;
delete cleanEnvironment.npm_config_user_agent;
const run = (command, args, cwd = root) => {
  console.log(manager + ': ' + [path.basename(command), ...args.slice(0, 2).map((arg) => path.basename(arg))].join(' '));
  return exec(command, args, {
    cwd, env: cleanEnvironment, timeout: 180_000, maxBuffer: 10_000_000,
  });
};
const pm = (args) => run(binary, [...prefix, ...args]);
const cliPrefix = {
  npm: ['exec', '--', 'testweave'],
  pnpm: ['exec', 'testweave'],
  'yarn-classic': ['run', 'testweave'],
  'yarn-pnp': ['run', 'testweave'],
  bun: ['run', 'testweave'],
}[manager];
const cli = (args) => pm([...cliPrefix, ...args]);
try {
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'testweave-install-fixture', private: true }));
  if (manager === 'yarn-pnp') {
    await writeFile(path.join(root, '.yarnrc.yml'),
      'nodeLinker: pnp\npnpEnableEsmLoader: true\nenableGlobalCache: false\nenableScripts: false\n');
  }
  const install = {
    npm: ['install', '--save-dev', '--ignore-scripts', tarball, '--no-audit', '--no-fund'],
    pnpm: ['add', '--save-dev', '--ignore-scripts', tarball],
    'yarn-classic': ['add', '--dev', '--ignore-scripts', '--registry', 'https://registry.npmjs.org', tarball],
    'yarn-pnp': ['add', '--dev', 'testweave@file:' + tarball.replaceAll('\\', '/')],
    bun: ['add', '--dev', '--ignore-scripts', tarball],
  }[manager];
  await pm(install);
  const version = await cli(['--version']);
  assert.match(version.stdout, new RegExp(packageJson.version));
  await run('git', ['init', '-b', 'main']);
  await run('git', ['config', 'user.name', 'TestWeave install tests']);
  await run('git', ['config', 'user.email', 'testweave@example.invalid']);
  await run('git', ['config', 'commit.gpgsign', 'false']);
  await run('git', ['config', 'core.hooksPath', '.git/hooks']);
  await mkdir(path.join(root, '.vscode'));
  await cli(['init', '--yes']);
  const doctor = await cli(['doctor']);
  assert.match(doctor.stdout, /Valid contract/);
  const config = JSON.parse(await readFile(path.join(root, '.vscode/mcp.json'), 'utf8')).servers.testweave;
  if (manager === 'yarn-pnp') {
    assert.ok(config.args.includes('--require'));
    assert.ok(config.args.includes('--experimental-loader'));
  }
  const transport = new StdioClientTransport({ command: config.command, args: config.args, env: cleanEnvironment, stderr: 'pipe' });
  const client = new Client({ name: 'package-manager-check', version: '1.0.0' });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 10);
  } finally { await client.close(); }
  await writeFile(path.join(root, '.gitignore'), 'node_modules/\n.yarn/\n.pnp.*\n');
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/app.ts'), 'export const behavior = 1;\n');
  const contract = createTestTruth('Package manager fixture');
  contract.modules = [{
    id: 'app', name: 'App', description: 'Version one behavior',
    paths: ['src/**'], tests: [{
      id: 'APP-1', title: 'App behavior', priority: 'high', preconditions: [], tags: [],
      steps: [{ action: 'Use app', data: '', expected: 'Version one behavior' }],
    }],
  }];
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await run('git', ['add', '.']);
  await run('git', ['commit', '-m', 'Initial fixture']);
  await run('git', ['init', '--bare'], remote);
  await run('git', ['remote', 'add', 'origin', remote]);
  await run('git', ['push', '-u', 'origin', 'main']);
  await writeFile(path.join(root, 'src/app.ts'), 'export const behavior = 2;\n');
  await run('git', ['add', 'src/app.ts']);
  await run('git', ['commit', '-m', 'Stale QA fixture']);
  await assert.rejects(run('git', ['push', 'origin', 'main']), (error) => {
    assert.match(error.stdout ?? '', /BLOCK/);
    return error.code === 1;
  });
  contract.modules[0].description = 'Version two behavior';
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await run('git', ['add', 'test-truth.md']);
  await run('git', ['commit', '-m', 'Update QA']);
  await run('git', ['push', 'origin', 'main']);
  console.log(manager + ': install, CLI, doctor, standalone MCP, and Git push enforcement passed');
} finally {
  const dirParent = path.dirname(directory);
  const resolvedTmp = path.resolve(tmpdir());
  const parentMatches = dirParent === resolvedTmp ||
    (await realpath(dirParent).catch(() => '')) === (await realpath(resolvedTmp).catch(() => ''));
  if (!parentMatches || !path.basename(directory).startsWith('testweave-manager-')) {
    throw new Error('Unsafe verification cleanup path');
  }
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
