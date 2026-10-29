import { createServer, type ServerResponse } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { simpleGit } from 'simple-git';
import type { CliContext } from '../cli/context.js';
import { diagnose, errorMessage } from '../engine/doctor.js';
import { compileContract } from '../engine/includes.js';
import { loadContractDiff } from '../cli/diff.js';
import { workspacePath } from '../engine/files.js';
import { listFiles } from '../engine/scan.js';
import { specFile, specPointers } from '../engine/specs.js';
import { impact } from '../engine/queries.js';
import { sourcePatternSchema } from '../schema/test-truth.js';
import { contractGraph } from '../integrations/graph.js';
import { exportOptionsSchema, generateExport } from '../integrations/exporters.js';
import { viewerPage } from './page.js';

export interface UiOptions { port?: number; pollIntervalMs?: number }

const STATIC_ASSETS: Record<string, { file: string; type: string }> = {
  '/favicon.ico': { file: 'favicon.ico', type: 'image/x-icon' },
  '/favicon.svg': { file: 'favicon.svg', type: 'image/svg+xml' },
  '/apple-touch-icon.png': { file: 'apple-touch-icon.png', type: 'image/png' },
  '/icon-192.png': { file: 'icon-192.png', type: 'image/png' },
  '/icon-512.png': { file: 'icon-512.png', type: 'image/png' },
  '/maskable-512.png': { file: 'maskable-512.png', type: 'image/png' },
  '/site.webmanifest': { file: 'site.webmanifest', type: 'application/manifest+json' },
  '/assets/testweave-horizontal-color.svg': { file: 'testweave-horizontal-color.svg', type: 'image/svg+xml' },
  '/assets/testweave-horizontal-dark.svg': { file: 'testweave-horizontal-dark.svg', type: 'image/svg+xml' },
  '/assets/testweave-symbol.svg': { file: 'testweave-symbol.svg', type: 'image/svg+xml' },
  '/assets/testweave-symbol-small.svg': { file: 'testweave-symbol-small.svg', type: 'image/svg+xml' },
  '/assets/testweave-symbol-on-dark.svg': { file: 'testweave-symbol-on-dark.svg', type: 'image/svg+xml' },
};

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function query(url: URL, allowed: string[], repeated: string[] = []): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (!allowed.includes(key) || (!repeated.includes(key) && key in result) || !value || value.length > 1000 || /[\r\n\0]/.test(value)) {
      throw new HttpError(400, 'Invalid query parameter');
    }
    result[key] = value;
  }
  return result;
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

export async function startUi(context: CliContext, options: UiOptions = {}) {
  const port = options.port ?? 0;
  const pollInterval = options.pollIntervalMs ?? 1000;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535');
  if (!Number.isInteger(pollInterval) || pollInterval < 10) throw new Error('Poll interval must be at least 10ms');
  const clients = new Set<ServerResponse>();
  const git = simpleGit({ baseDir: context.root, timeout: { block: 30_000 } });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let signature: string | undefined;
  let origin = '';
  let polling: Promise<void> | undefined;
  let initializing: Promise<string> | undefined;

  async function snapshot(): Promise<string> {
    const files = new Set(await listFiles(context.root));
    files.add('test-truth.md');
    try {
      const { contract } = await compileContract(await context.store.readMarkdown(), async (file) => {
        files.add(file);
        return readFile(await workspacePath(context.root, file), 'utf8');
      });
      for (const pointer of [...specPointers(contract), ...contract.modules.flatMap((module) => specPointers(contract, module))]) files.add(specFile(pointer));
    } catch { /* Invalid contracts still trigger reload when their files change. */ }
    const stamps = await Promise.all([...files].sort().map(async (file) => {
      try {
        const info = await stat(await workspacePath(context.root, file));
        return [file, info.size, info.mtimeMs, info.ctimeMs];
      } catch { return [file, 'missing']; }
    }));
    const status = await git.raw(['status', '--porcelain=v2', '--branch', '-z']).catch(() => 'non-git');
    return JSON.stringify([stamps, status]);
  }

  async function poll(): Promise<void> {
    try {
      const next = await snapshot();
      if (signature !== undefined && next !== signature) {
        for (const client of clients) client.write('event: reload\ndata: {}\n\n');
      }
      signature = next;
    } catch {
      for (const client of clients) client.write('event: reload\ndata: {"error":"Workspace polling failed"}\n\n');
    }
  }

  function schedule(): void {
    if (closed || !clients.size || timer || polling) return;
    timer = setTimeout(() => {
      timer = undefined;
      polling = poll().finally(() => { polling = undefined; schedule(); });
    }, pollInterval);
  }

  async function state() {
    const errors: { source: string; message: string }[] = [];
    async function attempt<T>(source: string, read: () => Promise<T>): Promise<T | null> {
      try { return await read(); }
      catch (error) { errors.push({ source, message: errorMessage(error) }); return null; }
    }
    const [contract, drift, diagnostics] = await Promise.all([
      attempt('contract', () => context.store.read()),
      attempt('drift', async () => {
        await context.git.root();
        const unborn = await context.git.resolve('HEAD').then(() => false, () => true);
        return context.analyzer.analyze(unborn ? { emptyBase: true } : { base: 'HEAD' });
      }),
      attempt('diagnostics', () => diagnose(context)),
    ]);
    const statuses = Object.fromEntries(drift?.issues.filter((issue) => issue.moduleId).map((issue) => [issue.moduleId!, issue.kind]) ?? []);
    const graph = contract ? contractGraph(contract, statuses) : null;
    const diff = contract ? await attempt('diff', () => loadContractDiff(context)) : null;
    return { contract, drift, diagnostics, graph, diff, errors };
  }

  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    void (async () => {
      if (request.headers.host !== new URL(origin).host ||
        (request.headers.origin !== undefined && request.headers.origin !== origin) ||
        (request.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(request.headers['sec-fetch-site'])))) {
        throw new HttpError(403, 'Only same-origin loopback requests are allowed');
      }
      if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        throw new HttpError(405, 'Viewer is read-only');
      }
      const raw = request.url ?? '';
      if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('#') || raw.includes('\\') || /%(?![a-fA-F0-9]{2})/.test(raw)) throw new HttpError(400, 'Malformed URL');
      let url: URL;
      try { decodeURI(raw); url = new URL(raw, origin); }
      catch { throw new HttpError(400, 'Malformed URL'); }
      if (url.origin !== origin) throw new HttpError(400, 'Malformed URL');
      if (url.pathname === '/') {
        query(url, []);
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(viewerPage);
      } else if (url.pathname in STATIC_ASSETS) {
        query(url, []);
        const asset = STATIC_ASSETS[url.pathname]!;
        const content = await readFile(new URL(`../../assets/${asset.file}`, import.meta.url));
        response.writeHead(200, { 'Content-Type': asset.type });
        response.end(content);
      } else if (url.pathname === '/api/state') {
        query(url, []);
        json(response, 200, await state());
      } else if (url.pathname === '/api/impact') {
        query(url, ['path'], ['path']);
        const paths = url.searchParams.getAll('path');
        if (!paths.length || paths.length > 100 || paths.some((file) => !sourcePatternSchema.safeParse(file).success)) throw new HttpError(400, 'Provide valid workspace-relative paths');
        json(response, 200, await impact(context.root, await context.store.read(), paths));
      } else if (url.pathname === '/api/export') {
        const input = query(url, ['target', 'format', 'module', 'tags', 'priority', 'projectKey']);
        if (!input.target || !['xray', 'zephyr', 'jira', 'testrail', 'qase', 'obsidian', 'checklist'].includes(input.target)) throw new HttpError(400, 'Invalid export target');
        const parsed = exportOptionsSchema.safeParse(input);
        if (!parsed.success) throw new HttpError(400, 'Invalid export options');
        if (['jira', 'xray', 'zephyr'].includes(input.target) && parsed.data.format === 'json' && !parsed.data.projectKey) throw new HttpError(400, 'Jira, Xray and Zephyr JSON require projectKey');
        const contract = await context.store.read();
        if (input.module && !contract.modules.some((module) => module.id === input.module)) throw new HttpError(400, 'Unknown module');
        if (input.tags && !input.tags.split(',').some((tag) => tag.trim())) throw new HttpError(400, 'Provide at least one tag');
        if (!['obsidian', 'checklist'].includes(input.target) && !['csv', 'json'].includes(parsed.data.format)) throw new HttpError(400, 'QA suite exports require csv or json');
        const artifact = generateExport(contract, parsed.data);
        response.writeHead(200, { 'Content-Type': artifact.mimeType + '; charset=utf-8',
          'Content-Disposition': `attachment; filename="${artifact.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"` });
        response.end(artifact.content);
      } else if (url.pathname === '/events') {
        query(url, []);
        if (!clients.size) {
          if (polling) await polling;
          else signature = await (initializing ??= snapshot().finally(() => { initializing = undefined; }));
        }
        if (closed || response.destroyed) return;
        response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        response.write('event: ready\ndata: {}\n\n');
        clients.add(response);
        schedule();
        response.on('close', () => {
          clients.delete(response);
          if (!clients.size) { clearTimeout(timer); timer = undefined; }
        });
      } else throw new HttpError(404, 'Not found');
    })().catch((error: unknown) => {
      if (!response.headersSent && !response.destroyed) json(response, error instanceof HttpError ? error.status : 500,
        { error: error instanceof HttpError ? error.message : 'Unable to read workspace' });
      else response.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine viewer address');
  origin = new URL(`http://127.0.0.1:${address.port}`).origin;
  let closing: Promise<void> | undefined;
  function close(): Promise<void> {
    return closing ??= new Promise<void>((resolve, reject) => {
      closed = true;
      clearTimeout(timer);
      for (const client of clients) client.end();
      clients.clear();
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    }).then(async () => { await Promise.allSettled([polling, initializing]); });
  }
  return { server, url: origin, close };
}
