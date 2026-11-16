import type { ChapterCtor } from '../game/chapter';
import { Storm } from './ch3_storm';
import { Yard } from './yard';

/** Chapter number → its class. 0 is the scene behind the title; 9 is the test yard (?ch=9). */
export const REGISTRY: Record<number, ChapterCtor> = {
  3: Storm,
  9: Yard,
};
