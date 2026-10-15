import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  ALL_AGENTS,
  UNIVERSAL_AGENTS,
  ADDITIONAL_AGENTS,
  findAgent,
  getSkillsDirForAgent,
} from '../src/integrations/agents.js';
import {
  TESTWEAVE_SKILL_NAME,
  TESTWEAVE_SKILL_CONTENT,
  TESTWEAVE_SKILL_FILES,
  TESTWEAVE_REFERENCE_NAME,
  TESTWEAVE_REFERENCE_CONTENT,
  installSkill,
  hasSkill,
} from '../src/integrations/skills.js';
import { installIdeRules, hasIdeRules } from '../src/integrations/ide.js';
import { printBanner, printSetupOverview } from '../src/cli/banner.js';
import { formatSelectedSummary } from '../src/cli/agent-selector.js';
import { temporaryDirectory } from './helpers.js';

const cliPath = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
const exec = promisify(execFile);

test('agent directory defines 79 agents split into universal and additional', () => {
  assert.equal(ALL_AGENTS.length, 79);
  assert.equal(UNIVERSAL_AGENTS.length, 23);
  assert.equal(ADDITIONAL_AGENTS.length, 56);

  // Universal agents check
  const amp = findAgent('amp');
  assert.ok(amp);
  assert.equal(amp.displayName, 'Amp');
  assert.equal(amp.skillsDir, '.agents/skills');
  assert.equal(amp.isUniversal, true);

  // Additional agents check
  const aider = findAgent('aider-desk');
  assert.ok(aider);
  assert.equal(aider.displayName, 'AiderDesk');
  assert.equal(aider.skillsDir, '.aider-desk/skills');

  // Alias lookup
  const claude = findAgent('claude');
  assert.ok(claude);
  assert.equal(claude.displayName, 'Claude Code');
  assert.equal(claude.skillsDir, '.claude/skills');

  assert.equal(getSkillsDirForAgent('universal'), '.agents/skills');
  assert.equal(getSkillsDirForAgent('claude'), '.claude/skills');
  assert.equal(getSkillsDirForAgent('aider-desk'), '.aider-desk/skills');
});

test('skill bundle installs authoritative documents with resolvable local links', async (t) => {
  const root = await temporaryDirectory(t);
  assert.equal(TESTWEAVE_SKILL_NAME, 'testweave');
  assert.equal(TESTWEAVE_REFERENCE_NAME, 'references/functional-testing.md');
  assert.equal(await hasSkill(root, '.agents/skills'), false);
  const installedFile = await installSkill(root, '.agents/skills');
  const installedRoot = path.dirname(installedFile);
  assert.equal(await hasSkill(root, '.agents/skills'), true);
  assert.equal(await readFile(installedFile, 'utf8'), TESTWEAVE_SKILL_CONTENT);
  assert.equal(await readFile(path.join(installedRoot, TESTWEAVE_REFERENCE_NAME), 'utf8'), TESTWEAVE_REFERENCE_CONTENT);
  assert.deepEqual(TESTWEAVE_SKILL_FILES.map((entry) => entry.path).sort(), [
    'SKILL.md', 'commands/doctor.md', 'commands/generate.md', 'commands/index.md', 'commands/init.md', 'commands/mcp.md',
    'commands/scan.md', 'commands/sync.md', 'commands/update.md',
    'references/contract-schema.md', 'references/functional-testing.md',
  ]);
  assert.match(TESTWEAVE_SKILL_CONTENT, /^---\nname: testweave\ndescription: [^\n]+\n---\n/);
  for (const entry of TESTWEAVE_SKILL_FILES) {
    const installed = path.join(installedRoot, entry.path);
    assert.equal(await readFile(installed, 'utf8'), await readFile(new URL('../skills/testweave/' + entry.path, import.meta.url), 'utf8'));
    for (const link of entry.content.matchAll(/\]\(([^)]+\.md)\)/g)) {
      const target = path.resolve(path.dirname(installed), link[1]!);
      const relative = path.relative(installedRoot, target);
      assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative), 'Link escapes installed bundle: ' + link[1]);
      await readFile(target, 'utf8');
    }
  }
});

test('skill refresh restores missing and modified documents while retaining user files', async (t) => {
  const root = await temporaryDirectory(t);
  const installed = path.dirname(await installSkill(root, '.agents/skills'));
  const custom = path.join(installed, 'notes.md');
  await writeFile(custom, 'Team-specific notes');
  const removed = path.join(installed, 'commands/scan.md');
  await unlink(removed);
  assert.equal(await hasSkill(root, '.agents/skills'), false);
  await installSkill(root, '.agents/skills');
  assert.equal(await hasSkill(root, '.agents/skills'), true);
  await writeFile(path.join(installed, 'references/contract-schema.md'), 'Old schema');
  assert.equal(await hasSkill(root, '.agents/skills'), false);
  await installSkill(root, '.agents/skills');
  assert.equal(await hasSkill(root, '.agents/skills'), true);
  assert.equal(await readFile(custom, 'utf8'), 'Team-specific notes');
});

test('skill installation rejects linked resource directories before writing bundle files', async (t) => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  const installed = path.join(root, '.agents/skills/testweave');
  await mkdir(installed, { recursive: true });
  const outsideFile = path.join(outside, 'scan.md');
  await writeFile(outsideFile, 'Outside document');
  try { await symlink(outside, path.join(installed, 'commands'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'EPERM' || error.code === 'EACCES')) { t.skip('Symlink permission unavailable'); return; }
    throw error;
  }
  await assert.rejects(installSkill(root, '.agents/skills'), /outside the workspace/);
  assert.equal(await readFile(outsideFile, 'utf8'), 'Outside document');
  await assert.rejects(readFile(path.join(installed, 'SKILL.md')), { code: 'ENOENT' });
  assert.equal(await hasSkill(root, '.agents/skills'), false);
});

test('doctor detects damaged nested skills alongside intact IDE rules and repairs the full bundle', async (t) => {
  const root = await temporaryDirectory(t);
  await exec(process.execPath, [cliPath, '--cwd', root, 'setup', '--yes', '--no-hook']);
  const baseline = await readFile(path.join(root, 'test-truth.md'), 'utf8');
  const claude = path.join(root, '.claude/skills/testweave');
  const universal = path.join(root, '.agents/skills/testweave');
  await unlink(path.join(claude, 'commands/scan.md'));
  await writeFile(path.join(universal, 'references/contract-schema.md'), 'Stale schema');
  await writeFile(path.join(claude, 'notes.md'), 'Keep team notes');
  assert.equal(await hasSkill(root, '.claude/skills'), false);
  const failing = await exec(process.execPath, [cliPath, '--cwd', root, 'doctor', '--json']).catch((error: { code: number; stdout: string }) => {
    assert.equal(error.code, 1);
    return { stdout: error.stdout };
  });
  const diagnostics = JSON.parse(failing.stdout) as { id: string; ok: boolean }[];
  assert.ok(diagnostics.some((check) => check.id === 'ide:claude' && !check.ok));
  assert.ok(diagnostics.some((check) => check.id === 'ide:universal' && !check.ok));
  await exec(process.execPath, [cliPath, '--cwd', root, 'doctor', '--fix']);
  const repaired = await exec(process.execPath, [cliPath, '--cwd', root, 'doctor', '--json']);
  assert.ok((JSON.parse(repaired.stdout) as { ok: boolean }[]).every((check) => check.ok));
  assert.equal(await hasSkill(root, '.claude/skills'), true);
  assert.equal(await hasSkill(root, '.agents/skills'), true);
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), baseline);
  assert.equal(await readFile(path.join(claude, 'notes.md'), 'utf8'), 'Keep team notes');
});

test('installIdeRules installs custom skill and agent rules across multiple agent targets', async (t) => {
  const root = await temporaryDirectory(t);

  await installIdeRules(root, ['universal', 'claude', 'aider-desk']);

  // Universal skill
  assert.equal(await hasSkill(root, '.agents/skills'), true);
  assert.equal(await hasIdeRules(root, 'universal'), true);

  // Claude rules and skill
  assert.equal(await hasIdeRules(root, 'claude'), true);
  assert.equal(await hasSkill(root, '.claude/skills'), true);
  const claudeRules = await readFile(path.join(root, 'CLAUDE.md'), 'utf8');
  assert.match(claudeRules, /TestWeave QA contract/);

  // AiderDesk dedicated skill
  assert.equal(await hasIdeRules(root, 'aider-desk'), true);
  assert.equal(await hasSkill(root, '.aider-desk/skills'), true);
});

test('formatSelectedSummary formats agent selection summary properly', () => {
  const set1 = new Set(['universal']);
  assert.equal(formatSelectedSummary(set1), 'Amp, Cline, Codex +11 more');

  const set2 = new Set(['universal', 'claude']);
  assert.equal(formatSelectedSummary(set2), 'Amp, Cline, Codex +12 more');

  const set3 = new Set(['aider-desk']);
  assert.equal(formatSelectedSummary(set3), 'AiderDesk');
});

test('banner and setup overview render without throwing', () => {
  const logs: string[] = [];
  printBanner((msg) => logs.push(msg));
  assert.ok(logs.some((l) => l.includes('testweave')));

  printSetupOverview('/mock/workspace', { git: true, ides: ['cursor'], ci: [], husky: false }, (msg) => logs.push(msg));
  assert.ok(logs.some((l) => l.includes('79 agents')));
  assert.ok(logs.some((l) => l.includes('Universal (.agents/skills)')));
});

test('compiled CLI supports setup alias identically to init', async (t) => {
  const root = await temporaryDirectory(t);
  const setup = await exec(process.execPath, [cliPath, '--cwd', root, 'setup', '--yes']);
  assert.match(setup.stdout, /initialized/);
  assert.match(setup.stdout, /79 agents/);

  // Verify that universal skill was installed
  const skillFile = path.join(root, '.agents/skills/testweave/SKILL.md');
  const skillContent = await readFile(skillFile, 'utf8');
  assert.match(skillContent, /name: testweave/);
});

test('compiled CLI supports update command to refresh rules and skills', async (t) => {
  const root = await temporaryDirectory(t);
  await exec(process.execPath, [cliPath, '--cwd', root, 'init', '--yes']);

  const update = await exec(process.execPath, [cliPath, '--cwd', root, 'update', '--yes']);
  assert.match(update.stdout, /updated/);
  assert.match(update.stdout, /validated/);
  assert.match(update.stdout, /79 agents/);

  const skillFile = path.join(root, '.agents/skills/testweave/SKILL.md');
  const skillContent = await readFile(skillFile, 'utf8');
  assert.match(skillContent, /name: testweave/);
  assert.match(skillContent, /commands\/update\.md/);
  assert.equal(await hasSkill(root, '.agents/skills'), true);

  const freshRoot = await temporaryDirectory(t);
  const freshUpdate = await exec(process.execPath, [cliPath, '--cwd', freshRoot, 'update', '--yes']);
  assert.match(freshUpdate.stdout, /updated/);
  assert.match(freshUpdate.stdout, /created/);
});

