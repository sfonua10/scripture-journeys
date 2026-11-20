// Joel 1:4 and 2:25, played: the corn eaten by four swarms, and restored. A short game for the week of Come, Follow
// Me on Hosea and Joel ("I Will Love Them Freely"). How it is played is in swarm.js.
//
// What the account says. "That which the palmerworm hath left hath the locust eaten; and that which the locust hath
// left hath the cankerworm eaten; and that which the cankerworm hath left hath the caterpiller eaten" (1:4): the
// harvest of the field is perished (1:11). Then the LORD says, "turn ye even to me with all your heart" (2:12), and
// after it, "he will cause to come down for you the rain" (2:23), "And I will restore to you the years that the
// locust hath eaten" (2:25), "And ye shall eat in plenty, and be satisfied" (2:26). No one in it is named.
//
// The game's own. You are a husbandman of Judah: no one the text names. The plot of corn, the hill across from the
// city (the first journey's), the neighbours and what each is about (life.js), and that the swarms can be driven
// off a little way, are the game's. So is the order of the telling: the four of 1:4 come one after another as four
// swarms. The verses are shown as verses, whole, and the LORD's words only as the verse; what is said in the game's
// own words (how to play, how it went) is in italic, with no reference, so that no one takes it for scripture.
import { createFolk } from './folk.js';
import { CLOTHES as JOEL } from './joel.js';
import { createLife } from './life.js';
import { createSwarm } from './swarm.js';

/** What they wear: as the people of the journey of Joel 2 (joel.js). */
export const CLOTHES = { player: JOEL.player, elder: JOEL.elder, man: JOEL.man, man2: JOEL.man2, woman: JOEL.woman, child: JOEL.child, child2: JOEL.child2 };

/** Who is in the story besides the city's own ten (town.js), made in this order: [name, clothes, bearded, how tall]. */
export const PEOPLE = [
  ['woman', 'woman', false, 0.93],
  ['child1', 'child', false, 0.62],
  ['child2', 'child2', false, 0.6],
];

/** The people of the city are the story's to place: none walks of their own. */
export function town() {
  return { day() {}, night() {}, watch() {} };
}

export function story(g) {
  const who = (name) => g.cast.get(name);
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);
  const life = createLife(g);
  const swarm = createSwarm(g);
  const { crop } = swarm;
  const mid = [(crop.x0 + crop.x1) / 2, (crop.z0 + crop.z1) / 2];
  // where he stands as it begins: at the plot's edge that is towards the city, looking over the corn
  const start = [mid[0], crop.z1 + 2.5];
  const TREE = g.P(9, -13);
  const by = (dx, dz) => [TREE[0] + dx, TREE[1] + dz];
  const at = (name) => () => [who(name).x, who(name).z];
  /** Up and down a side of the plot, a little off it, in a hurry: as one who would save it and cannot. */
  const pacing = (a, b, pace) => [{ go: [b], pace }, { stay: 1.2, face: mid }, { go: [a], pace }, { stay: 1.6, face: mid }];
  const east = crop.x1 + 2.2;
  const west = crop.x0 - 2.2;
  // Who is on the hill, and what each is about (life.js). None of them is in the corn itself.
  const folk = createFolk(g, life, [
    // two husbandmen keep the plot's two sides, going up and down them
    { name: 'town6', dress: 'man', at: [east, crop.z1 - 2], face: mid, day: pacing([east, crop.z1 - 2], [east, crop.z0 + 3], 2.6) },
    { name: 'town2', dress: 'man2', at: [west, crop.z0 + 3], face: mid, day: pacing([west, crop.z0 + 3], [west, crop.z1 - 2], 2.4) },
    // an old man stands at the corner and watches, and goes a few steps along the edge and back
    { name: 'town0', dress: 'elder', at: [crop.x1 + 3.5, crop.z1 + 3], face: mid,
      day: [{ stay: 9, face: mid }, { go: [[crop.x1 + 1.6, crop.z1 + 4.4]], pace: 0.8 }, { stay: 7, face: mid }, { go: [[crop.x1 + 3.5, crop.z1 + 3]], pace: 0.8 }] },
    // a woman comes from the tree to the plot's edge to see, and goes back for the children
    { name: 'woman', at: by(-3, -5), face: mid,
      day: [{ go: [[crop.x1 + 4, crop.z1 - 6]], pace: 1.5 }, { stay: 7, face: mid }, { go: [by(-3, -5)], pace: 1.4 }, { stay: 4, face: at('child1') }] },
    // two children run round the tree, as they did before it came
    { name: 'child1', at: by(4.5, 0), face: by(0, 4.5), day: [{ go: [by(0, 4.5), by(-4.5, 0), by(0, -4.5), by(4.5, 0)], pace: 3.3 }, { stay: 1.5, face: mid }] },
    { name: 'child2', at: by(-4.5, 0), face: by(0, -4.5), day: [{ go: [by(0, -4.5), by(4.5, 0), by(0, 4.5), by(-4.5, 0)], pace: 3.6 }, { stay: 1, face: mid }] },
  ], CLOTHES);
  /** Where each of them stands when the swarms are gone: along the plot's edge that is towards the city. */
  const gathered = () => folk.people.map((p, i) => [mid[0] - 6.5 + i * 2.6 + (i > 2 ? 2.6 : 0), crop.z1 + 2.2 + 0.5 * (i % 2)]);

  function reset() {
    swarm.stop();
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
    swarm.begin();
  }

  /** How the run went, in the game's own words (not scripture: a thought, in italic, with no reference). */
  function tally({ cells, kept }) {
    const pct = Math.round((100 * kept) / cells);
    const yours = pct <= 0 ? 'The swarms left none of the corn standing.' : `You kept ${pct}% of the corn from the swarms.`;
    return `${yours} All that was eaten is restored. Can you keep more of it?`;
  }

  return [
    {
      id: 'a1',
      label: 'The Locust',
      scene: true,
      setup() {
        reset();
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Joel 1–2', 'The Years the Locust Hath Eaten', 'Keep the corn from the swarm', 2.6);
        await c.verse('1:4');
        await c.thought('Four swarms are coming upon the corn. Run at a swarm to drive it off, or shout to drive off all that are near you. Keep what you can.');
      },
    },
    {
      id: 'corn',
      label: 'The Locust',
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
          c.objective('Drive the swarms off the corn, and keep what you can of it.', 'Keep the corn');
          const got = await swarm.run(c);
          c.objective(null);
          await c.wait(1.2);
          // what is left of it, seen from its corner, the people come to its edge; and he among them
          await c.fade(1, 1.2);
          swarm.rest();
          folk.turn(mid);
          const spots = gathered();
          folk.people.forEach((p, i) => who(p.name).place(spots[i][0], spots[i][1], yawTo(spots[i], mid)).face(...mid));
          const mine = [mid[0] + 1.3, crop.z1 + 2];
          g.standAt(mine[0], mine[1], yawTo(mine, mid));
          g.view(swarm.watch());
          await c.fade(0, 1.4);
          await c.verse('2:12');
          // he kneels, and they with him
          g.view(null);
          await c.act(mine[0], mine[1], 6, 'Kneel', { mark: false });
          g.player.kneel = 1;
          for (const p of folk.people) who(p.name).kneel = 1;
          await c.wait(2.4);
          g.view(swarm.watch());
          c.line(g.verses('2:23'), g.reference('2:23'));
          c.freeze(true);
          await swarm.restore(c);
          c.freeze(false);
          g.ui.toast?.('', '', 0);
          g.music.theme?.();
          g.player.kneel = 0;
          for (const p of folk.people) who(p.name).kneel = 0;
          await c.wait(1.2);
          await c.verse('2:25');
          await c.verse('2:26');
          const again = await c.choice(tally(got), ['Try again', 'Go on'], { auto: g.flag('again') && round === 0 ? 0 : 1 });
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
