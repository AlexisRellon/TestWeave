import { testTruthSchema, type TestTruth } from '../schema/test-truth.js';

export type SemanticValue = string | number | boolean | null | SemanticValue[] | { [key: string]: SemanticValue };
export interface ContractDiffChange {
  kind: 'added' | 'removed' | 'modified';
  entity: 'contract' | 'module' | 'test';
  moduleId?: string;
  testId?: string;
  field: string;
  before: SemanticValue;
  after: SemanticValue;
}
export interface ContractDiffReport { base: string; target: string; changes: ContractDiffChange[] }

// Steps are sequential; the remaining contract arrays describe unordered memberships/checks.
function canonical(value: unknown, field = ''): SemanticValue {
  if (Array.isArray(value)) {
    const entries = value.map((entry) => canonical(entry));
    return field === 'steps' ? entries : entries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry, key)] as const)
    .filter(([, entry]) => entry !== undefined && !(Array.isArray(entry) && !entry.length) &&
      !(entry && typeof entry === 'object' && !Array.isArray(entry) && !Object.keys(entry).length))
    );
  return value as SemanticValue;
}
function record(value: object): Record<string, SemanticValue> { return canonical(value) as Record<string, SemanticValue>; }

export function diffContracts(before: TestTruth | undefined, after: TestTruth | undefined,
  base = 'base', target = 'working-tree'): ContractDiffReport {
  const previous = before && testTruthSchema.parse(before);
  const current = after && testTruthSchema.parse(after);
  const changes: ContractDiffChange[] = [];
  const compare = (old: Record<string, SemanticValue>, next: Record<string, SemanticValue>,
    identity: Pick<ContractDiffChange, 'entity' | 'moduleId' | 'testId'>) => {
    for (const field of [...new Set([...Object.keys(old), ...Object.keys(next)])].sort()) {
      const left = old[field] ?? null;
      const right = next[field] ?? null;
      if (JSON.stringify(left) !== JSON.stringify(right)) changes.push({ ...identity, kind: 'modified', field, before: left, after: right });
    }
  };
  const metadata = (contract: TestTruth | undefined) => {
    if (!contract) return {};
    const { modules: _modules, includes: _includes, schemaVersion: _version, ...rest } = contract;
    return record({ ...rest, policy: { ...rest.policy, docDriftMode: rest.policy.docDriftMode ?? 'warn' } });
  };
  compare(metadata(previous), metadata(current), { entity: 'contract' });
  const modules = (contract: TestTruth | undefined) => new Map(contract?.modules.map((module) => {
    const { tests: _tests, ...rest } = module;
    return [module.id, record(rest)] as const;
  }));
  const tests = (contract: TestTruth | undefined) => new Map(contract?.modules.flatMap((module) =>
    module.tests.map((test) => [test.id, record({ ...test, moduleId: module.id })] as const)));
  for (const [entity, old, next] of [['module', modules(previous), modules(current)], ['test', tests(previous), tests(current)]] as const) {
    for (const id of [...new Set([...old.keys(), ...next.keys()])].sort()) {
      const left = old.get(id);
      const right = next.get(id);
      const identity = entity === 'module' ? { entity, moduleId: id } :
        { entity, moduleId: String((right ?? left)!.moduleId), testId: id };
      if (!left || !right) changes.push({ ...identity, kind: left ? 'removed' : 'added', field: entity, before: left ?? null, after: right ?? null });
      else compare(left, right, identity);
    }
  }
  return { base, target, changes };
}
