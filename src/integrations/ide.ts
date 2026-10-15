import { atomicWrite, readOptional, workspacePath } from '../engine/files.js';
import type { IdeIntegration } from './config.js';
import { installMcpServer, hasMcpServer, mcpTarget } from './mcp.js';
import { installSkill, hasSkill } from './skills.js';
import { getSkillsDirForAgent } from './agents.js';

export const RULE_START = '<!-- testweave:start -->';
export const RULE_END = '<!-- testweave:end -->';
export const QA_RULES = `${RULE_START}
## TestWeave QA contract
Read project context first. Use get_modules_for_files and get_spec_slice before edits; upsert_test_case preserves other scenarios. Read test-truth.md only when scoped tools are unavailable. Keep IDs stable; cover success, failure and boundaries. Run testweave sync and commit code with definitions. Never claim execution or weaken policy. Follow the installed testweave skill's commands and references; use scan for adoption and impact before edits.
${RULE_END}`;

export const IDE_FILES: Record<string, string> = {
  cursor: '.cursorrules',
  claude: 'CLAUDE.md',
  'claude-code': 'CLAUDE.md',
  vscode: '.github/instructions/testweave.instructions.md',
  windsurf: '.windsurfrules',
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
    const ruleFile = IDE_FILES[integration];
    if (ruleFile) {
      const file = await workspacePath(root, ruleFile);
      let text = await readOptional(file) ?? '';
      if (integration === 'vscode' && !text) text = '---\napplyTo: "**"\n---\n\n';
      await atomicWrite(file, injectRules(text));
    }
    const target = mcpTarget(integration, root);
    if (target) await installMcpServer(root, target);
    const skillsDir = getSkillsDirForAgent(integration);
    if (skillsDir && skillsDir !== '.vscode') {
      await installSkill(root, skillsDir);
    }
  }
}

export async function hasIdeRules(root: string, integration: IdeIntegration): Promise<boolean> {
  const target = mcpTarget(integration, root);
  if (target && !await hasMcpServer(root, target)) return false;
  const ruleFile = IDE_FILES[integration];
  if (ruleFile) {
    const text = await readOptional(await workspacePath(root, ruleFile));
    const rulesOk = text !== undefined && text.includes(QA_RULES) && injectRules(text) === text;
    if (!rulesOk) return false;
  }
  const skillsDir = getSkillsDirForAgent(integration);
  if (skillsDir && skillsDir !== '.vscode') {
    return await hasSkill(root, skillsDir);
  }
  return true;
}
