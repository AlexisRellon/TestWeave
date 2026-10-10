import path from 'node:path';
import { testModuleSchema, testTruthSchema, type TestModule, type TestTruth } from '../schema/test-truth.js';
import { atomicWrite, nodeFileSystem, readOptional, rejectSymlink, type FileSystem } from './files.js';
import { parseTestTruth, replaceContractBlock, serializeTestTruth } from './markdown.js';

export interface ContractStore {
  read(): Promise<TestTruth>;
  readMarkdown(): Promise<string>;
  initialize(contract: TestTruth): Promise<boolean>;
  upsert(module: TestModule): Promise<TestTruth>;
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
  async upsert(input: TestModule): Promise<TestTruth> {
    const module = testModuleSchema.parse(input);
    const lock = `${this.file}.lock`;
    await this.io.writeFile(lock, String(process.pid), { flag: 'wx' }).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') throw new Error('Contract is locked by another writer; retry or remove a stale test-truth.md.lock');
      throw error;
    });
    try {
      const markdown = await this.readMarkdown();
      const current = parseTestTruth(markdown);
      const exists = current.modules.some((entry) => entry.id === module.id);
      const updated = testTruthSchema.parse({ ...current, modules: exists
        ? current.modules.map((entry) => entry.id === module.id ? module : entry)
        : [...current.modules, module] });
      if (await this.readMarkdown() !== markdown) throw new Error('Contract changed during update; retry');
      await atomicWrite(this.file, replaceContractBlock(markdown, updated), this.io);
      return updated;
    } finally { await this.io.unlink(lock); }
  }
}
