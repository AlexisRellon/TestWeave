import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { testModuleSchema } from '../schema/test-truth.js';
import type { StructuredGenerator } from './adapter.js';

export class OpenAiGenerator implements StructuredGenerator {
  constructor(private readonly client: OpenAI, private readonly model: string) {}
  async generate(system: string, input: string): Promise<unknown> {
    const response = await this.client.responses.parse({
      model: this.model,
      input: [{ role: 'system', content: system }, { role: 'user', content: input }],
      text: { format: zodTextFormat(testModuleSchema, 'test_module') },
      max_output_tokens: 12_000,
    });
    if (!response.output_parsed || response.status !== 'completed') throw new Error('OpenAI did not return a complete structured module');
    return response.output_parsed;
  }
}
