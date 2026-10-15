import { simpleGit, type SimpleGit } from 'simple-git';
import { readFile } from 'node:fs/promises';
import { isMissing, workspacePath } from './files.js';
import picomatch from 'picomatch';

export interface GitRepository {
  root(): Promise<string>;
  resolve(ref: string): Promise<string>;
  upstream(): Promise<string>;
  changedFiles(base: string, target?: string): Promise<string[]>;
  readContract(ref: string): Promise<string | undefined>;
  hookPath(): Promise<string>;
  emptyTree(): Promise<string>;
  readFile?(file: string, ref?: string): Promise<string | undefined>;
  diffForPaths?(paths: string[], base?: string, target?: string): Promise<string>;
  commits?(base: string, target: string): Promise<CommitChange[]>;
}
export interface CommitChange { sha: string; message: string; files: string[] }
export class SimpleGitRepository implements GitRepository {
  constructor(private readonly git: SimpleGit) {}
  async root(): Promise<string> { return (await this.git.revparse(['--show-toplevel'])).trim(); }
  async resolve(ref: string): Promise<string> {
    if (!ref || ref.startsWith('-') || /[\r\n\0]/.test(ref)) throw new Error('Invalid Git reference');
    return (await this.git.revparse(['--verify', '--end-of-options', `${ref}^{commit}`])).trim();
  }
  async upstream(): Promise<string> {
    try { return await this.resolve('@{upstream}'); }
    catch { throw new Error('No upstream branch. Set one with git branch --set-upstream-to, or supply --base <ref>.'); }
  }
  async changedFiles(base: string, target?: string): Promise<string[]> {
    const raw = await this.git.raw(['diff', '--name-only', '-z', '--no-renames', base, ...(target ? [target] : []), '--']);
    const tracked = raw.split('\0').filter(Boolean);
    if (target) return tracked;
    const untracked = await this.git.raw(['ls-files', '--others', '--exclude-standard', '-z']);
    return [...new Set([...tracked, ...untracked.split('\0').filter(Boolean)])];
  }
  async readContract(ref: string): Promise<string | undefined> {
    const entries = await this.git.raw(['ls-tree', '-z', ref, '--', 'test-truth.md']);
    if (!entries) return undefined;
    if (!entries.startsWith('100644 ') && !entries.startsWith('100755 ')) throw new Error('Committed test-truth.md must be a regular file');
    return this.git.show([`${ref}:test-truth.md`]);
  }
  async readFile(file: string, ref?: string): Promise<string | undefined> {
    if (ref) {
      const entries = await this.git.raw(['ls-tree', '-z', ref, '--', `:(literal)${file}`]);
      if (!entries) return undefined;
      if (!/^100(?:644|755) /.test(entries)) throw new Error(`Not a regular file: ${file}`);
      return this.git.show([`${ref}:${file}`]);
    }
    try { return await readFile(await workspacePath(await this.root(), file), 'utf8'); }
    catch (error) { if (isMissing(error)) return undefined; throw error; }
  }
  async diffForPaths(paths: string[], base?: string, target?: string): Promise<string> {
    if (!paths.length) return '';
    let from: string;
    if (base) {
      if (!/^[a-f0-9]{40,64}$/.test(base)) throw new Error('Invalid Git reference');
      from = base;
    } else try { from = await this.resolve('HEAD'); } catch { from = await this.emptyTree(); }
    const matches = picomatch(paths, { dot: true });
    const range = [from, ...(target ? [await this.resolve(target)] : [])];
    const tracked = (await this.git.raw(['diff', '--name-only', '-z', '--no-renames', ...range, '--'])).split('\0').filter((entry) => entry && matches(entry));
    let diff = tracked.length ? await this.git.raw(['diff', '--no-ext-diff', '--no-textconv', '--unified=3', ...range, '--', ...tracked.map((file) => `:(literal)${file}`)]) : '';
    if (target) return diff;
    const untracked = (await this.git.raw(['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
    for (const file of untracked.filter((entry) => matches(entry))) {
      const content = await this.readFile(file);
      if (content === undefined || content.includes('\0')) continue;
      const lines = content.split('\n');
      if (lines.at(-1) === '') lines.pop();
      diff += `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((line) => '+' + line).join('\n')}\n`;
    }
    return diff;
  }
  async commits(base: string, target: string): Promise<CommitChange[]> {
    const shas = (await this.git.raw(['rev-list', `${base}..${target}`])).trim().split(/\s+/).filter(Boolean);
    return Promise.all(shas.map(async (sha) => ({ sha,
      message: await this.git.raw(['show', '-s', '--format=%B', sha]),
      files: (await this.git.raw(['diff-tree', '--root', '-m', '--no-commit-id', '--name-only', '-r', '-z', sha, '--'])).split('\0').filter(Boolean),
    })));
  }
  async hookPath(): Promise<string> { return (await this.git.revparse(['--git-path', 'hooks'])).trim(); }
  async emptyTree(): Promise<string> { return (await this.git.raw(['hash-object', '-w', '-t', 'tree', '--stdin'])).trim(); }
}
export function createGitRepository(root: string): GitRepository {
  return new SimpleGitRepository(simpleGit({
    baseDir: root, trimmed: false, timeout: { block: 30_000 },
    input: (commands) => commands[0] === 'hash-object' ? Buffer.alloc(0) : undefined,
  }));
}

export interface PushUpdate { localRef: string; localSha: string; remoteRef: string; remoteSha: string }
export function parsePushUpdates(input: string): PushUpdate[] {
  return input.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const parts = line.trim().split(/\s+/);
    const [localRef, localSha, remoteRef, remoteSha] = parts;
    if (parts.length !== 4 || !localRef || !remoteRef || !localSha || !remoteSha ||
      !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(localSha) || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(remoteSha)) {
      throw new Error('Malformed Git pre-push input');
    }
    return { localRef, localSha, remoteRef, remoteSha };
  });
}
export function isZeroSha(sha: string): boolean { return /^0+$/.test(sha); }
