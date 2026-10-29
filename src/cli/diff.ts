import type { CliContext } from './context.js';
import { appendFile } from 'node:fs/promises';
import { compileContract } from '../engine/includes.js';
import { diffContracts, type ContractDiffReport } from '../engine/diff.js';
import { formatContractDiff } from './format-diff.js';

export type DiffFormat = 'text' | 'markdown' | 'json' | 'github';
export interface DiffOptions { base?: string; format?: string }

// Sync already resolves refs, including the empty tree used for a first push.
export async function loadContractDiffSnapshots(context: CliContext, base: string, target?: string): Promise<ContractDiffReport> {
  const snapshot = async (ref?: string) => {
    const markdown = ref ? await context.git.readContract(ref) : await context.store.readMarkdown();
    if (markdown === undefined) return undefined;
    return (await compileContract(markdown, async (file) => {
      if (!context.git.readFile) throw new Error('Git adapter must support readFile for included contracts');
      return context.git.readFile(file, ref);
    })).contract;
  };
  const [before, after] = await Promise.all([snapshot(base), snapshot(target)]);
  return diffContracts(before, after, base, target ?? 'working-tree');
}

export async function loadContractDiff(context: CliContext, base?: string, target?: string): Promise<ContractDiffReport> {
  let resolved: string;
  if (base !== undefined) resolved = await context.git.resolve(base);
  else {
    try { resolved = await context.git.resolve('HEAD'); }
    catch { resolved = await context.git.emptyTree(); }
  }
  return loadContractDiffSnapshots(context, resolved, target ? await context.git.resolve(target) : undefined);
}

export async function runDiff(context: CliContext, options: DiffOptions = {}): Promise<number> {
  const format = options.format ?? 'text';
  if (!['text', 'markdown', 'json', 'github'].includes(format)) throw new Error(`Unsupported diff format: ${format}`);
  const report = await loadContractDiff(context, options.base);
  context.output.log(formatContractDiff(report, format as DiffFormat));
  if (format === 'github' && process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${formatContractDiff(report, 'markdown')}\n\n`, 'utf8');
  }
  return 0;
}
