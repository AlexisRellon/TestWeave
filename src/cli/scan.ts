import path from 'node:path';
import { z } from 'zod';
import type { CliContext } from './context.js';
import { isMissing } from '../engine/files.js';
import { scanProject } from '../engine/scan.js';
import { createTestTruth } from '../schema/test-truth.js';

const optionsSchema = z.strictObject({
  apply: z.boolean().optional(), json: z.boolean().optional(), context: z.string().min(1).optional(),
});
export async function runScan(context: CliContext, input: unknown): Promise<void> {
  const options = optionsSchema.parse(input);
  let contract;
  try { contract = await context.store.read(); }
  catch (error) {
    if (!isMissing(error)) throw error;
    contract = createTestTruth(path.basename(context.root));
  }
  const report = await scanProject(context.root, contract, options.context);
  if (options.apply && report.modules.length) {
    await context.store.initialize(contract);
    await context.store.append(report.modules, contract);
  }
  if (options.json) {
    context.output.log(JSON.stringify({ ...report, applied: options.apply ? report.modules.length : 0 }, null, 2));
    return;
  }
  context.output.log('Project context (read before source): ' + (report.context.map((entry) => entry.file).join(', ') || 'none'));
  for (const entry of report.context) {
    for (const journey of entry.journeys) context.output.log('  Journey candidate (' + entry.file + '): ' + journey);
  }
  for (const file of report.files) {
    const evidence = [...file.functions, ...file.routes, ...file.automatedTests];
    context.output.log('  ' + file.file + (evidence.length ? ': ' + evidence.join(', ') : ''));
  }
  for (const module of report.modules) context.output.log('  Draft module: ' + module.name + ' (' + module.paths.length + ' files, ' + module.tests.length + ' scenarios)');
  for (const warning of report.warnings) context.output.log('Warning: ' + warning);
  context.output.log(report.files.length + ' source/test files; ' + report.modules.length + ' uncovered module drafts' +
    (options.apply ? ' added to test-truth.md.' : '. Preview only; use --apply to add drafts to test-truth.md.'));
  context.output.log('Review needs-review scenarios against project context before adopting the QA baseline. Scan does not execute tests.');
}
