import path from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { atomicWrite, readOptional, rejectSymlink, workspacePath } from '../engine/files.js';

export const TESTWEAVE_SKILL_NAME = 'testweave';
export const TESTWEAVE_REFERENCE_NAME = 'references/functional-testing.md';

interface SkillFile { path: string; content: string }

function loadSkillFiles(directory: URL, prefix = ''): SkillFile[] {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const relative = prefix + entry.name;
    const location = new URL(encodeURIComponent(entry.name) + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) return loadSkillFiles(location, relative + '/');
    if (entry.isFile() && entry.name.endsWith('.md')) return [{ path: relative, content: readFileSync(location, 'utf8') }];
    if (entry.isSymbolicLink()) throw new Error('Skill bundle must not contain symbolic links: ' + relative);
    return [];
  });
}

// This relative location works for both src/integrations and published dist/integrations.
export const TESTWEAVE_SKILL_FILES = Object.freeze(
  loadSkillFiles(new URL('../../skills/testweave/', import.meta.url)).map((file) => Object.freeze(file)),
);
function requiredContent(relative: string): string {
  const file = TESTWEAVE_SKILL_FILES.find((entry) => entry.path === relative);
  if (!file) throw new Error('TestWeave package is missing skill document: ' + relative);
  return file.content;
}
// Preserve the public content exports while reading their authoritative Markdown.
export const TESTWEAVE_SKILL_CONTENT = requiredContent('SKILL.md');
export const TESTWEAVE_REFERENCE_CONTENT = requiredContent(TESTWEAVE_REFERENCE_NAME);

export async function installSkill(root: string, skillsDir: string): Promise<string> {
  const targets = await Promise.all(TESTWEAVE_SKILL_FILES.map(async (entry) => ({
    ...entry, target: await workspacePath(root, path.join(skillsDir, TESTWEAVE_SKILL_NAME, entry.path)),
  })));
  for (const entry of targets) await atomicWrite(entry.target, entry.content);
  return targets.find((entry) => entry.path === 'SKILL.md')!.target;
}

export async function hasSkill(root: string, skillsDir: string): Promise<boolean> {
  try {
    for (const entry of TESTWEAVE_SKILL_FILES) {
      const file = await workspacePath(root, path.join(skillsDir, TESTWEAVE_SKILL_NAME, entry.path));
      await rejectSymlink(file);
      if (await readOptional(file) !== entry.content) return false;
    }
    return true;
  } catch {
    return false;
  }
}

