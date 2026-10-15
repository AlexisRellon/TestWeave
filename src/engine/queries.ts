import picomatch from 'picomatch';
import { sourcePatternSchema, type TestTruth } from '../schema/test-truth.js';
import { listFiles } from './scan.js';
import { createGitRepository } from './git.js';
import { readSpecSlice, specFile, specPointers, sliceMarkdown } from './specs.js';

/** Keep only hunks intersecting a referenced section in either revision. */
export function scopedSpecDiff(diff: string, pointer: string, before: string | undefined, after: string): string {
  if (!pointer.includes('#')) return diff;
  const range = (markdown: string | undefined): [number, number] | undefined => {
    if (markdown === undefined) return undefined;
    try {
      const section = sliceMarkdown(markdown, pointer);
      const start = markdown.slice(0, markdown.indexOf(section)).split('\n').length;
      return [start, start + section.replace(/\n$/, '').split('\n').length - 1];
    } catch { return undefined; }
  };
  const oldRange = range(before), newRange = range(after);
  const parts = diff.split(/(?=^@@ )/m);
  const header = parts.shift() ?? '';
  const hunks = parts.filter((hunk) => {
    const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(hunk);
    if (!match) return false;
    const overlaps = (start: number, count: number, section: [number, number] | undefined) => section && start <= section[1] && start + Math.max(1, count) - 1 >= section[0];
    return overlaps(Number(match[1]), Number(match[2] ?? 1), oldRange) || overlaps(Number(match[3]), Number(match[4] ?? 1), newRange);
  });
  return hunks.length ? header + hunks.join('') : '';
}

export function contractIndex(contract: TestTruth) {
  return contract.modules.map((module) => ({ id: module.id, paths: module.paths,
    specs: specPointers(contract, module), tests: module.tests.map(({ id, title }) => ({ id, title })) }));
}
export function modulesForFiles(contract: TestTruth, paths: string[]) {
  paths.forEach((file) => sourcePatternSchema.parse(file));
  return contract.modules.filter((module) => paths.some((file) => picomatch(module.paths, { dot: true })(file)));
}
export async function specContext(root: string, contract: TestTruth, pathOrModuleId: string) {
  const module = contract.modules.find((entry) => entry.id === pathOrModuleId);
  const pointers = module ? specPointers(contract, module) : [pathOrModuleId];
  const sections = await Promise.all(pointers.map(async (pointer) => ({ pointer, content: await readSpecSlice(root, pointer) })));
  const git = createGitRepository(root);
  let diff = '';
  // Non-Git workspaces still support deterministic section reads.
  try { await git.root(); } catch { return { sections, diff, tests: module?.tests.map(({ id, title }) => ({ id, title })) ?? [] }; }
  diff = await git.diffForPaths!(module?.paths ?? []);
  for (const pointer of pointers) {
    const file = specFile(pointer);
    let before: string | undefined;
    try { before = await git.readFile!(file, await git.resolve('HEAD')); } catch { /* New repository/document. */ }
    const after = await git.readFile!(file) ?? '';
    diff += scopedSpecDiff(await git.diffForPaths!([file]), pointer, before, after);
  }
  return { sections, diff, tests: module?.tests.map(({ id, title }) => ({ id, title })) ?? [] };
}
export async function impact(root: string, contract: TestTruth, paths: string[]) {
  paths.forEach((file) => sourcePatternSchema.parse(file));
  const files = await listFiles(root);
  const matches = picomatch(paths, { dot: true });
  const selected = [...new Set([...paths.filter((file) => !picomatch.scan(file).isGlob),
    ...files.filter((file) => matches(file))])];
  const mapped = new Set(modulesForFiles(contract, selected).map((module) => module.id));
  const modules = contract.modules.filter((module) => {
    if (mapped.has(module.id)) return true;
    return module.paths.some((pattern) => paths.some((query) => {
      if (query === pattern) return true;
      return picomatch.scan(query).isGlob &&
        (picomatch(query, { dot: true })(pattern) || picomatch(pattern, { dot: true })(query));
    }));
  });
  return { paths, files: selected, modules: await Promise.all(modules.map(async (module) => ({
    id: module.id, paths: module.paths,
    specs: await Promise.all(specPointers(contract, module).map(async (pointer) => {
      try { return { pointer, content: await readSpecSlice(root, pointer) }; }
      catch (error) { return { pointer, error: error instanceof Error ? error.message : String(error) }; }
    })),
    tests: module.tests.map(({ id, title, preconditions }) => ({ id, title, preconditions })),
  }))) };
}
