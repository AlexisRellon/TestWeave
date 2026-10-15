import { z } from 'zod';
import { ValidatedModuleAuthor, type ModuleAuthor } from './adapter.js';

export const providerSchema = z.enum(['openai', 'anthropic', 'ollama', 'custom', 'gemini']);
export type Provider = z.infer<typeof providerSchema>;
export async function createModuleAuthor(provider: Provider, model: string, env: NodeJS.ProcessEnv = process.env, baseUrl?: string): Promise<ModuleAuthor> {
  if (!model.trim()) throw new Error('An explicit model is required for AI authoring');
  if (baseUrl && provider !== 'custom' && provider !== 'ollama') throw new Error('--base-url requires custom or ollama');
  if (provider === 'ollama' || provider === 'custom' || provider === 'gemini') {
    const baseURL = baseUrl ?? (provider === 'ollama' ? 'http://localhost:11434/v1' : provider === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined);
    if (!baseURL) throw new Error('Custom authoring requires --base-url');
    const url = new URL(baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Base URL must be an HTTP(S) endpoint without credentials, query or fragment');
    if (provider === 'gemini' && !env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY to use Gemini authoring');
    const apiKey = provider === 'gemini' ? env.GEMINI_API_KEY! : provider === 'custom' ? env.TESTWEAVE_API_KEY ?? 'local' : 'ollama';
    const [{ default: OpenAI }, { CompatibleGenerator }] = await Promise.all([import('openai'), import('./compatible.js')]);
    return new ValidatedModuleAuthor(new CompatibleGenerator(new OpenAI({ apiKey, baseURL, timeout: 60_000, maxRetries: 2 }), model));
  }
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY) throw new Error('Set OPENAI_API_KEY to use OpenAI authoring');
    const [{ default: OpenAI }, { OpenAiGenerator }] = await Promise.all([import('openai'), import('./openai.js')]);
    return new ValidatedModuleAuthor(new OpenAiGenerator(new OpenAI({ apiKey: env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 2 }), model));
  }
  if (!env.ANTHROPIC_API_KEY) throw new Error('Set ANTHROPIC_API_KEY to use Anthropic authoring');
  const [{ default: Anthropic }, { AnthropicGenerator }] = await Promise.all([import('@anthropic-ai/sdk'), import('./anthropic.js')]);
  return new ValidatedModuleAuthor(new AnthropicGenerator(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 60_000, maxRetries: 2 }), model));
}
