import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { atomicWrite, readOptional } from '../engine/files.js';

export const integrationSchema = z.enum(['cursor', 'claude', 'vscode']);
export type IdeIntegration = z.infer<typeof integrationSchema>;
export const configSchema = z.strictObject({
  version: z.literal(1),
  integrations: z.array(integrationSchema),
  hook: z.boolean(),
});
export type ProjectConfig = z.infer<typeof configSchema>;
export interface DetectedIntegrations { git: boolean; ides: IdeIntegration[]; ci: string[]; husky: boolean }
export function detectIntegrations(root: string): DetectedIntegrations {
  const exists = (name: string): boolean => existsSync(path.join(root, name));
  return {
    git: exists('.git'), husky: exists('.husky'),
    ides: [exists('.cursorrules') || exists('.cursor') ? 'cursor' : undefined,
      exists('CLAUDE.md') || exists('.claude') ? 'claude' : undefined,
      exists('.vscode') ? 'vscode' : undefined].filter((value): value is IdeIntegration => value !== undefined),
    ci: ['.github/workflows', '.gitlab-ci.yml', 'azure-pipelines.yml', '.circleci/config.yml', 'Jenkinsfile'].filter(exists),
  };
}
export async function readConfig(root: string): Promise<ProjectConfig | undefined> {
  const text = await readOptional(path.join(root, '.testweave.json'));
  return text === undefined ? undefined : configSchema.parse(JSON.parse(text) as unknown);
}
export async function saveConfig(root: string, config: ProjectConfig): Promise<void> {
  await atomicWrite(path.join(root, '.testweave.json'), JSON.stringify(configSchema.parse(config), null, 2) + '\n');
}
