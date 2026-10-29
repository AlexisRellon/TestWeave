import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile, symlink } from 'node:fs/promises';
import { contractFixture, moduleFixture, repositoryFixture, temporaryDirectory } from './helpers.js';
import { createTestTruth, testTruthSchema, testCaseSchema } from '../src/schema/test-truth.js';
import { parseTestTruth, serializeTestTruth } from '../src/engine/markdown.js';
import { compileContract, expandFixtures } from '../src/engine/includes.js';
import { MarkdownContractStore } from '../src/engine/store.js';
import { diagnose, repair } from '../src/engine/doctor.js';
import { generateExport } from '../src/integrations/exporters.js';
import { importCases, parseCsv } from '../src/integrations/importers.js';
import { runImport } from '../src/cli/import.js';
import { runGenerate } from '../src/cli/generate.js';
import { createContext } from '../src/cli/context.js';
import { contractGraph, noteName } from '../src/integrations/graph.js';
import { ValidatedModuleAuthor } from '../src/llm/adapter.js';
import { specPointers } from '../src/engine/specs.js';
import { createProgram } from '../src/cli/index.js';
import { createMcpServer } from '../src/mcp/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

test('v2 validates NFT profiles and rejects invalid metadata and execution outcomes', () => {
  const contract = contractFixture();
  for (const type of ['accessibility', 'security', 'performance', 'compatibility']) {
    contract.modules[0]!.tests[0] = testCaseSchema.parse({ ...moduleFixture.tests[0], type,
      refs: ['PROJ-123', 'docs/prd.md#ac-1'], profile: { wcagTarget: 'WCAG 2.1 AA',
        keyboard: ['Tab reaches submit'], screenReader: ['Submit has a name'],
        authzMatrix: [{ role: 'guest', resource: '/admin', access: 'deny' }], session: ['Expires'],
        inputBoundaries: ['Empty input rejected'], viewports: [{ width: 390, height: 844 }], network: 'Slow 3G',
        budgets: [{ metric: 'LCP', limit: 2500, unit: 'ms' }], checklist: ['Review definition'],
      } });
    assert.equal(parseTestTruth(serializeTestTruth(contract)).modules[0]!.tests[0]!.type, type);
  }
  assert.throws(() => testTruthSchema.parse({ ...contract, schemaVersion: 1 }), /schemaVersion 2/);
  for (const extra of [{ status: 'passed' }, { profile: { unknown: true } }, { profile: { viewports: [{ width: -1, height: 10 }] } },
    { profile: { budgets: [{ metric: 'LCP', limit: -1, unit: 'ms' }] } }]) {
    assert.throws(() => testCaseSchema.parse({ ...moduleFixture.tests[0], ...extra }));
  }
  assert.equal(createTestTruth('new').schemaVersion, 2);
});

test('fixtures expand recursively only at export and reject missing/cyclic definitions', () => {
  const contract = contractFixture();
  contract.fixtures = { standardUser: 'alice', setup: 'Sign in as {{fixture.standardUser}}' };
  contract.modules[0]!.tests[0]!.preconditions = ['{{fixture.setup}}'];
  contract.modules[0]!.tests[0]!.steps[0]!.data = '{{fixture.standardUser}}';
  assert.equal(expandFixtures(contract).modules[0]!.tests[0]!.preconditions[0], 'Sign in as alice');
  assert.equal(contract.modules[0]!.tests[0]!.steps[0]!.data, '{{fixture.standardUser}}');
  assert.match(generateExport(contract, { target: 'checklist', format: 'csv' }).content, /alice/);
  assert.throws(() => expandFixtures({ ...contract, fixtures: {} }), /Unknown fixture/);
  assert.throws(() => expandFixtures({ ...contract, fixtures: { setup: '{{fixture.setup}}' } }), /Cyclic fixture/);
  assert.throws(() => expandFixtures({ ...contract, fixtures: { setup: '{{fixture.constructor}}' } }), /Unknown fixture/);
  assert.throws(() => expandFixtures({ ...contract, fixtures: { setup: '{{fixture.standardUser}}'.repeat(100), standardUser: 'a'.repeat(1000) } }), /20,000/);
});

test('repository QA definitions export without unresolved fixture references', async () => {
  const contract = parseTestTruth(await readFile(new URL('../test-truth.md', import.meta.url), 'utf8'));
  const count = contract.modules.reduce((total, module) => total + module.tests.length, 0);
  assert.ok(count > 0);
  for (const target of ['xray', 'zephyr', 'jira', 'testrail', 'qase', 'obsidian', 'checklist'] as const) {
    const artifact = generateExport(contract, { target, format: 'json', projectKey: 'QA' });
    assert.equal(artifact.testCount, count, target);
    assert.ok(artifact.content.length > 0, target);
  }
});

test('strict provider nullable NFT metadata normalizes before canonical validation', async () => {
  const author = new ValidatedModuleAuthor({ generate: async () => ({ ...moduleFixture, docs: null, specs: null,
    tests: [{ ...moduleFixture.tests[0], type: 'accessibility', refs: null,
      profile: { wcagTarget: 'WCAG 2.1 AA', keyboard: null, screenReader: ['Submit is named'], budgets: null } }],
  }) });
  const result = await author.author({ context: 'Review keyboard and screen reader checks' });
  assert.deepEqual(result.tests[0]!.profile, { wcagTarget: 'WCAG 2.1 AA', screenReader: ['Submit is named'] });
  assert.equal(result.docs, undefined);
  assert.equal(result.tests[0]!.refs, undefined);
});

test('test document refs participate in scoped spec reads and changed-since filtering', () => {
  const contract = contractFixture();
  contract.modules[0]!.tests[0]!.refs = ['PROJ-123', 'docs/prd.md#ac-1'];
  assert.deepEqual(specPointers(contract, contract.modules[0]), ['docs/prd.md#ac-1']);
  assert.equal(generateExport(contract, { target: 'checklist', format: 'csv', changedSince: 'HEAD' },
    { changedFiles: ['docs/prd.md'] }).testCount, 1);
});

test('doctor --fix migrates v1 atomically, preserves prose, and is idempotent', async (t) => {
  const { context, root } = await repositoryFixture(t);
  const contract = { ...contractFixture(), schemaVersion: 1 as const };
  const markdown = 'Before\n\n' + serializeTestTruth(contract) + '\nAfter';
  await writeFile(path.join(root, 'test-truth.md'), markdown);
  const checks = await diagnose(context);
  assert.equal(checks.find((check) => check.id === 'schema-version')?.ok, false);
  await repair(context, checks);
  assert.equal((await context.store.read()).schemaVersion, 2);
  assert.match(await context.store.readMarkdown(), /^Before/);
  assert.match(await context.store.readMarkdown(), /After$/);
  const after = await context.store.readMarkdown();
  await context.store.migrate!();
  assert.equal(await context.store.readMarkdown(), after);
  await writeFile(path.join(root, 'test-truth.md.lock'), 'busy');
  await writeFile(path.join(root, 'test-truth.md'), markdown);
  await assert.rejects(context.store.migrate!(), /locked/);
  assert.equal(await context.store.readMarkdown(), markdown);
});

async function splitFixture(t: Parameters<typeof temporaryDirectory>[0]) {
  const root = await temporaryDirectory(t);
  await mkdir(path.join(root, 'packages/auth'), { recursive: true });
  const parent = { ...createTestTruth('Root'), includes: ['packages/auth/test-truth.md'] };
  const child = contractFixture();
  child.modules[0]!.specs = ['docs/auth.md#sign-in'];
  child.modules[0]!.tests[0]!.refs = ['docs/auth.md#sign-in', 'PROJ-1'];
  child.fixtures = { standardUser: 'alice' };
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(parent));
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), 'Child prose\n\n' + serializeTestTruth(child));
  return { root, parent, child, store: new MarkdownContractStore(root) };
}

test('includes compile relative paths, docs and fixtures; case updates stay in the owning file', async (t) => {
  const { root, store } = await splitFixture(t);
  const before = await store.readMarkdown();
  const contract = await store.read();
  assert.deepEqual(contract.modules[0]!.paths, ['packages/auth/src/auth/**']);
  assert.deepEqual(contract.modules[0]!.specs, ['packages/auth/docs/auth.md#sign-in']);
  assert.deepEqual(contract.modules[0]!.tests[0]!.refs, ['packages/auth/docs/auth.md#sign-in', 'PROJ-1']);
  assert.equal(contract.fixtures?.standardUser, 'alice');
  await store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Changed' });
  assert.equal(await store.readMarkdown(), before);
  const child = await readFile(path.join(root, 'packages/auth/test-truth.md'), 'utf8');
  assert.match(child, /^Child prose/);
  assert.deepEqual(parseTestTruth(child).modules[0]!.paths, moduleFixture.paths);
  assert.equal((await store.read()).modules[0]!.tests[0]!.title, 'Changed');
  await assert.rejects(store.upsert({ ...contract.modules[0]!, paths: ['outside/**'] }), /stay inside/);
  await assert.rejects(store.upsert({ ...moduleFixture, id: 'duplicate' }), /globally unique/);
  await store.append([{ ...moduleFixture, id: 'root', tests: [{ ...moduleFixture.tests[0]!, id: 'ROOT-1' }] }], await store.read());
  assert.equal(parseTestTruth(await store.readMarkdown()).modules.length, 1);
});

test('includes reject missing files, duplicate identities/fixtures, repeated includes and symlink escapes', async (t) => {
  const { root, store, parent, child } = await splitFixture(t);
  const childMarkdown = serializeTestTruth(child);
  await assert.rejects(compileContract(serializeTestTruth(parent), async () => undefined), /Missing included/);
  await assert.rejects(compileContract(serializeTestTruth({ ...parent, includes: [...parent.includes, ...parent.includes] }), async () => childMarkdown), /Repeated/);
  await assert.rejects(compileContract(serializeTestTruth({ ...parent, modules: child.modules }), async () => childMarkdown), /Duplicate module/);
  await assert.rejects(compileContract(serializeTestTruth({ ...parent, fixtures: child.fixtures! }), async () => childMarkdown), /Duplicate fixture/);
  for (const include of ['../test-truth.md', '/test-truth.md', 'packages/a/test-truth.md#heading', 'a.json']) {
    assert.throws(() => testTruthSchema.parse({ ...parent, includes: [include] }));
  }
  const outside = await temporaryDirectory(t);
  await writeFile(path.join(outside, 'test-truth.md'), childMarkdown);
  await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await writeFile(store.file, serializeTestTruth({ ...parent, includes: ['linked/test-truth.md'] }));
  await assert.rejects(store.read(), /outside/);
});

test('drift compares included contracts at each committed revision and the working tree', async (t) => {
  const { context, root, git } = await repositoryFixture(t);
  await mkdir(path.join(root, 'packages/auth/src/auth'), { recursive: true });
  await writeFile(path.join(root, 'packages/auth/src/auth/login.ts'), 'export const login = 1;');
  const parent = { ...createTestTruth('root'), includes: ['packages/auth/test-truth.md'] };
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(parent));
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), serializeTestTruth(contractFixture()));
  await git.add('.'); await git.commit('Split contract');
  const base = (await git.revparse(['HEAD'])).trim();
  await writeFile(path.join(root, 'packages/auth/src/auth/login.ts'), 'export const login = 2;');
  assert.equal((await context.analyzer.analyze({ base })).issues[0]?.kind, 'stale-module');
  await context.store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Updated behavior' });
  assert.equal((await context.analyzer.analyze({ base })).issues.length, 0);
  await git.add('.'); await git.commit('Behavior and QA update');
  const target = (await git.revparse(['HEAD'])).trim();
  await writeFile(path.join(root, 'packages/auth/test-truth.md'), 'invalid working copy');
  assert.equal((await context.analyzer.analyze({ base, target })).issues.length, 0);
});

test('graph, Mermaid, DOT, Canvas and Obsidian retain linked identities and NFT metadata', () => {
  const contract = contractFixture();
  contract.docs = ['docs/prd.md#login'];
  contract.modules[0]!.tests[0]!.profile = { keyboard: ['Tab to submit'] };
  const graph = contractGraph(contract, { auth: 'stale-module' });
  assert.deepEqual(new Set(graph.nodes.map((node) => node.kind)), new Set(['spec', 'source', 'module', 'test']));
  const ids = new Set(graph.nodes.map((node) => node.id));
  assert.ok(graph.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target)));
  assert.equal(graph.nodes.find((node) => node.id === 'test:AUTH-001')?.driftStatus, 'stale-module');
  for (const format of ['json', 'mermaid', 'dot'] as const) {
    const result = generateExport(contract, { target: 'graph', format });
    assert.match(result.content, /Sign in/);
    assert.equal(result.testCount, 1);
  }
  const canvas = JSON.parse(generateExport(contract, { target: 'canvas', format: 'json' }).content) as { nodes: { id: string; type: string }[]; edges: { fromNode: string; toNode: string }[] };
  assert.equal(canvas.nodes.filter((node) => node.type === 'group').length, 4);
  assert.ok(canvas.edges.every((edge) => canvas.nodes.some((node) => node.id === edge.fromNode)));
  const notes = generateExport(contract, { target: 'obsidian', format: 'json' }).files!;
  assert.match(notes[`${noteName('test:AUTH-001')}.md`]!, /priority: "high"/);
  assert.match(notes[`${noteName('test:AUTH-001')}.md`]!, /keyboard/);
  assert.ok(Object.values(notes).some((note) => note.includes(`[[${noteName('module:auth')}]]`)));
});

test('all new QA exports filter modules, tags, priorities and changed paths, and expand fixtures', () => {
  const contract = contractFixture();
  contract.fixtures = { user: 'alice' };
  contract.modules[0]!.tests[0]!.steps[0]!.data = '{{fixture.user}}';
  contract.modules.push({ ...structuredClone(moduleFixture), id: 'other', paths: ['src/other/**'],
    tests: [{ ...structuredClone(moduleFixture.tests[0]!), id: 'OTHER-1', tags: ['other'], priority: 'low' }] });
  for (const target of ['testrail', 'qase', 'checklist', 'gherkin'] as const) {
    const artifact = generateExport(contract, { target, format: 'csv', module: 'auth', tags: 'smoke', priority: 'high' });
    assert.equal(artifact.testCount, 1);
    assert.match(artifact.content, /alice/);
    assert.doesNotMatch(artifact.content, /OTHER-1/);
  }
  assert.equal(generateExport(contract, { target: 'xray', format: 'csv', changedSince: 'HEAD' }, { changedFiles: ['src/other/file.ts'] }).testCount, 1);
  assert.equal(generateExport(contract, { target: 'testrail', format: 'json', tags: 'missing' }).testCount, 0);
  assert.throws(() => generateExport(contract, { target: 'graph', format: 'json', module: 'missing' }), /Unknown module/);
  assert.throws(() => generateExport(contract, { target: 'xray', format: 'csv', changedSince: 'HEAD' }), /changed-file/);
  assert.throws(() => generateExport(contract, { target: 'xray', format: 'dot' }), /csv or json/);
});

test('CSV importer handles quoted multiline fields and rejects malformed rows', () => {
  assert.deepEqual(parseCsv('\uFEFF"ID","Title"\r\n"A","a, b\n""c"""\r\n'), [{ ID: 'A', Title: 'a, b\n"c"' }]);
  for (const content of ['ID,ID\n1,2', 'ID,Title\n1', 'ID\n"oops', 'ID\n"a"x']) assert.throws(() => parseCsv(content));
});

test('legacy QA CSV and JSON exports reimport stable IDs, multiline steps and priorities', () => {
  const contract = contractFixture();
  contract.modules[0]!.tests[0]!.steps.push({ action: 'Second action', data: 'a,"b"\nc', expected: 'Second outcome' });
  for (const source of ['jira', 'xray', 'zephyr', 'testrail'] as const) for (const format of ['csv', 'json'] as const) {
    const artifact = generateExport(contract, { target: source, format, projectKey: 'QA' });
    const cases = importCases(artifact.content, source, format);
    assert.equal(cases.length, 1, `${source} ${format}`);
    assert.equal(cases[0]!.id, 'AUTH-001');
    assert.equal(cases[0]!.title, 'Sign in');
    assert.equal(cases[0]!.priority, 'high');
    assert.deepEqual(cases[0]!.steps, contract.modules[0]!.tests[0]!.steps, `${source} ${format}`);
  }
  assert.throws(() => importCases('[{"id":"A","title":"No steps"}]', 'testrail', 'json'));
  assert.throws(() => importCases('[]', 'jira', 'json'), /no cases/);
});

test('CLI import merges atomically, rejects conflicts, preserves prose and supports idempotent reimport', async (t) => {
  const root = await temporaryDirectory(t);
  const context = await createContext(root, { log() {}, error() {} });
  await context.store.initialize(createTestTruth('Imported'));
  await writeFile(path.join(root, 'test-truth.md'), (await context.store.readMarkdown()) + '\nKeep prose');
  await writeFile(path.join(root, 'suite.json'), generateExport(contractFixture(), { target: 'testrail', format: 'json' }).content);
  const options = { source: 'testrail', format: 'json', module: 'auth', paths: 'src/auth/**' };
  await runImport(context, 'suite.json', options);
  const before = await context.store.readMarkdown();
  await runImport(context, 'suite.json', options);
  assert.equal(await context.store.readMarkdown(), before);
  assert.match(before, /Keep prose/);
  await context.store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Authored locally' });
  const changed = await context.store.readMarkdown();
  await assert.rejects(runImport(context, 'suite.json', options), /Existing case differs/);
  await assert.rejects(runImport(context, '../suite.json', options), /inside/);
  assert.equal(await context.store.readMarkdown(), changed);
});

test('CLI export filters with Git and projects/syncs notes while retaining outside prose', async (t) => {
  const { context, root, base } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;');
  await runGenerate(context, { target: 'checklist', changedSince: base, module: 'auth' });
  await assert.rejects(runGenerate(context, { target: 'checklist', changedSince: 'invalid-ref' }));
  await runGenerate(context, { target: 'obsidian', output: 'vault' });
  const note = path.join(root, 'vault', `${noteName('test:AUTH-001')}.md`);
  await writeFile(note, await readFile(note, 'utf8') + '\nPersonal notes');
  await context.store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Updated title' });
  await runGenerate(context, { target: 'obsidian', output: 'vault' });
  assert.match(await readFile(note, 'utf8'), /Updated title/);
  assert.match(await readFile(note, 'utf8'), /Personal notes/);
  await writeFile(note, 'Unmanaged note');
  await assert.rejects(runGenerate(context, { target: 'obsidian', output: 'vault' }), /unmanaged/);
  assert.equal(await readFile(note, 'utf8'), 'Unmanaged note');
});

test('CLI registers v0.8 import and filter options and dispatches actual arguments', async (t) => {
  const root = await temporaryDirectory(t);
  const store = new MarkdownContractStore(root);
  await store.initialize(createTestTruth('CLI'));
  await writeFile(path.join(root, 'suite.json'), generateExport(contractFixture(), { target: 'testrail', format: 'json' }).content);
  await createProgram().parseAsync(['node', 'testweave', '--cwd', root, 'import', 'suite.json', '--source', 'testrail',
    '--format', 'json', '--module', 'auth', '--paths', 'src/auth/**']);
  await createProgram().parseAsync(['node', 'testweave', '--cwd', root, 'generate', '--target', 'checklist', '--module', 'auth',
    '--priority', 'high', '--tags', 'smoke', '--output', 'qa.md']);
  assert.match(await readFile(path.join(root, 'qa.md'), 'utf8'), /\[ \] AUTH-001/);
  assert.equal(createProgram().version(), '1.0.0');
});

test('MCP exports new targets with filters and Git changed-since context through the protocol', async (t) => {
  const { context, root, base } = await repositoryFixture(t);
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;');
  const server = createMcpServer(context);
  const client = new Client({ name: 'v080', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(b); await client.connect(a);
  for (const target of ['graph', 'obsidian', 'canvas', 'checklist', 'gherkin', 'testrail', 'qase']) {
    const result = await client.callTool({ name: 'generate_qa_export', arguments: {
      target, format: 'json', module: 'auth', tags: 'smoke', priority: 'high', changedSince: base,
    } });
    assert.notEqual(result.isError, true, JSON.stringify(result));
    const artifact = JSON.parse((result.content as { text: string }[])[0]!.text) as { testCount: number };
    assert.equal(artifact.testCount, 1);
  }
  const result = await client.callTool({ name: 'generate_qa_export', arguments: { target: 'graph', changedSince: 'invalid-ref' } });
  assert.equal(result.isError, true);
});
