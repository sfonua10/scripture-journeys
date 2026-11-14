// 1 Nephi 16:9–32, verse by verse, as published (Project Gutenberg eBook #17, The Book of Mormon, public domain; the
// same words and verses as the Church's current edition). Generated from that text, not typed by hand.
// The cards of the journey "By Small Means" (small-means.js) quote these exactly.
//
// What someone says is shown under their name (SPEAKERS), without the words that only tell who speaks (EXCERPTS with
// `who`); tools/excerpts.mjs checks each excerpt, and each verse with a word left out, against its verse.
import { scripture, SPEAKERS as FIRST } from './scripture.js';

export const VERSES = {
  '16:9': "And it came to pass that the voice of the Lord spake unto my father by night, and commanded him that on the morrow he should take his journey into the wilderness.",
  '16:10': "And it came to pass that as my father arose in the morning, and went forth to the tent door, to his great astonishment he beheld upon the ground a round ball of curious workmanship; and it was of fine brass. And within the ball were two spindles; and the one pointed the way whither we should go into the wilderness.",
  '16:11': "And it came to pass that we did gather together whatsoever things we should carry into the wilderness, and all the remainder of our provisions which the Lord had given unto us; and we did take seed of every kind that we might carry into the wilderness.",
  '16:12': "And it came to pass that we did take our tents and depart into the wilderness, across the river Laman.",
  '16:13': "And it came to pass that we traveled for the space of four days, nearly a south-southeast direction, and we did pitch our tents again; and we did call the name of the place Shazer.",
  '16:14': "And it came to pass that we did take our bows and our arrows, and go forth into the wilderness to slay food for our families; and after we had slain food for our families we did return again to our families in the wilderness, to the place of Shazer. And we did go forth again in the wilderness, following the same direction, keeping in the most fertile parts of the wilderness, which were in the borders near the Red Sea.",
  '16:15': "And it came to pass that we did travel for the space of many days, slaying food by the way, with our bows and our arrows and our stones and our slings.",
  '16:16': "And we did follow the directions of the ball, which led us in the more fertile parts of the wilderness.",
  '16:17': "And after we had traveled for the space of many days, we did pitch our tents for the space of a time, that we might again rest ourselves and obtain food for our families.",
  '16:18': "And it came to pass that as I, Nephi, went forth to slay food, behold, I did break my bow, which was made of fine steel; and after I did break my bow, behold, my brethren were angry with me because of the loss of my bow, for we did obtain no food.",
  '16:19': "And it came to pass that we did return without food to our families, and being much fatigued, because of their journeying, they did suffer much for the want of food.",
  '16:20': "And it came to pass that Laman and Lemuel and the sons of Ishmael did begin to murmur exceedingly, because of their sufferings and afflictions in the wilderness; and also my father began to murmur against the Lord his God; yea, and they were all exceedingly sorrowful, even that they did murmur against the Lord.",
  '16:21': "Now it came to pass that I, Nephi, having been afflicted with my brethren because of the loss of my bow, and their bows having lost their springs, it began to be exceedingly difficult, yea, insomuch that we could obtain no food.",
  '16:22': "And it came to pass that I, Nephi, did speak much unto my brethren, because they had hardened their hearts again, even unto complaining against the Lord their God.",
  '16:23': "And it came to pass that I, Nephi, did make out of wood a bow, and out of a straight stick, an arrow; wherefore, I did arm myself with a bow and an arrow, with a sling and with stones. And I said unto my father: Whither shall I go to obtain food?",
  '16:24': "And it came to pass that he did inquire of the Lord, for they had humbled themselves because of my words; for I did say many things unto them in the energy of my soul.",
  '16:25': "And it came to pass that the voice of the Lord came unto my father; and he was truly chastened because of his murmuring against the Lord, insomuch that he was brought down into the depths of sorrow.",
  '16:26': "And it came to pass that the voice of the Lord said unto him: Look upon the ball, and behold the things which are written.",
  '16:27': "And it came to pass that when my father beheld the things which were written upon the ball, he did fear and tremble exceedingly, and also my brethren and the sons of Ishmael and our wives.",
  '16:28': "And it came to pass that I, Nephi, beheld the pointers which were in the ball, that they did work according to the faith and diligence and heed which we did give unto them.",
  '16:29': "And there was also written upon them a new writing, which was plain to be read, which did give us understanding concerning the ways of the Lord; and it was written and changed from time to time, according to the faith and diligence which we gave unto it. And thus we see that by small means the Lord can bring about great things.",
  '16:30': "And it came to pass that I, Nephi, did go forth up into the top of the mountain, according to the directions which were given upon the ball.",
  '16:31': "And it came to pass that I did slay wild beasts, insomuch that I did obtain food for our families.",
  '16:32': "And it came to pass that I did return to our tents, bearing the beasts which I had slain; and now when they beheld that I had obtained food, how great was their joy! And it came to pass that they did humble themselves before the Lord, and did give thanks unto him.",
};

export const nephi16 = scripture('1 Nephi', VERSES);

/** Who speaks, as the cards name them: those of the first journey, and the voice that came to their father (16:25–26). */
export const SPEAKERS = { ...FIRST, lord: 'The voice of the Lord' };
const { nephi: NEPHI, lord } = SPEAKERS;

/** The verses that are, whole, what one of them says. (None here: each that is said begins by telling who says it.) */
export const SAID = {};

/**
 * Parts of verses, where the story shows less than the whole: the verse's own words, in order, with "…" where words
 * are left out. One with `who` is what that one says, shown under their name, the words that tell who speaks left off.
 */
export const EXCERPTS = {
  // the ball, at the tent door
  '16:10-a': { verse: '16:10', text: '… to his great astonishment he beheld upon the ground a round ball of curious workmanship; and it was of fine brass. …' },
  '16:10-b': { verse: '16:10', text: '… And within the ball were two spindles; and the one pointed the way whither we should go into the wilderness.' },
  // by the way: their bows, and the more fertile parts
  '16:14-a': { verse: '16:14', text: 'And it came to pass that we did take our bows and our arrows, and go forth into the wilderness to slay food for our families; …' },
  '16:14-b': { verse: '16:14', text: '… And we did go forth again in the wilderness, following the same direction, keeping in the most fertile parts of the wilderness, which were in the borders near the Red Sea.' },
  // the bow of fine steel
  '16:18-a': { verse: '16:18', text: 'And it came to pass that as I, Nephi, went forth to slay food, behold, I did break my bow, which was made of fine steel; …' },
  '16:18-b': { verse: '16:18', text: '… my brethren were angry with me because of the loss of my bow, for we did obtain no food.' },
  '16:20-b': { verse: '16:20', text: '… and also my father began to murmur against the Lord his God; …' },
  '16:21-b': { verse: '16:21', text: '… and their bows having lost their springs, it began to be exceedingly difficult, yea, insomuch that we could obtain no food.' },
  // a bow of wood; and his question to his father
  '16:23-a': { verse: '16:23', text: 'And it came to pass that I, Nephi, did make out of wood a bow, and out of a straight stick, an arrow; …' },
  '16:23-said': { verse: '16:23', who: NEPHI, text: 'Whither shall I go to obtain food?' },
  // the voice of the Lord to their father: never retold, always these words
  '16:26-said': { verse: '16:26', who: lord, text: 'Look upon the ball, and behold the things which are written.' },
  // what was written, and what Nephi saw of the pointers
  '16:29-a': { verse: '16:29', text: 'And there was also written upon them a new writing, which was plain to be read, which did give us understanding concerning the ways of the Lord; and it was written and changed from time to time, according to the faith and diligence which we gave unto it. …' },
  '16:29-b': { verse: '16:29', text: '… And thus we see that by small means the Lord can bring about great things.' },
  // the return
  '16:32-a': { verse: '16:32', text: 'And it came to pass that I did return to our tents, bearing the beasts which I had slain; and now when they beheld that I had obtained food, how great was their joy! …' },
  '16:32-b': { verse: '16:32', text: '… And it came to pass that they did humble themselves before the Lord, and did give thanks unto him.' },
};
for (const [key, e] of Object.entries(EXCERPTS)) e.voice = `1 Nephi ${key} cut`;

/**
 * Verses with a word left out, to be filled in from three. The right answer is the word that was there; the part of
 * the verse it is in (`said`) is then read whole.
 */
export const BLANKS = {
  spindles: { verse: '16:10', said: '16:10-b', text: '… And within the ball were two _____; and the one pointed the way whither we should go into the wilderness.', answers: ['stones', 'spindles', 'candles'], right: 1 },
  wood: { verse: '16:23', said: '16:23-a', text: 'And it came to pass that I, Nephi, did make out of _____ a bow, and out of a straight stick, an arrow; …', answers: ['steel', 'wood', 'brass'], right: 1 },
  heed: { verse: '16:28', text: '… the pointers which were in the ball, that they did work according to the faith and diligence and _____ which we did give unto them.', answers: ['heed', 'gold', 'strength'], right: 0 },
  small: { verse: '16:29', said: '16:29-b', text: '… And thus we see that by _____ means the Lord can bring about great things.', answers: ['small', 'strong', 'secret'], right: 0 },
};
