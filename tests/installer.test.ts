import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { temporaryDirectory } from './helpers.js';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/install.sh', import.meta.url));
const gitExecPath = execFileSync('git', ['--exec-path'], { encoding: 'utf8' }).trim();
const shell = process.platform === 'win32'
  ? path.resolve(gitExecPath, '../../../bin/sh.exe')
  : '/bin/sh';
const shellPath = (value: string): string => value.replaceAll('\\', '/')
  .replace(/^([A-Za-z]):\//, (_, drive: string) => '/' + drive.toLowerCase() + '/');
const shellQuote = (value: string): string => "'" + shellPath(value).replaceAll("'", "'\\''") + "'";

test('shell installer routes npm and brew to the installed CLI with the selected project', { skip: !existsSync(shell) }, async (t) => {
  const root = await temporaryDirectory(t);
  const project = path.join(root, 'project with spaces');
  const tools = path.join(root, 'tools');
  const prefix = path.join(root, 'install with spaces');
  await mkdir(project);
  await mkdir(tools);
  await mkdir(path.join(prefix, 'bin'), { recursive: true });
  const log = path.join(root, 'commands.txt');
  const cliLog = path.join(root, 'cli-args.txt');
  const makeTool = async (name: string, content: string) => {
    await writeFile(path.join(tools, name), '#!/bin/sh\n' + content + '\n', { mode: 0o755 });
  };
  await makeTool('node', 'exit 0');
  await makeTool('npm', `printf '%s\\n' "$*" >> ${shellQuote(log)}\nif [ "$1" = prefix ]; then printf '%s\\n' ${shellQuote(prefix)}; else exit "\${INSTALL_FAILURE:-0}"; fi`);
  await makeTool('brew', `printf '%s\\n' "$*" >> ${shellQuote(log)}\nif [ "$1" = --prefix ]; then printf '%s\\n' ${shellQuote(prefix)}; else exit "\${INSTALL_FAILURE:-0}"; fi`);
  await writeFile(path.join(prefix, 'bin/testweave'), `#!/bin/sh\nprintf '%s\\n' "$@" > ${shellQuote(cliLog)}\n`, { mode: 0o755 });
  // Isolate the fixture PATH and verify stubs before running installation commands.
  const launch = (args: string[], failure = '0') => exec(shell, [
    '-c', 'PATH="$1:/usr/bin:/bin"; export PATH; test "$(command -v npm)" = "$1/npm" || exit 97; test "$(command -v brew)" = "$1/brew" || exit 97; shift; exec sh "$@"', 'installer-test', shellPath(tools), shellPath(script), ...args,
  ], { env: { ...process.env, INSTALL_FAILURE: failure } });

  for (const method of ['npm', 'brew']) {
    await launch(['--method', method, '--cwd', shellPath(project), '--formula', 'example/tools/testweave']);
    const args = (await readFile(cliLog, 'utf8')).trim().split('\n');
    assert.equal(args[0], '--cwd');
    // Git Bash passes POSIX paths, which Node on Windows accepts.
    assert.ok(args[1]?.endsWith('/project with spaces'));
    assert.deepEqual(args.slice(2), ['setup', '--yes']);
    await writeFile(cliLog, 'unchanged');
    await launch(['--method', method, '--cwd', shellPath(project), '--formula', 'example/tools/testweave', '--no-setup']);
    assert.equal(await readFile(cliLog, 'utf8'), 'unchanged');
    await assert.rejects(launch(['--method', method, '--cwd', shellPath(project), '--formula', 'example/tools/testweave'], '7'));
    assert.equal(await readFile(cliLog, 'utf8'), 'unchanged');
  }
  const commands = await readFile(log, 'utf8');
  assert.match(commands, /install --global testweave/);
  assert.ok(commands.includes('install --HEAD example/tools/testweave'));
  await launch(['--method', 'brew', '--cwd', shellPath(project)]);
  const defaultBrew = await readFile(log, 'utf8');
  assert.ok(defaultBrew.includes('tap alexisrellon/testweave https://github.com/AlexisRellon/TestWeave'));
  assert.ok(defaultBrew.includes('install --HEAD alexisrellon/testweave/testweave'));
  await assert.rejects(launch(['--method', 'invalid']), /Unsupported method/);
  await assert.rejects(launch(['--cwd']), /Missing value/);
  await assert.rejects(launch(['--cwd', shellPath(path.join(root, 'missing'))]), /Workspace does not exist/);
});
