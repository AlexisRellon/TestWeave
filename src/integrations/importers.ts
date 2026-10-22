import { z } from 'zod';
import { testCaseSchema, type TestCase } from '../schema/test-truth.js';

export const importOptionsSchema = z.strictObject({
  source: z.enum(['jira', 'xray', 'zephyr', 'testrail']),
  format: z.enum(['csv', 'json']), module: z.string().min(1),
  paths: z.string().min(1).optional(), name: z.string().min(1).optional(),
});
type Row = Record<string, unknown>;
const record = (value: unknown): Row => z.record(z.string(), z.unknown()).parse(value);
function field(row: Row, ...names: string[]): string {
  for (const name of names) {
    const value = row[name];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}
function strings(value: unknown): string[] {
  if (value === undefined || value === '') return [];
  if (Array.isArray(value)) return z.array(z.string()).parse(value);
  return z.string().parse(value).split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);
}
export function parseCsv(content: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const finishCell = () => { row.push(cell); cell = ''; closed = false; };
  const finishRow = () => { finishCell(); if (row.some(Boolean)) rows.push(row); row = []; };
  const source = content.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ',') finishCell();
    else if (char === '\r' || char === '\n') { if (char === '\r' && source[index + 1] === '\n') index++; finishRow(); }
    else if (char === '"' && !cell && !closed) quoted = true;
    else { if (closed || char === '"') throw new Error('Malformed CSV quoting'); cell += char; }
  }
  if (quoted) throw new Error('Unterminated CSV quote');
  if (cell || row.length || closed) finishRow();
  const headers = rows.shift();
  if (!headers || new Set(headers).size !== headers.length || headers.some((header) => !header)) throw new Error('CSV requires unique nonempty headers');
  return rows.map((values) => {
    if (values.length !== headers.length) throw new Error('CSV row width does not match headers');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]!]));
  });
}
function descriptionSteps(value: string): { preconditions: string[]; steps: { action: string; data: string; expected: string }[] } {
  const preconditions = value.split('Preconditions:\n')[1]?.split(/\n\n(?=\d+\.)/)[0]?.split('\n').filter(Boolean) ?? [];
  const steps = [...value.matchAll(/(?:^|\n\n)\d+\. ([\s\S]*?)\nData: ([\s\S]*?)\nExpected: ([\s\S]*?)(?=\n\n\d+\. |$)/g)]
    .map((match) => ({ action: match[1]!, data: match[2]!, expected: match[3]! }));
  return { preconditions, steps };
}
export function importCases(content: string, source: 'jira' | 'xray' | 'zephyr' | 'testrail', format: 'csv' | 'json'): TestCase[] {
  if (Buffer.byteLength(content) > 10_000_000) throw new Error('Import must be no larger than 10 MB');
  let rows: Row[];
  if (format === 'csv') rows = parseCsv(content);
  else {
    const value: unknown = JSON.parse(content);
    if (Array.isArray(value)) rows = value.map(record);
    else {
      const root = record(value);
      if (Array.isArray(root.projects)) rows = root.projects.flatMap((project) => z.array(z.unknown()).parse(record(project).issues).map(record));
      else rows = z.array(z.unknown()).parse(root.cases ?? root.tests ?? root.issues).map(record);
    }
  }
  const tests = new Map<string, TestCase>();
  let lastId = '';
  for (const outer of rows) {
    const row = { ...outer, ...(outer.fields ? record(outer.fields) : {}), ...(outer.testCase ? record(outer.testCase) : {}) };
    const summary = field(row, 'title', 'summary', 'Summary', 'Name', 'Title', 'name');
    const bracket = /^\[([^\]]+)\]\s*(.*)/s.exec(summary);
    const id = field(row, 'externalId', 'External ID', 'Test Case Identifier', 'ID', 'id', 'key') || bracket?.[1] || (source === 'zephyr' ? lastId : '');
    if (!id) throw new Error('Imported case requires a stable ID');
    const title = bracket?.[2] || summary || tests.get(id)?.title;
    const description = field(row, 'description', 'Description', 'Objective', 'objective');
    const described = descriptionSteps(description);
    let rawSteps: unknown = row.steps ?? row.custom_steps_separated ?? row.Steps;
    if (typeof rawSteps === 'string') {
      try { rawSteps = JSON.parse(rawSteps); } catch { rawSteps = [{ action: rawSteps, expected: field(row, 'Expected Result', 'custom_expected'), data: '' }]; }
    }
    if (outer.testSteps) rawSteps = record(outer.testSteps).items;
    let steps = rawSteps === undefined ? described.steps : z.array(z.unknown()).parse(rawSteps).map((value) => {
      const raw = record(value);
      const step = raw.inline ? record(raw.inline) : raw;
      return { action: field(step, 'action', 'content', 'description'), data: field(step, 'data', 'testData'),
        expected: field(step, 'expected', 'result', 'expectedResult') };
    });
    const action = field(row, 'Action', 'Test Script (Step-by-Step) - Step');
    if (action) steps = [{ action, data: field(row, 'Data', 'Test Script (Step-by-Step) - Test Data'),
      expected: field(row, 'Expected Result', 'Test Script (Step-by-Step) - Expected Result') }];
    const previous = tests.get(id);
    if (previous) {
      if (source !== 'xray' && source !== 'zephyr') throw new Error(`Duplicate imported ID: ${id}`);
      if (summary && title !== previous.title) throw new Error(`Conflicting imported ID: ${id}`);
      tests.set(id, testCaseSchema.parse({ ...previous, steps: [...previous.steps, ...steps] }));
    } else {
      const rawPriority = typeof row.priority === 'object' && row.priority ? field(record(row.priority), 'name') : field(row, 'priority', 'Priority', 'priorityName');
      const priority = ({ '1': 'low', '2': 'medium', '3': 'high', '4': 'critical', highest: 'critical', normal: 'medium' } as Record<string, string>)[rawPriority.toLowerCase()] ?? (rawPriority.toLowerCase() || 'medium');
      const preconditions = row.preconditions ?? row.Preconditions ?? row.Precondition ?? row.precondition ?? row.custom_preconds;
      const type = field(row, 'type', 'Type', 'testtype', 'Test Type') || 'regression';
      const refs = typeof row.Refs === 'string' ? JSON.parse(row.Refs) as unknown : row.refs;
      const profile = typeof row.Profile === 'string' ? JSON.parse(row.Profile) as unknown : row.profile;
      tests.set(id, testCaseSchema.parse({ id, title, priority, type: type === 'Manual' ? 'regression' : type,
        preconditions: preconditions === undefined ? described.preconditions : Array.isArray(preconditions) ? preconditions : String(preconditions).split('\n').filter(Boolean),
        steps, tags: strings(row.tags ?? row.Labels ?? row.labels ?? row.Tags),
        ...(refs ? { refs } : {}), ...(profile ? { profile } : {}),
      }));
    }
    lastId = id;
  }
  if (!tests.size) throw new Error('Import contains no cases');
  return [...tests.values()];
}
