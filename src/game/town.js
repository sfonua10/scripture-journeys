// The people of Jerusalem, by day: a few in the streets and at the gate, going about their own business, who say
// nothing (the account gives them no words). By night there are very few: two who walk, one who stands at a corner.
// Each is one of the cast (npc.js), walking to and fro between two places or standing where he is put.
import { GATE } from './places.js';

// What they wear: tunics and robes of undyed and plainly dyed wool, a cloth on the head. None has a mantle (the
// cloth of one is worked out every frame, and there are ten of them).
const wool = (lit, shade, hem, trim) => ({
  SHIRT: [lit, shade],
  TROUSERS: [lit.map((v) => v * 0.95), shade],
  SKIRT: [lit, shade],
  TRIM: [trim, trim.map((v) => v * 0.6)],
  HAT: [[0.8, 0.74, 0.62].map((v, i) => v * (0.85 + 0.15 * lit[i])), [0.46, 0.42, 0.44]],
  BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
  OUTFIT: { head: 'cloth', cloak: false, hem, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
});
export const TOWN_CLOTHES = [
  wool([0.74, 0.66, 0.52], [0.42, 0.37, 0.37], 0.5, [0.44, 0.3, 0.2]),
  wool([0.58, 0.42, 0.3], [0.32, 0.22, 0.2], 0.13, [0.8, 0.7, 0.5]),
  wool([0.44, 0.5, 0.56], [0.22, 0.26, 0.36], 0.13, [0.78, 0.72, 0.6]),
  wool([0.82, 0.78, 0.68], [0.5, 0.47, 0.5], 0.45, [0.5, 0.2, 0.18]),
  wool([0.56, 0.52, 0.34], [0.3, 0.28, 0.22], 0.13, [0.36, 0.26, 0.16]),
];
/** Who they are, for the cast: [name, which of TOWN_CLOTHES, bearded]. */
export const TOWNSFOLK = Array.from({ length: 10 }, (_, i) => [`town${i}`, i % TOWN_CLOTHES.length, i % 3 !== 1]);

export function createTown(g) {
  const { P, C } = g;
  // What each does by day, over and over (life.js): one walks the length of a street and back, stopping at each end
  // to look about him; two stand talking, and one of them goes a little way off and comes back; one sits by a wall.
  // `t` is how far along his way he is found. (None of them uses the street before Laban's house, where the story
  // happens.)
  const walker = ([a, b], pace, rest) => [{ go: [b], pace }, { stay: rest, look: true }, { go: [a], pace }, { stay: rest + 1.5, face: b }];
  const DAY = [
    { at: [C(-56, -1.9), C(52, -1.9)], t: 0, steps: walker([C(-56, -1.9), C(52, -1.9)], 1.25, 3) },
    { at: [C(44, 2.0), C(-52, 2.0)], t: 0.37, steps: walker([C(44, 2.0), C(-52, 2.0)], 1.4, 4.7) },
    { at: [C(-27, -40), C(-27, 38)], t: 0.74, steps: walker([C(-27, -40), C(-27, 38)], 1.2, 3.4) },
    { at: [C(20.5, -38), C(20.5, -7)], t: 0.11, steps: walker([C(20.5, -38), C(20.5, -7)], 1.3, 5.1) },
    // two by the gate, talking; one of them goes over to look out at the road, and comes back to the other
    { stand: C(-53, 8), face: C(-51.6, 8.9), steps: [{ stay: 16, face: C(-51.6, 8.9) }, { go: [C(-55.5, 3.6)], pace: 1.1 }, { stay: 6, look: true }, { go: [C(-53, 8)], pace: 1.1 }] },
    { stand: C(-51.6, 8.9), face: C(-53, 8), steps: [{ stay: 14, face: C(-53, 8) }, { stay: 7, look: true }, { stay: 9, face: () => g.cast.get('town4') && [g.cast.get('town4').x, g.cast.get('town4').z] }] },
    { at: [C(-50, 1.6), P(GATE[0] - 24, 3)], t: 0.85, steps: walker([C(-50, 1.6), P(GATE[0] - 24, 3)], 1.35, 4) },
    // one who sits by a wall of the main street, and gets up now and then to stretch his legs
    { stand: C(-9, 3.0), face: C(-9, -3), steps: [{ stay: 26, face: C(-9, -3), sit: true }, { go: [C(-4, 3.2)], pace: 0.9 }, { stay: 4, look: true }, { go: [C(-9, 3.0)], pace: 0.9 }] },
    // two more, talking, in the street east of the cross street; one turns away, and back
    { stand: C(31, -2.7), face: C(32.3, -2.2), steps: [{ stay: 12, face: C(32.3, -2.2) }, { stay: 5, face: C(28, -6), look: true }] },
    { stand: C(32.3, -2.2), face: C(31, -2.7), steps: [{ stay: 20, face: C(31, -2.7) }] },
  ];
  // By night: one on the main street, west of the cross street; one on the far cross street; one standing in the
  // square inside the gate.
  const NIGHT = [
    { at: [C(-50, -1.6), C(8, -1.6)], t: 0.6, steps: walker([C(-50, -1.6), C(8, -1.6)], 1.05, 4) },
    { at: [C(-27, 34), C(-27, -36)], t: 0.3, steps: walker([C(-27, 34), C(-27, -36)], 0.95, 5) },
    { stand: C(-40, 9), face: C(-30, 0), steps: [{ stay: 30, face: C(-30, 0), look: true }] },
  ];
  const people = () => TOWNSFOLK.map(([name]) => g.cast.get(name));
  /** Each where his day finds him, and at it. `notice`: how he takes Nephi's coming near (life.js). */
  function begin(life, list, notice) {
    people().forEach((npc, i) => {
      const way = list[i];
      if (!way) return;
      if (way.stand) npc.place(...way.stand, Math.atan2(way.face[0] - way.stand[0], way.face[1] - way.stand[1]));
      else {
        const [[ax, az], [bx, bz]] = way.at;
        npc.place(ax + (bx - ax) * way.t, az + (bz - az) * way.t, Math.atan2(bx - ax, bz - az));
      }
      life.live(npc, way.steps, { notice });
    });
  }

  return {
    /**
     * The streets as they are by day, each at his own business. They have no words for Nephi (the account gives them
     * none): greeted, one stops and turns to him, and goes on.
     */
    day(life) {
      begin(life, DAY, { greets: true, passes: true, label: 'Greet', near: 3 });
    },
    /**
     * The streets as they are by night: no one (the cast's own clear() has taken them in); or, with `few`, the two or
     * three who are abroad late, going slowly, none of them near Laban's house or his treasury. A head turns as he
     * passes; no more.
     */
    night(life, few = false) {
      if (few) begin(life, NIGHT, null);
    },
    /** Everyone stops where he is and turns to look at Nephi: something is happening in the street. */
    watch(life) {
      life.watch(...people().filter((npc) => npc.visible));
    },
  };
}
