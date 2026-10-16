import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { simpleGit } from 'simple-git';

import { isCosmeticChange } from '../src/engine/semantic.js';
import { scopedSpecDiff, impact, specContext } from '../src/engine/queries.js';
import { diagnose } from '../src/engine/doctor.js';
import { serializeTestTruth } from '../src/engine/markdown.js';
import { contractFixture, moduleFixture, repositoryFixture, temporaryDirectory } from './helpers.js';
import { createContext } from '../src/cli/context.js';
import { listFiles } from '../src/engine/scan.js';

test('wrapped component signatures preserve prop types without flagging cosmetic edits', () => {
  for (const expression of [
    'memo((p: Props) => p.value)',
    'memo(function Panel(p: Props) { return p.value; })',
    'memo(forwardRef((p: Props) => p.value))',
    'memo<Props>(callback)',
    'memo(implementation)',
  ]) {
    const before = `interface Props { value: string } function implementation(p: Props) { return p.value; } export const Panel = ${expression};`;
    assert.equal(isCosmeticChange('panel.tsx', before, before.replace('value: string', 'value: number')), false, expression);
    assert.equal(isCosmeticChange('panel.tsx', before, '// formatting only\n' + before), true, expression);
  }
  const internal = 'interface Props { value: string } export const Panel = memo((p: Props) => { type Internal = string; return p.value; });';
  assert.equal(isCosmeticChange('panel.tsx', internal, internal.replace('Internal = string', 'Internal = number')), true);
  const cyclic = 'const a = b; const b = a; export const Panel = memo(a);';
  assert.equal(isCosmeticChange('panel.tsx', cyclic, '// comment\n' + cyclic), true);
});

test('non-Git doctor sees excluded registered paths while discovery still skips them', async (t) => {
  const root = await temporaryDirectory(t);
  const context = await createContext(root);
  await mkdir(path.join(root, 'dist'));
  await mkdir(path.join(root, '.git'));
  await writeFile(path.join(root, 'dist/auth.js'), 'export const auth = 1;');
  await writeFile(path.join(root, '.git/private'), 'Not a workspace source');
  const contract = contractFixture();
  contract.modules[0]!.paths = ['dist/*.js', 'missing/*.js'];
  await context.store.initialize(contract);
  const checks = await diagnose(context);
  assert.equal(checks.find((check) => check.id === 'dead-path:auth:dist/*.js')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'dead-path:auth:missing/*.js')?.ok, false);
  assert.equal(checks.some((check) => check.id === 'orphaned-module:auth'), false);
  assert.ok(!(await listFiles(root)).includes('dist/auth.js'));
  assert.ok(!(await listFiles(root, { includeExcluded: true })).includes('.git/private'));
  const outside = await temporaryDirectory(t);
  await writeFile(path.join(outside, 'outside.js'), 'private');
  try { await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'EPERM' || error.code === 'EACCES')) return;
    throw error;
  }
  assert.ok(!(await listFiles(root, { includeExcluded: true })).includes('linked/outside.js'));
});

test('spec context works before the first Git commit for staged and untracked sections', async (t) => {
  for (const staged of [false, true]) {
    const root = await temporaryDirectory(t);
    const git = simpleGit(root);
    await git.init(['-b', 'main']);
    await mkdir(path.join(root, 'src/auth'), { recursive: true });
    await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 1;\n');
    await writeFile(path.join(root, 'spec.md'), '# Login\nSign in\n# Other\nUnrelated section\n');
    const contract = contractFixture();
    contract.modules[0]!.specs = ['spec.md#login'];
    const context = await createContext(root);
    await context.store.initialize(contract);
    if (staged) await git.add('.');
    const scoped = await specContext(root, contract, 'auth');
    assert.equal(scoped.sections[0]?.content, '# Login\nSign in\n');
    assert.match(scoped.diff, /\+export const login = 1/);
    assert.match(scoped.diff, /\+Sign in/);
    assert.doesNotMatch(scoped.diff, /Unrelated section/);
    assert.deepEqual(scoped.tests, [{ id: 'AUTH-001', title: 'Sign in' }]);
    await assert.rejects(specContext(root, contract, 'auth', 'invalid-base'), /Invalid Git reference/);
  }
});

test('semantic filtering keeps declaration keywords and exported signatures', () => {
  assert.equal(isCosmeticChange('a.ts', 'let x = 1; x++;', 'const x = 1; x++;'), false);
  assert.equal(isCosmeticChange('a.ts', 'var x = 1;', 'let x = 1;'), false);
  assert.equal(isCosmeticChange('a.ts', 'function f(x: number) { return x; } export { f };',
    'function f(x: string) { return x; } export { f };'), false);
  assert.equal(isCosmeticChange('a.ts', 'function f(x: number) { return x; } export default f;',
    'function f(x: string) { return x; } export default f;'), false);
});

test('spec diffs are clipped to the selected section in both revisions', () => {
  const before = '# A\nold a\n\n# B\nold b\n';
  const after = '# A\nnew a\n\n# B\nnew b\n';
  const diff = 'diff --git a/s.md b/s.md\n--- a/s.md\n+++ b/s.md\n@@ -1,5 +1,5 @@\n # A\n-old a\n+new a\n \n # B\n-old b\n+new b\n';
  const scoped = scopedSpecDiff(diff, 'spec.md#a', before, after);
  assert.match(scoped, /new a/);
  assert.doesNotMatch(scoped, /old b|new b/);
});

test('spec diffs for added files exclude neighboring sections', () => {
  const after = '# A\nalpha\n\n# B\nsecret\n';
  const diff = 'diff --git a/s.md b/s.md\nnew file mode 100644\n--- /dev/null\n+++ b/s.md\n@@ -0,0 +1,5 @@\n+# A\n+alpha\n+\n+# B\n+secret\n';
  const scoped = scopedSpecDiff(diff, 'spec.md#a', undefined, after);
  assert.match(scoped, /alpha/);
  assert.doesNotMatch(scoped, /secret/);
});

test('deleting a module with an affected linked spec is blocked under docDriftMode block', async (t) => {
  const { root, git, context } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.docs = ['spec.md#login'];
  contract.policy.docDriftMode = 'block';
  await writeFile(path.join(root, 'spec.md'), '# login\nold rule\n');
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await git.add('.');
  await git.commit('Add linked spec');
  const linkedBase = (await git.revparse(['HEAD'])).trim();
  await writeFile(path.join(root, 'spec.md'), '# login\nnew rule\n');
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth({ ...contract, modules: [] }));
  await git.add('.');
  await git.commit('Change spec and remove module');
  const report = await context.analyzer.analyze({ base: linkedBase });
  assert.equal(report.blocked, true);
  assert.ok(report.issues.some((issue) => issue.kind === 'stale-spec' && issue.moduleId === 'auth'));
});

test('brace globs match tracked changed files in drafting diffs', async (t) => {
  const { root, context } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;\n');
  const diff = await context.git.diffForPaths!(['src/**/*.{ts,tsx}']);
  assert.match(diff, /export const login = 2/);
});

test('spec drafting diffs find spec files whose names contain glob characters', async (t) => {
  const { root, git } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.modules[0]!.docs = ['docs/[id].md#login'];
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await writeFile(path.join(root, 'docs/[id].md'), '# login\nold rule\n');
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await git.add('.');
  await git.commit('Add bracket spec');
  await writeFile(path.join(root, 'docs/[id].md'), '# login\nnew rule\n');
  await writeFile(path.join(root, 'docs/i.md'), '# other\nsibling change\n');
  await git.add('.');
  await git.commit('Change bracket spec and sibling');
  const scoped = await specContext(root, contract, 'auth', await git.revparse(['HEAD~1']).then((sha) => sha.trim()));
  assert.match(scoped.diff, /\+new rule/);
  assert.doesNotMatch(scoped.diff, /sibling change/);
});

test('impact reports modules whose overlapping globs cover planned files', async (t) => {
  const { root, git } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.modules[0]!.paths = ['future/*/index.ts'];
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await git.add('.');
  await git.commit('Register future module');
  const preview = await impact(root, contract, ['future/auth/*.ts']);
  assert.equal(preview.modules[0]?.id, 'auth');
});

test('doctor accepts registered paths that discovery excludes', async (t) => {
  const { root, git, context } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.modules[0]!.paths = ['dist/*.js'];
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(path.join(root, 'dist/a.js'), 'export const a = 1;\n');
  await git.add('.');
  await git.commit('Add dist');
  const checks = await diagnose(context);
  assert.equal(checks.find((check) => check.id === 'dead-path:auth:dist/*.js')?.ok, true);
  assert.equal(checks.find((check) => check.id === 'orphaned-module:auth'), undefined);
});

test('aligned pushes do not audit commit evidence', async (t) => {
  const { root, git, base, context } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;\n');
  await context.store.upsert({ ...moduleFixture, description: 'Updated behavior is documented.' });
  await git.add('.');
  await git.commit('Change login and document it');
  const sha = (await git.revparse(['HEAD'])).trim();
  const readCommits = context.git.commits!.bind(context.git);
  let audited = false;
  context.git.commits = async (...args) => { audited = true; return readCommits(...args); };
  const report = await context.analyzer.analyze({ base, target: sha, prePush: true });
  assert.equal(report.issues.length, 0);
  assert.equal(audited, false);
});
