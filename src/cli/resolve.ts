import prompts from 'prompts';
import type { CliContext } from './context.js';
import type { DriftReport } from '../engine/drift.js';
import { literalGlob, scanProject } from '../engine/scan.js';
import { specContext } from '../engine/queries.js';
import { createModuleAuthor, providerSchema } from '../llm/factory.js';
import { wireJson } from '../engine/wire.js';
import type { TestModule } from '../schema/test-truth.js';

export interface ResolverOptions { provider?: string; model?: string; baseUrl?: string }
export interface ResolverUI {
  choose(message: string, choices: { title: string; value: string }[]): Promise<string | undefined>;
  confirm(message: string): Promise<boolean>;
}
export const terminalResolver: ResolverUI = {
  async choose(message, choices) {
    const answer = await prompts({ type: 'select', name: 'value', message, choices });
    return typeof answer.value === 'string' ? answer.value : undefined;
  },
  async confirm(message) {
    const answer = await prompts({ type: 'confirm', name: 'value', message, initial: false });
    return answer.value === true;
  },
};
export async function resolveDrift(context: CliContext, report: DriftReport, options: ResolverOptions, ui: ResolverUI = terminalResolver): Promise<void> {
  for (const issue of report.issues) {
    if (issue.kind === 'removed-module') continue;
    const choice = await ui.choose(`${issue.moduleId ?? 'unmapped'}: ${issue.message}`, [
      { title: 'Leave unresolved', value: 'skip' },
      ...(issue.kind === 'unmapped' ? [{ title: 'Map files to an existing module', value: 'map' }] : []),
      { title: 'Scaffold local needs-review scenarios', value: 'scan' },
      { title: 'Draft from diff with the explicitly selected AI provider', value: 'ai' },
    ]);
    if (!choice) return;
    if (choice === 'skip') continue;
    const contract = await context.store.read();
    const existing = contract.modules.find((module) => module.id === issue.moduleId);
    let drafts: TestModule[] = [];
    if (choice === 'map') {
      const id = await ui.choose('Choose module', contract.modules.map((module) => ({ title: module.name, value: module.id })));
      const module = contract.modules.find((entry) => entry.id === id);
      if (!module) continue;
      drafts = [{ ...module, paths: [...new Set([...module.paths, ...issue.files.map(literalGlob)])] }];
    } else if (choice === 'scan') {
      if (existing) {
        const scan = await scanProject(context.root, {
          ...contract, policy: { ...contract.policy, sourceGlobs: existing.paths },
          modules: contract.modules.map((module) => module.id === existing.id ? { ...module, paths: ['__testweave_review_placeholder__'] } : module),
        });
        const tests = scan.modules.flatMap((module) => module.tests);
        if (tests.length) drafts = [{ ...existing, tests: [...existing.tests, ...tests] }];
        else context.output.log('No live uncovered source evidence to scaffold; edit the existing scenarios or select AI drafting.');
      } else {
        const scan = await scanProject(context.root, { ...contract, policy: { ...contract.policy, sourceGlobs: issue.files.map(literalGlob) } });
        drafts = scan.modules;
      }
    } else if (choice === 'ai') {
      if (!options.provider || !options.model) throw new Error('Interactive AI drafting requires explicit --provider and --model');
      const source = existing ? await specContext(context.root, contract, existing.id)
        : { diff: await context.git.diffForPaths?.(issue.files), files: issue.files };
      context.output.log(`Sending scoped diff/spec context to ${options.provider}: ${wireJson(source, true)}`);
      if (!await ui.confirm('Send this context to the selected provider?')) continue;
      const author = await createModuleAuthor(providerSchema.parse(options.provider), options.model, process.env, options.baseUrl);
      drafts = [await author.author({ context: wireJson(source, true), ...(existing ? { existing } : {}), compact: true })];
    }
    if (!drafts.length) continue;
    context.output.log(wireJson(drafts));
    if (!await ui.confirm('Apply these definitions? needs-review drafts still require authored acceptance criteria.')) continue;
    if (drafts.length === 1 && contract.modules.some((module) => module.id === drafts[0]!.id)) await context.store.upsert(drafts[0]!, contract);
    else await context.store.append(drafts, contract);
  }
}
