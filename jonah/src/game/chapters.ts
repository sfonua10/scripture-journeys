import type { ScoreName } from '../core/audio';
import { cite, part, type Quote } from './verses';

export interface ChapterMeta {
  id: number;
  title: string;
  /** The passage it tells. */
  passage: string;
  /** The verse on its card. */
  verse: Quote;
  /** The one extra thing to try for the third star. */
  challenge: string;
  score: ScoreName;
  /** What the gallery plate is called. */
  plate: string;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 1,
    title: 'The Call',
    passage: 'Jonah 1:1–3',
    verse: part('1:3', 'But Jonah rose up', 'presence of the LORD'),
    challenge: 'Reach the road to Joppa without being blown from a roof',
    score: 'call',
    plate: 'The rooftops',
  },
  {
    id: 2,
    title: 'Joppa',
    passage: 'Jonah 1:3',
    verse: part('1:3', 'and he found a ship', 'went down into it'),
    challenge: 'Bring every load to the ship without a piece falling from the cart',
    score: 'harbor',
    plate: 'The ship of Tarshish',
  },
  {
    id: 3,
    title: 'The Storm',
    passage: 'Jonah 1:4–16',
    verse: cite('1:4'),
    challenge: 'Let no man be swept from the deck',
    score: 'storm',
    plate: 'A mighty tempest',
  },
  {
    id: 4,
    title: 'The Great Fish',
    passage: 'Jonah 1:17–2:10',
    verse: cite('1:17'),
    challenge: 'Go down through the deep without being caught in the weeds',
    score: 'fish',
    plate: 'The belly of the fish',
  },
  {
    id: 5,
    title: 'Nineveh',
    passage: 'Jonah 3:1–10',
    verse: part('3:3', 'Now Nineveh'),
    challenge: 'Let the word reach every soul in the city',
    score: 'nineveh',
    plate: 'That great city',
  },
  {
    id: 6,
    title: 'The Gourd',
    passage: 'Jonah 4:1–11',
    verse: part('4:5', 'So Jonah went out', 'made him a booth'),
    challenge: 'Raise the booth before the sun is high',
    score: 'plant',
    plate: 'The east side of the city',
  },
];

export const chapterMeta = (id: number) => CHAPTERS[id - 1];
