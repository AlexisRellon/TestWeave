import path from 'node:path';
import { parseTestTruth } from './markdown.js';
import { testTruthSchema, type TestModule, type TestTruth } from '../schema/test-truth.js';

export interface ContractDocument { file: string; contract: TestTruth; markdown: string }
export function rebaseModule(module: TestModule, directory: string, reverse = false): TestModule {
  const prefix = (value: string): string => {
    if (reverse && !value.startsWith(`${directory}/`)) throw new Error(`Included module paths must stay inside ${directory}: ${value}`);
    return reverse ? value.slice(directory.length + 1) : `${directory}/${value}`;
  };
  if (!directory || directory === '.') return module;
  return { ...module, paths: module.paths.map(prefix),
    ...(module.docs ? { docs: module.docs.map(prefix) } : {}),
    ...(module.specs ? { specs: module.specs.map(prefix) } : {}),
    tests: module.tests.map((test) => ({ ...test, ...(test.refs ? {
      refs: test.refs.map((ref) => /\.md(?:#|$)/i.test(ref) ? prefix(ref) : ref),
    } : {}) })),
  };
}

export async function compileContract(markdown: string, read: (file: string) => Promise<string | undefined>): Promise<{
  contract: TestTruth; documents: ContractDocument[];
}> {
  const documents: ContractDocument[] = [];
  const seen = new Set<string>();
  const visit = async (file: string, content: string): Promise<void> => {
    if (seen.has(file)) throw new Error(`Repeated or cyclic contract include: ${file}`);
    if (documents.length >= 100) throw new Error('At most 100 contract documents may be included');
    seen.add(file);
    const contract = parseTestTruth(content);
    documents.push({ file, contract, markdown: content });
    for (const include of contract.includes ?? []) {
      const child = path.posix.join(path.posix.dirname(file), include);
      const next = await read(child);
      if (next === undefined) throw new Error(`Missing included contract: ${child}`);
      await visit(child, next);
    }
  };
  await visit('test-truth.md', markdown);
  const root = documents[0]!.contract;
  const fixtures = { ...root.fixtures };
  for (const document of documents.slice(1)) for (const [key, value] of Object.entries(document.contract.fixtures ?? {})) {
    if (Object.hasOwn(fixtures, key)) throw new Error(`Duplicate fixture: ${key}`);
    fixtures[key] = value;
  }
  const contract = testTruthSchema.parse({ ...root,
    ...(Object.keys(fixtures).length ? { fixtures } : {}),
    docs: documents.flatMap((document) => (document.contract.docs ?? []).map((pointer) =>
      path.posix.join(path.posix.dirname(document.file), pointer))),
    modules: documents.flatMap((document) => document.contract.modules.map((module) =>
      rebaseModule(module, path.posix.dirname(document.file)))),
  });
  // Preserve omitted fields for optimistic comparisons and compact contracts.
  if (!contract.docs?.length && !root.docs) delete contract.docs;
  return { contract, documents };
}

export function expandFixtures(contract: TestTruth): TestTruth {
  const cache = new Map<string, string>();
  const expand = (value: string, active: string[] = []): string => {
    const result = value.replace(/\{\{fixture\.([a-zA-Z0-9._-]+)\}\}/g, (_, key: string) => {
    const fixture = contract.fixtures && Object.hasOwn(contract.fixtures, key) ? contract.fixtures[key] : undefined;
    if (fixture === undefined) throw new Error(`Unknown fixture: ${key}`);
    if (active.includes(key)) throw new Error(`Cyclic fixture: ${[...active, key].join(' -> ')}`);
    if (active.length >= 100) throw new Error('Fixture nesting exceeds 100 levels');
    if (!cache.has(key)) cache.set(key, expand(fixture, [...active, key]));
    return cache.get(key)!;
    });
    if (result.length > 20_000) throw new Error('Expanded fixture text exceeds 20,000 characters');
    return result;
  };
  for (const key of Object.keys(contract.fixtures ?? {})) expand(`{{fixture.${key}}}`);
  return { ...contract, modules: contract.modules.map((module) => ({ ...module, tests: module.tests.map((test) => ({
    ...test, preconditions: test.preconditions.map((value) => expand(value)),
    steps: test.steps.map((step) => ({ action: expand(step.action), data: expand(step.data), expected: expand(step.expected) })),
  })) })) };
}
