import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export interface RuntimeLaunch { command: string; args: string[] }
export interface RuntimeEnvironment {
  executable: string;
  pnpLoader?: string;
  exists(file: string): boolean;
}
export function currentRuntimeEnvironment(): RuntimeEnvironment {
  const executable = process.execPath;
  if (!process.versions.pnp) return { executable, exists: existsSync };
  const pnpLoader = createRequire(import.meta.url).resolve('pnpapi');
  return { executable, pnpLoader, exists: existsSync };
}
/** Preserve Yarn's dependency loaders when Git or an IDE starts Node outside Yarn. */
export function runtimeLaunch(cliPath: string, environment: RuntimeEnvironment = currentRuntimeEnvironment()): RuntimeLaunch {
  const args: string[] = [];
  if (environment.pnpLoader) {
    args.push('--require', environment.pnpLoader);
    const esmLoader = path.join(path.dirname(environment.pnpLoader), '.pnp.loader.mjs');
    if (environment.exists(esmLoader)) args.push('--experimental-loader', pathToFileURL(esmLoader).href);
  }
  return { command: environment.executable, args: [...args, cliPath] };
}
