import { z } from 'zod';
import { testTruthSchema, TEST_TYPE_LABELS, type TestCase, type TestTruth } from '../schema/test-truth.js';
import picomatch from 'picomatch';
import { expandFixtures } from '../engine/includes.js';
import { canvasGraph, contractGraph, graphDiagram, obsidianNotes } from './graph.js';

export const exportOptionsSchema = z.strictObject({
  target: z.enum(['jira', 'xray', 'zephyr', 'testrail', 'qase', 'gherkin', 'checklist', 'obsidian', 'canvas', 'graph']).default('xray'),
  format: z.enum(['csv', 'json', 'mermaid', 'dot', 'markdown', 'feature']).default('csv'),
  projectKey: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  module: z.string().min(1).optional(),
  tags: z.string().trim().min(1).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  changedSince: z.string().min(1).optional(),
});
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
export interface ExportArtifact { content: string; mimeType: string; filename: string; testCount: number; files?: Record<string, string> }

export function csvCell(value: string): string {
  // CSV quoting alone does not prevent spreadsheet formula execution.
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
function csv(rows: string[][]): string { return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
function priority(test: TestCase): string { return test.priority.charAt(0).toUpperCase() + test.priority.slice(1); }
function testType(test: TestCase): string { return TEST_TYPE_LABELS[test.type] ?? test.type; }
function description(moduleDescription: string, test: TestCase): string {
  return moduleDescription + '\n\nPreconditions:\n' + test.preconditions.join('\n') + '\n\n' +
    test.steps.map((step, index) => `${index + 1}. ${step.action}\nData: ${step.data}\nExpected: ${step.expected}`).join('\n\n');
}
function exportCsv(contract: TestTruth, options: ExportOptions): string {
  const rows = contract.modules.flatMap((module) => module.tests.map((test) => ({ module, test })));
  if (options.target === 'jira') return csv([
    ['External ID', 'Summary', 'Issue Type', 'Description', 'Priority', 'Labels'],
    ...rows.map(({ module, test }) => [test.id, test.title, 'Test', description(module.description, test), priority(test), [...test.tags, test.type].join(' ')]),
  ]);
  if (options.target === 'xray') return csv([
    ['Test Case Identifier', 'Summary', 'Test Type', 'Description', 'Priority', 'Action', 'Data', 'Expected Result'],
    ...rows.flatMap(({ module, test }) => test.steps.map((step) => [test.id, test.title, testType(test),
      module.description + '\nPreconditions:\n' + test.preconditions.join('\n'), priority(test), step.action, step.data, step.expected])),
  ]);
  return csv([
    ['Name', 'Objective', 'Precondition', 'Priority', 'Folder', 'Labels', 'Test Script (Step-by-Step) - Step',
      'Test Script (Step-by-Step) - Test Data', 'Test Script (Step-by-Step) - Expected Result'],
    ...rows.flatMap(({ module, test }) => test.steps.map((step, index) => [
      index === 0 ? `[${test.id}] ${test.title}` : '', index === 0 ? module.description : '',
      index === 0 ? test.preconditions.join('\n') : '', index === 0 ? priority(test) : '',
      index === 0 ? module.name : '', index === 0 ? [...test.tags, test.type].join(',') : '', step.action, step.data, step.expected,
    ])),
  ]);
}
function exportJson(contract: TestTruth, options: ExportOptions): unknown {
  if (!options.projectKey) throw new Error('JSON exports require --project-key for the destination Jira project');
  const rows = contract.modules.flatMap((module) => module.tests.map((test) => ({ module, test })));
  if (options.target === 'jira') return { projects: [{ key: options.projectKey, issues: rows.map(({ module, test }) => ({
    externalId: test.id, summary: test.title, issueType: 'Test', description: description(module.description, test),
    priority: priority(test), labels: [...test.tags, test.type],
  })) }] };
  if (options.target === 'xray') return rows.map(({ module, test }) => ({
    testtype: testType(test), fields: {
      project: { key: options.projectKey }, summary: `[${test.id}] ${test.title}`,
      description: module.description + '\nPreconditions:\n' + test.preconditions.join('\n'), labels: [...test.tags, test.type],
      priority: { name: priority(test) },
    },
    steps: test.steps.map((step) => ({ action: step.action, data: step.data, result: step.expected })),
  }));
  // Zephyr requires separate case and step REST calls; export both request bodies.
  return { format: 'testweave-zephyr-rest-bundle-v1', cases: rows.map(({ module, test }) => ({
    externalId: test.id,
    testCase: {
      projectKey: options.projectKey, name: `[${test.id}] ${test.title}`, objective: module.description,
      precondition: test.preconditions.join('\n'), labels: test.tags, priorityName: priority(test),
    },
    testSteps: { mode: 'OVERWRITE', items: test.steps.map((step) => ({ inline: {
      description: step.action, testData: step.data, expectedResult: step.expected,
    } })) },
  })) };
}
export function generateExport(input: TestTruth, inputOptions: ExportOptions,
  context: { changedFiles?: string[]; drift?: Record<string, string> } = {}): ExportArtifact {
  const options = exportOptionsSchema.parse(inputOptions);
  if (options.changedSince && !context.changedFiles) throw new Error('changedSince requires Git changed-file context');
  const original = testTruthSchema.parse(input);
  if (options.module && !original.modules.some((module) => module.id === options.module)) throw new Error(`Unknown module: ${options.module}`);
  const tags = options.tags?.split(',').map((tag) => tag.trim()).filter(Boolean);
  if (tags && !tags.length) throw new Error('Provide at least one tag');
  const contract = expandFixtures({ ...original, modules: original.modules.filter((module) =>
    (!options.module || module.id === options.module) && (!context.changedFiles || context.changedFiles.some((file) =>
      picomatch(module.paths, { dot: true })(file) || [...original.docs ?? [], ...module.docs ?? [], ...module.specs ?? [],
        ...module.tests.flatMap((test) => test.refs ?? [])]
        .some((pointer) => pointer.split('#')[0] === file)))).map((module) => ({ ...module,
    tests: module.tests.filter((test) => (!options.priority || test.priority === options.priority) &&
      (!tags || tags.every((tag) => test.tags.includes(tag)))),
  })).filter((module) => module.tests.length) });
  const testCount = contract.modules.reduce((total, module) => total + module.tests.length, 0);
  const artifact = (content: string, extension: string, mimeType: string): ExportArtifact => ({
    content, filename: `testweave-${options.target}.${extension}`, mimeType, testCount,
  });
  if (['graph', 'canvas', 'obsidian'].includes(options.target)) {
    const graph = contractGraph(contract, context.drift);
    if (options.target === 'obsidian') {
      const files = obsidianNotes(graph);
      return { ...artifact(JSON.stringify(files, null, 2) + '\n', 'json', 'application/json'), files };
    }
    if (options.target === 'canvas') return artifact(JSON.stringify(canvasGraph(graph), null, 2) + '\n', 'canvas', 'application/json');
    if (!['csv', 'json', 'mermaid', 'dot'].includes(options.format)) throw new Error('Graph format must be json, mermaid or dot');
    if (options.format === 'mermaid' || options.format === 'dot') return artifact(graphDiagram(graph, options.format), options.format === 'dot' ? 'dot' : 'mmd', 'text/plain');
    return artifact(JSON.stringify(graph, null, 2) + '\n', 'json', 'application/json');
  }
  const rows = contract.modules.flatMap((module) => module.tests.map((test) => ({ module, test })));
  if (options.target === 'checklist' || options.target === 'gherkin') {
    const line = (value: string) => value.replace(/\r?\n/g, ' ');
    if (options.target === 'checklist') return artifact('# QA release checklist\n\n' + rows.map(({ module, test }) =>
      `- [ ] ${line(test.id)}: ${line(test.title)} (${module.id}, ${test.priority})\n` +
      [...test.preconditions.map((value) => `  - Precondition: ${line(value)}`), ...test.steps.map((step) =>
        `  - ${line(step.action)}; data: ${line(step.data)}; expected: ${line(step.expected)}`),
      ...(test.profile ? [`  - Profile: ${JSON.stringify(test.profile)}`] : [])].join('\n')).join('\n\n') + '\n', 'md', 'text/markdown');
    return artifact(contract.modules.map((module) => `Feature: ${line(module.name)}\n\n` + module.tests.map((test) =>
      `  # ${test.id}; priority: ${test.priority}; type: ${test.type}\n  Scenario: ${line(test.title)}\n` +
      test.preconditions.map((value) => `    Given ${line(value)}\n`).join('') + test.steps.map((step) =>
        `    When ${line(step.action)}\n    # Data: ${line(step.data)}\n    Then ${line(step.expected)}\n`).join('')).join('\n')).join('\n'), 'feature', 'text/plain');
  }
  if (!['csv', 'json'].includes(options.format)) throw new Error('QA suite exports require csv or json');
  if (options.target === 'testrail' || options.target === 'qase') {
    const cases = rows.map(({ module, test }) => ({ id: test.id, title: test.title, section: module.name,
      priority: test.priority, type: test.type, preconditions: test.preconditions, steps: test.steps, tags: test.tags,
      ...(test.refs ? { refs: test.refs } : {}), ...(test.profile ? { profile: test.profile } : {}),
    }));
    return artifact(options.format === 'json' ? JSON.stringify({ format: `testweave-${options.target}-v1`, cases }, null, 2) + '\n'
      : csv([['ID', 'Title', 'Section', 'Priority', 'Type', 'Preconditions', 'Steps', 'Expected Result', 'Tags', 'Refs', 'Profile'],
        ...cases.map((test) => [test.id, test.title, test.section, test.priority, test.type, test.preconditions.join('\n'),
          JSON.stringify(test.steps), test.steps.map((step) => step.expected).join('\n'), test.tags.join(','),
          JSON.stringify(test.refs ?? []), JSON.stringify(test.profile ?? null)])]), options.format,
    options.format === 'csv' ? 'text/csv' : 'application/json');
  }
  return {
    content: options.format === 'csv' ? exportCsv(contract, options) : JSON.stringify(exportJson(contract, options), null, 2) + '\n',
    mimeType: options.format === 'csv' ? 'text/csv' : 'application/json',
    filename: `testweave-${options.target}.${options.format}`,
    testCount,
  };
}
