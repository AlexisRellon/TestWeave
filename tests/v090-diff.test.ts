import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import { contractFixture, moduleFixture, repositoryFixture, temporaryDirectory } from './helpers.js';
import { diffContracts } from '../src/engine/diff.js';
import { serializeTestTruth } from '../src/engine/markdown.js';
import { createTestTruth, testTruthSchema } from '../src/schema/test-truth.js';
import { createContext } from '../src/cli/context.js';
import { loadContractDiff, runDiff } from '../src/cli/diff.js';
import { formatContractDiff, githubAnnotation } from '../src/cli/format-diff.js';
import { runSync } from '../src/cli/sync.js';

test('semantic diff compares stable IDs and meaningful fields without ordering/default noise', () => {
  const before = contractFixture();
  before.modules[0]!.paths.push('lib/**');
  before.modules[0]!.tests.push({ ...structuredClone(moduleFixture.tests[0]!), id: 'AUTH-002' });
  before.modules.push({ ...structuredClone(moduleFixture), id: 'other', tests: [{ ...structuredClone(moduleFixture.tests[0]!), id: 'OTHER-001' }] });
  const after = structuredClone(before);
  after.schemaVersion = 1;
  after.modules.reverse();
  after.modules[1]!.paths.reverse();
  after.modules[1]!.tests.reverse();
  after.modules[1]!.docs = [];
  after.policy.docDriftMode = 'warn';
  assert.deepEqual(diffContracts(before, after).changes, []);
  after.schemaVersion = 2;
  after.modules[1]!.tests[0]!.profile = { keyboard: [] };
  assert.deepEqual(diffContracts(before, after).changes, []);
  after.modules[1]!.paths = ['new/**'];
  after.modules[1]!.specs = ['docs/spec.md#login'];
  after.modules[1]!.tests[0]!.steps[0]!.expected = 'New outcome';
  after.modules[1]!.tests[0]!.profile = { keyboard: ['Tab reaches submit'] };
  after.project = 'Changed';
  after.fixtures = { user: 'standard user' };
  const changes = diffContracts(before, after).changes;
  assert.deepEqual(changes.map((entry) => entry.field).sort(), ['fixtures', 'paths', 'profile', 'project', 'specs', 'steps']);
  assert.deepEqual(changes.find((entry) => entry.field === 'steps')?.before, moduleFixture.tests[0]!.steps);
  assert.equal(changes.find((entry) => entry.field === 'profile')?.testId, 'AUTH-002');
  assert.deepEqual(JSON.parse(JSON.stringify(diffContracts(before, after))), diffContracts(before, after));
  const defaults = contractFixture();
  defaults.modules[0]!.tests[0] = { ...defaults.modules[0]!.tests[0]!, type: 'regression', tags: [], preconditions: [] };
  const minimal = testTruthSchema.parse({ ...defaults, modules: [{ ...defaults.modules[0], tests: [{
    id: 'AUTH-001', title: 'Sign in', priority: 'high', steps: moduleFixture.tests[0]!.steps,
  }] }] });
  assert.deepEqual(diffContracts(defaults, minimal).changes, []);
});

test('diff reports module/test additions, removals, moves and ordered steps', () => {
  const before = contractFixture();
  const after = contractFixture();
  after.modules[0]!.tests[0]!.id = 'AUTH-NEW';
  let changes = diffContracts(before, after).changes;
  assert.deepEqual(changes.map(({ kind, testId }) => [kind, testId]), [['removed', 'AUTH-001'], ['added', 'AUTH-NEW']]);
  after.modules[0]!.id = 'new-module';
  after.modules[0]!.tests[0]!.id = 'AUTH-001';
  changes = diffContracts(before, after).changes;
  assert.deepEqual(changes.map(({ kind, field }) => [kind, field]), [['removed', 'module'], ['added', 'module'], ['modified', 'moduleId']]);
  assert.equal(changes[2]!.before, 'auth');
  before.modules[0]!.tests[0]!.steps.push({ action: 'Sign out', data: '', expected: 'Signed out' });
  after.modules[0]!.id = 'auth';
  after.modules[0]!.tests[0]!.steps = [...before.modules[0]!.tests[0]!.steps].reverse();
  assert.equal(diffContracts(before, after).changes[0]!.field, 'steps');
  assert.equal(diffContracts(before, undefined).changes.filter((entry) => entry.kind === 'removed').length, 2);
});

test('loader compiles base and target includes from their own Git snapshots', async (t) => {
  const { root, git, context } = await repositoryFixture(t);
  const contract = createTestTruth('Fixture');
  contract.includes = ['packages/auth/test-truth.md'];
  await mkdir(path.join(root, 'packages/auth'), { recursive: true });
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), serializeTestTruth(contractFixture()));
  await git.add('.'); await git.commit('Split contract');
  const base = (await git.revparse(['HEAD'])).trim();
  const child = contractFixture();
  child.modules[0]!.tests[0]!.steps[0]!.expected = 'Committed outcome';
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), serializeTestTruth(child));
  await git.add('.'); await git.commit('Change included test');
  const target = (await git.revparse(['HEAD'])).trim();
  child.modules[0]!.tests[0]!.steps[0]!.expected = 'Dirty outcome';
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), serializeTestTruth(child));
  const pushed = await loadContractDiff(context, base, target);
  assert.equal(pushed.changes.length, 1);
  assert.match(JSON.stringify(pushed.changes[0]!.after), /Committed outcome/);
  assert.doesNotMatch(JSON.stringify(pushed), /Dirty outcome/);
  assert.match(JSON.stringify(await loadContractDiff(context, base)), /Dirty outcome/);
  await assert.rejects(loadContractDiff(context, 'invalid-revision'));
});

test('implicit HEAD supports unborn Git but explicit revisions still fail', async (t) => {
  const root = await temporaryDirectory(t);
  await simpleGit(root).init();
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contractFixture()));
  const context = await createContext(root);
  assert.equal((await loadContractDiff(context)).changes.filter((entry) => entry.kind === 'added').length, 2);
  await assert.rejects(loadContractDiff(context, 'HEAD'));
  await assert.rejects(loadContractDiff(context, 'invalid-revision'));
});

test('CLI emits text, markdown, JSON and escaped GitHub semantic output', async (t) => {
  const { root, context, output } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.modules[0]!.tests[0]!.title = 'Title | <script> `code`\n::error::injected%';
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  for (const format of ['text', 'markdown', 'json', 'github']) {
    output.length = 0;
    assert.equal(await runDiff(context, { format }), 0);
    if (format === 'json') assert.equal(JSON.parse(output[0]!).changes[0].field, 'title');
    if (format === 'markdown') {
      assert.match(output[0]!, /&#124; &lt;script&gt; &#96;code&#96;/);
      assert.doesNotMatch(output[0]!, /<script>/);
    }
    if (format === 'github') assert.match(output[0]!, /^::notice file=test-truth.md::/);
  }
  await assert.rejects(runDiff(context, { format: 'invalid' }), /Unsupported/);
  assert.equal(formatContractDiff(diffContracts(contract, contract), 'text').includes('No semantic'), true);
  assert.equal(githubAnnotation('error', 'a%,:\r\n.ts', 'message%\r\n::error::injected'),
    '::error file=a%25%2C%3A%0D%0A.ts::message%25%0D%0A::error::injected');
});

test('GitHub sync preserves blocking verdict and appends combined summaries for committed pre-push targets', async (t) => {
  const { root, git, base, context, output } = await repositoryFixture(t);
  const summaryFile = path.join(root, 'summary.md');
  const oldSummary = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summaryFile;
  t.after(() => { if (oldSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY; else process.env.GITHUB_STEP_SUMMARY = oldSummary; });
  await writeFile(summaryFile, 'Previous summary\n');
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;\n');
  await git.add('.'); await git.commit('Behavior change without QA');
  const target = (await git.revparse(['HEAD'])).trim();
  const dirty = contractFixture();
  dirty.modules[0]!.tests[0]!.steps[0]!.expected = 'Dirty test update';
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(dirty));
  assert.equal(await runSync(context, { prePush: true, format: 'github' }, `refs/heads/main ${target} refs/heads/main ${base}\n`), 1);
  assert.match(output.join('\n'), /::error file=src\/auth\/login.ts::stale-module auth:/);
  let summary = await readFile(summaryFile, 'utf8');
  assert.match(summary, /^Previous summary/);
  assert.match(summary, /Drift status: \*\*blocked\*\*/);
  assert.match(summary, /Semantic contract diff/);
  assert.doesNotMatch(summary, /Dirty test update/);
  assert.equal(await runSync(context, { prePush: true, format: 'github', base }, `refs/heads/main ${target} refs/heads/new ${'0'.repeat(40)}\n`), 1);
  summary = await readFile(summaryFile, 'utf8');
  assert.equal(summary.split('## TestWeave QA review').length, 3);
  assert.equal(await runSync(context, { prePush: true, format: 'github' }, `(delete) ${'0'.repeat(40)} refs/heads/main ${base}\n`), 0);
});

test('GitHub first push handles empty base and includes semantic changes without changing warn exit behavior', async (t) => {
  const { root, git, context, output } = await repositoryFixture(t);
  const summaryFile = path.join(root, 'summary.md');
  const oldSummary = process.env.GITHUB_STEP_SUMMARY;
  process.env.GITHUB_STEP_SUMMARY = summaryFile;
  t.after(() => { if (oldSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY; else process.env.GITHUB_STEP_SUMMARY = oldSummary; });
  const contract = contractFixture();
  contract.policy.mode = 'warn';
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await writeFile(path.join(root, 'src/unmapped.ts'), 'export const value = 1;\n');
  await git.add('.'); await git.commit('Warning policy');
  const target = (await git.revparse(['HEAD'])).trim();
  assert.equal(await runSync(context, { prePush: true, format: 'github' }, `refs/heads/main ${target} refs/heads/main ${'0'.repeat(40)}\n`), 0);
  assert.match(output.join('\n'), /::warning file=src\/unmapped.ts::unmapped/);
  assert.match(await readFile(summaryFile, 'utf8'), /added \| test \| AUTH-001/);
});
