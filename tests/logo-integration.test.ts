import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { viewerPage } from '../src/ui/page.js';
import { viewerStyles } from '../src/ui/styles.js';
import { startUi } from '../src/ui/server.js';
import { repositoryFixture } from './helpers.js';

test('production assets are in durable assets/ directory with correct formats and palette', async () => {
  const assetsDir = path.resolve('assets');
  const requiredAssets = [
    'testweave-horizontal-color.svg',
    'testweave-horizontal-dark.svg',
    'testweave-symbol.svg',
    'testweave-symbol-small.svg',
    'testweave-symbol-on-dark.svg',
    'favicon.svg',
    'favicon.ico',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'maskable-512.png',
    'site.webmanifest',
  ];

  for (const file of requiredAssets) {
    const info = await stat(path.join(assetsDir, file));
    assert.ok(info.size > 0, `${file} must not be empty`);
  }

  // Palette checks: #087F72 teal, #102C2A ink, #65DEC0 mint, #F5F7F2 paper
  const colorLogo = await readFile(path.join(assetsDir, 'testweave-horizontal-color.svg'), 'utf8');
  assert.match(colorLogo, /#087F72/i, 'Color logo must contain teal symbol');
  assert.match(colorLogo, /#102C2A/i, 'Color logo must contain ink wordmark');
  assert.doesNotMatch(colorLogo, /#65DEC0/i, 'Mint is not approved on light backgrounds');

  const darkLogo = await readFile(path.join(assetsDir, 'testweave-horizontal-dark.svg'), 'utf8');
  assert.match(darkLogo, /#65DEC0/i, 'Dark logo must contain mint symbol');
  assert.match(darkLogo, /#(?:FFFFFF|FFF)\b/i, 'Dark logo must contain white wordmark');

  const adaptiveFavicon = await readFile(path.join(assetsDir, 'favicon.svg'), 'utf8');
  assert.match(adaptiveFavicon, /#087F72/i, 'Favicon uses teal for default');
  assert.match(adaptiveFavicon, /prefers-color-scheme:\s*dark/i, 'Favicon supports dark scheme');
  assert.match(adaptiveFavicon, /#65DEC0/i, 'Favicon uses mint for dark scheme');

  const manifest = JSON.parse(await readFile(path.join(assetsDir, 'site.webmanifest'), 'utf8')) as {
    name: string;
    theme_color: string;
    icons: { src: string }[];
  };
  assert.equal(manifest.name, 'TestWeave');
  assert.equal(manifest.theme_color, '#102C2A');
  assert.ok(manifest.icons.some((i) => i.src === '/icon-192.png'));
  assert.ok(manifest.icons.some((i) => i.src === '/icon-512.png'));
});

test('README.md references durable logo assets with light/dark GitHub support and alt text', async () => {
  const readme = await readFile(path.resolve('README.md'), 'utf8');
  assert.match(readme, /<picture>/, 'README uses HTML picture element for GitHub light/dark support');
  assert.match(readme, /media="\(prefers-color-scheme:\s*dark\)"[^>]*srcset="assets\/testweave-horizontal-dark\.svg"/);
  assert.match(readme, /src="assets\/testweave-horizontal-color\.svg"/);
  assert.match(readme, /alt="TestWeave - Keep manual QA scenarios in step with your code"/);
});

test('local viewer integrates Woven W mark, responsive horizontal logo and favicon links', () => {
  // Favicon and manifest in head
  assert.match(viewerPage, /<link rel="icon" href="\/favicon\.ico" sizes="48x48">/);
  assert.match(viewerPage, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(viewerPage, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  assert.match(viewerPage, /<link rel="manifest" href="\/site\.webmanifest">/);
  assert.match(viewerPage, /<meta name="theme-color" content="#102C2A">/);

  // Woven W small-cut symbol on dark ink shortcut rail
  assert.match(viewerPage, /class="rail-brand" href="#main" aria-label="TestWeave workspace"/);
  assert.match(viewerPage, /<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">/);
  assert.match(viewerPage, /M16 56H56L88 144L128 56H160L104 200H72Z M156 120L170 144L202 56H240L184 200H152L136 172Z/);

  // Horizontal logo on light header with accessible text
  assert.match(viewerPage, /<div class="brand"><img src="\/assets\/testweave-horizontal-color\.svg" alt="TestWeave" class="brand-logo" width="121" height="28"><\/div>/);

  // Styles: dark rail uses ink background and mint color; logo is responsive
  assert.match(viewerStyles, /\.icon-rail \.rail-brand\{[^}]*background:#102C2A/);
  assert.match(viewerStyles, /\.icon-rail \.rail-brand\{[^}]*color:#65DEC0/);
  assert.match(viewerStyles, /\.brand-logo\{height:28px/);
  assert.match(viewerStyles, /\.workspace-header \.brand-logo\{height:24px/);
});

test('package.json includes durable assets in npm tarball files list', async () => {
  const pkg = JSON.parse(await readFile(path.resolve('package.json'), 'utf8')) as { files: string[] };
  assert.ok(pkg.files.includes('assets'), 'package.json files field must include assets');
});

test('viewer server safely serves allowlisted logo, favicon and manifest assets', async (t) => {
  const { context } = await repositoryFixture(t);
  const viewer = await startUi(context);
  t.after(() => viewer.close());

  // Allowlisted files
  const assetsToTest = [
    { path: '/favicon.ico', type: 'image/x-icon' },
    { path: '/favicon.svg', type: 'image/svg+xml' },
    { path: '/apple-touch-icon.png', type: 'image/png' },
    { path: '/icon-192.png', type: 'image/png' },
    { path: '/icon-512.png', type: 'image/png' },
    { path: '/maskable-512.png', type: 'image/png' },
    { path: '/site.webmanifest', type: 'application/manifest+json' },
    { path: '/assets/testweave-horizontal-color.svg', type: 'image/svg+xml' },
    { path: '/assets/testweave-horizontal-dark.svg', type: 'image/svg+xml' },
    { path: '/assets/testweave-symbol-small.svg', type: 'image/svg+xml' },
  ];

  for (const asset of assetsToTest) {
    const res = await fetch(viewer.url + asset.path);
    assert.equal(res.status, 200, `Asset ${asset.path} must return 200`);
    assert.match(res.headers.get('content-type')!, new RegExp(asset.type.replace('+', '\\+')));
    assert.ok(Number(res.headers.get('content-length') ?? '1') > 0);
  }

  // CSP header checks
  const rootRes = await fetch(viewer.url + '/');
  const csp = rootRes.headers.get('content-security-policy') ?? '';
  assert.match(csp, /img-src 'self' data:/, 'CSP allows self and data images');
  assert.match(csp, /manifest-src 'self'/, 'CSP allows self manifest');

  // Boundary checks: unallowlisted paths return 404
  const unallowlisted = await fetch(viewer.url + '/assets/other-file.txt');
  assert.equal(unallowlisted.status, 404);

  // Path traversal attempt returns 400 or 404
  const traversal = await fetch(viewer.url + '/assets/../package.json');
  assert.ok([400, 404].includes(traversal.status));

  // Query parameter pollution returns 400
  const polluted = await fetch(viewer.url + '/assets/testweave-horizontal-color.svg?injection=true');
  assert.equal(polluted.status, 400);
});
