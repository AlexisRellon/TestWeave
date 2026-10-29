import type { ContractDiffChange, ContractDiffReport, SemanticValue } from '../engine/diff.js';
import type { DriftReport } from '../engine/drift.js';
import type { DiffFormat } from './diff.js';

export function markdownCell(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;').replace(/`/g, '&#96;').replace(/\[/g, '&#91;').replace(/\]/g, '&#93;')
    .replace(/\*/g, '&#42;').replace(/_/g, '&#95;').replace(/[\r\n]+/g, '<br>');
}
function annotationData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}
export function githubAnnotation(level: 'error' | 'warning' | 'notice', file: string, message: string): string {
  return `::${level} file=${annotationData(file).replace(/:/g, '%3A').replace(/,/g, '%2C')}::${annotationData(message)}`;
}
function label(change: ContractDiffChange): string { return change.testId ?? change.moduleId ?? 'contract'; }
function valueText(value: SemanticValue): string {
  if (value === null) return '—';
  if (Array.isArray(value)) return value.map((entry, index) =>
    `${entry && typeof entry === 'object' ? `${index + 1}. ` : ''}${valueText(entry)}`).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${key}: ${valueText(entry)}`).join('; ');
  return String(value);
}
export function formatContractDiff(report: ContractDiffReport, format: DiffFormat): string {
  if (format === 'json') return JSON.stringify(report, null, 2);
  if (format === 'github') return report.changes.map((change) => githubAnnotation('notice', 'test-truth.md',
    `${change.kind} ${change.entity} ${label(change)}: ${change.field}: ${valueText(change.before)} → ${valueText(change.after)}`)).join('\n');
  if (format === 'text') return [`Contract diff: ${report.target} against ${report.base}`,
    ...report.changes.map((change) => `${change.kind.toUpperCase()} ${change.entity} ${label(change)} ${change.field}: ${valueText(change.before)} → ${valueText(change.after)}`),
    ...(!report.changes.length ? ['No semantic contract changes.'] : [])].join('\n');
  return ['### Semantic contract diff', '', `Compared ${markdownCell(report.target)} against ${markdownCell(report.base)}.`, '',
    ...(report.changes.length ? ['| Change | Entity | ID | Field | Before | After |', '| --- | --- | --- | --- | --- | --- |',
      ...report.changes.map((change) => `| ${change.kind} | ${change.entity} | ${markdownCell(label(change))} | ${markdownCell(change.field)} | ${markdownCell(valueText(change.before))} | ${markdownCell(valueText(change.after))} |`)] : ['No semantic contract changes.'])].join('\n');
}

export function formatDriftMarkdown(report: DriftReport): string {
  return ['## TestWeave QA review', '', `Compared ${markdownCell(report.target)} against ${markdownCell(report.base)}.`, '',
    `Drift status: **${report.blocked ? 'blocked' : report.issues.length ? 'warning' : 'clear'}** (${report.changedFiles.length} changed files).`, '',
    ...(report.issues.length ? ['| Status | Module | Issue | Files |', '| --- | --- | --- | --- |',
      ...report.issues.map((issue) => `| ${report.blocked ? 'BLOCK' : 'WARN'} | ${markdownCell(issue.moduleId ?? 'unmapped')} | ${markdownCell(`${issue.kind}: ${issue.message}`)} | ${markdownCell(issue.files.join('\n'))} |`)] : ['No QA drift detected.']),
    ...(report.bypasses ?? []).map((bypass) => `\nBypass ${markdownCell(bypass.moduleId)} (${markdownCell(bypass.commit)}): ${markdownCell(bypass.reason)}`)].join('\n');
}
