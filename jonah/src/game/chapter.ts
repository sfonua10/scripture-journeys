import type { Quality } from '../core/quality';
import type { Routine } from '../core/script';
import type { Shot } from '../player/camera';
import type { Bot } from './bot';
import type { Game } from './game';

/** A chapter: builds its world, tells its part of the story, and cleans up after itself. */
export abstract class Chapter {
  constructor(protected g: Game) {}

  /** Builds the world. The physics world and `g.root` exist; this must spawn the player. */
  abstract build(): void;

  /** Begins the story, once the chapter card is dismissed. */
  abstract start(): void;

  /** Before each physics step. */
  fixedUpdate(_dt: number): void {}

  /** After each physics step. */
  afterStep(_dt: number): void {}

  /** Once a frame. */
  update(_dt: number): void {}

  /** The automated player's way through the chapter. */
  *bot(_b: Bot): Routine {}

  /** A view worth keeping, for the gallery plate. */
  plate(): Shot | null {
    return null;
  }

  /** The picture setting changed while playing. */
  onQuality(_q: Quality): void {}

  dispose(): void {}
}

export type ChapterCtor = new (g: Game) => Chapter;
