import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import { simpleGit } from 'simple-git';
import { scanProject } from '../src/engine/scan.js';
import { runScan } from '../src/cli/scan.js';
import { createContext } from '../src/cli/context.js';
import { createProgram } from '../src/cli/index.js';
import { MarkdownContractStore } from '../src/engine/store.js';
import { createTestTruth, testTruthSchema } from '../src/schema/test-truth.js';
import { serializeTestTruth } from '../src/engine/markdown.js';
import { contractFixture, temporaryDirectory } from './helpers.js';

async function existingProject(root: string): Promise<void> {
  await mkdir(path.join(root, 'src/auth'), { recursive: true });
  await mkdir(path.join(root, 'tests'), { recursive: true });
  await writeFile(path.join(root, 'project-context.md'), '# Requirements\nAs a registered user, I complete the auth login journey.\n');
  await writeFile(path.join(root, 'README.md'), '# Existing application\nUser workflow: auth login redirects to dashboard.\n');
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }));
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export function login() {}\nexport const logout = () => {};\napp.post("/login", login);\n');
  await writeFile(path.join(root, 'tests/login.test.ts'), 'test("login succeeds", () => {});');
}

test('scan previews context first, functions, routes, journeys and automated tests without writes', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  const output: string[] = [];
  const context = await createContext(root, { log: (value) => output.push(value), error: (value) => output.push(value) });
  await runScan(context, { json: true });
  const report = JSON.parse(output[0]!);
  assert.equal(report.context[0].file, 'project-context.md');
  assert.ok(report.context.some((entry: { file: string }) => entry.file === 'package.json'));
  const source = report.files.find((entry: { file: string }) => entry.file === 'src/auth/login.ts');
  assert.deepEqual(source.functions, ['login', 'logout']);
  assert.deepEqual(source.routes, ['/login']);
  assert.deepEqual(report.files.find((entry: { file: string }) => entry.file === 'tests/login.test.ts').automatedTests, ['login succeeds']);
  assert.ok(report.modules.some((module: { tests: { tags: string[] }[] }) => module.tests.some((entry) => entry.tags.includes('journey'))));
  assert.ok(report.modules.some((module: { tests: { tags: string[] }[] }) => module.tests.some((entry) => entry.tags.includes('automated'))));
  assert.equal(report.applied, 0);
  testTruthSchema.parse({ ...createTestTruth('Existing'), modules: report.modules });
  await assert.rejects(readFile(path.join(root, 'test-truth.md')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(root, '.testweave.json')), { code: 'ENOENT' });
});

test('apply creates a baseline and rescans preserve modules and IDs byte for byte', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  const context = await createContext(root, { log() {}, error() {} });
  await runScan(context, { apply: true });
  const baseline = await readFile(path.join(root, 'test-truth.md'), 'utf8');
  const contract = await context.store.read();
  assert.equal(contract.modules.length, 2);
  assert.ok(contract.modules.every((module) => module.tests.every((entry) => entry.tags.includes('needs-review'))));
  await runScan(context, { apply: true });
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), baseline);
  await writeFile(path.join(root, 'src/auth/register.ts'), 'export function register() {}');
  await runScan(context, { apply: true });
  const updated = await context.store.read();
  assert.deepEqual(updated.modules.slice(0, 2), contract.modules);
  assert.equal(updated.modules.length, 3);
  assert.ok(updated.modules[2]!.paths.includes('src/auth/register.ts'));
});

test('apply preserves authored scenarios, policy and surrounding markdown; respects tracking exclusions', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  const contract = contractFixture();
  contract.policy.ignoreGlobs.push('tests/**');
  await writeFile(path.join(root, 'test-truth.md'), '# Team notes\n' + serializeTestTruth(contract) + '\nKeep this footer.\n');
  await mkdir(path.join(root, 'src/billing'));
  await writeFile(path.join(root, 'src/billing/pay.ts'), 'export function pay() {}');
  const context = await createContext(root, { log() {}, error() {} });
  await runScan(context, { apply: true });
  const updated = await context.store.read();
  assert.deepEqual(updated.modules[0], contract.modules[0]);
  assert.deepEqual(updated.policy, contract.policy);
  assert.equal(updated.modules.length, 2);
  const markdown = await readFile(path.join(root, 'test-truth.md'), 'utf8');
  assert.ok(markdown.startsWith('# Team notes'));
  assert.ok(markdown.endsWith('Keep this footer.\n'));
});

test('Git scan excludes ignored untracked files, skips deleted tracked files and includes untracked source', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  const git = simpleGit(root);
  await git.init();
  await writeFile(path.join(root, '.gitignore'), 'scratch/\n');
  await git.add(['src/auth/login.ts']);
  await unlink(path.join(root, 'src/auth/login.ts'));
  await mkdir(path.join(root, 'scratch'));
  await writeFile(path.join(root, 'scratch/private.ts'), 'export function secret() {}');
  await writeFile(path.join(root, 'src/auth/new.ts'), 'export function fresh() {}');
  const report = await scanProject(root, createTestTruth('Existing'));
  assert.ok(report.files.some((entry) => entry.file === 'src/auth/new.ts'));
  assert.ok(!report.files.some((entry) => entry.file.startsWith('scratch/')));
  assert.ok(report.warnings.some((warning) => warning.includes('missing file')));
});

test('dynamic route filenames produce literal path coverage, and unrelated files remain uncovered', async (t) => {
  const root = await temporaryDirectory(t);
  await mkdir(path.join(root, 'app/users/[id]'), { recursive: true });
  await writeFile(path.join(root, 'app/users/[id]/page.tsx'), 'export default function Profile() {}');
  const report = await scanProject(root, createTestTruth('Routes'));
  assert.equal(report.modules.length, 1);
  const matches = picomatch(report.modules[0]!.paths, { dot: true });
  assert.ok(matches('app/users/[id]/page.tsx'));
  assert.ok(!matches('app/users/i/page.tsx'));
  assert.deepEqual(report.files[0]!.routes, ['app/users/[id]/page.tsx']);
});

test('custom context is prioritized; missing and outside context fail before any contract write', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/product.md'), 'User journey: auth login.');
  const report = await scanProject(root, createTestTruth('Existing'), 'docs/product.md');
  assert.equal(report.context[0]!.file, 'docs/product.md');
  const context = await createContext(root, { log() {}, error() {} });
  await assert.rejects(runScan(context, { apply: true, context: '../outside.md' }), /inside the workspace/);
  await assert.rejects(runScan(context, { apply: true, context: 'missing.md' }), /Cannot read selected/);
  await assert.rejects(readFile(path.join(root, 'test-truth.md')), { code: 'ENOENT' });
});

test('scan skips dependency output, environment files, large files and binary files; reports absent context', async (t) => {
  const root = await temporaryDirectory(t);
  await mkdir(path.join(root, 'node_modules'));
  await writeFile(path.join(root, 'node_modules/private.ts'), 'export function secret() {}');
  await writeFile(path.join(root, '.env'), 'SECRET=private');
  await writeFile(path.join(root, 'huge.ts'), 'x'.repeat(256_001));
  await writeFile(path.join(root, 'binary.ts'), Buffer.from([0, 1, 2]));
  await writeFile(path.join(root, 'main.py'), 'def main(): pass\ndef test_main(): pass');
  const report = await scanProject(root, createTestTruth('Existing'));
  assert.deepEqual(report.files.map((entry) => entry.file), ['main.py']);
  assert.ok(report.warnings.some((warning) => warning.includes('No project context')));
  assert.ok(report.warnings.some((warning) => warning.includes('256 KB')));
  assert.ok(report.warnings.some((warning) => warning.includes('binary')));
});

test('empty scan is a no-op, and malformed contracts are preserved on failure', async (t) => {
  const root = await temporaryDirectory(t);
  const context = await createContext(root, { log() {}, error() {} });
  await runScan(context, { apply: true });
  await assert.rejects(readFile(path.join(root, 'test-truth.md')), { code: 'ENOENT' });
  await existingProject(root);
  await writeFile(path.join(root, 'test-truth.md'), '# Invalid contract');
  await assert.rejects(runScan(context, { apply: true }), /exactly one/);
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), '# Invalid contract');
});

test('append rejects stale scan snapshots and duplicate IDs without altering the contract', async (t) => {
  const root = await temporaryDirectory(t);
  await existingProject(root);
  const store = new MarkdownContractStore(root);
  const contract = createTestTruth('Existing');
  await store.initialize(contract);
  const report = await scanProject(root, contract);
  await store.upsert(report.modules[0]!);
  const current = await store.readMarkdown();
  await assert.rejects(store.append(report.modules, contract), /changed during scan/);
  assert.equal(await store.readMarkdown(), current);
  await assert.rejects(store.append([report.modules[0]!], await store.read()), /Duplicate module/);
  assert.equal(await store.readMarkdown(), current);
});

test('scan command options are exposed by the CLI', () => {
  const scan = createProgram().commands.find((command) => command.name() === 'scan');
  assert.ok(scan);
  assert.deepEqual(scan.options.map((option) => option.long), ['--context', '--apply', '--json']);
});

test('linked context outside the workspace is rejected and directory junctions are skipped', async (t) => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  await writeFile(path.join(outside, 'context.md'), 'Outside private documentation');
  try { await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error instanceof Error && 'code' in error && (error.code === 'EPERM' || error.code === 'EACCES')) { t.skip('Symlink permission unavailable'); return; }
    throw error;
  }
  await assert.rejects(scanProject(root, createTestTruth('Existing'), 'linked/context.md'), /outside the workspace/);
  assert.equal((await scanProject(root, createTestTruth('Existing'))).files.length, 0);
});
