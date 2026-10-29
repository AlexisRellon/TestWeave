import pc from 'picocolors';
import { appendFile } from 'node:fs/promises';
import type { CliContext } from './context.js';
import type { DriftReport, AnalyzeOptions } from '../engine/drift.js';
import { isZeroSha, parsePushUpdates } from '../engine/git.js';
import { resolveDrift, type ResolverOptions } from './resolve.js';
import { loadContractDiffSnapshots } from './diff.js';
import { formatContractDiff, formatDriftMarkdown, githubAnnotation } from './format-diff.js';

export interface SyncOptions extends ResolverOptions { base?: string; strict?: boolean; json?: boolean; format?: string; prePush?: boolean; semantic?: boolean; interactive?: boolean }
export async function readStdin(stream: NodeJS.ReadableStream = process.stdin): Promise<string> {
  let input = '';
  for await (const chunk of stream) {
    input += String(chunk);
    if (input.length > 1_000_000) throw new Error('Pre-push input exceeds 1 MB');
  }
  return input;
}
export async function runSync(context: CliContext, options: SyncOptions, input?: string): Promise<number> {
  const format = options.json ? 'json' : options.format ?? 'text';
  if (!['text', 'markdown', 'json', 'github'].includes(format)) throw new Error(`Unsupported sync format: ${format}`);
  if (options.interactive && (options.prePush || format !== 'text' || !process.stdin.isTTY || !process.stdout.isTTY)) throw new Error('--interactive requires a TTY and cannot be combined with --pre-push, --json or --format');
  if (!options.interactive && (options.provider || options.model || options.baseUrl)) throw new Error('Drafting options require --interactive');
  const reports: DriftReport[] = [];
  const analyzeOptions: AnalyzeOptions = { ...(options.base ? { base: options.base } : {}), ...(options.strict ? { strict: true } : {}), ...(options.semantic ? { semantic: true } : {}), ...(options.prePush ? { prePush: true } : {}) };
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
  if (options.interactive && reports[0]?.issues.length) {
    await resolveDrift(context, reports[0], options);
    reports[0] = await context.analyzer.analyze(analyzeOptions);
  }
  if (format === 'json') context.output.log(JSON.stringify(options.prePush ? reports : reports[0], null, 2));
  else if (format === 'github' || format === 'markdown') {
    for (const report of reports) {
      const diff = await loadContractDiffSnapshots(context, report.base, report.target === 'working-tree' ? undefined : report.target);
      const summary = `${formatDriftMarkdown(report)}\n\n${formatContractDiff(diff, 'markdown')}\n`;
      if (format === 'markdown') context.output.log(summary);
      else {
        for (const issue of report.issues) for (const file of issue.files.length ? issue.files : ['test-truth.md']) {
          context.output.log(githubAnnotation(report.blocked ? 'error' : 'warning', issue.kind === 'stale-spec' ? file.split('#')[0]! : file,
            `${issue.kind} ${issue.moduleId ?? 'unmapped'}: ${issue.message}`));
        }
        if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, 'utf8');
      }
    }
  }
  else for (const report of reports) {
    context.output.log(`Compared ${report.target} against ${report.base}: ${report.changedFiles.length} changed files`);
    if (!report.issues.length) context.output.log(pc.green('No QA drift detected.'));
    for (const bypass of report.bypasses ?? []) context.output.log(`BYPASS ${bypass.moduleId} ${bypass.commit}: ${bypass.reason}`);
    for (const issue of report.issues) {
      const label = report.blocked ? pc.red('BLOCK') : pc.yellow('WARN');
      context.output.log(`${label} ${issue.moduleId ?? 'unmapped'}: ${issue.message}\n  ${issue.files.join('\n  ')}`);
    }
  }
  return reports.some((report) => report.blocked) ? 1 : 0;
}
