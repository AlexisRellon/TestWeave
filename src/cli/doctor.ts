import pc from 'picocolors';
import path from 'node:path';
import { homedir } from 'node:os';
import { readFileSync } from 'node:fs';
import { diagnose, repair, type Diagnostic } from '../engine/doctor.js';
import { findAgent, getSkillsDirForAgent } from '../integrations/agents.js';
import { IDE_FILES } from '../integrations/ide.js';
import { mcpTarget } from '../integrations/mcp.js';
import { hookLocation } from '../integrations/hooks.js';
import { TESTWEAVE_SKILL_FILES } from '../integrations/skills.js';
import type { CliContext } from './context.js';
import { TerminalPrompter, type UserPrompter } from './prompts.js';

export interface DoctorOptions { fix?: boolean; json?: boolean }
export async function runDoctor(context: CliContext, options: DoctorOptions, prompt: UserPrompter = new TerminalPrompter()): Promise<number> {
  let checks = await diagnose(context);
  const canRepair = checks.some((check) => !check.ok && check.repairable);
  const shouldFix = options.fix || (!options.json && process.stdin.isTTY && canRepair &&
    await prompt.confirm('Repair missing or modified TestWeave integrations? Invalid contracts will be preserved.'));
  if (shouldFix && canRepair) checks = await repair(context, checks);
  if (options.json) context.output.log(JSON.stringify(checks, null, 2));
  else await printDiagnostics(context, checks);
  return checks.every((check) => check.ok) ? 0 : 1;
}

interface DiagnosticRow { label: string; detail: string; check?: Diagnostic }

function compactPath(file: string): string {
  const relative = path.relative(homedir(), file);
  return relative === '' ? '~' : !relative.startsWith('..') && !path.isAbsolute(relative) ? path.join('~', relative) : file;
}

function checkLabel(id: string): string {
  if (id === 'contract') return 'QA contract';
  if (id === 'config') return 'Project config';
  if (id === 'hook') return 'Pre-push hook';
  const integration = id.slice('ide:'.length);
  return integration === 'universal' ? 'Universal agents' : findAgent(integration)?.displayName ?? integration;
}

function integrationPaths(root: string, integration: string): string[] {
  const skills = getSkillsDirForAgent(integration);
  return [
    IDE_FILES[integration],
    mcpTarget(integration, root)?.file,
    ...(skills && skills !== '.vscode' ? [path.posix.join(skills, 'testweave')] : []),
  ].filter((file): file is string => Boolean(file));
}

async function printDiagnostics(context: CliContext, checks: Diagnostic[]): Promise<void> {
  const metadata = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
  const rows: DiagnosticRow[] = [
    { label: 'TestWeave version', detail: metadata.version + ' (this installation)' },
    { label: 'Node.js runtime', detail: process.version + '  ' + compactPath(process.execPath) },
    { label: 'Workspace', detail: compactPath(context.root) },
    { label: 'Skill bundle', detail: TESTWEAVE_SKILL_FILES.length + ' documents (SKILL.md, commands/, references/)' },
  ];
  if (!checks.some((check) => check.id === 'config')) rows.push({ label: 'Project config', detail: 'valid  .testweave.json' });
  for (const check of checks) {
    const files = await checkFiles(context, check.id);
    rows.push({ label: checkLabel(check.id), check,
      detail: check.message.replace(/\s+/g, ' ') + (files.length ? '  ' + [...new Set(files)].join(', ') : '') });
  }
  if (!checks.some((check) => check.id === 'hook')) rows.push({ label: 'Pre-push hook', detail: 'disabled in project configuration' });
  const width = Math.max(...rows.map((row) => row.label.length));
  const log = (message: string) => context.output.log(message);
  log('');
  log(pc.bold('testweave doctor') + '  ' + pc.dim('diagnostics'));
  log('');
  for (const row of rows) {
    const status = row.check ? (row.check.ok ? pc.green('OK  ') : pc.red('FAIL')) + '  ' : '      ';
    log('    ' + row.label.padEnd(width) + '  ' + status + row.detail);
  }
  printSummary(checks, log);
  log('  ' + pc.dim('testweave ' + metadata.version));
  log('');
}

async function checkFiles(context: CliContext, id: string): Promise<string[]> {
  if (id === 'contract') return ['test-truth.md'];
  if (id === 'config') return ['.testweave.json'];
  if (id.startsWith('ide:')) return integrationPaths(context.root, id.slice('ide:'.length));
  if (id !== 'hook') return [];
  const location = await hookLocation(context.root, context.git).catch(() => undefined);
  if (!location) return [];
  const relative = path.relative(context.root, location.file);
  return [relative.startsWith('..') || path.isAbsolute(relative) ? compactPath(location.file) : relative];
}

function printSummary(checks: Diagnostic[], log: (message: string) => void): void {
  const failed = checks.filter((check) => !check.ok);
  const passed = checks.length - failed.length;
  log('');
  log('  ' + pc.bold('Summary:') + '  ' + (failed.length ? pc.red : pc.green)(passed + '/' + checks.length + ' checks passed'));
  if (!failed.length) { log('  ' + pc.green('Everything looks good.')); return; }
  log('  ' + pc.red(failed.length + (failed.length === 1 ? ' check needs' : ' checks need') + ' attention.'));
  if (failed.some((check) => check.repairable)) log('  Run testweave doctor --fix to repair supported problems.');
  if (failed.some((check) => !check.repairable)) log('  Some problems require manual repair; inspect the diagnostics above.');
}
