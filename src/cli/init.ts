import path from 'node:path';
import pc from 'picocolors';
import type { CliContext } from './context.js';
import { TerminalPrompter, type UserPrompter } from './prompts.js';
import { createTestTruth } from '../schema/test-truth.js';
import { detectIntegrations, readConfig, saveConfig, type ProjectConfig } from '../integrations/config.js';
import { installIdeRules } from '../integrations/ide.js';
import { mcpTarget } from '../integrations/mcp.js';
import { installHook } from '../integrations/hooks.js';
import { printBanner, printSetupOverview } from './banner.js';
import { formatSelectedSummary } from './agent-selector.js';

export interface InitOptions { yes?: boolean; hook?: boolean; isUpdate?: boolean }

export async function runInit(context: CliContext, options: InitOptions, prompt: UserPrompter = new TerminalPrompter()): Promise<void> {
  printBanner(context.output.log);

  const detected = detectIntegrations(context.root);
  const previous = await readConfig(context.root);

  printSetupOverview(context.root, detected, context.output.log);

  const defaults = previous?.integrations ?? [...new Set(['universal', 'cursor', 'claude', ...detected.ides])];
  let integrations: string[];

  if (options.yes) {
    const summary = formatSelectedSummary(new Set(defaults));
    context.output.log(`  ${pc.green(pc.bold('Selected:'))} ${pc.green(summary)}\n`);
    integrations = defaults;
  } else {
    integrations = await prompt.integrations(defaults);
  }

  const config: ProjectConfig = {
    version: 1,
    integrations,
    hook: options.hook !== false && detected.git && (previous?.hook ?? true),
  };

  const actionVerb = options.isUpdate ? 'Update' : 'Initialize';
  const pastVerb = options.isUpdate ? 'updated' : 'initialized';

  if (!options.yes && !await prompt.confirm(`${actionVerb} QA contract, inject rules, skills & MCP configuration for ${integrations.join(', ') || 'selected agents'}, and ${config.hook ? 'install' : 'skip'} pre-push hook?`)) {
    context.output.log(`${options.isUpdate ? 'Update' : 'Setup'} cancelled`);
    return;
  }

  const created = await context.store.initialize(createTestTruth(path.basename(context.root)));
  await installIdeRules(context.root, config.integrations);
  if (config.hook) await installHook(context.root, context.git);
  await saveConfig(context.root, config);

  const mcpFiles = [...new Set(config.integrations.flatMap((integration) => {
    const target = mcpTarget(integration, context.root);
    return target ? [target.file] : [];
  }))];
  if (mcpFiles.length) context.output.log(`MCP configured: ${mcpFiles.join(', ')}`);
  context.output.log(pc.green(`✔ TestWeave ${pastVerb}. Contract ${created ? 'created' : 'validated'}.`));
  context.output.log('For an existing project, run testweave scan, then testweave scan --apply to add reviewable module drafts. Review project context and scenarios before committing test-truth.md with your code.');
}

