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
export const testCaseSchema = z.strictObject({
  id: identifier,
  title: text,
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  preconditions: z.array(text).max(100),
  steps: z.array(testStepSchema).min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(100)).max(100),
});
export const testModuleSchema = z.strictObject({
  id: identifier,
  name: text,
  description: text,
  paths: z.array(sourcePatternSchema).min(1).max(100),
  tests: z.array(testCaseSchema).min(1).max(1000),
});
export const testTruthSchema = z.strictObject({
  schemaVersion: z.literal(1),
  project: text,
  policy: z.strictObject({
    mode: z.enum(['block', 'warn']),
    sourceGlobs: z.array(sourcePatternSchema).min(1).max(100),
    ignoreGlobs: z.array(sourcePatternSchema).max(100),
  }),
  modules: z.array(testModuleSchema).max(10_000),
}).superRefine((contract, context) => {
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
    schemaVersion: 1, project,
    policy: {
      mode: 'block',
      sourceGlobs: ['**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte,py,go,rs,java,kt,cs,rb,php,swift,c,cpp,h,sql,sh}'],
      ignoreGlobs: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '**/*.d.ts'],
    },
    modules: [],
  });
}
