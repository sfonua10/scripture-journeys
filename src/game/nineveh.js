// Nineveh, "that great city" (Jonah 1:2), for the journey told of Jonah; and the places of that journey that are not
// on the land at all: the ship, the quay at Joppa she lies at, the shore he is cast up on, the booth he makes and
// the gourd that comes up over it.
//
// The city is a `look` for createCity (city.js), on Babylon's river plain (world.js, the 'plain' land: Nineveh stood
// on the Tigris as Babylon on the Euphrates), made with the same boxes. What is known of Nineveh in Jonah's day
// (about 760 BC, a lifetime before Sennacherib made it the capital) is little, and so what is built is plain:
//   - a walled city of mud brick on footings of stone, its wall tops stepped, towers close along it
//   - at its gate, great figures of stone either side of the way in (as Assyrian gates had: winged bulls)
//   - a great house whose walls are lined at the foot with slabs of pale stone (as Assyrian palaces were)
//   - a temple tower in stages (Nineveh's temple of Ishtar was old already)
//   - houses round their own courts, blind to the street
// The king's seat is set before his house, on the street, under a canopy: nothing is told of where he sat (3:6).
//
// The rest are `sets` (city.js, createSet; main.js, g.set): built the same way and painted the same way, on the level
// ground before the city's gate, and shown one at a time with the land hidden (g.land). The ship lies along u, her
// head to the going down of the sun, which is the way to Tarshish.
import { BRICK, brick, paving, PLASTERS, stepped } from './babylon.js';
import { footing, ground, house, PART, ROOF, WOOD } from './city.js';
import { CITY, PLAIN } from './places.js';

const LEVEL = PLAIN.level;
const STONE = [0.8, 0.76, 0.68];
const MUD = [0.7, 0.6, 0.46];
const GOLD = [1.0, 0.76, 0.28];
const PURPLE = [0.27, 0.05, 0.14];
const PITCH = [0.17, 0.12, 0.09];
const DECK = [0.5, 0.38, 0.25];
const OCHRE = [0.58, 0.26, 0.16];
const LINEN = [0.8, 0.74, 0.62];
const CLAY = [0.66, 0.4, 0.25];
const SAND = [0.84, 0.76, 0.6];
const STRAW = [0.62, 0.54, 0.3];
const BOUGH = [0.36, 0.27, 0.16];

/** Where its things are, within the walls, in metres from the city's middle (cu, cv). */
export const IN_NINEVEH = {
  /** The king's house [cu0, cv0, cu1, cv1], fronting the street that runs from the gate. */
  palace: [26, 8, 60, 44],
  /** The temple tower and the stair up it. */
  tower: [6, -47, 61, -5],
  /** The king's seat before his house: its dais [cu0, cv0, cu1, cv1], how high; he sits facing the street (-v). */
  dais: [40, 4.1, 46, 7.5],
  daisTall: 0.35,
  /** Where he sits, and where he sits in ashes. */
  king: [43, 6.72],
  ashes: [43, 1.6],
};

/** Where the journey's own places are, on the level ground before the gate, in (u, v). */
export const AT_SEA = {
  /** The ship: her middle; half her length (along u) and half her beam; her rail's height; the gangway in her side. */
  ship: { at: [158, 22], half: 10.5, beam: 3.3, rail: 0.95, gap: [156.9, 159.3], mast: [160.6, 22], hatch: [151.4, 22] },
  /** The quay she lies at, at Joppa: its ground, u and v. */
  quay: { u: [134, 182], v: [3.5, 18.45] },
  /** The shore: where the sand goes down into the sea. */
  shore: { v: 14 },
  /** The booth, on the rise east of the city. */
  booth: PLAIN.seat.at,
};

/** Half her breadth at `t` along her length (-1 her stern, 1 her head): full amidships, drawn in to a point at each end. */
const breadth = (t) => AT_SEA.ship.beam * Math.max(0, 1 - Math.abs(t) ** 2.4) ** 0.55;
/** Her side, as points from stern to head: [u, half her breadth there]. */
function stations(n = 22) {
  const { at, half } = AT_SEA.ship;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = -1 + (2 * i) / n;
    return [at[0] + t * half, breadth(t)];
  });
}
/** Half her deck's breadth at `u` (in the valley's frame), rail to her middle line. */
export const beamAt = (u) => breadth((u - AT_SEA.ship.at[0]) / AT_SEA.ship.half);
/** Whether a place is on her deck, with `margin` metres to spare from her rail: for the story, which keeps things on it. */
export function onDeck(u, v, margin = 0.5) {
  const { at, half } = AT_SEA.ship;
  const t = (u - at[0]) / half;
  return Math.abs(t) < 1 && Math.abs(v - at[1]) < breadth(t) - margin;
}

/**
 * One length of her side, from station a to station b, on side `side` (-1: the quay's, 1: the sea's): her planking
 * below, the strake under her rail, the rail, and its inner face. `upper` false leaves the rail off (the gangway).
 */
function sideOf(b, [ua, wa], [ub, wb], side, deck, { upper = true, lower = true } = {}) {
  const sv = AT_SEA.ship.at[1];
  const va = sv + side * wa;
  const vb = sv + side * wb;
  const len = Math.hypot(ub - ua, vb - va) || 1;
  // (outward: square to her side, away from her middle line)
  let n = [-(vb - va) / len, 0, (ub - ua) / len];
  if (n[2] * side < 0) n = [-n[0], 0, -n[2]];
  const top = deck + AT_SEA.ship.rail;
  const keel = deck - 2.7;
  // below the deck she draws in to her keel
  const ka = sv + side * wa * 0.5;
  const kb = sv + side * wb * 0.5;
  if (lower) {
    // (to the foot of her rail; in the gangway, to her deck)
    const sill = upper ? 0.3 : 0.02;
    b.quad([[ua, keel, ka], [ub, keel, kb], [ub, deck + sill, vb], [ua, deck + sill, va]], n, PART.WOOD, PITCH, [[ua, -2.7], [ub, -2.7], [ub, sill], [ua, sill]], 0.31);
  }
  if (!upper) return;
  b.quad([[ua, deck + 0.3, va], [ub, deck + 0.3, vb], [ub, top, vb], [ua, top, va]], n, PART.WOOD, OCHRE, [[ua, 0.3], [ub, 0.3], [ub, 0.95], [ua, 0.95]], 0.33);
  const T = 0.2;
  const ia = [ua - n[0] * T, va - n[2] * T];
  const ib = [ub - n[0] * T, vb - n[2] * T];
  b.quad([[ia[0], deck, ia[1]], [ib[0], deck, ib[1]], [ib[0], top, ib[1]], [ia[0], top, ia[1]]], [-n[0], 0, -n[2]], PART.WOOD, WOOD, [[ua, 0], [ub, 0], [ub, 0.95], [ua, 0.95]], 0.35);
  b.quad([[ua, top, va], [ub, top, vb], [ib[0], top, ib[1]], [ia[0], top, ia[1]]], [0, 1, 0], PART.WOOD, [0.44, 0.31, 0.2], [[ua, va], [ub, vb], [ub, ib[1]], [ua, ia[1]]], 0.37);
  // what stops one who walks against it: a box about this length of her side
  b.solids.push([Math.min(ua, ub) - 0.05, Math.max(ua, ub) + 0.05, Math.min(va, vb, ia[1], ib[1]) - (side < 0 ? 0.5 : 0.05), Math.max(va, vb, ia[1], ib[1]) + (side > 0 ? 0.5 : 0.05), deck - 1, deck + 2.6]);
}
const inGap = (ua, ub) => (ua + ub) / 2 > AT_SEA.ship.gap[0] && (ua + ub) / 2 < AT_SEA.ship.gap[1];

/**
 * The ship: a merchantman of the Phoenician kind (a "ship of Tarshish"), round-built, some twenty metres long, with
 * a post at her head and at her stern, one mast with its yard and the sail furled on it, a hatch to go down by, and
 * benches for those who row. Her deck is the level ground. The gangway in her side is left open (the quay's plank
 * lies in it; at sea a length of rail shuts it).
 */
function ship(b) {
  const { at: [su, sv], half, mast: [mu, mv], hatch: [hu, hv] } = AT_SEA.ship;
  const deck = LEVEL + 0.03;
  const st = stations();
  for (let i = 0; i + 1 < st.length; i++) {
    for (const side of [-1, 1]) sideOf(b, st[i], st[i + 1], side, deck, { upper: !(side < 0 && inGap(st[i][0], st[i + 1][0])) });
    // her deck, its planks running fore and aft
    const [ua, wa] = st[i];
    const [ub, wb] = st[i + 1];
    b.quad([[ua, deck, sv - wa], [ua, deck, sv + wa], [ub, deck, sv + wb], [ub, deck, sv - wb]], [0, 1, 0], PART.WOOD, DECK, [[sv - wa, ua], [sv + wa, ua], [sv + wb, ub], [sv - wb, ub]], 0.39);
  }
  const wood = (seed, colour = WOOD) => ({ part: PART.WOOD, colour, seed, base: deck, roofPart: PART.WOOD, roofColour: colour });
  // the posts at her head and her stern, standing above her rail
  b.box(su + half - 0.5, su + half - 0.1, sv - 0.2, sv + 0.2, deck - 2.4, deck + 3.3, wood(0.41, PITCH));
  b.box(su + half - 0.75, su + half - 0.1, sv - 0.24, sv + 0.24, deck + 3.3, deck + 3.75, { ...wood(0.42, OCHRE), solid: false });
  b.box(su - half + 0.1, su - half + 0.5, sv - 0.2, sv + 0.2, deck - 2.4, deck + 2.6, wood(0.43, PITCH));
  // her mast, the yard across it, and the sail furled along the yard
  b.box(mu - 0.17, mu + 0.17, mv - 0.17, mv + 0.17, deck - 1, deck + 9.2, wood(0.45, [0.42, 0.3, 0.19]));
  b.box(mu - 0.1, mu + 0.1, mv - 4.1, mv + 4.1, deck + 7.7, deck + 7.9, { ...wood(0.46), solid: false });
  // (furled: gathered up under the yard and tied to it every pace or so, so that it hangs in a row of bundles)
  {
    const TIES = 8;
    const SIDES = 10;
    const PROFILE = [[0, 0.13, 0], [0.22, 0.27, 0.05], [0.5, 0.3, 0.07], [0.78, 0.27, 0.05], [1, 0.13, 0]];
    const ring = (v, r, sag, i) => {
      const a = (i / SIDES) * Math.PI * 2;
      return [mu + Math.cos(a) * r, deck + 7.44 - sag + Math.sin(a) * r * 0.9, v];
    };
    const each = 7.4 / TIES;
    for (let t = 0; t < TIES; t++) {
      for (let k = 0; k + 1 < PROFILE.length; k++) {
        const [f0, r0, s0] = PROFILE[k];
        const [f1, r1, s1] = PROFILE[k + 1];
        const va = mv - 3.7 + (t + f0) * each;
        const vb = mv - 3.7 + (t + f1) * each;
        for (let i = 0; i < SIDES; i++) {
          const mid = ((i + 0.5) / SIDES) * Math.PI * 2;
          b.quad([ring(va, r0, s0, i), ring(vb, r1, s1, i), ring(vb, r1, s1, i + 1), ring(va, r0, s0, i + 1)], [Math.cos(mid), Math.sin(mid), 0], PART.CLOTH, LINEN, [[va, i], [vb, i], [vb, i + 1], [va, i + 1]], 0.47 + t * 0.003);
        }
      }
    }
  }
  // (the ropes that stay her mast: one to her head, one to her stern)
  for (const [to, n] of [[su + half - 0.3, 1], [su - half + 0.3, -1]]) {
    b.quad([[mu, deck + 9.1, mv - 0.03], [mu, deck + 9.1, mv + 0.03], [to, deck + (n > 0 ? 3.3 : 2.6), sv + 0.03], [to, deck + (n > 0 ? 3.3 : 2.6), sv - 0.03]], [0, 1, 0], PART.DARK, PITCH, [[0, 0], [0, 1], [1, 1], [1, 0]], 0.48);
  }
  // the hatch: a coaming round an opening that is dark
  for (const [p0, p1, q0, q1] of [[hu - 0.95, hu + 0.95, hv - 0.85, hv - 0.7], [hu - 0.95, hu + 0.95, hv + 0.7, hv + 0.85], [hu - 0.95, hu - 0.8, hv - 0.7, hv + 0.7], [hu + 0.8, hu + 0.95, hv - 0.7, hv + 0.7]]) {
    b.box(p0, p1, q0, q1, deck, deck + 0.24, { ...wood(0.5), solid: false });
  }
  b.quad([[hu - 0.8, deck + 0.05, hv - 0.7], [hu - 0.8, deck + 0.05, hv + 0.7], [hu + 0.8, deck + 0.05, hv + 0.7], [hu + 0.8, deck + 0.05, hv - 0.7]], [0, 1, 0], PART.DARK, PITCH, [[0, 0], [0, 1], [1, 1], [1, 0]], 0.51);
  // benches along her sides, for those who row
  for (const du of BENCHES) {
    const w = breadth(du / half);
    for (const side of [-1, 1]) {
      const [q0, q1] = side < 0 ? [sv - w + 0.25, sv - w + 1.25] : [sv + w - 1.25, sv + w - 0.25];
      b.box(su + du - 0.2, su + du + 0.2, q0, q1, deck, deck + 0.42, { ...wood(0.52 + du * 0.01), solid: false });
    }
  }
  // her steering oar, over the quarter
  const w = breadth(-0.78);
  const ou = su - half * 0.78;
  b.quad([[ou + 0.6, deck + 1.7, sv + w - 0.2], [ou + 0.72, deck + 1.7, sv + w - 0.2], [ou - 1.5, deck - 2.2, sv + w + 0.6], [ou - 1.62, deck - 2.2, sv + w + 0.6]], [0.3, 0.4, 0.86], PART.WOOD, WOOD, [[0, 0], [0.12, 0], [0.12, 4.4], [0, 4.4]], 0.54);
  b.quad([[ou - 0.8, deck - 1.0, sv + w + 0.38], [ou - 0.5, deck - 0.6, sv + w + 0.3], [ou - 1.4, deck - 2.4, sv + w + 0.66], [ou - 1.9, deck - 2.4, sv + w + 0.66]], [0.3, 0.4, 0.86], PART.WOOD, WOOD, [[0, 0], [0.4, 0], [0.4, 2], [0, 2]], 0.55);
}
/** Where her benches are, in metres along her from her middle. */
export const BENCHES = [-5.2, -2.6, 2.4, 5];

/** The length of rail that shuts her gangway, at sea. */
function gangwayRail(b) {
  const deck = LEVEL + 0.03;
  const st = stations();
  for (let i = 0; i + 1 < st.length; i++) if (inGap(st[i][0], st[i + 1][0])) sideOf(b, st[i], st[i + 1], -1, deck, { lower: false });
}

/** Her oars, out: one from each bench, each side, down into the sea. */
function oars(b) {
  const { at: [su, sv], half } = AT_SEA.ship;
  const deck = LEVEL + 0.03;
  for (const du of BENCHES) {
    const w = breadth(du / half);
    for (const side of [-1, 1]) {
      const u = su + du;
      const inn = [u + 0.25, deck + 1.05, sv + side * (w - 1.1)];
      const out = [u - 0.9, deck - 1.75, sv + side * (w + 4.4)];
      const blade = [u - 0.62, deck - 1.1, sv + side * (w + 3.1)];
      const n = [0, 0.86, side * 0.5];
      b.quad([inn, [inn[0] + 0.09, inn[1], inn[2]], [blade[0] + 0.09, blade[1], blade[2]], blade], n, PART.WOOD, [0.5, 0.38, 0.24], [[0, 0], [0.09, 0], [0.09, 4.6], [0, 4.6]], 0.56);
      b.quad([blade, [blade[0] + 0.3, blade[1], blade[2]], [out[0] + 0.34, out[1], out[2]], [out[0] - 0.05, out[1], out[2]]], n, PART.WOOD, [0.5, 0.38, 0.24], [[0, 0], [0.3, 0], [0.3, 1.4], [0, 1.4]], 0.57);
    }
  }
}

/**
 * Joppa (1:3): the quay the ship lies at, paved, with a plank to her gangway; behind it the houses of the port;
 * jars and bales set down on it. Of Joppa in his day nothing is known but that it was a port: it is a quay, and a
 * street's worth of houses.
 */
function quay(b, random) {
  const { u: [u0, u1], v: [v0, v1] } = AT_SEA.quay;
  const { gap, at: [, sv] } = AT_SEA.ship;
  const top = LEVEL + 0.02;
  // the quay itself: a wall of stone down into the water, paved on top
  b.box(u0, u1, v0 - 12, v1, top - 3.2, top, { part: PART.STONE, colour: [0.74, 0.7, 0.62], seed: 0.61, base: top - 1.6, solid: false, roofPart: PART.PAVE, roofColour: [0.82, 0.78, 0.68] });
  // a kerb of stones at its edge, and posts to make fast to
  for (let u = u0 + 1; u < u1; u += 3.2) if (u < gap[0] - 0.6 || u > gap[1] + 0.6) b.box(u - 0.28, u + 0.28, v1 - 0.5, v1 - 0.06, top, top + 0.3, { part: PART.STONE, colour: [0.7, 0.66, 0.58], seed: 0.62, base: top, solid: false, roofPart: PART.STONE, roofColour: [0.7, 0.66, 0.58] });
  for (const u of [gap[0] - 6.5, gap[1] + 7.5]) b.box(u - 0.16, u + 0.16, v1 - 1.5, v1 - 1.18, top, top + 0.85, { part: PART.WOOD, colour: PITCH, seed: 0.63, base: top, solid: false, roofPart: PART.WOOD, roofColour: PITCH });
  // the plank, from the quay into her gangway
  const pv = sv - AT_SEA.ship.beam;
  b.quad([[gap[0] + 0.35, top + 0.07, v1 - 0.9], [gap[0] + 0.35, top + 0.07, pv + 0.8], [gap[1] - 0.35, top + 0.07, pv + 0.8], [gap[1] - 0.35, top + 0.07, v1 - 0.9]], [0, 1, 0], PART.WOOD, [0.46, 0.34, 0.22], [[v1, gap[0]], [pv, gap[0]], [pv, gap[1]], [v1, gap[1]]], 0.64);
  // the houses of the port, their doors on the quay
  const colours = [[0.86, 0.8, 0.68], [0.8, 0.73, 0.6], [0.9, 0.85, 0.74], [0.78, 0.69, 0.55], [0.84, 0.76, 0.62]];
  let u = u0;
  let k = 0;
  while (u < u1 - 4) {
    const wide = Math.min(u1 - u, 7.5 + random() * 4);
    const deep = 6 + random() * 3;
    house(b, random, u, u + wide - 0.3, v0 - deep, v0, 3.8 + random() * 3.4, { colour: colours[k++ % colours.length], door: ['n', u + wide / 2], windows: 'n' });
    u += wide;
  }
  // what is set down on the quay to be laden: jars, and bales under a cloth
  const jar = (ju, jv, r, h) => b.turned(ju, jv, top, [[r * 0.3, 0], [r * 0.8, h * 0.15], [r, h * 0.45], [r * 0.9, h * 0.7], [r * 0.45, h * 0.86], [r * 0.4, h * 0.95], [r * 0.55, h]], 10, PART.PLASTER, CLAY, random());
  for (const [ju, jv] of [[gap[0] - 3.2, v1 - 2.6], [gap[0] - 3.9, v1 - 2.2], [gap[0] - 3.5, v1 - 3.3], [gap[1] + 9, v0 + 1.6], [gap[1] + 9.8, v0 + 1.3]]) jar(ju, jv, 0.2, 0.74);
  b.box(gap[1] + 3, gap[1] + 4.4, v1 - 3.4, v1 - 2.4, top, top + 0.6, { part: PART.CLOTH, colour: [0.56, 0.44, 0.3], seed: 0.65, base: top, solid: false, roofPart: PART.CLOTH, roofColour: [0.62, 0.5, 0.34] });
  b.box(gap[1] + 3.2, gap[1] + 4.2, v1 - 3.3, v1 - 2.5, top + 0.6, top + 1.05, { part: PART.CLOTH, colour: [0.5, 0.4, 0.3], seed: 0.66, base: top, solid: false, roofPart: PART.CLOTH, roofColour: [0.56, 0.45, 0.33] });
  // (no one walks off the quay but by the plank: what stops him is not seen)
  b.solids.push([u0, gap[0] + 0.2, v1 - 0.25, v1 + 0.3, top - 1, top + 2.6]);
  b.solids.push([gap[1] - 0.2, u1, v1 - 0.25, v1 + 0.3, top - 1, top + 2.6]);
  b.solids.push([u0 - 0.5, u0, v0 - 1, v1 + 0.3, top - 1, top + 2.6]);
  b.solids.push([u1, u1 + 0.5, v0 - 1, v1 + 0.3, top - 1, top + 2.6]);
}

/**
 * The dry land (2:10): sand as far as is seen, going down into the sea on one side, with a few stones. Where it was
 * is not told.
 */
function shore(b) {
  const top = LEVEL + 0.02;
  const v = AT_SEA.shore.v;
  const far = 4000;
  b.quad([[-far, top, -far], [-far, top, v], [far, top, v], [far, top, -far]], [0, 1, 0], PART.ROOF, SAND, [[-far, -far], [-far, v], [far, v], [far, -far]], 0.71);
  // (the wet of it, where it goes under)
  b.quad([[-far, top, v], [-far, top - 1.7, v + 28], [far, top - 1.7, v + 28], [far, top, v]], [0, 0.998, 0.06], PART.ROOF, [0.66, 0.59, 0.46], [[-far, v], [-far, v + 28], [far, v + 28], [far, v]], 0.72);
  const rock = (u, w, s, h) => b.box(u - s, u + s, w - s * 0.8, w + s * 0.8, top - 1, top + h, { part: PART.STONE, colour: [0.5, 0.47, 0.43], seed: 0.73 + u * 0.001, base: top, solid: false, roofPart: PART.STONE, roofColour: [0.56, 0.53, 0.48] });
  rock(149, v + 5, 1.3, 0.9);
  rock(151.2, v + 6.2, 0.8, 0.5);
  rock(171, v + 3, 1.0, 0.6);
  rock(138, v - 7, 0.7, 0.4);
  // (he goes up from the sea, not along it nor into it)
  b.solids.push([120, 200, v + 1.5, v + 2.2, top - 1, top + 2.6]);
  b.solids.push([139.3, 140, -40, v + 2, top - 1, top + 2.6]);
  b.solids.push([176, 176.7, -40, v + 2, top - 1, top + 2.6]);
}

/**
 * The booth (4:5), in four parts as it is made: two posts; two more, and the beams about their heads; boughs laid
 * across; more boughs, and a screen of them at its back. It stands on the rise, open towards the city (+u).
 */
const BOOTH = { half: 1.35, tall: 2.15 };
function booth(b, random, stage) {
  const [bu, bv] = AT_SEA.booth;
  const base = ground(bu, bv);
  const { half: h, tall } = BOOTH;
  const wood = (seed) => ({ part: PART.WOOD, colour: BOUGH, seed, base, solid: false, roofPart: PART.WOOD, roofColour: BOUGH });
  const post = (u, v, seed) => b.box(u - 0.06, u + 0.06, v - 0.06, v + 0.06, base - 0.3, base + tall + 0.1, wood(seed));
  if (stage === 0) {
    post(bu - h, bv - h, 0.81);
    post(bu - h, bv + h, 0.82);
  } else if (stage === 1) {
    post(bu + h, bv - h, 0.83);
    post(bu + h, bv + h, 0.84);
    for (const v of [bv - h, bv + h]) b.box(bu - h - 0.2, bu + h + 0.2, v - 0.05, v + 0.05, base + tall, base + tall + 0.1, wood(0.85));
    for (const u of [bu - h, bu + h]) b.box(u - 0.05, u + 0.05, bv - h - 0.2, bv + h + 0.2, base + tall - 0.08, base + tall + 0.02, wood(0.86));
  } else {
    // boughs across, and their dry leaves over them: each a long leaf lying a little askew
    const y = base + tall + 0.1 + (stage - 2) * 0.07;
    for (let i = 0; i < 6; i++) {
      const v = bv - h + ((i + 0.5 + (stage - 2) * 0.5) / 6) * 2 * h;
      b.box(bu - h - 0.35, bu + h + 0.35, v - 0.03, v + 0.03, y, y + 0.05, wood(0.87 + i * 0.01));
    }
    for (let i = 0; i < 16; i++) {
      const u = bu - h - 0.3 + random() * (2 * h + 0.6);
      const v = bv - h - 0.3 + random() * (2 * h + 0.6);
      const a = random() * Math.PI;
      const [lu, lv] = [Math.cos(a) * 0.75, Math.sin(a) * 0.75];
      const [wu, wv] = [-Math.sin(a) * 0.2, Math.cos(a) * 0.2];
      const ly = y + 0.06 + random() * 0.05;
      const tone = 0.85 + random() * 0.3;
      b.quad([[u - lu - wu, ly, v - lv - wv], [u - lu + wu, ly, v - lv + wv], [u + lu + wu, ly + 0.03, v + lv + wv], [u + lu - wu, ly + 0.03, v + lv - wv]], [0, 1, 0], PART.PLASTER, STRAW.map((c) => c * tone), [[0, 0], [0.4, 0], [0.4, 1.5], [0, 1.5]], random());
    }
    if (stage === 3) {
      // a screen at its back (-u), of boughs set on end
      for (let i = 0; i < 9; i++) {
        const v = bv - h + (i / 8) * 2 * h;
        const lean = (random() - 0.5) * 0.12;
        b.quad([[bu - h - 0.02, base - 0.1, v - 0.13], [bu - h - 0.02, base - 0.1, v + 0.13], [bu - h - 0.02 + lean, base + tall * (0.72 + random() * 0.22), v + 0.1 + lean], [bu - h - 0.02 + lean, base + tall * (0.72 + random() * 0.22), v - 0.1 + lean]], [-1, 0, 0], PART.PLASTER, STRAW.map((c) => c * (0.75 + random() * 0.3)), [[0, 0], [0.26, 0], [0.26, 1.8], [0, 1.8]], random());
      }
    }
  }
}

/** The post of the booth the gourd comes up by (the story makes it grow about its foot). */
export const GOURD_FOOT = [AT_SEA.booth[0] + BOOTH.half, AT_SEA.booth[1] - BOOTH.half];

/**
 * The gourd (4:6): "made it to come up over Jonah, that it might be a shadow over his head". A vine up one post of
 * the booth and over all its roof, broad-leaved, with its fruit hanging. What plant it was is not known (the Hebrew
 * word is found nowhere else); it is drawn as a gourd vine. `dead`: as the worm left it (4:7), brown, its leaves
 * hanging and fallen, its roof bare again.
 */
function gourd(b, random, dead) {
  const [bu, bv] = AT_SEA.booth;
  const [fu, fv] = GOURD_FOOT;
  const base = ground(bu, bv);
  const { half: h, tall } = BOOTH;
  const y = base + tall + 0.3;
  const GREEN = dead ? [0.4, 0.3, 0.16] : [0.2, 0.46, 0.15];
  const stem = { part: PART.PLASTER, colour: dead ? [0.36, 0.28, 0.16] : [0.24, 0.4, 0.14], seed: 0.9, base, solid: false, roofPart: PART.PLASTER, roofColour: GREEN };
  // the vine: up the post, and in runners across the roof
  b.box(fu + 0.06, fu + 0.13, fv - 0.13, fv - 0.06, base - 0.1, y, stem);
  for (let i = 0; i < 5; i++) {
    const v = bv - h + ((i + 0.5) / 5) * 2 * h;
    b.box(bu - h - 0.2, bu + h + 0.25, v - 0.025, v + 0.025, y - 0.02 - (dead ? 0.12 : 0), y + 0.03 - (dead ? 0.12 : 0), stem);
  }
  // its leaves: broad, each a little its own green, lying over the roof and hanging at its edges
  const leaf = (u, v, ly, size, a, droop) => {
    const [lu, lv] = [Math.cos(a) * size, Math.sin(a) * size];
    const [wu, wv] = [-Math.sin(a) * size * 0.8, Math.cos(a) * size * 0.8];
    const tone = 0.8 + random() * 0.45;
    const colour = GREEN.map((c, i) => c * tone * (i === 1 ? 1 : 0.9 + random() * 0.2));
    b.quad([[u - wu, ly, v - wv], [u + lu * 0.6 - wu * 0.2, ly - droop * 0.5, v + lv * 0.6 - wv * 0.2], [u + lu, ly - droop, v + lv], [u + wu, ly - droop * 0.3, v + wv]], [0, 1, 0.1], PART.PLASTER, colour, [[0, 0], [0.5, 0], [0.5, 0.7], [0, 0.7]], random());
  };
  const n = dead ? 12 : 44;
  for (let i = 0; i < n; i++) {
    const u = bu - h - 0.45 + random() * (2 * h + 0.9);
    const v = bv - h - 0.45 + random() * (2 * h + 0.9);
    const edge = Math.max(Math.abs(u - bu), Math.abs(v - bv)) > h;
    leaf(u, v, y + 0.04 + random() * 0.14 - (dead ? 0.2 : 0), dead ? 0.26 + random() * 0.14 : 0.42 + random() * 0.3, random() * Math.PI * 2, edge ? (dead ? 0.6 : 0.3) : dead ? 0.1 : 0.04);
  }
  // (and up the post)
  for (let i = 0; i < (dead ? 2 : 6); i++) leaf(fu + 0.1, fv - 0.1, base + 0.5 + i * 0.3, dead ? 0.2 : 0.3, random() * Math.PI * 2, dead ? 0.3 : 0.08);
  if (dead) {
    // what has fallen lies about the booth's foot
    for (let i = 0; i < 16; i++) leaf(bu - h - 0.8 + random() * (2 * h + 1.6), bv - h - 0.8 + random() * (2 * h + 1.6), base + 0.03, 0.22 + random() * 0.12, random() * Math.PI * 2, 0);
  }
  // its fruit: pale, long-necked, hanging at the roof's edge (fallen, when it is dead)
  for (const [du, dv, s] of [[h + 0.2, -0.5, 1], [h + 0.12, 0.7, 0.8], [-0.4, -h - 0.2, 0.9]]) {
    const gy = dead ? base + 0.02 : y - 0.62 * s;
    b.turned(bu + du, bv + dv, gy, [[0.02, 0], [0.13 * s, 0.07 * s], [0.16 * s, 0.2 * s], [0.1 * s, 0.34 * s], [0.045 * s, 0.46 * s], [0.03 * s, 0.6 * s]], 9, PART.PLASTER, dead ? [0.5, 0.4, 0.22] : [0.66, 0.7, 0.36], random());
  }
}

/** The stone figures either side of the gate, and the way in paved. */
function gate(b, { cu, cv, hu, gw, base }) {
  const face = cu - hu - 3;
  for (const side of [-1, 1]) {
    // each a great block of pale stone standing out before the tower, a head rising at its front
    const [d, e] = side < 0 ? [cv - gw - 2.1, cv - gw - 0.25] : [cv + gw + 0.25, cv + gw + 2.1];
    b.box(face - 4.2, face, d, e, base - 1, base + 3.5, { part: PART.STONE, colour: STONE, seed: 0.2 + side * 0.01, base, roofPart: PART.STONE, roofColour: STONE });
    b.box(face - 4.2, face - 3.1, d + 0.25, e - 0.25, base + 3.5, base + 4.7, { part: PART.STONE, colour: STONE, seed: 0.22, base, solid: false, roofPart: PART.STONE, roofColour: STONE });
    b.box(face - 4.35, face - 3.0, d + 0.1, e - 0.1, base + 4.7, base + 5.0, { part: PART.STONE, colour: [0.74, 0.7, 0.62], seed: 0.23, base, solid: false, roofPart: PART.STONE, roofColour: [0.74, 0.7, 0.62] });
    // (the wing, laid back along its side: a darker slab)
    b.patch(side < 0 ? 'n' : 's', side < 0 ? e : d, face - 1.9, 3.2, base + 1.5, base + 3.2, base, PART.STONE, [0.68, 0.64, 0.56], 0.24);
    // the towers' feet lined with stone
    const [t0, t1] = side < 0 ? [cv - gw - 8.2, cv - gw - 0.2] : [cv + gw + 0.2, cv + gw + 8.2];
    b.patch('w', face, (t0 + t1) / 2, t1 - t0, base, base + 1.7, base, PART.STONE, STONE, 0.25);
  }
  paving(b, cu - hu - 46, cu - hu - 3, cv - 4, cv + 4, 0.6);
  paving(b, cu - hu - 3, cu - hu + 7, cv - gw, cv + gw, 0.4);
  paving(b, cu - hu + 7, cu - 46, cv - 13, cv + 13, 1.0);
  paving(b, cu - 46, cu + 62, cv - 3.5, cv + 3.5, 0.6);
}

/** Within the walls: the king's house and his seat before it; and the temple tower. */
function inside(b, random, { S, cu, cv }) {
  {
    const [u0, v0, u1, v1] = IN_NINEVEH.palace;
    const [a, c, d, e] = S(u0, u1, v0, v1);
    const base = house(b, random, a, c, d, e, 11, { colour: [0.8, 0.7, 0.54], windows: '', door: null, seed: 0.91 });
    // its foot lined with slabs of stone, on the street; its doorway, tall and dark, with a lintel of gold
    const door = (a + c) / 2;
    const dw = 2.1;
    for (const [p, q] of [[a + 0.5, door - dw], [door + dw, c - 0.5]]) b.patch('s', d, (p + q) / 2, q - p, base + 0.1, base + 2.4, base, PART.STONE, STONE, 0.92);
    b.patch('s', d, door, dw * 2, base - 0.1, base + 5.6, base, PART.DARK, BRICK, 0.92);
    b.box(door - dw - 0.5, door + dw + 0.5, d - 0.4, d, base + 5.6, base + 6.1, { part: PART.GOLD, colour: GOLD, seed: 0.93, base, solid: false, roofPart: PART.GOLD, roofColour: GOLD });
    stepped(b, a, d + 0.45, c, d + 0.45, base + 11.55, base, true);
    // The king's seat: a dais of brick spread with purple, the seat at its back with a high back of pale stone, a
    // canopy of purple over it on posts of gold.
    const [du0, dv0, du1, dv1] = IN_NINEVEH.dais;
    const [p0, p1, q0, q1] = S(du0, du1, dv0, dv1);
    const top = base + IN_NINEVEH.daisTall;
    b.box(p0, p1, q0, q1, base - 0.5, top, { ...brick(0.5, base), roofPart: PART.CLOTH, roofColour: PURPLE });
    const mid = (p0 + p1) / 2;
    b.box(mid - 0.85, mid + 0.85, q1 - 1.35, q1 - 0.3, top, top + 0.4, { part: PART.GOLD, colour: GOLD, seed: 0.53, base: top, solid: false, roofPart: PART.CLOTH, roofColour: PURPLE });
    b.box(mid - 0.95, mid + 0.95, q1 - 0.3, q1, top, top + 3.0, { part: PART.STONE, colour: STONE, seed: 0.54, base: top, solid: false, roofPart: PART.GOLD, roofColour: GOLD });
    const ch = top + 4.2;
    for (const [u, v] of [[p0 + 0.2, q0 + 0.2], [p1 - 0.2, q0 + 0.2], [p0 + 0.2, q1 - 0.15], [p1 - 0.2, q1 - 0.15]]) b.box(u - 0.1, u + 0.1, v - 0.1, v + 0.1, top - 0.1, ch, { part: PART.GOLD, colour: GOLD, seed: 0.55, base: top, solid: false });
    const cm = (q0 + q1) / 2;
    b.quad([[p0 - 0.2, ch, q0 - 0.2], [p0 - 0.2, ch + 0.5, cm], [p1 + 0.2, ch + 0.5, cm], [p1 + 0.2, ch, q0 - 0.2]], [0, 1, -0.6], PART.CLOTH, PURPLE, [[p0, 0], [p0, 1], [p1, 1], [p1, 0]], 0.56);
    b.quad([[p0 - 0.2, ch + 0.5, cm], [p0 - 0.2, ch, q1 + 0.2], [p1 + 0.2, ch, q1 + 0.2], [p1 + 0.2, ch + 0.5, cm]], [0, 1, 0.6], PART.CLOTH, PURPLE, [[p0, 1], [p0, 2], [p1, 2], [p1, 1]], 0.57);
    b.quad([[p0 - 0.2, ch - 0.4, q0 - 0.2], [p1 + 0.2, ch - 0.4, q0 - 0.2], [p1 + 0.2, ch, q0 - 0.2], [p0 - 0.2, ch, q0 - 0.2]], [0, 0, -1], PART.GOLD, GOLD, [[0, 0], [1, 0], [1, 1], [0, 1]], 0.58);
  }
  // the temple tower: stages of brick, each smaller than the one under it, a stair up its face, a shrine at its top
  {
    const [cu0, cv0, cu1, cv1] = IN_NINEVEH.tower;
    const mu = cu + (cu0 + 14 + cu1) / 2;
    const mv = cv + (cv0 + cv1) / 2;
    const base = footing(mu - 20, mu + 20, mv - 20, mv + 20);
    let y = base;
    const stages = [[20, 8], [16, 6.5], [12.5, 5.5], [9.4, 4.6]];
    stages.forEach(([h, tall], i) => {
      b.box(mu - h, mu + h, mv - h, mv + h, y - (i ? 0.2 : 1.6), y + tall, brick(0.8 + i * 0.02, base, { colour: MUD, roofColour: MUD }));
      y += tall;
    });
    const s = 5;
    b.box(mu - s, mu + s, mv - s, mv + s, y - 0.2, y + 5, { colour: [0.86, 0.8, 0.66], seed: 0.88, base: y, roofPart: PART.ROOF, roofColour: ROOF });
    b.box(mu - s - 0.2, mu + s + 0.2, mv - s - 0.2, mv + s + 0.2, y + 4.2, y + 4.7, { part: PART.GOLD, colour: GOLD, seed: 0.88, base: y, solid: false, roofPart: PART.GOLD, roofColour: GOLD });
    b.patch('w', mu - s, mv, 1.6, y, y + 3, y, PART.DARK, BRICK, 0.89);
    const [s0, s1] = [mu - 20 - 13, mu - 20];
    const [w0, w1] = [mv - 3, mv + 3];
    const rise = base + stages[0][1];
    const g0 = ground(s0, mv) + 0.05;
    b.quad([[s0, g0, w0], [s0, g0, w1], [s1, rise, w1], [s1, rise, w0]], [-0.52, 0.85, 0], PART.PAVE, STONE, [[0, w0], [0, w1], [15.3, w1], [15.3, w0]], 0.9);
    for (const v of [w0 - 0.6, w1]) {
      b.quad([[s0, g0 - 0.6, v], [s1, rise - 0.6, v], [s1, rise + 0.8, v], [s0, g0 + 0.8, v]], [0, 0, v < mv ? -1 : 1], PART.BRICK, MUD, [[s0, 0], [s1, 8], [s1, 9.4], [s0, 1.4]], 0.91);
      b.quad([[s0, g0 - 0.6, v + 0.6], [s1, rise - 0.6, v + 0.6], [s1, rise + 0.8, v + 0.6], [s0, g0 + 0.8, v + 0.6]], [0, 0, v < mv ? 1 : -1], PART.BRICK, MUD, [[s0, 0], [s1, 8], [s1, 9.4], [s0, 1.4]], 0.91);
      b.quad([[s0, g0 + 0.8, v], [s1, rise + 0.8, v], [s1, rise + 0.8, v + 0.6], [s0, g0 + 0.8, v + 0.6]], [-0.52, 0.85, 0], PART.BRICK, MUD, [[s0, v], [s1, v], [s1, v + 0.6], [s0, v + 0.6]], 0.91);
    }
  }
}

/** Nineveh, for createCity. No room of it is lit apart from the day. */
export const NINEVEH = {
  name: 'nineveh',
  stone: MUD,
  plasters: PLASTERS,
  wallPart: PART.BRICK,
  stepped: true,
  towerEvery: 17,
  windows: false,
  reserve: [IN_NINEVEH.palace, IN_NINEVEH.tower, IN_NINEVEH.dais.map((x, i) => x + (i < 2 ? -1 : 1))],
  gate,
  inside,
  outside() {},
  rooms: { none: { u: CITY.at[0], v: CITY.at[1], half: [0.1, 0.1], up: 1, reach: 0, shade: 0 } },
  room: 'none',
};

/** The journey's sets, each a `fill(b, random)` for g.set: made once, shown as the story comes to them. */
export const SETS = {
  ship,
  gangwayRail,
  oars,
  quay,
  shore,
  booth0: (b, random) => booth(b, random, 0),
  booth1: (b, random) => booth(b, random, 1),
  booth2: (b, random) => booth(b, random, 2),
  booth3: (b, random) => booth(b, random, 3),
  gourd: (b, random) => gourd(b, random, false),
  withered: (b, random) => gourd(b, random, true),
};

/**
 * The journey's small things (city.js, createProps), each built about (0, 0) on the ground: the wares of the ship
 * (1:5), four boughs for the booth (4:5), the robe the king lays from him and the ashes he sits in (3:6).
 */
const amphora = (seed) => (b) => b.turned(0, 0, 0, [[0.05, 0], [0.15, 0.1], [0.24, 0.36], [0.23, 0.58], [0.11, 0.74], [0.085, 0.86], [0.13, 0.9]], 12, PART.PLASTER, CLAY, seed);
const bale = (colour, seed) => (b) => {
  b.box(-0.36, 0.36, -0.26, 0.26, 0, 0.44, { part: PART.CLOTH, colour: colour.map((c) => c * 0.88), seed, solid: false, roofPart: PART.CLOTH, roofColour: colour });
  for (const u of [-0.2, 0.2]) b.box(u - 0.025, u + 0.025, -0.27, 0.27, -0.005, 0.45, { part: PART.WOOD, colour: [0.3, 0.22, 0.14], seed: seed + 0.01, solid: false });
};
const bough = (seed) => (b) => {
  b.box(-1.1, 1.1, -0.035, 0.035, 0.02, 0.09, { part: PART.WOOD, colour: BOUGH, seed, solid: false, roofPart: PART.WOOD, roofColour: BOUGH });
  for (let i = 0; i < 6; i++) {
    const u = -0.9 + i * 0.36;
    const side = i % 2 ? 1 : -1;
    b.quad([[u - 0.1, 0.1, 0], [u + 0.1, 0.1, 0], [u + 0.34, 0.07, side * 0.62], [u + 0.14, 0.07, side * 0.62]], [0, 1, 0], PART.PLASTER, STRAW.map((c) => c * (0.85 + ((i * 7) % 5) * 0.06)), [[0, 0], [0.2, 0], [0.2, 0.7], [0, 0.7]], seed + i * 0.01);
  }
};
export const PROPS = {
  ware0: amphora(0.71),
  ware1: bale([0.6, 0.48, 0.32], 0.72),
  ware2: (b) => b.box(-0.34, 0.34, -0.24, 0.24, 0, 0.42, { part: PART.WOOD, colour: WOOD, seed: 0.73, solid: false, roofPart: PART.WOOD, roofColour: [0.42, 0.29, 0.18] }),
  ware3: amphora(0.74),
  ware4: bale([0.5, 0.36, 0.42], 0.75),
  ware5: amphora(0.76),
  bough0: bough(0.77),
  bough1: bough(0.78),
  bough2: bough(0.79),
  bough3: bough(0.8),
  robe: (b) => {
    b.box(-0.55, 0.5, -0.4, 0.36, 0, 0.14, { part: PART.CLOTH, colour: [0.5, 0.1, 0.12], seed: 0.81, solid: false, roofPart: PART.CLOTH, roofColour: [0.58, 0.13, 0.15] });
    b.box(-0.3, 0.42, -0.2, 0.3, 0.14, 0.24, { part: PART.CLOTH, colour: [0.52, 0.1, 0.13], seed: 0.82, solid: false, roofPart: PART.CLOTH, roofColour: [0.62, 0.15, 0.17] });
    b.box(-0.5, 0.45, 0.3, 0.38, 0.02, 0.16, { part: PART.GOLD, colour: GOLD, seed: 0.83, solid: false, roofPart: PART.GOLD, roofColour: GOLD });
  },
  ashes: (b) => {
    b.quad([[-1.0, 0.05, -0.8], [-1.1, 0.05, 0.7], [0.9, 0.05, 0.9], [1.05, 0.05, -0.75]], [0, 1, 0], PART.ROOF, [0.42, 0.41, 0.4], [[0, 0], [0, 1.5], [2, 1.5], [2, 0]], 0.84);
    b.quad([[-0.6, 0.06, -0.45], [-0.65, 0.06, 0.4], [0.55, 0.06, 0.5], [0.6, 0.06, -0.4]], [0, 1, 0], PART.ROOF, [0.3, 0.3, 0.3], [[0, 0], [0, 1], [1.2, 1], [1.2, 0]], 0.85);
  },
};
