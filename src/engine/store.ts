import path from 'node:path';
import { testCaseSchema, testModuleSchema, testTruthSchema, type TestCase, type TestModule, type TestTruth } from '../schema/test-truth.js';
import { atomicWrite, nodeFileSystem, readOptional, rejectSymlink, type FileSystem } from './files.js';
import { parseTestTruth, replaceContractBlock, serializeTestTruth } from './markdown.js';

export interface ContractStore {
  read(): Promise<TestTruth>;
  readMarkdown(): Promise<string>;
  initialize(contract: TestTruth): Promise<boolean>;
  upsert(module: TestModule, expected?: TestTruth): Promise<TestTruth>;
  append(modules: TestModule[], expected: TestTruth): Promise<TestTruth>;
  upsertCase(moduleId: string, testCase: TestCase): Promise<TestTruth>;
  removeCase(moduleId: string, testId: string): Promise<TestTruth>;
}
export class MarkdownContractStore implements ContractStore {
  readonly file: string;
  constructor(root: string, private readonly io: FileSystem = nodeFileSystem) { this.file = path.join(root, 'test-truth.md'); }
  async readMarkdown(): Promise<string> {
    await rejectSymlink(this.file, this.io);
    return this.io.readFile(this.file, 'utf8');
  }
  async read(): Promise<TestTruth> { return parseTestTruth(await this.readMarkdown()); }
  async initialize(contract: TestTruth): Promise<boolean> {
    if (await readOptional(this.file, this.io) !== undefined) { await this.read(); return false; }
    await this.io.writeFile(this.file, serializeTestTruth(contract), { encoding: 'utf8', flag: 'wx' });
    return true;
  }
  async upsert(input: TestModule, expected?: TestTruth): Promise<TestTruth> {
    const module = testModuleSchema.parse(input);
    return this.update((current) => {
      if (expected && JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('Contract changed during review; retry');
      const exists = current.modules.some((entry) => entry.id === module.id);
      return { ...current, modules: exists
        ? current.modules.map((entry) => entry.id === module.id ? module : entry)
        : [...current.modules, module] };
    });
  }
  async append(modules: TestModule[], expected: TestTruth): Promise<TestTruth> {
    return this.update((current) => {
      if (JSON.stringify(current) !== JSON.stringify(expected)) throw new Error('Contract changed during scan; retry');
      return { ...current, modules: [...current.modules, ...modules] };
    });
  }
  async upsertCase(moduleId: string, input: TestCase): Promise<TestTruth> {
    const testCase = testCaseSchema.parse(input);
    return this.updateCases(moduleId, (tests) => tests.some((test) => test.id === testCase.id)
      ? tests.map((test) => test.id === testCase.id ? testCase : test) : [...tests, testCase]);
  }
  async removeCase(moduleId: string, testId: string): Promise<TestTruth> {
    return this.updateCases(moduleId, (tests) => tests.filter((test) => test.id !== testId));
  }
  private async updateCases(moduleId: string, transform: (tests: TestCase[]) => TestCase[]): Promise<TestTruth> {
    return this.update((current) => {
      if (!current.modules.some((module) => module.id === moduleId)) throw new Error(`Unknown module: ${moduleId}`);
      return { ...current, modules: current.modules.map((module) => module.id === moduleId
        ? { ...module, tests: transform(module.tests) } : module) };
    });
  }
  private async update(transform: (current: TestTruth) => TestTruth): Promise<TestTruth> {
    const lock = `${this.file}.lock`;
    await this.io.writeFile(lock, String(process.pid), { flag: 'wx' }).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') throw new Error('Contract is locked by another writer; retry or remove a stale test-truth.md.lock');
      throw error;
    });
    try {
      const markdown = await this.readMarkdown();
      const current = parseTestTruth(markdown);
      const updated = testTruthSchema.parse(transform(current));
      if (await this.readMarkdown() !== markdown) throw new Error('Contract changed during update; retry');
      await atomicWrite(this.file, replaceContractBlock(markdown, updated), this.io);
      return updated;
    } finally { await this.io.unlink(lock); }
  }
}
