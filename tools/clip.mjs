// Frames for a film of the game, headless, the clock stepped by hand (build first: npm run build). Each segment
// opens the page at a beat with the autopilot, runs on unseen until its moment comes, then takes a picture of every
// frame, 30 to the second. What is heard in that time (readings, footsteps, music) is not recorded but written down,
// with the frame it began at, for tools/clip-cut.mjs to lay under the pictures.
//
//   CHROME=... node tools/clip.mjs --spec <spec.mjs> --out <dir> [--size 360x640] [--scale 3] [--only name,name]
//
// The spec's default export is { segments: [...] }; a segment is
//   name      its folder under --out
//   beat      the beat the page opens at (?beat=)
//   query     more for the address ("autoread=4&hold")
//   until     JavaScript, true when the moment has come: (tg, clip) in scope; clip.said('said-run') is the frame a
//             reading whose name holds that was asked for, or -1
//   delay     frames to let pass unseen after that
//   frames    how many to take
//   caption   words laid over the picture: { text, sub } (either may be left out), or null
//   overlay   HTML laid over the whole picture, which comes in and stays (the last card)
//   css       more CSS for the page
//   each      JavaScript run before every frame taken: (tg, clip, i) in scope
//   limit     seconds of story to wait for the moment before giving up (600)
// A spec may also give `css` for every segment, and `tall` / `wide` CSS and `tallQuery` / `wideQuery` chosen by the
// picture's shape.
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';

guard(chromium);
const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const spec = (await import(pathToFileURL(resolve(flag('spec'))).href)).default;
const out = resolve(flag('out', 'shots/clip'));
const [width, height] = flag('size', '360x640').split('x').map(Number);
const scale = Number(flag('scale', '3'));
const only = (flag('only', '') || '').split(',').filter(Boolean);
const FPS = 30;
mkdirSync(out, { recursive: true });

const root = resolve(here, 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
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

const BASE_CSS = /* css */ `
#start, #hint, #n-voice { display: none !important; }
#clip-cap {
  position: fixed; z-index: 30; left: 50%; transform: translateX(-50%); box-sizing: border-box; text-align: center; opacity: 0;
  font-family: Georgia, 'Times New Roman', serif; color: #f4ead6; pointer-events: none;
  padding: 10px 16px 11px; background: rgba(24, 18, 12, 0.78); border: 1px solid rgba(227, 189, 109, 0.5); border-radius: 6px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); text-wrap: balance;
}
#clip-cap .t { font-size: 21px; line-height: 1.25; }
#clip-over { position: fixed; z-index: 40; inset: 0; opacity: 0; pointer-events: none; font-family: Georgia, 'Times New Roman', serif; color: #f4ead6; }
#clip-cap .s { margin-top: 4px; font-size: 13px; letter-spacing: 0.08em; color: #e3bd6d; font-variant: small-caps; }
`;

/** What the page keeps while it is filmed: the frame it is at, and what has been asked to sound. */
function install() {
  const tg = window.__tg;
  const clip = (window.__clip = {
    frame: 0,
    events: [],
    said: (part) => clip.events.find((e) => e.type === 'say' && e.key.includes(part))?.f ?? -1,
    heard: (type) => clip.events.find((e) => e.type === type)?.f ?? -1,
  });
  const slug = (ref) => String(ref).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const note = (type, more = {}) => clip.events.push({ f: clip.frame, type, ...more });
  const n = tg.g.narration;
  if (n) {
    const say = n.say.bind(n);
    const stop = n.stop.bind(n);
    n.say = (ref) => (note('say', { key: slug(ref ?? '') }), say(ref));
    n.stop = () => (note('hush'), stop());
  }
  const m = tg.g.music;
  if (m) {
    for (const name of ['pluck', 'theme', 'stop']) {
      const was = m[name].bind(m);
      m[name] = (...a) => (note(name), was(...a));
    }
    // (the held ones are asked for every frame: only a change is written down)
    for (const name of ['drum', 'angel', 'spirit', 'breath']) {
      const was = m[name].bind(m);
      let last = 0;
      m[name] = (level) => {
        const v = Math.round(level * 20) / 20;
        if (v !== last) note(name, { v });
        last = v;
        return was(level);
      };
    }
  }
  const step = tg.sounds.step.bind(tg.sounds);
  tg.sounds.step = (volume) => (note('step', { v: volume }), step(volume));
  /** The page's own fades and slides, which keep the wall's time, not the story's: stepped (ms), or ended (null). */
  clip.anim = (ms) => {
    for (const a of document.getAnimations()) {
      try {
        if (ms == null) {
          a.finish();
          continue;
        }
        if (a.playState !== 'paused') a.pause();
        const end = a.effect?.getComputedTiming().endTime;
        const t = (a.currentTime ?? 0) + ms;
        if (Number.isFinite(end) && t >= end) a.finish();
        else a.currentTime = t;
      } catch {
        // (one with no end cannot be finished: it is left where it is)
      }
    }
  };
  const cap = document.createElement('div');
  cap.id = 'clip-cap';
  document.body.append(cap);
  clip.caption = (c) => {
    cap.innerHTML = '';
    if (!c) return;
    for (const [cls, text] of [['t', c.text], ['s', c.sub]]) {
      if (!text) continue;
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = text;
      cap.append(el);
    }
  };
  // (a whole picture laid over the game, for the film's last card: it comes in and stays)
  const over = document.createElement('div');
  over.id = 'clip-over';
  document.body.append(over);
  clip.over = (html) => (over.innerHTML = html ?? '');
  clip.show = (k, kin) => {
    cap.style.opacity = cap.childNodes.length ? String(k) : '0';
    over.style.opacity = over.childNodes.length ? String(kin) : '0';
  };
}

const report = [];
for (const seg of spec.segments) {
  if (only.length && !only.includes(seg.name)) continue;
  const dir = join(out, seg.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const more = (height > width ? spec.tallQuery : spec.wideQuery) ?? '';
  const url = `http://127.0.0.1:${server.address().port}/?step&auto&nosound&dpr=${scale}&quality=high&beat=${seg.beat}${seg.query ? `&${seg.query}` : ''}${more ? `&${more}` : ''}`;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction(() => window.__tg?.ready, null, { timeout: 120000 });
  await page.addStyleTag({ content: [BASE_CSS, spec.css ?? '', (height > width ? spec.tall : spec.wide) ?? '', seg.css ?? ''].join('\n') });
  await page.evaluate(install);

  // on, unseen, until its moment
  const limit = (seg.limit ?? 600) * FPS;
  let found = false;
  let at = 0;
  while (!found && at < limit) {
    [found, at] = await page.evaluate(
      async ({ code, dt }) => {
        const tg = window.__tg;
        const clip = window.__clip;
        const test = new Function('tg', 'clip', `return (${code});`);
        for (let i = 0; i < 90; i++) {
          if (test(tg, clip)) return [true, clip.frame];
          tg.tick(dt);
          clip.frame++;
          clip.anim(null);
          await new Promise((r) => setTimeout(r, 0));
        }
        return [false, clip.frame];
      },
      { code: seg.until ?? 'true', dt: 1 / FPS },
    );
  }
  if (!found) {
    console.log(`${seg.name}: its moment never came in ${seg.limit ?? 600} s (beat ${await page.evaluate(() => window.__tg.director.beat)})`);
    await page.close();
    continue;
  }
  if (seg.delay) {
    await page.evaluate(
      async ({ n, dt }) => {
        for (let i = 0; i < n; i++) {
          window.__tg.tick(dt);
          window.__clip.frame++;
          window.__clip.anim(null);
          await new Promise((r) => setTimeout(r, 0));
        }
      },
      { n: seg.delay, dt: 1 / FPS },
    );
  }
  const first = await page.evaluate(({ c, o }) => (window.__clip.caption(c), window.__clip.over(o), window.__clip.frame), { c: seg.caption ?? null, o: seg.overlay ?? null });

  for (let i = 0; i < seg.frames; i++) {
    // a caption comes in over a third of a second and goes the same way
    const k = Math.max(0, Math.min(1, (i + 1) / 9, (seg.frames - i) / 9));
    await page.evaluate(
      async ({ dt, k, kin, i, each }) => {
        const tg = window.__tg;
        const clip = window.__clip;
        if (each) new Function('tg', 'clip', 'i', each)(tg, clip, i);
        tg.tick(dt);
        clip.frame++;
        clip.anim(dt * 1000);
        clip.show(k, kin);
        await new Promise((r) => setTimeout(r, 0));
        tg.renderer.getContext().finish();
      },
      { dt: 1 / FPS, k, kin: Math.min(1, (i + 1) / (seg.overlayIn ?? 18)), i, each: seg.each ?? null },
    );
    await page.screenshot({ path: join(dir, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
  }
  const events = await page.evaluate(() => window.__clip.events);
  const info = { name: seg.name, first, frames: seg.frames, fps: FPS, events };
  writeFileSync(join(dir, 'events.json'), JSON.stringify(info, null, 1));
  report.push(info);
  const heard = events.filter((e) => e.type === 'say' && e.f > first - 20 * FPS && e.f < first + seg.frames);
  console.log(`${seg.name}: ${seg.frames} frames from frame ${first} (${(first / FPS).toFixed(1)} s in), ${((Date.now() - t0) / 1000).toFixed(0)} s; said: ${heard.map((e) => `${e.key}@${e.f - first}`).join(' ') || '-'}`);
  if (problems.length) console.log(problems.slice(0, 5).join('\n'));
  await page.close();
}
await browser.close();
server.close();
