// The camp in the valley of Lemuel, with the clock stepped by hand: that each of the family is about his own day
// (they move, with no one near), and that Nephi can speak to any of them (E when he is by one), who answers something
// else each time and then goes on with what he was about. Needs a build (npm run build).
//   node tools/life-check.mjs [--out shots/life-check] [--size 1280x720]
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const out = resolve(here, flag('out', 'shots/life-check'));
const [width, height] = flag('size', '1280x720').split('x').map(Number);
mkdirSync(out, { recursive: true });

const root = resolve(here, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!file.startsWith(root) || !existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({
  executablePath: process.env.CHROME,
  headless: true,
  args: ['--mute-audio', '--ignore-gpu-blocklist', `--use-angle=${process.platform === 'darwin' ? 'metal' : 'd3d11'}`, '--enable-gpu'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
const problems = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`${m.type()}: ${m.text().slice(0, 600)}`));
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}\n${e.stack ?? ''}`));
await page.goto(`http://127.0.0.1:${server.address().port}/?step&nosound&dpr=1&quality=low&beat=a1`);
await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
await page.addStyleTag({ content: '#start { display: none !important; }' });

let failed = 0;
const check = (what, ok, seen = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${ok ? '' : `  ${JSON.stringify(seen)}`}`);
};
/** Steps the game `seconds` on, and says what is on the screen then. */
const step = (seconds, act = '') =>
  page.evaluate(
    async ([seconds, act]) => {
      const tg = window.__tg;
      // eslint-disable-next-line no-new-func
      if (act) new Function('tg', act)(tg);
      for (let i = 0; i < Math.round(seconds * 30); i++) {
        tg.tick(1 / 30);
        await new Promise((r) => setTimeout(r, 0));
      }
      const text = (id) => (document.querySelector(`#${id}.on`) ? document.querySelector(`#${id}`).textContent.trim() : '');
      const people = {};
      for (const name of ['lehi', 'sariah', 'laman', 'lemuel', 'sam']) {
        const n = tg.cast.get(name);
        people[name] = { x: n.x, z: n.z, mode: n.mode, sit: n.sit, kneel: n.kneel, speed: n.speed, state: tg.g.life?.state(n), path: n.path.length };
      }
      return { prompt: text('g-prompt'), toast: text('g-toast'), people, frozen: tg.director.frozen, beat: tg.director.beat };
    },
    [seconds, act],
  );
/**
 * Stands Nephi `back` metres from one of them, turned to him: on the side he faces, or (`from`) on the side away
 * from another who is by him, so that it is he who is the nearer.
 */
const standBy = (name, from = null, back = 1.9) =>
  `const n = tg.cast.get('${name}'); const o = ${from ? `tg.cast.get('${from}')` : 'null'};
   const a = o ? Math.atan2(n.x - o.x, n.z - o.z) : n.yaw;
   const x = n.x + Math.sin(a) * ${back}; const z = n.z + Math.cos(a) * ${back}; tg.standAt(x, z, Math.atan2(n.x - x, n.z - z));`;
const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });

// the chapter's card, and the camp left to itself for a while
const first = await step(8);
const later = await step(30);
const moved = Object.keys(first.people).filter((k) => Math.hypot(later.people[k].x - first.people[k].x, later.people[k].z - first.people[k].z) > 2);
check('left to themselves, they go about the camp (three of them at least have gone somewhere in half a minute)', moved.length >= 3, moved);
check('and no prompt is up while no one is near', !later.prompt, later.prompt);
await shot('01-camp');

// each of those who have something to answer: the prompt by him, and a new thing each time he is spoken to
for (const [name, as, lines, from] of [
  ['sariah', 'your mother', ['asking for you', 'river runs clear']],
  ['sam', 'Sam', ['I believe', 'the Lord answered you']],
  ['laman', 'Laman', ['All left behind', 'visionary man'], 'lemuel'],
  ['lemuel', 'Lemuel', ['great city', 'Now we have tents'], 'laman'],
]) {
  // (what the last one said is off the screen first)
  for (let i = 0; i < 40 && (await step(0.5)).toast; i++);
  const by = await step(0.4, standBy(name, from));
  // (what he says of himself as Nephi comes near may be said already: then the prompt waits for it to be said)
  let now = by;
  const heard = [];
  if (now.toast) heard.push(now.toast);
  for (let i = 0; i < 40 && !now.prompt; i++) now = await step(0.5);
  check(`by ${name}, the prompt is to speak with ${as}`, now.prompt.includes(`Speak with ${as}`), now.prompt);
  for (let k = 0; k < 3 && heard.length < 3; k++) {
    const spoken = await step(0.3, 'tg.director.press()');
    heard.push(spoken.toast);
    if (k === 0) await shot(`02-${name}`);
    check(`  spoken to, ${name} is not walking on`, spoken.people[name].speed < 0.3, spoken.people[name]);
    now = spoken;
    for (let i = 0; i < 40 && !now.prompt; i++) now = await step(0.5);
  }
  check(`  ${name} says both things, and then the first again`, lines.every((l) => heard.some((h) => h.includes(l))) && heard[2] === heard[0], heard);
}

// left alone again, the one last spoken to goes back to his day
const back = await step(1, 'tg.standAt(...tg.g.P(0, 0), 0)');
// (each goes round his day, and may be back where he began by the end of it: how far he got at any time is what counts)
const far = {};
let after = back;
for (let i = 0; i < 8; i++) {
  after = await step(5);
  for (const k of ['sariah', 'sam', 'laman', 'lemuel']) far[k] = Math.max(far[k] ?? 0, Math.hypot(after.people[k].x - back.people[k].x, after.people[k].z - back.people[k].z));
}
const went = Object.keys(far).filter((k) => far[k] > 2);
check('left alone again, they go back to what they were about', went.length >= 3, [went, back.people, after.people]);
check('the story still waits on his father', after.beat === 'a1' && !after.frozen, after);

check('nothing went wrong on the page', problems.length === 0, problems);
await browser.close();
server.close();
console.log(failed ? `${failed} failed` : 'all as it should be');
process.exit(failed ? 1 : 0);
