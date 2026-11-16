import type { ChapterCtor } from '../game/chapter';
import { Yard } from './yard';

/** Chapter number → its class. 0 is the scene behind the title; 9 is the test yard (?ch=9). */
export const REGISTRY: Record<number, ChapterCtor> = {
  9: Yard,
};
