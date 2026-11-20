// Title, chapters, settings, pause, the chapter card, the result, the gallery and the ending.
// Every screen works with keyboard, mouse, touch and a controller alone.
import type { UiEvent } from '../core/input';
import type { QualityChoice } from '../core/quality';
import type { Save } from '../core/save';
import { formatTime } from '../core/util';
import { CHAPTERS, type ChapterMeta } from '../game/chapters';
import { cite, part } from '../game/verses';
import { h } from './hud';

export interface MenuHost {
  save: Save;
  /** The chapter being played, or 0 at the title. */
  current: number;
  startChapter(n: number): void;
  resume(): void;
  restart(): void;
  toTitle(): void;
  applySettings(): void;
  sound(kind: 'move' | 'ok' | 'back'): void;
}

export interface ResultData {
  meta: ChapterMeta;
  time: number;
  best: number | null;
  newBest: boolean;
  scrolls: number;
  challenge: boolean;
  stars: number;
  last: boolean;
  plateWon: boolean;
  costumeWon: boolean;
}

type ScreenName = 'title' | 'chapters' | 'settings' | 'pause' | 'gallery' | 'ending' | 'card' | 'result';

const STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.4 5.9 20.8l1.4-6.8L2.2 9.3l6.9-.8z"/></svg>';

function stars(n: number, big = false): HTMLElement {
  const el = h('span', `stars${big ? ' big' : ''}`);
  el.innerHTML = STAR.repeat(3);
  [...el.children].forEach((c, i) => c.classList.toggle('on', i < n));
  return el;
}

const ROMAN = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];

export class Menus {
  private root: HTMLElement;
  private screen: HTMLElement | null = null;
  private name: ScreenName | null = null;
  private stack: ScreenName[] = [];
  private focusables: HTMLElement[] = [];
  private focus = 0;
  private onConfirm: (() => void) | null = null;
  private opened = 0;
  private resultData: ResultData | null = null;
  private onResult: ((next: 'continue' | 'again' | 'chapters') => void) | null = null;

  constructor(private host: MenuHost) {
    this.root = document.getElementById('overlay')!;
  }

  get active(): boolean {
    return this.name !== null;
  }
  get which(): ScreenName | null {
    return this.name;
  }

  // ---- plumbing ------------------------------------------------------------------------------------------------

  private mount(name: ScreenName, cls: string, build: (s: HTMLElement) => void) {
    const old = this.screen;
    if (old) {
      old.classList.remove('show');
      setTimeout(() => old.remove(), 450);
    }
    const s = h('div', `screen ${cls}`);
    this.focusables = [];
    this.onConfirm = null;
    build(s);
    this.root.append(s);
    this.screen = s;
    this.name = name;
    this.opened = performance.now();
    void s.offsetWidth;
    s.classList.add('show');
    this.setFocus(0, false);
  }

  close() {
    const old = this.screen;
    if (old) {
      old.classList.remove('show');
      setTimeout(() => old.remove(), 450);
    }
    this.screen = null;
    this.name = null;
    this.stack = [];
    this.focusables = [];
  }

  private focusable<T extends HTMLElement>(el: T, act: () => void, adjust?: (dir: number) => void): T {
    const i = this.focusables.length;
    this.focusables.push(el);
    (el as unknown as { _act: () => void })._act = act;
    (el as unknown as { _adjust?: (d: number) => void })._adjust = adjust;
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') this.setFocus(i, false);
    });
    el.addEventListener('click', (e) => {
      e.preventDefault();
      this.setFocus(i, false);
      this.host.sound('ok');
      act();
    });
    return el;
  }

  private setFocus(i: number, sound = true) {
    if (!this.focusables.length) return;
    const n = this.focusables.length;
    this.focus = ((i % n) + n) % n;
    this.focusables.forEach((el, k) => el.classList.toggle('focus', k === this.focus));
    const el = this.focusables[this.focus];
    el.scrollIntoView?.({ block: 'nearest' });
    if (sound) this.host.sound('move');
  }

  /** Moves focus to the nearest item in a direction, by where things are on screen. */
  private moveFocus(dx: number, dy: number) {
    const cur = this.focusables[this.focus];
    if (!cur) return;
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = -1;
    let bestScore = Infinity;
    this.focusables.forEach((el, i) => {
      if (i === this.focus || el.hasAttribute('disabled') || el.classList.contains('locked')) return;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2;
      const by = b.top + b.height / 2;
      const along = (bx - ax) * dx + (by - ay) * dy;
      if (along < 4) return;
      const across = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
      const score = along + across * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) this.setFocus(best);
  }

  /** Menu input. Returns true if a menu took it. */
  ui(e: UiEvent): boolean {
    if (!this.name) return false;
    // the press that opened a screen should not also act on it
    if (performance.now() - this.opened < 220 && (e === 'confirm' || e === 'back' || e === 'pause')) return true;
    if (this.onConfirm && (e === 'confirm' || e === 'pause')) {
      this.onConfirm();
      return true;
    }
    const el = this.focusables[this.focus] as (HTMLElement & { _act?: () => void; _adjust?: (d: number) => void }) | undefined;
    switch (e) {
      case 'up':
        this.moveFocus(0, -1);
        break;
      case 'down':
        this.moveFocus(0, 1);
        break;
      case 'left':
        if (el?._adjust) {
          el._adjust(-1);
          this.host.sound('move');
        } else this.moveFocus(-1, 0);
        break;
      case 'right':
        if (el?._adjust) {
          el._adjust(1);
          this.host.sound('move');
        } else this.moveFocus(1, 0);
        break;
      case 'confirm':
        if (el?._act) {
          this.host.sound('ok');
          el._act();
        }
        break;
      case 'back':
        this.back();
        break;
      case 'pause':
        if (this.name === 'pause') {
          this.host.sound('back');
          this.host.resume();
        } else this.back();
        break;
    }
    return true;
  }

  private back() {
    if (this.name === 'title' || this.name === 'card' || this.name === 'result' || this.name === 'ending') return;
    this.host.sound('back');
    const prev = this.stack.pop();
    if (prev) this.show(prev, false);
    else if (this.name === 'pause') this.host.resume();
    else this.show('title', false);
  }

  private go(name: ScreenName) {
    if (this.name) this.stack.push(this.name);
    this.show(name, false);
  }

  show(name: ScreenName, reset = true) {
    if (reset) this.stack = [];
    switch (name) {
      case 'title':
        return this.title();
      case 'chapters':
        return this.chapters();
      case 'settings':
        return this.settings();
      case 'pause':
        return this.pause();
      case 'gallery':
        return this.gallery();
      case 'ending':
        return this.ending();
      case 'result':
        if (this.resultData && this.onResult) return this.result(this.resultData, this.onResult);
        return;
      default:
        return;
    }
  }

  private button(parent: HTMLElement, label: string, act: () => void, opts: { small?: string; primary?: boolean; center?: boolean } = {}): HTMLButtonElement {
    const b = h('button', `btn${opts.primary ? ' primary' : ''}${opts.center ? ' center' : ''}`);
    b.append(h('span', undefined, label));
    if (opts.small) b.append(h('small', undefined, opts.small));
    parent.append(b);
    return this.focusable(b, act);
  }

  // ---- screens -------------------------------------------------------------------------------------------------

  private title() {
    const save = this.host.save;
    this.mount('title', 'title', (s) => {
      s.append(h('h1', undefined, 'Jonah'));
      s.append(h('div', 'tag', `“${part('1:1', 'Now the word', 'Amittai').text}…”`));
      const menu = h('div', 'menu');
      s.append(menu);
      const next = Math.min(6, save.data.chapter);
      if (save.hasProgress && save.data.chapter <= 6) {
        this.button(menu, 'Continue', () => this.host.startChapter(next), { primary: true, small: `${ROMAN[next - 1]} · ${CHAPTERS[next - 1].title}` });
        this.button(menu, 'Chapters', () => this.go('chapters'));
      } else if (save.hasProgress) {
        this.button(menu, 'Chapters', () => this.go('chapters'), { primary: true });
      } else {
        this.button(menu, 'Begin', () => this.host.startChapter(1), { primary: true });
        this.button(menu, 'Chapters', () => this.go('chapters'));
      }
      this.button(menu, 'Gallery', () => this.go('gallery'), { small: `${Object.keys(save.data.gallery).length} / 6` });
      this.button(menu, 'Settings', () => this.go('settings'));
    });
  }

  private chapters() {
    const save = this.host.save;
    this.mount('chapters', 'dim', (s) => {
      const p = h('div', 'panel wide');
      p.append(h('h2', undefined, 'Chapters'));
      p.append(h('div', 'sub', `${CHAPTERS.reduce((n, c) => n + save.stars(c.id), 0)} of 18 stars · ${save.totalScrolls()} of 18 scroll pieces`));
      const grid = h('div', 'chapters');
      for (const c of CHAPTERS) {
        const r = save.data.records[c.id];
        // every chapter is open to choose, reached or not
        const b = h('button', 'chap');
        b.append(h('div', 'n', `Chapter ${ROMAN[c.id - 1]}`), h('div', 't', c.title), h('div', 'r', c.passage));
        const meta = h('div', 'meta');
        meta.append(stars(save.stars(c.id)));
        meta.append(h('span', undefined, r?.bestTime != null ? formatTime(r.bestTime) : '—'));
        b.append(meta);
        grid.append(b);
        this.focusable(b, () => this.host.startChapter(c.id));
      }
      p.append(grid);
      const menu = h('div', 'menu');
      p.append(menu);
      this.button(menu, 'Back', () => this.back(), { center: true });
      s.append(p);
    });
    // start on the furthest chapter reached
    this.setFocus(Math.max(0, Math.min(5, save.data.unlocked - 1)), false);
  }

  private settings() {
    const save = this.host.save;
    const st = save.data.settings;
    const apply = () => {
      save.write();
      this.host.applySettings();
    };
    this.mount('settings', 'dim', (s) => {
      const p = h('div', 'panel');
      p.append(h('h2', undefined, 'Settings'));
      p.append(h('div', 'sub', 'Saved on this device'));
      const choice = <T extends string | boolean>(name: string, note: string, options: { v: T; label: string }[], get: () => T, set: (v: T) => void) => {
        const row = h('div', 'row');
        const nm = h('div', 'name', name);
        nm.append(h('small', undefined, note));
        const val = h('div', 'val');
        const left = h('em', undefined, '‹');
        const text = h('span');
        const right = h('em', undefined, '›');
        val.append(left, text, right);
        row.append(nm, val);
        p.append(row);
        const draw = () => (text.textContent = options.find((o) => o.v === get())?.label ?? '');
        const adjust = (d: number) => {
          const i = options.findIndex((o) => o.v === get());
          set(options[(i + d + options.length) % options.length].v);
          draw();
          apply();
        };
        draw();
        this.focusable(row, () => adjust(1), adjust);
      };
      const level = (name: string, note: string, get: () => number, set: (v: number) => void) => {
        const row = h('div', 'row');
        const nm = h('div', 'name', name);
        nm.append(h('small', undefined, note));
        const val = h('div', 'val');
        const pips = h('div', 'pips');
        for (let i = 0; i < 10; i++) pips.append(h('i'));
        val.append(h('em', undefined, '‹'), pips, h('em', undefined, '›'));
        row.append(nm, val);
        p.append(row);
        const draw = () => [...pips.children].forEach((c, i) => c.classList.toggle('on', i < Math.round(get() * 10)));
        const adjust = (d: number) => {
          set(Math.max(0, Math.min(1, Math.round(get() * 10 + d) / 10)));
          draw();
          apply();
        };
        draw();
        this.focusable(
          row,
          () => adjust(get() >= 1 ? -10 : 1),
          adjust,
        );
      };
      choice(
        'Difficulty',
        'Story has no way to fail; good for children',
        [
          { v: 'story', label: 'Story' },
          { v: 'normal', label: 'Normal' },
        ],
        () => st.difficulty,
        (v) => (st.difficulty = v),
      );
      choice<QualityChoice>(
        'Picture',
        'Auto chooses for this device',
        [
          { v: 'auto', label: 'Auto' },
          { v: 'low', label: 'Low' },
          { v: 'medium', label: 'Medium' },
          { v: 'high', label: 'High' },
        ],
        () => st.quality,
        (v) => (st.quality = v),
      );
      level('Sound', 'Everything', () => st.master, (v) => (st.master = v));
      level('Music', 'The score', () => st.music, (v) => (st.music = v));
      level('Effects', 'Weather, steps, voices', () => st.sfx, (v) => (st.sfx = v));
      choice(
        'Timer',
        'Shows the clock as you play',
        [
          { v: false, label: 'Off' },
          { v: true, label: 'On' },
        ],
        () => st.timer,
        (v) => (st.timer = v),
      );
      level('Camera speed', 'How fast the view turns', () => st.sensitivity / 2, (v) => (st.sensitivity = Math.max(0.2, v * 2)));
      choice(
        'Look up and down',
        'Which way the view tilts',
        [
          { v: false, label: 'Normal' },
          { v: true, label: 'Inverted' },
        ],
        () => st.invertY,
        (v) => (st.invertY = v),
      );
      choice(
        'Screen shake',
        'The camera jolts with blows and thunder',
        [
          { v: true, label: 'On' },
          { v: false, label: 'Off' },
        ],
        () => st.shake,
        (v) => (st.shake = v),
      );
      if (save.totalScrolls() >= 18) {
        choice(
          'Garment',
          'Won by finding every scroll piece',
          [
            { v: 'robe', label: 'Robe' },
            { v: 'sackcloth', label: 'Sackcloth' },
          ],
          () => st.costume,
          (v) => (st.costume = v as 'robe' | 'sackcloth'),
        );
      }
      const menu = h('div', 'menu');
      p.append(menu);
      this.button(menu, 'Done', () => this.back(), { center: true, primary: true });
      s.append(p);
    });
  }

  private pause() {
    const c = CHAPTERS[this.host.current - 1];
    this.mount('pause', 'dim', (s) => {
      const p = h('div', 'panel');
      p.append(h('h2', undefined, 'Paused'));
      p.append(h('div', 'sub', c ? `Chapter ${ROMAN[c.id - 1]} · ${c.title}` : ''));
      if (c) p.append(h('div', 'note', `For the third star: ${c.challenge.charAt(0).toLowerCase()}${c.challenge.slice(1)}.`));
      const menu = h('div', 'menu');
      p.append(menu);
      this.button(menu, 'Resume', () => this.host.resume(), { primary: true });
      this.button(menu, 'Start the chapter again', () => this.host.restart());
      this.button(menu, 'Settings', () => this.go('settings'));
      this.button(menu, 'Leave to the title', () => this.host.toTitle());
      s.append(p);
    });
  }

  private gallery() {
    const save = this.host.save;
    this.mount('gallery', 'dim', (s) => {
      const p = h('div', 'panel wide');
      p.append(h('h2', undefined, 'Gallery'));
      p.append(h('div', 'sub', 'A plate for each chapter whose three scroll pieces are found'));
      const grid = h('div', 'gallery');
      for (const c of CHAPTERS) {
        const img = save.data.gallery[c.id];
        const plate = h('div', `plate${img ? '' : ' locked'}`, img ? c.plate : `${c.title}: ${save.data.records[c.id]?.scrolls.filter(Boolean).length ?? 0} of 3`);
        if (img) plate.style.backgroundImage = `linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,0) 45%), url(${img})`;
        grid.append(plate);
      }
      p.append(grid);
      const all = save.totalScrolls() >= 18;
      p.append(h('div', 'note', all ? 'Every scroll piece is found. A garment of sackcloth is yours to wear: see Settings.' : 'Find all eighteen scroll pieces and a garment of sackcloth is yours to wear.'));
      const menu = h('div', 'menu');
      p.append(menu);
      this.button(menu, 'Back', () => this.back(), { center: true });
      s.append(p);
    });
  }

  /** The card that opens a chapter. `done` is called when it is dismissed. */
  card(meta: ChapterMeta, done: () => void, auto = false) {
    this.stack = [];
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      this.close();
      done();
    };
    this.mount('card', 'black', (s) => {
      const c = h('div', 'card');
      c.append(h('div', 'num', `Chapter ${ROMAN[meta.id - 1]}`));
      c.append(h('h2', undefined, meta.title));
      c.append(h('div', 'rule'));
      c.append(h('p', 'verse', meta.verse.text));
      c.append(h('div', 'ref', meta.passage));
      c.append(h('div', 'go', 'Begin'));
      s.append(c);
      s.addEventListener('pointerup', () => {
        if (performance.now() - this.opened > 500) finish();
      });
    });
    this.onConfirm = finish;
    if (auto) setTimeout(finish, 300);
  }

  result(data: ResultData, next: (what: 'continue' | 'again' | 'chapters') => void) {
    this.resultData = data;
    this.onResult = next;
    this.stack = [];
    this.mount('result', 'dim', (s) => {
      const p = h('div', 'panel result');
      p.append(h('div', 'sub', `Chapter ${ROMAN[data.meta.id - 1]} · ${data.meta.passage}`));
      p.append(h('h2', undefined, data.meta.title));
      const st = stars(data.stars, true);
      st.style.margin = '14px 0 4px';
      p.append(st);
      const lines = h('div', 'lines');
      const line = (label: string, value: string, ok: boolean) => {
        const l = h('div', `line${ok ? '' : ' miss'}`);
        l.append(h('span', undefined, label), h('b', undefined, value));
        lines.append(l);
      };
      line('Finished', '★', true);
      line('Scroll pieces', `${data.scrolls} of 3${data.scrolls === 3 ? '  ★' : ''}`, data.scrolls === 3);
      line(data.meta.challenge, data.challenge ? '★' : '—', data.challenge);
      line('Time', `${formatTime(data.time)}${data.newBest ? '  best' : data.best != null ? `  (best ${formatTime(data.best)})` : ''}`, true);
      p.append(lines);
      if (data.plateWon) p.append(h('div', 'note', `A plate is added to the gallery: “${data.meta.plate}”.`));
      if (data.costumeWon) p.append(h('div', 'note', 'Every scroll piece is found. A garment of sackcloth is yours to wear: see Settings.'));
      const menu = h('div', 'menu');
      p.append(menu);
      this.button(menu, data.last ? 'The end' : 'Go on', () => next('continue'), { primary: true, small: data.last ? '' : CHAPTERS[data.meta.id]?.title });
      this.button(menu, 'Play it again', () => next('again'));
      this.button(menu, 'Chapters', () => next('chapters'));
      s.append(p);
    });
  }

  private ending() {
    const save = this.host.save;
    this.mount('ending', 'dim', (s) => {
      const c = h('div', 'card ending');
      c.append(h('div', 'num', 'Jonah'));
      // the book ends on a question and leaves it open; so does the game
      const q = cite('4:11');
      c.append(h('p', 'verse', q.text));
      c.append(h('div', 'ref', q.ref));
      c.append(h('div', 'rule'));
      const total = CHAPTERS.reduce((n, ch) => n + save.stars(ch.id), 0);
      c.append(h('div', 'note', `${total} of 18 stars · ${save.totalScrolls()} of 18 scroll pieces`));
      c.append(h('div', 'note', 'The words of scripture are from the King James Version.'));
      const menu = h('div', 'menu');
      menu.style.margin = '26px auto 0';
      menu.style.maxWidth = '300px';
      c.append(menu);
      this.button(menu, 'Chapters', () => this.go('chapters'), { center: true, primary: true });
      this.button(menu, 'Title', () => this.host.toTitle(), { center: true });
      s.append(c);
    });
  }
}
