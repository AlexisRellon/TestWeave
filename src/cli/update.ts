import type { CliContext } from './context.js';
import { TerminalPrompter, type UserPrompter } from './prompts.js';
import { runInit } from './init.js';

export interface UpdateOptions {
  yes?: boolean;
  hook?: boolean;
}

export async function runUpdate(
  context: CliContext,
  options: UpdateOptions,
  prompt: UserPrompter = new TerminalPrompter()
): Promise<void> {
  await runInit(context, { ...options, isUpdate: true }, prompt);
}
