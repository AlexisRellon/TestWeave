import { z } from 'zod';

const text = z.string().trim().min(1).max(20_000);
const identifier = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/);
export const sourcePatternSchema = z.string().min(1).max(500).refine(
  (value) => !value.startsWith('/') && !value.startsWith('!') &&
    !value.includes('\\') && !value.includes(':') &&
    !value.split('/').some((part) => part === '..') && !/[\r\n\0]/.test(value),
  'Use a positive, workspace-relative POSIX glob without parent traversal',
);
export const testStepSchema = z.strictObject({ action: text, data: z.string().max(20_000), expected: text });
export const specPointerSchema = z.string().min(1).max(500).refine((value) => {
  const [file, anchor, ...extra] = value.split('#');
  return !!file && !extra.length && !/[\r\n\0]/.test(value) && (anchor === undefined || anchor.length > 0) &&
    !/^[\\/]|[:\\\r\n\0*?]/.test(file) && !file.split('/').includes('..') &&
    !/(?:^|\/)superpowers\/plans\//.test(file);
}, 'Use a permanent workspace-relative document pointer with an optional heading anchor');

export const TEST_TYPES = [
  'unit',
  'integration',
  'system',
  'sanity',
  'smoke',
  'regression',
  'uat',
  'ui',
  'api',
  'interface',
  'component',
  'e2e',
  'accessibility',
  'security',
  'performance',
  'compatibility',
] as const;

export type TestType = typeof TEST_TYPES[number];

export const TEST_TYPE_LABELS: Record<TestType, string> = {
  unit: 'Unit Testing',
  integration: 'Integration Testing',
  system: 'System Testing',
  sanity: 'Sanity Testing',
  smoke: 'Smoke Testing',
  regression: 'Regression Testing',
  uat: 'User Acceptance Testing (UAT)',
  ui: 'UI Testing',
  api: 'API Testing',
  interface: 'Interface Testing',
  component: 'Component Testing',
  e2e: 'End-to-End Testing',
  accessibility: 'Accessibility Testing',
  security: 'Security Testing',
  performance: 'Performance Testing',
  compatibility: 'Compatibility Testing',
};

const TEST_TYPE_SYNONYMS: Record<string, TestType> = {
  unit: 'unit',
  'unit testing': 'unit',
  'unit-testing': 'unit',
  integration: 'integration',
  'integration testing': 'integration',
  'integration-testing': 'integration',
  system: 'system',
  'system testing': 'system',
  'system-testing': 'system',
  sanity: 'sanity',
  'sanity testing': 'sanity',
  'sanity-testing': 'sanity',
  smoke: 'smoke',
  'smoke testing': 'smoke',
  'smoke-testing': 'smoke',
  regression: 'regression',
  'regression testing': 'regression',
  'regression-testing': 'regression',
  uat: 'uat',
  'user acceptance': 'uat',
  'user acceptance testing': 'uat',
  'user acceptance testing (uat)': 'uat',
  'user-acceptance': 'uat',
  'user-acceptance-testing': 'uat',
  'uat (user acceptance)': 'uat',
  'user acceptance (uat)': 'uat',
  acceptance: 'uat',
  ui: 'ui',
  'ui testing': 'ui',
  'ui-testing': 'ui',
  gui: 'ui',
  'gui testing': 'ui',
  api: 'api',
  'api testing': 'api',
  'api-testing': 'api',
  interface: 'interface',
  'interface testing': 'interface',
  'interface-testing': 'interface',
  component: 'component',
  'component testing': 'component',
  'component-testing': 'component',
  e2e: 'e2e',
  'e2e testing': 'e2e',
  'end to end': 'e2e',
  'end-to-end': 'e2e',
  'end-to-end testing': 'e2e',
  'accessibility testing': 'accessibility',
  'security testing': 'security',
  'performance testing': 'performance',
  'compatibility testing': 'compatibility',
};

export const testTypeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  return TEST_TYPE_SYNONYMS[normalized] ?? normalized;
}, z.enum(TEST_TYPES));

export const nftProfileSchema = z.strictObject({
  wcagTarget: text.optional(),
  keyboard: z.array(text).max(100).optional(),
  screenReader: z.array(text).max(100).optional(),
  authzMatrix: z.array(z.strictObject({ role: text, resource: text, access: z.enum(['allow', 'deny']) })).max(100).optional(),
  session: z.array(text).max(100).optional(),
  inputBoundaries: z.array(text).max(100).optional(),
  viewports: z.array(z.strictObject({ width: z.number().int().positive(), height: z.number().int().positive() })).max(100).optional(),
  network: text.optional(),
  budgets: z.array(z.strictObject({ metric: text, limit: z.number().nonnegative().finite(), unit: text })).max(100).optional(),
  checklist: z.array(text).max(100).optional(),
});
const baseTestCaseSchema = z.strictObject({
  id: identifier,
  title: text,
  type: testTypeSchema.default('regression'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  preconditions: z.array(text).max(100).default([]),
  steps: z.array(testStepSchema).min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  refs: z.array(text).max(100).optional(),
  profile: nftProfileSchema.optional(),
});

export const testCaseSchema = z.preprocess((input) => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const record = { ...(input as Record<string, unknown>) };
    if ('testType' in record && !('type' in record)) {
      record.type = record.testType;
      delete record.testType;
    }
    return record;
  }
  return input;
}, baseTestCaseSchema);
export const testModuleSchema = z.strictObject({
  id: identifier,
  name: text,
  description: text,
  paths: z.array(sourcePatternSchema).min(1).max(100),
  docs: z.array(specPointerSchema).max(100).optional(),
  specs: z.array(specPointerSchema).max(100).optional(),
  tests: z.array(testCaseSchema).min(1).max(1000),
});
// Strict-output APIs require nullable optional fields. Normalize nulls before storage.
export const structuredModuleSchema = testModuleSchema.extend({
  docs: z.array(specPointerSchema).max(100).nullable().optional(),
  specs: z.array(specPointerSchema).max(100).nullable().optional(),
  tests: z.array(baseTestCaseSchema.extend({
    refs: z.array(text).max(100).nullable().optional(),
    profile: nftProfileSchema.extend(Object.fromEntries(
      Object.entries(nftProfileSchema.shape).map(([key, field]) => [key, field.nullable()]),
    )).nullable().optional(),
  })).min(1).max(1000),
});
export const testTruthSchema = z.strictObject({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  project: text,
  docs: z.array(specPointerSchema).max(100).optional(),
  fixtures: z.record(identifier, text).optional(),
  includes: z.array(specPointerSchema.refine((value) => !value.includes('#') && value.endsWith('/test-truth.md'),
    'Includes must name a subdirectory test-truth.md without an anchor')).max(100).optional(),
  policy: z.strictObject({
    mode: z.enum(['block', 'warn']),
    sourceGlobs: z.array(sourcePatternSchema).min(1).max(100),
    ignoreGlobs: z.array(sourcePatternSchema).max(100),
    docDriftMode: z.enum(['warn', 'block', 'ignore']).optional(),
  }),
  modules: z.array(testModuleSchema).max(10_000),
}).superRefine((contract, context) => {
  if (contract.schemaVersion === 1 && (contract.fixtures || contract.includes || contract.modules.some((module) =>
    module.tests.some((test) => test.profile || ['accessibility', 'security', 'performance', 'compatibility'].includes(test.type))))) {
    context.addIssue({ code: 'custom', message: 'Fixtures, includes and NFT profiles require schemaVersion 2' });
  }
  const moduleIds = new Set<string>();
  const testIds = new Set<string>();
  for (const [moduleIndex, module] of contract.modules.entries()) {
    if (moduleIds.has(module.id)) context.addIssue({ code: 'custom', message: 'Duplicate module ID', path: ['modules', moduleIndex, 'id'] });
    moduleIds.add(module.id);
    for (const [testIndex, test] of module.tests.entries()) {
      if (testIds.has(test.id)) context.addIssue({ code: 'custom', message: 'Test IDs must be globally unique', path: ['modules', moduleIndex, 'tests', testIndex, 'id'] });
      testIds.add(test.id);
    }
  }
});

export type TestStep = z.infer<typeof testStepSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type TestModule = z.infer<typeof testModuleSchema>;
export type TestTruth = z.infer<typeof testTruthSchema>;

export function createTestTruth(project: string): TestTruth {
  return testTruthSchema.parse({
    schemaVersion: 2, project,
    policy: {
      mode: 'block',
      sourceGlobs: ['**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,py,go,rs,java,kt,cs,rb,php,swift,c,cpp,h,sql,sh}'],
      ignoreGlobs: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.d.ts'],
    },
    modules: [],
  });
}
