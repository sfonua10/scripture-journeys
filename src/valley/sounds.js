// The valley's sound. Footsteps are five recordings by Kenney (CC0), which are in this repo. The five ambiences
// (grass in the wind, leaves, a summer evening, water at a bank, crickets) were cut from the Sonniss GDC bundles,
// which may be used in a game but not passed on as files, so they are not in this repo (MISSING_ASSETS.md). Where
// they are missing, two are made here instead: wind over dry grass, and crickets by night.
//
// The build writes ./audio/manifest.json listing the recordings that are there, so nothing is asked for that isn't.
// Sound starts on the first click, as browsers ask; everything is fetched and decoded before that, so the click
// itself costs nothing.

const LOOPS = ['grass', 'leaves', 'summer', 'lake', 'crickets'];

/**
 * Wind over dry grass, as a seamless stereo loop: a little low air, and over it the hiss of the stalks. It rises and
 * falls only slowly and unevenly (once, twice and three times in the loop's long length): a swell that comes round
 * every few seconds over a low rumble is the sea on a shore, not wind.
 */
function makeWind(ctx, seconds = 24) {
  const rate = ctx.sampleRate;
  const n = Math.floor(seconds * rate);
  const buffer = ctx.createBuffer(2, n, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let brown = 0;
    let soft = 0;
    let low = 0;
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.02) * 0.998;
      soft += (brown - soft) * 0.08;
      // (the hiss: white noise with its low part taken out, and its top softened)
      low += (white - low) * 0.18;
      const hiss = (white - low) * 0.5 + low * 0.25;
      const t = i / n;
      const swell = 0.78 + 0.12 * Math.sin(t * Math.PI * 2 + ch) + 0.07 * Math.sin(t * Math.PI * 4 + 1.7) + 0.04 * Math.sin(t * Math.PI * 6 + 0.4 + ch);
      data[i] = (soft * 1.4 + hiss * 0.09) * swell;
    }
    // cross-fade the ends into each other
    const fade = Math.floor(rate * 0.5);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      data[i] = data[i] * k + data[n - fade + i] * (1 - k);
    }
  }
  return buffer;
}

/** Crickets: a few of them, each chirping in short trills at its own pitch and pace, far off in the dark. */
function makeCrickets(ctx, seconds = 8) {
  const rate = ctx.sampleRate;
  const n = Math.floor(seconds * rate);
  const buffer = ctx.createBuffer(2, n, rate);
  const out = [buffer.getChannelData(0), buffer.getChannelData(1)];
  for (let c = 0; c < 5; c++) {
    const pitch = 3900 + Math.random() * 1300;
    const every = 0.55 + Math.random() * 0.5;
    const pan = Math.random();
    const loud = 0.05 + Math.random() * 0.06;
    for (let at = Math.random() * every; at < seconds - 0.2; at += every * (0.9 + Math.random() * 0.2)) {
      // a chirp: three or four pulses of tone
      const pulses = 3 + Math.floor(Math.random() * 2);
      for (let p = 0; p < pulses; p++) {
        const start = Math.floor((at + p * 0.034) * rate);
        const len = Math.floor(0.018 * rate);
        for (let i = 0; i < len && start + i < n; i++) {
          const env = Math.sin((i / len) * Math.PI);
          const v = Math.sin(((start + i) / rate) * pitch * Math.PI * 2) * env * loud;
          out[0][start + i] += v * (1 - pan);
          out[1][start + i] += v * pan;
        }
      }
    }
  }
  return buffer;
}

export function createSounds(base = './audio/') {
  let ctx = null;
  let master = null;
  // the ambiences go through one gain of their own, so the story can still them all (hush)
  let ambience = null;
  let hushed = 0;
  const steps = [];
  const buffers = {};
  const loops = {};
  let begun = false;
  let lastStep = -1;

  return {
    /** Fetches and decodes the recordings. Call while loading; resolves whether or not there is any sound to have. */
    async load() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      // (the build writes the list. `npm run dev` serves the files as they lie, with no list: there the footsteps,
      // which are always here, are asked for, so that the game has its sound while it is being worked on)
      let names = [1, 2, 3, 4, 5].map((i) => `footstepOnGrass${i}Medium`);
      try {
        const res = await fetch(`${base}manifest.json`);
        if (res.ok) names = await res.json();
      } catch {
        // (no list)
      }
      try {
        ctx = new Ctx();
        master = ctx.createGain();
        master.gain.value = 0.8;
        master.connect(ctx.destination);
        ambience = ctx.createGain();
        ambience.connect(master);
        await Promise.all(
          names.map(async (name) => {
            try {
              const buffer = await ctx.decodeAudioData(await (await fetch(`${base}${name}.ogg`)).arrayBuffer());
              if (name.startsWith('footstep')) steps.push(buffer);
              else buffers[name] = buffer;
            } catch {
              // a missing recording is just a missing sound
            }
          }),
        );
      } catch {
        ctx = null;
      }
      if (ctx) {
        buffers.grass ??= makeWind(ctx);
        buffers.crickets ??= makeCrickets(ctx);
      }
    },
    /**
     * Wakes the sound where the browser holds it back. A browser lets sound begin only from a touch, a click or a
     * key, so this is called from each of them (main.js); a phone also stops it when the page is left (its state is
     * then 'interrupted', not 'suspended'), and the next touch gives it back.
     */
    wake() {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    },
    /**
     * Whether sound can be heard now: asked before a journey begins by itself, with no touch on this page to let
     * the sound start (a journey opened by its own address). Where there is no sound at all, there is none to wait on.
     */
    async allowed(wait = 300) {
      if (!ctx) return true;
      if (ctx.state !== 'running') await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, wait))]);
      return ctx.state === 'running';
    },
    /** Call from a click. */
    start() {
      if (!ctx) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (begun) return;
      begun = true;
      for (const name of LOOPS) {
        if (!buffers[name]) continue;
        const source = ctx.createBufferSource();
        source.buffer = buffers[name];
        source.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(ambience);
        // (not all from their first second, or every visit begins the same)
        source.start(0, Math.random() * source.buffer.duration);
        loops[name] = gain;
      }
    },
    /** The sound's own clock and its way out, for the story's music (music.js); null where there is no sound. */
    get context() {
      return ctx;
    },
    get out() {
      return master;
    },
    /** Stills the land's own sounds (1) or gives them back (0), over a second or so. */
    hush(amount) {
      hushed = amount;
    },
    /** One footfall, 0 to 1 loud. Never the same recording twice running. */
    step(volume) {
      if (!ctx || ctx.state !== 'running' || !steps.length) return;
      let pick = Math.floor(Math.random() * steps.length);
      if (pick === lastStep) pick = (pick + 1) % steps.length;
      lastStep = pick;
      const source = ctx.createBufferSource();
      source.buffer = steps[pick];
      source.playbackRate.value = 0.92 + Math.random() * 0.16;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      const pan = ctx.createStereoPanner();
      pan.pan.value = (Math.random() - 0.5) * 0.3;
      source.connect(gain).connect(pan).connect(master);
      source.start();
    },
    /**
     * @param here.wind m/s; here.gust 0 to 1, the gust passing now; here.tree 0 to 1, how far under a tree you
     *   are; here.tarn 0 to 1, how near the water; here.dusk 0 to 1; here.night 1 by night
     */
    update(dt, here) {
      if (!begun) return;
      const ease = Math.min(1, dt * 1.6);
      ambience.gain.value += (1 - hushed - ambience.gain.value) * ease;
      const to = (name, value) => {
        if (loops[name]) loops[name].gain.value += (value - loops[name].gain.value) * ease;
      };
      // (by night the wind has dropped: what is heard is the crickets)
      to('grass', (0.1 + Math.min(0.5, here.wind * 0.055)) * (0.55 + 0.45 * here.gust) * (1 - 0.85 * (here.night ?? 0)));
      to('leaves', here.tree * (0.3 + 0.5 * here.gust));
      to('summer', 0.55 * (1 - 0.5 * here.dusk));
      to('lake', here.tarn * 0.5);
      to('crickets', here.dusk * 0.5);
    },
  };
}
