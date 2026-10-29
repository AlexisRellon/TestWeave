import test from 'node:test';
import assert from 'node:assert/strict';
import { request, Server } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { simpleGit } from 'simple-git';
import { startUi } from '../src/ui/server.js';
import { runUi } from '../src/cli/ui.js';
import { createContext } from '../src/cli/context.js';
import { contractFixture, repositoryFixture, temporaryDirectory } from './helpers.js';
import { serializeTestTruth } from '../src/engine/markdown.js';
import { generateExport } from '../src/integrations/exporters.js';
import type { TestTruth } from '../src/schema/test-truth.js';
import type { DriftReport } from '../src/engine/drift.js';
import type { Diagnostic } from '../src/engine/doctor.js';
import type { ContractGraph } from '../src/integrations/graph.js';
import type { ContractDiffReport } from '../src/engine/diff.js';
import type { impact } from '../src/engine/queries.js';

interface ViewerState {
  contract: TestTruth | null; drift: DriftReport | null; diagnostics: Diagnostic[] | null;
  graph: ContractGraph | null; diff: ContractDiffReport | null; errors: { source: string; message: string }[];
}

test('viewer binds loopback and exposes read-only state, impact and filtered downloads', async (t) => {
  const nodeEnv = process.env.NODE_ENV;
  delete process.env.NODE_ENV;
  t.after(() => { if (nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = nodeEnv; });
  const { context, root } = await repositoryFixture(t);
  const original = await readFile(path.join(root, 'test-truth.md'), 'utf8');
  const viewer = await startUi(context);
  t.after(() => viewer.close());
  assert.equal((viewer.server.address() as { address: string }).address, '127.0.0.1');
  const page = await fetch(viewer.url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type')!, /text\/html/);
  assert.doesNotMatch(page.headers.get('content-security-policy')!, /:8400/);
  assert.match(page.headers.get('content-security-policy')!, /script-src 'unsafe-inline';.*connect-src 'self';/);
  assert.match(await page.text(), /TestWeave/i);
  const stateResponse = await fetch(viewer.url + '/api/state');
  assert.equal(stateResponse.status, 200);
  const state = await stateResponse.json() as ViewerState;
  assert.deepEqual(Object.keys(state).sort(), ['contract', 'diagnostics', 'diff', 'drift', 'errors', 'graph']);
  assert.ok(state.contract && state.drift && state.diff && state.diagnostics && state.graph);
  assert.equal(state.contract.modules[0]!.id, 'auth');
  assert.deepEqual(state.drift.changedFiles, []);
  assert.equal(state.diff.changes.length, 0);
  assert.ok(state.diagnostics.some((check: { id: string }) => check.id === 'contract'));
  assert.ok(state.graph.nodes.some((node: { id: string }) => node.id === 'test:AUTH-001'));
  const preview = await (await fetch(viewer.url + '/api/impact?path=src/auth/new.ts')).json() as Awaited<ReturnType<typeof impact>>;
  assert.equal(preview.modules[0]!.tests[0]!.id, 'AUTH-001');
  for (const target of ['xray', 'zephyr', 'jira', 'testrail', 'qase', 'obsidian', 'checklist'] as const) {
    const response = await fetch(viewer.url + `/api/export?target=${target}&format=json&module=auth&tags=smoke&priority=high&projectKey=QA`);
    assert.equal(response.status, 200, target);
    const expected = generateExport(await context.store.read(), { target, format: 'json', module: 'auth', tags: 'smoke', priority: 'high', projectKey: 'QA' });
    assert.equal(await response.text(), expected.content);
    assert.equal(response.headers.get('content-disposition'), `attachment; filename="${expected.filename}"`);
  }
  const empty = await (await fetch(viewer.url + '/api/export?target=qase&format=json&priority=low')).json() as { cases: unknown[] };
  assert.deepEqual(empty.cases, []);
  assert.equal(await readFile(path.join(root, 'test-truth.md'), 'utf8'), original);
});

test('viewer serves approved logo, favicon and app manifest assets from fixed allowlist', async (t) => {
  const { context } = await repositoryFixture(t);
  const viewer = await startUi(context);
  t.after(() => viewer.close());

  const faviconSvg = await fetch(viewer.url + '/favicon.svg');
  assert.equal(faviconSvg.status, 200);
  assert.match(faviconSvg.headers.get('content-type')!, /image\/svg\+xml/);
  const faviconSvgBody = await faviconSvg.text();
  assert.ok(faviconSvgBody.includes('#087F72'));
  assert.ok(faviconSvgBody.includes('#65DEC0'));

  const faviconIco = await fetch(viewer.url + '/favicon.ico');
  assert.equal(faviconIco.status, 200);
  assert.match(faviconIco.headers.get('content-type')!, /image\/x-icon/);

  const appleTouch = await fetch(viewer.url + '/apple-touch-icon.png');
  assert.equal(appleTouch.status, 200);
  assert.match(appleTouch.headers.get('content-type')!, /image\/png/);

  const manifest = await fetch(viewer.url + '/site.webmanifest');
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type')!, /application\/manifest\+json/);
  const manifestData = await manifest.json() as { name: string; theme_color: string };
  assert.equal(manifestData.name, 'TestWeave');
  assert.equal(manifestData.theme_color, '#102C2A');

  const logoColor = await fetch(viewer.url + '/assets/testweave-horizontal-color.svg');
  assert.equal(logoColor.status, 200);
  assert.match(logoColor.headers.get('content-type')!, /image\/svg\+xml/);
  const logoColorBody = await logoColor.text();
  assert.ok(logoColorBody.includes('#087F72'));
  assert.ok(logoColorBody.includes('#102C2A'));

  const logoDark = await fetch(viewer.url + '/assets/testweave-horizontal-dark.svg');
  assert.equal(logoDark.status, 200);
  assert.match(logoDark.headers.get('content-type')!, /image\/svg\+xml/);
  const logoDarkBody = await logoDark.text();
  assert.ok(logoDarkBody.includes('#65DEC0'));

  const symbolSmall = await fetch(viewer.url + '/assets/testweave-symbol-small.svg');
  assert.equal(symbolSmall.status, 200);
  assert.match(symbolSmall.headers.get('content-type')!, /image\/svg\+xml/);

  // Rejects unallowlisted paths, invalid query params, and cross-origin access
  assert.equal((await fetch(viewer.url + '/assets/unknown.svg')).status, 404);
  assert.equal((await fetch(viewer.url + '/assets/testweave-horizontal-color.svg?unexpected=1')).status, 400);
  assert.equal((await rawRequest(viewer.url, '/assets/testweave-horizontal-color.svg', { Host: 'evil.example' })).status, 403);
  assert.equal((await rawRequest(viewer.url, '/assets/testweave-horizontal-color.svg', { Origin: 'https://evil.example' })).status, 403);
});

function rawRequest(url: string, pathname: string, headers: Record<string, string> = {}, method = 'GET') {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const base = new URL(url);
    const req = request({ hostname: base.hostname, port: base.port, path: pathname, headers, method }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode!, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('viewer accepts canonical same-origin requests when listening on HTTP port 80', async (t) => {
  const { context } = await repositoryFixture(t);
  const address = Server.prototype.address;
  t.mock.method(Server.prototype, 'address', function (this: Server) {
    const actual = address.call(this);
    return actual && typeof actual !== 'string' ? { ...actual, port: 80 } : actual;
  });
  const viewer = await startUi(context);
  t.after(() => viewer.close());
  // Advertise port 80 while requests use an ephemeral socket without privileged binding.
  const actual = address.call(viewer.server) as { port: number };
  const transport = `http://127.0.0.1:${actual.port}`;
  assert.equal((await rawRequest(transport, '/', { Host: '127.0.0.1' })).status, 200);
  assert.equal((await rawRequest(transport, '/api/state', { Host: '127.0.0.1', Origin: 'http://127.0.0.1' })).status, 200);
  assert.equal((await rawRequest(transport, '/', { Host: '127.0.0.1', Origin: 'https://evil.example' })).status, 403);
  assert.equal((await rawRequest(transport, '/', { Host: 'evil.example' })).status, 403);
  assert.equal(viewer.url, 'http://127.0.0.1');
});

test('viewer rejects cross-origin access, writes, malformed URLs and invalid input', async (t) => {
  const { context } = await repositoryFixture(t);
  const viewer = await startUi(context);
  t.after(() => viewer.close());
  assert.equal((await rawRequest(viewer.url, '/api/state', { Host: 'evil.example' })).status, 403);
  for (const origin of ['https://evil.example', 'null', 'http://localhost:1234']) {
    assert.equal((await rawRequest(viewer.url, '/api/state', { Origin: origin })).status, 403);
  }
  assert.equal((await rawRequest(viewer.url, '/api/state', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await rawRequest(viewer.url, '/api/state', { Origin: viewer.url })).status, 200);
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) assert.equal((await rawRequest(viewer.url, '/api/state', {}, method)).status, 405);
  for (const route of ['/%', '/%FF', '//evil.example/api/state', 'http://evil.example/api/state',
    '/api/state?unknown=x', '/api/impact', '/api/impact?path=../secret', '/api/impact?path=C%3Asecret',
    '/api/export', '/api/export?target=unknown', '/api/export?target=qase&target=xray', '/api/export?target=qase&format=dot',
    '/api/export?target=jira&format=json', '/api/export?target=jira&projectKey=invalid',
    '/api/export?target=qase&priority=urgent', '/api/export?target=qase&module=missing', '/api/export?target=qase&tags=%2C',
    '/api/export?target=qase&module=auth%0D%0AInjected', '/api/export?target=qase&changedSince=HEAD']) {
    assert.equal((await rawRequest(viewer.url, route)).status, 400, route);
  }
  assert.equal((await rawRequest(viewer.url, '/test-truth.md')).status, 404);
  assert.equal((await rawRequest(viewer.url, '/.git/config')).status, 404);
  await assert.rejects(startUi(context, { port: -1 }), /Port/);
  await assert.rejects(startUi(context, { port: 1.2 }), /Port/);
  await assert.rejects(runUi(context, { port: '' }), /Port/);
});

test('viewer keeps catalog available outside Git and reports malformed contracts without crashing', async (t) => {
  const root = await temporaryDirectory(t);
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contractFixture()));
  const context = await createContext(root);
  const viewer = await startUi(context);
  t.after(() => viewer.close());
  const state = await (await fetch(viewer.url + '/api/state')).json() as ViewerState;
  assert.equal(state.contract?.modules[0]!.id, 'auth');
  assert.ok(state.errors.some((error: { source: string }) => error.source === 'drift'));
  assert.equal((await fetch(viewer.url + '/api/export?target=checklist')).status, 200);
  await writeFile(path.join(root, 'test-truth.md'), 'malformed contract');
  const broken = await (await fetch(viewer.url + '/api/state')).json() as ViewerState;
  assert.equal(broken.contract, null);
  assert.ok(broken.errors.some((error: { source: string }) => error.source === 'contract'));
  assert.equal((await fetch(viewer.url + '/api/export?target=qase')).status, 500);
  assert.equal((await fetch(viewer.url)).status, 200);
});

test('viewer supports staged and untracked paths before the first Git commit', async (t) => {
  const root = await temporaryDirectory(t);
  const git = simpleGit(root);
  await git.init();
  await mkdir(path.join(root, 'src/auth'), { recursive: true });
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contractFixture()));
  await writeFile(path.join(root, 'src/auth/staged.ts'), 'export const staged = 1;');
  await git.add(['test-truth.md', 'src/auth/staged.ts']);
  await writeFile(path.join(root, 'src/auth/untracked.ts'), 'export const untracked = 1;');
  const viewer = await startUi(await createContext(root));
  t.after(() => viewer.close());
  const state = await (await fetch(viewer.url + '/api/state')).json() as ViewerState;
  assert.deepEqual(state.errors, []);
  assert.ok(state.drift && state.diff);
  assert.ok(state.drift.changedFiles.includes('src/auth/staged.ts'));
  assert.ok(state.drift.changedFiles.includes('src/auth/untracked.ts'));
  assert.ok(state.diff.changes.some((change) => change.kind === 'added' && change.testId === 'AUTH-001'));
});

test('SSE notices tracked, untracked, ignored included-contract and Git changes, and closes active streams', async (t) => {
  const { root, context, git } = await repositoryFixture(t);
  const contract = contractFixture();
  contract.includes = ['ignored/test-truth.md'];
  await mkdir(path.join(root, 'ignored'));
  await writeFile(path.join(root, '.gitignore'), 'ignored/\n');
  const included = { ...contractFixture(), modules: [] };
  await writeFile(path.join(root, 'ignored/test-truth.md'), serializeTestTruth(included));
  await writeFile(path.join(root, 'test-truth.md'), serializeTestTruth(contract));
  const viewer = await startUi(context, { pollIntervalMs: 25 });
  t.after(() => viewer.close());
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(viewer.url + '/events', { signal: controller.signal });
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  async function event(name: string) {
    const deadline = setTimeout(() => controller.abort(), 5000);
    try {
      let content = '';
      while (!content.includes(`event: ${name}\n`)) {
        const chunk = await reader.read();
        assert.equal(chunk.done, false, `stream ended before ${name}`);
        content += decoder.decode(chunk.value);
      }
    } finally { clearTimeout(deadline); }
  }
  await event('ready');
  await writeFile(path.join(root, 'src/auth/login.ts'), 'export const login = 2;\n');
  await event('reload');
  await writeFile(path.join(root, 'new-untracked.ts'), 'new file');
  await event('reload');
  await writeFile(path.join(root, 'new-untracked.ts'), 'changed untracked file');
  await event('reload');
  await writeFile(path.join(root, 'ignored/test-truth.md'), serializeTestTruth(included) + '\nChanged prose\n');
  await event('reload');
  await git.checkoutLocalBranch('viewer-test');
  await event('reload');
  await git.add('src/auth/login.ts');
  await event('reload');
  await viewer.close();
  assert.equal(viewer.server.listening, false);
  await viewer.close();
});

test('runUi logs the URL, stays active and removes signal handlers on shutdown', async (t) => {
  const { context, output } = await repositoryFixture(t);
  const beforeInt = process.listenerCount('SIGINT'), beforeTerm = process.listenerCount('SIGTERM');
  let logged!: () => void;
  const ready = new Promise<void>((resolve) => { logged = resolve; });
  const running = runUi({ ...context, output: { ...context.output, log(message) { output.push(message); logged(); } } });
  await ready;
  assert.match(output[0]!, /http:\/\/127\.0\.0\.1:\d+/);
  // runUi attaches handlers immediately after logging, before this microtask resumes.
  assert.equal(process.listenerCount('SIGINT'), beforeInt + 1);
  assert.equal(process.listenerCount('SIGTERM'), beforeTerm + 1);
  process.emit('SIGINT');
  await running;
  assert.equal(process.listenerCount('SIGINT'), beforeInt);
  assert.equal(process.listenerCount('SIGTERM'), beforeTerm);
});

test('closing viewer waits for its in-flight poll and prevents another polling loop', async (t) => {
  const { context } = await repositoryFixture(t);
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const polling = new Promise<void>((resolve) => { entered = resolve; });
  let pause = false, reads = 0;
  const original = context.store.readMarkdown.bind(context.store);
  context.store.readMarkdown = async () => {
    reads++;
    if (pause) { entered(); await gate; }
    return original();
  };
  const viewer = await startUi(context, { pollIntervalMs: 10 });
  t.after(async () => { release(); await viewer.close(); });
  const response = await fetch(viewer.url + '/events');
  const reader = response.body!.getReader();
  await reader.read();
  pause = true;
  await polling;
  let finished = false;
  const closing = viewer.close().then(() => { finished = true; });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(finished, false, 'close must await pending workspace reads');
  release();
  await closing;
  assert.equal(reads, 2, 'only the initial snapshot and one poll ran');
  assert.equal(viewer.server.listening, false);
});
