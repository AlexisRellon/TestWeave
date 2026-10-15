import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import picomatch from 'picomatch';
import { simpleGit } from 'simple-git';
import { isMissing, workspacePath } from './files.js';
import { testTruthSchema, type TestModule, type TestTruth } from '../schema/test-truth.js';

export interface ScanEvidence { file: string; functions: string[]; routes: string[]; automatedTests: string[] }
export interface ProjectContext { file: string; content: string; journeys: string[] }
export interface ScanReport {
  context: ProjectContext[];
  files: ScanEvidence[];
  modules: TestModule[];
  warnings: string[];
}
const excluded = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', 'vendor', '.next', '.nuxt', '.venv', 'venv', '__pycache__', 'target', '.agents', '.claude', '.codex']);
const source = /\.(?:ts|tsx|js|jsx|mjs|cjs|vue|svelte|py|go|rs|java|kt|cs|rb|php|swift|c|cpp|h|sql|sh)$/i;
const contextName = /^(?:readme|agents|claude|project[-_]?context|context|architecture|requirements|prd|user[-_]?journeys)(?:[._-].*)?\.(?:md|txt)$/i;
const automated = /(?:^|\/)(?:tests?|__tests__|specs?|e2e|cypress)(?:\/|$)|(?:[._-](?:test|spec)\.|^test_)/i;
const maxFiles = 10_000;
const maxBytes = 256_000;

function excludedPath(file: string): boolean {
  return file.split('/').some((part) => excluded.has(part)) || /(?:^|\/)\.env(?:\.|$)|\.(?:pem|key)$|\.d\.ts$/.test(file);
}

export async function listFiles(root: string, options: { includeExcluded?: boolean } = {}): Promise<string[]> {
  const git = simpleGit({ baseDir: root, timeout: { block: 30_000 } });
  if (await git.checkIsRepo()) {
    const listed = await git.raw(['ls-files', '--cached', '--others', '--exclude-standard', '-z']);
    return [...new Set(listed.split('\0').filter((file) => file && !(!options.includeExcluded && excludedPath(file))))].sort();
  }
  const files: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      const file = directory ? directory + '/' + entry.name : entry.name;
      if (excludedPath(file) || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile()) files.push(file);
      if (files.length > maxFiles) throw new Error('Scan exceeds 10,000 files; narrow the workspace or use Git ignore rules');
    }
  }
  await walk('');
  return files.sort();
}

async function readText(root: string, file: string, warnings: string[]): Promise<string | undefined> {
  // Check every component: linked directories must not expose other repositories.
  let current = root;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    let info;
    try { info = await lstat(current); }
    catch (error) {
      if (!isMissing(error)) throw error;
      warnings.push('Skipped missing file: ' + file);
      return undefined;
    }
    if (info.isSymbolicLink()) {
      warnings.push('Skipped symbolic link: ' + file);
      return undefined;
    }
  }
  const target = await workspacePath(root, file);
  const info = await lstat(target);
  if (!info.isFile()) return undefined;
  if (info.size > maxBytes) {
    warnings.push('Skipped file larger than 256 KB: ' + file);
    return undefined;
  }
  const content = await readFile(target, 'utf8');
  if (content.includes('\0')) { warnings.push('Skipped binary file: ' + file); return undefined; }
  return content;
}

function matches(content: string, expression: RegExp): string[] {
  return [...new Set([...content.matchAll(expression)].map((match) => match.slice(1).find((capture) => capture !== undefined)!).filter(Boolean))].slice(0, 100);
}
function inspect(file: string, content: string): ScanEvidence {
  const functions = matches(content, /\b(?:function|def|fn|func)\s+(\w+)|\b(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^\n]*\)|\w+)\s*=>/g);
  const routes = matches(content, /\.(?:get|post|put|patch|delete|route|command)\s*\(\s*['"]([^'"]+)['"]/g);
  if (/(?:^|\/)(?:pages|app)\//.test(file) && /(?:\/(?:page|route)\.[^/]+$|pages\/.*\.[jt]sx?$)/.test(file)) routes.push(file);
  return {
    file, functions: functions.slice(0, 100), routes,
    automatedTests: automated.test(file) ? matches(content, /\b(?:it|test|describe)\s*\(\s*['"]([^'"]+)['"]|\bdef\s+(test_\w+)/g) : [],
  };
}

// Character classes keep literal filenames compatible with the POSIX glob schema.
export function literalGlob(file: string): string {
  return file.replace(/[\[\]*?{}()!+@]/g, (character) => character === ']' ? '[]]' : '[' + character + ']');
}
function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let suffix = 2; used.has(id); suffix++) id = base + '-' + suffix;
  used.add(id);
  return id;
}
function draftModules(files: ScanEvidence[], context: ProjectContext[], contract: TestTruth): TestModule[] {
  const tracks = picomatch(contract.policy.sourceGlobs, { dot: true });
  const ignores = picomatch(contract.policy.ignoreGlobs, { dot: true });
  const covered = contract.modules.flatMap((module) => module.paths);
  const isCovered = covered.length ? picomatch(covered, { dot: true }) : () => false;
  const groups = new Map<string, ScanEvidence[]>();
  for (const file of files) {
    if (!tracks(file.file) || ignores(file.file) || isCovered(file.file)) continue;
    const group = path.posix.dirname(file.file);
    groups.set(group, [...(groups.get(group) ?? []), file]);
  }
  const moduleIds = new Set(contract.modules.map((module) => module.id));
  const testIds = new Set(contract.modules.flatMap((module) => module.tests.map((test) => test.id)));
  const modules: TestModule[] = [];
  for (const [group, entries] of groups) {
    // The contract permits at most 100 path patterns per module.
    for (let offset = 0; offset < entries.length; offset += 100) {
      const batch = entries.slice(offset, offset + 100);
      const digest = createHash('sha256').update(group + ':' + offset).digest('hex').slice(0, 10);
      const base = 'scan-' + group.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 55) + '-' + digest;
      const id = uniqueId(base, moduleIds);
      const name = group === '.' ? 'Root modules' : group;
      const routes = batch.flatMap((entry) => entry.routes);
      const functions = batch.flatMap((entry) => entry.functions);
      const testFiles = batch.filter((entry) => automated.test(entry.file));
      const references = context.map((entry) => entry.file).join(', ') || 'source implementation';
      const evidence = [...routes, ...functions].slice(0, 10).join(', ') || batch[0]!.file;
      const tests: TestModule['tests'] = ['success', 'failure', 'boundary'].map((scenario) => ({
        id: uniqueId(id + '-' + scenario, testIds),
        title: '[Draft] ' + name + ' ' + scenario + ' scenario',
        type: routes.length ? 'uat' : 'component',
        priority: 'medium',
        preconditions: ['Review ' + references + ' and replace this draft with specific inputs and observable expected results.'],
        steps: [{
          action: 'Exercise ' + evidence + ' with ' + scenario + ' inputs after reviewing project requirements.',
          data: 'TODO: specify representative ' + scenario + ' fixtures.',
          expected: 'TODO: record the documented ' + scenario + ' outcome; this draft has not been executed.',
        }],
        tags: ['scan-draft', 'needs-review', scenario],
      }));
      const keywords = [...group.split('/'), ...functions, ...routes].map((value) => value.toLowerCase()).filter((value) => value.length > 2);
      const journeys = context.flatMap((entry) => entry.journeys.map((journey) => ({ file: entry.file, journey })))
        .filter((entry) => keywords.some((keyword) => entry.journey.toLowerCase().includes(keyword))).slice(0, 10);
      for (const [index, entry] of journeys.entries()) tests.push({
        id: uniqueId(id + '-journey-' + (index + 1), testIds),
        title: '[Draft] Journey: ' + entry.journey.slice(0, 200),
        type: 'uat', priority: 'high', preconditions: ['Review the documented journey in ' + entry.file + '.'],
        steps: [{ action: 'Exercise the documented journey: ' + entry.journey, data: 'TODO: identify actors, fixtures and journey steps.',
          expected: 'TODO: specify observable acceptance criteria from ' + entry.file + '; this draft has not been executed.' }],
        tags: ['scan-draft', 'needs-review', 'journey'],
      });
      if (testFiles.length) tests.push({
        id: uniqueId(id + '-automated', testIds), title: '[Draft] Review existing automated tests for ' + name,
        type: 'regression', priority: 'medium',
        preconditions: ['Review the existing test runner configuration; no tests were executed by scan.'],
        steps: [{
          action: 'Review and run the existing suite using its documented command.',
          data: testFiles.map((entry) => entry.file + (entry.automatedTests.length ? ': ' + entry.automatedTests.join(', ') : '')).join('; ').slice(0, 20_000),
          expected: 'TODO: document assertions and required outcomes from the existing suite; record execution separately.',
        }], tags: ['scan-draft', 'needs-review', 'automated'],
      });
      modules.push({ id, name, description: 'Discovery draft for ' + name + '. Review context: ' + references + '. Evidence: ' + evidence,
        paths: batch.map((entry) => literalGlob(entry.file)), tests });
    }
  }
  return testTruthSchema.parse({ ...contract, modules: [...contract.modules, ...modules] }).modules.slice(contract.modules.length);
}

/** Local discovery only. Context is read before any implementation source. */
export async function scanProject(directory: string, contract: TestTruth, explicitContext?: string): Promise<ScanReport> {
  const root = await realpath(directory);
  const warnings: string[] = [];
  const listed = await listFiles(root);
  if (listed.length > maxFiles) throw new Error('Scan exceeds 10,000 files; narrow the workspace or use Git ignore rules');
  const manifests = new Set(['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'composer.json']);
  const contextFiles = listed.filter((file) => contextName.test(path.posix.basename(file)) || manifests.has(path.posix.basename(file)))
    .sort((a, b) => Number(!/project[-_]?context|requirements|prd/i.test(a)) - Number(!/project[-_]?context|requirements|prd/i.test(b)) || a.localeCompare(b));
  let selectedContext: string | undefined;
  if (explicitContext) {
    selectedContext = path.relative(root, await workspacePath(root, explicitContext)).split(path.sep).join('/');
    contextFiles.unshift(selectedContext);
  }
  const context: ProjectContext[] = [];
  for (const file of [...new Set(contextFiles)]) {
    const content = await readText(root, file, warnings);
    if (content === undefined) {
      if (file === selectedContext) throw new Error('Cannot read selected project context: ' + file);
      continue;
    }
    const journeys = content.split(/\r?\n/).filter((line) => /journey|user stor|as a |workflow|acceptance|use case/i.test(line)).map((line) => line.trim()).slice(0, 100);
    context.push({ file, content, journeys });
  }
  if (!context.length) warnings.push('No project context found; review source evidence before adopting drafts. Use --context <file> for custom documentation.');
  const files: ScanEvidence[] = [];
  for (const file of listed.filter((file) => source.test(file))) {
    const content = await readText(root, file, warnings);
    if (content !== undefined) files.push(inspect(file, content));
  }
  return { context, files, modules: draftModules(files, context, contract), warnings };
}
