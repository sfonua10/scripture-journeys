// The story, 1 Nephi 3–4 (and the joy of 1 Nephi 5), in beats. Each beat sets the world up for itself (so a family
// can come back to it, and a test can start there) and then runs: what is said, places to walk to, things to do.
//
// It is told by those who were there, not by a narrator. Most of what is said is in the story's own words
// (spoken-nephi.js): short lines, each one's own, each retelling what a verse says that person said or did. They are
// under the speaker's name, with "from 1 Nephi 3:22" small and grey under them, and are never dressed as scripture.
// Face to face they are cards (`say`); as they go they are lines low on the screen, which stop no one (`bark`,
// `talk`).
//
// The scripture itself is kept, word for word and with its reference in gold, where the account turns on it
// (scripture.js): Nephi's sayings (3:7, 3:15, 4:1), what Laban says to Laman (3:13), the angel (3:29), all of Nephi
// before Laban in the street (4:6, 4:9–19: the Spirit's words, and his own account of what he thought and did), and
// their mother's witness (5:8). The words of the Lord, of the Spirit and of the angel are never retold. A card under
// a name with a gold reference is the verse's own words ("NEPHI · I will go and do …"), with only the words that
// tell who speaks left off (SAID, EXCERPTS).
//
// It begins and ends at the tent of their father in the valley of Lemuel (2:6–15), which is a place of its own, three
// days in the wilderness from Jerusalem and out of sight of it; the rest is in the land of Jerusalem.
//
// What happens is fixed, as it is written; how Nephi does it is the player's. He may be overtaken in the chase, and
// it begins again (3:27); he may shrink before Laban as long as he will, and the Spirit speaks again (4:10–12); he
// may answer Zoram wrongly, and is asked again (4:20–24). Nothing he does changes the account.
//
// What is shown follows what the text says and how a family would want it told: Laman and Lemuel's beating of their
// brothers is neither seen nor told (the screen dims, and the angel's question says what it was); Laban's death is
// not seen, and of 4:18 only "I did obey the voice of the Spirit" is read. The screen goes dark for it.
import { IN_LEMUEL, LEHI_TABLE, lemuelCamp } from './city.js';
import { createLife } from './life.js';
import { CAVE, GATE, IN_CITY, LEHI_HOUSE, LEMUEL, lemuelRiver, ROCK } from './places.js';
import { BLANKS, EXCERPTS, SAID } from './scripture.js';
import { BOOK, SPOKEN } from './spoken-nephi.js';
import { telling } from './telling.js';

// What each of them wears, as cel paint ([in the light, in the shade]) and as an outfit (wanderer.js, ROBE).
// Jerusalem about 600 BC: a tunic of wool or linen, short for work and long for the rich, belted; a mantle over it;
// sandals; a cloth on the head. The four brothers are dressed as families know them from the paintings of them.
const tunic = (lit, shade) => ({ SHIRT: [lit, shade], TROUSERS: [lit.map((v) => v * 0.95), shade], SKIRT: [lit, shade] });
export const CLOTHES = {
  // a deep green tunic with short sleeves and a border of scales, a reddish-brown wrap over his shoulder and back,
  // gold bands at his wrist and upper arm, a dagger in his belt
  laman: {
    ...tunic([0.2, 0.42, 0.27], [0.1, 0.21, 0.21]),
    TRIM: [[0.82, 0.64, 0.3], [0.5, 0.38, 0.2]],
    CLOAK: [[0.56, 0.25, 0.15], [0.3, 0.12, 0.11]],
    BELT: [[0.36, 0.22, 0.12], [0.18, 0.11, 0.09]],
    OUTFIT: { head: 'none', cloak: true, hem: 0.5, edge: 2, bare: 0, belt: 2, cuffs: 2, lace: 0.36, blade: 0.2 },
  },
  // a dark fur skin round his waist and nothing over his chest, a band at his wrist, sandals
  lemuel: {
    ...tunic([0.3, 0.21, 0.14], [0.15, 0.1, 0.09]),
    HAIR: [[0.1, 0.07, 0.05], [0.05, 0.04, 0.04]],
    OUTFIT: { head: 'none', cloak: false, hem: 0.6, edge: 3, bare: 2, belt: 0, cuffs: 3, lace: 0.36, blade: 0 },
  },
  // as Nephi: a tunic of rough hide over one shoulder, a wide banded belt, forearm guards; a blue band on his brow
  sam: {
    ...tunic([0.82, 0.72, 0.5], [0.52, 0.42, 0.32]),
    HEADBAND: [[0.22, 0.32, 0.6], [0.12, 0.16, 0.38]],
    HAIR: [[0.22, 0.14, 0.08], [0.11, 0.07, 0.06]],
    OUTFIT: { head: 'band', cloak: false, hem: 0.6, edge: 1, bare: 1, belt: 1, cuffs: 1, lace: 0.42, blade: 0 },
  },
  // a captain of the city, a "mighty man" who "can command fifty" (3:31): a coat of bronze scales over a knee-length
  // tunic of fine white linen, its hem bordered with scales; a wide crimson belt banded with gold; bronze guards on
  // his forearms; a purple mantle bordered with gold, the mark of his rank; and his sword, "the hilt thereof was of
  // pure gold" (4:9). It is this that Nephi puts on: "I did gird on his armor about my loins" (4:19).
  laban: {
    ...tunic([0.96, 0.93, 0.86], [0.56, 0.54, 0.64]),
    CLOAK: [[0.44, 0.15, 0.44], [0.21, 0.07, 0.26]],
    HAT: [[0.95, 0.9, 0.78], [0.58, 0.54, 0.6]],
    TRIM: [[1.0, 0.8, 0.3], [0.62, 0.46, 0.2]],
    BOOTS: [[0.5, 0.32, 0.16], [0.26, 0.15, 0.1]],
    BELT: [[0.62, 0.12, 0.12], [0.34, 0.06, 0.1]],
    BELT2: [[1.0, 0.78, 0.3], [0.62, 0.42, 0.18]],
    LEATHER: [[0.72, 0.5, 0.26], [0.4, 0.27, 0.17]],
    GOLD: [[0.98, 0.74, 0.3], [0.6, 0.4, 0.18]],
    OUTFIT: { head: 'cloth', cloak: true, hem: 0.47, edge: 2, bare: 0, belt: 1, cuffs: 1, lace: 0.4, blade: 0.75, armour: true },
  },
  // his servants: short tunics of undyed wool with a brown stripe at the hem, a cord belt, a plain head cloth
  servant: {
    ...tunic([0.68, 0.61, 0.5], [0.38, 0.34, 0.36]),
    TRIM: [[0.42, 0.3, 0.2], [0.24, 0.16, 0.13]],
    HAT: [[0.6, 0.53, 0.42], [0.34, 0.3, 0.3]],
    BELT: [[0.46, 0.36, 0.24], [0.24, 0.18, 0.15]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.55, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
  },
  // the servant who keeps the treasury: a knee-length linen tunic with a blue band at the hem, a grey-brown mantle
  zoram: {
    ...tunic([0.82, 0.76, 0.62], [0.47, 0.44, 0.5]),
    TRIM: [[0.3, 0.4, 0.62], [0.16, 0.22, 0.4]],
    CLOAK: [[0.44, 0.4, 0.36], [0.22, 0.2, 0.24]],
    HAT: [[0.72, 0.66, 0.54], [0.42, 0.38, 0.42]],
    BELT: [[0.36, 0.22, 0.12], [0.18, 0.11, 0.09]],
    OUTFIT: { head: 'cloth', cloak: true, hem: 0.5, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.32, blade: 0 },
  },
  // their father, in the tent he dwelt in (2:15): an old man's long robe of red-brown wool with a pale mantle over
  // it, a cloth on his head, his hair and beard gone grey
  lehi: {
    ...tunic([0.58, 0.3, 0.2], [0.3, 0.14, 0.14]),
    CLOAK: [[0.84, 0.78, 0.64], [0.5, 0.46, 0.46]],
    HAT: [[0.86, 0.8, 0.68], [0.52, 0.48, 0.5]],
    HAIR: [[0.72, 0.7, 0.66], [0.44, 0.43, 0.45]],
    TRIM: [[0.8, 0.66, 0.36], [0.48, 0.38, 0.22]],
    BELT: [[0.36, 0.22, 0.12], [0.18, 0.11, 0.09]],
    OUTFIT: { head: 'cloth', cloak: true, hem: 0.1, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  // their mother, Sariah (5:1): a long robe of dusk-blue wool to the ankle, wide sleeves, a pale cloth over her head
  sariah: {
    ...tunic([0.36, 0.44, 0.6], [0.18, 0.22, 0.36]),
    HAT: [[0.9, 0.86, 0.76], [0.56, 0.53, 0.56]],
    TRIM: [[0.82, 0.7, 0.5], [0.5, 0.42, 0.32]],
    BELT: [[0.6, 0.42, 0.3], [0.34, 0.22, 0.2]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.05, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  // a heavenly messenger: a loose white robe to below the feet, wide sleeves, open at the neck; white hair
  angel: {
    ...tunic([1.0, 0.98, 0.94], [0.8, 0.8, 0.87]),
    CLOAK: [[1.0, 0.98, 0.94], [0.8, 0.8, 0.87]],
    HAIR: [[0.9, 0.88, 0.84], [0.66, 0.66, 0.7]],
    SKIN: [[0.96, 0.76, 0.6], [0.7, 0.52, 0.48]],
    BOOTS: [[0.96, 0.76, 0.6], [0.7, 0.52, 0.48]],
    TRIM: [[0.98, 0.95, 0.88], [0.8, 0.78, 0.8]],
    OUTFIT: { head: 'none', cloak: false, hem: 0.01, edge: 0, bare: 0, belt: 0, cuffs: 0, lace: 0, blade: 0, sleeves: true, neck: 'v' },
  },
};
/** Who is in the story, in the order they are made, whether they wear a beard, and (if not 1) how tall they stand. */
export const PEOPLE = [
  ['laman', 'laman', true],
  ['lemuel', 'lemuel', true],
  ['sam', 'sam', false],
  ['laban', 'laban', true],
  ['servant1', 'servant', true],
  ['servant2', 'servant', false],
  ['zoram', 'zoram', false],
  ['angel', 'angel', false],
  ['lehi', 'lehi', true],
  ['sariah', 'sariah', false, 0.93],
];

/** What is written, small, over each of them the text names (names.js). `you` is the one you walk as. */
export const NAMES = { you: 'Nephi', laman: 'Laman', lemuel: 'Lemuel', sam: 'Sam', laban: 'Laban', zoram: 'Zoram', lehi: 'Lehi', sariah: 'Sariah' };

export function story(g) {
  const { P, C } = g;
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);
  const who = (name) => g.cast.get(name);
  const at = (npc) => [npc.x, npc.z];
  const me = () => [g.player.x, g.player.z];

  // how the scripture is shown (telling.js): what is said in part of a verse, a verse with a word left out
  const { part, fill } = telling(g, { EXCERPTS, BLANKS, SAID });
  /** A verse or a run of them whole, as a card: under the speaker's name, where the whole of it is what one says. */
  const verse = (c, first, last = first) => c.verse(first, last, { who: SAID[first] ?? '' });

  // What they say in the story's own words (spoken-nephi.js), each in their own voice.
  const told = (key) => ({ voice: SPOKEN[key].voice, from: `${BOOK} ${SPOKEN[key].from}` });
  /** Face to face: a card under the speaker's name, said before the story goes on. */
  const say = (c, key) => c.said(SPOKEN[key].who, SPOKEN[key].text, told(key));
  /** As they go: a line low on the screen under the speaker's name, which stops no one. Resolves when it is said. */
  const bark = (c, key) => c.aside(SPOKEN[key].who, SPOKEN[key].text, told(key));
  /**
   * A few such lines one after another, as they go (a line may be a function, asked when its turn comes: it gives the
   * line, or nothing if it is no longer to be said). Resolves when all are said, so that what follows can wait for
   * the last word; `stop()` says no more of them, where what follows cannot wait.
   */
  function talk(c, lines, { first = 0, gap = 0.6 } = {}) {
    let stopped = false;
    const done = (async () => {
      if (first) await c.wait(first);
      for (const next of lines) {
        const key = !stopped && (typeof next === 'function' ? next() : next);
        if (!key) continue;
        await bark(c, key);
        await c.wait(gap);
      }
    })();
    done.stop = () => void (stopped = true);
    return done;
  }

  // the valley of Lemuel: the tents (a set of the story's own, shown only there), and where they stand in it
  const valley = g.set(lemuelCamp);
  const L = (du, dv) => P(LEMUEL.at[0] + du, LEMUEL.at[1] + dv);
  const beforeTent = L(IN_LEMUEL.tent[0] + 7.8, 0.4);
  const bySariah = L(IN_LEMUEL.tent[0] + 5.6, 3.6);
  const downValley = L(4, -62);
  /**
   * The bank of the river ("he pitched his tent in a valley by the side of a river of water", 2:6), `dv` along the
   * valley from the middle of the camp: `off` metres short of the middle of the water, on the camp's side (less than
   * 0: a point over the water, to look to).
   */
  const bank = (dv, off = 4.4) => L(lemuelRiver(LEMUEL.at[1] + dv) - LEMUEL.at[0] - off, dv);
  // Where things are about the camp: the jars by their father's tent, and where a jar brought from the river is set
  // down by them; where their mother kneels at the water, and where she sits; and where Laman and Lemuel sit by their
  // tents.
  const CAMP = {
    jars: L(-3.8, 5.3),
    byJars: L(-4.6, 4.8),
    water: bank(9, 3.7),
    rest: L(-3.2, 2.9),
    seats: { laman: L(-5.2, -17.6), lemuel: L(-3.6, -16.2) },
  };
  // how a jar of water is carried
  const JAR = { out: 0.3, up: 0.9, wide: 0.13 };
  // The family about the camp, each living his own day until the story has need of him (life.js).
  const life = createLife(g);
  // (for a test: tools/life-scenes.mjs)
  g.life = life;
  /** Which scene this is: what was begun in one (a walk to be finished, a thing to be taken up) is not done in the next. */
  let scenes = 0;
  /** Whether Nephi has answered his father: what they say to him about the camp is another thing after it. */
  let answered = false;
  /**
   * The camp as Nephi finds it when he comes back to the tent of his father (3:1): each of them at what is his to do,
   * over and over, whether he is by or not. What they do is the story's; where they do it is the text's. Their
   * father "dwelt in a tent" (2:15) by a river, and spoke to his sons at the water (2:9–10). Laman and Lemuel "did
   * murmur against their father" (2:11–12). Sam believed Nephi's words (2:17).
   */
  function campLife() {
    answered = false;
    const [lehi, sariah, laman, lemuel, sam] = ['lehi', 'sariah', 'laman', 'lemuel', 'sam'].map(who);
    const { jars, byJars, water, rest, seats } = CAMP;
    const over = (dv) => bank(dv, -5);
    // Their father: down to the river, where he stands a while; back to the cloth at the door of his tent, where he
    // sits; and stands before it, looking down the valley. He has a thing to tell Nephi (3:2): when Nephi comes near
    // he leaves off, gets up, and stands turned to him.
    lehi.place(...beforeTent, yawTo(beforeTent, bank(2)));
    life.live(
      lehi,
      [
        { stay: 10, face: L(4, -40) },
        { go: [bank(2)], pace: 1.1 },
        { stay: 12, face: over(2), look: true },
        { go: [L(-2.6, 0.2)], pace: 1.1 },
        { stay: 16, face: over(0), sit: true },
        { go: [beforeTent], pace: 1.0 },
      ],
      // (until Nephi has heard him and answered, what there is to say to him is the story's: a1)
      { from: 1, notice: { waits: true, near: 10, as: 'your father' } },
    );
    // Their mother: to the river with a jar, where she kneels at the water; back with it to the jars by the tent; and
    // sits there a little, looking up the valley.
    sariah.place(...jars, yawTo(jars, water));
    g.props.carry('waterjar', sariah, JAR);
    life.live(
      sariah,
      [
        { go: [water], pace: 1.25 },
        { put: 'waterjar' },
        { stay: 6, face: over(9), kneel: true },
        { take: 'waterjar', hold: JAR },
        { go: [jars], pace: 1.15 },
        { put: 'waterjar', at: byJars },
        { stay: 5, face: byJars },
        { go: [rest], pace: 1.1 },
        { stay: 14, face: L(6, 30), sit: true },
        { go: [jars], pace: 1.1 },
        { stay: 1.5, face: byJars },
        { take: 'waterjar', hold: JAR },
      ],
      { notice: { say: () => (answered ? 'besafe' : 'asking'), as: 'your mother', answers: () => (answered ? ['besafe', 'longroad'] : ['asking', 'river']) } },
    );
    // Laman and Lemuel, by their own tents ("thy brothers murmur", 3:5): they sit together, go down to the water one
    // after the other, and come back.
    laman.sit = lemuel.sit = 1;
    laman.place(...seats.laman, yawTo(seats.laman, seats.lemuel));
    lemuel.place(...seats.lemuel, yawTo(seats.lemuel, seats.laman));
    life.live(
      laman,
      [
        { stay: 18, face: seats.lemuel, sit: true },
        { go: [bank(-18)], pace: 1.35 },
        { stay: 10, face: over(-18) },
        { go: [seats.laman], pace: 1.3 },
      ],
      { notice: { say: () => 'leftall', as: 'Laman', answers: () => ['leftall', 'visionary'] } },
    );
    life.live(
      lemuel,
      [
        { stay: 21, face: seats.laman, sit: true },
        { go: [bank(-15.6)], pace: 1.3 },
        { stay: 8, face: () => at(laman), look: true },
        { go: [seats.lemuel], pace: 1.3 },
      ],
      { notice: { say: () => 'greatcity', as: 'Lemuel', answers: () => ['greatcity', 'inheritance'] } },
    );
    // Sam, apart from them, up the valley, where Nephi comes down it: he looks for him, and comes a few steps to him.
    const lookout = L(3, 22);
    sam.place(...lookout, yawTo(lookout, L(9, 36)));
    life.live(
      sam,
      [
        { stay: 8, face: L(9, 36), look: true },
        { go: [bank(17)], pace: 1.4 },
        { stay: 9, face: over(17) },
        { go: [L(-6.4, 12.4)], pace: 1.4 },
        { stay: 9, face: L(-12, 15.5), look: true },
        { go: [lookout], pace: 1.4 },
      ],
      { notice: { say: () => 'believe', near: 7, comes: true, as: 'Sam', answers: () => ['believe', 'answered'] } },
    );
  }
  /**
   * "And I, Nephi, and my brethren took our journey in the wilderness" (3:9): his brothers leave what they were about
   * and fall in with Nephi, one after another. Sam first; Laman last.
   */
  function makeReady(c) {
    const mine = scenes;
    const order = { sam: [0, [2.4, 1.1]], lemuel: [0.9, [4.6, 1.6]], laman: [2.2, [3.6, -1.4]] };
    for (const [name, [after, gap]] of Object.entries(order)) {
      const n = who(name);
      (async () => {
        if (after) await c.wait(after);
        if (scenes !== mine) return;
        n.face(null).follow(g.player, ...gap).maxSpeed = undefined;
      })();
    }
  }

  /**
   * In this beat Nephi may speak to whoever he is by (E), and what they say as they go is said as any line said as
   * they go. Each beat that has people in it says so, since a beat that does not open a scene has the last one's.
   */
  function alive(c) {
    life.voice = (key) => bark(c, key);
    life.free = null;
    c.also(() => life.offer());
  }
  /**
   * His brothers as they go with him: each looks to him, and answers him when he speaks to him. `say` is for each
   * of them ({ laman: [...], ... }) the names of what he answers in this part of the way.
   */
  function withMe(say, more = {}) {
    for (const [name, answers] of Object.entries(say)) life.with(who(name), { as: NAMES[name], answers: () => answers, ...more });
  }
  const BROTHERS = ['laman', 'lemuel', 'sam'];
  /** They leave off what they were doing, and come to stand about Nephi, turned to him (for what is to be said). */
  async function gather(c, names = BROTHERS) {
    life.hold(...names.map(who));
    // (on his side toward them, where they already are)
    const mid = [0, 1].map((k) => BROTHERS.map(who).filter((n) => n.visible).reduce((t, n, _, all) => t + at(n)[k] / all.length, 0));
    const [fx, fz] = unit(me(), mid);
    const spots = { laman: [2.6, -1.6], lemuel: [3.2, 0.6], sam: [2.4, 2.2] };
    await c.hold(
      Promise.race([
        Promise.all(
          names.map((name) => {
            const n = who(name);
            const [out, side] = spots[name];
            const p = [g.player.x + fx * out + fz * side, g.player.z + fz * out - fx * side];
            // (one already near enough only turns)
            if (Math.hypot(p[0] - n.x, p[1] - n.z) < 1.2) return n.face(...me());
            n.face(null);
            return n.walk([p], 1.9).then(() => n.face(...me()));
          }),
        ),
        c.wait(6),
      ]),
    );
    for (const name of names) who(name).face(...me());
  }

  /**
   * "And we cast lots—who of us should go in unto the house of Laban" (3:11). How they were cast the account does
   * not say; here, as lots were cast: they stand round, and Laman, the eldest, sets a jar down between them. Each
   * puts in his lot, a small stone with his mark, Nephi with them. Laman shakes the jar, and one stone leaps out:
   * they all look at it. It is his. (What he says of it is said after: `lot`.) Resolves when they have seen it.
   */
  async function castLots(c) {
    const mine = scenes;
    const [laman, lemuel, sam] = BROTHERS.map(who);
    const mid = [0, 1].map((k) => (at(laman)[k] + at(lemuel)[k] + at(sam)[k]) / 3);
    const f = unit(me(), mid);
    const centre = [g.player.x + f[0] * 1.8, g.player.z + f[1] * 1.8];
    const side = [-f[1], f[0]];
    const ring = {
      laman: [centre[0] + side[0] * 1.3, centre[1] + side[1] * 1.3],
      lemuel: [centre[0] + f[0] * 1.35, centre[1] + f[1] * 1.35],
      sam: [centre[0] - side[0] * 1.3, centre[1] - side[1] * 1.3],
    };
    // (seen from behind Nephi and a little above, down into the middle of them)
    g.standAt(...me(), yawTo(me(), centre));
    shoulder(centre, { back: 3.3, up: 2.4, look: 0.2 });
    // they come round into a ring
    await Promise.race([
      Promise.all(
        Object.entries(ring).map(([name, p]) => {
          const n = who(name);
          n.face(null);
          return n.walk([p], 1.5).then(() => n.face(...centre));
        }),
      ),
      c.wait(4.5),
    ]);
    if (scenes !== mine) return;
    for (const n of [laman, lemuel, sam]) n.stop().face(...centre);
    await c.wait(0.4);
    // Laman sets down the jar between them
    laman.kneel = 1;
    await c.wait(0.8);
    g.props.show('waterjar', centre);
    g.music.thud(0.5);
    laman.kneel = 0;
    await c.wait(0.7);
    // each puts in his lot: Sam, Lemuel, Nephi, and Laman last
    const drop = async (n) => {
      if (n === g.player) g.player.kneel = 1;
      else n.kneel = 1;
      await c.wait(0.75);
      g.music.rattle(0.5);
      await c.wait(0.35);
      if (n === g.player) g.player.kneel = 0;
      else n.kneel = 0;
      await c.wait(0.45);
    };
    for (const n of [sam, lemuel, g.player, laman]) {
      await drop(n);
      if (scenes !== mine) return;
    }
    // he takes it up, and shakes it
    laman.kneel = 1;
    await c.wait(0.7);
    const JARHELD = { out: 0.32, up: 1.0, wide: 0.13 };
    g.props.carry('waterjar', laman, JARHELD);
    laman.kneel = 0;
    await c.wait(0.6);
    for (const n of [lemuel, sam]) n.look = at(laman);
    for (let k = 0; k < 10; k++) {
      g.props.carry('waterjar', laman, { ...JARHELD, up: JARHELD.up + (k % 2 ? 0.09 : -0.05), out: JARHELD.out + (k % 2 ? 0.03 : 0) });
      if (k % 3 === 0) g.music.rattle(0.9);
      await c.wait(0.11);
    }
    g.props.carry('waterjar', laman, JARHELD);
    await c.wait(0.35);
    // one leaps out, and falls before them
    const falls = [centre[0] + (laman.x - centre[0]) * 0.35, centre[1] + (laman.z - centre[1]) * 0.35];
    g.props.carry('waterjar', laman, { ...JARHELD, up: 0.85, out: 0.42 });
    g.music.rattle(0.6);
    await c.wait(0.2);
    g.props.show('lot', falls, { turn: 0.6 });
    g.music.thud(0.35);
    // they all look down at it
    for (const n of [laman, lemuel, sam]) {
      n.look = null;
      n.face(...falls);
    }
    shoulder(falls, { back: 2.6, up: 2.1, look: 0 });
    await c.wait(1.6);
    // and at Laman, whose it is
    for (const n of [lemuel, sam]) n.face(...at(laman));
    g.props.show('waterjar', [laman.x + (centre[0] - laman.x) * 0.45, laman.z + (centre[1] - laman.z) * 0.45]);
    await c.wait(0.6);
    laman.face(...me());
    shoulder(at(laman), { back: 3.2, up: 2.1, look: 1.5 });
    await c.wait(0.5);
  }

  // the places in the land of Jerusalem, in the world's (x, z)
  // (where they come up into the land, on the path to the gate; and where his brethren have stopped on it)
  const camp = P(4, 5);
  const onTheWay = P(24, 8);
  const gateOut = P(GATE[0] - 14, 0);
  const gateIn = C(-62, 0);
  // Laban's court, within his gates (places.js, IN_CITY.court: the street's gateway at cu 22, his house's door on
  // its east side): the gateway, his door, where each of them stands when they go in unto him (3:24), and where he
  // and his servants stand to meet them
  const COURT = {
    gate: C(21.2, 30.6),
    within: C(23.4, 30.6),
    door: C(29.0, 31.0),
    nephi: C(24.8, 30.6),
    laman: C(23.7, 28.5),
    lemuel: C(23.5, 32.6),
    sam: C(23.2, 30.9),
    laban: C(27.6, 30.8),
    s1: C(27.2, 28.1),
    s2: C(27.2, 33.5),
  };
  /**
   * Laban at home, in his court, with two of his servants: seen through his gateway from the street as they come up
   * to it. He stands before his door, looking about him; they go about the court.
   */
  function labanAtHome() {
    const [laban, s1, s2] = ['laban', 'servant1', 'servant2'].map(who);
    laban.place(...COURT.door, yawTo(COURT.door, COURT.gate));
    s1.place(...COURT.s1, yawTo(COURT.s1, COURT.gate));
    s2.place(...COURT.s2, yawTo(COURT.s2, COURT.door));
    life.live(laban, [{ stay: 12, face: COURT.gate, look: true }, { stay: 8, face: C(25, 24) }]);
    life.live(s1, [{ stay: 7, face: COURT.gate }, { go: [C(26, 23.5)], pace: 1 }, { stay: 5, look: true }, { go: [COURT.s1], pace: 1 }]);
    life.live(s2, [{ stay: 9, face: COURT.door }, { go: [C(26.4, 38.5)], pace: 1 }, { stay: 6, look: true }, { go: [COURT.s2], pace: 1 }]);
  }
  const lehiYard = P(LEHI_HOUSE[0], LEHI_HOUSE[1] + 2);
  const lehiOut = P(LEHI_HOUSE[0], LEHI_HOUSE[1] + 24);
  // where his brethren hide without the walls by night (4:5), not far from the gate; and where Nephi stands by them
  const hiding = P(GATE[0] - 13, 24);
  const hide = P(GATE[0] - 10, 20);
  // just without the gate, where he comes out to them with Zoram (4:27–28)
  const withoutWalls = P(GATE[0] - 14, 12);
  // the cavity of the rock: the middle of its floor, its mouth, the open ground before it, and where the brothers
  // stand in it, at the back
  const hollow = P(...CAVE.at);
  const mouth = P(...CAVE.mouth);
  const beforeRock = P(CAVE.mouth[0] + 8, CAVE.mouth[1] - 1);
  const inRock = { sam: P(ROCK[0] - 2.6, ROCK[1] + 1.5), laman: P(ROCK[0] - 3.0, ROCK[1] - 0.8), lemuel: P(ROCK[0] - 1.2, ROCK[1] - 1.9) };
  const fallen = C(...IN_CITY.fallen);
  const treasuryDoor = C(IN_CITY.treasuryDoor[0], IN_CITY.treasuryDoor[1]);
  const beforeTreasury = C(IN_CITY.treasuryDoor[0] - 1, IN_CITY.treasuryDoor[1] + 3.5);
  // into the treasury: before its door, within it, the table at the back where the plates lie, and where the two
  // of them stand by it
  const doorOut = C(IN_CITY.treasuryDoor[0], IN_CITY.treasuryDoor[1] + 1.5);
  const doorIn = C(IN_CITY.treasuryDoor[0], IN_CITY.treasuryDoor[1] - 3.5);
  const table = C(...IN_CITY.table);
  const byTable = C(IN_CITY.table[0] + 1.7, IN_CITY.table[1] + 1.6);
  const withHim = C(IN_CITY.table[0] - 0.9, IN_CITY.table[1] + 3.1);
  const room = C(IN_CITY.table[0], IN_CITY.table[1] + 5.5);
  // the ways: from the land of inheritance up to the gate, and through the city to Laban's
  // (the points along the open road only show the way: director.js, reach)
  const fromLehi = [[...P(175, -190), 14], [...P(190, -110), 14], [...P(205, -40), 14], gateOut];
  const toLaban = [gateIn, C(-20, 0), C(19.5, 1), C(19.5, 22)];
  const outOfCity = [C(19.5, 1), C(-20, 0), gateIn, gateOut];
  // Lehi's house: the way in by its door (before it, and within), and where the brothers stand in it
  const H = (du, dv) => P(LEHI_HOUSE[0] + du, LEHI_HOUSE[1] + dv);
  const lehiDoorOut = H(0, -2.2);
  // (just without the gate of its court, which he must come out by)
  const lehiGate = H(0, 12);
  const lehiDoorIn = H(0, -6.6);
  const inLehi = { laman: H(-4.2, -8.0), lemuel: H(4.6, -6.4), sam: H(1.9, -6.0) };
  // the riches, within the house: the gold at the back, the silver by the east wall, the precious things on the table
  const riches = {
    gold: { at: H(-5.6, -10.2), name: 'The gold', label: 'Gather the gold', taken: 'Laman takes up the gold.' },
    silver: { at: H(6.3, -8.4), name: 'The silver', label: 'Gather the silver', taken: 'Lemuel takes up the silver.' },
    precious: { at: H(0, -10.85), up: LEHI_TABLE, name: 'The precious things', label: 'Gather the precious things', taken: 'You take up the precious things.' },
  };

  /** The three brothers, standing about a place and facing a point. */
  function brothersAt([x, z], face) {
    const spots = [[-2.4, 1.2], [-1.2, 2.8], [1.8, 2.2]];
    ['laman', 'lemuel', 'sam'].forEach((name, i) => {
      const [dx, dz] = spots[i];
      const p = [x + dx, z + dz];
      who(name).place(p[0], p[1], yawTo(p, face)).face(...face);
    });
  }
  /** The three keep up with Nephi, Sam nearest. */
  function followMe(options) {
    who('sam').follow(g.player, 2.4, 1.1, options);
    who('laman').follow(g.player, 3.6, -1.4, options);
    who('lemuel').follow(g.player, 4.6, 1.6, options);
  }
  /**
   * Laman goes before along a way [[x, z], ...], Lemuel at his shoulder, and Sam walks beside Nephi. They keep
   * Nephi's pace, and wait for him if he falls behind. (The lot fell upon Laman, the eldest: the errand is his, and
   * he is not led to it by the youngest. Where they follow Nephi, it is because it is written that they did: 4:4.)
   */
  function lamanLeads(way) {
    who('laman').lead(g.player, way, 6.5, -0.7);
    who('lemuel').lead(g.player, way, 5.2, 1.5);
    who('sam').follow(g.player, 1.7, -1.6, { abreast: true });
  }
  /** Over Nephi's shoulder, at someone or something: a still view while the cards about it are read. */
  const shoulder = (point, options) => g.shoulder(point, options);
  const nearest = (names) => names.map(who).sort((a, b) => Math.hypot(a.x - g.player.x, a.z - g.player.z) - Math.hypot(b.x - g.player.x, b.z - g.player.z))[0];
  function reset({ hour, stand, face, clothes = 'nephi', town = false, lemuel = false }) {
    scenes++;
    // (no one is about the camp's business any more, nor sitting or on his knees where it left him)
    life.clear();
    for (const name of ['lehi', 'sariah', 'laman', 'lemuel', 'sam']) Object.assign(who(name), { sit: 0, kneel: 0 });
    g.cast.clear();
    g.props.reset();
    // (the tents of the valley of Lemuel are there only in the valley; and from it nothing of Jerusalem is seen)
    valley.show(lemuel);
    g.land(true, { city: !lemuel });
    g.setHour(hour);
    g.dress(clothes);
    g.view(null);
    g.guidance.lead(null);
    g.guidance.shine(null);
    g.music.stop();
    g.sounds.hush(0);
    g.burden(null);
    g.hurry(false);
    // the treasury is shut, and the plates lie in it, where a lamp burns
    g.room('treasury');
    g.door(false);
    g.props.show('plates', table, { up: IN_CITY.tableTop });
    // people in the streets by day; by night very few (`town: 'night'`), or none
    if (town === true) g.town.day(life);
    else g.town.night(life, town === 'night');
    g.standAt(stand[0], stand[1], yawTo(stand, face));
  }
  /** Their property, in their arms: Laman has the gold, Lemuel the silver, Nephi the precious things. */
  const bearers = { gold: () => who('laman'), silver: () => who('lemuel'), precious: () => g.player };
  const bear = (name) => g.props.carry(name, bearers[name](), { out: 0.34, up: 1.0, size: 0.6, wide: name === 'gold' ? 0.27 : 0.3 });
  /**
   * One of his brothers takes up what Nephi has found for him (the gold Laman, the silver Lemuel): he goes to it,
   * goes down on his knees for it, and stands with it in his arms, turned to Nephi. Resolves when he has it.
   */
  async function takeUp(c, name, answers) {
    const mine = scenes;
    const n = bearers[name]();
    const spot = riches[name].at;
    life.hold(n);
    n.yields = null;
    const d = Math.hypot(spot[0] - n.x, spot[1] - n.z) || 1;
    n.face(null);
    if (d > 0.9) await Promise.race([n.walk([lerp(at(n), spot, 1 - 0.7 / d)], 1.8), c.wait(5)]);
    if (scenes !== mine) return;
    n.stop().face(...spot);
    await c.wait(0.3);
    n.kneel = 1;
    await c.wait(0.8);
    n.kneel = 0;
    await c.wait(0.35);
    if (scenes !== mine) return;
    bear(name);
    life.with(n, { as: NAMES[name === 'gold' ? 'laman' : 'lemuel'], answers: () => answers });
    n.face(...me());
  }
  /** Laban where he fell, with the wine he had drunk (4:7). */
  function fallenLaban() {
    const laban = who('laban').place(...fallen, 1.2).lie(true);
    laban.stirs = true;
    g.props.show('jar', [fallen[0] + 1.25, fallen[1] + 0.5], { turn: 0.7 });
    g.props.show('cup', [fallen[0] - 0.75, fallen[1] + 0.85], { turn: 2.3 });
    return laban;
  }
  const from = ([x, z]) => Math.hypot(g.player.x - x, g.player.z - z);
  /**
   * Asks how Nephi will answer, until he answers as he did. What is asked is a thought, and so is what follows a
   * wrong answer (they are not the scripture's words, and are in italic); the right answer is the scripture's, and
   * its verse follows. With ?wrong a test takes the wrong answer first.
   */
  async function ask(c, question, answers, right, otherwise) {
    for (let tries = 0; ; tries++) {
      const took = await c.choice(question, answers, { auto: g.flag('wrong') && tries === 0 ? (right + 1) % answers.length : right });
      if (took === right) return;
      // (one thing for any wrong answer, or one for each: a list as long as the answers)
      await c.thought(Array.isArray(otherwise) ? otherwise[took] : otherwise);
    }
  }
  /** What he is to do in the night, when nothing is marked: "I was led by the Spirit, not knowing beforehand the things which I should do" (4:6). */
  const LED = 'Follow the light of the Spirit.';
  /** What Nephi has said of the Lord before the chase (scripture.js, BLANKS): one is asked as each try at it begins. */
  const remembered = ['faithful', 'accomplished', 'way'];
  /**
   * Asks for the word left out of a verse (BLANKS), once. Resolves true if it was the verse's; if not, what was said
   * is read again, and it resolves false. Nothing is lost by a wrong answer. With ?wrong a test answers wrongly.
   */
  async function recall(c, key) {
    const q = BLANKS[key];
    const auto = g.flag('wrong') ? (q.right + 1) % q.answers.length : q.right;
    const took = await c.choice(q.text, q.answers, { ref: g.reference(q.verse), who: q.who ?? '', auto });
    if (took === q.right) return true;
    if (q.said) await part(c, q.said);
    else await verse(c, q.verse);
    return false;
  }

  return [
    // ---- Act one: up to Jerusalem (1 Nephi 3:1–21) ----
    // In the valley of Lemuel, at the tent of his father: what the Lord has commanded, and Nephi's answer (3:1–9).
    {
      id: 'a1',
      label: 'Act One',
      scene: true,
      setup() {
        reset({ hour: 15.4, stand: L(9, 36), face: L(2, 0), lemuel: true });
        // (his father and his mother about his father's tent, and his brothers by their own, each at his own day)
        campLife();
      },
      async run(c) {
        await c.fade(0, 2);
        g.narration?.warm(SPOKEN.dream.voice);
        await c.chapter('Act One', 'Up to Jerusalem', 'The valley of Lemuel · 1 Nephi 3');
        const [lehi, sariah, laman, lemuel, sam] = ['lehi', 'sariah', 'laman', 'lemuel', 'sam'].map(who);
        // (what they say about the camp to one who comes near is said as any line said as they go)
        life.voice = (key) => bark(c, key);
        // (and he may speak to any of them himself, whoever he is by)
        c.also(() => life.offer());
        c.objective('Go to your father, at his tent.', 'Your father’s tent');
        // (his father is where his day has him: at his tent, or down by the river)
        await c.act(lehi, 3.4, 'Speak with your father');
        c.objective(null);
        // They leave what they were doing. Their mother comes to his side to hear it; Laman and Lemuel get up, and
        // look to their father.
        life.hold(lehi, sariah, laman, lemuel);
        lehi.face(...me());
        for (const n of [laman, lemuel]) n.face(...at(lehi));
        {
          // (beside him, on the side she is already on, and a little behind him)
          const [fx, fz] = unit(me(), at(lehi));
          const side = Math.sign((sariah.x - lehi.x) * fz - (sariah.z - lehi.z) * fx) || 1;
          sariah.walk([[lehi.x + fz * side * 2.2 + fx * 0.6, lehi.z - fx * side * 2.2 + fz * 0.6]], 1.5).then(() => life.state(sariah) === 'held' && sariah.face(...me()));
        }
        const toLehi = () => shoulder(at(lehi), { back: 3.6, up: 2.1, look: 1.4 });
        toLehi();
        await say(c, 'dream');
        await say(c, 'plates');
        // "thy brothers murmur, saying it is a hard thing" (3:5): Laman, come a few steps toward their father from
        // where he was; and their father answers him
        // (seen from beside the line between them, since their father stands between him and Nephi)
        const father = at(lehi);
        const comes = lerp(at(laman), father, Math.min(0.35, 7 / (Math.hypot(father[0] - laman.x, father[1] - laman.z) || 1)));
        laman.walk([comes], 1.7).then(() => laman.face(...at(lehi)));
        const [du, dv] = [comes[0] - father[0], comes[1] - father[1]];
        const far = Math.hypot(du, dv) || 1;
        const near = lerp(comes, father, Math.min(0.55, 5.7 / far));
        g.view({ from: [near[0] + (dv / far) * 2.4, near[1] - (du / far) * 2.4, 1.7], to: [...comes, 1.35] });
        await say(c, 'hard');
        toLehi();
        await say(c, 'commandment');
        // "I will go and do": he answers, and the word is his to say
        g.view(null);
        await c.act(lehi, 9, 'Answer your father', { mark: false });
        toLehi();
        await fill(c, 'do');
        // his father was exceedingly glad, for he knew that he had been blessed of the Lord (3:8)
        await say(c, 'blessed');
        g.view(null);
        // He has his errand. Sam, who believed him, comes to him at once. Laman and Lemuel go back to what they were
        // about; so do their father and their mother, when he has gone from them. And while he is still by them, or
        // if he comes by them again before he leaves the camp, they have a word for him: "go, my son" (3:6); and his
        // mother's, who mourned for them while they were gone (5:1–2).
        answered = true;
        withMe({ sam: ['believe', 'answered'] });
        // (he comes at a good pace, and does not run across the camp to him)
        sam.follow(g.player, 2.4, 1.1).maxSpeed = 3.4;
        // (his mother first, at once; his father when he has stood there a while and not gone)
        life.notice(lehi, { say: () => 'favored', after: 9, near: 5.5, answers: () => ['favored', 'notmurmured'] });
        life.notice(sariah, { say: () => 'besafe', after: 2.5, near: 5.5 });
        life.resume(lehi, sariah, laman, lemuel);
        c.objective('Go to your brethren, by their tents.', 'Your brethren');
        // (Laman, the eldest, wherever he is: by their tents, or down at the water)
        await c.act(laman, 4.5, 'Call your brethren to the journey');
        life.hold(laman, lemuel);
        for (const n of [laman, lemuel]) n.face(...me());
        await say(c, 'tents');
        // and after Nephi, one after another (as they go, he may speak with them still)
        withMe({ laman: ['leftall', 'visionary'], lemuel: ['greatcity', 'inheritance'] });
        makeReady(c);
        c.objective('Take your journey in the wilderness: go down the valley.', 'Down the valley');
        // (as they make ready and go: Lemuel murmurs still, and Sam is with him)
        // (and while that is said, no one about the camp says anything over it)
        let talking = true;
        life.free = () => !talking;
        const going = talk(c, ['allthatway', 'withyou'], { first: 2 });
        going.then(() => (talking = false));
        // Only the four of them go (3:9). Their father and their mother stay at the camp (5:1–6): when their sons are
        // on their way down the valley they leave off what they were doing, and stand looking after them.
        let gone = false;
        await c.reach(...downValley, 7, {
          unless() {
            if (!gone && from(downValley) < 42) {
              gone = true;
              life.hush();
              life.watch(lehi, sariah);
            }
            return false;
          },
        });
        await going;
        c.objective(null);
        await c.fade(1, 1.6);
      },
    },
    // In the land of Jerusalem, on their way up to it, the city before them: they consult, and cast lots (3:10–11).
    {
      id: 'a1-land',
      label: 'Act One',
      scene: true,
      setup() {
        reset({ hour: 15.4, stand: camp, face: gateOut, town: true });
        // (his brethren a little ahead of him on the way, where they have stopped)
        brothersAt(onTheWay, gateOut);
      },
      async run(c) {
        g.narration?.warm(SPOKEN.lots.voice);
        alive(c);
        // "when we had gone up to the land of Jerusalem, I and my brethren did consult one with another" (3:10).
        // While Nephi comes up to them they are each at something: Laman sits a little apart, looking at the
        // city; Sam goes a little up the way to see it better; Lemuel walks about, and looks back the way they came.
        const [laman, lemuel, sam] = BROTHERS.map(who);
        const city = gateOut;
        // (Laman a few steps apart from the other two, so that it is to him Nephi goes to cast the lots)
        const away = unit(lerp(at(lemuel), at(sam), 0.5), at(laman));
        const seat = [laman.x + away[0] * 3.5, laman.z + away[1] * 3.5];
        const ahead = lerp(at(sam), city, 9 / (from(city) || 1));
        const behind = [lemuel.x + 3.5, lemuel.z - 3];
        life.live(laman, [{ go: [seat], pace: 1 }, { stay: 40, face: city, sit: true }], { notice: { say: () => 'whogoes', near: 7, as: 'Laman' } });
        life.live(sam, [{ go: [ahead], pace: 1.2 }, { stay: 9, face: city, look: true }, { go: [at(sam)], pace: 1.2 }, { stay: 7, face: () => me() }], {
          notice: { as: 'Sam', answers: () => ['thereitis', 'withyou'], passes: true },
        });
        life.live(lemuel, [{ stay: 6, face: city }, { go: [behind], pace: 1.1 }, { stay: 6, face: camp, look: true }, { go: [at(lemuel)], pace: 1.1 }], {
          notice: { as: 'Lemuel', answers: () => ['stillstands', 'greatcity'], passes: true },
        });
        await c.fade(0, 1.6);
        await c.chapter('Act One', 'The Land of Jerusalem', '1 Nephi 3:9', 2.6);
        c.objective('Go to your brethren, and cast lots with them.', 'Cast lots');
        // (by Laman, the eldest, where he sits)
        await c.act(laman, 2.4, 'Cast lots with your brethren');
        c.objective(null);
        await gather(c);
        await say(c, 'lots');
        // "And we cast lots ... and the lot fell upon Laman" (3:11)
        await c.hold(castLots(c));
        g.music.pluck();
        await say(c, 'lot');
        g.view(null);
        c.objective('Go up to the gate of Jerusalem with your brethren.', 'Gate of Jerusalem');
        // the lot is Laman's: he goes before, Lemuel with him, and Sam beside Nephi
        withMe({ laman: ['lot', 'whogoes'], lemuel: ['notmine', 'stillstands'], sam: ['withyou', 'thereitis'] });
        lamanLeads([me(), gateOut]);
        await c.reach(...gateOut, 9);
      },
    },
    {
      id: 'a1-gate',
      label: 'Act One',
      setup() {
        reset({ hour: 15.8, stand: gateOut, face: gateIn, town: true });
        brothersAt(P(GATE[0] - 18, -3), gateIn);
      },
      async run(c) {
        alive(c);
        const [laman, lemuel, sam] = BROTHERS.map(who);
        life.end(laman, lemuel, sam);
        for (const n of [sam, lemuel]) n.stop().face(...gateIn);
        // the lot fell upon Laman: he goes in alone, and they wait without the gate. He says what he goes in to do as
        // he goes, so that it is known why they stand there.
        c.objective('Wait without the gate, while Laman goes in unto Laban.', 'Without the gate');
        const going = bark(c, 'wait');
        const inside = laman.walk([P(GATE[0] - 6, -1), gateIn, C(-58, 0.5)], 2.0).then(() => laman.show(false));
        // They wait, and Nephi with them, as long as it takes him: Sam by the gate, watching for him to come out;
        // Lemuel walking up and down, and back to sit by their things.
        const watchFor = P(GATE[0] - 9, 3);
        const sits = P(GATE[0] - 19, -4.5);
        life.live(sam, [{ go: [watchFor], pace: 1.2 }, { stay: 12, face: gateIn, look: true }, { stay: 6, face: () => me() }], { notice: { as: 'Sam', answers: () => ['lethimspeak', 'withyou'], passes: true } });
        life.live(lemuel, [{ go: [P(GATE[0] - 23, -1)], pace: 1.1 }, { stay: 4, face: P(150, 0), look: true }, { go: [sits], pace: 1.1 }, { stay: 14, face: gateIn, sit: true }], {
          notice: { as: 'Lemuel', answers: () => ['notmine', 'stillstands'], passes: true },
        });
        await Promise.all([inside, going]);
        // (a while: or less, if he goes in at the gate after him)
        const waited = c.time;
        await c.until(() => c.time - waited > 14 || from(gateIn) < 8 || g.auto);
        // what Laban said to him, in the scripture's words (3:13): he is not seen, and neither is Laban
        c.objective(null);
        life.hold(sam, lemuel);
        await part(c, '3:13-said');
        // and comes back out, fast: "Laman fled out of his presence, and told the things which Laban had done" (3:14)
        laman.place(...C(-55, 0), yawTo(C(-55, 0), gateIn));
        await c.hold(laman.walk([gateIn, P(GATE[0] - 8, 0), [g.player.x + 2.5, g.player.z + 1]], 5));
        laman.face(...me());
        // (and the other two come to hear it)
        await gather(c, ['lemuel', 'sam']);
        await say(c, 'robber');
        // "my brethren were about to return unto my father in the wilderness" (3:14)
        await say(c, 'finished');
        c.objective('Speak to your brethren.', 'Your brethren');
        await c.act(...at(laman), 4.5, 'Answer your brethren');
        c.objective(null);
        await part(c, '3:15-said');
        await say(c, 'gold');
        await say(c, 'tryit');
        await c.fade(1, 1.5);
      },
    },

    // ---- Act two: our gold and our silver (1 Nephi 3:22–4:4) ----
    {
      id: 'a2',
      label: 'Act Two',
      scene: true,
      setup() {
        reset({ hour: 18.2, stand: lehiOut, face: lehiYard, town: true });
        brothersAt(P(LEHI_HOUSE[0] + 3, LEHI_HOUSE[1] + 20), lehiYard);
        g.room('lehi');
        for (const [name, r] of Object.entries(riches)) g.props.show(name, r.at, { up: r.up });
      },
      async run(c) {
        alive(c);
        await c.fade(0, 1.5);
        g.narration?.warm(SPOKEN.gather.voice);
        await c.chapter('Act Two', 'Our Gold and Our Silver', '1 Nephi 3');
        await say(c, 'gather');
        followMe();
        c.objective("Go into your father's house, by its door.", 'Your father’s house');
        await c.reach(...lehiDoorIn, 1.7, { via: [H(0, 14), lehiYard, lehiDoorOut] });
        // His brothers come in after him by the door, and go about the room of their father's house, which they had
        // left (2:4): Laman to the gold, where it lies, and to the table; Lemuel to the silver, and about the east
        // wall; Sam about the table, and to the door, to look out.
        const brothers = ['laman', 'lemuel', 'sam'];
        const mine = scenes;
        const rounds = {
          laman: [[{ stay: 7, face: riches.gold.at, look: true }, { go: [H(-2.6, -9.2)], pace: 0.9 }, { stay: 6, face: H(0, -10.85) }, { go: [inLehi.laman], pace: 0.9 }], ['leftall']],
          lemuel: [[{ stay: 6, face: riches.silver.at }, { go: [H(3.2, -8.6)], pace: 0.9 }, { stay: 6, look: true }, { go: [inLehi.lemuel], pace: 0.9 }], ['ourhouse', 'inheritance']],
          sam: [[{ stay: 6, face: H(0, -10.85) }, { go: [H(-1, -7.4)], pace: 0.9 }, { stay: 7, face: lehiDoorOut, look: true }, { go: [inLehi.sam], pace: 0.9 }], ['asweleft', 'believe']],
        };
        for (const name of brothers) {
          const n = who(name);
          // (one already in the doorway does not go back out to come in)
          const way = Math.hypot(n.x - lehiDoorIn[0], n.z - lehiDoorIn[1]) < 2.3 ? [] : [lehiDoorOut];
          n.walk([...way, lehiDoorIn, inLehi[name]], 2.1).then(() => {
            if (scenes !== mine || life.state(n)) return;
            const [steps, answers] = rounds[name];
            life.live(n, steps, { notice: { as: NAMES[name], answers: () => answers, passes: true } });
          });
        }
        const pickups = [];
        // The riches may be gathered in any order. Each is taken up and carried as it is gathered: the gold by Laman,
        // the silver by Lemuel, the precious things by Nephi. What is still to gather is listed, and marked.
        const left = new Set(Object.keys(riches));
        while (left.size) {
          c.objective('Gather your gold, and your silver, and your precious things.', 'Gold and silver', Object.entries(riches).map(([name, r]) => ({ label: r.name, done: !left.has(name) })));
          let near = null;
          await c.until(() => {
            const [first] = [...left].sort((a, b) => from(riches[a].at) - from(riches[b].at));
            const [x, z] = riches[first].at;
            c.lead({ x, z, r: 1.2, mark: true });
            near = !g.frozen && from(riches[first].at) < 2.3 ? first : null;
            c.prompt(near ? riches[near].label : null);
            return !!near && (c.pressed || g.auto);
          });
          c.prompt(null);
          left.delete(near);
          // (what is his he takes up himself: the precious things Nephi, the gold Laman, the silver Lemuel)
          if (near === 'precious') bear(near);
          else pickups.push(takeUp(c, near, near === 'gold' ? ['givelaban', 'leftall'] : ['willtake', 'ourhouse']));
          g.music.pluck();
          c.toast(riches[near].taken, '', 3);
        }
        c.lead(null);
        c.objective('Gather your gold, and your silver, and your precious things.', 'Gold and silver', Object.values(riches).map((r) => ({ label: r.name, done: true })));
        await c.wait(1.2);
        c.objective(null);
        // (each has in his arms what is his)
        await Promise.all(pickups);
        // they carry it out before him, and wait for him in the court
        life.end(...brothers.map(who));
        const out = Promise.all(brothers.map((name, i) => who(name).stop().walk([lehiDoorIn, lehiDoorOut, H((i - 1) * 2.4, 3.5 + i)], 2.3)));
        await say(c, 'givelaban');
        await say(c, 'upagain');
        c.objective('Go up again unto the house of Laban, inside the city.', 'House of Laban');
        labanAtHome();
        await c.reach(...lehiGate, 3, { via: [lehiDoorIn, lehiDoorOut] });
        // (they keep to the way he came out by: through the court's gate, not its wall)
        out.then(() => {
          for (const name of brothers) who(name).face(null);
          withMe({ laman: ['givelaban', 'visionary'], lemuel: ['willtake', 'inheritance'], sam: ['forrecords', 'asweleft'] });
          followMe({ whole: true });
        });
        // (Laman, on the road up to the city, with the walls in sight again)
        const dread = c.until(() => from(gateOut) < 95).then(() => bark(c, 'nearly'));
        // "we went in unto Laban" (3:24): in at his gate, into his court
        await c.reach(...COURT.within, 2.2, { via: [...fromLehi, ...toLaban, C(19.6, 30.6), COURT.gate] });
        await dread;
      },
    },
    {
      id: 'a2-laban',
      label: 'Act Two',
      setup() {
        reset({ hour: 18.9, stand: COURT.within, face: COURT.door, town: true });
        for (const name of BROTHERS) who(name).place(...COURT[name], yawTo(COURT[name], COURT.door));
        for (const name of Object.keys(riches)) bear(name);
        labanAtHome();
      },
      async run(c) {
        c.objective(null);
        alive(c);
        life.end(...BROTHERS.map(who));
        const laban = who('laban');
        const s1 = who('servant1');
        const s2 = who('servant2');
        // In his court: Laban comes forward from his door to meet them, a servant at either side of him. They stand
        // before him with what they have brought. (At once, with `now`: the chase begun again.)
        life.end(laban, s1, s2);
        const stage = async (now = false) => {
          const goes = [];
          const to = (n, p, face, pace) => {
            if (now) return void n.place(...p, yawTo(p, face)).face(...face);
            n.face(null);
            goes.push(n.walk([p], pace).then(() => n.face(...face)));
          };
          if (now) g.standAt(...COURT.nephi, yawTo(COURT.nephi, COURT.laban));
          for (const name of BROTHERS) to(who(name).stop(), COURT[name], COURT.laban, 1.6);
          to(laban, COURT.laban, COURT.nephi, 1.1);
          to(s1, COURT.s1, COURT.nephi, 1.1);
          to(s2, COURT.s2, COURT.nephi, 1.1);
          if (!now) {
            g.standAt(...me(), yawTo(me(), COURT.laban));
            await c.hold(Promise.race([Promise.all(goes), c.wait(3.5)]));
          }
          laban.face(...me());
          for (const s of [s1, s2]) s.face(...me());
        };
        shoulder(COURT.laban);
        await stage();
        shoulder(at(laban));
        await say(c, 'offer');
        // "when Laban saw our property, and that it was exceedingly great, he did lust after it" (3:25)
        await say(c, 'seize');
        g.view(null);
        // "he thrust us out" (3:25): he turns to the way out, his gate (he is asked with the way he must run by before
        // him, and not Laban)
        g.standAt(...me(), yawTo(me(), COURT.gate));
        // They run: the brothers ahead, out of the gate and away to the rock; the servants after Nephi. What he carries
        // weighs on him, and they gain on him until he leaves it (3:26). They are after him still when he has left
        // it, through the streets, out of the gate and over the open ground, until he is hid in the cavity of the
        // rock (3:27). If they overtake him it is begun again: in the city, from before Laban's gate; in the
        // wilderness, from without the city's. "The servants of Laban did not overtake us."
        //
        // As each try begins he is asked for a word of what he has said of the Lord (a different verse each time). If
        // he remembers it he is strengthened: in the city, for the first moments what he carries does not slow him;
        // in the open, they are a moment longer in coming. Then it is as before: he must still leave it, and still run.
        //
        // They do not set out until he does (or until they will wait no longer), and are a few strides in coming to
        // their pace: a thumb must find the stick on a phone's glass, and he is given the time.
        // (out of his gate first, and down the street: not through the wall of his court)
        const fled = [COURT.gate, C(19.4, 27), C(18, 1), C(-30, 0), gateIn, gateOut, P(200, 90), beforeRock, mouth];
        const away = (name, dx = 0, dz = 0) => [...fled.map(([x, z]) => [x + dx, z + dz]), inRock[name]];
        // the way: through the streets to the gate, and from the gate nothing is marked but the rock (the ground
        // before its mouth, which only shows the way in, and its mouth)
        // (the gate's is on its threshold, without: from there the way to the rock is open, and not through the wall)
        // (out by his gateway itself, and into the street, before the way runs on: never through the court's wall)
        const toRock = [[...COURT.gate, 1.3], [...C(19.6, 29.5), 1.6], ...outOfCity.slice(0, 2), P(GATE[0] - 3, 0), [...beforeRock, 10], mouth];
        // (he is out of the city when he is in the gateway or before it, whichever way he then turns)
        const past = P(GATE[0] - 12, 0);
        const STRONG = 2;
        // how fast each comes: while he carries it, and when he has left it (he runs at 5.3)
        const pace = (s, left) => (s === s1 ? (left ? 4.7 : 4.3) : left ? 4.4 : 4.1);
        let leg = 'city';
        let left = false;
        let heldOut = false;
        // (which try is being run, for what is begun in one and must not be finished in the next)
        let chase = -1;
        const touch = g.ui.touch;
        for (let tries = 0; ; tries++) {
          const strong = await recall(c, remembered[tries % remembered.length]);
          const wild = leg === 'wild';
          // what is about to happen, and what to do, before anything moves
          if (tries === 0)
            await c.mission('Flee from the servants of Laban', 'Laban has sent his servants to kill you, and to take what you have brought. Get out of the city, and hide.', [
              `Run out of Laban’s gate, down the street and out at the city gate.${touch ? '' : ' Hold Shift to run.'}`,
              `What you carry slows you down: ${touch ? 'tap' : 'press E'} to leave it behind.`,
              'Then make for the cavity of a rock, where the marker shows the way.',
              'If they catch you, you begin again.',
            ]);
          else
            await c.mission('Again', wild ? 'You are out of the city. Make for the rock, and do not let them catch you.' : 'Out of Laban’s gate, out of the city, and away to the rock.', [
              wild ? 'Follow the marker to the cavity of a rock.' : `${touch ? 'Tap' : 'Press E'} to leave what you carry behind: it slows you down.`,
            ]);
          c.objective(wild ? 'Flee from the servants of Laban! Hide yourselves in the cavity of a rock.' : 'Flee from the servants of Laban! Out of the city, into the wilderness.', wild ? 'Cavity of a rock' : 'Flee into the wilderness');
          g.hurry(true);
          if (strong) g.music.pluck();
          if (!wild) {
            g.burden(strong ? null : 3.7);
            // (his brothers let fall what they carry, and are gone)
            g.props.show('gold', at(who('laman')));
            g.props.show('silver', at(who('lemuel')));
            who('sam').walk(away('sam', 1, 0), 5.2);
            who('laman').walk(away('laman'), 5.6);
            who('lemuel').walk(away('lemuel', -1, 1), 5.4);
          }
          chase = tries;
          const stood = me();
          const asked = c.time;
          const patience = g.ui.touch ? 6 : 4;
          // when he set off (or they would wait no longer), and when they set out after him
          let began = null;
          let out = null;
          let after = [];
          let taken = false;
          let weighed = !strong || left;
          let holding = false;
          // (Sam cries out; and Laman, as he lets the gold fall, unless Nephi has left his own already)
          const cries = wild ? null : talk(c, ['run', () => !left && 'leaveit'], { first: 0.3, gap: 1.6 });
          const hidden = await c.reach(...hollow, 2.2, {
            via: wild ? toRock.slice(5) : toRock,
            unless() {
              if (began == null && (from(stood) > 2.5 || c.time - asked > patience)) began = c.time;
              // (they set out a moment after he does: out of the open country a little longer if he was strengthened;
              // in the city long enough for him to be out of Laban's gate before them)
              if (began != null && out == null && c.time - began >= (wild ? (strong ? 1.5 : 0) : 1.4)) {
                out = c.time;
                after = [s1, s2];
                Object.assign(s1.follow(g.player, 0.8), { keen: true });
                Object.assign(s2.follow(g.player, 0.8, 0.9), { keen: true });
              }
              // (a few strides in coming to their pace)
              for (const s of after) s.maxSpeed = pace(s, left) * (0.72 + 0.28 * Math.min(1, (c.time - out) / 3));
              if (leg === 'city') {
                g.town.watch(life);
                // out of the gate: the city is behind him, and they are not
                if (from(past) < 13) {
                  leg = 'wild';
                  c.objective('Hide yourselves in the cavity of a rock.', 'Cavity of a rock');
                }
              }
              // (his strength is spent, and what he carries weighs on him again)
              if (!weighed && !left && began != null && c.time - began > STRONG) {
                weighed = true;
                g.burden(3.7);
              }
              const d = Math.min(30, ...after.map((s) => from(at(s))));
              // the drum: slow while they are far behind, quick when they are at his heels
              g.music.drum(Math.min(1, Math.max(0.12, 1 - (d - 2) / 14)));
              if (!left) {
                c.prompt('Leave the property behind');
                if (c.pressed || (g.auto && d < 5 && !(g.flag('hold') && tries === 0))) {
                  left = true;
                  c.prompt(null);
                  const fell = me();
                  g.props.show('precious', fell);
                  g.burden(null);
                  // One of them stops for it: "it fell into the hands of Laban". He is not long over it, and comes
                  // on after the other, by the way Nephi went.
                  const mine = tries;
                  if (after.length) {
                    after = [s1];
                    s2.keen = false;
                    s2.walk([fell], 3.2)
                      .then(() => c.wait(2.5))
                      .then(() => {
                        if (chase !== mine) return;
                        Object.assign(s2.follow(g.player, 0.8, 0.9), { keen: true, followFrom: s1.followFrom });
                        after = [s1, s2];
                      });
                  }
                }
              }
              // (a test, ?holdout: he stands still once without the gate, and is overtaken there)
              if (g.auto && g.flag('holdout') && leg === 'wild' && !heldOut) {
                heldOut = holding = true;
                c.freeze(true);
              }
              taken = d < 1.3;
              return taken;
            },
          });
          chase = -1;
          if (holding) c.freeze(false);
          cries?.stop();
          g.music.drum(0);
          c.prompt(null);
          c.objective(null);
          g.burden(null);
          g.hurry(false);
          if (hidden && !taken) break;
          g.log(`overtaken (try ${tries + 1}, ${leg === 'wild' ? 'without the gate' : 'in the city'})`);
          await c.fade(1, 0.6);
          await part(c, '3:27-b');
          if (leg === 'wild') {
            // Begun again from without the gate. What he carried is in the hands of Laban; his brothers are gone
            // before him; and the servants are in the gateway behind him.
            if (!left) g.props.show('precious', C(19.2, 25.5));
            left = true;
            g.standAt(...gateOut, yawTo(gateOut, P(228, 30)));
            const inGate = [P(GATE[0] + 2, -1.2), P(GATE[0] + 2, 1.2)];
            [s1, s2].forEach((s, i) => s.place(...inGate[i], yawTo(inGate[i], gateOut)).face(...gateOut));
          } else {
            left = false;
            await stage(true);
            g.standAt(...COURT.nephi, yawTo(COURT.nephi, COURT.gate));
            for (const name of Object.keys(riches)) bear(name);
            g.town.day(life);
          }
          await c.fade(0, 0.8);
        }
        // (what he carried is not with him in the rock, whatever became of it)
        if (!left) g.props.hide('precious');
        // The servants of Laban did not overtake us, and we hid ourselves in the cavity of a rock: they have lost
        // them. They come on a little, stand looking about, and go back to the city.
        const lost = P(ROCK[0] + 34, ROCK[1] - 12);
        [s1, s2].forEach((s, i) => {
          s.keen = false;
          const stop = [lost[0] + i * 1.8, lost[1] - i * 1.2];
          const here = () => s.visible && Math.hypot(s.x - stop[0], s.z - stop[1]) < 1;
          (async () => {
            await s.walk([stop], 3);
            if (!here()) return;
            s.face(...P(ROCK[0] + 20, ROCK[1] + 40));
            await c.wait(3 + i);
            if (!here()) return;
            await s.walk([P(205, 80)], 1.8);
            s.show(false);
          })();
        });
        laban.show(false);
      },
    },
    {
      id: 'a2-rock',
      label: 'Act Two',
      setup() {
        reset({ hour: 19.6, stand: hollow, face: mouth });
      },
      async run(c) {
        c.objective(null);
        const face = me();
        // (his brothers are within, at the back of it)
        for (const n of ['sam', 'laman', 'lemuel']) who(n).place(...inRock[n], 0).face(...face);
        // (a rod lies on the floor of the rock, towards its mouth)
        const rodAt = P(ROCK[0] + 1.6, ROCK[1] - 2.4);
        g.props.show('rod', rodAt, { turn: 0.5 });
        // their property is in the hands of Laban (3:26), and Laman and Lemuel are angry with Nephi, and with their
        // father (3:28)
        await say(c, 'gone');
        await say(c, 'yourdoing');
        // "and also was Lemuel, for he hearkened unto the words of Laman" (3:28): Laman turns to him, and has him
        // bring the rod; Lemuel goes for it, takes it up, and puts it into his hand
        {
          const laman = who('laman');
          const lemuel = who('lemuel');
          laman.face(...at(lemuel));
          lemuel.face(...at(laman));
          await say(c, 'rod');
          const fetch = (async () => {
            const d = Math.hypot(rodAt[0] - lemuel.x, rodAt[1] - lemuel.z) || 1;
            lemuel.face(null);
            await lemuel.walk([lerp(at(lemuel), rodAt, 1 - 0.6 / d)], 1.6);
            lemuel.face(...rodAt);
            await c.wait(0.3);
            lemuel.kneel = 1;
            await c.wait(0.7);
            g.props.carry('rod', lemuel, { out: 0.32, up: 0.95, wide: 0.12 });
            lemuel.kneel = 0;
            await c.wait(0.4);
            const to = lerp(at(lemuel), at(laman), 1 - 1.1 / (Math.hypot(laman.x - lemuel.x, laman.z - lemuel.z) || 1));
            lemuel.face(null);
            await lemuel.walk([to], 1.5);
            lemuel.face(...at(laman));
            await c.wait(0.4);
            g.props.carry('rod', laman, { out: 0.32, up: 0.95, wide: 0.12 });
            await c.wait(0.3);
            laman.face(...me());
            lemuel.face(...me());
          })();
          // (seen from beside Nephi, toward the two of them)
          shoulder(lerp(at(laman), rodAt, 0.5), { back: 3.4, up: 1.9, look: 1.1 });
          await c.hold(Promise.race([fetch, c.wait(12)]));
          await c.hold(c.wait(0.8));
          g.view(null);
        }
        // (that they smote their younger brothers with a rod is not shown, and is not told: the screen dims, and what
        // the angel asks them says what it was)
        g.ui.fade(0.55, 0.8);
        await c.hold(c.wait(2));
        // the angel
        // (he stands in the mouth of the rock, with the open sky behind him)
        const stands = P(CAVE.mouth[0] + 4, CAVE.mouth[1] - 0.6);
        const angel = who('angel').place(...stands, yawTo(stands, hollow));
        angel.w.glow.value = 0;
        // above the ground a little, his hands open
        angel.lift = 0.55;
        angel.open = 0.3;
        g.ui.fade(0, 0.6);
        for (const n of ['laman', 'lemuel', 'sam']) who(n).face(...stands);
        // (the rod falls from Laman's hand)
        g.props.show('rod', [who('laman').x + 0.5, who('laman').z + 0.4], { turn: 2.1 });
        // a low view from among the brothers at the back of the rock, out at him in its mouth, with the light round him
        g.view({ from: [...P(ROCK[0] - 1.7, ROCK[1] + 1.3), 1.1], to: [...stands, 1.5] });
        let bright = 0;
        await c.hold(
          c.until(() => {
            bright = Math.min(1, bright + 0.015);
            angel.w.glow.value = 0.4 * bright;
            angel.aura = bright;
            g.guidance.shine(...stands, 9 * bright);
            // (one bright chord, swelling with the light)
            g.music.angel(bright);
            return bright >= 1;
          }),
        );
        // (that he came and stood before them is seen; what he said is read, under his name)
        await part(c, '3:29-said');
        // "And after the angel had spoken unto us, he departed" (3:30)
        await c.hold(
          c.until(() => {
            bright = Math.max(0, bright - 0.02);
            angel.w.glow.value = 0.4 + (1 - bright) * 1.2;
            angel.aura = bright;
            g.guidance.shine(...stands, 9 * bright);
            return bright <= 0;
          }),
        );
        g.guidance.shine(null);
        // (and gone the moment he is)
        g.music.angel(0);
        g.view(null);
        angel.aura = 0;
        angel.show(false);
        for (const n of ['laman', 'lemuel', 'sam']) who(n).face(...me());
        // "Laman and Lemuel again began to murmur" (3:31)
        await say(c, 'howcan');
        await say(c, 'fifty');
        // They go apart from him, each with his own anger or his own wonder: Laman to the back of the rock, his back
        // to them; Lemuel to its mouth, where he sits looking out at the way they came; Sam stays by Nephi.
        alive(c);
        const [laman, lemuel, sam] = BROTHERS.map(who);
        const back = P(ROCK[0] - 4.4, ROCK[1] + 0.6);
        const sill = P(CAVE.mouth[0] - 0.7, CAVE.mouth[1] - 1.8);
        const samBy = P(ROCK[0] + 0.6, ROCK[1] + 1.8);
        life.live(laman, [{ go: [back], pace: 1.1 }, { stay: 60, face: P(ROCK[0] - 9, ROCK[1] + 1) }]);
        life.live(lemuel, [{ go: [sill], pace: 1.1 }, { stay: 60, face: P(CAVE.mouth[0] + 12, CAVE.mouth[1] - 3), sit: true }], { notice: { as: 'Lemuel', answers: () => ['gone'] } });
        life.live(sam, [{ go: [samBy], pace: 1 }, { stay: 6, face: () => me() }, { stay: 6, face: () => me(), look: true }], { notice: { as: 'Sam', answers: () => ['angelspoke'] } });
        c.objective('Speak to your brethren.', 'Your brethren');
        await c.act(laman, 2.2, 'Speak to Laman, and your brethren');
        c.objective(null);
        await gather(c);
        await fill(c, 'mightier');
        await say(c, 'moses');
        // "they were yet wroth, and did still continue to murmur; nevertheless they did follow me" (4:4)
        await say(c, 'follow');
        await c.fade(1, 2);
      },
    },

    // ---- Act three: led by the Spirit (1 Nephi 4:5–38) ----
    {
      id: 'a3',
      label: 'Act Three',
      scene: true,
      setup() {
        reset({ hour: 22.5, stand: hide, face: gateOut, town: 'night' });
        brothersAt(hiding, hide);
        fallenLaban();
      },
      async run(c) {
        await c.fade(0, 2);
        g.narration?.warm(SPOKEN.hide.voice);
        await c.chapter('Act Three', 'Led by the Spirit', '1 Nephi 4');
        await say(c, 'hide');
        await fill(c, 'spirit');
        await c.thought('No one marks the way tonight: a light goes before you. Follow it. When you lose it, stand still a moment, and look.');
        // They hide (4:5): Laman and Lemuel low against the ground, Sam standing, who looks after Nephi as he goes, and
        // says so.
        alive(c);
        const [laman, lemuel, sam] = BROTHERS.map(who);
        life.live(laman, [{ stay: 90, face: gateOut, sit: true }], { notice: { as: 'Laman', answers: () => ['alone'] } });
        life.live(lemuel, [{ stay: 90, face: gateOut, sit: true }], { notice: { as: 'Lemuel', answers: () => ['belong'] } });
        life.live(sam, [], { notice: { as: 'Sam', say: () => 'gowithlord', near: 9, answers: () => ['gowithlord'] } }).watch(sam);
        g.guidance.lead([hide, gateOut, gateIn, C(-20, 0), C(19.5, 0), C(19.5, 14), fallen]);
        c.objective(LED, 'The light of the Spirit');
        c.lead(null);
        await c.until(() => {
          // (the autopilot goes where the light is)
          if (g.auto) c.lead(g.guidance.point && { ...g.guidance.point, r: 1 });
          // (a man's heavy breathing, heard before he is seen)
          g.music.breath(Math.min(1, Math.max(0, 1 - (from(fallen) - 4) / 14)));
          return from(fallen) < 4.5;
        });
        c.objective(null);
        c.lead(null);
        g.guidance.lead(null);
      },
    },
    {
      id: 'a3-laban',
      label: 'Act Three',
      setup() {
        reset({ hour: 22.6, stand: C(18.5, 21), face: fallen, town: 'night' });
        fallenLaban();
      },
      async run(c) {
        g.music.breath(1);
        shoulder(fallen, { back: 4.5, up: 2.8, look: 0.3 });
        await say(c, 'fallen');
        g.view(null);
        // from here to the treasury it is the scripture's own words, and nothing else: his own account of it, and
        // the Spirit's words to him (4:9–19)
        await c.verse('4:9');
        // from here there is no sound in the street but his breathing
        g.sounds.hush(1);
        await c.verse('4:10');
        // "And I shrunk." He may obey now, or step back from it, or only stand there: each time he shrinks the Spirit
        // speaks again, as it did (4:11, 4:12), and the third time he remembers the words of the Lord (4:14–17).
        // Nothing marks the place; the light that led him here rests on it.
        const again = [
          async () => {
            await part(c, '4:11-said');
            await part(c, '4:11-b');
          },
          async () => {
            await part(c, '4:12-said');
            await verse(c, '4:13');
          },
          async () => {
            await c.verse('4:14');
            await c.verse('4:15', '4:16');
            await c.verse('4:17');
          },
        ];
        let heard = 0;
        g.guidance.lead([me(), fallen], { hint: false });
        for (;;) {
          const began = c.time;
          let came = from(fallen) < 5.5;
          const obeyed = await c.act(...fallen, 3.6, 'Obey the voice of the Spirit', {
            mark: false,
            unless() {
              if (heard >= again.length || g.auto) return false;
              if (from(fallen) < 5.5) came = true;
              return (came && from(fallen) > 8) || c.time - began > 16;
            },
          });
          if (obeyed) break;
          await again[heard++]();
        }
        // (what he had not yet heard, if he did not shrink so long: all of it is what brought him to obey)
        while (heard < again.length) await again[heard++]();
        g.guidance.lead(null);
        g.music.breath(0);
        await c.fade(1, 1.4);
        await part(c, '4:18-a');
        who('laban').show(false);
        g.dress('laban');
        await c.verse('4:19');
        g.sounds.hush(0);
        // (Zoram, at the treasury door, is first seen now, as Nephi goes there)
        who('zoram').place(...beforeTreasury, Math.PI).face(...C(IN_CITY.treasuryDoor[0] - 6, 0));
        await c.fade(0, 1.4);
        g.guidance.lead([me(), C(19.5, 14), C(19.5, 0), C(IN_CITY.treasuryDoor[0] - 6, -1), beforeTreasury]);
        c.objective(LED, 'The light of the Spirit');
        await c.until(() => {
          if (g.auto) c.lead(g.guidance.point && { ...g.guidance.point, r: 1 });
          return from(beforeTreasury) < 6;
        });
        c.objective(null);
        c.lead(null);
        g.guidance.lead(null);
      },
    },
    {
      id: 'a3-treasury',
      label: 'Act Three',
      setup() {
        reset({ hour: 22.7, stand: C(IN_CITY.treasuryDoor[0] - 6, 0), face: beforeTreasury, clothes: 'laban', town: 'night' });
        who('zoram').place(...beforeTreasury, Math.PI);
      },
      async run(c) {
        const zoram = who('zoram').face(...me());
        shoulder(at(zoram));
        // "I commanded him in the voice of Laban" (4:20)
        // (each of the three is what he might say, in his own mouth; the one he did say is then said, in Laban's voice)
        await ask(
          c,
          'Zoram, the servant of Laban, keeps the keys of the treasury. In the dark he takes you for his master. What will you say to him?',
          ['“Friend, where are the records kept?”', '“Come. Go with me into the treasury.”', '“I am Nephi, the son of Lehi.”'],
          1,
          ['He looks at you a long moment. His master would not ask.', '', 'He would cry out, and all the house of Laban would wake. He must take you for his master.'],
        );
        await say(c, 'treasury');
        await say(c, 'master');
        g.view(null);
        // he opens the treasury and goes in, and Nephi with him; a lamp burns there
        g.door(true);
        g.guidance.shine(...room, 5);
        const there = zoram.walk([doorOut, doorIn, byTable], 1.7);
        await c.reach(...withHim, 2.4, { via: [doorOut, doorIn], mark: false });
        // (if Nephi is there before him, he waits for him)
        await c.hold(there);
        zoram.face(...me());
        shoulder(at(zoram), { back: 3, up: 2 });
        // "he spake unto me concerning the elders of the Jews, he knowing that his master, Laban, had been out by night
        // among them" (4:22)
        await say(c, 'elders');
        // "And I spake unto him as if it had been Laban" (4:23)
        await ask(
          c,
          'He speaks of the elders of the Jews, among whom Laban has been this night. How will you answer him?',
          ['“What elders? I have seen none tonight.”', 'Say nothing, and hurry him on.', '“I was.”'],
          2,
          ['He stops, the keys still in his hand. Laban was with the elders this very night.', 'He slows, and looks at you again. His master would have answered him.', ''],
        );
        await say(c, 'iwas');
        // he goes to the table where the plates lie
        await c.hold(zoram.walk([C(IN_CITY.table[0] + 0.5, IN_CITY.table[1] + 1.3)], 1.2));
        zoram.face(...me());
        // "to my elder brethren, who were without the walls" (4:24)
        await ask(
          c,
          'The plates of brass lie before you. Where will you say you are to carry them?',
          ['“To my elder brethren, outside the walls.”', '“To my father, in the wilderness.”', '“To the elders of the Jews.”'],
          0,
          ['', 'He looks at you, and does not move from the table. Laban has no father in the wilderness.', 'He frowns. His master has only now come from the elders, and they asked for nothing.'],
        );
        g.view(null);
        await say(c, 'carry');
        // it is Nephi who carries them: "that I should carry the engravings" (4:24)
        zoram.walk([byTable], 1.2).then(() => zoram.face(...table));
        await c.act(...table, 2.4, 'Take up the plates of brass');
        g.props.carry('plates', g.player);
        g.music.pluck();
        // "And I also bade him that he should follow me" (4:25)
        await say(c, 'followme');
        // "he spake unto me many times concerning the elders of the Jews, as I went forth unto my brethren" (4:27)
        alive(c);
        life.with(zoram, { as: 'Zoram', answers: () => ['brethrenchurch', 'eldersagain', 'elders'], every: 13, near: 6 });
        zoram.follow(g.player, 2.4, 1.2);
        c.objective('Go forth unto your brethren, who are without the walls.', 'Without the walls');
        await c.reach(...withoutWalls, 4.5, { via: [doorIn, doorOut, C(19.5, 1), C(-20, 0), gateIn, gateOut] });
        g.guidance.shine(null);
      },
    },
    {
      id: 'a3-walls',
      label: 'Act Three',
      setup() {
        reset({ hour: 22.8, stand: withoutWalls, face: hiding, clothes: 'laban', town: 'night' });
        brothersAt(hiding, withoutWalls);
        who('zoram').place(...P(GATE[0] - 12, 11), 0).follow(g.player, 2.4, 1.2);
        g.props.carry('plates', g.player);
      },
      async run(c) {
        c.objective(null);
        const zoram = who('zoram');
        life.end(zoram, ...BROTHERS.map(who));
        // they take him for Laban, and run
        const flee = (name, du, dv) => who(name).walk([P(GATE[0] - 13 + du, 24 + dv)], 4.2);
        flee('laman', -14, 16);
        flee('lemuel', -10, 19);
        flee('sam', -18, 12);
        await say(c, 'itislaban');
        await c.act(...at(nearest(['laman', 'lemuel', 'sam'])), 22, 'Call after them');
        await say(c, 'itisi');
        const back = P(GATE[0] - 13, 19);
        brothersAt(back, me());
        // And Zoram, seeing them, makes for the city: "he began to tremble, and was about to flee from before me and
        // return to the city of Jerusalem" (4:30). Nephi must come up with him before he is in at the gate, and hold
        // him: "I did seize upon the servant of Laban, and held him, that he should not flee" (4:31). He is held for
        // as long as E is (or a finger on the words). Let go, he breaks away and runs on; in at the gate, he is gone,
        // and it is begun again.
        const trembling = bark(c, 'notmaster');
        // (he stands trembling, turned to the city, while it is said)
        zoram.stop().face(...gateIn);
        await c.hold(trembling);
        const HOLD = 5;
        const touch = g.ui.touch;
        const toGate = [P(GATE[0] - 9, 0.5), gateIn];
        const within = P(GATE[0] + 1, 0);
        g.hurry(true);
        for (let tries = 0; ; tries++) {
          if (tries === 0)
            await c.mission('Hold Zoram', 'Zoram sees your brothers, and is afraid. He is about to flee back into the city, and tell what he has seen.', [
              'Run after him, and come up with him before he is in at the gate.',
              `Stay close, and ${touch ? 'hold your finger on the prompt' : 'hold E'} to hold him until the bar is full.`,
              'Let go, and he breaks away again.',
            ]);
          else await c.mission('Again', 'Come up with Zoram before he is in at the gate, and hold him.', [`Stay close, and ${touch ? 'hold your finger on the prompt' : 'hold E'} until the bar is full.`]);
          c.objective('Zoram flees back to the city. Come up with him before he is in at the gate, and hold him.', 'Hold Zoram');
          zoram.stop();
          zoram.walk(toGate, 3.8);
          let running = true;
          let grip = 0;
          let fled = false;
          let last = c.time;
          await c.until(() => {
            const dt = c.time - last;
            last = c.time;
            c.lead({ x: zoram.x, z: zoram.z, r: 1.6 });
            const close = Math.hypot(zoram.x - g.player.x, zoram.z - g.player.z) < 2.6;
            // (a test, ?hold: the first time he is not held, and gets in at the gate)
            if (close && c.holding && !(g.auto && g.flag('hold') && tries === 0)) {
              if (running) zoram.stop().face(...toGate[1]);
              running = false;
              grip += dt / HOLD;
            } else {
              if (!running) zoram.face(null).walk(toGate, 3.8);
              running = true;
              // (what was gained is not all lost at once)
              grip = Math.max(0, grip - dt / HOLD);
            }
            c.prompt(close || grip > 0 ? 'Hold Zoram, that he should not flee' : null, grip);
            fled = Math.hypot(zoram.x - within[0], zoram.z - within[1]) < 2.5;
            return grip >= 1 || fled;
          });
          c.prompt(null);
          c.lead(null);
          c.objective(null);
          if (!fled) break;
          g.log(`Zoram fled into the city (try ${tries + 1})`);
          await c.fade(1, 0.6);
          await c.verse('4:31');
          const again = P(GATE[0] - 14, 22);
          const byHim = P(GATE[0] - 12.5, 19.5);
          g.standAt(...again, yawTo(again, gateOut));
          zoram.place(...byHim, yawTo(byHim, gateOut));
          await c.fade(0, 0.8);
        }
        g.hurry(false);
        zoram.stop().face(...me());
        shoulder(at(zoram), { back: 2.8, side: 0.9, up: 1.9, look: 1.5 });
        await trembling;
        // what Nephi swore to him, and what he swore in his turn (4:32–35)
        await say(c, 'spare');
        await say(c, 'oath');
        g.view(null);
        await c.fade(1, 2);
      },
    },
    {
      id: 'home',
      label: 'The tent of their father',
      scene: true,
      setup() {
        reset({ hour: 17.2, stand: L(6.5, -3.2), face: beforeTent, lemuel: true });
      },
      async run(c) {
        // they are come down again to the valley of Lemuel, and stand before the tent of their father
        brothersAt(L(9, -9.5), beforeTent);
        // (Zoram a little apart: a stranger to the place, who looks about him)
        who('zoram').place(...L(11.5, -5), 0).face(...beforeTent).idle = 'look';
        // (the plates of brass, in his arms still)
        g.props.carry('plates', g.player);
        // Their mother sits by the tent, who "truly had mourned because of us" (5:1); their father stands before it,
        // looking down the valley, who knew that the Lord would bring his sons down again (5:5).
        const lehi = who('lehi');
        const sariah = who('sariah');
        const downTheValley = L(4, -40);
        sariah.sit = 1;
        sariah.place(...bySariah, yawTo(bySariah, downTheValley));
        lehi.place(...beforeTent, yawTo(beforeTent, downTheValley));
        // the one tune of the story: a lyre, for their joy
        g.music.theme();
        g.narration?.warm(SPOKEN.perished.voice);
        // She sees them, and is on her feet and coming to her sons before their father has well turned ("my mother,
        // Sariah, was exceedingly glad", 5:1); and he comes after her ("he was filled with joy"). They come to them
        // where they stand: "their joy was full, and my mother was comforted" (5:7).
        const [fx, fz] = unit(me(), beforeTent);
        const before = (out, side) => [g.player.x + fx * out + fz * side, g.player.z + fz * out - fx * side];
        // (each to the side of him they are already on, so that neither crosses before the other)
        const hers = Math.sign((sariah.x - g.player.x) * fz - (sariah.z - g.player.z) * fx) || 1;
        const meeting = (async () => {
          await c.wait(0.7);
          sariah.sit = 0;
          lehi.face(...me());
          await c.wait(0.9);
          await Promise.all([sariah.walk([before(2.2, 0.9 * hers)], 2.7), c.wait(0.8).then(() => lehi.walk([before(3.3, -1.1 * hers)], 1.5))]);
          for (const n of [sariah, lehi]) n.face(...me());
        })();
        // (seen over Nephi's shoulder, toward the tent they come from; and then the two of them, come to him)
        shoulder(beforeTent, { back: 4.2, up: 2.3, look: 1.4 });
        await c.hold(Promise.all([c.fade(0, 2), meeting]));
        shoulder(lerp(at(lehi), at(sariah), 0.5), { back: 4.2, up: 2.3, look: 1.4 });
        // their mother had supposed them perished (5:2); their father had not (5:5)
        await say(c, 'perished');
        await say(c, 'knew');
        await part(c, '5:8-said');
        // he gives the plates into his father's hands: "my father, Lehi, took the records" (5:10)
        g.props.carry('plates', lehi);
        g.music.pluck();
        await say(c, 'brass');
        await part(c, '3:7-said');
        await c.fade(1, 2);
        g.view(null);
        g.end();
      },
    },
  ];
}

const lerp = ([x0, z0], [x1, z1], t) => [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
/** Which way it is from one point to another: [x, z], a metre long. */
const unit = ([x0, z0], [x1, z1]) => {
  const d = Math.hypot(x1 - x0, z1 - z0) || 1;
  return [(x1 - x0) / d, (z1 - z0) / d];
};
