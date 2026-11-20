// Hosea 10:12, played: "break up your fallow ground". A short game, against the coming of the rain, for the week of
// Come, Follow Me on Hosea and Joel ("I Will Love Them Freely"). How it is played is in fallow.js.
//
// What the account says. The verse is a call to Israel, in a husbandman's words, and tells of no one who did it: "Sow
// to yourselves in righteousness, reap in mercy; break up your fallow ground: for it is time to seek the LORD, till
// he come and rain righteousness upon you" (10:12). The people say of him, "he shall come unto us as the rain, as the
// latter and former rain unto the earth" (6:3); and the LORD says, "I will heal their backsliding, I will love them
// freely" (14:4), and of Israel, "they shall revive as the corn" (14:7).
//
// The game's own. You are a husbandman of Israel: no one the text names. The plot, the ox and the plough, the hill
// across from the city (the first journey's), the neighbours and what each is about (life.js) are the game's. What
// you can do is break the ground and sow it; the rain is not yours to bring, and it brings up more than was sown.
// The verses are shown as verses, whole, and the LORD's words only as the verse; what is said in the game's own
// words (how to play, how it went) is in italic, with no reference, so that no one takes it for scripture.
import { createFallow } from './fallow.js';
import { createFolk } from './folk.js';
import { CLOTHES as JOEL, HOLD, PROPS as CARRIED } from './joel.js';
import { createLife } from './life.js';

/** What they wear: as the people of the journey of Joel 2 (joel.js), who are of the same land and time. */
export const CLOTHES = { player: JOEL.player, elder: JOEL.elder, man: JOEL.man, man2: JOEL.man2, woman: JOEL.woman, child: JOEL.child, child2: JOEL.child2 };

/** Who is in the story besides the city's own ten (town.js), made in this order: [name, clothes, bearded, how tall]. */
export const PEOPLE = [
  ['woman', 'woman', false, 0.93],
  ['child1', 'child', false, 0.62],
  ['child2', 'child2', false, 0.6],
  ['child3', 'child', false, 0.64],
];

/** What they carry: a water jar, and a basket (joel.js). */
export const PROPS = CARRIED;

/** The people of the city are the story's to place: none walks of their own. */
export function town() {
  return { day() {}, night() {}, watch() {} };
}

export function story(g) {
  const who = (name) => g.cast.get(name);
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);
  const life = createLife(g);
  const fallow = createFallow(g);
  const { crop } = fallow;
  const mid = [(crop.x0 + crop.x1) / 2, (crop.z0 + crop.z1) / 2];
  // where he stands as it begins: at the plot's north edge, looking over it
  const start = [mid[0], crop.z1 + 2.5];
  // the great tree above the plot, and the ground about it
  const TREE = g.P(9, -13);
  const at = (name) => () => [who(name).x, who(name).z];
  const by = (dx, dz) => [TREE[0] + dx, TREE[1] + dz];
  // Who is on the hill, and what each is about while he works (life.js). None of them is on the plot itself.
  const folk = createFolk(g, life, [
    // an old man sits in the shade of the tree, and now and then gets up to look at the sky
    { name: 'town0', dress: 'elder', at: by(-3.2, -2.6), face: mid,
      day: [{ stay: 15, sit: true, face: mid }, { go: [by(-6, -6)], pace: 0.8 }, { stay: 6, face: [mid[0] - 30, mid[1] - 60] }, { go: [by(-3.2, -2.6)], pace: 0.8 }] },
    // a woman carries water from the tree to the plot's east side, and sets her jar down there
    { name: 'woman', at: by(-2, -5), face: [crop.x1 + 2.5, crop.z1 - 3],
      day: [
        { take: 'jar', hold: HOLD.jar },
        { go: [[crop.x1 + 2.6, crop.z1 - 3]], pace: 1.25 },
        { put: 'jar' },
        { stay: 5, kneel: true, face: [crop.x1 - 2, crop.z1 - 3] },
        { take: 'jar', hold: HOLD.jar },
        { go: [by(-2, -5)], pace: 1.25 },
        { put: 'jar' },
        { stay: 4, face: TREE },
      ] },
    // a man clears stones from the edge of the next plot, a basket at a time, and tips them on a heap
    { name: 'town6', dress: 'man', at: [crop.x0 - 3, crop.z1 - 2], face: [crop.x0 - 3, crop.z0],
      day: [
        { stay: 4, kneel: true, face: [crop.x0 - 5, crop.z1 - 4] },
        { take: 'basket', hold: HOLD.basket },
        { go: [[crop.x0 - 6.5, crop.z1 + 4.5]], pace: 1.3 },
        { put: 'basket' },
        { stay: 3, kneel: true, face: [crop.x0 - 8, crop.z1 + 5.5] },
        { take: 'basket', hold: HOLD.basket },
        { go: [[crop.x0 - 3, crop.z1 - 7]], pace: 1.3 },
        { put: 'basket' },
      ] },
    // two men stand talking at the corner of the plot
    { name: 'town2', dress: 'man2', at: [crop.x1 + 3, crop.z1 + 3.4], face: [crop.x1 + 4.4, crop.z1 + 2.4],
      day: [{ stay: 9, face: at('town3') }, { go: [[crop.x1 + 2.4, crop.z1 + 4.6]], pace: 0.7 }, { stay: 6, face: at('town3') }, { go: [[crop.x1 + 3, crop.z1 + 3.4]], pace: 0.7 }] },
    { name: 'town3', dress: 'elder', at: [crop.x1 + 4.4, crop.z1 + 2.4], face: [crop.x1 + 3, crop.z1 + 3.4],
      day: [{ stay: 12, face: at('town2') }, { go: [[crop.x1 + 5.2, crop.z1 + 1.2]], pace: 0.7 }, { stay: 5, face: at('town2') }, { go: [[crop.x1 + 4.4, crop.z1 + 2.4]], pace: 0.7 }] },
    // two children chase each other round the tree
    { name: 'child1', at: by(4.5, 0), face: by(0, 4.5),
      day: [{ go: [by(0, 4.5), by(-4.5, 0), by(0, -4.5), by(4.5, 0)], pace: 3.3 }, { stay: 1.2, face: at('child2') }] },
    { name: 'child2', at: by(-4.5, 0), face: by(0, -4.5),
      day: [{ go: [by(0, -4.5), by(4.5, 0), by(0, 4.5), by(-4.5, 0)], pace: 3.6 }] },
    // and one picks up stones along the plot's far side
    { name: 'child3', at: [crop.x0 + 4, crop.z0 - 2], face: [crop.x0 + 10, crop.z0 - 2],
      day: [{ stay: 3, kneel: true, face: mid }, { go: [[crop.x0 + 11, crop.z0 - 2.4]], pace: 2.2 }, { stay: 3, kneel: true, face: mid }, { go: [[crop.x0 + 4, crop.z0 - 2]], pace: 2.6 }] },
  ], CLOTHES);

  function reset() {
    fallow.stop();
    g.cast.clear();
    g.props.reset();
    g.door(false);
    g.dress('player');
    g.view(null);
    g.guidance.lead(null);
    g.guidance.shine(null);
    g.music.stop();
    g.sounds.hush(0);
    g.burden(null);
    g.hurry(false);
    g.player.kneel = 0;
    g.standAt(start[0], start[1], yawTo(start, mid));
    folk.begin();
    fallow.begin();
  }

  /** How the run went, in the game's own words (not scripture: a thought, in italic, with no reference). */
  function tally({ cells, broken, sown, grown, sheaves, all }) {
    const pct = (n) => Math.round((100 * n) / cells);
    if (!grown) return `You broke up ${pct(broken)}% of the ground, but none of it was sown, and the rain found no seed in it. Can you sow it before the rain comes?`;
    const yielded = `The rain brought up all that was sown: ${sheaves === 1 ? 'one sheaf' : `${sheaves} sheaves`}.`;
    if (all) return `You broke up all the ground and sowed all of it. ${yielded} Can you do it sooner?`;
    return `You broke up ${pct(broken)}% of the ground and sowed ${pct(sown)}% of it. ${yielded} Can you break up and sow all of it?`;
  }

  return [
    {
      id: 'a1',
      label: 'Fallow Ground',
      scene: true,
      setup() {
        reset();
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Hosea 10', 'Fallow Ground', 'Break up your fallow ground', 2.6);
        await c.verse('10:12');
        await c.thought('Walk the hard ground behind the ox to break it up. Then sow it: seed takes only where the ground is broken. The rain is coming, and it is not yours to bring.');
      },
    },
    {
      id: 'field',
      label: 'Fallow Ground',
      setup() {
        reset();
      },
      async run(c) {
        for (let round = 0; ; round++) {
          if (round > 0) {
            await c.fade(1, 0.8);
            reset();
            await c.fade(0, 0.8);
          }
          c.objective('Break up the ground with the plough, and sow it, before the rain comes.', 'Break up the ground');
          const got = await fallow.run(c, {
            watch: fallow.watch(),
            onRain() {
              c.objective(null);
              folk.turn(mid);
              // (what the people say of him, as it falls)
              c.line(g.verses('6:3'), g.reference('6:3'));
            },
            onReap() {
              folk.resume();
              g.ui.toast?.('', '', 0);
              c.objective('Reap what the rain has brought up, before the evening.', 'Reap');
            },
          });
          c.objective(null);
          if (got.all) g.music.theme?.();
          await c.wait(1.4);
          await c.fade(1, 1.2);
          fallow.rest();
          folk.turn(mid);
          g.view(fallow.watch());
          await c.fade(0, 1.4);
          await c.verse('14:4');
          await c.verse('14:7');
          const again = await c.choice(tally(got), ['Plough again', 'Go on'], { auto: g.flag('again') && round === 0 ? 0 : 1 });
          g.log(`round ${round + 1}: ${again ? 'went on' : 'again'}`);
          if (again === 1) break;
        }
        await c.fade(1, 2);
        g.view(null);
        g.end();
      },
    },
  ];
}
