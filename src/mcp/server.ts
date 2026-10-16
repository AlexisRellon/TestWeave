import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ContractStore } from '../engine/store.js';
import type { DriftAnalyzer } from '../engine/drift.js';
import { errorMessage } from '../engine/doctor.js';
import { testModuleSchema, testCaseSchema, sourcePatternSchema } from '../schema/test-truth.js';
import { contractIndex, modulesForFiles, specContext, impact } from '../engine/queries.js';
import { wireJson } from '../engine/wire.js';
import { exportOptionsSchema, generateExport } from '../integrations/exporters.js';

export interface McpDependencies { root: string; store: ContractStore; analyzer: DriftAnalyzer; compact?: boolean }
async function result(action: () => Promise<unknown>, compact = false): Promise<CallToolResult> {
  try {
    const value = await action();
    return { content: [{ type: 'text', text: wireJson(value, compact) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: errorMessage(error) }] };
  }
}
export function createMcpServer(deps: McpDependencies): McpServer {
  const server = new McpServer({ name: 'testweave', version: '0.7.3' });
  const respond = (action: () => Promise<unknown>) => result(action, deps.compact);
  const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  server.registerTool('get_contract_index', {
    description: 'Read only module IDs, paths, spec pointers and test IDs/titles.', inputSchema: {}, annotations: readOnly,
  }, async () => respond(async () => contractIndex(await deps.store.read())));
  server.registerTool('get_modules_for_files', {
    description: 'Read only modules matching the supplied edited file paths.',
    inputSchema: { paths: z.array(sourcePatternSchema).min(1).max(100) }, annotations: readOnly,
  }, async ({ paths }) => respond(async () => modulesForFiles(await deps.store.read(), paths)));
  server.registerTool('get_module_by_path', {
    description: 'Read modules matching one edited file path.', inputSchema: { path: sourcePatternSchema }, annotations: readOnly,
  }, async ({ path }) => respond(async () => modulesForFiles(await deps.store.read(), [path])));
  server.registerTool('get_spec_slice', {
    description: 'Read linked Markdown sections, uncommitted diff hunks and test headers for a module or document pointer.',
    inputSchema: { pathOrModuleId: z.string().min(1).max(500) }, annotations: readOnly,
  }, async ({ pathOrModuleId }) => respond(async () => specContext(deps.root, await deps.store.read(), pathOrModuleId)));
  server.registerTool('impact', {
    description: 'Preview modules, linked spec sections, test IDs and preconditions for planned paths/globs without editing files.',
    inputSchema: { paths: z.array(sourcePatternSchema).min(1).max(100) }, annotations: readOnly,
  }, async ({ paths }) => respond(async () => impact(deps.root, await deps.store.read(), paths)));
  server.registerTool('upsert_test_case', {
    description: 'Create or replace one test case under the contract lock. IDs are globally unique.',
    inputSchema: { moduleId: z.string().min(1), testCase: testCaseSchema },
    annotations: { ...readOnly, readOnlyHint: false, destructiveHint: true },
  }, async ({ moduleId, testCase }) => respond(async () => {
    await deps.store.upsertCase(moduleId, testCase); return { moduleId, testId: testCase.id };
  }));
  server.registerTool('remove_test_case', {
    description: 'Remove one test case under the contract lock. Removing the final case is rejected.',
    inputSchema: { moduleId: z.string().min(1), testId: z.string().min(1) },
    annotations: { ...readOnly, readOnlyHint: false, destructiveHint: true },
  }, async ({ moduleId, testId }) => respond(async () => {
    await deps.store.removeCase(moduleId, testId); return { moduleId, testId };
  }));
  const uri = pathToFileURL(path.join(deps.root, 'test-truth.md')).href;
  server.registerResource('living-test-contract', uri, {
    title: 'TestWeave Living Test Contract', description: 'Authoritative manual QA module contract', mimeType: 'text/markdown',
  }, async () => ({ contents: [{ uri, mimeType: 'text/markdown', text: await deps.store.readMarkdown() }] }));
  server.registerTool('analyze_code_drift', {
    description: 'Compare working source and QA modules with an upstream revision. Read-only; missing upstream is an error.',
    inputSchema: { base: z.string().min(1).optional(), strict: z.boolean().optional(), semantic: z.boolean().optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ base, strict, semantic }) => respond(() => deps.analyzer.analyze({
    ...(semantic !== undefined ? { semantic } : {}),
    ...(base ? { base } : {}), ...(strict !== undefined ? { strict } : {}),
  })));
  server.registerTool('upsert_test_module', {
    description: 'Create or replace one complete QA module by ID in test-truth.md. Existing test IDs should be preserved. Does not claim execution.',
    inputSchema: { module: testModuleSchema },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  }, async ({ module }) => respond(async () => {
    const contract = await deps.store.upsert(module);
    return { moduleId: module.id, moduleCount: contract.modules.length, resource: uri };
  }));
  server.registerTool('generate_qa_export', {
    description: 'Return CSV or JSON test definitions for Jira, Xray, or Zephyr. JSON requires projectKey. Returns content without writing or uploading.',
    inputSchema: exportOptionsSchema.shape,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async (options) => respond(async () => generateExport(await deps.store.read(), options)));
  return server;
}
export async function serveMcp(deps: McpDependencies): Promise<McpServer> {
  const server = createMcpServer(deps);
  await server.connect(new StdioServerTransport());
  return server;
}
