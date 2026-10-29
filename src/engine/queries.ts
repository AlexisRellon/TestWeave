import picomatch from 'picomatch';
import { sourcePatternSchema, specPointerSchema, type TestTruth } from '../schema/test-truth.js';
import { listFiles, literalGlob } from './scan.js';
import { createGitRepository } from './git.js';
import { readSpecSlice, sectionBounds, sliceMarkdown, specFile, specPointers } from './specs.js';

/** Keep only diff lines inside a referenced section, on the revision each line belongs to. */
export function scopedSpecDiff(diff: string, pointer: string, before: string | undefined, after: string): string {
  if (!pointer.includes('#')) return diff;
  const range = (markdown: string | undefined): [number, number] | undefined => {
    if (markdown === undefined) return undefined;
    try {
      const [start, end] = sectionBounds(markdown, pointer);
      const text = markdown.slice(0, end);
      return [markdown.slice(0, start).split('\n').length, text.split('\n').length - (text.endsWith('\n') ? 1 : 0)];
    } catch { return undefined; }
  };
  const oldRange = range(before), newRange = range(after);
  const within = (line: number, section: [number, number] | undefined) => !!section && line >= section[0] && line <= section[1];
  const output: string[] = [];
  for (const fileDiff of diff.split(/(?=^diff --git )/m)) {
    const [header = '', ...hunks] = fileDiff.split(/(?=^@@ )/m);
    const kept: string[] = [];
    for (const hunk of hunks) {
      const [head = '', ...body] = hunk.split('\n');
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(head);
      if (!match) continue;
      let oldLine = Number(match[1]), newLine = Number(match[2]);
      let group: string[] = [], groupOld = 0, groupNew = 0, groupStart: [number, number] = [0, 0], previousKept = false;
      const flush = () => {
        if (group.length) kept.push(`@@ -${groupOld ? groupStart[0] : Math.max(0, groupStart[0] - 1)},${groupOld} +${groupNew ? groupStart[1] : Math.max(0, groupStart[1] - 1)},${groupNew} @@\n${group.join('\n')}\n`);
        group = []; groupOld = 0; groupNew = 0;
      };
      for (const line of body) {
        const marker = line[0];
        if (!marker) continue;
        if (!' +-\\'.includes(marker)) { flush(); continue; }
        const isKept: boolean = marker === '\\' ? previousKept
          : marker === '+' ? within(newLine, newRange)
          : marker === '-' ? within(oldLine, oldRange)
          : within(oldLine, oldRange) || within(newLine, newRange);
        if (isKept) {
          if (!group.length) groupStart = [oldLine, newLine];
          group.push(line);
          if (marker !== '+' && marker !== '\\') groupOld++;
          if (marker !== '-' && marker !== '\\') groupNew++;
        } else flush();
        if (marker !== '\\') {
          if (marker !== '+') oldLine++;
          if (marker !== '-') newLine++;
          previousKept = isKept;
        }
      }
      flush();
    }
    if (kept.length) output.push(header + kept.join(''));
  }
  return output.join('');
}

function segmentsOverlap(left: string, right: string): boolean {
  if (left === right) return true;
  const leftGlob = picomatch.scan(left).isGlob, rightGlob = picomatch.scan(right).isGlob;
  if (!leftGlob && !rightGlob) return false;
  if (!leftGlob) return picomatch(right, { dot: true })(left);
  if (!rightGlob) return picomatch(left, { dot: true })(right);
  // shortcut: two wildcard segments are assumed to overlap, so impact over-reports rather than hides; upgrade with a real glob intersection library.
  return true;
}
function globsOverlap(left: string[], right: string[]): boolean {
  const memo = new Map<number, boolean>();
  const overlap = (i: number, j: number): boolean => {
    const key = i * (right.length + 1) + j;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    const result = i === left.length || j === right.length
      ? left.slice(i).every((segment) => segment === '**') && right.slice(j).every((segment) => segment === '**')
      : left[i] === '**' ? overlap(i + 1, j) || overlap(i, j + 1)
      : right[j] === '**' ? overlap(i, j + 1) || overlap(i + 1, j)
      : segmentsOverlap(left[i]!, right[j]!) && overlap(i + 1, j + 1);
    memo.set(key, result);
    return result;
  };
  return overlap(0, 0);
}

export function contractIndex(contract: TestTruth) {
  return contract.modules.map((module) => ({ id: module.id, paths: module.paths,
    specs: specPointers(contract, module), tests: module.tests.map(({ id, title }) => ({ id, title })) }));
}
export function modulesForFiles(contract: TestTruth, paths: string[]) {
  paths.forEach((file) => sourcePatternSchema.parse(file));
  return contract.modules.filter((module) => paths.some((file) => picomatch(module.paths, { dot: true })(file)));
}
export async function specContext(root: string, contract: TestTruth, pathOrModuleId: string, base?: string, target?: string) {
  const module = contract.modules.find((entry) => entry.id === pathOrModuleId);
  const pointers = module ? specPointers(contract, module) : [pathOrModuleId];
  const git = createGitRepository(root);
  const to = target ? await git.resolve(target) : undefined;
  const sections = await Promise.all(pointers.map(async (pointer) => {
    if (!to) return { pointer, content: await readSpecSlice(root, pointer) };
    specPointerSchema.parse(pointer);
    const content = await git.readFile!(specFile(pointer), to);
    if (content === undefined) throw new Error(`Missing spec: ${pointer}`);
    if (Buffer.byteLength(content, 'utf8') > 1_000_000) throw new Error(`Spec must be a file no larger than 1 MB: ${pointer}`);
    return { pointer, content: sliceMarkdown(content, pointer) };
  }));
  let diff = '';
  // Non-Git workspaces still support deterministic section reads.
  try { await git.root(); } catch { return { sections, diff, tests: module?.tests.map(({ id, title }) => ({ id, title })) ?? [] }; }
  const from = base ?? await git.resolve('HEAD').catch(() => git.emptyTree());
  diff = await git.diffForPaths!(module?.paths ?? [], from, to);
  for (const pointer of pointers) {
    const file = specFile(pointer);
    let before: string | undefined;
    try { before = await git.readFile!(file, from); } catch { /* New repository/document. */ }
    const after = to ? await git.readFile!(file, to) ?? '' : await git.readFile!(file) ?? '';
    diff += scopedSpecDiff(await git.diffForPaths!([literalGlob(file)], from, to), pointer, before, after);
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
    return module.paths.some((pattern) => paths.some((query) => query === pattern ||
      ((picomatch.scan(query).isGlob || picomatch.scan(pattern).isGlob) && globsOverlap(query.split('/'), pattern.split('/')))));
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
