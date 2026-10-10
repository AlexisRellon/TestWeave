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
import { errorMessage } from '../engine/doctor.js';

export function createProgram(): Command {
  const program = new Command().name('testweave').version('0.3.0')
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
    .action(async (options: SyncOptions) => { process.exitCode = await runSync(await context(), options); });
  program.command('generate').description('Export QA definitions, or author an AI module draft')
    .option('--target <target>', 'jira, xray, or zephyr', 'xray')
    .option('--format <format>', 'csv or json', 'csv')
    .option('--project-key <key>', 'Destination Jira project key (required for JSON)')
    .option('-o, --output <file>', 'Write a new workspace-relative file; default stdout')
    .option('--provider <provider>', 'Opt into AI drafting: openai or anthropic')
    .option('--model <model>', 'Explicit provider model ID for AI authoring')
    .option('--context <file>', 'Workspace-relative context file to send to the provider')
    .option('--module <id>', 'Existing module to update in the AI draft')
    .action(async (options: unknown) => { await runGenerate(await context(), options); });
  program.command('mcp').description('Serve MCP tools and the contract resource over stdio')
    .action(async () => {
      const { serveMcp } = await import('../mcp/server.js');
      await serveMcp(await context());
    });
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
