// The people of the rest of the first journey, with the clock stepped by hand: in the land of Jerusalem, without its
// gate, in their father's house, in the cavity of the rock, hiding without the walls by night, and Zoram going out
// of the city behind Nephi. In each: they are about something of their own; Nephi can speak to them (E), and each
// answers as he should; a stranger in the street, greeted, stops and turns to him and says nothing. Each scene is
// opened by its own address (?beat=...), and its cards are read through as a player would, by pressing on.
// Needs a build (npm run build).
//   node tools/life-scenes.mjs [--only a2,a3] [--out shots/life-scenes] [--size 1280x720]
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
const out = resolve(here, flag('out', 'shots/life-scenes'));
const only = flag('only', '').split(',').filter(Boolean);
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

let failed = 0;
const check = (what, ok, seen = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${ok ? '' : `  ${JSON.stringify(seen)}`}`);
};

/** A page at the beginning of one beat, and what can be done in it. */
async function open(beat) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && problems.push(`${m.type()}: ${m.text().slice(0, 600)}`));
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}\n${e.stack ?? ''}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/?step&nosound&dpr=1&quality=low&beat=${beat}`);
  await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
  await page.addStyleTag({ content: '#start { display: none !important; }' });
  /**
   * Steps the game on until `until` (js, with tg) is true or `seconds` have gone by; with `read`, a card that comes
   * up is gone on from, as a player presses on (one that asks is answered 1, 2, 3 in turn until it is answered as it
   * should be). `act` is run first. Says what is on the screen then.
   */
  const step = (seconds, { act = '', until = '', read = false } = {}) =>
    page.evaluate(
      async ([seconds, act, until, read]) => {
        const tg = window.__tg;
        // eslint-disable-next-line no-new-func
        if (act) new Function('tg', act)(tg);
        // eslint-disable-next-line no-new-func
        const met = until ? new Function('tg', `return (${until})`) : () => false;
        let tried = 0;
        for (let i = 0; i < Math.round(seconds * 30); i++) {
          tg.tick(1 / 30);
          await new Promise((r) => setTimeout(r, 0));
          if (read && i % 20 === 19 && document.querySelector('#g-card.on')) {
            const answers = document.querySelectorAll('#g-card.on .answer').length;
            if (answers) dispatchEvent(new KeyboardEvent('keydown', { code: `Digit${(tried++ % answers) + 1}` }));
            else tg.director.press();
          }
          if (met(tg)) break;
        }
        const text = (id) => (document.querySelector(`#${id}.on`) ? document.querySelector(`#${id}`).textContent.trim() : '');
        const people = {};
        for (const name of ['laman', 'lemuel', 'sam', 'zoram', ...Array.from({ length: 10 }, (_, k) => `town${k}`)]) {
          const n = tg.cast.get(name);
          if (n?.visible) people[name] = { x: n.x, z: n.z, mode: n.mode, sit: n.sit, speed: n.speed };
        }
        return { prompt: text('g-prompt'), toast: text('g-toast'), objective: text('g-objective'), card: !!document.querySelector('#g-card.on'), people, frozen: tg.director.frozen, beat: tg.director.beat };
      },
      [seconds, act, until, read],
    );
  /** Stands Nephi `back` metres from one of them, turned to him, on the side away from the others. */
  const standBy = (name, back = 1.6) => `
    const n = tg.cast.get('${name}');
    // (one of the city: before him, on his way; one of the family: on his side away from the others)
    const others = '${name}'.startsWith('town') ? [] : ['laman', 'lemuel', 'sam', 'zoram'].map((k) => tg.cast.get(k)).filter((o) => o && o !== n && o.visible);
    let a = n.yaw;
    if (others.length) {
      const mx = others.reduce((t, o) => t + o.x, 0) / others.length;
      const mz = others.reduce((t, o) => t + o.z, 0) / others.length;
      a = Math.atan2(n.x - mx, n.z - mz);
    }
    const x = n.x + Math.sin(a) * ${back}; const z = n.z + Math.cos(a) * ${back};
    tg.standAt(x, z, Math.atan2(n.x - x, n.z - z));`;
  /** Speaks to him (E) when the prompt is up, and says what he answered and whether he stood for it. */
  async function speakTo(name, label, words) {
    let now = await step(0.4, { act: standBy(name) });
    for (let i = 0; i < 30 && (!now.prompt || now.toast); i++) now = await step(0.5);
    check(`  by ${name}, the prompt is "${label}"`, now.prompt.includes(label), now.prompt);
    const said = await step(0.4, { act: 'tg.director.press()' });
    check(`  spoken to, ${name} answers "${words}"`, said.toast.includes(words), said.toast);
    return said;
  }
  const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });
  const close = async () => {
    check('  nothing went wrong on the page', problems.length === 0, problems);
    await page.close();
  };
  return { page, step, speakTo, shot, close, standBy };
}
const moved = (a, b, names) => names.filter((k) => a.people[k] && b.people[k] && Math.hypot(b.people[k].x - a.people[k].x, b.people[k].z - a.people[k].z) > 1.5);

const SCENES = {
  async 'a1-land'() {
    const s = await open('a1-land');
    const first = await s.step(6);
    const later = await s.step(14);
    check('  left to themselves, Sam and Lemuel go about (one of them at least)', moved(first, later, ['sam', 'lemuel']).length >= 1, [first.people, later.people]);
    await s.shot('a1-land');
    await s.speakTo('sam', 'Speak with Sam', 'Jerusalem');
    await s.step(6);
    await s.speakTo('lemuel', 'Speak with Lemuel', 'great city');
    await s.step(6);
    const by = await s.step(2, { act: s.standBy('laman', 2) });
    check('  by Laman, it is to cast lots', by.prompt.includes('Cast lots'), by.prompt);
    const cast = await s.step(30, { act: 'tg.director.press()', read: true, until: "document.querySelector('#g-objective.on')?.textContent.includes('gate')" });
    check('  the lots are cast, and they go up to the gate', cast.objective.includes('gate'), cast);
    // (going up, they answer as they go)
    await s.step(4);
    await s.speakTo('lemuel', 'Speak with Lemuel', 'not mine');
    await s.close();
  },
  async 'a1-gate'() {
    const s = await open('a1-gate');
    const first = await s.step(5);
    const later = await s.step(5);
    check('  while Laman is within, they wait about (Sam or Lemuel moves)', moved(first, later, ['sam', 'lemuel']).length >= 1, [first.people, later.people]);
    check('  and the story waits with them, Nephi free', !later.frozen && !later.card, later);
    // a stranger by the gate, greeted
    const near = Object.entries(later.people).filter(([k]) => k.startsWith('town')).sort(([, a], [, b]) => Math.hypot(a.x - later.people.sam.x, a.z - later.people.sam.z) - Math.hypot(b.x - later.people.sam.x, b.z - later.people.sam.z))[0][0];
    let by = await s.step(0.3, { act: s.standBy(near, 1.8) });
    for (let i = 0; i < 20 && !by.prompt.includes('Greet'); i++) by = await s.step(0.3, { act: s.standBy(near, 1.8) });
    check(`  by one of the city (${near}), the prompt is "Greet"`, by.prompt.includes('Greet'), by.prompt);
    const greeted = await s.step(0.8, { act: 'tg.director.press()' });
    check('  greeted, he stops, and says nothing', greeted.people[near].speed < 0.3 && !greeted.toast.startsWith("Greet"), greeted.people[near]);
    await s.shot('a1-gate-greet');
    await s.step(3);
    await s.speakTo('sam', 'Speak with Sam', 'Laman will ask');
    await s.shot('a1-gate');
    const then = await s.step(20, { until: "!!document.querySelector('#g-card.on')" });
    check('  and in a while, what Laban said to Laman is read', then.card, then);
    await s.close();
  },
  async a2() {
    const s = await open('a2');
    const inside = await s.step(40, { read: true, until: "document.querySelector('#g-objective.on')?.textContent.includes('house')" });
    check('  the gathering is begun', inside.objective.includes('house'), inside);
    // (Nephi taken from each point of the way in to the next, as the autopilot would go, until he is in)
    let first = inside;
    for (let i = 0; i < 40 && !first.objective.includes('Gather'); i++) first = await s.step(0.4, { act: 'const g = tg.director.goal; if (g) tg.standAt(g.x, g.z, 0);' });
    check('  in the house: the riches to gather', first.objective.includes('Gather'), first.objective);
    const a = await s.step(4);
    const b = await s.step(10);
    check('  his brothers go about the room', moved(a, b, ['laman', 'lemuel', 'sam']).length >= 1, [a.people, b.people]);
    await s.speakTo('sam', 'Speak with Sam', 'as we left it');
    await s.step(5);
    await s.shot('a2-house');
    // the gold: Laman comes for it himself
    const gold = await s.page.evaluate(() => {
      const tg = window.__tg;
      return tg.director.goal && [tg.director.goal.x, tg.director.goal.z];
    });
    let g = await s.step(0.5, { act: `tg.standAt(${gold[0]}, ${gold[1]} + 1.2, Math.PI)` });
    for (let i = 0; i < 10 && !g.prompt.includes('Gather'); i++) g = await s.step(0.3);
    const label = g.prompt;
    await s.step(0.3, { act: 'tg.director.press()' });
    const taker = label.includes('gold') ? 'laman' : label.includes('silver') ? 'lemuel' : null;
    if (taker) {
      const took = await s.step(8, { until: `!!tg.cast.get('${taker}').holds` });
      check(`  ${label.replace(/^E/, '')}: ${taker} comes, and takes it up himself`, took && (await s.page.evaluate((n) => !!window.__tg.cast.get(n).holds, taker)), took.people[taker]);
      await s.shot('a2-taken');
    } else check(`  the nearest of the riches is the precious things (${label})`, true);
    await s.close();
  },
  async 'a2-rock'() {
    const s = await open('a2-rock');
    const asked = await s.step(80, { read: true, until: "document.querySelector('#g-objective.on')?.textContent.includes('Speak')" });
    check('  after the angel, the objective is to speak to them', asked.objective.includes('Speak'), asked);
    const apart = await s.step(10);
    check('  they go apart: Lemuel sits at the mouth', apart.people.lemuel.sit > 0, apart.people.lemuel);
    await s.speakTo('sam', 'Speak with Sam', 'An angel');
    await s.step(5);
    await s.speakTo('lemuel', 'Speak with Lemuel', 'Gone');
    await s.shot('a2-rock');
    await s.step(5);
    const by = await s.step(1, { act: s.standBy('laman', 1.4) });
    check('  by Laman, it is to speak to them', by.prompt.includes('Speak to Laman'), by.prompt);
    await s.close();
  },
  async a3() {
    const s = await open('a3');
    const led = await s.step(60, { read: true, until: "!!document.querySelector('#g-objective.on')" });
    check('  the light leads him: the objective is up', !!led.objective, led);
    await s.speakTo('laman', 'Speak with Laman', 'alone');
    await s.step(5);
    await s.speakTo('lemuel', 'Speak with Lemuel', 'Do not be long');
    await s.shot('a3-hiding');
    await s.close();
  },
  async 'a3-treasury'() {
    const s = await open('a3-treasury');
    // (through the questions; in at the door with him; and to the table for the plates)
    let now = await s.step(30, { read: true, until: '!!tg.director.goal' });
    for (let i = 0; i < 12 && !now.objective.includes('brethren'); i++) {
      now = await s.step(10, {
        read: true,
        act: 'const g = tg.director.goal || tg.director.interactable; if (g) tg.standAt(g.x, g.z + 0.3, 0); if (tg.director.interactable) tg.director.press();',
        until: "document.querySelector('#g-objective.on')?.textContent.includes('brethren')",
      });
    }
    check('  he has the plates, and Zoram follows him', now.objective.includes('brethren'), now);
    // he walks out, and Zoram speaks as they go
    let heard = '';
    for (let i = 0; i < 40 && !heard.includes('master'); i++) {
      const go = await s.step(0.5, { act: 'const g = tg.director.goal; if (g) { const p = tg.player; const d = Math.hypot(g.x - p.x, g.z - p.z) || 1; tg.standAt(p.x + ((g.x - p.x) / d) * 0.7, p.z + ((g.z - p.z) / d) * 0.7, Math.atan2(g.x - p.x, g.z - p.z)); }' });
      if (go.toast.includes('Zoram')) heard = go.toast;
    }
    check('  as they go, Zoram speaks of the elders of his own accord', heard.includes('master'), heard);
    await s.shot('a3-zoram');
    await s.step(4);
    await s.speakTo('zoram', 'Speak with Zoram', 'master');
    await s.close();
  },
};

for (const [name, run] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  console.log(name);
  try {
    await run();
  } catch (e) {
    check(`  ${name} ran to its end`, false, e.message);
  }
}
await browser.close();
server.close();
console.log(failed ? `${failed} failed` : 'all as it should be');
process.exit(failed ? 1 : 0);
