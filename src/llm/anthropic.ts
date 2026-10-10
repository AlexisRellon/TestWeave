import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { testModuleSchema } from '../schema/test-truth.js';
import type { StructuredGenerator } from './adapter.js';

export class AnthropicGenerator implements StructuredGenerator {
  constructor(private readonly client: Anthropic, private readonly model: string) {}
  async generate(system: string, input: string): Promise<unknown> {
    const schema = z.toJSONSchema(testModuleSchema);
    const response = await this.client.messages.create({
      model: this.model, system, max_tokens: 12_000,
      messages: [{ role: 'user', content: input }],
      tools: [{ name: 'author_test_module', description: 'Return the authored manual QA module', input_schema: { ...schema, type: 'object' } }],
      tool_choice: { type: 'tool', name: 'author_test_module', disable_parallel_tool_use: true },
    });
    if (response.stop_reason !== 'tool_use') throw new Error('Anthropic did not return a complete structured module');
    const block = response.content.find((content) => content.type === 'tool_use' && content.name === 'author_test_module');
    if (!block || block.type !== 'tool_use') throw new Error('Anthropic response is missing the module');
    return block.input;
  }
}
