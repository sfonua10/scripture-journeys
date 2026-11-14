// The story's music (src/game/music.js), played by itself in a headless page and recorded, a piece at a time, for a
// film's sound (tools/clip-cut.mjs). The music is made in the page and keeps the wall's time, so it is recorded as
// it sounds, not stepped.
//
//   CHROME=... node tools/clip-music.mjs --out <dir>
//
// Writes drum.wav (the chase), angel.wav (the chord, swelling as he brightens), spirit.wav (the tone of the
// Spirit's leading), theme.wav (the lyre's tune) and pluck.wav (its two notes).
import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const out = resolve(args[args.indexOf('--out') + 1] ?? 'shots/clip-music');
mkdirSync(out, { recursive: true });

const PAGE = '<!doctype html><meta charset="utf-8"><title>music</title>';
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') return void res.writeHead(200, { 'Content-Type': 'text/html' }).end(PAGE);
  const file = normalize(join(here, path));
  if (!file.startsWith(here) || !existsSync(file) || statSync(file).isDirectory()) return void res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
await page.goto(`http://127.0.0.1:${server.address().port}/`);

const pieces = await page.evaluate(async () => {
  const { createMusic } = await import('/src/game/music.js');
  const ctx = new AudioContext({ sampleRate: 48000 });
  await ctx.resume();
  const tap = ctx.createGain();
  const stream = ctx.createMediaStreamDestination();
  tap.connect(stream);
  // (music.js asks only for the clock and the way out)
  const music = createMusic({ context: ctx, out: tap });
  let last = performance.now();
  let each = null;
  setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    each?.(dt);
    music.update(dt);
  }, 16);
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));
  const record = async (seconds, begin) => {
    const rec = new MediaRecorder(stream.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start();
    await wait(0.25);
    begin();
    await wait(seconds);
    rec.stop();
    await done;
    each = null;
    music.stop();
    for (const name of ['drum', 'angel', 'spirit']) music[name](0);
    await wait(2.5);
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  // (a first sound, thrown away: the held sounds are made on the first call)
  music.pluck();
  await wait(1.5);
  const got = {};
  got.pluck = await record(3, () => music.pluck());
  // the chase: they close on him as it goes
  got.drum = await record(9, () => {
    let level = 0.45;
    each = (dt) => music.drum((level = Math.min(1, level + dt * 0.08)));
  });
  // the angel: brightening over a little more than two seconds, as in the story, then held
  got.angel = await record(7, () => {
    let bright = 0;
    each = (dt) => music.angel((bright = Math.min(1, bright + dt * 0.45)));
  });
  got.spirit = await record(7, () => {
    each = () => music.spirit(1);
  });
  got.theme = await record(20, () => music.theme());
  return got;
});
await browser.close();
server.close();

for (const [name, b64] of Object.entries(pieces)) {
  const webm = join(out, `${name}.webm`);
  writeFileSync(webm, Buffer.from(b64, 'base64'));
  // (the quarter second before it began is cut off)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-ss', '0.25', '-ar', '48000', '-ac', '2', join(out, `${name}.wav`)]);
  const heard = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', join(out, `${name}.wav`), '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  console.log(name, heard.match(/Duration: [\d:.]+/)?.[0], heard.match(/mean_volume: [-\d.]+ dB/)?.[0], heard.match(/max_volume: [-\d.]+ dB/)?.[0]);
}
