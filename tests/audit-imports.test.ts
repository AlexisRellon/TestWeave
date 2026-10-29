import test from 'node:test';
import assert from 'node:assert/strict';
import { contractFixture } from './helpers.js';
import { TEST_TYPES, TEST_TYPE_LABELS, testTypeSchema } from '../src/schema/test-truth.js';
import { generateExport } from '../src/integrations/exporters.js';
import { importCases } from '../src/integrations/importers.js';

test('Xray CSV and JSON exports reimport every emitted test type label', () => {
  for (const type of TEST_TYPES) for (const format of ['csv', 'json'] as const) {
    const contract = contractFixture();
    contract.modules[0]!.tests[0]!.type = type;
    const artifact = generateExport(contract, { target: 'xray', format, projectKey: 'QA' });
    assert.equal(importCases(artifact.content, 'xray', format)[0]!.type, type,
      `${type} (${TEST_TYPE_LABELS[type]}) via ${format}`);
  }
  for (const type of TEST_TYPES) assert.equal(testTypeSchema.parse(TEST_TYPE_LABELS[type]), type);
});

test('Jira CSV keeps separate labels usable for tag filtering without inferring types', () => {
  const contract = contractFixture();
  contract.modules[0]!.tests[0]!.type = 'smoke';
  contract.modules[0]!.tests[0]!.tags = ['release', 'login'];
  const csv = generateExport(contract, { target: 'jira', format: 'csv' }).content;
  const [imported] = importCases(csv, 'jira', 'csv');
  assert.deepEqual(imported!.tags, ['release', 'login', 'smoke']);
  assert.equal(imported!.type, 'regression', 'a smoke label alone is not an explicit test type');
  const json = generateExport(contract, { target: 'jira', format: 'json', projectKey: 'QA' }).content;
  assert.deepEqual(imported!.tags, importCases(json, 'jira', 'json')[0]!.tags);
  for (const tag of imported!.tags) assert.equal(generateExport({ ...contract, modules: [{ ...contract.modules[0]!, tests: [imported!] }] },
    { target: 'jira', format: 'csv', tags: tag }).testCount, 1);
});
