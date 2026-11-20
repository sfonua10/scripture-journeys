// Every sound is made here, from oscillators and noise. No files.
import type { Surface } from './physics';
import { Rng, clamp, clamp01 } from './util';

export type BedName = 'wind' | 'rain' | 'waves' | 'deep' | 'crowd' | 'heat';
export type ScoreName = 'title' | 'call' | 'harbor' | 'storm' | 'fish' | 'nineveh' | 'plant' | 'calm';

interface Bed {
  gain: GainNode;
  level: number;
  target: number;
  update?: (t: number, level: number) => void;
}

interface ScoreDef {
  bpm: number;
  /** Root note as a MIDI number. */
  root: number;
  scale: number[];
  drone: number;
  pad: number;
  lyre: number;
  flute: number;
  drum: number;
  bell: number;
  /** Drum pattern over 8 steps: 2 a low stroke, 1 a rim tap, 0 rest. */
  pattern: number[];
  /** Steps per beat. */
  div: number;
}

const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MINOR_PENTA = [0, 3, 5, 7, 10];
const MAJOR_PENTA = [0, 2, 4, 7, 9];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

const SCORES: Record<ScoreName, ScoreDef> = {
  title: { bpm: 66, root: 50, scale: DORIAN, drone: 0.5, pad: 0.5, lyre: 0.5, flute: 0.25, drum: 0, bell: 0, pattern: [0, 0, 0, 0, 0, 0, 0, 0], div: 2 },
  call: { bpm: 126, root: 50, scale: HIJAZ, drone: 0.35, pad: 0.2, lyre: 0.75, flute: 0.2, drum: 0.8, bell: 0, pattern: [2, 0, 1, 1, 2, 1, 0, 1], div: 2 },
  harbor: { bpm: 96, root: 55, scale: MAJOR_PENTA, drone: 0.25, pad: 0.35, lyre: 0.7, flute: 0.3, drum: 0.35, bell: 0, pattern: [2, 0, 0, 1, 0, 1, 2, 0], div: 2 },
  storm: { bpm: 84, root: 38, scale: PHRYGIAN, drone: 0.9, pad: 0.7, lyre: 0, flute: 0.15, drum: 0.9, bell: 0, pattern: [2, 0, 0, 2, 0, 0, 1, 0], div: 2 },
  fish: { bpm: 52, root: 45, scale: MINOR_PENTA, drone: 0.7, pad: 0.6, lyre: 0, flute: 0, drum: 0, bell: 0.7, pattern: [0, 0, 0, 0, 0, 0, 0, 0], div: 2 },
  nineveh: { bpm: 100, root: 52, scale: HIJAZ, drone: 0.4, pad: 0.3, lyre: 0.5, flute: 0.55, drum: 0.6, bell: 0, pattern: [2, 0, 1, 0, 2, 2, 1, 0], div: 2 },
  plant: { bpm: 58, root: 48, scale: DORIAN, drone: 0.3, pad: 0.4, lyre: 0.45, flute: 0.2, drum: 0, bell: 0.15, pattern: [0, 0, 0, 0, 0, 0, 0, 0], div: 2 },
  calm: { bpm: 54, root: 50, scale: MAJOR_PENTA, drone: 0.4, pad: 0.7, lyre: 0.3, flute: 0.3, drum: 0, bell: 0.2, pattern: [0, 0, 0, 0, 0, 0, 0, 0], div: 2 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private amb!: GainNode;
  private verb!: ConvolverNode;
  private verbSend!: GainNode;
  private white!: AudioBuffer;
  private pink!: AudioBuffer;
  private brown!: AudioBuffer;
  private beds = new Map<BedName, Bed>();
  private rng = new Rng(99);
  private vol = { master: 0.9, music: 0.7, sfx: 0.9 };
  private muted = new URLSearchParams(location.search).has('mute');
  private pendingBeds: Partial<Record<BedName, number>> = {};
  private pendingScore: ScoreName | null = null;

  // score state
  private score: ScoreDef | null = null;
  private scoreName: ScoreName | null = null;
  private scoreGain: GainNode | null = null;
  private droneNodes: { stop(): void } | null = null;
  private nextStep = 0;
  private step = 0;
  private melodyDegree = 0;
  private restFor = 0;
  /** 0..1: how hard the score plays (a chapter raises and lowers it). */
  intensity = 0.6;
  /** Seconds between creaks of the ship's timbers; 0 for none. */
  creakEvery = 0;
  private creakIn = 2;
  /** Seconds between gull cries; 0 for none. */
  gullEvery = 0;
  private gullIn = 4;
  private lastStep = 0;

  /** Call from the first key, click, touch or pad press. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    this.amb = ctx.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.amb.connect(this.master);
    this.white = this.noise(2, 0);
    this.pink = this.noise(3, 1);
    this.brown = this.noise(3, 2);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(2.6);
    this.verbSend = ctx.createGain();
    this.verbSend.gain.value = 0.9;
    this.verbSend.connect(this.verb).connect(this.master);
    this.applyVolumes();
    for (const [name, level] of Object.entries(this.pendingBeds)) this.bed(name as BedName, level ?? 0);
    if (this.pendingScore) this.play(this.pendingScore);
    void ctx.resume().catch(() => {});
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.vol = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.music.gain.setTargetAtTime(this.vol.music * 0.55, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.amb.gain.setTargetAtTime(this.vol.sfx * 0.8, t, 0.05);
  }

  /** Quietens everything while paused or hidden. */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : on ? this.vol.master * 0.25 : this.vol.master, this.ctx.currentTime, 0.12);
  }

  private noise(seconds: number, kind: 0 | 1 | 2): AudioBuffer {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 0) d[i] = w;
      else if (kind === 1) {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    // cross-fade the ends so a loop does not click
    const f = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < f; i++) {
      const k = i / f;
      d[i] = d[i] * k + d[n - f + i] * (1 - k);
    }
    return buf;
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    return buf;
  }

  // ---- building blocks -----------------------------------------------------------------------------------------

  private env(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
    const g = gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** A burst of filtered noise. */
  private burst(o: { t?: number; type?: BiquadFilterType; freq: number; freq2?: number; q?: number; peak: number; attack?: number; decay: number; buffer?: AudioBuffer; verb?: number; out?: AudioNode; rate?: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.t ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = o.buffer ?? this.white;
    src.playbackRate.value = o.rate ?? 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq, t);
    if (o.freq2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freq2), t + (o.attack ?? 0.005) + o.decay);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    this.env(g, t, o.peak, o.attack ?? 0.005, o.decay);
    src.connect(f).connect(g).connect(o.out ?? this.sfx);
    if (o.verb) {
      const s = ctx.createGain();
      s.gain.value = o.verb;
      g.connect(s).connect(this.verbSend);
    }
    src.start(t, Math.random() * 1.5);
    src.stop(t + (o.attack ?? 0.005) + o.decay + 0.05);
  }

  /** A pitched tone with an envelope. */
  private tone(o: { t?: number; type?: OscillatorType; freq: number; freq2?: number; peak: number; attack?: number; decay: number; verb?: number; out?: AudioNode; detune?: number; lp?: number; vibrato?: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(10, o.freq2), t + (o.attack ?? 0.005) + o.decay);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    this.env(g, t, o.peak, o.attack ?? 0.005, o.decay);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    if (o.vibrato) {
      const l = ctx.createOscillator();
      l.frequency.value = 5.2;
      const lg = ctx.createGain();
      lg.gain.value = o.vibrato;
      l.connect(lg).connect(osc.frequency);
      l.start(t);
      l.stop(t + (o.attack ?? 0.005) + o.decay + 0.05);
    }
    node.connect(g).connect(o.out ?? this.sfx);
    if (o.verb) {
      const s = ctx.createGain();
      s.gain.value = o.verb;
      g.connect(s).connect(this.verbSend);
    }
    osc.start(t);
    osc.stop(t + (o.attack ?? 0.005) + o.decay + 0.05);
  }

  // ---- effects -------------------------------------------------------------------------------------------------

  stepSound(surface: Surface, vol = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    // never two steps on top of each other
    if (ctx.currentTime - this.lastStep < 0.09) return;
    this.lastStep = ctx.currentTime;
    const v = clamp(vol, 0.3, 1.2) * 0.3;
    const r = 0.9 + Math.random() * 0.25;
    switch (surface) {
      case 'wood':
        this.tone({ freq: 150 * r, freq2: 80, peak: v * 0.9, decay: 0.09, type: 'triangle' });
        this.burst({ freq: 900 * r, q: 1.5, peak: v * 0.5, decay: 0.05 });
        break;
      case 'sand':
        this.burst({ freq: 1400 * r, q: 0.7, peak: v * 0.55, attack: 0.012, decay: 0.12, buffer: this.pink });
        break;
      case 'water':
        this.burst({ freq: 700 * r, freq2: 1600, q: 1.2, peak: v * 0.8, attack: 0.01, decay: 0.16 });
        break;
      case 'cloth':
      case 'plant':
        this.burst({ freq: 500 * r, q: 0.8, peak: v * 0.5, attack: 0.01, decay: 0.09, buffer: this.pink });
        break;
      case 'flesh':
        this.burst({ type: 'lowpass', freq: 300 * r, peak: v * 0.9, attack: 0.01, decay: 0.12, buffer: this.brown });
        break;
      default:
        this.burst({ freq: 1900 * r, q: 1.2, peak: v * 0.45, decay: 0.045 });
        this.tone({ freq: 210 * r, freq2: 120, peak: v * 0.5, decay: 0.05, type: 'triangle' });
    }
  }

  jump() {
    this.burst({ freq: 500, freq2: 1500, q: 0.8, peak: 0.12, attack: 0.02, decay: 0.14, buffer: this.pink });
  }

  land(impact: number, surface: Surface) {
    const v = clamp01(impact / 22);
    this.stepSound(surface, 0.8 + v);
    this.tone({ freq: 95, freq2: 45, peak: 0.25 + v * 0.35, decay: 0.16 });
  }

  whoosh(strength = 1) {
    this.burst({ freq: 400, freq2: 1800, q: 0.9, peak: 0.16 * strength, attack: 0.06, decay: 0.25, buffer: this.pink });
  }

  grab() {
    this.burst({ freq: 800, q: 1.2, peak: 0.2, decay: 0.06 });
    this.tone({ freq: 130, freq2: 90, peak: 0.2, decay: 0.08, type: 'triangle' });
  }

  slide() {
    this.burst({ freq: 1100, freq2: 500, q: 0.6, peak: 0.24, attack: 0.03, decay: 0.55, buffer: this.pink });
  }

  pick() {
    this.tone({ freq: 220, freq2: 330, peak: 0.16, decay: 0.09, type: 'triangle' });
    this.burst({ freq: 1200, q: 1, peak: 0.1, decay: 0.05 });
  }

  /** A knock of wood (or other stuff) on something. */
  thud(strength = 1, surface: Surface = 'wood') {
    const v = clamp(strength, 0.15, 1.5);
    const r = 0.85 + Math.random() * 0.3;
    if (surface === 'stone') {
      this.burst({ freq: 2200 * r, q: 2, peak: 0.25 * v, decay: 0.07 });
      this.tone({ freq: 320 * r, freq2: 180, peak: 0.25 * v, decay: 0.09, type: 'triangle' });
    } else if (surface === 'cloth' || surface === 'sand') {
      this.burst({ type: 'lowpass', freq: 500 * r, peak: 0.4 * v, attack: 0.008, decay: 0.14, buffer: this.brown });
    } else {
      this.tone({ freq: 120 * r, freq2: 60, peak: 0.42 * v, decay: 0.16, type: 'triangle' });
      this.burst({ freq: 700 * r, q: 1.4, peak: 0.22 * v, decay: 0.07 });
      this.tone({ freq: 410 * r, peak: 0.07 * v, decay: 0.12, type: 'square', lp: 900 });
    }
  }

  splash(size = 1) {
    const s = clamp(size, 0.2, 2);
    this.burst({ freq: 900, freq2: 300, q: 0.5, peak: 0.4 * s, attack: 0.01, decay: 0.35 * s, verb: 0.2 });
    this.burst({ type: 'highpass', freq: 2500, peak: 0.2 * s, attack: 0.03, decay: 0.6 * s });
    this.tone({ freq: 140, freq2: 50, peak: 0.3 * s, decay: 0.3 });
  }

  bubble() {
    const f = 300 + Math.random() * 500;
    this.tone({ freq: f, freq2: f * 2.2, peak: 0.08, attack: 0.01, decay: 0.09 });
  }

  /** A scroll piece found: a small rising phrase on plucked strings. */
  chime() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [62, 66, 69, 74].forEach((n, i) => this.pluck(midi(n), t + i * 0.085, 0.3, this.sfx, 0.6));
    this.tone({ t: t + 0.3, freq: midi(86), peak: 0.07, attack: 0.02, decay: 1.2, verb: 0.8 });
  }

  /** A verse appears: one soft low string and its fifth. */
  verse() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.pluck(midi(50), t, 0.26, this.sfx, 0.7);
    this.pluck(midi(57), t + 0.12, 0.2, this.sfx, 0.7);
  }

  ui(kind: 'move' | 'ok' | 'back') {
    if (kind === 'move') this.tone({ freq: 660, peak: 0.06, decay: 0.05, type: 'triangle' });
    else if (kind === 'ok') {
      this.tone({ freq: 523, peak: 0.1, decay: 0.09, type: 'triangle' });
      this.tone({ t: (this.ctx?.currentTime ?? 0) + 0.06, freq: 784, peak: 0.1, decay: 0.14, type: 'triangle' });
    } else this.tone({ freq: 392, freq2: 300, peak: 0.08, decay: 0.1, type: 'triangle' });
  }

  /** A good thing done (a job finished, a stage cleared). */
  good() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [57, 62, 66].forEach((n, i) => this.pluck(midi(n + 12), t + i * 0.07, 0.22, this.sfx, 0.5));
  }

  /** Something went wrong (a cargo lost, a slip). */
  bad() {
    this.tone({ freq: 196, freq2: 147, peak: 0.16, decay: 0.3, type: 'sawtooth', lp: 700 });
  }

  tick(pitch = 1) {
    this.tone({ freq: 880 * pitch, peak: 0.07, decay: 0.04, type: 'square', lp: 2400 });
  }

  /** Thunder: a crack, then a long roll. `distance` 0 is overhead, 1 is far. */
  thunder(distance = 0.3) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + distance * 1.2;
    const near = 1 - distance;
    if (near > 0.4) this.burst({ t, type: 'highpass', freq: 1200, peak: 0.5 * near, attack: 0.002, decay: 0.18, verb: 0.5 });
    this.burst({ t: t + 0.03, type: 'lowpass', freq: 400, freq2: 60, peak: 0.9 * (0.4 + near * 0.6), attack: 0.02, decay: 2.6 + distance * 2, buffer: this.brown, verb: 0.6 });
    this.burst({ t: t + 0.5, type: 'lowpass', freq: 160, freq2: 50, peak: 0.6 * (0.4 + near * 0.6), attack: 0.3, decay: 3.2, buffer: this.brown, verb: 0.4 });
    this.tone({ t, freq: 55, freq2: 30, peak: 0.5 * near, attack: 0.01, decay: 1.4 });
  }

  /** A timber groaning. */
  creak(vol = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.5 + Math.random() * 0.8;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f0 = 70 + Math.random() * 60;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.7), t + dur);
    // the stick-slip rattle of wood on wood
    const am = ctx.createOscillator();
    am.frequency.value = 18 + Math.random() * 20;
    const amGain = ctx.createGain();
    amGain.gain.value = 0.5;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    am.connect(amGain).connect(g.gain);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500 + Math.random() * 500;
    bp.Q.value = 3;
    const out = ctx.createGain();
    this.env(out, t, 0.11 * vol, dur * 0.3, dur * 0.7);
    osc.connect(g).connect(bp).connect(out).connect(this.sfx);
    osc.start(t);
    am.start(t);
    osc.stop(t + dur + 0.1);
    am.stop(t + dur + 0.1);
  }

  /** A rope hauled tight. */
  rope() {
    this.burst({ freq: 600, freq2: 1400, q: 3, peak: 0.2, attack: 0.02, decay: 0.2 });
    this.tone({ freq: 180, freq2: 260, peak: 0.12, decay: 0.16, type: 'sawtooth', lp: 800 });
  }

  /** Water thrown from a bucket. */
  slosh() {
    this.burst({ freq: 700, freq2: 1500, q: 0.7, peak: 0.3, attack: 0.03, decay: 0.3 });
  }

  /** A man's shout: a short voiced bark, pitched. */
  shout(pitch = 1, vol = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f = 150 * pitch;
    osc.frequency.setValueAtTime(f * 0.9, t);
    osc.frequency.linearRampToValueAtTime(f * 1.25, t + 0.08);
    osc.frequency.linearRampToValueAtTime(f * 0.85, t + 0.36);
    const g = ctx.createGain();
    this.env(g, t, 0.16 * vol, 0.03, 0.36);
    // two formants make it a voice rather than a buzz
    for (const [freq, q, gain] of [
      [700, 5, 1],
      [1150, 7, 0.6],
    ]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const fg = ctx.createGain();
      fg.gain.value = gain;
      osc.connect(bp).connect(fg).connect(g);
    }
    g.connect(this.sfx);
    const s = ctx.createGain();
    s.gain.value = 0.35;
    g.connect(s).connect(this.verbSend);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /** Jonah's cry in Nineveh: longer, carrying. */
  cry() {
    this.shout(0.85, 1.3);
    const ctx = this.ctx;
    if (ctx) this.tone({ t: ctx.currentTime + 0.05, freq: 233, freq2: 196, peak: 0.07, attack: 0.05, decay: 0.9, type: 'triangle', verb: 0.9 });
  }

  heartbeat() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.tone({ t, freq: 70, freq2: 40, peak: 0.5, decay: 0.14 });
    this.tone({ t: t + 0.18, freq: 60, freq2: 36, peak: 0.36, decay: 0.16 });
  }

  /** A lot shaken in a pot, a stone cast down. */
  rattle() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) this.burst({ t: t + i * 0.045 + Math.random() * 0.02, freq: 2400 + Math.random() * 1800, q: 4, peak: 0.14, decay: 0.03 });
  }

  /** A gust arriving. */
  gust(strength = 1) {
    this.burst({ freq: 300, freq2: 900, q: 0.8, peak: 0.3 * strength, attack: 0.5, decay: 1.4, buffer: this.pink, out: this.amb });
  }

  gull() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const f = 1500 + Math.random() * 500;
      this.tone({ t: t + i * 0.24, freq: f, freq2: f * 0.7, peak: 0.035, attack: 0.03, decay: 0.2, type: 'sawtooth', lp: 3200, verb: 0.5 });
    }
  }

  /** The great fish: a long low call. */
  whale() {
    this.tone({ freq: 70, freq2: 140, peak: 0.4, attack: 0.6, decay: 2.6, type: 'sine', verb: 1, vibrato: 3 });
    this.tone({ freq: 210, freq2: 300, peak: 0.08, attack: 0.9, decay: 2.2, type: 'triangle', verb: 1 });
  }

  /** A deep swell of sound for a great moment. */
  swell(freq = 110) {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const m of [1, 1.5, 2, 3]) this.tone({ freq: freq * m, peak: 0.1 / m, attack: 1.4, decay: 3, type: 'triangle', verb: 0.9, detune: (Math.random() - 0.5) * 14 });
  }

  // ---- beds: weather that plays on ------------------------------------------------------------------------------

  private makeBed(name: BedName): Bed | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.amb);
    const loop = (buffer: AudioBuffer, rate = 1) => {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.playbackRate.value = rate;
      s.start(0, Math.random() * 1.5);
      return s;
    };
    const lfo = (freq: number, depth: number, param: AudioParam) => {
      const o = ctx.createOscillator();
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = depth;
      o.connect(g).connect(param);
      o.start();
    };
    const bed: Bed = { gain, level: 0, target: 0 };
    if (name === 'wind') {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 520;
      bp.Q.value = 0.9;
      lfo(0.13, 220, bp.frequency);
      lfo(0.31, 90, bp.frequency);
      const g1 = ctx.createGain();
      g1.gain.value = 0.9;
      lfo(0.21, 0.25, g1.gain);
      loop(this.pink).connect(bp).connect(g1).connect(gain);
      // the whistle in the rigging
      const hi = ctx.createBiquadFilter();
      hi.type = 'bandpass';
      hi.frequency.value = 1900;
      hi.Q.value = 9;
      lfo(0.17, 500, hi.frequency);
      const g2 = ctx.createGain();
      g2.gain.value = 0.16;
      lfo(0.09, 0.12, g2.gain);
      loop(this.white, 0.9).connect(hi).connect(g2).connect(gain);
    } else if (name === 'rain') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2200;
      const g1 = ctx.createGain();
      g1.gain.value = 0.3;
      loop(this.white).connect(hp).connect(g1).connect(gain);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900;
      bp.Q.value = 0.6;
      const g2 = ctx.createGain();
      g2.gain.value = 0.3;
      lfo(0.4, 0.08, g2.gain);
      loop(this.pink, 1.1).connect(bp).connect(g2).connect(gain);
    } else if (name === 'waves') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      lfo(0.11, 260, lp.frequency);
      const g1 = ctx.createGain();
      g1.gain.value = 1.0;
      lfo(0.11, 0.45, g1.gain);
      loop(this.brown).connect(lp).connect(g1).connect(gain);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 0.5;
      const g2 = ctx.createGain();
      g2.gain.value = 0.1;
      lfo(0.11, 0.09, g2.gain);
      loop(this.white, 0.8).connect(bp).connect(g2).connect(gain);
    } else if (name === 'deep') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 170;
      lfo(0.07, 60, lp.frequency);
      const g1 = ctx.createGain();
      g1.gain.value = 1.6;
      loop(this.brown, 0.7).connect(lp).connect(g1).connect(gain);
      const o = ctx.createOscillator();
      o.frequency.value = 46;
      const og = ctx.createGain();
      og.gain.value = 0.12;
      lfo(0.05, 0.08, og.gain);
      o.connect(og).connect(gain);
      o.start();
    } else if (name === 'crowd') {
      for (const [f, q, v, r] of [
        [420, 1.2, 0.5, 0.7],
        [900, 1.6, 0.35, 0.9],
        [1500, 2.2, 0.16, 1.1],
      ]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f;
        bp.Q.value = q;
        lfo(0.3 + Math.random() * 0.5, f * 0.25, bp.frequency);
        const g = ctx.createGain();
        g.gain.value = v;
        lfo(0.7 + Math.random(), v * 0.5, g.gain);
        loop(this.pink, r).connect(bp).connect(g).connect(gain);
      }
    } else if (name === 'heat') {
      // a dry hiss and a thin high shimmer
      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 3200;
      hp.Q.value = 0.7;
      lfo(0.23, 900, hp.frequency);
      const g1 = ctx.createGain();
      g1.gain.value = 0.22;
      loop(this.white).connect(hp).connect(g1).connect(gain);
      const o = ctx.createOscillator();
      o.frequency.value = 3960;
      const og = ctx.createGain();
      og.gain.value = 0.006;
      lfo(6.3, 0.005, og.gain);
      o.connect(og).connect(gain);
      o.start();
    }
    return bed;
  }

  /** Sets how loud a weather bed is, 0..1. It fades there. */
  bed(name: BedName, level: number) {
    if (!this.ctx) {
      this.pendingBeds[name] = level;
      return;
    }
    let b = this.beds.get(name);
    if (!b) {
      if (level <= 0) return;
      b = this.makeBed(name) ?? undefined;
      if (!b) return;
      this.beds.set(name, b);
    }
    b.target = clamp(level, 0, 1.5);
  }

  /** All beds to silence (a chapter ending). */
  quiet() {
    this.pendingBeds = {};
    for (const b of this.beds.values()) b.target = 0;
    this.creakEvery = 0;
    this.gullEvery = 0;
  }

  // ---- the score ------------------------------------------------------------------------------------------------

  private pluck(freq: number, t: number, peak: number, out: AudioNode, verb = 0.4) {
    const ctx = this.ctx;
    if (!ctx) return;
    // a struck string: a bright start that dulls quickly
    const o1 = ctx.createOscillator();
    o1.type = 'triangle';
    o1.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = freq * 2.001;
    const o2g = ctx.createGain();
    o2g.gain.setValueAtTime(0.35, t);
    o2g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(8000, freq * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), t + 0.5);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.004, 1.1);
    o1.connect(lp);
    o2.connect(o2g).connect(lp);
    lp.connect(g).connect(out);
    const s = ctx.createGain();
    s.gain.value = verb;
    g.connect(s).connect(this.verbSend);
    o1.start(t);
    o2.start(t);
    o1.stop(t + 1.3);
    o2.stop(t + 1.3);
  }

  private flute(freq: number, t: number, dur: number, peak: number, out: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 0.985, t);
    o.frequency.linearRampToValueAtTime(freq, t + 0.12);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5;
    const vg = ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(freq * 0.012, t + dur * 0.6);
    vib.connect(vg).connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.1);
    g.gain.setValueAtTime(peak, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // breath
    const n = ctx.createBufferSource();
    n.buffer = this.pink;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 2;
    const ng = ctx.createGain();
    ng.gain.value = 0.25;
    n.connect(bp).connect(ng).connect(g);
    o.connect(g).connect(out);
    const s = ctx.createGain();
    s.gain.value = 0.7;
    g.connect(s).connect(this.verbSend);
    o.start(t);
    vib.start(t);
    n.start(t, Math.random());
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
    n.stop(t + dur + 0.05);
  }

  private drum(low: boolean, t: number, peak: number, out: AudioNode) {
    if (low) {
      this.tone({ t, freq: 120, freq2: 52, peak, decay: 0.3, out, verb: 0.25 });
      this.burst({ t, type: 'lowpass', freq: 500, peak: peak * 0.5, decay: 0.08, out });
    } else {
      this.burst({ t, freq: 1700, q: 2.5, peak: peak * 0.5, decay: 0.06, out, verb: 0.2 });
      this.tone({ t, freq: 330, freq2: 250, peak: peak * 0.3, decay: 0.07, type: 'triangle', out });
    }
  }

  private bell(freq: number, t: number, peak: number, out: AudioNode) {
    for (const [m, v, d] of [
      [1, 1, 3.2],
      [2.76, 0.35, 1.8],
      [5.4, 0.15, 0.9],
    ]) this.tone({ t, freq: freq * m, peak: peak * v, attack: 0.01, decay: d, out, verb: 1 });
  }

  private note(degree: number, octave = 0): number {
    const sc = this.score!;
    const n = sc.scale.length;
    const d = ((degree % n) + n) % n;
    const o = Math.floor(degree / n) + octave;
    return midi(sc.root + sc.scale[d] + o * 12);
  }

  /** Starts a chapter's music (or stops it with null). Cross-fades. */
  play(name: ScoreName | null) {
    if (!this.ctx) {
      this.pendingScore = name;
      return;
    }
    if (name === this.scoreName) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    if (this.scoreGain) {
      const old = this.scoreGain;
      const oldDrone = this.droneNodes;
      old.gain.cancelScheduledValues(t);
      old.gain.setTargetAtTime(0, t, 0.8);
      setTimeout(() => {
        oldDrone?.stop();
        old.disconnect();
      }, 4000);
    }
    this.scoreName = name;
    this.score = name ? SCORES[name] : null;
    this.scoreGain = null;
    this.droneNodes = null;
    if (!this.score) return;
    const sc = this.score;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(1, t, 1.2);
    g.connect(this.music);
    this.scoreGain = g;
    this.nextStep = t + 0.4;
    this.step = 0;
    this.melodyDegree = 0;
    // the drone: root and fifth, slightly detuned, slowly breathing
    if (sc.drone > 0) {
      const nodes: OscillatorNode[] = [];
      const dg = ctx.createGain();
      dg.gain.value = sc.drone * 0.16;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      const l = ctx.createOscillator();
      l.frequency.value = 0.08;
      const lg = ctx.createGain();
      lg.gain.value = 160;
      l.connect(lg).connect(lp.frequency);
      l.start();
      nodes.push(l);
      for (const [semi, det, type] of [
        [-12, -6, 'sawtooth'],
        [-12, 7, 'sawtooth'],
        [-5, 3, 'triangle'],
        [0, -4, 'triangle'],
      ] as [number, number, OscillatorType][]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midi(sc.root + semi);
        o.detune.value = det;
        o.connect(lp);
        o.start();
        nodes.push(o);
      }
      lp.connect(dg).connect(g);
      const s = ctx.createGain();
      s.gain.value = 0.5;
      dg.connect(s).connect(this.verbSend);
      this.droneNodes = { stop: () => nodes.forEach((n) => n.stop()) };
    }
  }

  private schedule(now: number) {
    const sc = this.score;
    const out = this.scoreGain;
    if (!sc || !out || !this.ctx) return;
    const stepDur = 60 / sc.bpm / sc.div;
    const I = this.intensity;
    while (this.nextStep < now + 0.25) {
      const t = this.nextStep;
      const i = this.step % 8;
      const bar = Math.floor(this.step / 8);
      // drum
      if (sc.drum > 0 && I > 0.15) {
        const p = sc.pattern[i];
        if (p === 2) this.drum(true, t, 0.5 * sc.drum * (0.5 + I * 0.5), out);
        else if (p === 1 && I > 0.4) this.drum(false, t, 0.4 * sc.drum * I, out);
        else if (p === 0 && I > 0.85 && this.rng.chance(0.3)) this.drum(false, t, 0.18 * sc.drum, out);
      }
      // pad: a chord every two bars
      if (sc.pad > 0 && this.step % 16 === 0) {
        const base = [0, 3, 4, 5][bar % 4 >> 0] ?? 0;
        const rootDeg = this.rng.chance(0.6) ? 0 : base;
        for (const d of [rootDeg, rootDeg + 2, rootDeg + 4]) {
          this.tone({ t, freq: this.note(d, 0), peak: 0.055 * sc.pad, attack: stepDur * 6, decay: stepDur * 12, type: 'triangle', out, verb: 0.8, detune: this.rng.range(-6, 6) });
        }
      }
      // lyre: a wandering line with rests
      if (sc.lyre > 0) {
        if (this.restFor > 0) this.restFor--;
        else if (this.rng.chance(0.35 + I * 0.4)) {
          this.melodyDegree = clamp(this.melodyDegree + this.rng.pick([-2, -1, -1, 1, 1, 2, 3, -3]), -3, 9);
          if (i === 0 && this.rng.chance(0.5)) this.melodyDegree = this.rng.pick([0, 2, 4]);
          this.pluck(this.note(this.melodyDegree, 1), t, 0.2 * sc.lyre, out);
          if (this.rng.chance(0.15)) this.pluck(this.note(this.melodyDegree + 2, 1), t + stepDur * 0.5, 0.12 * sc.lyre, out);
        } else if (this.rng.chance(0.2)) this.restFor = this.rng.int(1, 3);
      }
      // flute: a long note now and then
      if (sc.flute > 0 && i === 0 && this.rng.chance(0.3 + I * 0.25)) {
        const d = this.rng.pick([0, 1, 2, 4, 5, 7]);
        this.flute(this.note(d, 1), t, stepDur * this.rng.pick([4, 6, 8]), 0.09 * sc.flute, out);
        if (this.rng.chance(0.5)) this.flute(this.note(d + this.rng.pick([-1, 1, 2]), 1), t + stepDur * 4, stepDur * 4, 0.07 * sc.flute, out);
      }
      // bells: sparse, for the deep
      if (sc.bell > 0 && this.rng.chance(0.12)) {
        this.bell(this.note(this.rng.pick([0, 1, 2, 3, 4, 5, 7]), 2), t, 0.07 * sc.bell, out);
      }
      this.nextStep += stepDur;
      this.step++;
    }
  }

  /** Once a frame. */
  update(dt: number) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    for (const b of this.beds.values()) {
      if (Math.abs(b.level - b.target) > 0.001) {
        b.level += (b.target - b.level) * (1 - Math.exp(-dt * 1.4));
        b.gain.gain.setTargetAtTime(b.level * 0.5, now, 0.05);
      }
    }
    // if the tab slept, do not try to catch up on every missed beat
    if (this.nextStep < now - 0.5) this.nextStep = now + 0.05;
    this.schedule(now);
    if (this.creakEvery > 0) {
      this.creakIn -= dt;
      if (this.creakIn <= 0) {
        this.creakIn = this.creakEvery * (0.5 + Math.random());
        this.creak(0.7 + Math.random() * 0.6);
      }
    }
    if (this.gullEvery > 0) {
      this.gullIn -= dt;
      if (this.gullIn <= 0) {
        this.gullIn = this.gullEvery * (0.5 + Math.random());
        this.gull();
      }
    }
  }
}
