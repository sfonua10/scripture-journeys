// The heads-up display: objective, scroll count, prompt, meters, verse banners, world markers, bars and fades.
import * as THREE from 'three';
import type { Device } from '../core/input';
import { formatTime } from '../core/util';
import type { Quote } from '../game/verses';
import type { Focus } from '../player/controller';

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

interface BannerItem {
  who?: string;
  text: string;
  ref?: string;
  block: boolean;
  seconds: number;
  kind: 'verse' | 'plain' | 'scroll';
  done: boolean;
  shown: number;
}

interface Marker {
  el: HTMLDivElement;
  ring: HTMLDivElement | null;
  pos: THREE.Vector3;
  frame: THREE.Object3D | null;
  progress: number;
}

interface MeterEl {
  el: HTMLDivElement;
  fill: HTMLElement;
  label: HTMLElement;
  value: HTMLElement;
}

/** A diamond of four dots, one filled: which face button, by where it sits on a controller. */
function padGlyph(which: 'bottom' | 'left' | 'top' | 'right'): string {
  const dot = (x: number, y: number, on: boolean) => `<circle cx="${x}" cy="${y}" r="5" fill="${on ? '#e3b866' : 'none'}" stroke="#f3e9d2" stroke-width="1.6"/>`;
  return `<svg viewBox="0 0 32 32">${dot(16, 7, which === 'top')}${dot(7, 16, which === 'left')}${dot(25, 16, which === 'right')}${dot(16, 25, which === 'bottom')}</svg>`;
}

const _v = new THREE.Vector3();

export class Hud {
  device: Device = 'keys';
  /** Set when the bot plays: blocking banners dismiss themselves. */
  auto = false;
  onPause: () => void = () => {};

  private objectiveEl: HTMLDivElement;
  private objectiveText: HTMLSpanElement;
  private scrollsEl: HTMLDivElement;
  private timerEl: HTMLDivElement;
  private pauseBtn: HTMLButtonElement;
  private metersEl: HTMLDivElement;
  private promptEl: HTMLDivElement;
  private promptKey: HTMLSpanElement;
  private promptText: HTMLSpanElement;
  private bannerEl: HTMLDivElement;
  private bannerWho: HTMLDivElement;
  private bannerText: HTMLDivElement;
  private bannerRef: HTMLSpanElement;
  private bannerMore: HTMLSpanElement;
  private toastEl: HTMLDivElement;
  private barsEl: HTMLDivElement;
  private fpsEl: HTMLDivElement | null = null;
  private markersEl: HTMLDivElement;

  private queue: BannerItem[] = [];
  private current: BannerItem | null = null;
  private bannerGap = 0;
  private toastT = 0;
  private meters = new Map<string, MeterEl>();
  private markers = new Map<string, Marker>();
  private fadeEl: HTMLElement;
  private fadeFrom = 0;
  private fadeTo = 0;
  private fadeT = 1;
  private fadeDur = 1;
  private fadeNow = 0;
  private lastPrompt = '';
  private lastObjective = '';
  private cinemaOn = false;

  constructor(private root: HTMLElement) {
    this.fadeEl = document.getElementById('fade')!;
    this.markersEl = h('div');
    root.append(this.markersEl);
    const top = h('div', 'hud-top');
    this.objectiveEl = h('div', 'objective');
    this.objectiveEl.append(h('i'));
    this.objectiveText = h('span');
    this.objectiveEl.append(this.objectiveText);
    const right = h('div', 'hud-right');
    const row = h('div', 'hud-row');
    this.scrollsEl = h('div', 'scrolls');
    for (let i = 0; i < 3; i++) this.scrollsEl.append(h('b'));
    this.pauseBtn = h('button', 'icon-btn');
    this.pauseBtn.setAttribute('aria-label', 'Pause');
    this.pauseBtn.append(h('span'));
    this.pauseBtn.addEventListener('click', () => this.onPause());
    row.append(this.scrollsEl, this.pauseBtn);
    this.timerEl = h('div', 'timer');
    this.timerEl.style.display = 'none';
    right.append(row, this.timerEl);
    top.append(this.objectiveEl, right);
    this.metersEl = h('div', 'meters');
    this.promptEl = h('div', 'prompt');
    this.promptKey = h('span', 'keycap');
    this.promptText = h('span');
    this.promptEl.append(this.promptKey, this.promptText);
    this.bannerEl = h('div', 'banner');
    this.bannerWho = h('div', 'who');
    this.bannerText = h('div', 'text');
    const ref = h('div', 'ref');
    this.bannerRef = h('span');
    this.bannerMore = h('span', 'more');
    ref.append(this.bannerRef, this.bannerMore);
    this.bannerEl.append(this.bannerWho, this.bannerText, ref);
    this.bannerEl.addEventListener('pointerdown', () => this.confirm());
    this.toastEl = h('div', 'toast');
    this.barsEl = h('div', 'bars');
    root.append(this.barsEl, top, this.metersEl, this.promptEl, this.bannerEl, this.toastEl);
  }

  // ---- objective, scrolls, timer -------------------------------------------------------------------------------

  objective(text: string | null, sub?: string) {
    const key = `${text}|${sub ?? ''}`;
    if (key === this.lastObjective) return;
    this.lastObjective = key;
    if (!text) {
      this.objectiveEl.classList.remove('show');
      return;
    }
    this.objectiveText.textContent = text;
    if (sub) {
      const s = h('small', undefined, sub);
      this.objectiveText.append(s);
    }
    this.objectiveEl.classList.add('show');
    this.objectiveEl.classList.remove('pulse');
    void this.objectiveEl.offsetWidth;
    this.objectiveEl.classList.add('pulse');
  }

  setScrolls(found: readonly boolean[]) {
    const kids = this.scrollsEl.children;
    for (let i = 0; i < 3; i++) kids[i].classList.toggle('on', !!found[i]);
  }

  setTimer(seconds: number | null) {
    if (seconds === null) {
      this.timerEl.style.display = 'none';
      return;
    }
    this.timerEl.style.display = '';
    this.timerEl.textContent = formatTime(seconds);
  }

  showChrome(on: boolean) {
    this.scrollsEl.style.visibility = on ? '' : 'hidden';
    this.pauseBtn.style.visibility = on ? '' : 'hidden';
  }

  // ---- prompt --------------------------------------------------------------------------------------------------

  prompt(focus: Focus | null) {
    if (!focus || focus.quiet || this.cinemaOn || this.current?.block) {
      if (this.lastPrompt) {
        this.promptEl.classList.remove('show');
        this.lastPrompt = '';
      }
      return;
    }
    const key = `${focus.prompt}|${this.device}`;
    if (key !== this.lastPrompt) {
      this.lastPrompt = key;
      this.promptText.textContent = focus.prompt;
      if (this.device === 'pad') {
        this.promptKey.className = 'keycap pad';
        this.promptKey.innerHTML = padGlyph('left');
      } else if (this.device === 'touch') {
        this.promptKey.className = 'keycap';
        this.promptKey.textContent = '●';
      } else {
        this.promptKey.className = 'keycap';
        this.promptKey.textContent = 'E';
      }
      this.promptEl.classList.add('show');
    }
    this.promptKey.classList.toggle('ring', focus.progress > 0);
    this.promptKey.style.setProperty('--p', String(focus.progress));
  }

  // ---- meters --------------------------------------------------------------------------------------------------

  meter(id: string, opts: { label: string; value: number; text?: string; danger?: boolean; good?: boolean } | null) {
    let m = this.meters.get(id);
    if (!opts) {
      if (m) {
        m.el.remove();
        this.meters.delete(id);
        this.root.style.setProperty('--meters', String(this.meters.size));
      }
      return;
    }
    if (!m) {
      const el = h('div', 'meter');
      const label = h('label');
      const name = h('span');
      const value = h('span');
      label.append(name, value);
      const bar = h('div', 'bar');
      const fill = h('i');
      bar.append(fill);
      el.append(label, bar);
      this.metersEl.append(el);
      m = { el, fill, label: name, value };
      this.meters.set(id, m);
      this.root.style.setProperty('--meters', String(this.meters.size));
    }
    m.label.textContent = opts.label;
    m.value.textContent = opts.text ?? '';
    m.fill.style.width = `${Math.max(0, Math.min(1, opts.value)) * 100}%`;
    m.el.classList.toggle('danger', !!opts.danger);
    m.el.classList.toggle('good', !!opts.good);
  }

  // ---- banners: verses and lines -------------------------------------------------------------------------------

  private push(item: BannerItem): () => boolean {
    this.queue.push(item);
    return () => item.done;
  }

  /** Shows a verse. Returns a test for "it has been read". */
  verse(q: Quote, opts: { block?: boolean; seconds?: number; who?: string } = {}): () => boolean {
    return this.push({ who: opts.who, text: q.text, ref: q.ref, block: !!opts.block, seconds: opts.seconds ?? 2.6 + q.text.length * 0.05, kind: 'verse', done: false, shown: 0 });
  }

  /** Shows a scroll piece's verse. */
  scroll(q: Quote, n: number): () => boolean {
    return this.push({ who: `Scroll piece ${n} of 3`, text: q.text, ref: q.ref, block: false, seconds: 3.2 + q.text.length * 0.05, kind: 'scroll', done: false, shown: 0 });
  }

  /** Shows a spoken line that is not scripture. */
  say(who: string, text: string, opts: { block?: boolean; seconds?: number } = {}): () => boolean {
    return this.push({ who, text, block: !!opts.block, seconds: opts.seconds ?? 2.2 + text.length * 0.05, kind: 'plain', done: false, shown: 0 });
  }

  /** Whether a banner that must be dismissed is up (gameplay input waits). */
  get blocking(): boolean {
    return !!this.current?.block;
  }

  get bannerBusy(): boolean {
    return !!this.current || this.queue.length > 0;
  }

  /** The confirm button: dismisses a blocking banner (or hurries a passing one). True if it did. */
  confirm(): boolean {
    const c = this.current;
    if (!c) return false;
    if (c.block) {
      if (c.shown < 0.45) return true;
      this.endBanner();
      return true;
    }
    return false;
  }

  /** Drops every banner (a chapter ending). */
  clearBanners() {
    for (const q of this.queue) q.done = true;
    this.queue = [];
    if (this.current) this.endBanner();
  }

  private endBanner() {
    if (!this.current) return;
    this.current.done = true;
    this.current = null;
    this.bannerEl.classList.remove('show');
    this.bannerGap = 0.35;
  }

  private showBanner(item: BannerItem) {
    this.current = item;
    this.bannerEl.className = `banner show${item.block ? ' block' : ''}${item.kind === 'plain' ? ' plain' : ''}${item.kind === 'scroll' ? ' scroll' : ''}`;
    this.bannerWho.textContent = item.who ?? '';
    this.bannerWho.style.display = item.who ? '' : 'none';
    this.bannerText.textContent = item.text;
    this.bannerRef.textContent = item.ref ?? '';
    this.bannerMore.textContent = item.block ? (this.device === 'touch' ? 'Tap' : this.device === 'pad' ? 'Press' : 'Enter') + ' ›' : '';
    (this.bannerRef.parentElement as HTMLElement).style.display = item.ref || item.block ? '' : 'none';
  }

  toast(text: string, seconds = 2.4) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastT = seconds;
  }

  // ---- markers -------------------------------------------------------------------------------------------------

  /** A diamond over a place in the world. Pass null to remove it. */
  marker(id: string, pos: THREE.Vector3 | null, opts: { label?: string; urgent?: boolean; frame?: THREE.Object3D | null; progress?: number } = {}) {
    let m = this.markers.get(id);
    if (!pos) {
      if (m) {
        m.el.remove();
        this.markers.delete(id);
      }
      return;
    }
    if (!m) {
      const el = h('div', 'marker');
      el.append(h('i'));
      if (opts.label) el.append(h('span', undefined, opts.label));
      this.markersEl.append(el);
      m = { el, ring: null, pos: new THREE.Vector3(), frame: null, progress: 0 };
      this.markers.set(id, m);
    }
    m.pos.copy(pos);
    m.frame = opts.frame ?? null;
    m.el.classList.toggle('urgent', !!opts.urgent);
    const p = opts.progress ?? 0;
    if (p > 0 && !m.ring) {
      m.ring = h('div', 'ring');
      m.el.append(m.ring);
    }
    if (m.ring) {
      m.ring.style.setProperty('--p', String(p));
      m.ring.style.display = p > 0 ? '' : 'none';
    }
  }

  clearMarkers() {
    for (const m of this.markers.values()) m.el.remove();
    this.markers.clear();
  }

  // ---- bars and fades ------------------------------------------------------------------------------------------

  /** Cinema bars: on for staged scenes (the prompt and markers hide). */
  cinema(on: boolean) {
    this.cinemaOn = on;
    this.barsEl.classList.toggle('on', on);
    this.root.classList.toggle('cinema', on);
    this.markersEl.style.opacity = on ? '0' : '1';
    this.objectiveEl.style.opacity = on ? '0' : '';
    this.metersEl.style.opacity = on ? '0' : '';
    document.getElementById('touch')?.classList.toggle('hidden', on);
  }

  get inCinema() {
    return this.cinemaOn;
  }

  /** Fades the whole picture to (or from) a colour. Returns a test for "done". */
  fade(to: number, seconds = 0.8, color = '#000'): () => boolean {
    this.fadeEl.style.background = color;
    this.fadeFrom = this.fadeNow;
    this.fadeTo = to;
    this.fadeDur = Math.max(0.001, seconds);
    this.fadeT = 0;
    if (seconds <= 0) {
      this.fadeT = 1;
      this.fadeNow = to;
      this.fadeEl.style.opacity = String(to);
    }
    return () => this.fadeT >= 1;
  }

  hide(on: boolean) {
    this.root.classList.toggle('hidden', on);
  }

  showFps(text: string | null) {
    if (text === null) {
      this.fpsEl?.remove();
      this.fpsEl = null;
      return;
    }
    if (!this.fpsEl) {
      this.fpsEl = h('div', 'fps');
      this.root.append(this.fpsEl);
    }
    this.fpsEl.textContent = text;
  }

  /** Clears everything a chapter put up. */
  reset() {
    this.clearBanners();
    this.clearMarkers();
    for (const id of [...this.meters.keys()]) this.meter(id, null);
    this.objective(null);
    this.cinema(false);
    this.prompt(null);
    this.toastEl.classList.remove('show');
  }

  // ---- every frame ---------------------------------------------------------------------------------------------

  update(dt: number, camera: THREE.Camera) {
    // banners
    if (this.current) {
      const c = this.current;
      c.shown += dt;
      if (!c.block && c.shown >= c.seconds) this.endBanner();
      else if (c.block && this.auto && c.shown > 0.5) this.endBanner();
    } else if (this.queue.length) {
      this.bannerGap -= dt;
      if (this.bannerGap <= 0) this.showBanner(this.queue.shift()!);
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.classList.remove('show');
    }
    if (this.fadeT < 1) {
      this.fadeT = Math.min(1, this.fadeT + dt / this.fadeDur);
      const t = this.fadeT * this.fadeT * (3 - 2 * this.fadeT);
      this.fadeNow = this.fadeFrom + (this.fadeTo - this.fadeFrom) * t;
      this.fadeEl.style.opacity = this.fadeNow.toFixed(3);
    }
    // markers
    if (this.markers.size) {
      const w = this.root.clientWidth;
      const hgt = this.root.clientHeight;
      const pad = 34;
      for (const m of this.markers.values()) {
        _v.copy(m.pos);
        if (m.frame) m.frame.localToWorld(_v);
        _v.project(camera);
        const behind = _v.z > 1;
        let x = (_v.x * 0.5 + 0.5) * w;
        let y = (-_v.y * 0.5 + 0.5) * hgt;
        if (behind) {
          x = w - x;
          y = hgt - pad;
        }
        const cx = Math.max(pad, Math.min(w - pad, x));
        const cy = Math.max(pad + 40, Math.min(hgt - pad - 60, y));
        const edge = behind || cx !== x || cy !== y;
        m.el.classList.toggle('edge', edge);
        m.el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
      }
    }
  }
}
