// The journeys of the game, in the order they are released: one a week. Each is a story of its own (its beats, its
// people, what is said at its end); the select screen lists them, and the page plays the one asked for (?story=id).
//
// To release the next: write its story beside story.js, give it an entry here with `released: true`, and put a new
// teaser after it. The teaser is the one entry with `released: false`: with a title and a ref it is named on the
// select screen, and without them it only says that a new journey is coming.
//
// A journey still being made is marked `wip: true`: it is not listed, and the page does not fall to it, unless the
// address asks for all of them (?all) or for that one by name (?story=id). With only one journey open and nothing
// of it kept, there is nothing to choose: the page goes straight into it (main.js).
//
// A journey that may be tried before it is finished is marked `beta: true` instead: it is listed with the rest, with
// "Beta" on its card, but it is not counted as one to choose from, so someone new still goes straight into the first.
import * as furnace from './daniel.js';
import * as fallow from './hosea.js';
import * as trumpet from './joel.js';
import * as jonah from './jonah.js';
import * as den from './lions-den.js';
import * as locust from './locust-years.js';
import { nephi } from './scripture.js';
import { daniel } from './scripture-daniel.js';
import { hosea } from './scripture-hosea.js';
import { joel } from './scripture-joel.js';
import { jonah as bookOfJonah } from './scripture-jonah.js';
import { nephi16 } from './scripture-nephi16.js';
import * as small from './small-means.js';
import { CLOTHES, NAMES, PEOPLE, story } from './story.js';

export const GAME = {
  name: 'Scripture Journeys',
  /** The start of every key kept in the browser. */
  save: 'bom-journeys',
  /**
   * The Google Form a parent's note at a journey's end is sent to (tally.js): `url` is the form's address ending
   * in /formResponse, and the rest are the names of its fields (entry.123…), as its pre-filled link shows them.
   * With no `url` the end of a journey asks for no note.
   */
  notes: { url: '', journey: '', note: '', email: '' },
};

/**
 * The standard works, in their order, and within each its books, in their order. The first screen is a tree of
 * them: a work, its books under it, and a card under each book for each of its journeys. A book with no journey yet
 * is shown greyed; a work with no journey at all, as coming. A book is one heading of journeys: a book of scripture
 * (1 Nephi, Daniel), or where it reads better, the life of one prophet across several (Moses, Elijah). `face`: the
 * portrait on its journeys' cards, in public/faces/, with `who` written under it (a story's own `face` takes its
 * place). Each story names its `work` and its `book` (the book's id).
 */
const books = (...names) => names.map((name) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name }));

export const WORKS = [
  {
    id: 'ot',
    name: 'Old Testament',
    books: [
      { id: 'daniel', name: 'Daniel', face: { src: './faces/daniel.webp', who: 'Daniel' } },
      { id: 'hosea', name: 'Hosea', face: { who: 'Hosea' } },
      { id: 'joel', name: 'Joel', face: { who: 'Joel' } },
      { id: 'jonah', name: 'Jonah', face: { who: 'Jonah' } },
    ],
  },
  { id: 'nt', name: 'New Testament', books: [] },
  {
    id: 'bom',
    name: 'Book of Mormon',
    books: [
      { id: '1-nephi', name: '1 Nephi', face: { src: './faces/nephi.webp', who: 'Nephi' } },
      ...books('2 Nephi', 'Jacob', 'Enos', 'Jarom', 'Omni', 'Words of Mormon', 'Mosiah', 'Alma', 'Helaman', '3 Nephi', '4 Nephi', 'Mormon', 'Ether', 'Moroni'),
    ],
  },
  { id: 'dc', name: 'Doctrine and Covenants', books: [] },
  { id: 'pgp', name: 'Pearl of Great Price', books: [] },
];

export const STORIES = [
  {
    id: 'plates-of-brass',
    work: 'bom',
    book: '1-nephi',
    /** Its number among the journeys of its book. */
    number: 1,
    title: 'I Will Go and Do',
    ref: '1 Nephi 3–4',
    blurb: 'Nephi and his brothers return to Jerusalem for the plates of brass.',
    /** What its picture shows (public/og/, below at `pageOf`), for one who cannot see it. */
    shown: 'Nephi stands in the hill country at sunset, his brothers by the tents behind him.',
    released: true,
    /** The beat it begins at. */
    first: 'a1',
    beats: story,
    people: PEOPLE,
    names: NAMES,
    clothes: CLOTHES,
    /** The book its cards quote (scripture.js). */
    scripture: nephi,
    /** The key this story's place was kept under before there were others. */
    oldSave: 'nephi-plates:beat',
    end: {
      heading: 'The Lord Prepared a Way',
      cite: '1 Nephi 3:7',
      ask: 'When has the Lord prepared a way for you?',
    },
  },
  {
    id: 'by-small-means',
    wip: true,
    work: 'bom',
    book: '1-nephi',
    number: 2,
    title: 'By Small Means',
    ref: '1 Nephi 16',
    blurb: 'A ball of curious workmanship points the way; Nephi breaks his bow of fine steel, makes one of wood, and asks his father where to go.',
    released: true,
    first: 'a1',
    beats: small.story,
    people: small.PEOPLE,
    names: small.NAMES,
    clothes: small.CLOTHES,
    scripture: nephi16,
    /** No city at all: the wilderness by the Red Sea (world.js, 'wild'), with the valley of Lemuel at its edge. */
    look: small.LOOK,
    land: 'wild',
    town: small.town,
    end: {
      heading: 'By Small Means',
      cite: '1 Nephi 16:29',
      ask: 'What small things has the Lord given you to give heed to?',
    },
  },
  // the teaser: what comes next week (with no `book`, it is listed under its work's books, without a number)
  { id: 'next', work: 'bom', book: null, number: 2, title: null, ref: null, released: false },
  {
    id: 'fiery-furnace',
    beta: true,
    work: 'ot',
    book: 'daniel',
    number: 1,
    title: 'But If Not',
    ref: 'Daniel 3',
    blurb: 'Shadrach, Meshach and Abed-nego will not bow to the image of gold, and are cast into the fire.',
    shown: 'The three walk out of the burning fiery furnace, a figure in white behind them in the fire; beyond, the image of gold on the plain of Babylon and the multitude bowed before it.',
    released: true,
    first: 'a1',
    beats: furnace.story,
    people: furnace.PEOPLE,
    names: furnace.NAMES,
    clothes: furnace.CLOTHES,
    scripture: daniel,
    /** Babylon, in place of Jerusalem (babylon.js), and its own people in place of Jerusalem's. */
    look: furnace.LOOK,
    /** The river plain of Babylon, in place of the hill country round Jerusalem (world.js). */
    land: 'plain',
    town: furnace.town,
    end: {
      heading: 'But If Not',
      cite: 'Daniel 3:17–18',
      // (one of the things this week's Come, Follow Me asks: about trusting the Lord when faith is tried)
      ask: 'What if faith does not bring the miracle we hope for?',
    },
  },
  {
    id: 'lions-den',
    beta: true,
    work: 'ot',
    book: 'daniel',
    number: 2,
    title: 'As He Did Aforetime',
    ref: 'Daniel 6',
    blurb: 'Daniel prays at his open windows though the king has signed against it, and is cast into the den of lions.',
    shown: 'Daniel, an old man, kneels in prayer in the den with the lions lying quiet about him, light falling from its mouth, where the king looks down.',
    released: true,
    first: 'a1',
    beats: den.story,
    people: den.PEOPLE,
    names: den.NAMES,
    clothes: den.CLOTHES,
    scripture: daniel,
    /** The one you walk as wears a beard: Daniel, an old man by now. */
    bearded: true,
    /** Babylon in the days of Darius (babylon.js): the same city, with Daniel's house and the den before it. */
    look: den.LOOK,
    land: 'plain',
    town: den.town,
    end: {
      heading: 'He Delivereth and Rescueth',
      cite: 'Daniel 6:26–27',
      // (this week's Come, Follow Me, for children: Heavenly Father wants us to pray often)
      ask: 'Why was praying to Heavenly Father so important to Daniel?',
    },
  },
  {
    // a short game: a plot of fallow ground broken up and sown before the rain comes, and reaped after it (hosea.js,
    // fallow.js). Still being tried: opened at ?story=hosea.
    id: 'hosea',
    wip: true,
    work: 'ot',
    book: 'hosea',
    number: 1,
    title: 'Break Up Your Fallow Ground',
    ref: 'Hosea 10',
    blurb: 'Break up the hard ground with an ox and a plough, and sow it before the rain comes.',
    released: true,
    first: 'a1',
    beats: fallow.story,
    people: fallow.PEOPLE,
    clothes: fallow.CLOTHES,
    scripture: hosea,
    town: fallow.town,
    props: fallow.PROPS,
    end: {
      heading: 'Break Up Your Fallow Ground',
      cite: 'Hosea 10:12',
      // (this week's Come, Follow Me: "it is time to seek the Lord")
      ask: 'What hard ground in your own heart could you break up this week, so that the word of the Lord can grow there?',
    },
  },
  {
    // a short game: a plot of corn kept, as far as one can keep it, from four swarms; and then restored (locust-years.js,
    // swarm.js). Still being tried: opened at ?story=locust-years.
    id: 'locust-years',
    wip: true,
    work: 'ot',
    book: 'joel',
    number: 1,
    title: 'The Years the Locust Hath Eaten',
    ref: 'Joel 1–2',
    blurb: 'Four swarms come upon the corn. Drive them off and keep what you can; then see what the Lord restores.',
    released: true,
    first: 'a1',
    beats: locust.story,
    people: locust.PEOPLE,
    clothes: locust.CLOTHES,
    scripture: joel,
    town: locust.town,
    end: {
      heading: 'I Will Restore to You the Years',
      cite: 'Joel 2:25',
      // (this week's Come, Follow Me: the Lord always invites us to return to Him)
      ask: 'What has the Lord restored to you, or to someone you love, that you could not have got back yourself?',
    },
  },
  {
    // a short game rather than a walk through the story: the trumpet blown in Zion, and the people gathered at its
    // sound before the sun goes down (joel.js, gather.js). Still being tried: opened at ?story=joel.
    id: 'joel',
    wip: true,
    work: 'ot',
    book: 'joel',
    number: 2,
    title: 'Blow the Trumpet in Zion',
    ref: 'Joel 2',
    blurb: 'Sound the trumpet in the streets of Zion and gather the people to a solemn assembly before the sun goes down.',
    released: true,
    first: 'a1',
    beats: trumpet.story,
    people: trumpet.PEOPLE,
    names: trumpet.NAMES,
    clothes: trumpet.CLOTHES,
    scripture: joel,
    town: trumpet.town,
    /** What they carry about the city: a water jar, a basket (joel.js). */
    props: trumpet.PROPS,
    end: {
      heading: 'Turn unto the Lord Your God',
      cite: 'Joel 2:12–13',
      // (this week's Come, Follow Me: devotion to God felt inwardly, "rend your heart, and not your garments")
      ask: 'What does it mean to turn to the Lord “with all your heart”?',
    },
  },
  {
    id: 'jonah',
    wip: true,
    work: 'ot',
    book: 'jonah',
    number: 1,
    title: 'Should Not I Spare Nineveh?',
    ref: 'Jonah 1–4',
    blurb: 'Jonah flees from the presence of the LORD, is cast into the sea, cries against Nineveh, and is asked a question.',
    released: true,
    first: 'a1',
    beats: jonah.story,
    people: jonah.PEOPLE,
    names: jonah.NAMES,
    clothes: jonah.CLOTHES,
    scripture: bookOfJonah,
    bearded: true,
    /** Nineveh (nineveh.js), on the river plain; the ship, the sea and the shore are the story's own sets. */
    look: jonah.LOOK,
    land: 'plain',
    town: jonah.town,
    /** Its own small things (city.js, createProps): the wares of the ship, the boughs of the booth. */
    props: jonah.PROPS,
    end: {
      heading: 'Should Not I Spare Nineveh?',
      cite: 'Jonah 4:2',
      // (the book ends on the LORD's question, and gives no answer of Jonah's: the journey's name asks it, and this
      // asks what lies under it)
      ask: 'Why is it sometimes hard to be glad when someone else is forgiven?',
    },
  },
];
/**
 * The name of a journey's own page, from its title: "But If Not" is but-if-not/. The build (build.mjs) writes one for
 * every journey that is listed. It has that journey's name, what it is about and its own picture for where a link to
 * it is posted (public/og/but-if-not.jpg: the game's own picture, og.jpg, until there is one), and it sends whoever
 * opens it straight into the journey, past the list. A journey's end shares the address of its own page.
 */
export const pageOf = (s) => s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Whether a journey has a page of its own: one that is listed (released, and not still being made). */
export const hasPage = (s) => !!s.released && !s.wip;

/** The released story of that id (one still being made too, asked for by name), or the first open one if there is none. */
export const storyById = (id) => STORIES.find((s) => s.released && s.id === id) ?? STORIES.find((s) => s.released && !s.wip && !s.beta);

// ---- what is kept in the browser, by story ------------------------------------------------------------------------
const key = (id, what) => `${GAME.save}:${id}:${what}`;
const get = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k, value) => {
  try {
    if (value) localStorage.setItem(k, value);
    else localStorage.removeItem(k);
  } catch {
    // (no storage: the story just starts from the beginning next time)
  }
};

/**
 * What is kept of a story: the beat reached with its act's name (`place`: { id, label } or null; `keep(id, label)`,
 * or `keep(null)` to forget it), and whether it has been finished (`done`).
 */
export function keeper(entry) {
  // (a place kept before there were other stories is brought over once)
  const old = entry.oldSave && get(entry.oldSave);
  if (old) {
    if (!get(key(entry.id, 'beat'))) set(key(entry.id, 'beat'), old);
    set(entry.oldSave, null);
  }
  return {
    get place() {
      const id = get(key(entry.id, 'beat'));
      return id ? { id, label: get(key(entry.id, 'label')) } : null;
    },
    keep(id, label = null) {
      set(key(entry.id, 'beat'), id);
      set(key(entry.id, 'label'), id && label);
    },
    get done() {
      return !!get(key(entry.id, 'done'));
    },
    set done(yes) {
      set(key(entry.id, 'done'), yes ? '1' : null);
    },
  };
}
