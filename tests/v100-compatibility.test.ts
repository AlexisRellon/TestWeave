import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import {
  createTestTruth, diagnose, MarkdownContractStore, nodeFileSystem, parseTestTruth,
  serializeTestTruth, type FileSystem,
} from '../src/index.js';
import { contractFixture, moduleFixture, repositoryFixture, temporaryDirectory } from './helpers.js';

test('public API reads and diagnoses v1 without rewriting authored bytes', async (t) => {
  const { root, context } = await repositoryFixture(t);
  const legacy = { ...contractFixture(), schemaVersion: 1 as const };
  const markdown = 'Authored introduction\r\n\r\n' + serializeTestTruth(legacy) + '\nAuthored ending\n';
  const file = path.join(root, 'test-truth.md');
  await writeFile(file, markdown);
  const store = new MarkdownContractStore(root);
  assert.deepEqual(await store.read(), legacy);
  assert.equal(await store.initialize(createTestTruth('Replacement')), false);
  const checks = await diagnose({ ...context, store });
  assert.equal(checks.find((check) => check.id === 'schema-version')?.ok, false);
  assert.equal(await readFile(file, 'utf8'), markdown);
  assert.equal(createTestTruth('New project').schemaVersion, 2);
});

async function mixedVersionFixture(t: Parameters<typeof temporaryDirectory>[0]) {
  const root = await temporaryDirectory(t);
  const childDirectory = path.join(root, 'packages/auth');
  await mkdir(childDirectory, { recursive: true });
  const parent = serializeTestTruth({ ...createTestTruth('Root'), includes: ['packages/auth/test-truth.md'] });
  const legacy = { ...contractFixture(), schemaVersion: 1 as const };
  const child = 'Package introduction\n\n' + serializeTestTruth(legacy) + '\nPackage ending\n';
  await writeFile(path.join(root, 'test-truth.md'), parent);
  await writeFile(path.join(childDirectory, 'test-truth.md'), child);
  return { root, childDirectory, parent, child, legacy };
}

test('explicit migration upgrades included v1 definitions without flattening or changing identities', async (t) => {
  const { root, childDirectory, parent, child, legacy } = await mixedVersionFixture(t);
  const store = new MarkdownContractStore(root);
  await store.read();
  assert.equal(await readFile(path.join(childDirectory, 'test-truth.md'), 'utf8'), child);
  await store.migrate();
  assert.equal(await store.readMarkdown(), parent);
  const migrated = await readFile(path.join(childDirectory, 'test-truth.md'), 'utf8');
  assert.deepEqual(parseTestTruth(migrated), { ...legacy, schemaVersion: 2 });
  assert.match(migrated, /^Package introduction\n\n/);
  assert.match(migrated, /\nPackage ending\n$/);
  assert.deepEqual((await store.read()).modules[0]!.paths, ['packages/auth/src/auth/**']);
  await store.migrate();
  assert.equal(await readFile(path.join(childDirectory, 'test-truth.md'), 'utf8'), migrated);
});

test('failed included-contract replacement preserves both documents and releases temporary files and locks', async (t) => {
  const { root, childDirectory, parent, child } = await mixedVersionFixture(t);
  const failure = new Error('Injected rename failure');
  const io: FileSystem = { ...nodeFileSystem, rename: async () => { throw failure; } };
  const store = new MarkdownContractStore(root, io);
  await assert.rejects(store.migrate(), failure);
  assert.equal(await store.readMarkdown(), parent);
  assert.equal(await readFile(path.join(childDirectory, 'test-truth.md'), 'utf8'), child);
  assert.deepEqual(await readdir(childDirectory), ['test-truth.md']);
  await assert.rejects(store.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Updated case' }), failure);
  assert.equal(await store.readMarkdown(), parent);
  assert.equal(await readFile(path.join(childDirectory, 'test-truth.md'), 'utf8'), child);
  assert.deepEqual((await readdir(root)).sort(), ['packages', 'test-truth.md']);
  assert.deepEqual(await readdir(childDirectory), ['test-truth.md']);
  const healthy = new MarkdownContractStore(root);
  await healthy.upsertCase('auth', { ...moduleFixture.tests[0]!, title: 'Retry succeeds' });
  assert.equal((await healthy.read()).modules[0]!.tests[0]!.title, 'Retry succeeds');
});
