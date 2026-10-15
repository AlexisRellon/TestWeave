import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { contractFixture, moduleFixture, repositoryFixture, temporaryDirectory } from './helpers.js';
import { testTruthSchema, specPointerSchema } from '../src/schema/test-truth.js';
import { MarkdownContractStore } from '../src/engine/store.js';
import { sliceMarkdown, readSpecSlice } from '../src/engine/specs.js';
import { contractIndex, modulesForFiles, impact, specContext, scopedSpecDiff } from '../src/engine/queries.js';
import { wireJson } from '../src/engine/wire.js';
import { isCosmeticChange } from '../src/engine/semantic.js';
import { auditedBypasses, bypassReason } from '../src/engine/bypass.js';
import { diagnose } from '../src/engine/doctor.js';
import { createModuleAuthor } from '../src/llm/factory.js';
import { CompatibleGenerator } from '../src/llm/compatible.js';
import { ValidatedModuleAuthor } from '../src/llm/adapter.js';
import { createMcpServer } from '../src/mcp/server.js';
import { resolveDrift, type ResolverUI } from '../src/cli/resolve.js';
import { runSync } from '../src/cli/sync.js';
import { serializeTestTruth } from '../src/engine/markdown.js';
import { TESTWEAVE_SKILL_CONTENT } from '../src/integrations/skills.js';
import { QA_RULES } from '../src/integrations/ide.js';

test('skill and rule entrypoints have a small text budget and route to focused guidance', () => {
  assert.ok(TESTWEAVE_SKILL_CONTENT.length < 550);
  assert.ok(QA_RULES.length < 600);
  assert.match(TESTWEAVE_SKILL_CONTENT, /commands\/index.md/);
  assert.match(QA_RULES, /get_modules_for_files/);
});

test('compiled CLI exposes impact and semantic sync with correct exit behavior', async (t) => {
  const { root } = await repositoryFixture(t);
  const exec = promisify(execFile);
  const cli = fileURLToPath(new URL('../dist/cli/index.js', import.meta.url));
  const preview = await exec(process.execPath, [cli, '--cwd', root, 'impact', 'src/auth/future.ts', '--compact']);
  assert.equal(JSON.parse(preview.stdout).modules[0].id, 'auth');
  await writeFile(path.join(root, 'src/auth/login.ts'), '// cosmetic\nexport const login=1;');
  const synced = await exec(process.execPath, [cli, '--cwd', root, 'sync', '--base', 'HEAD', '--semantic', '--json']);
  assert.equal(JSON.parse(synced.stdout).blocked, false);
  await assert.rejects(exec(process.execPath, [cli, '--cwd', root, 'sync', '--interactive']), (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === 2);
});

test('compact contracts restore defaults while preserving required arrays and arbitrary step data', () => {
  const contract = contractFixture();
  contract.modules[0]!.tests[0] = { ...moduleFixture.tests[0]!, type: 'regression', preconditions: [], tags: [] };
  const compact = wireJson(contract, true);
  assert.ok(compact.length < wireJson(contract).length);
  assert.doesNotMatch(compact, /"tags"|"preconditions"|"type"/);
  assert.deepEqual(testTruthSchema.parse(JSON.parse(compact)), contract);
  assert.match(compact, /"ignoreGlobs"/);
});

test('spec slicing uses Markdown headings, nested sections, duplicate anchors and ignores code fences', () => {
  const md = '# Root\nintro\n## Sign *in*\none\n### Child\ntwo\n```md\n## Fake\n```\n## Sign in\nsecond\n';
  assert.equal(sliceMarkdown(md, 'docs/a.md#sign-in'), '## Sign *in*\none\n### Child\ntwo\n```md\n## Fake\n```\n');
  assert.equal(sliceMarkdown(md, 'docs/a.md#sign-in-1'), '## Sign in\nsecond\n');
  assert.throws(() => sliceMarkdown(md, 'docs/a.md#fake'), /Missing heading/);
  assert.equal(sliceMarkdown('Heading\n=======\ntext', 'a.md#heading'), 'Heading\n=======\ntext');
  for (const pointer of ['../a.md', '/a.md', 'C:/a.md', 'a.md#', 'docs/superpowers/plans/task.md']) assert.equal(specPointerSchema.safeParse(pointer).success, false);
});

test('scoped reads return matching modules, slices and hunks without unrelated cases', async (t) => {
  const { context, root } = await repositoryFixture(t);
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/auth.md'), '# Auth\n## Login\nCredentials\n## Other\nUnrelated\n');
  await context.store.upsert({ ...moduleFixture, specs: ['docs/auth.md#login'] });
  const contract = await context.store.read();
  const index = contractIndex(contract);
  assert.deepEqual(Object.keys(index[0]!), ['id', 'paths', 'specs', 'tests']);
  assert.deepEqual(Object.keys(index[0]!.tests[0]!), ['id', 'title']);
  assert.equal(modulesForFiles(contract, ['src/auth/new.ts']).length, 1);
  assert.deepEqual(modulesForFiles(contract, ['src/other.ts']), []);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;\n');
  const scoped = await specContext(root, contract, 'auth');
  assert.equal(scoped.sections[0]?.content, '## Login\nCredentials\n');
  assert.match(scoped.diff, /\+export const login = 2/);
  const preview = await impact(root, contract, ['src/auth/*.ts', 'src/auth/future.ts']);
  assert.ok(preview.files.includes('src/auth/future.ts'));
  assert.deepEqual(preview.modules[0]?.tests[0]?.preconditions, moduleFixture.tests[0]!.preconditions);
  await unlink(path.join(root, 'src/auth/login.ts'));
  assert.equal((await impact(root, contract, ['src/auth/**'])).modules[0]?.id, 'auth');
  await assert.rejects(readSpecSlice(root, '../secret.md'));
  await assert.rejects(readSpecSlice(root, 'docs/missing.md'));
});

test('case mutations are locked, globally validated, prose preserving and never remove the final test', async (t) => {
  const root = await temporaryDirectory(t);
  const store = new MarkdownContractStore(root);
  await store.initialize(contractFixture());
  await writeFile(store.file, 'Keep before\n' + await store.readMarkdown() + '\nKeep after');
  await store.upsertCase('auth', { ...moduleFixture.tests[0]!, id: 'AUTH-002' });
  await store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Updated title' });
  assert.equal((await store.read()).modules[0]!.tests.length, 2);
  await store.removeCase('auth', 'AUTH-002');
  await store.removeCase('auth', 'missing');
  await assert.rejects(store.removeCase('auth', 'AUTH-001'));
  await assert.rejects(store.upsertCase('missing', moduleFixture.tests[0]!), /Unknown module/);
  await store.upsert({ ...moduleFixture, id: 'second', tests: [{ ...moduleFixture.tests[0]!, id: 'SECOND-001' }] });
  await assert.rejects(store.upsertCase('second', moduleFixture.tests[0]!), /globally unique/);
  const before = await store.readMarkdown();
  await writeFile(store.file + '.lock', 'busy');
  await assert.rejects(store.upsertCase('auth', moduleFixture.tests[0]!), /locked/);
  assert.equal(await store.readMarkdown(), before);
  assert.match(before, /^Keep before/);
  assert.match(before, /Keep after$/);
  await unlink(store.file + '.lock');
});

test('semantic filtering ignores cosmetics and local renames but keeps observable changes', () => {
  const before = 'export function login(x: number) { const result = x + 1; return result; }';
  assert.equal(isCosmeticChange('auth.ts', before, '// comment\nexport function login(x: number) {\n const renamed = x + 1;\nreturn renamed;\n}'), true);
  assert.equal(isCosmeticChange('auth.ts', 'type ID = string; const x: ID = "a";', 'type ID = number; const x = "a";'), true);
  for (const after of [before.replace('+ 1', '+ 2'), before.replace('login(', 'logout('), before.replace('login(x:', 'login(y:'), before.replace('number', 'string')]) {
    assert.equal(isCosmeticChange('auth.ts', before, after), false);
  }
  assert.equal(isCosmeticChange('auth.ts', 'function f() { const a = 1; return { a }; }', 'function f() { const b = 1; return { b }; }'), false);
  assert.equal(isCosmeticChange('auth.ts', 'export const x = /a b/;', 'export const x = /ab/;'), false);
  assert.equal(isCosmeticChange('auth.ts', before, undefined), false);
  assert.equal(isCosmeticChange('auth.py', 'x = 1', 'x=1'), false);
  assert.equal(isCosmeticChange('auth.ts', 'const = ;', 'const = ;'), false);
  assert.equal(isCosmeticChange('auth.tsx', 'const c = <p>hello world</p>;', 'const c = <p>helloworld</p>;'), false);
  assert.equal(isCosmeticChange('auth.tsx', 'interface Props { enabled: boolean } export function Panel(p: Props) { return <p/>; }', 'interface Props { enabled: string } export function Panel(p: Props) { return <p/>; }'), false);
  assert.equal(isCosmeticChange('auth.ts', 'function f() { const a = () => 1; return a.name; }', 'function f() { const b = () => 1; return b.name; }'), false);
});

test('section-scoped diffs omit distant unrelated hunks and include newly added files', async (t) => {
  const before = '# One\nold\n# Two\n' + 'unrelated\n'.repeat(20);
  const diff = '--- a/spec.md\n+++ b/spec.md\n@@ -2 +2 @@\n-old\n+new\n@@ -20 +20 @@\n-unrelated\n+secret\n';
  const scoped = scopedSpecDiff(diff, 'spec.md#one', before, before.replace('old', 'new'));
  assert.match(scoped, /\+new/);
  assert.doesNotMatch(scoped, /secret/);
  const { context, root } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/new.ts'), 'export const added = true;\n');
  assert.match(await context.git.diffForPaths!(['src/auth/**']), /\+export const added = true/);
});

test('nullable provider pointers normalize without allowing invalid contract fields', async () => {
  const author = new ValidatedModuleAuthor({ generate: async () => ({ ...moduleFixture, docs: null, specs: null, tests: [{ ...moduleFixture.tests[0]!, refs: null }] }) });
  assert.deepEqual(await author.author({ context: 'spec' }), moduleFixture);
  await assert.rejects(new ValidatedModuleAuthor({ generate: async () => ({ ...moduleFixture, name: null }) }).author({ context: 'spec' }));
});

test('review snapshot rejects concurrent changes instead of overwriting another case edit', async (t) => {
  const { context, root, base } = await repositoryFixture(t);
  await writeFile(path.join(root, 'new.ts'), 'export const next = 1;');
  const report = await context.analyzer.analyze({ base });
  const choices = ['map', 'auth'];
  await assert.rejects(resolveDrift(context, report, {}, { choose: async () => choices.shift(), confirm: async () => {
    await context.store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Concurrent update' });
    return true;
  } }), /changed during review/);
  assert.equal((await context.store.read()).modules[0]!.tests[0]!.title, 'Concurrent update');
  assert.deepEqual((await context.store.read()).modules[0]!.paths, moduleFixture.paths);
});

test('semantic sync keeps the changed file inventory and skips only cosmetic stale modules', async (t) => {
  const { root, context, base } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/login.ts'), '// note\nexport const login=1;\n');
  assert.equal((await context.analyzer.analyze({ base })).blocked, true);
  const report = await context.analyzer.analyze({ base, semantic: true });
  assert.equal(report.blocked, false);
  assert.ok(report.changedFiles.includes('src/auth/login.ts'));
});

test('spec drift compares linked sections, warns by default and blocks under strict policy', async (t) => {
  const { root, context, git } = await repositoryFixture(t);
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/spec.md'), '# Spec\n## Login\nOriginal\n## Other\nOriginal\n');
  await context.store.upsert({ ...moduleFixture, specs: ['docs/spec.md#login'] });
  await git.add('.'); await git.commit('Add spec');
  const base = (await git.revparse(['HEAD'])).trim();
  await writeFile(path.join(root, 'docs/spec.md'), '# Spec\n## Login\nOriginal\n## Other\nChanged\n');
  assert.deepEqual((await context.analyzer.analyze({ base })).issues, []);
  await writeFile(path.join(root, 'docs/spec.md'), '# Spec\n## Login\nChanged\n## Other\nOriginal\n');
  const warn = await context.analyzer.analyze({ base });
  assert.equal(warn.issues[0]?.kind, 'stale-spec');
  assert.equal(warn.blocked, false);
  assert.equal((await context.analyzer.analyze({ base, strict: true })).blocked, true);
  await context.store.upsert({ ...moduleFixture, specs: ['docs/spec.md#login'], tests: [{ ...moduleFixture.tests[0]!, title: 'New acceptance criteria' }] });
  assert.deepEqual((await context.analyzer.analyze({ base })).issues, []);
});

test('bypass requires justification on every affected commit and never clears unmapped/spec issues', () => {
  const issues = [{ kind: 'stale-module' as const, moduleId: 'auth', files: ['auth.ts'], message: 'stale' }];
  const commits = [{ sha: 'one', files: ['auth.ts'], message: 'Refactor\n\nTestweave-Bypass: auth (internal rename)' }];
  assert.equal(auditedBypasses(issues, commits).issues.length, 0);
  assert.equal(auditedBypasses(issues, commits).bypasses[0]?.reason, 'internal rename');
  assert.equal(auditedBypasses(issues, [...commits, { sha: 'two', files: ['auth.ts'], message: 'Change behavior' }]).issues.length, 1);
  assert.equal(auditedBypasses([{ ...issues[0]!, kind: 'stale-spec' }], commits).issues.length, 1);
  assert.equal(auditedBypasses([{ ...issues[0]!, kind: 'unmapped' }], commits).issues.length, 1);
  assert.equal(bypassReason('Testweave-Bypass: auth ()', 'auth'), undefined);
  assert.equal(bypassReason('@testweave-skip auth (rename only)', 'auth'), 'rename only');
  assert.equal(bypassReason('Testweave-Bypass: auth (rename only)', 'other'), undefined);
});

test('established spec policy can ignore drift and baseline block cannot be weakened', async (t) => {
  const { root, context, git } = await repositoryFixture(t);
  await writeFile(path.join(root, 'spec.md'), '# Spec\nOriginal\n');
  const contract = await context.store.read();
  contract.policy.mode = 'warn';
  contract.policy.docDriftMode = 'block';
  contract.modules[0]!.specs = ['spec.md#spec'];
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await git.add('.'); await git.commit('Enforce specs');
  const base = (await git.revparse(['HEAD'])).trim();
  contract.policy.docDriftMode = 'ignore';
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  await writeFile(path.join(root, 'spec.md'), '# Spec\nChanged\n');
  assert.equal((await context.analyzer.analyze({ base })).blocked, true);
  await git.add('.'); await git.commit('Establish ignore policy');
  const ignoredBase = (await git.revparse(['HEAD'])).trim();
  await writeFile(path.join(root, 'spec.md'), '# Spec\nAnother change\n');
  assert.deepEqual((await context.analyzer.analyze({ base: ignoredBase })).issues, []);
});

test('pre-push audits committed bypasses without writing the contract or trusting the dirty tree', async (t) => {
  const { context, root, git, base } = await repositoryFixture(t);
  const original = await context.store.readMarkdown();
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;');
  await git.add('.'); await git.commit('Refactor\n\nTestweave-Bypass: auth (pure internal refactor)');
  const target = (await git.revparse(['HEAD'])).trim();
  assert.equal((await context.analyzer.analyze({ base, target })).blocked, true);
  const report = await context.analyzer.analyze({ base, target, prePush: true });
  assert.equal(report.blocked, false);
  assert.equal(report.bypasses?.[0]?.commit, target);
  assert.equal(await context.store.readMarkdown(), original);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 3;');
  await git.add('.'); await git.commit('Behavior without bypass');
  const next = (await git.revparse(['HEAD'])).trim();
  assert.equal((await context.analyzer.analyze({ base, target: next, prePush: true })).blocked, true);
});

test('doctor reports dead globs, orphaned modules and missing anchors without repairing definitions', async (t) => {
  const { context, root } = await repositoryFixture(t);
  await writeFile(path.join(root, 'spec.md'), '# Exists\n');
  await context.store.upsert({ ...moduleFixture, paths: ['missing/**'], specs: ['spec.md#gone', 'missing.md'] });
  const before = await context.store.readMarkdown();
  const checks = await diagnose(context);
  for (const prefix of ['dead-path:', 'orphaned-module:', 'dead-spec:']) assert.ok(checks.some((check) => check.id.startsWith(prefix) && !check.ok && !check.repairable));
  assert.equal(await context.store.readMarkdown(), before);
});

test('compatible provider validates completion, schema and stable IDs using an injected SDK transport', async () => {
  const client = new OpenAI({ apiKey: 'local', baseURL: 'http://localhost:11434/v1', maxRetries: 0,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      assert.equal(new URL(request.url).pathname, '/v1/chat/completions');
      const body = await request.json() as { response_format: { type: string } };
      assert.equal(body.response_format.type, 'json_schema');
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(moduleFixture) } }] });
    },
  });
  assert.deepEqual(await new ValidatedModuleAuthor(new CompatibleGenerator(client, 'local-model')).author({ context: 'Draft', existing: moduleFixture, compact: true }), moduleFixture);
  const truncated = new OpenAI({ apiKey: 'local', maxRetries: 0, fetch: async () => Response.json({ choices: [{ finish_reason: 'length', message: { content: '{}' } }] }) });
  await assert.rejects(new CompatibleGenerator(truncated, 'model').generate('system', 'input'), /complete structured/);
  await assert.rejects(createModuleAuthor('custom', 'model', {}), /base-url/);
  await assert.rejects(createModuleAuthor('gemini', 'model', {}), /GEMINI_API_KEY/);
  await assert.rejects(createModuleAuthor('custom', 'model', {}, 'file:///tmp/api'), /HTTP/);
  assert.ok(await createModuleAuthor('ollama', 'model', {}));
  assert.ok(await createModuleAuthor('gemini', 'model', { GEMINI_API_KEY: 'test' }));
});

test('scoped MCP tools and compact case edits work through the actual protocol', async (t) => {
  const { context } = await repositoryFixture(t);
  const server = createMcpServer({ ...context, compact: true });
  const client = new Client({ name: 'v070', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(b); await client.connect(a);
  for (const [name, args] of [
    ['get_contract_index', {}], ['get_modules_for_files', { paths: ['src/auth/login.ts'] }],
    ['get_module_by_path', { path: 'src/auth/login.ts' }], ['get_spec_slice', { pathOrModuleId: 'auth' }], ['impact', { paths: ['src/auth/*.ts'] }],
    ['upsert_test_case', { moduleId: 'auth', testCase: { ...moduleFixture.tests[0]!, id: 'AUTH-002' } }],
    ['remove_test_case', { moduleId: 'auth', testId: 'AUTH-002' }],
  ] as const) {
    const result = await client.callTool({ name, arguments: args });
    assert.notEqual(result.isError, true, name + ': ' + JSON.stringify(result));
    assert.doesNotMatch((result.content as { text: string }[])[0]!.text, /\n/);
  }
  const invalid = await client.callTool({ name: 'remove_test_case', arguments: { moduleId: 'auth', testId: 'AUTH-001' } });
  assert.equal(invalid.isError, true);
});

test('interactive resolver preserves cancellation, previews drafts, maps files and checks concurrency', async (t) => {
  const { context, root, base } = await repositoryFixture(t);
  await writeFile(path.join(root, 'new.ts'), 'export const next = 1;');
  const report = await context.analyzer.analyze({ base });
  const original = await context.store.readMarkdown();
  const cancel: ResolverUI = { choose: async () => undefined, confirm: async () => false };
  await resolveDrift(context, report, {}, cancel);
  assert.equal(await context.store.readMarkdown(), original);
  const choices = ['map', 'auth'];
  await resolveDrift(context, report, {}, { choose: async () => choices.shift(), confirm: async () => true });
  assert.ok((await context.store.read()).modules[0]!.paths.includes('new.ts'));
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;');
  const stale = await context.analyzer.analyze({ base });
  await resolveDrift(context, stale, {}, { choose: async () => 'scan', confirm: async () => true });
  assert.ok((await context.store.read()).modules[0]!.tests.some((entry) => entry.tags.includes('needs-review')));
  assert.equal((await context.analyzer.analyze({ base })).blocked, false);
  await assert.rejects(runSync(context, { interactive: true, prePush: true }), /TTY/);
});
