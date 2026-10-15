import type { CommitChange } from './git.js';
import type { DriftIssue } from './drift.js';

export interface BypassAudit { moduleId: string; commit: string; reason: string }
export function bypassReason(message: string, moduleId: string): string | undefined {
  // Only standalone, module-scoped markers with a nonempty justification count.
  for (const line of message.trimEnd().split(/\r?\n/)) {
    const match = /^(?:Testweave-Bypass:|@testweave-skip)\s+([\w.-]+)\s+\(([^\r\n]+)\)\s*$/i.exec(line);
    if (match?.[1] === moduleId && match[2]!.trim()) return match[2]!.trim();
  }
  return undefined;
}
export function auditedBypasses(issues: DriftIssue[], commits: CommitChange[]): { issues: DriftIssue[]; bypasses: BypassAudit[] } {
  const bypasses: BypassAudit[] = [];
  const remaining = issues.filter((issue) => {
    if (issue.kind !== 'stale-module' || !issue.moduleId) return true;
    const affected = commits.filter((commit) => commit.files.some((file) => issue.files.includes(file)));
    if (!affected.length || affected.some((commit) => !bypassReason(commit.message, issue.moduleId!))) return true;
    bypasses.push(...affected.map((commit) => ({ moduleId: issue.moduleId!, commit: commit.sha, reason: bypassReason(commit.message, issue.moduleId!)! })));
    return false;
  });
  return { issues: remaining, bypasses };
}
