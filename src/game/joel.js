// Joel 2:12–17, played: "Blow the trumpet in Zion … Gather the people" (2:15–16). A short game, against the setting
// of the sun, for the week of Come, Follow Me on Hosea and Joel ("I Will Love Them Freely"). How it is played is in
// gather.js.
//
// What the account says. The chapter is a call, not a story: the LORD says "turn ye even to me with all your heart"
// (2:12), and Joel, "turn unto the LORD your God: for he is gracious and merciful" (2:13). Then: "Blow the trumpet in
// Zion, sanctify a fast, call a solemn assembly: Gather the people, sanctify the congregation, assemble the elders,
// gather the children, and those that suck the breasts: let the bridegroom go forth of his chamber, and the bride out
// of her closet" (2:15–16). No one in it is named, nor is it told who blew the trumpet, or who came.
//
// The game's own. You are one of the people of Zion who answers the call: no one the text names. The streets are
// Jerusalem's (the city of the first journey), at evening; the assembly is in the square inside the gate (the temple
// is not built here, and the priests between the porch and the altar, 2:17, are not shown); who is where, and what
// each is about that evening until the trumpet is heard (life.js), are the game's. The infants of 2:16 are not shown. The verses are shown as verses, whole, and the LORD's
// words only as the verse; what is said in the game's own words (how to play, how many came) is in italic, with no
// reference, so that no one takes it for scripture.
import { PART } from './city.js';
import { CITY } from './places.js';
import { createGather } from './gather.js';
import { createLife } from './life.js';

// What they wear: wool, undyed and plainly dyed, as the people of the first journey's Jerusalem; no mantles (the cloth
// of one is worked out every frame). The bridegroom and the bride are in their best: white, with gold at the edges.
const tunic = (lit, shade) => ({ SHIRT: [lit, shade], TROUSERS: [lit.map((v) => v * 0.95), shade], SKIRT: [lit, shade] });
const GREY = [[0.74, 0.72, 0.68], [0.46, 0.45, 0.47]];
const DARK = [[0.16, 0.11, 0.08], [0.08, 0.06, 0.05]];
export const CLOTHES = {
  // you: a young man of Zion, a tunic of madder red to the knee, a cloth on the head
  player: {
    ...tunic([0.66, 0.3, 0.22], [0.36, 0.15, 0.15]),
    HAT: [[0.88, 0.83, 0.72], [0.54, 0.5, 0.52]],
    TRIM: [[0.86, 0.72, 0.44], [0.52, 0.42, 0.28]],
    BELT: [[0.4, 0.26, 0.15], [0.2, 0.13, 0.1]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.42, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
  },
  // the elders: long robes, grey hair and beards, a staff
  elder: {
    ...tunic([0.52, 0.42, 0.34], [0.28, 0.21, 0.2]),
    HAT: [[0.86, 0.82, 0.72], [0.52, 0.5, 0.52]],
    TRIM: [[0.76, 0.66, 0.46], [0.46, 0.38, 0.28]],
    BELT: [[0.36, 0.22, 0.12], [0.18, 0.11, 0.09]],
    HAIR: GREY,
    BEARD: GREY,
    OUTFIT: { head: 'cloth', beard: 'long', cloak: false, hem: 0.06, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true, staff: true },
  },
  elder2: {
    ...tunic([0.38, 0.42, 0.5], [0.19, 0.21, 0.32]),
    HAT: [[0.82, 0.78, 0.68], [0.5, 0.47, 0.5]],
    TRIM: [[0.8, 0.7, 0.5], [0.48, 0.4, 0.3]],
    BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
    HAIR: GREY,
    BEARD: GREY,
    OUTFIT: { head: 'cloth', beard: 'long', cloak: false, hem: 0.06, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true, staff: true },
  },
  // men of the city
  man: {
    ...tunic([0.56, 0.52, 0.34], [0.3, 0.28, 0.22]),
    HAT: [[0.8, 0.74, 0.62], [0.46, 0.42, 0.44]],
    TRIM: [[0.36, 0.26, 0.16], [0.2, 0.15, 0.11]],
    BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.3, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
  },
  man2: {
    ...tunic([0.44, 0.5, 0.56], [0.22, 0.26, 0.36]),
    HAT: [[0.84, 0.8, 0.7], [0.5, 0.47, 0.5]],
    TRIM: [[0.78, 0.72, 0.6], [0.46, 0.42, 0.38]],
    BELT: [[0.36, 0.22, 0.12], [0.18, 0.11, 0.09]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.3, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
  },
  // the bridegroom: a white robe with gold at its hem, a band of gold about his brow
  groom: {
    ...tunic([0.96, 0.94, 0.88], [0.6, 0.58, 0.66]),
    HAT: [[1.0, 0.8, 0.32], [0.62, 0.46, 0.2]],
    HEADBAND: [[1.0, 0.8, 0.32], [0.62, 0.46, 0.2]],
    TRIM: [[1.0, 0.8, 0.32], [0.62, 0.46, 0.2]],
    BELT: [[0.6, 0.2, 0.18], [0.32, 0.1, 0.12]],
    OUTFIT: { head: 'band', cloak: false, hem: 0.1, edge: 0, bare: 0, belt: 1, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  // the bride: a robe of deep blue to the ground, a white cloth over her head, gold at the edges
  bride: {
    ...tunic([0.3, 0.38, 0.66], [0.15, 0.19, 0.4]),
    HAT: [[0.97, 0.95, 0.9], [0.64, 0.62, 0.68]],
    TRIM: [[1.0, 0.8, 0.32], [0.62, 0.46, 0.2]],
    BELT: [[1.0, 0.78, 0.3], [0.62, 0.42, 0.18]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.02, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  // a woman of the city: a long robe of green-brown, a pale cloth over her head
  woman: {
    ...tunic([0.42, 0.46, 0.3], [0.21, 0.24, 0.2]),
    HAT: [[0.88, 0.84, 0.74], [0.54, 0.51, 0.54]],
    TRIM: [[0.8, 0.66, 0.44], [0.48, 0.4, 0.3]],
    BELT: [[0.6, 0.42, 0.3], [0.34, 0.22, 0.2]],
    OUTFIT: { head: 'cloth', cloak: false, hem: 0.05, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  // the children: short tunics, bare-headed
  child: {
    ...tunic([0.78, 0.7, 0.54], [0.44, 0.39, 0.38]),
    TRIM: [[0.62, 0.3, 0.2], [0.34, 0.16, 0.14]],
    HAIR: DARK,
    BELT: [[0.46, 0.36, 0.24], [0.24, 0.18, 0.15]],
    OUTFIT: { head: 'none', hair: '', cloak: false, hem: 0.5, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.2, blade: 0 },
  },
  child2: {
    ...tunic([0.5, 0.6, 0.66], [0.25, 0.31, 0.4]),
    TRIM: [[0.86, 0.76, 0.56], [0.5, 0.44, 0.36]],
    HAIR: DARK,
    BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
    OUTFIT: { head: 'none', hair: 'long', cloak: false, hem: 0.12, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.2, blade: 0, sleeves: true },
  },
};

/** Who is in the story besides the city's own ten (town.js), made in this order: [name, clothes, bearded, how tall]. */
export const PEOPLE = [
  ['bride', 'bride', false, 0.93],
  ['woman', 'woman', false, 0.93],
  ['child1', 'child', false, 0.62],
  ['child2', 'child2', false, 0.6],
  ['child3', 'child', false, 0.64],
  ['child4', 'child2', false, 0.62],
];

/** What they carry about the city that evening: a water jar, and a basket of bread under a cloth (city.js, createProps). */
const CLAY = [0.66, 0.4, 0.25];
const STRAW = [0.72, 0.58, 0.34];
export const PROPS = {
  jar: (b) => b.turned(0, 0, 0, [[0.09, 0], [0.16, 0.13], [0.17, 0.26], [0.1, 0.37], [0.07, 0.43], [0.095, 0.47]], 10, PART.PLASTER, CLAY, 0.73),
  basket: (b) => {
    b.turned(0, 0, 0, [[0.15, 0], [0.21, 0.05], [0.24, 0.2], [0.25, 0.24]], 10, PART.WOOD, STRAW, 0.74);
    b.box(-0.17, 0.17, -0.17, 0.17, 0.17, 0.25, { part: PART.CLOTH, colour: [0.86, 0.8, 0.66], seed: 0.75, solid: false, roofPart: PART.CLOTH, roofColour: [0.9, 0.84, 0.7] });
  },
};
/** How a jar or a basket is held: before him in both hands. */
export const HOLD = { jar: { out: 0.3, up: 0.9, wide: 0.13 }, basket: { out: 0.34, up: 0.92, wide: 0.22 } };

/** What is written over those the text names: only "the bridegroom" and "the bride" (2:16). */
export const NAMES = { town5: 'The bridegroom', bride: 'The bride' };

/** The people of the city are the story's to place: none walks the streets of their own. */
export function town() {
  return { day() {}, night() {}, watch() {} };
}

// ---- the streets, in metres from the city's middle (cu along the main street, east; cv across it) ----
// The main street runs from the square inside the west gate to the east wall; two cross streets cross it, A at cu −27
// and B at cu 19.5; a lane runs round inside the walls (cv ±50, cu 65). These are the points where they meet.
const NODES = {
  S: [-56, 0],
  M: [-45, 0],
  JA: [-27, 0],
  JB: [19.5, 0],
  E: [65, 0],
  NA: [-27, 50],
  SA: [-27, -50],
  NB: [19.5, 50],
  SB: [19.5, -50],
  NE: [65, 50],
  SE: [65, -50],
};
const EDGES = [['S', 'M'], ['M', 'JA'], ['JA', 'JB'], ['JB', 'E'], ['JA', 'NA'], ['JA', 'SA'], ['JB', 'NB'], ['JB', 'SB'], ['NA', 'NB'], ['SA', 'SB'], ['NB', 'NE'], ['SB', 'SE'], ['NE', 'E'], ['SE', 'E']];

/** Where on the streets a point is nearest: the edge, how far along it (0 to 1), and the point. */
function onStreets([u, v]) {
  let best = null;
  for (const [a, b] of EDGES) {
    const [au, av] = NODES[a];
    const [bu, bv] = NODES[b];
    const du = bu - au;
    const dv = bv - av;
    const k = Math.max(0, Math.min(1, ((u - au) * du + (v - av) * dv) / (du * du + dv * dv)));
    const p = [au + du * k, av + dv * k];
    const d = Math.hypot(u - p[0], v - p[1]);
    if (!best || d < best.d) best = { a, b, k, p, d };
  }
  return best;
}

/** The way along the streets from one point to another (both in the city's (cu, cv)): the points to pass, in order. */
export function streetWay(from, to) {
  const s = onStreets(from);
  const t = onStreets(to);
  const at = { ...NODES, _s: s.p, _t: t.p };
  const links = EDGES.filter(([a, b]) => !(a === s.a && b === s.b) && !(a === t.a && b === t.b));
  links.push([s.a, '_s'], ['_s', s.b], [t.a, '_t'], ['_t', t.b]);
  // (both on the one street: straight along it)
  if (s.a === t.a && s.b === t.b) links.push(['_s', '_t']);
  const length = ([a, b]) => Math.hypot(at[a][0] - at[b][0], at[a][1] - at[b][1]);
  const far = Object.fromEntries(Object.keys(at).map((n) => [n, Infinity]));
  const back = {};
  far._s = 0;
  const open = new Set(Object.keys(at));
  while (open.size) {
    let n = null;
    for (const m of open) if (n == null || far[m] < far[n]) n = m;
    open.delete(n);
    if (n === '_t') break;
    for (const link of links) {
      const other = link[0] === n ? link[1] : link[1] === n ? link[0] : null;
      if (other == null || !open.has(other)) continue;
      const d = far[n] + length(link);
      if (d < far[other]) {
        far[other] = d;
        back[other] = n;
      }
    }
  }
  const way = [];
  for (let n = '_t'; n; n = back[n]) way.unshift(at[n]);
  way.push(to);
  return way;
}

export function story(g) {
  const { C } = g;
  const who = (name) => g.cast.get(name);
  /** (x, z) to the city's (cu, cv). */
  const inCity = (x, z) => [x * 0.6 + z * 0.8 - CITY.at[0], -x * 0.8 + z * 0.6 - CITY.at[1]];
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);

  // ---- the places ----
  const start = C(-52, 0);
  const east = C(-40, 0);
  /** The square inside the gate, where the assembly is: open ground from the west wall to the main street's mouth. */
  const inSquare = (x, z) => {
    const [u, v] = inCity(x, z);
    return u > -66 && u < -44.5 && v > -16.5 && v < 15.5;
  };
  // the rows of the assembly, on the south side of the square, facing east: the children before, the elders behind
  const row = (cu, vs) => vs.map((cv) => ({ at: C(cu, cv), facing: C(cu + 30, cv) }));
  const SEATS = {
    child: row(-56, [-13.5, -11.3, -9.1, -6.9]),
    adult: row(-58.5, [-13.5, -11.3, -9.1, -6.9, -4.7]),
    elder: row(-61, [-13.5, -11.3, -9.1]),
  };
  /** Where one of them is now (for another to face, as they talk). */
  const at = (name) => () => [who(name).x, who(name).z];
  // Who is where, and what each is about until the trumpet is heard (life.js: steps gone through over and over).
  // Each keeps to the open street (no one walks through a house). Two and two stand and talk; the rest are busy.
  const loop = (points, pace, rest = 0, face = null) => [{ go: points, pace }, ...(rest ? [{ stay: rest, face }] : [])];
  const SPEC = {
    people: [
      // in the square by the gate, an old man sits in the evening light, and now and then gets up to look down the street
      { name: 'town0', kind: 'elder', dress: 'elder', at: C(-50, 13), face: C(-50, 4),
        day: [{ stay: 14, sit: true, face: C(-50, 4) }, { go: [C(-48, 11.5)], pace: 0.8 }, { stay: 5, face: C(-30, 0) }, { go: [C(-50, 13)], pace: 0.8 }] },
      // two elders talk at the corner of the street that goes down to the south wall
      { name: 'town2', kind: 'elder', dress: 'elder2', at: C(-27.8, -13.5), face: C(-26.2, -15.3),
        day: [{ stay: 8, face: at('town3') }, { go: [C(-28.3, -12.4)], pace: 0.7 }, { stay: 6, face: at('town3') }, { go: [C(-27.8, -13.5)], pace: 0.7 }] },
      { name: 'town3', kind: 'elder', dress: 'elder', at: C(-26.2, -15.3), face: C(-27.8, -13.5),
        day: [{ stay: 11, face: at('town2') }, { go: [C(-25.6, -16.6)], pace: 0.7 }, { stay: 5, face: at('town2') }, { go: [C(-26.2, -15.3)], pace: 0.7 }] },
      // a woman carries water up and down the north street, and sets her jar down where she pours it out
      { name: 'woman', kind: 'adult', at: C(-27.4, 30), face: C(-27, 9), carries: 'jar',
        day: [
          { take: 'jar', hold: HOLD.jar },
          { go: [C(-26.8, 9)], pace: 1.25 },
          { put: 'jar' },
          { stay: 5, kneel: true, face: C(-29.5, 8) },
          { take: 'jar', hold: HOLD.jar },
          { go: [C(-27.4, 31)], pace: 1.25 },
          { put: 'jar' },
          { stay: 4, face: C(-30.5, 31) },
        ] },
      // the bridegroom, on the step of his chamber's door, gets up, goes a few steps and comes back
      { name: 'town5', kind: 'groom', dress: 'groom', at: C(-29.2, 25.9), face: C(-25, 25.9),
        day: [{ stay: 9, sit: true, face: C(-25, 25.9) }, { go: [C(-27.4, 27.6)], pace: 1 }, { stay: 4, face: C(-27.4, 40) }, { go: [C(-28.9, 25.6)], pace: 1 }, { stay: 3, face: C(-30.1, 25.9) }] },
      // the bride at her door, talking with a man of the city
      { name: 'bride', kind: 'bride', at: C(22.2, -19.0), face: C(20.3, -20.2),
        day: [{ stay: 10, face: at('town8') }, { go: [C(22.3, -17.6)], pace: 0.8 }, { stay: 6, face: at('town8') }, { go: [C(22.2, -19.0)], pace: 0.8 }] },
      { name: 'town8', kind: 'adult', dress: 'man2', at: C(20.1, -20.4), face: C(22.2, -19.0),
        day: [{ stay: 7, face: at('bride') }, { go: [C(19.6, -21.8)], pace: 0.8 }, { stay: 8, face: at('bride') }, { go: [C(20.1, -20.4)], pace: 0.8 }] },
      // a man carries a basket of bread along the main street, sets it down, and goes back for another
      { name: 'town6', kind: 'adult', dress: 'man', at: C(30, -1.8), face: C(50, -1.8), carries: 'basket',
        day: [
          { take: 'basket', hold: HOLD.basket },
          { go: [C(50, -1.8)], pace: 1.35 },
          { put: 'basket' },
          { stay: 4, kneel: true, face: C(50, -4) },
          { take: 'basket', hold: HOLD.basket },
          { go: [C(30, -1.8)], pace: 1.35 },
          { put: 'basket' },
          { stay: 3, face: C(30, -4) },
        ] },
      // two children chase each other round and round at the top of the east cross street
      { name: 'child1', kind: 'child', at: C(17.8, 30), face: C(21.2, 34),
        day: loop([C(21.2, 34), C(21.2, 43), C(17.8, 40), C(17.8, 30)], 3.4, 1.2, at('child2')) },
      { name: 'child2', kind: 'child', at: C(21.2, 43), face: C(17.8, 40),
        day: loop([C(17.8, 40), C(17.8, 30), C(21.2, 34), C(21.2, 43)], 3.7) },
      // a child runs up and down the end of the main street by the east wall, and sits a while
      { name: 'child3', kind: 'child', at: C(54, 1.5), face: C(62, -1.5),
        day: [{ go: [C(62, -1.5)], pace: 3 }, { stay: 1.5, face: C(54, 1.5) }, { go: [C(54, 1.5)], pace: 3 }, { stay: 4, sit: true, face: C(62, -1.5) }] },
      // and one plays by himself down the south street
      { name: 'child4', kind: 'child', at: C(-27, -38), face: C(-27, -30),
        day: [{ stay: 6, sit: true, face: C(-27, -30) }, { go: [C(-25.6, -44)], pace: 2.8 }, { stay: 1.5, face: C(-27, -38) }, { go: [C(-27.6, -38)], pace: 2.8 }] },
    ],
    seats: SEATS,
    inSquare,
    home: C(-53, 0),
  };

  const life = createLife(g);
  const gather = createGather(g, {
    life,
    route(x, z, tx, tz) {
      const way = streetWay(inCity(x, z), inCity(tx, tz)).map((p) => C(...p));
      // the first point of the way that is not already where he stands (the last, the place itself, at any rate)
      return way.find(([px, pz]) => Math.hypot(px - x, pz - z) > 1.8) ?? [tx, tz];
    },
  });

  function reset() {
    gather.stop();
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
    for (const p of SPEC.people) if (p.dress) who(p.name).w.dress(CLOTHES[p.dress]);
    gather.begin(SPEC);
    g.standAt(start[0], start[1], yawTo(start, east));
  }

  /** The assembly, as it is when the sun is down: those who came, in their rows; the rest not there. */
  function assembly(seated) {
    for (const p of SPEC.people) who(p.name).show(false);
    for (const { npc, kind, spot } of seated) {
      npc.place(spot.at[0], spot.at[1], yawTo(spot.at, spot.facing)).face(...spot.facing);
      if (kind === 'child') npc.sit = 1;
      else npc.kneel = 1;
    }
    // (you are one of them: on your knees at the end of the front row)
    const mine = C(-56, -4.7);
    g.standAt(mine[0], mine[1], yawTo(mine, C(-26, -4.7)));
    g.player.kneel = 1;
    // seen from before the rows, looking back at them, the gate and the wall behind
    g.view({ from: [...C(-47, -6.5), 2.2], to: [...C(-59, -9.2), 0.7] });
  }

  /** How the run went, in the game's own words (not scripture: a thought, in italic, with no reference). */
  function tally({ gathered, of, time, spare, all }) {
    const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    if (all) return `All ${of} gathered in ${clock(time)}, with ${clock(spare)} of daylight to spare. Can you gather them sooner?`;
    const missed = of - gathered;
    return `${gathered} of ${of} gathered before the sun went down. ${missed === 1 ? 'One was' : `${missed} were`} not there. Can you gather them all?`;
  }

  return [
    {
      id: 'a1',
      label: 'The Trumpet',
      scene: true,
      setup() {
        reset();
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Joel 2', 'Blow the Trumpet in Zion', 'Gather the people', 2.6);
        await c.verse('2:15', '2:16');
        await c.thought('Sound the trumpet in the streets. Whoever hears it leaves what they are doing and follows you: bring them all to the square inside the gate before the sun goes down.');
      },
    },
    {
      id: 'gather',
      label: 'The Trumpet',
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
          c.objective('Sound the trumpet, and bring the people to the square before the sun goes down.', 'Gather the people');
          const got = await gather.run(c);
          c.objective(null);
          if (got.all) g.music.theme?.();
          await c.wait(1.2);
          await c.fade(1, 1.2);
          gather.stop();
          assembly(got.seated);
          await c.fade(0, 1.4);
          await c.verse('2:12');
          await c.verse('2:13');
          const again = await c.choice(tally(got), ['Gather again', 'Go on'], { auto: 1 });
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
