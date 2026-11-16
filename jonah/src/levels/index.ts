import type { ChapterCtor } from '../game/chapter';
import { Call } from './ch1_call';
import { Harbor } from './ch2_harbor';
import { Storm } from './ch3_storm';
import { Fish } from './ch4_fish';
import { Nineveh } from './ch5_nineveh';
import { Plant } from './ch6_plant';
import { Title } from './title';
import { Yard } from './yard';

/** Chapter number → its class. 0 is the scene behind the title; 9 is the test yard (?ch=9). */
export const REGISTRY: Record<number, ChapterCtor> = {
  0: Title,
  1: Call,
  2: Harbor,
  3: Storm,
  4: Fish,
  5: Nineveh,
  6: Plant,
  9: Yard,
};
