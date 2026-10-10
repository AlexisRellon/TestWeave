import pc from 'picocolors';
import type { CliContext } from './context.js';
import type { DriftReport, AnalyzeOptions } from '../engine/drift.js';
import { isZeroSha, parsePushUpdates } from '../engine/git.js';

export interface SyncOptions { base?: string; strict?: boolean; json?: boolean; prePush?: boolean }
export async function readStdin(stream: NodeJS.ReadableStream = process.stdin): Promise<string> {
  let input = '';
  for await (const chunk of stream) {
    input += String(chunk);
    if (input.length > 1_000_000) throw new Error('Pre-push input exceeds 1 MB');
  }
  return input;
}
export async function runSync(context: CliContext, options: SyncOptions, input?: string): Promise<number> {
  const reports: DriftReport[] = [];
  const analyzeOptions: AnalyzeOptions = { ...(options.base ? { base: options.base } : {}), ...(options.strict ? { strict: true } : {}) };
  if (options.prePush) {
    const updates = parsePushUpdates(input ?? await readStdin());
    for (const update of updates) {
      if (isZeroSha(update.localSha)) continue;
      if (isZeroSha(update.remoteSha)) {
        let base = options.base;
        if (!base) { try { base = await context.git.upstream(); } catch { /* First push validates all source files. */ } }
        reports.push(await context.analyzer.analyze({ ...analyzeOptions, target: update.localSha, ...(base ? { base } : { emptyBase: true }) }));
      } else {
        reports.push(await context.analyzer.analyze({ ...analyzeOptions, base: update.remoteSha, target: update.localSha }));
      }
    }
  } else reports.push(await context.analyzer.analyze(analyzeOptions));
  if (options.json) context.output.log(JSON.stringify(options.prePush ? reports : reports[0], null, 2));
  else for (const report of reports) {
    context.output.log(`Compared ${report.target} against ${report.base}: ${report.changedFiles.length} changed files`);
    if (!report.issues.length) context.output.log(pc.green('No QA drift detected.'));
    for (const issue of report.issues) {
      const label = report.blocked ? pc.red('BLOCK') : pc.yellow('WARN');
      context.output.log(`${label} ${issue.moduleId ?? 'unmapped'}: ${issue.message}\n  ${issue.files.join('\n  ')}`);
    }
  }
  return reports.some((report) => report.blocked) ? 1 : 0;
}
