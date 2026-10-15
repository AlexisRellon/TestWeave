import picomatch from 'picomatch';
import type { TestModule, TestTruth } from '../schema/test-truth.js';
import type { ContractStore } from './store.js';
import type { GitRepository } from './git.js';
import { parseTestTruth } from './markdown.js';
import { isCosmeticChange } from './semantic.js';
import { auditedBypasses, type BypassAudit } from './bypass.js';
import { sliceMarkdown, specFile, specPointers } from './specs.js';

export interface DriftIssue {
  kind: 'unmapped' | 'stale-module' | 'removed-module' | 'stale-spec';
  files: string[];
  moduleId?: string;
  message: string;
}
export interface DriftReport {
  base: string;
  target: string;
  changedFiles: string[];
  issues: DriftIssue[];
  mode: 'block' | 'warn';
  blocked: boolean;
  bypasses?: BypassAudit[];
}
export interface AnalyzeOptions { base?: string; target?: string; strict?: boolean; emptyBase?: boolean; semantic?: boolean; prePush?: boolean }
export interface DriftAnalyzer { analyze(options?: AnalyzeOptions): Promise<DriftReport> }

function matches(file: string, patterns: string[]): boolean {
  return patterns.length > 0 && picomatch(patterns, { dot: true })(file);
}
function sourceFile(file: string, contract: TestTruth): boolean {
  return file !== 'test-truth.md' && matches(file, contract.policy.sourceGlobs) && !matches(file, contract.policy.ignoreGlobs);
}
function testContent(module: TestModule): string {
  // Names, glob edits, and reordered test cases alone do not establish a QA update.
  return JSON.stringify({ description: module.description, tests: [...module.tests].sort((a, b) => a.id.localeCompare(b.id)) });
}
export function detectDrift(files: string[], previous: TestTruth | undefined, current: TestTruth): DriftIssue[] {
  const sources = files.filter((file) => sourceFile(file, current) || (previous && sourceFile(file, previous)));
  const unmapped = sources.filter((file) => !current.modules.some((module) => matches(file, module.paths)) &&
    !previous?.modules.some((module) => matches(file, module.paths)));
  const issues: DriftIssue[] = unmapped.length ? [{ kind: 'unmapped', files: unmapped, message: 'Source changes have no registered QA module' }] : [];
  const ids = new Set([...current.modules.map((module) => module.id), ...(previous?.modules.map((module) => module.id) ?? [])]);
  for (const id of ids) {
    const before = previous?.modules.find((module) => module.id === id);
    const after = current.modules.find((module) => module.id === id);
    const affected = sources.filter((file) => matches(file, [...(before?.paths ?? []), ...(after?.paths ?? [])]));
    if (!affected.length) continue;
    if (!after) issues.push({ kind: 'removed-module', moduleId: id, files: affected, message: 'An affected QA module was removed; retain it and document the retired behavior' });
    else if (before && testContent(before) === testContent(after)) issues.push({ kind: 'stale-module', moduleId: id, files: affected, message: 'Affected module test content has not changed' });
  }
  return issues;
}

export class ContractDriftAnalyzer implements DriftAnalyzer {
  constructor(private readonly git: GitRepository, private readonly store: ContractStore) {}
  async analyze(options: AnalyzeOptions = {}): Promise<DriftReport> {
    const base = options.emptyBase ? await this.git.emptyTree() : options.base ? await this.git.resolve(options.base) : await this.git.upstream();
    const target = options.target ? await this.git.resolve(options.target) : undefined;
    const [files, oldMarkdown, newMarkdown] = await Promise.all([
      this.git.changedFiles(base, target),
      this.git.readContract(base),
      target ? this.git.readContract(target) : this.store.readMarkdown(),
    ]);
    if (!newMarkdown) throw new Error('test-truth.md is missing from the checked revision; run testweave init and commit the contract');
    const current = parseTestTruth(newMarkdown);
    const previous = oldMarkdown === undefined ? undefined : parseTestTruth(oldMarkdown);
    let behavioral = files;
    if (options.semantic && this.git.readFile) {
      const cosmetic = new Set<string>();
      for (const file of files) {
        if (!/\.[cm]?[jt]sx?$/.test(file) || !(sourceFile(file, current) || (previous && sourceFile(file, previous)))) continue;
        try {
          if (isCosmeticChange(file, await this.git.readFile(file, base), await this.git.readFile(file, target))) cosmetic.add(file);
        } catch { /* Unreadable files retain drift instead of being considered cosmetic. */ }
      }
      behavioral = files.filter((file) => !cosmetic.has(file));
    }
    let issues = detectDrift(behavioral, previous, current);
    const docModes = [previous?.policy.docDriftMode ?? 'warn', current.policy.docDriftMode ?? 'warn'];
    const docMode = docModes.includes('block') ? 'block' : docModes.includes('warn') ? 'warn' : 'ignore';
    if (previous && docMode !== 'ignore') {
      for (const module of current.modules) {
        const before = previous.modules.find((entry) => entry.id === module.id);
        if (!before || testContent(before) !== testContent(module)) continue;
        const pointers = [...new Set([...specPointers(previous, before), ...specPointers(current, module)])];
        const stale: string[] = [];
        for (const pointer of pointers) {
          const file = specFile(pointer);
          if (!files.includes(file)) continue;
          if (this.git.readFile) {
            try {
              const old = await this.git.readFile(file, base);
              const next = await this.git.readFile(file, target);
              if (old !== undefined && next !== undefined && sliceMarkdown(old, pointer) === sliceMarkdown(next, pointer)) continue;
            } catch { /* Deleted or invalid sections retain drift. */ }
          }
          stale.push(pointer);
        }
        if (stale.length) issues.push({ kind: 'stale-spec', moduleId: module.id, files: stale, message: 'Linked spec sections changed without a QA update' });
      }
    }
    let bypasses: BypassAudit[] = [];
    if (options.prePush && target && this.git.commits && !options.emptyBase) {
      ({ issues, bypasses } = auditedBypasses(issues, await this.git.commits(base, target)));
    }
    // A branch cannot silently weaken the policy that its upstream enforces.
    const mode = options.strict || previous?.policy.mode === 'block' ? 'block' : current.policy.mode;
    const blocked = issues.some((issue) => issue.kind === 'stale-spec' ? options.strict || docMode === 'block' : mode === 'block');
    return { base, target: target ?? 'working-tree', changedFiles: files, issues, mode, blocked, ...(bypasses.length ? { bypasses } : {}) };
  }
}
