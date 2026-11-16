// Copies every verse the game shows out of the King James Version as published (Project Gutenberg eBook #10,
// public domain), so that no verse is typed by hand.
//   curl -L -o .cache/pg10.txt https://www.gutenberg.org/cache/epub/10/pg10.txt
//   node tools/verses.mjs            writes src/game/scripture.ts
//   node tools/verses.mjs --check    says whether src/game/scripture.ts is still as the text has it
// Two misprints of that edition in Jonah are put right, as every printed King James Version has them:
//   1:10  "said unto him. Why hast thou done this?"  →  "said unto him, Why hast thou done this?"
//   1:15  "So they look up Jonah"                    →  "So they took up Jonah"
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(import.meta.url), '..', '..');
const source = resolve(here, '.cache/pg10.txt');
const out = resolve(here, 'src/game/scripture.ts');
if (!existsSync(source)) {
  console.log('The text is not here. Fetch it first:\n  curl -L -o .cache/pg10.txt https://www.gutenberg.org/cache/epub/10/pg10.txt');
  process.exit(1);
}
const text = readFileSync(source, 'utf8');
const lines = text.replace(/\r/g, '').split('\n');

/** A book's verses, 'ch:v' → text, from where the text heads it (the second time: the first is its list of books). */
function book(heading) {
  const heads = lines.flatMap((line, i) => (line.trim() === heading ? [i] : []));
  if (heads.length < 2) throw new Error(`no book headed "${heading}"`);
  const verses = {};
  let paragraph = [];
  const flush = () => {
    const joined = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    paragraph = [];
    if (!/^\d+:\d+ /.test(joined)) return true;
    const marks = [...joined.matchAll(/(?:^| )(\d+:\d+) /g)];
    for (let k = 0; k < marks.length; k++) {
      const key = marks[k][1];
      if (key in verses) return false; // the next book has begun
      const from = marks[k].index + marks[k][0].length;
      verses[key] = joined.slice(from, k + 1 < marks.length ? marks[k + 1].index : undefined).trim();
    }
    return true;
  };
  for (let i = heads[1] + 1; i < lines.length; i++) {
    if (lines[i].trim()) paragraph.push(lines[i]);
    else if (paragraph.length && !flush()) break;
  }
  return verses;
}

// Verses from other books, shown on the hidden scroll pieces. [name the game cites it by, heading in the text, verses]
const OTHER = [
  ['Psalm', 'The Book of Psalms', ['139:7', '139:8', '139:9', '139:10', '107:23', '107:24', '107:25', '107:28', '107:29', '89:9', '130:1', '42:7', '103:8', '145:8', '145:9', '121:5', '121:6', '46:1']],
  ['Proverbs', 'The Proverbs', ['16:9', '16:33']],
  ['2 Kings', 'The Second Book of the Kings', ['14:25']],
  ['Jeremiah', 'The Book of the Prophet Jeremiah', ['23:24', '18:7', '18:8']],
  ['Joel', 'Joel', ['2:13']],
  ['Nahum', 'Nahum', ['1:3', '1:7']],
  ['Matthew', 'The Gospel According to Saint Matthew', ['12:40', '12:41']],
  ['Luke', 'The Gospel According to Saint Luke', ['11:30', '11:32']],
];

const jonah = book('Jonah');
jonah['1:10'] = jonah['1:10'].replace('said unto him. Why', 'said unto him, Why');
jonah['1:15'] = jonah['1:15'].replace('So they look up Jonah', 'So they took up Jonah');
const other = {};
for (const [name, heading, refs] of OTHER) {
  const verses = book(heading);
  for (const ref of refs) {
    if (!verses[ref]) throw new Error(`${name} ${ref} is not in the text`);
    other[`${name} ${ref}`] = verses[ref];
  }
}
const count = Object.keys(jonah).length;
if (count !== 48) throw new Error(`Jonah has 48 verses; the text gave ${count}`);

const body = `// Every verse the game shows, in the King James Version as published (Project Gutenberg eBook #10, public domain).
// Written by tools/verses.mjs from that text, not typed by hand. Do not edit: run the tool.
// (Two misprints of that edition in Jonah, 1:10 and 1:15, are put right; the tool says which.)

/** The book of Jonah, 'chapter:verse' → text. */
export const JONAH: Record<string, string> = ${JSON.stringify(jonah, null, 2)};

/** Verses of other books, 'Book chapter:verse' → text. */
export const OTHER: Record<string, string> = ${JSON.stringify(other, null, 2)};
`;

if (process.argv.includes('--check')) {
  const now = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (now === body) console.log(`all ${count + Object.keys(other).length} verses are as the text has them`);
  else console.log('src/game/scripture.ts differs from the text: run node tools/verses.mjs');
  process.exit(now === body ? 0 : 1);
}
writeFileSync(out, body);
console.log(`wrote ${count} verses of Jonah and ${Object.keys(other).length} of other books`);
