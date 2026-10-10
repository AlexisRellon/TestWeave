import pc from 'picocolors';
import type { DetectedIntegrations } from '../integrations/config.js';
import { UNIVERSAL_AGENTS, ALL_AGENTS } from '../integrations/agents.js';

export const TESTWEAVE_BANNER = `
  ████████╗███████╗███████╗████████╗██╗    ██╗███████╗ █████╗ ██╗   ██╗███████╗
  ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║    ██║██╔════╝██╔══██╗██║   ██║██╔════╝
     ██║   █████╗  ███████╗   ██║   ██║ █╗ ██║█████╗  ███████║██║   ██║█████╗  
     ██║   ██╔══╝  ╚════██║   ██║   ██║███╗██║██╔══╝  ██╔══██║╚██╗ ██╔╝██╔══╝  
     ██║   ███████╗███████║   ██║   ╚███╔███╔╝███████╗██║  ██║ ╚████╔╝ ███████╗
     ╚═╝   ╚══════╝╚══════╝   ╚═╝    ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝
`;

export const TESTWEAVE_BANNER_COMPACT = `
  ████████╗███████╗███████╗████████╗██╗    ██╗███████╗
  ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝██║    ██║██╔════╝
     ██║   █████╗  ███████╗   ██║   ██║ █╗ ██║█████╗  
     ██║   ██╔══╝  ╚════██║   ██║   ██║███╗██║██╔══╝  
     ██║   ███████╗███████║   ██║   ╚███╔███╔╝███████╗
     ╚═╝   ╚══════╝╚══════╝   ╚═╝    ╚══╝╚══╝ ╚══════╝
`;

export function printBanner(log: (msg: string) => void): void {
  const cols = process.stdout.columns ?? 80;
  const banner = cols < 80 ? TESTWEAVE_BANNER_COMPACT : TESTWEAVE_BANNER;
  log(pc.bold(pc.white(banner.trimEnd())));
  log(`  ${pc.bgCyan(pc.black(pc.bold(' testweave ')))} \n`);
}

export function printSetupOverview(
  root: string,
  detected: DetectedIntegrations,
  log: (msg: string) => void
): void {
  const diamond = pc.green('◇');
  const dot = pc.blue('●');

  log(`${diamond} Workspace: ${root}`);
  log(`${diamond} Git: ${detected.git ? 'detected' : 'not detected'}`);
  if (detected.ides.length > 0) {
    log(`${diamond} Detected IDEs: ${detected.ides.join(', ')}`);
  }
  log(`${diamond} Found 1 skill`);
  log(`${dot} Selected 1 skill: ${pc.bold(pc.cyan('testweave'))}`);
  log(`${diamond} ${ALL_AGENTS.length} agents`);
  log(pc.bold('Which agents do you want to install to?\n'));

  // Universal agents section
  log(pc.dim('── ') + pc.white('Universal (.agents/skills)') + pc.dim(' ── always included ──────────────'));
  
  const displayUniversal = UNIVERSAL_AGENTS.filter((a) => a.id !== 'universal');
  const previewUniversal = displayUniversal.slice(0, 13);
  const remainingCount = displayUniversal.length - previewUniversal.length;

  for (const agent of previewUniversal) {
    log(`  ${pc.dim('•')} ${pc.white(agent.displayName)}`);
  }
  if (remainingCount > 0) {
    log(`  ${pc.dim(`...and ${remainingCount} more`)}`);
  }
  log('');
}
