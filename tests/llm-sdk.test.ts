import test from 'node:test';
import assert from 'node:assert/strict';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { z } from 'zod';
import { AnthropicGenerator } from '../src/llm/anthropic.js';
import { OpenAiGenerator } from '../src/llm/openai.js';
import { moduleFixture } from './helpers.js';

test('Anthropic SDK sends the forced tool schema and returns the structured module', async () => {
  const client = new Anthropic({
    apiKey: 'test-key', maxRetries: 0,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      assert.equal(new URL(request.url).pathname, '/v1/messages');
      const body = z.object({
        model: z.string(),
        tool_choice: z.object({ type: z.literal('tool'), name: z.string(), disable_parallel_tool_use: z.boolean() }),
        tools: z.array(z.object({ name: z.string(), input_schema: z.object({ type: z.literal('object') }) })),
      }).parse(await request.json());
      assert.equal(body.model, 'test-model');
      assert.deepEqual(body.tool_choice, { type: 'tool', name: 'author_test_module', disable_parallel_tool_use: true });
      assert.equal(body.tools[0]?.name, 'author_test_module');
      return Response.json({
        id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model',
        stop_reason: 'tool_use', stop_sequence: null,
        content: [{ type: 'tool_use', id: 'tool_test', name: 'author_test_module', input: moduleFixture }],
        usage: { input_tokens: 1, output_tokens: 1 },
      });
    },
  });
  assert.deepEqual(await new AnthropicGenerator(client, 'test-model').generate('System', 'Input'), moduleFixture);
});

test('Anthropic adapter rejects truncated SDK responses', async () => {
  const client = new Anthropic({
    apiKey: 'test-key', maxRetries: 0,
    fetch: async () => Response.json({ stop_reason: 'max_tokens', content: [] }),
  });
  await assert.rejects(new AnthropicGenerator(client, 'test-model').generate('System', 'Input'), /complete structured module/);
});

test('OpenAI SDK and current Zod serialize and parse strict structured output together', async () => {
  const client = new OpenAI({
    apiKey: 'test-key', maxRetries: 0,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      assert.equal(new URL(request.url).pathname, '/v1/responses');
      const body = z.object({
        text: z.object({ format: z.object({ type: z.literal('json_schema'), name: z.string(), strict: z.literal(true) }) }),
      }).parse(await request.json());
      assert.equal(body.text.format.name, 'test_module');
      return Response.json({
        id: 'resp_test', object: 'response', status: 'completed',
        output: [{
          type: 'message', id: 'msg_test', role: 'assistant', status: 'completed',
          content: [{ type: 'output_text', text: JSON.stringify(moduleFixture), annotations: [] }],
        }],
      });
    },
  });
  assert.deepEqual(await new OpenAiGenerator(client, 'test-model').generate('System', 'Input'), moduleFixture);
});

test('OpenAI adapter rejects incomplete SDK responses', async () => {
  const client = new OpenAI({
    apiKey: 'test-key', maxRetries: 0,
    fetch: async () => Response.json({ id: 'resp_test', object: 'response', status: 'incomplete', output: [] }),
  });
  await assert.rejects(new OpenAiGenerator(client, 'test-model').generate('System', 'Input'), /complete structured module/);
});
