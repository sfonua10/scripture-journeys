// Joins what tools/clip.mjs took into a film: the segments' frames in the spec's order, and under them the sound the
// game would have made, laid by the frame each thing was asked for at. The readings are the game's own recordings
// (dist/audio/narration), the footsteps its own (dist/audio), the music its own as tools/clip-music.mjs recorded it,
// and the wind is made here as valley/sounds.js makes it.
//
//   node tools/clip-cut.mjs --spec <spec.mjs> --frames <dir clip.mjs wrote> --music <dir clip-music.mjs wrote> --out film.mp4
//
// In the spec a segment may give `tail` (seconds a reading may run on past the cut; 0), `speak` (no more than so many
// seconds of each reading: to stop at a pause in it) and `steps` (false for none);
// `tracks` are pieces of music that run across cuts: { stem, from: segment, to: segment | null, gain }.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const spec = (await import(pathToFileURL(resolve(flag('spec'))).href)).default;
const framesDir = resolve(flag('frames'));
const musicDir = resolve(flag('music'));
const out = resolve(flag('out', 'film.mp4'));
const RATE = 48000;

// ---- the pictures: one run of numbered frames ----
const all = join(framesDir, '_all');
rmSync(all, { recursive: true, force: true });
mkdirSync(all, { recursive: true });
const segs = [];
let count = 0;
let fps = 30;
for (const seg of spec.segments) {
  const dir = join(framesDir, seg.name);
  if (!existsSync(join(dir, 'events.json'))) throw new Error(`${seg.name}: not taken yet`);
  const info = JSON.parse(readFileSync(join(dir, 'events.json'), 'utf8'));
  fps = info.fps;
  // (no more of them than the spec now asks for: a segment is shortened without being taken again)
  const files = readdirSync(dir).filter((f) => /^f\d+\.jpg$/.test(f)).sort().slice(0, seg.frames);
  segs.push({ ...seg, ...info, at: count / fps, length: files.length / fps });
  for (const f of files) symlinkSync(join(dir, f), join(all, `${String(count++).padStart(6, '0')}.jpg`));
}
const total = count / fps;

// ---- the sound ----
const n = Math.ceil(total * RATE);
const mix = [new Float32Array(n), new Float32Array(n)];
const cache = new Map();
/** A recording as two channels of samples. */
function load(file) {
  if (!cache.has(file)) {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
    const both = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
    const ch = [new Float32Array(both.length / 2), new Float32Array(both.length / 2)];
    for (let i = 0; i < ch[0].length; i++) {
      ch[0][i] = both[i * 2];
      ch[1][i] = both[i * 2 + 1];
    }
    cache.set(file, ch);
  }
  return cache.get(file);
}
/** Lays `ch` into the mix at `at` seconds: from `from` seconds into it, for no more than `length`, coming in and going out. */
function lay(ch, at, { gain = 1, from = 0, length = Infinity, rise = 0.008, fall = 0.06, pan = 0 } = {}) {
  const start = Math.round(at * RATE);
  const skip = Math.round(from * RATE);
  const len = Math.min(ch[0].length - skip, Math.round(Math.min(length, total - at) * RATE));
  if (len <= 0) return;
  const up = Math.max(1, Math.round(rise * RATE));
  const down = Math.max(1, Math.round(fall * RATE));
  const g = [gain * Math.min(1, 1 - pan), gain * Math.min(1, 1 + pan)];
  for (let i = 0; i < len; i++) {
    const k = Math.min(1, i / up, (len - i) / down);
    const j = start + i;
    if (j < 0 || j >= n) continue;
    mix[0][j] += ch[0][skip + i] * g[0] * k;
    mix[1][j] += ch[1][skip + i] * g[1] * k;
  }
}

// wind over dry grass, as sounds.js makes it where there is no recording: under everything, very low
{
  const wind = [new Float32Array(n), new Float32Array(n)];
  for (let c = 0; c < 2; c++) {
    let brown = 0;
    let soft = 0;
    for (let i = 0; i < n; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.02) * 0.998;
      soft += (brown - soft) * 0.08;
      const t = i / RATE / 9;
      wind[c][i] = soft * 3.2 * (0.6 + 0.25 * Math.sin(t * Math.PI * 4 + c) + 0.15 * Math.sin(t * Math.PI * 6 + 1.7));
    }
  }
  lay(wind, 0, { gain: 0.035, rise: 0.4, fall: 0.8 });
}

const narration = join(here, 'dist', 'audio', 'narration');
const steps = [1, 2, 3, 4, 5].map((i) => join(here, 'dist', 'audio', `footstepOnGrass${i}Medium.ogg`));
const stem = (name) => load(join(musicDir, `${name}.wav`));
const heard = [];
for (const seg of segs) {
  const rel = (e) => (e.f - seg.first) / fps;
  const inside = (e) => rel(e) >= 0 && rel(e) < seg.length;
  // what is said: each reading from where its card came up, until the next begins or the picture is cut
  const said = seg.events.filter((e) => e.type === 'say' && inside(e) && existsSync(join(narration, `${e.key}.mp3`)));
  said.forEach((e, i) => {
    const until = Math.min(seg.length + (seg.tail ?? 0), rel(e) + (seg.speak ?? Infinity), i + 1 < said.length ? rel(said[i + 1]) : Infinity);
    lay(load(join(narration, `${e.key}.mp3`)), seg.at + rel(e), { length: until - rel(e), fall: 0.18, gain: seg.voice ?? 1 });
    heard.push(`${(seg.at + rel(e)).toFixed(2)} s  ${e.key}`);
  });
  if (seg.steps !== false) {
    let last = -1;
    for (const e of seg.events.filter((e) => e.type === 'step' && inside(e))) {
      let pick = Math.floor(Math.random() * steps.length);
      if (pick === last) pick = (pick + 1) % steps.length;
      last = pick;
      lay(load(steps[pick]), seg.at + rel(e), { gain: e.v * 1.1, pan: (Math.random() - 0.5) * 0.3 });
    }
  }
  for (const e of seg.events.filter((e) => e.type === 'pluck' && inside(e))) lay(stem('pluck'), seg.at + rel(e), { gain: 0.9, length: seg.length - rel(e) + 1, fall: 0.6 });
  // the held sounds: the angel's chord from where it began; the Spirit's tone for as long as it leads
  const began = (type) => seg.events.find((e) => e.type === type && e.v > 0 && rel(e) < seg.length);
  const angel = began('angel');
  if (angel) lay(stem('angel'), seg.at + Math.max(0, rel(angel)), { from: Math.max(0, -rel(angel)), length: seg.length - Math.max(0, rel(angel)), gain: 3.4, rise: 0.05, fall: 0.25 });
  if (began('spirit')) lay(stem('spirit'), seg.at, { from: 1, length: seg.length, gain: 0.7, rise: 0.25, fall: 0.3 });
}
for (const t of spec.tracks ?? []) {
  const from = segs.find((s) => s.name === t.from);
  const to = t.to ? segs.find((s) => s.name === t.to).at : total;
  lay(stem(t.stem), from.at + (t.delay ?? 0), { length: to - from.at - (t.delay ?? 0), gain: t.gain ?? 1, rise: t.rise ?? 0.02, fall: t.fall ?? (t.to ? 0.2 : 1.2) });
}
// (nothing over the top)
let peak = 0;
for (const ch of mix) for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch[i]));
const scale = peak > 0.89 ? 0.89 / peak : 1;
const pcm = Buffer.alloc(n * 4);
for (let i = 0; i < n; i++) {
  pcm.writeInt16LE(Math.round(mix[0][i] * scale * 32767), i * 4);
  pcm.writeInt16LE(Math.round(mix[1][i] * scale * 32767), i * 4 + 2);
}
const raw = join(framesDir, '_mix.s16');
writeFileSync(raw, pcm);

// one loudness for the whole of it (about what the phone apps play at), and not a levelling that would bring the
// wind up to the voices in the quiet parts
const measured = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-f', 's16le', '-ar', String(RATE), '-ac', '2', '-i', raw, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const loud = Number([...measured.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1] ?? -15);
const lift = Math.max(-12, Math.min(12, -16 - loud));

// ---- together ----
mkdirSync(dirname(out), { recursive: true });
const made = spawnSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(all, '%06d.jpg'), '-f', 's16le', '-ar', String(RATE), '-ac', '2', '-i', raw,
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-r', String(fps),
    '-af', `volume=${lift.toFixed(2)}dB,alimiter=limit=0.8:attack=3:release=60:level=disabled`, '-ar', String(RATE), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(total), out],
  { encoding: 'utf8' },
);
if (made.status !== 0) throw new Error(made.stderr);
console.log(`${out}: ${total.toFixed(1)} s, ${count} frames; sound ${loud} LUFS, lifted ${lift.toFixed(1)} dB`);
for (const s of segs) console.log(`  ${s.at.toFixed(2).padStart(6)} s  ${s.name} (${s.length.toFixed(1)} s)`);
console.log(`said:\n  ${heard.join('\n  ')}`);
