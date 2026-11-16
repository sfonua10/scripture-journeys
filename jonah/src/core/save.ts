import type { QualityChoice } from './quality';

export type Difficulty = 'story' | 'normal';

export interface ChapterRecord {
  finished: boolean;
  /** Which of the three scroll pieces have been found (kept across replays). */
  scrolls: [boolean, boolean, boolean];
  challenge: boolean;
  bestTime: number | null;
}

export interface Settings {
  quality: QualityChoice;
  difficulty: Difficulty;
  master: number;
  music: number;
  sfx: number;
  timer: boolean;
  sensitivity: number;
  invertY: boolean;
  shake: boolean;
  costume: 'robe' | 'sackcloth';
}

export interface SaveData {
  version: 1;
  /** The chapter to continue from, 1..6 (7 once the story is finished). */
  chapter: number;
  /** The furthest chapter unlocked, 1..6. */
  unlocked: number;
  records: Record<number, ChapterRecord>;
  settings: Settings;
  /** Small pictures won by finding all three scrolls of a chapter. */
  gallery: Record<number, string>;
}

const KEY = 'jonah.save.v1';

const defaults = (): SaveData => ({
  version: 1,
  chapter: 1,
  unlocked: 1,
  records: {},
  settings: { quality: 'auto', difficulty: 'normal', master: 0.9, music: 0.7, sfx: 0.9, timer: false, sensitivity: 1, invertY: false, shake: true, costume: 'robe' },
  gallery: {},
});

export class Save {
  data: SaveData;
  /** With ?nosave nothing is read or written (tests start clean). */
  private off = new URLSearchParams(location.search).has('nosave');

  constructor() {
    this.data = defaults();
    if (this.off) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        if (parsed.version === 1) {
          this.data = { ...this.data, ...parsed, settings: { ...this.data.settings, ...(parsed.settings ?? {}) } };
        }
      }
    } catch {
      /* a broken or blocked store: start fresh */
    }
  }

  record(chapter: number): ChapterRecord {
    return (this.data.records[chapter] ??= { finished: false, scrolls: [false, false, false], challenge: false, bestTime: null });
  }

  stars(chapter: number): number {
    const r = this.data.records[chapter];
    if (!r) return 0;
    return (r.finished ? 1 : 0) + (r.scrolls.every(Boolean) ? 1 : 0) + (r.challenge ? 1 : 0);
  }

  totalScrolls(): number {
    let n = 0;
    for (const r of Object.values(this.data.records)) n += r.scrolls.filter(Boolean).length;
    return n;
  }

  get hasProgress(): boolean {
    return this.data.chapter > 1 || Object.keys(this.data.records).length > 0;
  }

  write() {
    if (this.off) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: play on without saving */
    }
  }

  reset() {
    const settings = this.data.settings;
    this.data = defaults();
    this.data.settings = settings;
    this.write();
  }
}
