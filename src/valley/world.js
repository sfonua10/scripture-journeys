// The hill country round Jerusalem: you start at the brothers' camp on the shoulder of a hill beside one great tree,
// the land falls away ahead and rises again to the city on its own hill, dry hills close it in on both sides and
// behind, and far off are mountains. Plain functions of (x, z), read once by the field and by the far land.
// (Remixed from Painted Valley's summer valley: the tarn is gone, the city's rise is new; see src/game/places.js.)
//
// Or, for the journeys told in Babylon, the river plain there (setLand('plain')): level silt with no hill anywhere,
// the Euphrates going by the city, canals off it and fields along them. The same functions answer for either.
import { CAVE, chooseLand, CITY, cityDistance, LAND, LEHI_HOUSE, LEMUEL, lemuelRiver, PATHS, PLAIN, riverMiddle, WILD } from '../game/places.js';

export { LAND };

/**
 * Lays the page out on a land: 'hills' (Jerusalem's, the first journey's) or 'plain' (Babylon's). Called once, as
 * soon as the journey is known and before anything reads the ground, here and in the worker that bakes it.
 */
export function setLand(name) {
  chooseLand(name);
  cityLevel = null;
  lehiLevel = null;
  caveLevel = null;
  lemuelLevel = null;
  campLevel = null;
  trailLevels = null;
}

/** The way the valley runs from the start, a unit vector (x, z). */
export const HERO = [0.6, 0.8];
const [DX, DZ] = HERO;

/** Where you start, the great tree, and the tarn: [x, z]. */
export const START = [0, 0];
export const TREE = fromValley(9, -13);
/** Where the village stands, (u, v): near enough to be seen as a village, on a rise of its own. */
export const VILLAGE = [740, -210];
// (there is no tarn in these hills: it is put far out of the world, so everything that asks how near it is hears
// "far")
export const TARN = { at: fromValley(9000, 9000), rx: 46, rz: 27, level: 0 };

/** (metres down the valley, metres to the right of it) to (x, z). */
export function fromValley(u, v) {
  return [u * DX - v * DZ, u * DZ + v * DX];
}

/** (x, z) to (metres down the valley, metres to the right of it). */
export function toValley(x, z) {
  return [x * DX + z * DZ, -x * DZ + z * DX];
}

function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function vnoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uz = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
  const a = hash(ix, iz, seed);
  const b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed);
  const d = hash(ix + 1, iz + 1, seed);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/** 0 to 1, mostly near 0.5. */
export function fbm(x, z, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * vnoise(x, z, seed + o * 17);
    norm += amp;
    amp *= 0.5;
    x = x * 2.03 + 11.7;
    z = z * 2.03 - 5.3;
  }
  return sum / norm;
}

/** Sharp crests and broad flanks, 0 to 1: mountains. */
function ridged(x, z, octaves, seed) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = 1 - Math.abs(2 * vnoise(x, z, seed + o * 13) - 1);
    sum += amp * n * n;
    norm += amp;
    amp *= 0.42;
    x = x * 2.07 + 3.1;
    z = z * 2.07 - 8.9;
  }
  return sum / norm;
}

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * 0 in the middle of the tarn, 1 at its shore, more outside. On the plain it is the river and the canals that answer:
 * 1 a little way up the bank from the water, so that what keeps you from wading stops you on the bank.
 */
export function tarnDistance(x, z) {
  if (LAND === 'plain') {
    const u = x * DX + z * DZ;
    const v = -x * DZ + z * DX;
    let t = Math.abs(v - riverMiddle(u)) / ((PLAIN.river.half + 2) / 0.88);
    for (const line of PLAIN.canals) t = Math.min(t, lineDistance(u, v, line) / ((PLAIN.canalHalf + 1.2) / 0.88));
    return t;
  }
  const dx = x - TARN.at[0];
  const dz = z - TARN.at[1];
  // its long side lies across the valley, and its shore wanders
  const u = dx * DX + dz * DZ;
  const v = -dx * DZ + dz * DX;
  const wobble = 1 + 0.16 * Math.sin(Math.atan2(u, v) * 3 + 0.7) + 0.09 * Math.sin(Math.atan2(u, v) * 7 + 2.1);
  return Math.hypot(v / TARN.rx, u / TARN.rz) / wobble;
}

/** Where the river runs: metres to the right of the valley's line, at u metres down it. */
function riverLine(u) {
  return 60 + 330 * Math.sin(u / 520 + 0.6) + 80 * Math.sin(u / 170 + 2) + 900 * Math.exp(-Math.max(u, -400) / 350);
}

/** How far (x, z) is from the middle of the river, metres. */
export function riverDistance(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  // (the Euphrates bends so gently that across it is as good as the way to it)
  if (LAND === 'plain') return Math.abs(v - riverMiddle(u));
  const slope = (330 / 520) * Math.cos(u / 520 + 0.6) + (80 / 170) * Math.cos(u / 170 + 2) - (u > -400 ? (900 / 350) * Math.exp(-u / 350) : 0);
  return Math.abs(v - riverLine(u)) / Math.sqrt(1 + slope * slope);
}

/** 0 to 1: how much of the far land at (x, z) is ploughed and hedged, the fields round the hamlet. */
export function fieldsAt(x, z) {
  // (no ploughland on the river plain's far side, and none in the wilderness)
  if (LAND !== 'hills') return 0;
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  const d = Math.hypot((u - 1350) / 1000, (v + 60) / 820) + (fbm(x / 600 + 4, z / 600 + 8, 2, 83) - 0.5) * 0.4;
  // (it begins a little way past where the walk ends)
  return (1 - smooth(0.8, 1.0, d)) * smooth(545, 640, Math.hypot(x, z));
}

/** 0 to 1: forest on the far land at (x, z). None near the walk, none on the fields or the river's banks. */
export function forestAt(x, z) {
  // (no woods on the river plain: its trees are palms, set out by hand)
  if (LAND === 'plain') return 0;
  const r = Math.hypot(x, z);
  let f = smooth(0.44, 0.52, fbm(x / 1700 + 7.3, z / 1700 + 3.1, 4, 91) * 0.72 + fbm(x / 430 + 1.7, z / 430 + 5.9, 3, 97) * 0.28);
  // the hills carry more of it than the plain
  f = Math.max(f, smooth(55, 120, land(x, z)) * smooth(0.36, 0.5, fbm(x / 900 + 2.2, z / 900 + 6.1, 3, 101)));
  f *= smooth(820, 1500, r) * smooth(30, 170, riverDistance(x, z)) * (1 - fieldsAt(x, z));
  // (the hill country is open: woods only in the folds of the hills)
  f *= 0.55 * smooth(0.5, 0.7, fbm(x / 1100 + 9.1, z / 1100 + 1.7, 2, 107));
  // (and the wilderness barer still)
  if (LAND === 'wild') f *= 0.3;
  return f;
}

/** The level the city is built at, and how it rises towards its east end, set once from the land under it. */
let cityLevel = null;
/** The level Lehi's house and court are built at. */
let lehiLevel = null;
/** The level of the floor of the cavity of the rock. */
let caveLevel = null;
/** The level of the floor of the valley of Lemuel. */
let lemuelLevel = null;

/** The level of the floor of the valley of Lemuel, metres: its river's water lies LEMUEL.river.water below it. */
export function lemuelFloor() {
  lemuelLevel ??= wildLand(...fromValley(LEMUEL.at[0], LEMUEL.at[1]));
  return lemuelLevel;
}

/** How much of the river of the valley of Lemuel there is at v, 1 to 0: it runs out before the valley does. */
const lemuelRuns = (v) => 1 - smooth(LEMUEL.reach - 45, LEMUEL.reach - 5, Math.abs(v - LEMUEL.at[1]));

/**
 * The valley of Lemuel: a level floor between two dry ridges, with the bed of its river cut along it. `h` is the
 * wild land there; `across` is how far up the valley's line (+u) of its middle, `along` how far along it.
 */
function lemuelLand(h, x, z, u, v, across, along) {
  const there = 1 - smooth(LEMUEL.reach, LEMUEL.reach + 90, along);
  const wide = Math.abs(across);
  h += (lemuelFloor() - h) * there * (1 - smooth(26, 84, wide));
  // (the ridges are rough, and stand clear of the floor, which stays level)
  const rough = 0.7 + 0.6 * fbm(x / 60 + 3.3, z / 60 + 7.7, 2, 71);
  h += there * rough * smooth(30, 62, wide) * (17 * Math.exp(-(((across - 112) / 50) ** 2)) + 14 * Math.exp(-(((across + 104) / 46) ** 2)));
  const { half, deep } = LEMUEL.river;
  h -= deep * lemuelRuns(v) * (1 - smooth(half * 0.45, half * 1.4, Math.abs(u - lemuelRiver(v))));
  return h;
}

function land(x, z) {
  const h = wildLand(x, z);
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  // the valley of Lemuel, behind the camp's hill
  const across = u - LEMUEL.at[0];
  const along = Math.abs(v - LEMUEL.at[1]);
  if (along < LEMUEL.reach + 90 && Math.abs(across) < 230) return lemuelLand(h, x, z, u, v, across, along);
  // the wilderness: no city, no house, no rock; a camp, and the mountain
  if (LAND === 'wild') return wilderness(h, x, z, u, v);
  // inside the walls the ground is made level for building, and it eases back into the hill outside them
  const d = cityDistance(u, v);
  if (d <= 40) {
    cityLevel ??= wildLand(...fromValley(CITY.at[0], CITY.at[1]));
    const level = cityLevel + (u - CITY.at[0]) * 0.03;
    return h + (level - h) * (1 - smooth(4, 40, d));
  }
  // the cavity of the rock: its floor is level, let into the hillside, which stands as a bank behind it
  const cave = Math.hypot(u - CAVE.at[0], v - CAVE.at[1]);
  if (cave < CAVE.ease) {
    caveLevel ??= wildLand(...fromValley(CAVE.at[0], CAVE.at[1]));
    return h + (caveLevel - h) * (1 - smooth(CAVE.floor, CAVE.ease, cave));
  }
  // Lehi's house and its court stand on made ground too, so its door is at the ground and not sunk in the slope
  const lu = Math.max(Math.abs(u - LEHI_HOUSE[0]) - 11, 0);
  const lv = Math.max(Math.abs(v - (LEHI_HOUSE[1] - 1)) - 13, 0);
  const l = Math.hypot(lu, lv);
  if (l > 28) return h;
  lehiLevel ??= wildLand(...fromValley(LEHI_HOUSE[0], LEHI_HOUSE[1]));
  return h + (lehiLevel - h) * (1 - smooth(0, 28, l));
}

/** The level of the camp in the wilderness (WILD.camp), and of each point of the trail up the mountain. */
let campLevel = null;
let trailLevels = null;

/** The mountain alone: how high it stands at (u, v) above the land it is on, with its crags. */
function mountainAt(x, z, u, v) {
  const { at, high, top, foot } = WILD.mountain;
  const d0 = Math.hypot(u - at[0], v - at[1]);
  if (d0 > foot * 1.3) return 0;
  // (its outline is not a circle: spurs and coves)
  const d = d0 * (1 + 0.36 * (fbm(x / 150 + 6.1, z / 150 + 2.3, 2, 201) - 0.5));
  if (d >= foot) return 0;
  // a top that is nearly level, and a flank that steepens and then eases to its foot
  const dome = 5;
  const p = d < top ? high - dome * (d / top) ** 2 : (high - dome) * (0.5 + 0.5 * Math.cos((Math.PI * (d - top)) / (foot - top)));
  // crags on its flank: none on its top, where the beasts are, nor at its foot
  const k = p / high;
  const flank = smooth(0.06, 0.35, k) * (1 - smooth(0.78, 0.95, k));
  return p + flank * ((ridged(x / 44 + 1.9, z / 44 + 7.3, 3, 211) - 0.3) * 6.5 + (fbm(x / 13 + 2.2, z / 13 + 5.1, 2, 213) - 0.5) * 1.6);
}

/** The wilderness of 1 Nephi 16 (places.js, WILD): `h` is the wild land at (x, z). */
function wilderness(h, x, z, u, v) {
  h += mountainAt(x, z, u, v);
  // the camp: a level place on the slope, eased back into it
  const { at, floor, ease } = WILD.camp;
  const c = Math.hypot(u - at[0], v - at[1]);
  if (c < ease) {
    campLevel ??= wildLand(...fromValley(at[0], at[1]));
    return h + (campLevel - h) * (1 - smooth(floor, ease, c));
  }
  // the trail up the mountain: cut into the flank, level across, rising evenly from point to point
  const m = Math.hypot(u - WILD.mountain.at[0], v - WILD.mountain.at[1]);
  if (m < WILD.mountain.foot + 30) {
    // (and the ways that leave it, cut the same: each line's own levels, taken from the flank as it was)
    const lines = [WILD.trail, ...WILD.spurs];
    trailLevels ??= lines.map((line) =>
      line.map(([tu, tv]) => {
        const [tx, tz] = fromValley(tu, tv);
        return wildLand(tx, tz) + mountainAt(tx, tz, tu, tv);
      }),
    );
    // (its level at a place is that of the way nearest it; where two legs of it lie near each other, at a turn, between
    // the two: so that the inside of a turn is a slope from the lower leg to the upper, and not a wall)
    let best = 1e9;
    let sum = 0;
    let weight = 0;
    lines.forEach((line, n) => {
      for (let i = 0; i + 1 < line.length; i++) {
        const [au, av] = line[i];
        const [bu, bv] = line[i + 1];
        const du = bu - au;
        const dv = bv - av;
        const t = Math.min(1, Math.max(0, ((u - au) * du + (v - av) * dv) / (du * du + dv * dv)));
        const d = Math.hypot(u - au - du * t, v - av - dv * t);
        if (d > 40) continue;
        const w = 1 / (d * d * d * d + 1);
        sum += w * (trailLevels[n][i] + (trailLevels[n][i + 1] - trailLevels[n][i]) * t);
        weight += w;
        best = Math.min(best, d);
      }
    });
    const level = weight ? sum / weight : 0;
    if (best < WILD.trailEase) h += (level - h) * (1 - smooth(WILD.trailHalf, WILD.trailEase, best));
  }
  return h;
}

function wildLand(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  const r = Math.hypot(x, z);
  // rolling ground, calmer where you start so the crest is one clean line against the sky
  let h = (fbm(x / 260 + 3.1, z / 260 - 1.7, 4, 1) - 0.5) * 20 * (0.25 + 0.75 * smooth(60, 420, r));
  h += (fbm(x / 70 + 9.3, z / 70 + 4.1, 3, 5) - 0.5) * 3.0;
  // rises and hollows a stone's throw across, so the meadow is a land of its own and not one sheet (they die away
  // on the far plain, which is too coarsely made to carry them)
  let roll = (fbm(x / 120 + 1.7, z / 120 + 6.3, 2, 13) - 0.5) * 24 * smooth(14, 90, r) * (1 - smooth(900, 1800, r));
  roll += (fbm(x / 48 + 8.1, z / 48 + 2.9, 2, 17) - 0.5) * 5.5 * smooth(10, 50, r) * (1 - smooth(500, 900, r));
  // (down the middle of the view from the start they may dip but not rise: the valley is what is to be seen, and the
  // rises stand to either side of it)
  if (roll > 0) roll *= 1 - 0.9 * Math.exp(-((v / 95) ** 2)) * smooth(0, 40, u) * (1 - smooth(300, 460, u));
  h += roll;
  // the hill you start on, a long shoulder
  h += 54 * Math.exp(-((u + 30) ** 2) / (2 * 185 ** 2) - (v * v) / (2 * 330 ** 2));
  // Jerusalem's hill (in the wilderness there is none: the mountain is added to the land there, see wilderness)
  if (LAND !== 'wild') h += 24 * Math.exp(-((u - CITY.at[0]) ** 2 + (v - CITY.at[1]) ** 2) / (2 * 120 ** 2));
  // a dip between the camp's hill and the city's, so the city stands up across it
  // (in the wilderness it is the wadi at the mountain's foot)
  h -= 7 * Math.exp(-((u - 190) ** 2) / (2 * 60 ** 2) - (v * v) / (2 * 260 ** 2));
  // the land of inheritance: a gentle shelf
  if (LAND !== 'wild') h -= 6 * Math.exp(-((u - LEHI_HOUSE[0]) ** 2 + (v - LEHI_HOUSE[1]) ** 2) / (2 * 70 ** 2));
  // wooded hills to either side, and behind
  const side = Math.abs(v) + 160 * (fbm(u / 520 + 5, v / 520, 2, 31) - 0.5);
  h += 120 * smooth(430, 1500, side) * (0.6 + 0.8 * fbm(x / 800 + 2, z / 800 + 9, 3, 37));
  h += 95 * smooth(260, 1200, -u);
  // a river crosses the plain to the right of the walk: the land lies down to it
  const river = riverDistance(x, z);
  if (river < 420) {
    const level = -9 - u * 0.0035;
    // (only across low ground: where its line meets the hills it is lost behind them, not cut through them)
    h += (level - h) * Math.exp(-(river * river) / (2 * 150 * 150)) * (1 - smooth(22, 60, h));
  }
  return h;
}

const tarnFloor = land(TARN.at[0], TARN.at[1]);
TARN.level = tarnFloor - 0.55;

/**
 * The plain of Babylon: silt laid down by the river, level to within a stride, so that nothing stands on the
 * horizon but what was built or planted. The city's ground is made level; the road out of its gate is raised a
 * little; the river has a low bank of its own and its bed is below the water; the canals are cut narrow and full.
 */
function plainLand(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  // (rises and hollows too low to be seen as such, enough to catch the light)
  let h = (fbm(x / 190 + 3.1, z / 190 - 1.7, 3, 1) - 0.5) * 1.1 + (fbm(x / 47 + 9.3, z / 47 + 4.1, 2, 5) - 0.5) * 0.3;
  // the city's ground, the road out of its gate and the plain of Dura before it, all made level, and the king's
  // dais standing up out of it
  const made = PLAIN.level;
  const d = cityDistance(u, v);
  if (d <= 30) h += (made - h) * (1 - smooth(4, 30, d));
  h += (made - h) * (1 - smooth(PLAIN.roadHalf + 7, PLAIN.roadHalf + 11, lineDistance(u, v, PLAIN.road)));
  const [du, dv, dr] = PLAIN.dura;
  h += (made - h) * (1 - smooth(dr * 0.85, dr * 1.2, Math.hypot(u - du, v - dv)));
  const { at: [su, sv], half: [shu, shv], rise } = PLAIN.seat;
  h += rise * (1 - smooth(-0.6, 0.6, Math.max(Math.abs(u - su) - shu, Math.abs(v - sv) - shv)));
  const { half, level } = PLAIN.river;
  const r = Math.abs(v - riverMiddle(u));
  h += 0.5 * Math.exp(-(((r - half - 12) / 7) ** 2));
  const bed = level - 0.5 - 2.6 * (1 - smooth(0, half, r));
  h = bed + (h - bed) * smooth(half - 2, half + 7, r);
  for (const line of PLAIN.canals) {
    const c = lineDistance(u, v, line);
    if (c > PLAIN.canalHalf + 3) continue;
    const floor = level - 0.7;
    h = floor + (h - floor) * smooth(PLAIN.canalHalf - 0.8, PLAIN.canalHalf + 1.5, c);
  }
  return h;
}

export function heightAt(x, z) {
  if (LAND === 'plain') return plainLand(x, z);
  let h = land(x, z);
  const t = tarnDistance(x, z);
  if (t < 2.2) {
    // level ground round the water, a bank, and a bed that deepens to the middle
    const flat = 1 - smooth(1.25, 2.2, t);
    h += (tarnFloor - h) * flat;
    h -= 2.4 * (1 - smooth(0.25, 1.06, t));
  }
  return h;
}

/** How far (x, z) is from the middle of the nearest footpath, metres. */
/** Distance from (u, v) to a line of points, and how far along it that nearest point is, metres. */
function lineDistance(u, v, line) {
  let best = 1e9;
  for (let i = 0; i + 1 < line.length; i++) {
    const [au, av] = line[i];
    const [bu, bv] = line[i + 1];
    const du = bu - au;
    const dv = bv - av;
    const t = Math.min(1, Math.max(0, ((u - au) * du + (v - av) * dv) / (du * du + dv * dv)));
    best = Math.min(best, Math.hypot(u - au - du * t, v - av - dv * t));
  }
  return best;
}

/** How far (x, z) is from the middle of the nearest footpath, metres. */
export function pathDistance(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  // (on the plain, the one road out of the gate: straight, and broad)
  if (LAND === 'plain') return Math.max(0, lineDistance(u, v, PLAIN.road) - PLAIN.roadHalf);
  // (in the wilderness: the way down from the camp, and the trail up the mountain, which keeps to where it was cut)
  if (LAND === 'wild') {
    let best = lineDistance(u, v, WILD.trail);
    for (const line of WILD.paths) best = Math.min(best, lineDistance(u, v, line));
    // (the ways that leave the trail are worn as it is, and are lost towards their ends)
    for (const line of WILD.spurs) {
      const end = line[line.length - 1];
      best = Math.min(best, lineDistance(u, v, line) + 2.4 * (1 - smooth(4, 26, Math.hypot(u - end[0], v - end[1]))));
    }
    return Math.max(0, best - 0.7);
  }
  // (each path wanders a little off its straight lines)
  const wander = 2.2 * Math.sin(u / 23 + v / 31) + 1.4 * Math.sin(u / 9.7 - v / 13);
  let best = 1e3;
  for (const line of PATHS) best = Math.min(best, lineDistance(u + wander * 0.3, v + wander, line));
  return Math.max(0, best - 0.6);
}

function hash1(i, salt) {
  return hash(i, salt, 911);
}

/**
 * The field at (u, v) on the plain, if any: the land along each canal is laid out in long strips running back from
 * it, each sown or left as its owner has it. 0: no field; 1: barley, green; 2: stubble; 3: fallow, bare. `edge` is
 * how far it is to the strip's side, metres.
 */
const STRIP = { kind: 0, edge: 0 };
export function plainField(u, v) {
  STRIP.kind = 0;
  STRIP.edge = 0;
  const [a, b] = PLAIN.canals;
  // along the first canal (it runs down the valley): strips across it, 28 m wide, reaching back from it
  {
    const at = a[0][1];
    const i = Math.floor((u + 7) / 28);
    const reach = 110 + 100 * hash1(i, 1);
    const off = v - at;
    // (none on the near side within reach of the plain of Dura)
    if (Math.abs(off) < reach && Math.abs(off) > PLAIN.canalHalf + 3 && (off < 0 || v < -100)) {
      STRIP.kind = 1 + Math.floor(hash1(i * 2 + (off < 0 ? 1 : 0), 2) * 2.999);
      STRIP.edge = Math.min(u + 7 - i * 28, (i + 1) * 28 - u - 7);
      return STRIP;
    }
  }
  // along the second (it runs across, from the river): strips down the valley, either side of it
  {
    const at = b[0][0];
    const j = Math.floor((v + 11) / 26);
    const reach = 100 + 120 * hash1(j + 50, 3);
    const off = u - at;
    if (Math.abs(off) < reach && Math.abs(off) > PLAIN.canalHalf + 3 && v < b[0][1] - 6 && v > a[0][1] && u < 70) {
      STRIP.kind = 1 + Math.floor(hash1(j * 2 + (off < 0 ? 1 : 0) + 100, 4) * 2.999);
      STRIP.edge = Math.min(v + 11 - j * 26, (j + 1) * 26 - v - 11);
    }
  }
  return STRIP;
}

/** What grows on the plain: thin dry grass on dusty silt, the fields along the canals, rank green by the water. */
function plainPaint(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  const clumps = fbm(x / 9 + 1.3, z / 9 - 4.1, 3, 41) * 0.6 + fbm(x / 70 - 3.3, z / 70 + 2.7, 2, 43) * 0.4;
  let growth = 0.16 + 0.72 * smooth(0.38, 0.64, clumps);
  let dry = 0.84 + 0.16 * smooth(0.4, 0.66, fbm(x / 90 + 2.2, z / 90 + 8.1, 3, 21));
  let wet = 0;
  const f = plainField(u, v);
  if (f.kind) {
    // (between strips, a low bank with weeds on it)
    const bund = 1 - smooth(0.4, 1.3, f.edge);
    if (f.kind === 1) {
      growth = Math.max(bund * 0.6, 0.94 + 0.06 * clumps);
      dry = 0.08 + 0.1 * clumps;
      wet = 0.55;
    } else if (f.kind === 2) {
      growth = 0.55 + 0.3 * clumps;
      dry = 1;
      wet = 0.12;
    } else {
      // (ploughed and left: dark, damp silt)
      growth = bund * 0.5;
      wet = 0.8;
    }
  }
  // the river's bank and the canals' sides: reeds and rank green down to the water
  const water = tarnDistance(x, z);
  const rank = 1 - smooth(1.0, 1.35, water);
  growth = Math.max(growth, rank * (0.8 + 0.2 * clumps));
  dry *= 1 - 0.85 * rank;
  wet = Math.max(wet, rank * 0.7);
  // trodden bare: the road, round the city's walls, and the plain of Dura where the people stand
  growth = Math.min(growth, smooth(0, 3, pathDistance(x, z) + (fbm(x / 2.7, z / 2.7, 2, 61) - 0.5) * 1.2));
  growth *= smooth(-2, 12, cityDistance(u, v));
  const [du, dv, dr] = PLAIN.dura;
  growth *= smooth(dr * 0.75, dr * 1.05, Math.hypot(u - du, v - dv) + (fbm(x / 9, z / 9, 2, 63) - 0.5) * 14);
  return { dry: dry * (1 - wet), growth, wet, flowers: 0 };
}

/** How green the wilderness is at (u, v), 0 to 1: its fertile parts (WILD.green), ragged at their edges. */
export function fertileAt(x, z) {
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  const ragged = (fbm(x / 17 + 4.4, z / 17 + 1.2, 2, 221) - 0.5) * 16;
  let best = 0;
  for (const [line, half] of WILD.green) best = Math.max(best, 1 - smooth(half * 0.55, half * 1.25, lineDistance(u, v, line) + ragged));
  // (and a little on the mountain's top, where the beasts are)
  const top = Math.hypot(u - WILD.mountain.at[0], v - WILD.mountain.at[1]);
  best = Math.max(best, 0.7 * (1 - smooth(WILD.mountain.top * 0.5, WILD.mountain.top * 1.1, top + ragged)));
  return best;
}

/**
 * What grows in the wilderness: little. Stony earth with thin straw on it; along the fertile parts, green; on the
 * mountain's flank, bare rock and scree. The valley of Lemuel is as it is in the hill country.
 */
function wildPaint(x, z, u, v) {
  const clumps = fbm(x / 9 + 1.3, z / 9 - 4.1, 3, 41) * 0.65 + fbm(x / 60 - 3.3, z / 60 + 2.7, 2, 43) * 0.35;
  let growth = 0.05 + 0.5 * smooth(0.42, 0.7, clumps);
  let dry = 0.9 + 0.1 * smooth(0.4, 0.66, fbm(x / 90 + 2.2, z / 90 + 8.1, 3, 21));
  let wet = 0;
  const green = fertileAt(x, z);
  growth = Math.max(growth, green * (0.72 + 0.28 * clumps));
  dry *= 1 - 0.8 * green;
  wet = green * 0.55;
  // the mountain's flank: rock, with a little on its ledges
  const m = Math.hypot(u - WILD.mountain.at[0], v - WILD.mountain.at[1]);
  const flank = smooth(WILD.mountain.foot * 0.95, WILD.mountain.foot * 0.6, m) * smooth(WILD.mountain.top * 0.9, WILD.mountain.top * 1.5, m);
  growth *= 1 - 0.8 * flank * smooth(0.3, 0.6, fbm(x / 21 + 7.7, z / 21 + 3.9, 2, 223));
  // (straw along the edges of the ways cut into it, where the earth was turned: so that a way is seen as one)
  const way = pathDistance(x, z);
  growth = Math.max(growth, flank * smooth(1.0, 2.4, way) * (1 - smooth(4.2, 7.5, way)) * (0.42 + 0.3 * clumps));
  // the mountain's top: a high pasture, where the wild beasts feed
  const crown = 1 - smooth(WILD.mountain.top * 0.75, WILD.mountain.top * 1.3, m);
  growth = Math.max(growth, crown * (0.5 + 0.4 * clumps));
  wet = Math.max(wet, crown * 0.3);
  dry *= 1 - 0.35 * crown;
  // paths worn to earth, and the camp trodden bare
  growth = Math.min(growth, smooth(0.5, 1.9, pathDistance(x, z) + (fbm(x / 2.7, z / 2.7, 2, 61) - 0.5) * 0.9));
  growth *= smooth(9, 24, Math.hypot(u - WILD.camp.at[0], v - WILD.camp.at[1]) + (fbm(x / 5.3, z / 5.3, 2, 67) - 0.5) * 8);
  const flowers = green * smooth(0.5, 0.7, fbm(x / 38 - 6, z / 38 + 3, 2, 55)) * 0.3;
  return { dry: dry * (1 - wet), growth, wet, flowers };
}

export function paint(x, z) {
  if (LAND === 'plain') return plainPaint(x, z);
  const u = x * DX + z * DZ;
  const v = -x * DZ + z * DX;
  // (the wilderness, but for the valley of Lemuel, which is painted as it is in the hill country)
  if (LAND === 'wild' && !(Math.abs(v - LEMUEL.at[1]) < LEMUEL.reach + 60 && Math.abs(u - LEMUEL.at[0]) < 150)) return wildPaint(x, z, u, v);
  // dry nearly everywhere: grass gone to straw, sage and thorn in the hollows
  let dry = 0.62 + 0.36 * smooth(0.4, 0.66, fbm(x / 90 + 2.2, z / 90 + 8.1, 3, 21));
  let wet = smooth(0.7, 0.78, fbm(x / 47 + 5.5, z / 47 + 9.9, 2, 33)) * 0.35;
  // thin cover, in clumps, with stony earth between
  const clumps = fbm(x / 9 + 1.3, z / 9 - 4.1, 3, 41) * 0.65 + fbm(x / 60 - 3.3, z / 60 + 2.7, 2, 43) * 0.35;
  let growth = 0.15 + 0.85 * smooth(0.34, 0.6, clumps);
  // a footpath worn to earth, its edges ragged
  const path = pathDistance(x, z);
  growth = Math.min(growth, smooth(0.6, 1.8, path + (fbm(x / 2.7, z / 2.7, 2, 61) - 0.5) * 0.9));
  if (LAND !== 'wild') {
    // nothing grows in the city's streets or in the trodden ground round its walls or the house
    growth *= smooth(-2, 12, cityDistance(u, v));
    growth *= smooth(16, 30, Math.hypot(u - LEHI_HOUSE[0], v - LEHI_HOUSE[1]));
    // nor under the rock, where no sun comes
    growth *= smooth(CAVE.floor - 1.5, CAVE.floor + 1.5, Math.hypot(u - CAVE.at[0], v - CAVE.at[1]));
  }
  // the valley of Lemuel: trodden earth round the tents, green along the river's banks, and gravel in its bed
  if (Math.abs(v - LEMUEL.at[1]) < LEMUEL.reach && Math.abs(u - LEMUEL.at[0]) < 70) {
    const ragged = (fbm(x / 5.3, z / 5.3, 2, 67) - 0.5) * 9;
    growth *= smooth(11, 27, Math.hypot(u - LEMUEL.at[0] + 5, (v - LEMUEL.at[1]) * 0.62) + ragged);
    const { half } = LEMUEL.river;
    const s = Math.abs(u - lemuelRiver(v)) + (fbm(x / 3.1, z / 3.1, 2, 69) - 0.5) * 1.6;
    const runs = lemuelRuns(v);
    const bank = (1 - smooth(half * 1.4 + 1, half * 1.4 + 6, s)) * runs;
    growth = Math.max(growth, bank * (0.75 + 0.25 * clumps));
    dry *= 1 - 0.85 * bank;
    wet = Math.max(wet, bank * 0.7);
    growth *= 1 - runs * (1 - smooth(half * 0.9, half * 1.5, s));
  }
  // a few red anemones and yellow flowers in drifts
  const flowers = smooth(0.58, 0.74, fbm(x / 38 - 6, z / 38 + 3, 2, 55)) * 0.35;
  return { dry: dry * (1 - wet), growth, wet, flowers };
}
