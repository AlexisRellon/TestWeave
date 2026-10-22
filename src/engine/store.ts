import path from 'node:path';
import { testCaseSchema, testModuleSchema, testTruthSchema, type TestCase, type TestModule, type TestTruth } from '../schema/test-truth.js';
import { atomicWrite, nodeFileSystem, readOptional, rejectSymlink, workspacePath, type FileSystem } from './files.js';
import { replaceContractBlock, serializeTestTruth } from './markdown.js';
import { compileContract, rebaseModule } from './includes.js';

export interface ContractStore {
  read(): Promise<TestTruth>;
  readMarkdown(): Promise<string>;
  initialize(contract: TestTruth): Promise<boolean>;
  upsert(module: TestModule, expected?: TestTruth): Promise<TestTruth>;
  append(modules: TestModule[], expected: TestTruth): Promise<TestTruth>;
  upsertCase(moduleId: string, testCase: TestCase): Promise<TestTruth>;
  removeCase(moduleId: string, testId: string): Promise<TestTruth>;
  migrate?(): Promise<void>;
}
export class MarkdownContractStore implements ContractStore {
  readonly file: string;
  constructor(root: string, private readonly io: FileSystem = nodeFileSystem) { this.file = path.join(root, 'test-truth.md'); }
  async readMarkdown(): Promise<string> {
    await rejectSymlink(this.file, this.io);
    return this.io.readFile(this.file, 'utf8');
  }
  private async compile(markdown: string) {
    return compileContract(markdown, async (file) => readOptional(await workspacePath(path.dirname(this.file), file, this.io), this.io));
  }
  async read(): Promise<TestTruth> { return (await this.compile(await this.readMarkdown())).contract; }
  async migrate(): Promise<void> {
    const { documents } = await this.compile(await this.readMarkdown());
    for (const document of documents) if (document.contract.schemaVersion === 1) {
      const store = new MarkdownContractStore(path.dirname(path.join(path.dirname(this.file), document.file)), this.io);
      await store.update((current) => ({ ...current, schemaVersion: 2 }));
    }
  }
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
      const { contract: current, documents } = await this.compile(markdown);
      const updated = testTruthSchema.parse(transform(current));
      // Mutations touch one owning document; never flatten package contracts into the root.
      const changed = documents.filter((document) => document.contract.modules.some((module) =>
        JSON.stringify(current.modules.find((entry) => entry.id === module.id)) !==
        JSON.stringify(updated.modules.find((entry) => entry.id === module.id))));
      const added = updated.modules.filter((module) => !current.modules.some((entry) => entry.id === module.id));
      const owner = changed[0] ?? documents[0]!;
      if (changed.length > 1 || (owner !== documents[0] && added.length)) throw new Error('Update one contract document at a time');
      const owned = new Set(owner.contract.modules.map((module) => module.id));
      const persisted = testTruthSchema.parse({ ...owner.contract,
        schemaVersion: updated.schemaVersion === 2 ? 2 : owner.contract.schemaVersion,
        modules: updated.modules.filter((module) => owned.has(module.id) || added.some((entry) => entry.id === module.id))
          .map((module) => rebaseModule(module, path.posix.dirname(owner.file), true)),
      });
      if (await this.readMarkdown() !== markdown) throw new Error('Contract changed during update; retry');
      for (const document of documents.slice(1)) {
        const file = await workspacePath(path.dirname(this.file), document.file, this.io);
        if (await this.io.readFile(file, 'utf8') !== document.markdown) throw new Error('Included contract changed during update; retry');
      }
      const destination = await workspacePath(path.dirname(this.file), owner.file, this.io);
      const childLock = owner !== documents[0] ? `${destination}.lock` : undefined;
      if (childLock) await this.io.writeFile(childLock, String(process.pid), { flag: 'wx' });
      try {
        if (await this.io.readFile(destination, 'utf8') !== owner.markdown) throw new Error('Contract changed during update; retry');
        await atomicWrite(destination, replaceContractBlock(owner.markdown, persisted), this.io);
      } finally { if (childLock) await this.io.unlink(childLock); }
      return updated;
    } finally { await this.io.unlink(lock); }
  }
}
