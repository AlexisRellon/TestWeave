import type OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { structuredModuleSchema } from '../schema/test-truth.js';
import type { StructuredGenerator } from './adapter.js';

export class CompatibleGenerator implements StructuredGenerator {
  constructor(private readonly client: OpenAI, private readonly model: string) {}
  async generate(system: string, input: string): Promise<unknown> {
    const response = await this.client.chat.completions.create({
      model: this.model, messages: [{ role: 'system', content: system }, { role: 'user', content: input }],
      response_format: zodResponseFormat(structuredModuleSchema, 'test_module'),
    });
    const choice = response.choices[0];
    if (choice?.finish_reason !== 'stop' || !choice.message.content || choice.message.refusal) throw new Error('Provider did not return a complete structured module');
    return JSON.parse(choice.message.content) as unknown;
  }
}
