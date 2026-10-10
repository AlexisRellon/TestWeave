import prompts from 'prompts';
import { z } from 'zod';
import type { IdeIntegration } from '../integrations/config.js';
import { promptAgentSelection } from './agent-selector.js';

export interface UserPrompter {
  confirm(message: string): Promise<boolean>;
  integrations(selected: IdeIntegration[]): Promise<IdeIntegration[]>;
}

export class TerminalPrompter implements UserPrompter {
  constructor(private readonly interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY)) {}

  private requireTerminal(): void {
    if (!this.interactive) throw new Error('Interactive input is unavailable. Use --yes for init or --fix for doctor.');
  }

  async confirm(message: string): Promise<boolean> {
    this.requireTerminal();
    const answer: unknown = await prompts({ type: 'confirm', name: 'confirmed', message, initial: true });
    return z.object({ confirmed: z.boolean().optional() }).parse(answer).confirmed ?? false;
  }

  async integrations(selected: IdeIntegration[]): Promise<IdeIntegration[]> {
    return promptAgentSelection(selected, this.interactive);
  }
}
