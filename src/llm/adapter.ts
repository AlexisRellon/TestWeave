import { z } from 'zod';
import { nftProfileSchema, testModuleSchema, type TestModule } from '../schema/test-truth.js';
import { QA_SYSTEM_PROMPT } from './prompts.js';
import { wireJson } from '../engine/wire.js';

export interface AuthorRequest { context: string; existing?: TestModule; compact?: boolean }
export interface ModuleAuthor { author(request: AuthorRequest): Promise<TestModule> }
export interface StructuredGenerator { generate(system: string, input: string): Promise<unknown> }
export const authorRequestSchema = z.strictObject({ context: z.string().trim().min(1).max(200_000), existing: testModuleSchema.optional(), compact: z.boolean().optional() });

export class ValidatedModuleAuthor implements ModuleAuthor {
  constructor(private readonly generator: StructuredGenerator) {}
  async author(input: AuthorRequest): Promise<TestModule> {
    const request = authorRequestSchema.parse(input);
    const { compact, ...payload } = request;
    const generated = await this.generator.generate(QA_SYSTEM_PROMPT, wireJson(payload, compact));
    const normalized: unknown = JSON.parse(JSON.stringify(generated, (key, value: unknown) =>
      (key === 'docs' || key === 'specs' || key === 'refs' || key === 'profile' ||
        key in nftProfileSchema.shape) && value === null ? undefined : value));
    const result = testModuleSchema.parse(normalized);
    if (request.existing && result.id !== request.existing.id) throw new Error('AI changed the existing module ID; draft rejected');
    const ids = result.tests.map((test) => test.id);
    if (new Set(ids).size !== ids.length) throw new Error('AI returned duplicate test IDs');
    return result;
  }
}
