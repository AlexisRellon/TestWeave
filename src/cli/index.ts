#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import pc from 'picocolors';
import { fileURLToPath } from 'node:url';
import { realpath } from 'node:fs/promises';
import { createContext } from './context.js';
import { runInit, type InitOptions } from './init.js';
import { runUpdate, type UpdateOptions } from './update.js';
import { runDoctor, type DoctorOptions } from './doctor.js';
import { runSync, type SyncOptions } from './sync.js';
import { runGenerate } from './generate.js';
import { runScan } from './scan.js';
import { errorMessage } from '../engine/doctor.js';
import { runMcpConfig, runMcpInstall } from './mcp.js';
import { impact } from '../engine/queries.js';
import { wireJson } from '../engine/wire.js';

export function createProgram(): Command {
  const program = new Command().name('testweave').version('0.7.2')
    .description('Keep manual QA contracts aligned with source code.')
    .option('--cwd <directory>', 'Workspace directory', process.cwd())
    .showHelpAfterError().exitOverride();
  const context = async () => {
    const options = program.opts<{ cwd: string }>();
    return createContext(options.cwd);
  };
  program.command('init').alias('setup').description('Detect integrations and initialize the QA contract')
    .option('-y, --yes', 'Accept default integrations without prompting')
    .option('--no-hook', 'Skip installing a Git hook')
    .action(async (options: InitOptions) => { await runInit(await context(), options); });
  program.command('update').description('Update agent skills, IDE rules, and hooks to the latest TestWeave definitions')
    .option('-y, --yes', 'Accept default or existing integrations without prompting')
    .option('--no-hook', 'Skip installing or updating a Git hook')
    .action(async (options: UpdateOptions) => { await runUpdate(await context(), options); });
  program.command('doctor').description('Validate the contract, IDE rules, and hook')
    .option('--fix', 'Repair supported configuration problems without prompting')
    .option('--json', 'Emit machine-readable diagnostics')
    .action(async (options: DoctorOptions) => { process.exitCode = await runDoctor(await context(), options); });
  program.command('sync').description('Check source changes against QA documentation')
    .option('--base <ref>', 'Compare against this Git revision instead of upstream')
    .option('--strict', 'Block on drift even in warning mode')
    .option('--json', 'Emit machine-readable report')
    .option('--pre-push', 'Read Git pre-push updates from stdin and inspect committed snapshots')
    .option('--semantic', 'Ignore provably cosmetic JavaScript/TypeScript edits')
    .option('--interactive', 'Resolve drift in a TTY with reviewed local or AI drafts')
    .option('--provider <provider>', 'Explicit AI provider for interactive drafting')
    .option('--model <model>', 'AI model for interactive drafting')
    .option('--base-url <url>', 'Custom or Ollama API endpoint')
    .action(async (options: SyncOptions) => { process.exitCode = await runSync(await context(), options); });
  program.command('scan').description('Read project context and discover existing modules, journeys and automated tests')
    .option('--context <file>', 'Read a workspace-relative project context file first')
    .option('--apply', 'Add uncovered module drafts to test-truth.md, preserving existing modules')
    .option('--json', 'Emit context, source evidence and validated module drafts as JSON')
    .action(async (options: unknown) => { await runScan(await context(), options); });
  program.command('impact').description('Preview QA coverage for planned file paths or globs')
    .argument('<paths...>', 'Workspace-relative paths or globs')
    .option('--json', 'Emit JSON')
    .option('--compact', 'Emit compact JSON')
    .action(async (paths: string[], options: { json?: boolean; compact?: boolean }) => {
      const ctx = await context();
      const report = await impact(ctx.root, await ctx.store.read(), paths);
      if (options.json || options.compact) ctx.output.log(wireJson(report, options.compact));
      else for (const module of report.modules) {
        ctx.output.log(`${module.id}: ${module.tests.map((test) => test.id).join(', ')}`);
        for (const spec of module.specs) ctx.output.log(`${spec.pointer}\n${'content' in spec ? spec.content : spec.error}`);
        for (const test of module.tests) ctx.output.log(`${test.id}: ${test.title}\n${test.preconditions.join('\n')}`);
      }
    });
  program.command('generate').description('Export QA definitions, or author an AI module draft')
    .option('--target <target>', 'jira, xray, or zephyr', 'xray')
    .option('--format <format>', 'csv or json', 'csv')
    .option('--project-key <key>', 'Destination Jira project key (required for JSON)')
    .option('-o, --output <file>', 'Write a new workspace-relative file; default stdout')
    .option('--provider <provider>', 'Opt into AI drafting: openai, anthropic, ollama, custom or gemini')
    .option('--base-url <url>', 'Custom or Ollama OpenAI-compatible API endpoint')
    .option('--compact', 'Compact AI prompt and JSON draft')
    .option('--model <model>', 'Explicit provider model ID for AI authoring')
    .option('--context <file>', 'Workspace-relative context file to send to the provider')
    .option('--module <id>', 'Existing module to update in the AI draft')
    .action(async (options: unknown) => { await runGenerate(await context(), options); });
  const mcp = program.command('mcp').description('Serve MCP tools and the contract resource over stdio')
    .option('--compact', 'Compact MCP JSON responses')
    .action(async (options: { compact?: boolean }) => {
      const { serveMcp } = await import('../mcp/server.js');
      await serveMcp({ ...await context(), ...(options.compact ? { compact: true } : {}) });
    });
  mcp.command('config').description('Print an MCP entry for any client, including Codex')
    .option('--provider <provider>', 'Verified client ID, such as codex, opencode or gemini-cli')
    .option('--format <format>', 'json or toml (defaults to the provider format)')
    .option('--key <key>', 'JSON server map key (default: mcpServers)')
    .action(async (options: unknown) => { await runMcpConfig(await context(), options); });
  mcp.command('install').description('Register MCP for a verified provider or a custom workspace JSON/JSONC config')
    .option('--provider <provider>', 'Verified client ID, such as codex, opencode or gemini-cli')
    .option('--config <file>', 'Workspace-relative custom client configuration file')
    .option('--key <key>', 'Custom server map key (default: mcpServers)')
    .action(async (options: unknown) => { await runMcpInstall(await context(), options); });
  return program;
}
export async function main(argv = process.argv): Promise<void> {
  try { await createProgram().parseAsync(argv); }
  catch (error) {
    if (error instanceof CommanderError) { process.exitCode = error.exitCode; return; }
    console.error(pc.red('TestWeave: ') + errorMessage(error));
    process.exitCode = 2;
  }
}
const invokedPath = process.argv[1];
if (invokedPath) {
  const [actualInvoked, thisFile] = await Promise.all([
    realpath(invokedPath).catch(() => invokedPath),
    realpath(fileURLToPath(import.meta.url)).catch(() => fileURLToPath(import.meta.url)),
  ]);
  const matches = process.platform === 'win32'
    ? actualInvoked.toLowerCase() === thisFile.toLowerCase()
    : actualInvoked === thisFile;
  if (matches) await main();
}
