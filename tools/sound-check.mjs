// Checks that a journey opened by its own address is heard, headless, against dist/. A browser lets sound start only
// from a touch or a click, and such a journey begins with neither: so where the sound is held back, the journey's
// name is shown with a button to begin it, and the press starts the sound; where it is not, the journey just begins.
//
//   npm run build && CHROME=... node tools/sound-check.mjs
//
// Nothing is asked of the page through Playwright's own evaluate, which counts as a touch and would let the sound
// start: it is asked over CDP, without one. And the page runs in its own time (no ?step), as it does for a visitor.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const root = resolve(here, 'dist');
const types = { '.webp': 'image/webp', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

let failed = 0;
const check = (name, ok, got = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${ok || got === '' ? '' : `  (got ${JSON.stringify(got)})`}`);
};
const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** Opens `path` as a phone does, the browser letting sound start as `policy` says; `then` is given the page. */
async function visit(policy, path, then) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME,
    headless: true,
    args: ['--mute-audio', `--autoplay-policy=${policy}`, '--ignore-gpu-blocklist', `--use-angle=${process.platform === 'darwin' ? 'metal' : 'd3d11'}`, '--enable-gpu'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    const cdp = await context.newCDPSession(page);
    const ask = async (expression) => (await cdp.send('Runtime.evaluate', { expression, userGesture: false, returnByValue: true })).result.value;
    const seen = () =>
      ask(`({
        sound: window.__tg?.sounds.context?.state,
        begin: !!document.querySelector('#g-begin.on'),
        says: document.querySelector('#g-begin.on')?.innerText.replace(/\\s*\\n+\\s*/g, ' | ') ?? '',
        list: !!document.querySelector('#g-title.on'),
        beat: window.__tg?.director.beat ?? null,
        card: document.querySelector('#g-card.on .cite')?.textContent ?? '',
      })`);
    /** Waits (in the page's own time) until `test` of what is seen holds; gives what was last seen. */
    const until = async (test, seconds = 30) => {
      let s = await seen();
      for (const t0 = Date.now(); !test(s) && Date.now() - t0 < seconds * 1000; s = await seen()) await sleep(0.25);
      return s;
    };
    await page.goto(`${base}${path}?dpr=1&quality=low`, { waitUntil: 'commit' });
    for (let i = 0; i < 400 && !(await ask('!!window.__tg?.ready')); i++) await sleep(0.3);
    await then({ page, seen, until });
    check('no errors on the page', problems.length === 0, problems);
  } finally {
    await browser.close();
  }
}

console.log('the browser holding sound back until a touch (as a phone does):');
await visit('document-user-activation-required', 'but-if-not/', async ({ page, until }) => {
  let s = await until((x) => x.begin, 10);
  check("a journey opened by its own address shows its name and a button to begin", s.begin && s.says === 'DANIEL 3 | But If Not | Begin', s);
  check('not the list, and the journey not yet begun under it', !s.list && !s.beat && !s.card, s);
  check('the sound waiting', s.sound === 'suspended', s.sound);
  await (await page.$('#g-begin.on button')).tap();
  s = await until((x) => x.sound === 'running' && !x.begin, 5);
  check('the press starts the sound', s.sound === 'running' && !s.begin, s);
  s = await until((x) => !!x.card);
  check('and the journey, whose first card comes up with the sound running to read it', s.beat === 'a1' && s.card === 'Daniel 3:1' && s.sound === 'running', s);
});

console.log('the browser letting sound start by itself:');
await visit('no-user-gesture-required', 'but-if-not/', async ({ until }) => {
  const s = await until((x) => !!x.card);
  check('the journey just begins, with no button to press first', !s.begin && !s.list && s.beat === 'a1' && s.sound === 'running', s);
});

server.close();
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
