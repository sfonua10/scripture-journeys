// Makes the recordings of the scripture that the game reads aloud (src/game/narration.js), with ElevenLabs.
// It needs a key in .env (ELEVENLABS_API_KEY=...), which stays on this machine: only the recordings are published.
//
//   node tools/narrate.mjs --voices                 the voices the account may use, with a link to hear each
//   node tools/narrate.mjs --sample --voice <id>    one short verse, into shots/narration/, to hear a voice by
//   node tools/narrate.mjs --say "some words" --as name --voice <id>   those words as written, into shots/narration/name.mp3
//   node tools/narrate.mjs --dry                    what would be made, and what it would cost, without making it
//   node tools/narrate.mjs --voice <id>             makes every recording there is not yet one of
//
// A card's recording is named for its reference (1-nephi-4-11-12.mp3) and listed in manifest.json with a mark of
// its words and voice, so a card is made again only if those change. Where the month's allowance will not cover
// every card, the key verses (KEY, below) are made first and then as many of the others as fit, the longest left
// out first, so that the fewest cards go unread. Run it again next month and it makes the ones left.
//   --voice <id> (or ELEVENLABS_VOICE_ID)   --model <id> (eleven_multilingual_v2)   --keep <n> credits back (300)
//   --left <n>: suppose n credits are left (with --dry, to see what a smaller allowance would leave out)
//   --plain: send the names as they are spelt, not as they are said (NAMES, below)
//   --story <id>: the journey to make them for (STORIES, below): plates-of-brass unless said, or fiery-furnace
//
// Who reads what. What is told is read by the narrator (--voice). What someone says, on a card under their name, is
// read in that one's own voice, where the journey gives them one (its `cast`, below: Nephi, Lehi, Sariah, Laban …);
// a speaker with no voice of their own is read by the narrator. A journey told by one of its people (`teller`: the
// first journey is Nephi's own account) has what is told read in that one's voice, and the narrator reads only the
// speakers who have no voice of their own (there, the Spirit).
//
// A journey may also have lines that are not scripture: what its people say in the story's own words (`spoken`: a
// file and the table in it, as src/game/spoken-nephi.js). Each is made in its speaker's voice like any other card.
//   node tools/narrate.mjs --tidy                   puts away the recordings of this journey's book that it no longer
//                                                   reads (into shots/narration/unused/, which is not published)
//   node tools/narrate.mjs --cast                   who reads what: each speaker's voice, a link to hear it, how much it reads
//   node tools/narrate.mjs --audition               one short card in each speaker's voice, into shots/narration/cast/, to hear them by
//   --who "Nephi=<id>" (as often as wanted): another voice for that speaker, this run, in place of the cast's
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const flag = (name, fallback) => (has(name) ? args[args.indexOf(`--${name}`) + 1] : fallback);

// .env, read by hand: KEY=value lines
const env = { ...process.env };
try {
  for (const line of fs.readFileSync(path.join(here, '.env'), 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // (no .env)
}
const KEY_ = env.ELEVENLABS_API_KEY;
// (Brian, one of ElevenLabs' own voices: "deep, resonant and comforting". The family's choice for the journeys.)
const voice = flag('voice', env.ELEVENLABS_VOICE_ID ?? 'nPczCjzI2devNBz1zQrb');
const model = flag('model', env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2');
const format = flag('format', 'mp3_44100_64');
const API = 'https://api.elevenlabs.io';

/**
 * The journeys that can be read aloud. For each: the file its story is written in, where its verses are kept (and
 * what that file calls them), the verses that carry the story (made first, whatever else there is room for), and how
 * its names are said, spelt so that a voice says them so (sent in place of the names, unless --plain).
 */
const STORIES = {
  'plates-of-brass': {
    file: 'src/game/story.js',
    scripture: ['src/game/scripture.js', 'nephi'],
    // what its people say in the story's own words: not scripture, and every one of them is made
    spoken: ['src/game/spoken-nephi.js', 'SPOKEN'],
    key: ['3:7-said', '3:13-said', '3:15-said', '3:29-said', '4:1-said', '4:6', '4:10', '4:11-said', '4:12-said', '4:13', '5:8-said'],
    names: { Nephi: 'Nee-fye', Lehi: 'Lee-hi', Laban: 'Lay-bin', Laman: 'Lay-men', Lemuel: 'Lem-yool', Zoram: 'Zo-rum', Sariah: 'Suh-rye-uh' },
    // It is Nephi's own account ("I, Nephi"): what is told and not said by another is read in his voice.
    teller: 'Nephi',
    // Who speaks in their own voice (the names are scripture.js's SPEAKERS; the voices are ElevenLabs' own, which any
    // account may use: --cast lists them with a link to hear each, and --voices lists what else there is). The
    // Spirit is not given a voice: what the Spirit says is read by the narrator, and by no one else in the journey.
    cast: {
      Nephi: 'TX3LPaxmHKxFdv7VOQHJ', // Liam: a young man
      Lehi: 'pqHfZKP75CvOlQylNhV4', // Bill: an old man
      Sariah: 'XrExE9yKIg1WjnnlVkGX', // Matilda: a woman, warm
      Laman: 'CwhRBWXzGAHq8TQ4Fs17', // Roger: a man, offhand
      Lemuel: 'cjVigY5qzO86Huf0OWal', // Eric: a man, smooth
      Sam: 'bIHbv24MWmeRgasZH58o', // Will: a young man, easy
      Laban: 'N2lVS1w4EtoT3dr4eOWO', // Callum: a man, rough
      // "I commanded him in the voice of Laban" (4:20): Nephi, as Laban, is heard in Laban's voice
      'Nephi, in the voice of Laban': 'N2lVS1w4EtoT3dr4eOWO',
      Zoram: 'iP95p4xoKVk53GoZ742B', // Chris: a man, mild
      'An angel of the Lord': 'JBFqnCBsd6RMkjVDRZzb', // George: a man, grave and warm
    },
  },
  'fiery-furnace': {
    file: 'src/game/daniel.js',
    scripture: ['src/game/scripture-daniel.js', 'daniel'],
    key: ['3:1', '3:6', '3:12', '3:15', '3:16-said', '3:17', '3:18', '3:25-said', '3:27', '3:28-said'],
    names: { Nebuchadnezzar: 'Neb-uh-kud-nezz-er', Shadrach: 'Shay-drak', Meshach: 'Mee-shak', Abednego: 'Uh-bed-nih-go', Chaldeans: 'Kal-dee-uns', Dura: 'Doo-ruh' },
  },
  'lions-den': {
    file: 'src/game/lions-den.js',
    scripture: ['src/game/scripture-daniel.js', 'daniel'],
    key: ['6:4', '6:5-said', '6:7', '6:10', '6:11', '6:14', '6:16-said', '6:18', '6:20-said', '6:22', '6:23', '6:26', '6:27'],
    names: { Darius: 'Duh-rye-us', Medes: 'Meeds', Cyrus: 'Sye-rus' },
  },
  jonah: {
    file: 'src/game/jonah.js',
    scripture: ['src/game/scripture-jonah.js', 'jonah'],
    key: ['1:1', '1:2', '1:4', '1:6-said', '1:12-said', '1:17-a', '2:2-said', '2:7', '2:9', '2:10', '3:2', '3:4-said', '3:10', '4:4-said', '4:10-said', '4:11'],
    names: { Jonah: 'Joe-nuh', Amittai: 'Uh-mit-eye', Nineveh: 'Nin-uh-vuh', Tarshish: 'Tar-shish', Joppa: 'Jop-uh' },
  },
};
const chosenStory = STORIES[flag('story', 'plates-of-brass')];
if (!chosenStory) {
  console.error(`No such journey: ${flag('story')}. There are: ${Object.keys(STORIES).join(', ')}.`);
  process.exit(1);
}
const { key: KEY, names: NAMES } = chosenStory;
// the speakers' voices: the journey's cast, and any said for this run (--who "Nephi=<id>")
const CAST = { ...(chosenStory.cast ?? {}) };
args.forEach((a, i) => {
  if (a !== '--who') return;
  const [name, id] = (args[i + 1] ?? '').split('=');
  if (!name || !id) {
    console.error('--who wants a speaker and a voice: --who "Nephi=<voice id>"');
    process.exit(1);
  }
  CAST[name] = id;
});
/**
 * The voice that reads a card: its speaker's, if they have one of their own; the narrator's, if they have none; and
 * what no one says is read by the journey's teller, if it has one, or else by the narrator.
 */
const TELLER = chosenStory.teller ?? '';
const voiceOf = (who) => (who ? CAST[who] : CAST[TELLER]) || voice;
/** Who a card is read by, as the lists name them. */
const readerOf = (c) => (c.who ? (CAST[c.who] ? c.who : 'The narrator') : CAST[TELLER] ? TELLER : 'The narrator');

const slug = (ref) => ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const spoken = (text) => (has('plain') ? text : text.replace(new RegExp(`\\b(${Object.keys(NAMES).join('|')})\\b`, 'g'), (n) => NAMES[n]));

// the cards, in the story's order: every verse or run of verses the story quotes (as a card, a line at the top, or
// the verse read whole once a word left out of it is filled in), and every part of a verse it shows on its own
const scriptureFile = await import(path.join(here, chosenStory.scripture[0]));
const { verses, reference } = scriptureFile[chosenStory.scripture[1]];
const EXCERPTS = scriptureFile.EXCERPTS ?? {};
const BLANKS = scriptureFile.BLANKS ?? {};
const SAID = scriptureFile.SAID ?? {};
const story = fs.readFileSync(path.join(here, chosenStory.file), 'utf8');
const cards = [];
const add = (id, ref, words, who = '', own = false) => {
  if (cards.some((c) => c.ref === ref)) return;
  const text = spoken(words);
  // (its mark is of its words and of the voice that reads them: a speaker given another voice is made again)
  cards.push({ id, ref, key: slug(ref), text, who, own, voice: voiceOf(who), mark: createHash('sha1').update(`${model}|${voiceOf(who)}|${text}`).digest('hex').slice(0, 12) });
};
const said = [
  ...[...story.matchAll(/(?:verses?|line)\((?:c, )?'(\d+:\d+)'(?:, '(\d+:\d+)')?/g)].map((m) => ({ at: m.index, first: m[1], last: m[2] ?? m[1] })),
  // (a verse with a word left out is then read whole: or, where it is shown under a speaker's name, what is said in it)
  ...[...story.matchAll(/fill\(c, '(\w+)'\)/g)].filter((m) => BLANKS[m[1]]).map((m) => (BLANKS[m[1]].said ? { at: m.index, part: BLANKS[m[1]].said } : { at: m.index, first: BLANKS[m[1]].verse, last: BLANKS[m[1]].verse })),
  // (and one that is only asked: read again, whole, if the word chosen was not the verse's. story.js, `remembered`)
  ...[...story.matchAll(/remembered = \[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/'(\w+)'/g)].filter((k) => BLANKS[k[1]]).map((k) => (BLANKS[k[1]].said ? { at: m.index, part: BLANKS[k[1]].said } : { at: m.index, first: BLANKS[k[1]].verse, last: BLANKS[k[1]].verse }))),
  ...Object.keys(EXCERPTS).filter((k) => story.includes(`'${k}'`)).map((k) => ({ at: story.indexOf(`'${k}'`), part: k })),
].sort((a, b) => a.at - b.at);
for (const s of said) {
  if (s.part) add(s.part, EXCERPTS[s.part].voice, EXCERPTS[s.part].text, EXCERPTS[s.part].who);
  // (a verse or a run of them that is, whole, what one of them says: SAID names who)
  else add(s.first === s.last ? s.first : `${s.first}-${s.last}`, reference(s.first, s.last), verses(s.first, s.last), SAID[s.first]);
}
// what its people say in the story's own words, in the order they are written down (which is the story's)
if (chosenStory.spoken) {
  const table = (await import(path.join(here, chosenStory.spoken[0])))[chosenStory.spoken[1]];
  for (const [id, line] of Object.entries(table)) {
    if (!story.includes(`'${id}'`)) console.warn(`(a spoken line the story does not say: ${id})`);
    else add(id, line.voice, line.text, line.who, true);
  }
}

const dir = path.join(here, 'public/audio/narration');
const manifestPath = path.join(dir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

const call = async (url, options = {}) => {
  if (!KEY_) throw new Error('No key: put ELEVENLABS_API_KEY=... in .env (elevenlabs.io → Developers → API keys).');
  const r = await fetch(API + url, { ...options, headers: { 'xi-api-key': KEY_, 'Content-Type': 'application/json', ...options.headers } });
  if (!r.ok) throw new Error(`${r.status} from ${url}: ${(await r.text()).slice(0, 400)}`);
  return r;
};
const speak = async (text, to, as = voice) => {
  const r = await call(`/v1/text-to-speech/${as}?output_format=${format}`, {
    method: 'POST',
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0, speed: 0.95 } }),
  });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, Buffer.from(await r.arrayBuffer()));
};

try {
  if (has('voices')) {
    const { voices } = await (await call('/v2/voices?page_size=100')).json();
    for (const v of voices) console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${v.category.padEnd(10)} ${Object.values(v.labels ?? {}).join(', ')}\n    ${v.preview_url ?? ''}`);
    console.log(`\n${voices.length} voices. The links play a sample of each, at no cost.`);
    process.exit(0);
  }

  // who reads what: the narrator, and each speaker with a voice of their own
  const readers = [['The narrator', voice], ...Object.entries(CAST)];
  /** What the account calls each voice in use, and where it may be heard: asked once (it costs nothing). */
  const known = new Map();
  const learn = async (ids) => {
    for (const id of new Set(ids)) {
      if (known.has(id)) continue;
      try {
        const v = await (await call(`/v1/voices/${id}`)).json();
        known.set(id, { name: v.name, hear: v.preview_url ?? '' });
      } catch (e) {
        const whose = readers.filter(([, vid]) => vid === id).map(([name]) => name).join(', ');
        throw new Error(`The voice ${id} (${whose}) cannot be used with this key: ${e.message.slice(0, 160)}\nSee what there is with --voices, and give another with --who "${whose.split(', ')[0]}=<id>" or in the cast in tools/narrate.mjs.`);
      }
    }
  };
  if (has('cast')) {
    if (KEY_) await learn(readers.map(([, id]) => id));
    for (const [name, id] of readers) {
      const theirs = cards.filter((c) => readerOf(c) === name);
      const v = known.get(id);
      console.log(`${name.padEnd(22)} ${id}  ${(v?.name ?? '').padEnd(34)} ${String(theirs.length).padStart(3)} card${theirs.length === 1 ? "" : "s"}, ${theirs.reduce((n, c) => n + c.text.length, 0)} characters${v?.hear ? `\n    ${v.hear}` : ''}`);
    }
    const unvoiced = [...new Set(cards.map((c) => c.who).filter((w) => w && !CAST[w]))];
    if (unvoiced.length) console.log(`\nRead by the narrator, having no voice of their own: ${unvoiced.join(', ')}.`);
    if (!KEY_) console.log('\n(No key in .env, so the voices are not named and cannot be heard from here.)');
    else console.log('\nThe links play a sample of each voice, at no cost. --audition makes one short card in each.');
    process.exit(0);
  }
  if (has('audition')) {
    // each speaker's shortest card, in their voice, and the narrator's shortest: to hear them side by side
    await learn(readers.map(([, id]) => id));
    let spent = 0;
    for (const [name, id] of readers) {
      const theirs = cards.filter((c) => readerOf(c) === name).sort((a, b) => a.text.length - b.text.length);
      if (!theirs.length) continue;
      const to = path.join(here, 'shots/narration/cast', `${slug(name)}.mp3`);
      await speak(theirs[0].text, to, id);
      spent += theirs[0].text.length;
      console.log(`${name} (${known.get(id).name}): ${theirs[0].ref.replace(/ cut$/, '')}, ${theirs[0].text.length} characters → ${to}`);
    }
    console.log(`${spent} characters in all.`);
    process.exit(0);
  }

  if (has('tidy')) {
    // The recordings of this journey's book that the journey no longer reads are put away, with their marks, where
    // they are not published: the game asks ahead for the recordings next in the account, and should not ask for
    // ones it will never read. (Put back by moving them and their lines of unused.json back.)
    const book = slug(reference(Object.keys(scriptureFile.VERSES)[0]).replace(/\s\d+:\d+.*$/, ''));
    const used = new Set(cards.map((c) => c.key));
    const stale = Object.keys(manifest).filter((k) => k.startsWith(`${book}-`) && !used.has(k));
    const away = path.join(here, 'shots/narration/unused');
    console.log(`${stale.length} recordings of ${book} that the journey no longer reads${stale.length ? `: ${stale.join(', ')}` : '.'}`);
    if (has('dry') || !stale.length) process.exit(0);
    fs.mkdirSync(away, { recursive: true });
    const listPath = path.join(away, 'unused.json');
    const list = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, 'utf8')) : {};
    for (const k of stale) {
      const file = path.join(dir, `${k}.mp3`);
      if (fs.existsSync(file)) fs.renameSync(file, path.join(away, `${k}.mp3`));
      list[k] = manifest[k];
      delete manifest[k];
    }
    fs.writeFileSync(listPath, `${JSON.stringify(list, null, 1)}\n`);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
    console.log(`Put away in ${away}.`);
    process.exit(0);
  }

  for (const id of KEY) if (!cards.some((c) => c.id === id)) console.warn(`(a key verse the story does not quote: ${id})`);
  const todo = cards.filter((c) => manifest[c.key] !== c.mark || !fs.existsSync(path.join(dir, `${c.key}.mp3`)));
  const total = todo.reduce((n, c) => n + c.text.length, 0);
  console.log(`${cards.length} cards in the story; ${cards.length - todo.length} already made; ${todo.length} to make, ${total} characters.`);

  if (has('say')) {
    // a few words of your own, as they are written, to try how something is said
    if (!voice) throw new Error('Say which voice: --voice <id> (see --voices).');
    const to = path.join(here, 'shots/narration', `${flag('as', 'say')}.mp3`);
    await speak(flag('say'), to);
    console.log(`${flag('say').length} characters → ${to}`);
    process.exit(0);
  }
  if (has('sample')) {
    if (!voice) throw new Error('Say which voice: --voice <id> (see --voices).');
    const card = cards.find((c) => c.id === flag('verse', '4:1')) ?? cards[0];
    const to = path.join(here, 'shots/narration', `${voice}-${card.key}.mp3`);
    await speak(card.text, to);
    console.log(`${card.ref} (${card.text.length} characters) → ${to}`);
    process.exit(0);
  }

  // what the month has left
  let left = has('left') ? Number(flag('left')) : Infinity;
  if (has('left')) console.log(`Supposing ${left} credits left.`);
  else if (KEY_) {
    try {
      const sub = await (await call('/v1/user/subscription')).json();
      left = sub.character_limit - sub.character_count;
      const reset = sub.next_character_count_reset_unix ? new Date(sub.next_character_count_reset_unix * 1000).toDateString() : 'unknown';
      console.log(`Plan: ${sub.tier}. ${left} of ${sub.character_limit} credits left; they come again on ${reset}.`);
    } catch (e) {
      // (a key that may not read the account: then say what is left with --left, or the free plan's whole month is supposed)
      if (!/user_read/.test(e.message)) throw e;
      left = 10000;
      console.log(`The key may not read the account, so ${left} credits are supposed (say otherwise with --left <n>).`);
    }
  } else console.log('No key in .env, so the allowance is not known: this is only the list.');
  const budget = left - Number(flag('keep', '300'));

  // the key verses, then the rest; where they do not all fit, the longest of the rest are left for next time
  // (what its people say in the story's own words is short, and the story is not told without it: made first too)
  const isKey = (c) => c.own || KEY.includes(c.id);
  const chosen = todo.filter(isKey);
  let cost = chosen.reduce((n, c) => n + c.text.length, 0);
  const left_out = [];
  const rest = todo.filter((c) => !isKey(c));
  let over = cost + rest.reduce((n, c) => n + c.text.length, 0) - budget;
  const byLength = [...rest].sort((a, b) => b.text.length - a.text.length);
  const dropped = new Set();
  for (const c of byLength) {
    if (over <= 0) break;
    dropped.add(c);
    over -= c.text.length;
  }
  for (const c of rest) (dropped.has(c) ? left_out : chosen).push(c);
  cost = chosen.reduce((n, c) => n + c.text.length, 0);
  if (cost > budget) throw new Error(`Even the key verses (${cost} characters) are more than is left (${budget}).`);
  console.log(`Making ${chosen.length} (${cost} characters)${left_out.length ? `; leaving ${left_out.length} for next time: ${left_out.map((c) => c.ref.replace(/^.* /, '')).join(', ')}` : ''}.`);
  const voices = [...new Set(chosen.map((c) => c.voice))];
  if (voices.length > 1 || voices[0] !== voice) console.log(`In ${voices.length} voices: ${readers.map(([name]) => [name, chosen.filter((c) => readerOf(c) === name).length]).filter(([, n]) => n).map(([name, n]) => `${name} (${n})`).join(', ')}.`);
  if (has('dry') || !KEY_) process.exit(0);
  if (!voice) throw new Error('Say which voice: --voice <id> (see --voices).');
  // (every voice it is about to use is asked for by name first, so that none fails half way through)
  await learn(voices);

  fs.mkdirSync(dir, { recursive: true });
  for (const c of chosen) {
    await speak(c.text, path.join(dir, `${c.key}.mp3`), c.voice);
    manifest[c.key] = c.mark;
    // (written as it goes, so a run that stops half way keeps what it made)
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
    console.log(`  ${c.own ? `${c.who}: ${c.text}` : `${c.ref.replace(/ cut$/, '')}${c.who ? `  (${c.who}${CAST[c.who] ? '' : ', read by the narrator'})` : ''}`}`);
  }
  console.log('Done. npm run build, and push.');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
