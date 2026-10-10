import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import { testTruthSchema, testModuleSchema } from '../src/schema/test-truth.js';
import { parseTestTruth, serializeTestTruth } from '../src/engine/markdown.js';
import { MarkdownContractStore } from '../src/engine/store.js';
import { workspacePath } from '../src/engine/files.js';
import { contractFixture, moduleFixture, temporaryDirectory } from './helpers.js';

test('Markdown roundtrip supports Unicode, multiline steps, and embedded fences', () => {
  const contract = contractFixture();
  contract.modules[0]!.tests[0]!.steps[0]!.expected = '✓ Visible\n~~~\n```json\n"quoted"';
  assert.deepEqual(parseTestTruth(serializeTestTruth(contract)), contract);
});
test('rejects missing or duplicate contract blocks and schema violations', () => {
  const contract = contractFixture();
  const markdown = serializeTestTruth(contract);
  assert.throws(() => parseTestTruth('# Notes'), /exactly one/);
  assert.throws(() => parseTestTruth(markdown + markdown), /exactly one/);
  assert.throws(() => testTruthSchema.parse({ ...contract, unknown: true }));
  assert.throws(() => testTruthSchema.parse({ ...contract, modules: [moduleFixture, moduleFixture] }), /Duplicate module/);
  assert.throws(() => testTruthSchema.parse({ ...contract, modules: [moduleFixture, { ...moduleFixture, id: 'other' }] }), /globally unique/);
  for (const invalid of ['../secret', '/etc/passwd', 'C:/file', 'src\\file', '!src/**']) {
    assert.throws(() => testModuleSchema.parse({ ...moduleFixture, paths: [invalid] }));
  }
  assert.throws(() => testModuleSchema.parse({ ...moduleFixture, tests: [] }));
});
test('upsert validates globally and preserves prose outside the authoritative block', async (t) => {
  const root = await temporaryDirectory(t);
  const store = new MarkdownContractStore(root);
  await store.initialize(contractFixture());
  const before = await store.readMarkdown() + '\n## Team notes\nKeep this text.\n';
  await writeFile(store.file, before);
  await store.upsert({ ...moduleFixture, description: 'Users sign in with MFA.' });
  assert.match(await store.readMarkdown(), /Keep this text/);
  assert.equal((await store.read()).modules[0]?.description, 'Users sign in with MFA.');
  await assert.rejects(store.upsert({ ...moduleFixture, id: 'duplicate-test' }), /globally unique/);
  await writeFile(store.file + '.lock', 'another writer');
  await assert.rejects(store.upsert(moduleFixture), /locked/);
});
test('initialization never replaces invalid existing contracts', async (t) => {
  const root = await temporaryDirectory(t);
  const store = new MarkdownContractStore(root);
  await writeFile(store.file, 'my existing notes');
  await assert.rejects(store.initialize(contractFixture()), /exactly one/);
  assert.equal(await readFile(store.file, 'utf8'), 'my existing notes');
});
test('workspace paths reject traversal and symlink escapes', async (t) => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  await assert.rejects(workspacePath(root, '../escape.csv'), /inside/);
  await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(workspacePath(root, 'linked/export.csv'), /outside/);
  assert.equal(await workspacePath(root, 'exports/new.csv'), path.join(root, 'exports/new.csv'));
  await symlink(outside, path.join(root, 'test-truth.md'), process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(new MarkdownContractStore(root).readMarkdown(), /symlink/);
});
