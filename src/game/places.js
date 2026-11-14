// Where everything in 1 Nephi 3–4 happens, in one place so the land, the city and the story agree; and, for the
// journeys told in Babylon, the plain the city stands on there (PLAIN).
// Positions are (u, v): metres down the valley from the camp and metres to the right of that line, as world.js has
// them. fromValley turns them into world (x, z).

/**
 * Which land the page is laid out on: 'hills', the hill country round Jerusalem, or 'plain', the river plain of
 * Babylon. A page plays one journey, so it is chosen once, before anything is made (world.js, setLand).
 */
export let LAND = 'hills';
export function chooseLand(name) {
  LAND = name === 'plain' ? 'plain' : name === 'wild' ? 'wild' : 'hills';
}

/**
 * Where the brothers come up into the land of Jerusalem and consult one with another (1 Nephi 3:10): open ground on
 * the hill across from the city, where the walk to it starts. No tents are pitched there: they are on their way.
 */
export const CAMP = [0, 0];

/** Jerusalem: a walled city on its own rise. Half-sizes in u and v. */
export const CITY = { at: [330, 0], half: [70, 55], wall: 9, thick: 3 };

/** The gate in the city's west wall, facing the camp. */
export const GATE = [CITY.at[0] - CITY.half[0], 0];

/** The land of their inheritance, outside the city: Lehi's house (3:22). */
export const LEHI_HOUSE = [150, -250];

/** The cavity of a rock where the brothers hide (3:27). */
export const ROCK = [125, 205];

/**
 * That cavity: a hollow under great stones, on the hillside, its mouth towards the city (+u, down the hill). The
 * middle of its floor and its mouth, (u, v); how far from the middle the floor is made level, and where the hill is
 * itself again; and how high the rock is overhead, metres from the floor.
 */
export const CAVE = { at: [ROCK[0] - 1, ROCK[1]], mouth: [ROCK[0] + 4.5, ROCK[1]], floor: 5.5, ease: 12, roof: 2.6 };

/**
 * The valley of Lemuel, where their father dwelt in a tent (2:6–15): "he pitched his tent in a valley by the side of
 * a river of water". It was three days in the wilderness from Jerusalem and is nowhere near it; in this land it lies
 * in the hollow behind the camp's hill, out of sight of the city, and runs across the valley's line (along v).
 */
export const LEMUEL = {
  /** The middle of the camp, before Lehi's tent. */
  at: [-350, 0],
  /** How far its level floor reaches along it, either way, before it runs out into the hills. */
  reach: 150,
  /** The river (2:8): how far towards the camp's hill (+u) of the tents it runs, its half-width, how deep its bed is cut, and how far below the floor its water lies. */
  river: { off: 15, half: 2.6, deep: 0.85, water: 0.34 },
};
/** Where the river of the valley of Lemuel runs: its middle's u, at v. It wanders a little. */
export function lemuelRiver(v) {
  const dv = v - LEMUEL.at[1];
  return LEMUEL.at[0] + LEMUEL.river.off + 4.5 * Math.sin(dv / 27 + 0.6) + 1.6 * Math.sin(dv / 11 + 2);
}

/** Inside the city, in metres from its middle (cu, cv): */
export const IN_CITY = {
  /** Laban's house: a big house with a walled court. [cu0, cv0, cu1, cv1] */
  laban: [30, 16, 58, 46],
  /** Its court, west of the house, with a gate onto the street at cu = 22. */
  court: [22, 20, 30, 42],
  /** The treasury: a stone storehouse beside the main street. */
  treasury: [36, -24, 56, -8],
  /** Where Laban lies in the street, near his house (4:7). */
  fallen: [19.4, 26.5],
  /** The treasury's door (on its north face, onto the main street). */
  treasuryDoor: [46, -7.5],
  /** The table at the back of the treasury where the plates are kept, and how high its top is. */
  table: [46, -22.15],
  tableTop: 0.95,
};

/** City-local (cu, cv) to (u, v). */
export const cityUV = (cu, cv) => [CITY.at[0] + cu, CITY.at[1] + cv];

/** Footpaths worn to earth, as lines of (u, v) points. */
export const PATHS = [
  // the camp to the gate
  [[6, 4], [60, 10], [120, 4], [180, -6], [225, -2], [GATE[0] - 2, 0]],
  // the land of inheritance to the road
  [[LEHI_HOUSE[0], LEHI_HOUSE[1] + 11], [LEHI_HOUSE[0] + 6, LEHI_HOUSE[1] + 30], [175, -190], [190, -110], [205, -40], [225, -2]],
  // a track off towards the rocks
  [[150, 4], [140, 80], [130, 150], [ROCK[0] + 6, ROCK[1] - 14]],
  // and in at the mouth of the rock, to the middle of its floor (it wanders, as they all do: this one is short)
  [[ROCK[0] + 6, ROCK[1] - 14], [ROCK[0] + 12, ROCK[1] - 4], [CAVE.mouth[0] + 3, CAVE.mouth[1]], CAVE.at],
];

/** 0 outside the city walls, 1 inside (soft at the wall's foot), for (u, v). */
export function insideCity(u, v, margin = 0) {
  const du = Math.abs(u - CITY.at[0]) - (CITY.half[0] + margin);
  const dv = Math.abs(v - CITY.at[1]) - (CITY.half[1] + margin);
  return Math.max(du, dv) < 0 ? 1 : 0;
}

/** How far outside the city's walled rectangle (u, v) is, metres (negative inside). */
export function cityDistance(u, v) {
  const du = Math.abs(u - CITY.at[0]) - CITY.half[0];
  const dv = Math.abs(v - CITY.at[1]) - CITY.half[1];
  const ou = Math.max(du, 0);
  const ov = Math.max(dv, 0);
  return Math.hypot(ou, ov) + Math.min(Math.max(du, dv), 0);
}

/** Places nothing should be planted on: [u, v, radius]. */
export const KEEP_CLEAR = [
  [CAMP[0] + 4, CAMP[1] + 6, 22],
  [LEHI_HOUSE[0], LEHI_HOUSE[1], 30],
  [ROCK[0], ROCK[1], 16],
  [GATE[0] - 18, 0, 26],
  // the valley of Lemuel: the tents, and the way down the valley from them
  [LEMUEL.at[0], LEMUEL.at[1], 44],
  [LEMUEL.at[0] + 4, LEMUEL.at[1] - 52, 34],
];

/** Whether a tree, bush or stone at (u, v) would stand somewhere the story needs open: the city and the places. */
export function keepClear(u, v, margin = 0) {
  // (the wilderness has no city in it)
  if (LAND !== 'wild' && cityDistance(u, v) < 14 + margin) return true;
  for (const [cu, cv, r] of LAND === 'plain' ? PLAIN.keep : LAND === 'wild' ? WILD.keep : KEEP_CLEAR) if (Math.hypot(u - cu, v - cv) < r + margin) return true;
  return false;
}

/**
 * The wilderness of 1 Nephi 16, for the journey of the ball and the broken bow (setLand('wild')): the hill country's
 * ground and paint with no city on it. The valley of Lemuel keeps its place (LEMUEL), for the morning the ball is
 * found; over the hill from it the land falls to a green wadi ("the more fertile parts of the wilderness", 16:16),
 * and beyond the wadi stands the mountain (16:30). All in (u, v).
 */
export const WILD = {
  /** Where they pitch their tents "for the space of a time" (16:17): a level place on the slope, facing the mountain. */
  camp: { at: [96, -18], floor: 26, ease: 60 },
  /**
   * The mountain: its middle; how high it stands above the land it is on; how far from its middle its top is nearly
   * level (where the beasts are); and how far out its foot is.
   */
  mountain: { at: [372, 16], high: 92, top: 38, foot: 232 },
  /** The way up it, from the wadi to the top: a trail cut into its flank, in switchbacks on the side the camp sees. */
  trail: [[176, -8], [232, -58], [262, 22], [300, -46], [318, 30], [346, -8], [364, 12]],
  /**
   * Ways that leave the trail where it turns, and lead nowhere: each goes on round the flank a little and is lost.
   * Nothing on the land says which is the trail: the ball does (16:30, "according to the directions which were given
   * upon the ball").
   */
  spurs: [
    [[262, 22], [271, 47], [268, 74]],
    [[300, -46], [307, -71], [301, -96]],
    [[318, 30], [327, 53], [323, 77]],
  ],
  /** How far either side of the trail's middle the flank is cut level for it, and where the flank is itself again. */
  trailHalf: 3.1,
  trailEase: 9.5,
  /**
   * The fertile parts: green ground along a line, wandering. The first is the way they come by, hunting as they go
   * (16:15–16); the second is the wadi at the mountain's foot. [points, half-width]
   */
  green: [
    [[[58, -306], [112, -262], [158, -214], [192, -160], [200, -100], [188, -52], [176, -8], [182, 50], [170, 104], [150, 150]], 20],
    [[[96, -18], [140, -22], [176, -8]], 7],
  ],
  /** Where the beasts graze: by the way they come (16:15), where the bow breaks (16:18), and on the mountain's top. */
  grounds: { way: [186, -168], north: [168, 118], top: [372, 16] },
  /** Where the wood is, near the camp: the trees a bow is made from (16:23). */
  wood: [132, 46],
  /** Footpaths worn to earth: from the camp down to the wadi; the trail is one too. */
  paths: [[[104, -17], [140, -22], [176, -8]]],
  /** Places nothing should be planted on: [u, v, radius]. */
  keep: [
    [96, -18, 30],
    [372, 16, 30],
    // (the valley of Lemuel, as in the hill country)
    [LEMUEL.at[0], LEMUEL.at[1], 44],
    [LEMUEL.at[0] + 4, LEMUEL.at[1] - 52, 34],
    [LEMUEL.at[0] + 34, LEMUEL.at[1] - 40, 30],
  ],
};

/**
 * The plain of Babylon, for the journeys told there. The city keeps the same place (CITY), its gate in the west
 * wall; the Euphrates runs past it on its right hand (+v), and the plain of Dura lies before the gate.
 */
export const PLAIN = {
  /** The river: its middle (see riverMiddle), its half-width, and the level of its water, metres. */
  river: { v: 135, half: 36, level: -1.25 },
  /** Canals that water the fields, each a line of (u, v) points; how wide they are to either side of it. */
  canals: [
    [[-760, -210], [760, -210]],
    [[-150, 112], [-150, -210]],
  ],
  canalHalf: 2.2,
  /** The road out of the gate, a little raised above the plain, to where the image of gold is set up. */
  road: [[GATE[0] + 4, 0], [GATE[0] - 60, 0], [150, 0]],
  /** How far either side of the road's middle is trodden bare, metres. */
  roadHalf: 6,
  /** The plain of Dura (Daniel 3:1): the open ground before the gate, its middle and how far it reaches. */
  dura: [170, 0, 62],
  /** The level the plain of Dura, the road and the city are made to, metres: a little above the plain round them. */
  level: 0.75,
  /** On it: the image of gold, which looks towards the city (+u). */
  image: [128, 0],
  /** The king's seat: a low dais, its middle and half-sizes and how high it is; he sits facing +v. */
  seat: { at: [190, -26], half: [5, 3.5], rise: 0.6 },
  /** The burning fiery furnace: a kiln of brick, its middle and half-sizes; its door is on its -v face, towards him. */
  kiln: { at: [192, 32], half: [8, 7] },
  /** Places nothing should be planted on: [u, v, radius]. */
  keep: [
    [170, 0, 80],
    [GATE[0] - 30, 0, 26],
  ],
};

/** The middle of the river, metres to the right of the valley's line at u: it bends a little, slowly. */
export function riverMiddle(u) {
  return PLAIN.river.v + 20 * Math.sin(u / 600 + 0.4) + 7 * Math.sin(u / 230 + 1.3);
}

/**
 * The rock the brothers hide in (3:27): great stones close round a hollow, shut at the back and the sides, with a
 * narrow mouth on the side towards the city and a slab of rock lying over all of it.
 * [du, dv, size, tall, { turn, kind, lean, lift }] from ROCK: `turn` (radians), `kind` (0 to 2, which of the three
 * shapes of stone) and `lean` choose the stone, so that it is the same each time; one with `lift` does not stand on
 * the ground but lies that many metres above the cave's floor, on the others, and stops no one.
 */
export const ROCK_STONES = [
  // the back, up the hill
  [-8.4, 0.4, 4.4, 1.25, { turn: 0.4, kind: 0, lean: 0.04 }],
  [-5.8, -5.6, 4.0, 1.2, { turn: 2.1, kind: 1, lean: -0.05 }],
  [-5.8, 5.8, 4.0, 1.2, { turn: 3.7, kind: 2, lean: 0.05 }],
  // the sides
  [-0.4, -6.9, 3.8, 1.2, { turn: 5.2, kind: 0, lean: 0.03 }],
  [-0.2, 7.0, 3.8, 1.2, { turn: 1.3, kind: 1, lean: -0.03 }],
  // either side of the mouth
  [4.4, -5.0, 3.0, 1.25, { turn: 4.4, kind: 2, lean: 0.06 }],
  [4.4, 5.2, 3.0, 1.25, { turn: 0.9, kind: 0, lean: -0.06 }],
  // the rock overhead
  [-2.2, 0.2, 8.2, 0.34, { turn: 2.6, kind: 1, lean: 0.02, lift: CAVE.roof }],
  // fallen from it, before the mouth and behind
  [8.6, -8.4, 1.9, 0.8, { turn: 3.1, kind: 1, lean: 0.1 }],
  [-11.5, -5.5, 2.6, 0.85, { turn: 5.9, kind: 2, lean: -0.08 }],
];
