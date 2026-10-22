import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { temporaryDirectory } from './helpers.js';
import type { Diagnostic } from '../src/engine/doctor.js';
import { TESTWEAVE_SKILL_FILES } from '../src/integrations/skills.js';

const exec = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
const environment = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };

async function launch(root: string, args: string[]) {
  try {
    const result = await exec(process.execPath, [cliPath, '--cwd', root, ...args], { env: environment });
    return { ...result, code: 0 };
  } catch (error) {
    const result = error as { stdout: string; stderr: string; code: number };
    if (typeof result.code !== 'number') throw error;
    return result;
  }
}

test('doctor renders aligned plain diagnostics and an accurate healthy summary', async (t) => {
  const root = await temporaryDirectory(t);
  assert.equal((await launch(root, ['setup', '--yes', '--no-hook'])).code, 0);
  const human = await launch(root, ['doctor']);
  const json = await launch(root, ['doctor', '--json']);
  assert.equal(human.code, 0);
  assert.equal(json.code, 0);
  assert.match(human.stdout, /testweave doctor  diagnostics/);
  assert.match(human.stdout, /Workspace\s+/);
  assert.ok(human.stdout.includes(path.basename(root)));
  assert.match(human.stdout, /Node\.js runtime\s+v\d+/);
  assert.match(human.stdout, new RegExp('Skill bundle\\s+' + TESTWEAVE_SKILL_FILES.length + ' documents'));
  assert.match(human.stdout, /Contract schema\s+OK\s+Schema v2/);
  assert.match(human.stdout, /QA contract\s+OK\s+.*test-truth\.md/);
  assert.match(human.stdout, /Claude Code\s+OK\s+.*CLAUDE\.md.*\.mcp\.json.*\.claude\/skills\/testweave/);
  assert.match(human.stdout, /Pre-push hook\s+disabled in project configuration/);
  assert.match(human.stdout, /Everything looks good\./);
  assert.doesNotMatch(human.stdout, /\x1b\[/);
  const checks = JSON.parse(json.stdout) as Diagnostic[];
  assert.ok(checks.every((check) => check.ok));
  assert.ok(checks.every((check) => Object.keys(check).sort().join(',') === 'id,message,ok,repairable'));
  assert.ok(human.stdout.includes(checks.length + '/' + checks.length + ' checks passed'));
  const rows = human.stdout.split('\n').filter((line) => /^    .*\sOK\s/.test(line));
  assert.equal(rows.length, checks.length);
  assert.equal(new Set(rows.map((line) => line.indexOf('OK'))).size, 1);
  assert.doesNotMatch(json.stdout, /diagnostics|Summary:|\x1b\[/);
});

test('doctor failures preserve exit codes and distinguish automatic from manual repair', async (t) => {
  const root = await temporaryDirectory(t);
  assert.equal((await launch(root, ['setup', '--yes', '--no-hook'])).code, 0);
  await unlink(path.join(root, '.claude/skills/testweave/commands/scan.md'));
  await writeFile(path.join(root, 'test-truth.md'), '# Invalid contract');
  const human = await launch(root, ['doctor']);
  const json = await launch(root, ['doctor', '--json']);
  assert.equal(human.code, 1);
  assert.equal(json.code, 1);
  assert.match(human.stdout, /QA contract\s+FAIL/);
  assert.match(human.stdout, /Claude Code\s+FAIL/);
  assert.match(human.stdout, /Run testweave doctor --fix/);
  assert.match(human.stdout, /Some problems require manual repair/);
  assert.doesNotMatch(human.stdout, /Everything looks good/);
  const checks = JSON.parse(json.stdout) as Diagnostic[];
  const passed = checks.filter((check) => check.ok).length;
  assert.ok(human.stdout.includes(passed + '/' + checks.length + ' checks passed'));
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), '# Invalid contract');
});

test('doctor --fix displays the repaired results and keeps contract content', async (t) => {
  const root = await temporaryDirectory(t);
  assert.equal((await launch(root, ['setup', '--yes', '--no-hook'])).code, 0);
  const baseline = await readFile(path.join(root, 'test-truth.md'), 'utf8');
  await unlink(path.join(root, '.agents/skills/testweave/commands/scan.md'));
  const fixed = await launch(root, ['doctor', '--fix']);
  assert.equal(fixed.code, 0);
  assert.match(fixed.stdout, /Universal agents\s+OK/);
  assert.match(fixed.stdout, /Everything looks good/);
  assert.doesNotMatch(fixed.stdout, /FAIL|need.*attention/);
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), baseline);
});
