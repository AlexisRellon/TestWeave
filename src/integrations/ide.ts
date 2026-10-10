import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';
import type { IdeIntegration } from './config.js';
import { installVsCodeServer, hasVsCodeServer } from './vscode.js';

export const RULE_START = '<!-- testweave:start -->';
export const RULE_END = '<!-- testweave:end -->';
export const QA_RULES = `${RULE_START}
## TestWeave QA contract
- Read test-truth.md before changing source behavior.
- Every changed source file must match a registered module's paths.
- Update that module's manual test actions and expected results alongside code changes.
- Include success, failure, and boundary scenarios. Keep test IDs stable and globally unique.
- Never claim a test was executed without actual evidence. This contract describes tests, not execution results.
- Use the testweave MCP upsert_test_module tool or edit the authoritative json testweave block.
- Run testweave sync before committing; commit test-truth.md with the corresponding source changes.
- Do not bypass the pre-push hook or weaken policy to conceal QA drift.
${RULE_END}`;
export const IDE_FILES: Record<IdeIntegration, string> = {
  cursor: '.cursorrules', claude: 'CLAUDE.md', vscode: '.github/instructions/testweave.instructions.md',
};
export function injectRules(text: string): string {
  const start = text.indexOf(RULE_START);
  const end = text.indexOf(RULE_END);
  if (start === -1 && end === -1) return `${text.trimEnd()}${text.trim() ? '\n\n' : ''}${QA_RULES}\n`;
  if (start < 0 || end < start || text.indexOf(RULE_START, start + RULE_START.length) !== -1 ||
    text.indexOf(RULE_END, end + RULE_END.length) !== -1) throw new Error('Malformed TestWeave rule markers; repair markers without removing your existing rules');
  return text.slice(0, start) + QA_RULES + text.slice(end + RULE_END.length);
}
export async function installIdeRules(root: string, integrations: IdeIntegration[]): Promise<void> {
  for (const integration of integrations) {
    const file = await workspacePath(root, IDE_FILES[integration]);
    let text = await readOptional(file) ?? '';
    if (integration === 'vscode' && !text) text = '---\napplyTo: "**"\n---\n\n';
    await atomicWrite(file, injectRules(text));
    if (integration === 'vscode') await installVsCodeServer(root);
  }
}
export async function hasIdeRules(root: string, integration: IdeIntegration): Promise<boolean> {
  const text = await readOptional(await workspacePath(root, IDE_FILES[integration]));
  return text !== undefined && text.includes(QA_RULES) && injectRules(text) === text &&
    (integration !== 'vscode' || await hasVsCodeServer(root));
}
