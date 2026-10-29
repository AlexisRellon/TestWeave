import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { impact, specContext } from '../src/engine/queries.js';
import { contractFixture, repositoryFixture, temporaryDirectory } from './helpers.js';

test('planned recursive glob overlap finishes within a bounded subprocess', async (t) => {
  const root = await temporaryDirectory(t);
  const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { impact } from ${JSON.stringify(new URL('../src/engine/queries.ts', import.meta.url).href)};
    import { contractFixture } from ${JSON.stringify(new URL('./helpers.ts', import.meta.url).href)};
    const contract = contractFixture();
    contract.modules[0].paths = ['**/'.repeat(14) + 'b'];
    assert.deepEqual((await impact(process.argv[1], contract, ['**/'.repeat(14) + 'a'])).modules, []);
    console.log('completed');
  `, root], { timeout: 5_000 });
  assert.equal(result.stdout.trim(), 'completed');
});

test('planned glob overlap retains zero-depth, nested and conservative wildcard matches', async (t) => {
  const root = await temporaryDirectory(t);
  const contract = contractFixture();
  for (const [pattern, query, expected] of [
    ['src/**/a.ts', 'src/a.ts', true],
    ['src/**/a.ts', 'src/x/**/a.ts', true],
    ['src/**/a.ts', 'other/**/a.ts', false],
    ['src/*/a.ts', 'src/?/a.ts', true],
    ['src/**', 'src', true],
  ] as const) {
    contract.modules[0]!.paths = [pattern];
    assert.equal((await impact(root, contract, [query])).modules.length > 0, expected, `${pattern}: ${query}`);
  }
});

for (const localState of ['dirty', 'deleted'] as const) {
  test(`explicit spec target reads committed sections when local spec is ${localState}`, async (t) => {
    const { root, git } = await repositoryFixture(t);
    const file = path.join(root, 'spec.md');
    await writeFile(file, '# Login\nold rule\n# Other\nold neighbor\n');
    await git.add('.');
    await git.commit('Base specification');
    const base = (await git.revparse(['HEAD'])).trim();
    await writeFile(file, '# Login\ncommitted rule\n# Other\nnew neighbor\n');
    await git.add('.');
    await git.commit('Target specification');
    const target = (await git.revparse(['HEAD'])).trim();
    await writeFile(file, '# Login\nlocal rule\n# Other\nlocal neighbor\n');
    if (localState === 'deleted') await rm(file);
    const scoped = await specContext(root, contractFixture(), 'spec.md#login', base, target);
    assert.equal(scoped.sections[0]?.content, '# Login\ncommitted rule\n');
    assert.match(scoped.diff, /-old rule/);
    assert.match(scoped.diff, /\+committed rule/);
    assert.doesNotMatch(scoped.diff, /neighbor|local rule/);
    if (localState === 'dirty') {
      assert.equal((await specContext(root, contractFixture(), 'spec.md#login', base)).sections[0]?.content, '# Login\nlocal rule\n');
    } else await assert.rejects(specContext(root, contractFixture(), 'spec.md#login', base), /ENOENT/);
  });
}

test('committed spec slices preserve pointer, anchor, reference and byte-size boundaries', async (t) => {
  const { root, git } = await repositoryFixture(t);
  await writeFile(path.join(root, 'spec.md'), '# Login\nfirst\n# Login\nsecond\n');
  await writeFile(path.join(root, 'large.md'), 'é'.repeat(500_001));
  await git.add('.');
  await git.commit('Boundary specifications');
  const contract = contractFixture();
  assert.equal((await specContext(root, contract, 'spec.md#login-1', undefined, 'HEAD')).sections[0]?.content, '# Login\nsecond\n');
  await assert.rejects(specContext(root, contract, 'spec.md#missing', undefined, 'HEAD'), /Missing heading/);
  await assert.rejects(specContext(root, contract, 'missing.md', undefined, 'HEAD'), /spec/i);
  await assert.rejects(specContext(root, contract, 'large.md', undefined, 'HEAD'), /no larger than 1 MB/);
  await assert.rejects(specContext(root, contract, '../spec.md', undefined, 'HEAD'));
  await assert.rejects(specContext(root, contract, 'spec.md', undefined, '--invalid'), /Invalid Git reference/);
});
