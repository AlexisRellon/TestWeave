import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export interface FileSystem {
  readFile: typeof fs.readFile;
  writeFile: typeof fs.writeFile;
  mkdir: typeof fs.mkdir;
  rename: typeof fs.rename;
  unlink: typeof fs.unlink;
  lstat: typeof fs.lstat;
  realpath: typeof fs.realpath;
  chmod: typeof fs.chmod;
}
export const nodeFileSystem: FileSystem = fs;
export function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
export async function readOptional(file: string, io: FileSystem = nodeFileSystem): Promise<string | undefined> {
  try { return await io.readFile(file, 'utf8'); } catch (error) { if (isMissing(error)) return undefined; throw error; }
}
export async function rejectSymlink(file: string, io: FileSystem = nodeFileSystem): Promise<void> {
  try {
    if ((await io.lstat(file)).isSymbolicLink()) throw new Error(`Refusing to overwrite symlink: ${file}`);
  } catch (error) { if (!isMissing(error)) throw error; }
}
export async function atomicWrite(file: string, content: string, io: FileSystem = nodeFileSystem): Promise<void> {
  await io.mkdir(path.dirname(file), { recursive: true });
  await rejectSymlink(file, io);
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await io.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    await io.rename(temporary, file);
  } finally {
    try { await io.unlink(temporary); } catch (error) { if (!isMissing(error)) throw error; }
  }
}

export async function workspacePath(root: string, relative: string, io: FileSystem = nodeFileSystem): Promise<string> {
  const resolvedRoot = await io.realpath(root);
  const target = path.resolve(resolvedRoot, relative);
  const inside = (candidate: string): boolean => {
    const rel = path.relative(resolvedRoot, candidate);
    return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
  };
  if (!inside(target) || target === resolvedRoot) throw new Error('Path must name a file inside the workspace');
  let current = target;
  while (true) {
    try {
      if (!inside(await io.realpath(current))) throw new Error('Path resolves outside the workspace');
      break;
    } catch (error) {
      if (!isMissing(error)) throw error;
      current = path.dirname(current);
    }
  }
  return target;
}
