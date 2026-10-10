import path from 'node:path';
import pc from 'picocolors';
import type { CliContext } from './context.js';
import { TerminalPrompter, type UserPrompter } from './prompts.js';
import { createTestTruth } from '../schema/test-truth.js';
import { detectIntegrations, readConfig, saveConfig, type ProjectConfig } from '../integrations/config.js';
import { installIdeRules } from '../integrations/ide.js';
import { installHook } from '../integrations/hooks.js';

export interface InitOptions { yes?: boolean; hook?: boolean }
export async function runInit(context: CliContext, options: InitOptions, prompt: UserPrompter = new TerminalPrompter()): Promise<void> {
  const detected = detectIntegrations(context.root);
  const previous = await readConfig(context.root);
  context.output.log(`Workspace: ${context.root}\nGit: ${detected.git ? 'detected' : 'not detected'}\nIDEs: ${detected.ides.join(', ') || 'none'}\nCI: ${detected.ci.join(', ') || 'none'}\nHusky: ${detected.husky ? 'detected' : 'not detected'}`);
  const defaults = previous?.integrations ?? [...new Set(['cursor' as const, 'claude' as const, ...detected.ides])];
  const integrations = options.yes ? defaults : await prompt.integrations(defaults);
  const config: ProjectConfig = {
    version: 1, integrations,
    hook: options.hook !== false && detected.git && (previous?.hook ?? true),
  };
  if (!options.yes && !await prompt.confirm(`Initialize QA contract, inject ${integrations.join(', ') || 'no IDE'} rules, and ${config.hook ? 'install' : 'skip'} pre-push hook?`)) {
    context.output.log('Setup cancelled'); return;
  }
  const created = await context.store.initialize(createTestTruth(path.basename(context.root)));
  await installIdeRules(context.root, config.integrations);
  if (config.hook) await installHook(context.root, context.git);
  await saveConfig(context.root, config);
  context.output.log(pc.green(`TestWeave initialized. Contract ${created ? 'created' : 'validated'}.`));
  context.output.log('Register modules and manual test cases in test-truth.md, then commit the contract with your code.');
}
