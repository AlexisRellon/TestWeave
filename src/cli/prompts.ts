import prompts from 'prompts';
import { z } from 'zod';
import { integrationSchema, type IdeIntegration } from '../integrations/config.js';

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
    this.requireTerminal();
    const answer: unknown = await prompts({
      type: 'multiselect', name: 'integrations', message: 'Choose IDE integrations',
      choices: (['cursor', 'claude', 'vscode'] as const).map((value) => ({ title: value, value, selected: selected.includes(value) })),
    });
    const result = z.object({ integrations: z.array(integrationSchema).optional() }).parse(answer);
    if (!result.integrations) throw new Error('Setup cancelled');
    return result.integrations;
  }
}
