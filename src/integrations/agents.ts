export interface AgentDefinition {
  id: string;
  displayName: string;
  skillsDir: string;
  isUniversal?: boolean;
}

export const UNIVERSAL_AGENTS: AgentDefinition[] = [
  { id: 'amp', displayName: 'Amp', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'antigravity', displayName: 'Antigravity', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'antigravity-cli', displayName: 'Antigravity CLI', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'cline', displayName: 'Cline', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'codex', displayName: 'Codex', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'cursor', displayName: 'Cursor', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'deepagents', displayName: 'Deep Agents', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'dexto', displayName: 'Dexto', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'droid', displayName: 'Droid', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'firebender', displayName: 'Firebender', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'fx', displayName: 'fx', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'gemini-cli', displayName: 'Gemini CLI', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'github-copilot', displayName: 'GitHub Copilot', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'kilo', displayName: 'Kilo Code', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'kimi-code-cli', displayName: 'Kimi Code CLI', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'loaf', displayName: 'Loaf', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'opencode', displayName: 'OpenCode', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'pi', displayName: 'Pi', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'replit', displayName: 'Replit', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'sarvam-code', displayName: 'Sarvam Code', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'warp', displayName: 'Warp', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'zed', displayName: 'Zed', skillsDir: '.agents/skills', isUniversal: true },
  { id: 'promptscript', displayName: 'PromptScript', skillsDir: '.agents/skills', isUniversal: true },
];

export const ADDITIONAL_AGENTS: AgentDefinition[] = [
  { id: 'aider-desk', displayName: 'AiderDesk', skillsDir: '.aider-desk/skills' },
  { id: 'astrbot', displayName: 'AstrBot', skillsDir: 'data/skills' },
  { id: 'autohand-code', displayName: 'AutoHand Code CLI', skillsDir: '.autohand/skills' },
  { id: 'augment', displayName: 'Augment', skillsDir: '.augment/skills' },
  { id: 'bob', displayName: 'IBM Bob', skillsDir: '.bob/skills' },
  { id: 'claude-code', displayName: 'Claude Code', skillsDir: '.claude/skills' },
  { id: 'openclaw', displayName: 'OpenClaw', skillsDir: 'skills' },
  { id: 'codearts-agent', displayName: 'CodeArts Agent', skillsDir: '.codeartsdoer/skills' },
  { id: 'codebuddy', displayName: 'CodeBuddy', skillsDir: '.codebuddy/skills' },
  { id: 'codemaker', displayName: 'Codemaker', skillsDir: '.codemaker/skills' },
  { id: 'codestudio', displayName: 'Code Studio', skillsDir: '.codestudio/skills' },
  { id: 'command-code', displayName: 'Command Code', skillsDir: '.commandcode/skills' },
  { id: 'continue', displayName: 'Continue', skillsDir: '.continue/skills' },
  { id: 'cortex', displayName: 'Cortex Code', skillsDir: '.cortex/skills' },
  { id: 'crush', displayName: 'Crush', skillsDir: '.crush/skills' },
  { id: 'devin', displayName: 'Devin for Terminal', skillsDir: '.devin/skills' },
  { id: 'eve', displayName: 'Eve', skillsDir: 'agent/skills' },
  { id: 'forgecode', displayName: 'ForgeCode', skillsDir: '.forge/skills' },
  { id: 'goose', displayName: 'Goose', skillsDir: '.goose/skills' },
  { id: 'grok', displayName: 'Grok Build', skillsDir: '.grok/skills' },
  { id: 'hermes-agent', displayName: 'Hermes Agent', skillsDir: '.hermes/skills' },
  { id: 'inference-sh', displayName: 'inference.sh', skillsDir: '.inferencesh/skills' },
  { id: 'jazz', displayName: 'Jazz', skillsDir: '.jazz/skills' },
  { id: 'junie', displayName: 'Junie', skillsDir: '.junie/skills' },
  { id: 'iflow-cli', displayName: 'iFlow CLI', skillsDir: '.iflow/skills' },
  { id: 'kimchi', displayName: 'Kimchi', skillsDir: '.kimchi/skills' },
  { id: 'kiro-cli', displayName: 'Kiro CLI', skillsDir: '.kiro/skills' },
  { id: 'kode', displayName: 'Kode', skillsDir: '.kode/skills' },
  { id: 'lingma', displayName: 'Lingma', skillsDir: '.lingma/skills' },
  { id: 'mcpjam', displayName: 'MCPJam', skillsDir: '.mcpjam/skills' },
  { id: 'minimax-code', displayName: 'MiniMax Code', skillsDir: '.minimax/skills' },
  { id: 'mistral-vibe', displayName: 'Mistral Vibe', skillsDir: '.vibe/skills' },
  { id: 'moxby', displayName: 'Moxby', skillsDir: '.moxby/skills' },
  { id: 'mux', displayName: 'Mux', skillsDir: '.mux/skills' },
  { id: 'openhands', displayName: 'OpenHands', skillsDir: '.openhands/skills' },
  { id: 'ona', displayName: 'Ona', skillsDir: '.ona/skills' },
  { id: 'posit-assistant', displayName: 'Posit Assistant', skillsDir: '.posit/assistant/skills' },
  { id: 'qoder', displayName: 'Qoder', skillsDir: '.qoder/skills' },
  { id: 'qoder-cn', displayName: 'Qoder CN', skillsDir: '.qoder/skills' },
  { id: 'qwen-code', displayName: 'Qwen Code', skillsDir: '.qwen/skills' },
  { id: 'reasonix', displayName: 'Reasonix', skillsDir: '.reasonix/skills' },
  { id: 'rovodev', displayName: 'Rovo Dev', skillsDir: '.rovodev/skills' },
  { id: 'roo', displayName: 'Roo Code', skillsDir: '.roo/skills' },
  { id: 'tabnine-cli', displayName: 'Tabnine CLI', skillsDir: '.tabnine/agent/skills' },
  { id: 'terramind', displayName: 'Terramind', skillsDir: '.terramind/skills' },
  { id: 'tinycloud', displayName: 'Tinycloud', skillsDir: '.tinycloud/skills' },
  { id: 'trae', displayName: 'Trae', skillsDir: '.trae/skills' },
  { id: 'trae-cn', displayName: 'Trae CN', skillsDir: '.trae/skills' },
  { id: 'vscode', displayName: 'VS Code', skillsDir: '.vscode' },
  { id: 'windsurf', displayName: 'Windsurf', skillsDir: '.windsurf/skills' },
  { id: 'zcode', displayName: 'ZCode', skillsDir: '.zcode/skills' },
  { id: 'zencoder', displayName: 'Zencoder', skillsDir: '.zencoder/skills' },
  { id: 'zenflow', displayName: 'Zenflow', skillsDir: '.zencoder/skills' },
  { id: 'neovate', displayName: 'Neovate', skillsDir: '.neovate/skills' },
  { id: 'pochi', displayName: 'Pochi', skillsDir: '.pochi/skills' },
  { id: 'adal', displayName: 'AdaL', skillsDir: '.adal/skills' },
];

export const ALL_AGENTS: AgentDefinition[] = [...UNIVERSAL_AGENTS, ...ADDITIONAL_AGENTS];

export function findAgent(idOrName: string): AgentDefinition | undefined {
  const normalized = idOrName.toLowerCase().trim();
  if (normalized === 'claude') {
    return ADDITIONAL_AGENTS.find((a) => a.id === 'claude-code');
  }
  if (normalized === 'universal') {
    return { id: 'universal', displayName: 'Universal', skillsDir: '.agents/skills', isUniversal: true };
  }
  return ALL_AGENTS.find(
    (a) => a.id.toLowerCase() === normalized || a.displayName.toLowerCase() === normalized
  );
}

export function getSkillsDirForAgent(agentId: string): string {
  const agent = findAgent(agentId);
  if (!agent) {
    if (agentId === 'universal' || agentId === 'cursor') return '.agents/skills';
    if (agentId === 'claude' || agentId === 'claude-code') return '.claude/skills';
    if (agentId === 'vscode') return '.vscode';
    return '.agents/skills';
  }
  return agent.skillsDir;
}
