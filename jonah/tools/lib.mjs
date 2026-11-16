// Shared by the test tools: a headless Chromium on this machine's GPU, pointed at the dev server or at dist/.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const here = resolve(fileURLToPath(import.meta.url), '..', '..');
export const SIZES = {
  desktop: { width: 1440, height: 900, touch: false, dpr: 1 },
  phone: { width: 390, height: 844, touch: true, dpr: 2 },
  phoneWide: { width: 844, height: 390, touch: true, dpr: 2 },
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' };

/** Serves dist/ (the built game) on a free port. */
export async function serveDist() {
  const root = resolve(here, 'dist');
  if (!existsSync(join(root, 'index.html'))) throw new Error('dist/ is not built: run npm run build');
  const server = createServer((req, res) => {
    let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

/** The address to test: --dist serves the build; otherwise the dev server (npm run dev) on 5390. */
export async function target(args) {
  if (args.includes('--dist')) return serveDist();
  return { url: `http://127.0.0.1:${process.env.JONAH_PORT || 5390}/`, close() {} };
}

export async function launch({ vsync = true } = {}) {
  const args = ['--mute-audio', '--ignore-gpu-blocklist', `--use-angle=${process.platform === 'darwin' ? 'metal' : 'd3d11'}`, '--enable-gpu', '--autoplay-policy=no-user-gesture-required'];
  if (!vsync) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit');
  return chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true, args });
}

/** Opens a page at a size, collecting console errors and warnings. */
export async function open(browser, url, size = SIZES.desktop) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, hasTouch: size.touch, isMobile: size.touch });
  const page = await context.newPage();
  const errors = [];
  const logs = [];
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error') errors.push(text);
    else if (m.type() === 'warning' && !/GPU stall|GL Driver Message/.test(text)) logs.push(`warn: ${text}`);
    else if (text.startsWith('[bot]') || text.startsWith('pass ') || text.startsWith('fail ')) logs.push(text);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  // (a request cut off by the dev server reloading the page after an edit is not a fault of the game)
  page.on('requestfailed', (r) => {
    if (r.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`request failed: ${r.url()} ${r.failure()?.errorText ?? ''}`);
  });
  await page.goto(url, { waitUntil: 'load' });
  return { page, context, errors, logs };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
