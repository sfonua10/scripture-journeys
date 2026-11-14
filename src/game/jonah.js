// The story of Jonah, all four chapters of it, in beats: the word that comes and the ship at Joppa, the tempest, the
// deep and the fish's belly, Nineveh, and the booth and the gourd. It is told as the Daniel journeys are
// (lions-den.js): the words on the cards are the scripture's own (scripture-jonah.js, the King James Version); the
// few lines that are not are what to do.
//
// You are Jonah. What happens is fixed, as it is written; how you do it is yours. When the word comes, the way to
// Nineveh is marked, and you may take it or turn from it: whichever, it is read what he did (1:3), and the story goes
// down to Joppa. In the tempest you cross a deck that will not keep still; you draw your lot; you take an oar, and
// the land comes no nearer. In the fish's belly it is dark, and the prayer is the play: three times you turn and
// look for light ("yet I will look again toward thy holy temple", 2:4). In Nineveh you cry against it in three
// places, and see what each does. East of the city you make a booth of boughs, and the gourd comes up over it; and
// at the last you are asked to look upon the city, as the LORD's question is read. The book ends on the question,
// and so does the journey.
//
// Three things you do here the text does not say Jonah did, and the README says so: you help to cast the wares into
// the sea (1:5 says the mariners did; he was asleep), you take an oar (1:13: "the men rowed hard"), and you carry
// the boughs of the booth one at a time (4:5: "there made him a booth"). What the fish was like is not told ("a great
// fish", 1:17); nor what the belly of it was like, which is shown dark, and nothing more.
import { createCrowd } from './crowd.js';
import { createHalo } from './halo.js';
import { createHeat } from './heat.js';
import { AT_SEA, beamAt, BENCHES, GOURD_FOOT, IN_NINEVEH, NINEVEH, PROPS as SMALL_THINGS, SETS } from './nineveh.js';
import { CITY, GATE, PLAIN } from './places.js';
import { createSea } from './sea.js';
import { BLANKS, EXCERPTS, SAID } from './scripture-jonah.js';
import { telling } from './telling.js';

/** Nineveh, in place of Jerusalem (nineveh.js), and the journey's own small things (the wares, the boughs). */
export const LOOK = NINEVEH;
export const PROPS = SMALL_THINGS;

// What each of them wears, as cel paint ([in the light, in the shade]) and as an outfit (wanderer.js, ROBE). Jonah
// was of Gath-hepher, in Israel (2 Kings 14:25), in the days of Jeroboam the second: he is given what the men of
// Israel are given in the Nephi journey, a long tunic of undyed wool, and over it a mantle of brown hair (as a
// prophet's was: 2 Kings 1:8; Zechariah 13:4), a cloth on his head. The mariners are given short tunics and bare
// arms; their master a longer one of red, and a cap. Of how Nineveh dressed a little is known from its own carvings
// (a century later): long fringed tunics, the king's tall cap. Sackcloth is drawn dark and coarse, the head bare.
const tunic = (lit, shade) => ({ SHIRT: [lit, shade], TROUSERS: [lit.map((v) => v * 0.95), shade], SKIRT: [lit, shade] });
const DARK_HAIR = [[0.1, 0.08, 0.07], [0.05, 0.04, 0.05]];
const ROPE = [[0.5, 0.42, 0.3], [0.28, 0.23, 0.18]];
const SACK = [[0.3, 0.25, 0.2], [0.15, 0.12, 0.11]];
const seaman = (lit, shade, band) => ({
  ...tunic(lit, shade),
  HEADBAND: [band, band.map((v) => v * 0.55)],
  TRIM: [[0.7, 0.62, 0.48], [0.4, 0.35, 0.3]],
  BELT: ROPE,
  OUTFIT: { head: 'band', cloak: false, hem: 0.55, edge: 0, bare: 1, belt: 1, cuffs: 0, lace: 0, blade: 0 },
});
const sackcloth = () => ({
  ...tunic(...SACK),
  TRIM: SACK,
  HAT: SACK,
  BELT: ROPE,
  OUTFIT: { head: 'none', hair: 'long', cloak: false, hem: 0.2, edge: 0, bare: 0, belt: 1, cuffs: 0, lace: 0, blade: 0 },
});
export const CLOTHES = {
  player: {
    ...tunic([0.82, 0.76, 0.64], [0.5, 0.46, 0.46]),
    CLOAK: [[0.42, 0.3, 0.2], [0.22, 0.15, 0.12]],
    HAT: [[0.88, 0.84, 0.74], [0.54, 0.52, 0.56]],
    TRIM: [[0.5, 0.36, 0.24], [0.28, 0.2, 0.16]],
    BELT: [[0.36, 0.24, 0.15], [0.18, 0.12, 0.1]],
    HAIR: [[0.2, 0.14, 0.1], [0.1, 0.07, 0.06]],
    BEARD: [[0.2, 0.14, 0.1], [0.1, 0.07, 0.06]],
    OUTFIT: { head: 'cloth', cloak: true, hem: 0.1, edge: 0, bare: 0, belt: 1, cuffs: 0, lace: 0.3, blade: 0, sleeves: true },
  },
  shipmaster: {
    ...tunic([0.6, 0.2, 0.2], [0.32, 0.1, 0.13]),
    HAT: [[0.3, 0.2, 0.36], [0.16, 0.1, 0.22]],
    TRIM: [[0.86, 0.72, 0.42], [0.52, 0.42, 0.28]],
    BELT: [[0.4, 0.26, 0.15], [0.2, 0.13, 0.1]],
    OUTFIT: { head: 'cap', hair: 'long', cloak: false, hem: 0.3, edge: 2, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
  },
  mariner: seaman([0.72, 0.66, 0.54], [0.42, 0.38, 0.38], [0.6, 0.22, 0.16]),
  // the king of Nineveh: the tall cap of an Assyrian king, a long robe of deep red bordered with gold, a mantle
  king: {
    ...tunic([0.56, 0.14, 0.14], [0.3, 0.07, 0.1]),
    CLOAK: [[0.3, 0.12, 0.3], [0.16, 0.06, 0.18]],
    HAT: [[0.94, 0.9, 0.8], [0.6, 0.56, 0.6]],
    HEADBAND: [[1.0, 0.8, 0.3], [0.62, 0.46, 0.2]],
    TRIM: [[1.0, 0.8, 0.3], [0.62, 0.46, 0.2]],
    BELT: [[0.86, 0.66, 0.26], [0.5, 0.36, 0.16]],
    HAIR: DARK_HAIR,
    BEARD: DARK_HAIR,
    OUTFIT: { head: 'crown', hair: 'long', beard: 'long', cloak: true, hem: 0.02, edge: 4, bare: 0, belt: 1, cuffs: 1, lace: 0.3, blade: 0, sleeves: true },
  },
  // (as he sat in ashes, 3:6: his robe laid from him, covered with sackcloth)
  kingInSackcloth: { ...sackcloth(), HAIR: DARK_HAIR, BEARD: DARK_HAIR, OUTFIT: { ...sackcloth().OUTFIT, beard: 'long', hem: 0.05 } },
  noble: {
    ...tunic([0.26, 0.36, 0.54], [0.13, 0.18, 0.32]),
    HAT: [[0.86, 0.8, 0.66], [0.52, 0.48, 0.44]],
    TRIM: [[0.86, 0.72, 0.42], [0.52, 0.42, 0.28]],
    BELT: [[0.4, 0.26, 0.15], [0.2, 0.13, 0.1]],
    OUTFIT: { head: 'turban', hair: 'long', cloak: false, hem: 0.04, edge: 4, bare: 0, belt: 2, cuffs: 0, lace: 0.32, blade: 0, sleeves: true },
  },
};

/** The cast's ten "townsfolk" (town.js) are, as the story goes, the people of Joppa, mariners, and the people of Nineveh. */
const ninevite = (lit, shade, head, hat, hem) => ({
  ...tunic(lit, shade),
  HAT: [hat, hat.map((v) => v * 0.6)],
  TRIM: [[0.84, 0.7, 0.42], [0.5, 0.42, 0.28]],
  BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
  OUTFIT: { head, hair: 'long', cloak: false, hem, edge: 4, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
});
const wool = (lit, shade, hem) => ({
  ...tunic(lit, shade),
  HAT: [[0.8, 0.74, 0.62], [0.46, 0.42, 0.44]],
  TRIM: [[0.5, 0.36, 0.24], [0.28, 0.2, 0.16]],
  BELT: [[0.4, 0.28, 0.17], [0.2, 0.14, 0.11]],
  OUTFIT: { head: 'cloth', cloak: false, hem, edge: 0, bare: 0, belt: 2, cuffs: 0, lace: 0.3, blade: 0 },
});
const FOLK = {
  joppa: [
    wool([0.74, 0.66, 0.52], [0.42, 0.37, 0.37], 0.4),
    wool([0.58, 0.42, 0.3], [0.32, 0.22, 0.2], 0.13),
    wool([0.44, 0.5, 0.56], [0.22, 0.26, 0.36], 0.13),
    wool([0.82, 0.78, 0.68], [0.5, 0.47, 0.5], 0.4),
    wool([0.56, 0.52, 0.34], [0.3, 0.28, 0.22], 0.13),
  ],
  mariners: [
    seaman([0.66, 0.56, 0.4], [0.38, 0.31, 0.28], [0.24, 0.32, 0.5]),
    seaman([0.78, 0.72, 0.6], [0.46, 0.42, 0.42], [0.6, 0.22, 0.16]),
    seaman([0.5, 0.42, 0.34], [0.28, 0.23, 0.22], [0.8, 0.7, 0.44]),
    seaman([0.62, 0.6, 0.5], [0.36, 0.34, 0.34], [0.3, 0.42, 0.3]),
  ],
  nineveh: [
    ninevite([0.78, 0.7, 0.54], [0.44, 0.4, 0.4], 'cap', [0.88, 0.84, 0.74], 0.05),
    ninevite([0.3, 0.42, 0.56], [0.15, 0.21, 0.34], 'turban', [0.86, 0.8, 0.66], 0.05),
    ninevite([0.6, 0.3, 0.2], [0.32, 0.15, 0.14], 'cap', [0.82, 0.74, 0.58], 0.3),
    ninevite([0.4, 0.5, 0.34], [0.2, 0.25, 0.22], 'turban', [0.62, 0.3, 0.24], 0.05),
    ninevite([0.72, 0.58, 0.32], [0.4, 0.31, 0.2], 'cap', [0.88, 0.84, 0.74], 0.3),
  ],
  sackcloth: [sackcloth()],
};

/** Who is in the story, in the order they are made, and whether they wear a beard. */
export const PEOPLE = [
  ['shipmaster', 'shipmaster', true],
  ['mariner1', 'mariner', true],
  ['mariner2', 'mariner', false],
  ['mariner3', 'mariner', true],
  ['king', 'king', true],
  ['noble1', 'noble', true],
  ['noble2', 'noble', true],
];

/** What is written, small, over those the text names (names.js). `you` is the one you walk as. */
export const NAMES = { you: 'Jonah' };

/** The people of each place are the story's to place: none walk the city of themselves. */
export function town() {
  return { day() {}, night() {}, watch() {} };
}

// The skies the story makes of its own, as the light on everything (the field's and the sky's uniforms): the tempest;
// the deep, near the waves and far under them; the fish's belly, dark, and as it is when he looks toward the light.
const SKIES = {
  storm: { sun: [0.14, 0.16, 0.2], amb: [0.2, 0.24, 0.3], bounce: [0.06, 0.07, 0.09], fog: [0.1, 0.12, 0.15], zenith: [0.03, 0.04, 0.055], mid: [0.07, 0.09, 0.11], horizon: [0.12, 0.14, 0.17], glow: [0, 0, 0], bankLit: [0.16, 0.18, 0.21], cloud: [0.1, 0.115, 0.135], bankShade: [0.045, 0.055, 0.07], haze: 3, exposure: 1 },
  shallows: { sun: [0.3, 0.6, 0.62], amb: [0.14, 0.36, 0.42], bounce: [0.03, 0.1, 0.12], fog: [0.05, 0.25, 0.3], zenith: [0.05, 0.25, 0.3], mid: [0.05, 0.25, 0.3], horizon: [0.05, 0.25, 0.3], glow: [0, 0, 0], bankLit: [0.05, 0.25, 0.3], cloud: [0.05, 0.25, 0.3], bankShade: [0.05, 0.25, 0.3], haze: 1, exposure: 1 },
  abyss: { sun: [0.05, 0.11, 0.15], amb: [0.03, 0.07, 0.1], bounce: [0.005, 0.02, 0.03], fog: [0.005, 0.03, 0.05], zenith: [0, 0.02, 0.04], mid: [0, 0.02, 0.04], horizon: [0, 0.02, 0.04], glow: [0, 0, 0], bankLit: [0, 0.02, 0.04], cloud: [0, 0.02, 0.04], bankShade: [0, 0.02, 0.04], haze: 1, exposure: 1 },
  belly: { sun: [0.07, 0.06, 0.05], amb: [0.03, 0.03, 0.04], bounce: [0.008, 0.008, 0.01], fog: [0, 0, 0], zenith: [0, 0, 0], mid: [0, 0, 0], horizon: [0, 0, 0], glow: [0, 0, 0], bankLit: [0, 0, 0], cloud: [0, 0, 0], bankShade: [0, 0, 0], haze: 1, exposure: 1 },
  lit: { sun: [0.62, 0.54, 0.4], amb: [0.07, 0.07, 0.09], bounce: [0.03, 0.03, 0.03], fog: [0, 0, 0], zenith: [0, 0, 0], mid: [0, 0, 0], horizon: [0, 0, 0], glow: [0, 0, 0], bankLit: [0, 0, 0], cloud: [0, 0, 0], bankShade: [0, 0, 0], haze: 1, exposure: 1 },
};
/** How far the day is gone into the tempest's dark, for how wild the sea is. */
const gloom = (storm) => Math.min(1, storm * 1.15);
const between = (a, b, t) => Object.fromEntries(Object.keys(a).map((key) => [key, Array.isArray(a[key]) ? a[key].map((v, i) => v + (b[key][i] - v) * t) : a[key] + (b[key] - a[key]) * t]));

export function story(g) {
  const { P, C } = g;
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const ease = (k) => k * k * (3 - 2 * k);
  const who = (name) => g.cast.get(name);
  const at = (npc) => [npc.x, npc.z];
  const me = () => [g.player.x, g.player.z];
  const from = ([x, z]) => Math.hypot(g.player.x - x, g.player.z - z);
  const { part, verse, line, lineOf, fill } = telling(g, { EXCERPTS, BLANKS, SAID });
  // (the valley's own directions, in the world's (x, z): +u, which is the way the ship heads, and +v, across her)
  const O = P(0, 0);
  const U = [P(1, 0)[0] - O[0], P(1, 0)[1] - O[1]];
  const V = [P(0, 1)[0] - O[0], P(0, 1)[1] - O[1]];
  /** Where a place of the world is in the valley's frame: [u, v]. */
  const uv = ([x, z]) => [(x - O[0]) * U[0] + (z - O[1]) * U[1], (x - O[0]) * V[0] + (z - O[1]) * V[1]];
  const folk = Array.from({ length: 10 }, (_, i) => `town${i}`);
  const crew = ['mariner1', 'mariner2', 'mariner3', 'town0', 'town1', 'town2', 'town3'];
  const everyone = [...folk, ...PEOPLE.map(([name]) => name)];
  const LEVEL = PLAIN.level;

  // ---- the sea, the sets, the crowds, the light in the dark, the sun's heat ----
  const sea = createSea(g.scene, g.field, g.sky);
  const sets = Object.fromEntries(Object.entries(SETS).map(([name, build]) => [name, g.set(build)]));
  const crowds = Array.from({ length: 4 }, () => createCrowd(g.scene, g.field, g.heightAt));
  const heat = createHeat();
  const light = createHalo(g.scene, { color: [1.6, 1.46, 1.16], width: 5.5, height: 5.5, back: 0, rays: 0.8 });
  /** The light he looks toward, in the fish's belly: where it is, and how strong (0: none). */
  const lamp = { x: 0, y: 0, z: 0, k: 0 };

  // ---- the weather: the light on everything, between the hour's own and one of the story's skies ----
  const F = g.field.uniforms;
  const S = g.sky.uniforms;
  const K = g.sky.clouds;
  const LIGHTS = [[F, 'uSunColor', 'sun'], [F, 'uSkyColor', 'amb'], [F, 'uBounceColor', 'bounce'], [F, 'uFogColor', 'fog'], [F, 'uFogSunColor', 'fog'], [S, 'uZenith', 'zenith'], [S, 'uMid', 'mid'], [S, 'uHorizon', 'horizon'], [S, 'uGlow', 'glow'], [S, 'uBankLit', 'bankLit'], [S, 'uBankShade', 'bankShade'], [K.uniforms, 'uLit', 'bankLit'], [K.uniforms, 'uMid', 'cloud'], [K.uniforms, 'uShade', 'bankShade'], [K.uniforms, 'uUnder', 'bankShade'], [K.uniforms, 'uHaze', 'fog']];
  let clear = null;
  let sky = { to: SKIES.storm, k: 0 };
  /** The light, `k` of the way from the hour's own to the sky `to`. `redraw`: the clouds are painted again in it. */
  function weather(to, k, redraw = true) {
    sky = { to, k };
    LIGHTS.forEach(([u, name, key], i) => {
      const a = clear.colours[i];
      const b = to[key];
      u[name].value.setRGB(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
    });
    F.uFogDensity.value = clear.haze * (1 + (to.haze - 1) * k);
    g.sky.exposure = clear.exposure + (to.exposure - clear.exposure) * k;
    if (redraw) K.drawAll();
  }
  /** The hour of the day (as g.setHour), under the story's weather. */
  function hour(h, soft = false, redraw = !soft && sky.k > 0) {
    g.setHour(h, soft);
    clear = { colours: LIGHTS.map(([u, name]) => u[name].value.toArray()), haze: F.uFogDensity.value, exposure: g.sky.exposure };
    weather(sky.to, sky.k, redraw);
  }
  /** The hour goes from one to another over some seconds, the sun seen to move. Resolves when it is there. */
  function sweep(c, hour0, hour1, seconds) {
    const began = c.time;
    return c.until(() => {
      const k = Math.min(1, (c.time - began) / seconds);
      hour(hour0 + (hour1 - hour0) * k, true);
      return k >= 1;
    });
  }

  // ---- the ship ----
  const SHIP = AT_SEA.ship;
  const shipAt = P(...SHIP.at);
  const WATER = LEVEL - 1.1;
  /** A place on her deck, by how far along her from her middle and how far across (metres). */
  const D = (du, dv) => P(SHIP.at[0] + du, SHIP.at[1] + dv);
  /** By her side that is towards the sea (+v), `du` along her: as near her rail as one stands. */
  const bySide = (du) => D(du, beamAt(SHIP.at[0] + du) - 0.8);
  const aft = yawTo(D(0, 0), D(-1, 0));
  const hatch = D(-5.1, 0);
  const plankFoot = P((SHIP.gap[0] + SHIP.gap[1]) / 2, AT_SEA.quay.v[1] - 1.3);
  const plankTop = P((SHIP.gap[0] + SHIP.gap[1]) / 2, SHIP.at[1] - 1.5);
  const masterAtQuay = P(SHIP.gap[0] - 1.5, AT_SEA.quay.v[1] - 2.2);
  const lots = D(4.3, 0.1);
  /** Where each bench is sat on: [du, side], her head's first; the one that is yours is the last. */
  const SEATS = [[BENCHES[3], -1], [BENCHES[3], 1], [BENCHES[2], -1], [BENCHES[1], -1], [BENCHES[1], 1], [BENCHES[0], -1], [BENCHES[0], 1], [BENCHES[2], 1]];
  const seatAt = ([du, side]) => D(du, side * (beamAt(SHIP.at[0] + du) - 0.75));
  const myBench = seatAt(SEATS[7]);
  /** How wild the sea is, 0 to 1; whether the ship rides it (the deck heaves, the eye rolls); how the oars are pulled. */
  const ride = { storm: 0, on: false, pull: 0, way: 0 };
  const oarsHome = sets.oars.mesh.position.clone();

  // ---- the deep ----
  const deepAt = P(158, 60);
  const deep = { on: false, depth: 0, rise: 0, dark: 0 };

  // ---- Nineveh ----
  const gateOut = P(GATE[0] - 14, 0);
  const gateIn = C(-62, 0);
  /** The places he cries in: the square within the gate, a street, the court before the temple tower. */
  const PLACES = [
    { name: 'Within the gate', at: C(-55, 0), via: [gateOut, gateIn], folk: [0, 1, 2], stands: [[-58.6, 3.2], [-52.4, -3.4], [-51.2, 2.8]] },
    { name: 'In the street', at: C(-27, 25), via: [C(-27, 0)], folk: [3, 4, 5], stands: [[-28.6, 21.6], [-25.2, 28.4], [-28.4, 28.9]] },
    { name: 'Before the temple', at: C(13, -13), via: [C(-27, 0), C(13, -1)], folk: [6, 7, 8], stands: [[9.6, -11.2], [16.2, -11.6], [14.4, -16.6]] },
  ];
  const [ku, kv] = IN_NINEVEH.king;
  const kingAt = C(ku, kv);
  const ashesAt = C(...IN_NINEVEH.ashes);
  const beforeKing = C(ku, -2.6);
  /** The multitude of each place, painted (crowd.js): about where he cries, a way left open through them. */
  function multitudes() {
    let k = 9;
    const shake = () => (k = (k * 16807) % 2147483647) / 2147483647 - 0.5;
    const among = (cu0, cu1, cv0, cv1, keep) => {
      const many = [];
      for (let a = cu0; a <= cu1; a += 1.7) for (let b = cv0; b <= cv1; b += 1.7) if (keep(a, b)) many.push(C(a + shake() * 0.8, b + shake() * 0.8));
      return many;
    };
    crowds[0].place(among(-63, -47, -12, 12, (a, b) => Math.hypot(a + 55, b) > 4.2 && Math.abs(b) > 2.4), 3);
    crowds[1].place(among(-29.4, -24.6, 12, 38, (a, b) => Math.hypot(a + 27, b - 25) > 3.6 && !(Math.abs(a + 27) < 1 && b < 25)), 5);
    crowds[2].place(among(7, 19, -21, -6.5, (a, b) => Math.hypot(a - 13, b + 13) > 3.8 && !(Math.abs(a - 13) < 1.2 && b > -13)), 7);
    crowds[3].place(among(27, 59, -3.2, 2.6, (a, b) => Math.abs(a - ku) > 5.5 && Math.abs(b + 1) > 1.7), 11);
  }
  /** The ten of the city who are seen near at hand, three in each place and one by the king; and the king's nobles. */
  function ninevites() {
    PLACES.forEach((place) => {
      place.folk.forEach((n, i) => {
        const p = C(...place.stands[i]);
        const other = C(...place.stands[(i + 1) % 3]);
        who(folk[n]).place(...p, yawTo(p, other)).face(...other);
      });
    });
    const p = C(ku - 7.5, 1.4);
    who(folk[9]).place(...p, yawTo(p, kingAt)).face(...kingAt);
    ['noble1', 'noble2'].forEach((name, i) => {
      const n = C(ku + (i ? 4.4 : -4.4), 3.0);
      who(name).place(...n, yawTo(n, beforeKing)).face(...beforeKing);
    });
  }
  /** The king on his seat, on its dais, facing the street. */
  function enthroned() {
    const king = who('king').place(...kingAt, yawTo(kingAt, beforeKing));
    king.raise = IN_NINEVEH.daisTall;
    king.seated = 1;
    return king;
  }
  /** Puts sackcloth on a place (3:5): its multitude, and those of it who are near at hand; they kneel. */
  function inSackcloth(i, k = 1) {
    crowds[i].sackcloth(k);
    if (k < 1) return;
    for (const n of PLACES[i]?.folk ?? [9]) {
      who(folk[n]).w.dress(FOLK.sackcloth[0]);
      who(folk[n]).kneel = 1;
    }
  }

  // ---- the booth ----
  const boothAt = P(...AT_SEA.booth);
  const cityward = P(AT_SEA.booth[0] + 40, AT_SEA.booth[1]);
  const BOUGHS = [[-11, 6], [9, 10], [-6, -11], [12, -7]].map(([a, b]) => P(AT_SEA.booth[0] + a, AT_SEA.booth[1] + b));
  const gourdFoot = P(...GOURD_FOOT);
  /** The gourd, `k` of the way come up (0: not at all; 1: over all the booth): it grows from its foot. */
  function gourd(k) {
    const m = sets.gourd.mesh;
    sets.gourd.show(k > 0.001);
    const s = Math.max(0.001, k);
    const foot = [gourdFoot[0], g.heightAt(...gourdFoot), gourdFoot[1]];
    m.scale.setScalar(s);
    m.position.set(foot[0] * (1 - s), foot[1] * (1 - s), foot[2] * (1 - s));
  }
  function booth(stages) {
    for (let i = 0; i < 4; i++) sets[`booth${i}`].show(i < stages);
  }

  // ---- each frame ----
  g.each((dt) => {
    const t = g.clock();
    sea.update(dt, g.camera, ride.way);
    sea.state(ride.storm);
    for (const crowd of crowds) crowd.update(t);
    if (ride.on) {
      // she rolls and she rides: the sea is turned about her, the eye rolls a little with her, and the deck carries
      // him down it
      const roll = ride.storm * 0.105 * (0.62 * Math.sin(t * 0.83) + 0.38 * Math.sin(t * 1.57 + 1.3));
      const heave = ride.storm * 0.5 * Math.sin(t * 0.61 + 0.4);
      sea.ride(roll, heave);
      g.sway(-roll * 0.45, heave * 0.1);
      const push = (roll / 0.105) * 0.6;
      g.shove(V[0] * push, V[1] * push);
      // the oars, as they are pulled: back along her, and up out of the water
      ride.pull = Math.max(0, ride.pull - dt * 1.5);
      const stroke = Math.sin(Math.min(1, ride.pull) * Math.PI);
      sets.oars.mesh.position.set(oarsHome.x - U[0] * 0.7 * stroke, oarsHome.y + 0.14 * stroke, oarsHome.z - U[1] * 0.7 * stroke);
    }
    if (deep.on) {
      deep.rise += dt * (1.2 + 1.4 * deep.depth);
      const y = g.heightAt(...me()) + (g.player.afloat?.up ?? 0);
      sea.deep(true, { at: [g.player.x, y, g.player.z], depth: deep.depth, dark: deep.dark, rise: deep.rise, weeds: deep.dark < 0.5 });
      if (g.player.afloat) {
        // (borne down: he turns slowly as he sinks, and his limbs go with the water)
        g.player.afloat.lean = 0.95 + 0.25 * Math.sin(t * 0.5);
        g.player.afloat.roll = 0.4 * Math.sin(t * 0.37 + 1);
      }
    }
    light.update(t);
    light.set(lamp.x, lamp.y, lamp.z, lamp.k * (0.94 + 0.06 * Math.sin(t * 1.3)));
  });

  /** His hands together before him as he prays; and to an oar. */
  const PRAYING = { out: 0.21, up: 1.2, wide: 0.035 };
  const AT_OAR = { out: 0.38, up: 0.78, wide: 0.19 };
  function kneel(on) {
    g.player.kneel = on ? 1 : 0;
    g.player.holds = on ? PRAYING : null;
  }

  /** Dresses the cast's ten as the people of this part of the story. */
  function dress(as) {
    folk.forEach((name, i) => who(name).w.dress(FOLK[as][i % FOLK[as].length]));
    who('king').w.dress(CLOTHES.king);
    for (const name of ['noble1', 'noble2']) who(name).w.dress(CLOTHES.noble);
  }

  /**
   * Makes the world ready for a beat. `place`: 'country' (the land without the city), 'joppa', 'sea', 'deep', 'shore'
   * or 'land' (Nineveh on its plain). `storm`: how wild the sea, and with it how dark the day.
   */
  function reset({ hour: h, stand, face, place = 'land', as = 'joppa', storm = 0, under = null }) {
    g.cast.clear();
    g.props.reset();
    g.dress('player');
    g.view(null);
    g.guidance.lead(null);
    g.guidance.shine(null);
    g.music.stop();
    g.sounds.hush(0);
    g.burden(null);
    g.show(true);
    g.shove(0, 0);
    g.sway(0, 0);
    Object.assign(g.player, { kneel: 0, sit: 0, seated: 0, afloat: null, holds: null });
    for (const name of everyone) Object.assign(who(name), { bow: 0, kneel: 0, sit: 0, seated: 0, raise: 0, lift: 0, open: 0, aura: 0, holds: null });
    dress(as);
    for (const crowd of crowds) {
      crowd.show(false);
      crowd.sackcloth(0);
      crowd.fall(null);
    }
    heat.set(0);
    lamp.k = 0;
    for (const set of Object.values(sets)) set.show(false);
    sets.gourd.mesh.scale.setScalar(1);
    sets.gourd.mesh.position.set(0, 0, 0);
    sets.oars.mesh.position.copy(oarsHome);
    sea.show(false);
    sea.rain(0);
    sea.deep(false);
    sea.fish(null);
    sea.ride(0, 0);
    Object.assign(ride, { storm, on: false, pull: 0, way: 0 });
    Object.assign(deep, { on: false, depth: 0, rise: 0, dark: 0 });
    const afloat = place === 'joppa' || place === 'sea';
    g.land(place === 'land' || place === 'country', { city: place === 'land' });
    if (afloat) {
      sets.ship.show();
      (place === 'joppa' ? sets.quay : sets.gangwayRail).show();
      sea.place(...shipAt, WATER, { dir: U, half: SHIP.half, beam: SHIP.beam });
      sea.show();
      ride.on = place === 'sea';
      ride.way = place === 'sea' ? 2.4 : 0;
    } else if (place === 'shore') {
      sets.shore.show();
      sea.place(...P(158, AT_SEA.shore.v + 30), LEVEL - 0.42);
      sea.show();
    } else if (place === 'deep') deep.on = true;
    g.wind(4.5 + 7 * storm);
    sea.rain(storm > 0.3 ? 0.8 * storm : 0, [V[0] * 6 + U[0] * 3, V[1] * 6 + U[1] * 3]);
    sky = under ? { to: under, k: 1 } : { to: SKIES.storm, k: gloom(storm) };
    hour(h, false, true);
    g.standAt(stand[0], stand[1], yawTo(stand, face));
  }

  /** The mariners about her deck in the tempest, each crying unto his god (1:5): arms out, or on their knees. */
  const STATIONS = [[-1.6, 1.5], [3.8, -1.3], [6.5, 0.7], [-4, -1.4], [7.6, -0.9], [0.9, 1.9], [-5.6, 1.3]];
  function crewOnDeck() {
    const master = D(-7.7, 1.0);
    who('shipmaster').place(...master, yawTo(master, D(0, 0)));
    crew.forEach((name, i) => {
      const p = D(...STATIONS[i]);
      const n = who(name).place(...p, yawTo(p, D(STATIONS[i][0], STATIONS[i][1] * 4)));
      if (i % 3 === 1) n.kneel = 1;
      else n.open = 0.5;
    });
  }
  /** One of the story's things goes over her side into the sea, from where it is held. */
  async function overboard(c, name, [x, z]) {
    const began = c.time;
    const [u, v] = uv([x, z]);
    await c.until(() => {
      const k = Math.min(1, (c.time - began) / 0.75);
      g.props.show(name, P(u, v + 0.5 + 2.6 * k), { up: 0.95 + 1.5 * k - 4.4 * k * k, turn: k * 2 });
      return k >= 1;
    });
    g.props.hide(name);
    g.music.pluck();
  }
  /** One of the crew takes up one of the wares, bears it to her side, and casts it forth. */
  async function bears(c, npc, name, du) {
    npc.open = 0;
    npc.kneel = 0;
    await npc.walk([D(WARES[name][0] - 0.5, WARES[name][1])], 1.7);
    g.props.carry(name, npc, { out: 0.34, up: 0.95, size: 1, wide: 0.22 });
    const side = bySide(du);
    await npc.walk([side], 1.7);
    npc.face(...D(du, 9));
    await c.wait(0.4);
    g.props.carry(name, null);
    await overboard(c, name, side);
    npc.open = 0.5;
  }
  /** Where the wares lie on her deck. */
  const WARES = { ware0: [-1.4, -0.4], ware1: [3.7, 1.0], ware2: [6.2, -0.6], ware3: [-3.4, -1.6], ware4: [1.0, -1.8], ware5: [5.2, -1.5] };
  const wares = (names) => names.forEach((name) => g.props.show(name, D(...WARES[name]), { turn: WARES[name][0] }));

  /**
   * Waits until the eye has looked toward a place of the world for `hold` seconds (the autopilot turns it there).
   * `each(near)` is told every frame how nearly it looks there, 0 to 1.
   */
  function lookToward(c, target, { within = 0.2, hold = 1, each = null } = {}) {
    let held = 0;
    let last = c.time;
    return c.until(() => {
      const dt = Math.min(0.1, c.time - last);
      last = c.time;
      const off = wrap(Math.atan2(target[0] - g.player.x, target[1] - g.player.z) - g.eye.yaw);
      if (g.auto) g.eye.turn(g.eye.yaw + Math.sign(off) * Math.min(Math.abs(off), 2.6 * dt));
      held = Math.abs(off) < within ? held + dt : 0;
      each?.(1 - Math.min(1, Math.abs(off) / 1.3));
      return held >= hold;
    });
  }
  /** Something of the story's goes from one amount to another over some seconds: `set(k)` each frame, k eased. */
  function over(c, seconds, set) {
    const began = c.time;
    return c.until(() => {
      const k = Math.min(1, (c.time - began) / (g.auto ? Math.min(seconds, 1) : seconds));
      set(ease(k));
      return k >= 1;
    });
  }

  return [
    // ---- Act one: from the presence of the LORD (Jonah 1:1–3) ----
    {
      id: 'a1',
      label: 'Act One',
      scene: true,
      setup() {
        reset({ hour: 7.4, place: 'country', stand: P(150, 0), face: P(190, 0) });
      },
      async run(c) {
        await c.fade(0, 2);
        g.narration?.warm(g.reference('1:1'));
        await c.chapter('Act One', 'Arise, Go', 'Jonah 1');
        await c.verse('1:1');
        await verse(c, '1:2');
        // The way to Nineveh is marked. He may take it, or turn from it: whichever, it is read what Jonah did. With
        // ?wrong a test takes the way that is marked.
        const there = P(230, 0);
        const away = P(132, 0);
        c.objective('Arise, go to Nineveh: the way is marked. Or turn from it, and flee.');
        c.lead(g.auto && !g.flag('wrong') ? { x: away[0], z: away[1], r: 2, mark: false } : { x: there[0], z: there[1], r: 2, mark: true });
        let fled = false;
        await c.until(() => {
          const [u] = uv(me());
          fled = u < 136;
          return fled || u > 166;
        });
        c.lead(null);
        c.objective(null);
        g.log(fled ? 'turned from the way to Nineveh' : 'took the way to Nineveh');
        if (fled) await lineOf(c, '1:3-a');
        else await part(c, '1:3-a');
        await c.fade(1, 1.2);
      },
    },
    {
      id: 'a1-joppa',
      label: 'Act One',
      scene: true,
      setup() {
        reset({ hour: 9.2, place: 'joppa', stand: P(141.5, 11), face: P(160, 13) });
        who('shipmaster').place(...masterAtQuay, yawTo(masterAtQuay, P(141.5, 11)));
        const m1 = D(0.8, -0.3);
        who('mariner1').place(...m1, yawTo(m1, plankTop)).face(...plankTop);
        const m2 = D(5.6, 0.6);
        who('mariner2').place(...m2, yawTo(m2, D(0, 0)));
        const m3 = P(SHIP.gap[1] + 4.4, AT_SEA.quay.v[1] - 4.4);
        who('mariner3').place(...m3, yawTo(m3, plankFoot));
        // the people of the port, in twos, about the quay
        [[146.4, 7.6], [147.8, 8.5], [151.6, 13.8], [166.4, 8.2], [167.9, 7.4], [172.6, 12.4], [173.6, 13.6]].forEach(([u, v], i, all) => {
          const [ou, ov] = all[i % 2 ? i - 1 : Math.min(all.length - 1, i + 1)];
          who(folk[i + 3]).place(...P(u, v), yawTo(P(u, v), P(ou, ov))).face(...P(ou, ov));
        });
        wares(['ware0', 'ware1', 'ware2', 'ware3', 'ware4', 'ware5']);
      },
      async run(c) {
        const master = who('shipmaster');
        await c.fade(0, 1.6);
        lineOf(c, '1:3-b');
        c.objective('Find the ship going to Tarshish.');
        await c.reach(...masterAtQuay, 4.5);
        master.face(...me());
        c.objective('Pay the fare.');
        await c.act(...masterAtQuay, 2.8, 'Pay the fare');
        g.music.pluck();
        lineOf(c, '1:3-c');
        master.walk([plankFoot, plankTop, D(-3.6, 1.4)], 1.5).then(() => master.face(...hatch));
        c.objective('Go down into the ship.');
        await c.reach(...plankTop, 1.6, { via: [plankFoot] });
        lineOf(c, '1:3-d');
        await c.act(...hatch, 1.9, 'Go down into the ship');
        c.objective(null);
        await c.fade(1, 1.2);
        await fill(c, 'presence');
      },
    },

    // ---- Act two: the tempest (Jonah 1:4–16) ----
    {
      id: 'a2',
      label: 'Act Two',
      scene: true,
      setup() {
        reset({ hour: 16.2, place: 'sea', as: 'mariners', storm: 0.8, stand: D(-3.7, 0.2), face: D(4, 0) });
        crewOnDeck();
        wares(['ware0', 'ware1', 'ware2', 'ware3', 'ware4', 'ware5']);
        g.show(false);
      },
      async run(c) {
        const master = who('shipmaster');
        g.narration?.warm(g.reference('1:4'));
        await c.chapter('Act Two', 'The Storm', 'Jonah 1', 2.6);
        // The tempest, and what the mariners did, while he slept below: seen from her stern.
        c.freeze(true);
        g.view({ from: [...D(-8.8, -1.5), 2.5], to: [...D(3, 0.9), 0.9] });
        g.music.drum(0.2);
        await c.fade(0, 1.6);
        await c.verse('1:4');
        const cast = Promise.all([bears(c, who('mariner1'), 'ware0', -1.2), c.wait(1.2).then(() => bears(c, who('mariner3'), 'ware2', 6.2)), c.wait(2.4).then(() => bears(c, who('town0'), 'ware1', 3))]);
        await lineOf(c, '1:5-a');
        await lineOf(c, '1:5-b');
        await Promise.race([cast, c.wait(12)]);
        await c.fade(1, 1);
        g.view(null);
        g.sounds.hush(0.7);
        await part(c, '1:5-c');
        await part(c, '1:6-said');
        g.sounds.hush(0);
        // he is come up: the shipmaster by him, the tempest about them
        g.show(true);
        const by = D(-2.4, 1.2);
        master.place(...by, yawTo(by, me())).face(...me());
        c.freeze(false);
        await c.fade(0, 1.2);
        // "to lighten it of them" (1:5): what is left of the wares, cast forth; and the deck will not keep still
        const mine = ['ware3', 'ware4', 'ware5'];
        const gone = new Set();
        const list = (n) => [{ label: `Wares cast into the sea: ${n} of ${mine.length}`, done: n === mine.length }];
        for (let n = 0; n < mine.length; n++) {
          c.objective('Help to lighten the ship: cast the wares forth.', list(n));
          const left = mine.filter((name) => !gone.has(name)).sort((a, b) => from(D(...WARES[a])) - from(D(...WARES[b])));
          const name = left[0];
          await c.act(...D(...WARES[name]), 1.5, 'Take it up');
          g.props.carry(name, g.player, { out: 0.36, up: 0.95, size: 1, wide: 0.23 });
          g.burden(2.7);
          const [u] = uv(me());
          const side = bySide(Math.max(-5.5, Math.min(6, u - SHIP.at[0])));
          await c.act(...side, 1.5, 'Cast it forth');
          g.burden(null);
          g.props.carry(name, null);
          gone.add(name);
          await overboard(c, name, me());
        }
        c.objective('Help to lighten the ship: cast the wares forth.', list(mine.length));
        await c.wait(1.2);
        c.objective(null);
      },
    },
    {
      id: 'a2-lots',
      label: 'Act Two',
      setup() {
        reset({ hour: 16.2, place: 'sea', as: 'mariners', storm: 0.85, stand: D(0, 1.8), face: D(4.3, 0) });
        crewOnDeck();
        g.music.drum(0.2);
      },
      async run(c) {
        const master = who('shipmaster');
        ride.storm = 0.85;
        await part(c, '1:7-said');
        // they come together by the mast
        const RING = [[5.5, -1.1], [6.3, 0.2], [5.6, 1.4], [3.2, -1.5], [3.1, 1.6]];
        ['mariner1', 'mariner2', 'mariner3', 'town0'].forEach((name, i) => {
          const n = who(name);
          n.kneel = 0;
          n.open = 0;
          n.walk([D(...RING[i])], 1.8).then(() => n.face(...lots));
        });
        master.walk([D(...RING[4])], 1.8).then(() => master.face(...lots));
        c.objective('Go to the mariners, where they cast lots.');
        await c.reach(...lots, 1.5);
        c.objective('Take your lot with them.');
        c.prompt('Draw a lot');
        await c.until(() => c.pressed || g.auto);
        c.prompt(null);
        c.objective(null);
        g.music.pluck();
        for (const name of [...crew, 'shipmaster']) who(name).face(...me());
        await part(c, '1:7-b');
        await part(c, '1:8-said');
        await fill(c, 'sea');
        await c.verse('1:10');
        ride.storm = 0.95;
        await part(c, '1:11-said');
        await part(c, '1:12-said');
      },
    },
    {
      id: 'a2-row',
      label: 'Act Two',
      setup() {
        reset({ hour: 16.4, place: 'sea', as: 'mariners', storm: 0.95, stand: lots, face: D(-4, 0) });
        crewOnDeck();
        g.music.drum(0.2);
      },
      async run(c) {
        // "Nevertheless the men rowed hard to bring it to the land" (1:13): the oars are run out, and each takes his
        // bench. One bench is empty.
        ride.storm = 0.95;
        sets.oars.show();
        const rowing = lineOf(c, '1:13-a');
        crew.forEach((name, i) => {
          const n = who(name);
          n.kneel = 0;
          n.open = 0;
          n.walk([seatAt(SEATS[i])], 2.2).then(() => {
            n.place(...seatAt(SEATS[i]), aft);
            n.seated = 1;
            n.holds = AT_OAR;
          });
        });
        c.objective('Take an oar with them.');
        await c.act(...myBench, 1.5, 'Take an oar');
        g.standAt(...myBench, aft);
        g.player.seated = 1;
        g.player.holds = AT_OAR;
        await rowing;
        // He pulls, and they pull; and the sea drives her back. It cannot be won.
        const TOLD = ['Row hard, to bring her to the land.', 'Row hard. The land comes no nearer.', 'Row hard. The sea drives her back.'];
        const STROKES = 9;
        let last = c.time;
        c.prompt('Pull');
        for (let n = 0; n < STROKES; n++) {
          c.objective(TOLD[Math.floor((n * 3) / STROKES)]);
          await c.until(() => c.time - last > 0.7 && (c.pressed || g.auto));
          last = c.time;
          ride.pull = 1;
          ride.storm = Math.min(1, 0.95 + n * 0.006);
          g.music.drum(0.2 + n * 0.02);
        }
        c.prompt(null);
        c.objective(null);
        await part(c, '1:13-b');
        // the oars are let go; they cry unto the LORD (1:14)
        g.player.seated = 0;
        g.player.holds = null;
        sets.oars.show(false);
        crew.forEach((name, i) => {
          const n = who(name);
          n.seated = 0;
          n.holds = null;
          if (i < 4) n.kneel = 1;
          else n.open = 0.6;
        });
        await part(c, '1:14-said');
        // He goes to her side; two of them go with him.
        const side = bySide(0.4);
        ['mariner1', 'mariner3'].forEach((name, i) => {
          const n = who(name);
          n.kneel = 0;
          n.open = 0;
          Object.assign(n.follow(g.player, 1.5, i ? -1.2 : 1.2), { maxSpeed: 2.6 });
        });
        c.objective('Go to the ship’s side.');
        await c.reach(...side, 1.3);
        c.objective(null);
        c.freeze(true);
        g.view({ from: [...D(-5.4, -0.6), 2.3], to: [...D(1.2, 2.4), 1.2] });
        await part(c, '1:15-a');
        // (he is cast forth between one picture and the next)
        await c.fade(1, 1.2);
        g.show(false);
        for (const name of ['mariner1', 'mariner3']) who(name).stop().face(...D(0.4, 12));
        g.view({ from: [...D(-6.6, -1.2), 2.6], to: [...D(4, 13), -0.6] });
        g.music.drum(0);
        await c.fade(0, 1.2);
        // "and the sea ceased from her raging": the wind falls, the rain goes, the light comes back
        const ceased = lineOf(c, '1:15-b');
        await over(c, 8, (k) => {
          ride.storm = 0.95 * (1 - k);
          sea.rain(0.8 * (1 - k));
          weather(SKIES.storm, gloom(ride.storm), false);
          g.wind(11 - 6.5 * k);
        });
        K.drawAll();
        g.music.still(0.5);
        await ceased;
        for (const name of crew) Object.assign(who(name), { kneel: 0, open: 0, bow: 1 });
        await c.verse('1:16');
        await c.fade(1, 1.6);
        g.view(null);
        c.freeze(false);
      },
    },

    // ---- Act three: out of the belly (Jonah 1:17–2:10) ----
    {
      id: 'a3',
      label: 'Act Three',
      scene: true,
      setup() {
        reset({ hour: 16.4, place: 'deep', under: SKIES.shallows, stand: deepAt, face: P(158, 90) });
        g.player.afloat = { up: 6, lean: 0.5, roll: 0 };
        g.sounds.hush(0.9);
      },
      async run(c) {
        g.narration?.warm(g.reference('2:3'));
        await c.chapter('Act Three', 'Out of the Belly', 'Jonah 1–2', 2.6);
        // He goes down. There is nothing to be done; he may look about him. What he said of it afterwards is read as
        // it happens (2:3, 2:5).
        c.freeze(true);
        g.music.breath(0.6);
        const down = (to, seconds) => {
          const d0 = deep.depth;
          return over(c, seconds, (k) => {
            deep.depth = d0 + (to - d0) * k;
            weather(between(SKIES.shallows, SKIES.abyss, deep.depth), 1, false);
          });
        };
        await c.fade(0, 2);
        await Promise.all([line(c, '2:3'), down(0.4, 9)]);
        await Promise.all([line(c, '2:5'), down(0.75, 9)]);
        // the great fish: out of the dark before him
        const y = g.heightAt(...deepAt) + 6.4;
        const ahead = [Math.sin(g.eye.yaw), Math.cos(g.eye.yaw)];
        const aside = [ahead[1], -ahead[0]];
        const fishAt = (far, off) => [g.player.x + ahead[0] * far + aside[0] * off, g.player.z + ahead[1] * far + aside[1] * off];
        // first it passes before him, all its length, and is lost in the dark again
        const passing = over(c, 7, (k) => {
          const p = fishAt(31 - 4 * k, 46 - 92 * k);
          const next = fishAt(31 - 4 * (k + 0.01), 46 - 92 * (k + 0.01));
          sea.fish([p[0], y + 1.5, p[1]], yawTo(p, next), 0.85 * Math.sin(Math.PI * k) ** 0.6);
        });
        // then it comes for him out of the dark, until there is nothing to be seen but the fish
        const coming = () =>
          over(c, 6.5, (k) => {
            const p = fishAt(66 * (1 - k) + 6.5, 0);
            sea.fish([p[0], y - 0.6 * k, p[1]], yawTo(p, me()), 0.1 + 0.9 * k);
          });
        await Promise.all([lineOf(c, '1:17-a'), passing.then(coming)]);
        await c.fade(1, 0.9);
        sea.fish(null);
        g.music.breath(0);
        c.freeze(false);
      },
    },
    {
      id: 'a3-belly',
      label: 'Act Three',
      scene: true,
      setup() {
        reset({ hour: 16.4, place: 'deep', under: SKIES.belly, stand: deepAt, face: P(158, 90) });
        deep.dark = 1;
        kneel(true);
        g.sounds.hush(1);
      },
      async run(c) {
        g.narration?.warm(g.reference('2:1'));
        g.music.breath(0.5);
        await c.fade(0, 2.4);
        await part(c, '1:17-b');
        await c.verse('2:1');
        // Three days and three nights. Each day there is a light, far off, somewhere about him in the dark: he turns
        // and looks for it, and while he looks toward it a part of his prayer is read. Then it is night again.
        const DAYS = ['The first day', 'The second day', 'The third day'];
        const TURNS = [1.9, -2.5, 2.9];
        const ASKED = ['It is dark. Turn, and look for light.', 'Look again.', 'Look again toward the holy temple.'];
        for (let day = 0; day < 3; day++) {
          const a = g.eye.yaw + TURNS[day];
          const there = [g.player.x + Math.sin(a) * 26, g.player.z + Math.cos(a) * 26];
          Object.assign(lamp, { x: there[0], y: g.heightAt(...me()) + 4.4, z: there[1] });
          c.objective(ASKED[day], DAYS.map((label, i) => ({ label, done: i < day })));
          const dim = 0.16 + 0.05 * day;
          await lookToward(c, there, { hold: 1.1, each: (near) => (lamp.k = dim + 0.5 * near * near) });
          c.objective(null);
          // he looks toward it: it grows, and its light is on him
          F.uSunDir.value.set(there[0] - g.player.x, 9, there[1] - g.player.z).normalize();
          g.music.breath(0.2);
          g.music.still(0.4 + 0.25 * day);
          await over(c, 2.5, (k) => {
            lamp.k = dim + 0.5 + (0.5 + 0.3 * day) * k;
            weather(between(SKIES.belly, SKIES.lit, (0.5 + 0.25 * day) * k), 1, false);
          });
          if (day === 0) await part(c, '2:2-said');
          else if (day === 1) await fill(c, 'temple');
          else {
            await verse(c, '2:7');
            await verse(c, '2:9');
          }
          if (day === 2) break;
          // night
          await over(c, 2.5, (k) => {
            lamp.k = (dim + 1 + 0.3 * day) * (1 - k);
            weather(between(SKIES.belly, SKIES.lit, (0.5 + 0.25 * day) * (1 - k)), 1, false);
          });
          g.music.still(0.15);
          g.music.breath(0.5);
        }
        g.music.breath(0);
        await over(c, 3, (k) => (lamp.k = 1.8 + 1.4 * k));
        await c.verse('2:10');
        await c.fade(1, 1.4);
        kneel(false);
      },
    },

    // ---- Act four: that great city (Jonah 3) ----
    {
      id: 'a4',
      label: 'Act Four',
      scene: true,
      setup() {
        reset({ hour: 7.2, place: 'shore', stand: P(158, AT_SEA.shore.v - 1.6), face: P(158, -20) });
        kneel(true);
      },
      async run(c) {
        g.narration?.warm(g.reference('3:1'));
        await c.chapter('Act Four', 'That Great City', 'Jonah 3', 2.6);
        g.music.still(0.4);
        // on the dry land, the sea behind him; and the word comes the second time
        c.freeze(true);
        g.view({ from: [...P(153.4, AT_SEA.shore.v - 6.5), 1.5], to: [...P(160, AT_SEA.shore.v + 2), 0.9] });
        await c.fade(0, 2);
        await c.verse('3:1');
        await verse(c, '3:2');
        g.view(null);
        c.freeze(false);
        kneel(false);
        // The way is marked, as it was before.
        c.objective('Arise, go to Nineveh.');
        const inland = P(158, -22);
        const went = c.reach(...inland, 4);
        await c.until(() => uv(me())[1] < 4);
        lineOf(c, '3:3-a');
        await went;
        c.objective(null);
        await c.fade(1, 1.2);
        g.music.still(0);
      },
    },
    {
      id: 'a4-city',
      label: 'Act Four',
      scene: true,
      setup() {
        reset({ hour: 8.4, place: 'land', as: 'nineveh', stand: P(GATE[0] - 44, 0), face: gateOut });
        multitudes();
        ninevites();
        enthroned();
      },
      async run(c) {
        await c.fade(0, 1.6);
        lineOf(c, '3:3-b');
        // "And Jonah began to enter into the city a day's journey, and he cried" (3:4): in three places, deeper into
        // the city each time, as the day goes on.
        const list = (n) => PLACES.map((place, i) => ({ label: place.name, done: i < n }));
        for (let n = 0; n < PLACES.length; n++) {
          const place = PLACES[n];
          c.objective(n ? 'Go on into the city, and cry against it.' : 'Enter into the city, and cry against it.', list(n));
          await c.reach(...place.at, 6, { via: place.via });
          if (n === 0) lineOf(c, '3:4-a');
          await c.act(...place.at, 3.4, 'Cry against the city');
          for (const i of place.folk) who(folk[i]).face(...me());
          if (n === 0) await part(c, '3:4-said');
          else lineOf(c, '3:4-said');
          g.music.pluck();
          await c.wait(g.auto ? 0.3 : 1.4);
          // what the place does, as the verse tells it (3:5), a part at a time
          if (n === 0) {
            for (const i of place.folk) who(folk[i]).kneel = 1;
            await lineOf(c, '3:5-a');
          } else {
            if (n === 1) await lineOf(c, '3:5-b');
            // (sackcloth: on this place, and on those that heard him before it)
            const put = over(c, 3.5, (k) => {
              for (let i = 0; i <= n; i++) crowds[i].sackcloth(i === n || n === 1 ? k : 1);
            });
            await Promise.all([lineOf(c, n === 1 ? '3:5-c' : '3:5-d'), put]);
            for (let i = 0; i <= n; i++) inSackcloth(i);
            if (n === 2) await fill(c, 'believed');
          }
          // (the day goes on)
          if (n < PLACES.length - 1) await sweep(c, 8.4 + n * 2.6, 11 + n * 2.6, g.auto ? 0.8 : 2.5);
        }
        c.objective('Enter into the city, and cry against it.', list(PLACES.length));
        await c.wait(1);
        c.objective(null);
      },
    },
    {
      id: 'a4-king',
      label: 'Act Four',
      setup() {
        reset({ hour: 13.6, place: 'land', as: 'nineveh', stand: PLACES[2].at, face: C(13, -1) });
        multitudes();
        ninevites();
        enthroned();
        for (let i = 0; i < 3; i++) inSackcloth(i);
      },
      async run(c) {
        const king = who('king');
        // "For word came unto the king of Nineveh" (3:6)
        const came = lineOf(c, '3:6-a');
        c.objective('Go to the king’s seat, before his house.');
        await c.reach(...beforeKing, 4.5, { via: [C(13, -1)] });
        c.objective(null);
        await came;
        // he arises from his throne; lays his robe from him; is covered with sackcloth; sits in ashes
        c.freeze(true);
        g.view({ from: [...C(ku - 6.4, -3.4), 2.1], to: [...C(ku + 0.4, 4.4), 1.3] });
        king.seated = 0;
        await c.wait(g.auto ? 0.4 : 1.6);
        const laid = lineOf(c, '3:6-b');
        const down = C(ku, IN_NINEVEH.dais[1] - 0.6);
        const began = c.time;
        const stepping = c.until(() => {
          // (off the dais: he comes down as he goes)
          const cv = uv(at(king))[1] - CITY.at[1];
          king.raise = IN_NINEVEH.daisTall * Math.min(1, Math.max(0, (cv - (IN_NINEVEH.dais[1] - 0.5)) / 0.5));
          return king.mode !== 'walk' && c.time - began > 0.5;
        });
        await king.walk([down], 1.1);
        await stepping;
        king.raise = 0;
        g.props.show('robe', C(ku + 1.2, IN_NINEVEH.dais[1] + 0.7), { up: IN_NINEVEH.daisTall });
        king.w.dress(CLOTHES.kingInSackcloth);
        g.props.show('ashes', ashesAt);
        await king.walk([ashesAt], 1.0);
        king.face(...beforeKing);
        king.sit = 1;
        await laid;
        // his decree (3:7–9); and all the city cries mightily unto God
        await lineOf(c, '3:7-a');
        inSackcloth(3);
        for (const name of ['noble1', 'noble2']) {
          who(name).w.dress(FOLK.sackcloth[0]);
          who(name).kneel = 1;
        }
        await verse(c, '3:8');
        g.view({ from: [...C(ku + 9, 6.5), 4.2], to: [...C(ku - 14, -1), 0.6] });
        for (const crowd of crowds) crowd.fall(g.clock());
        for (const name of folk) Object.assign(who(name), { kneel: 0, bow: 1 });
        g.music.still(0.6);
        await verse(c, '3:9');
        await c.verse('3:10');
        await c.fade(1, 1.6);
        g.view(null);
        c.freeze(false);
        g.music.still(0);
      },
    },

    // ---- Act five: the gourd (Jonah 4) ----
    {
      id: 'a5',
      label: 'Act Five',
      scene: true,
      setup() {
        reset({ hour: 14.6, place: 'land', as: 'sackcloth', stand: C(-50, 0), face: gateIn });
        multitudes();
        ninevites();
        for (let i = 0; i < 4; i++) inSackcloth(i);
        BOUGHS.forEach((p, i) => g.props.show(`bough${i}`, p, { turn: i * 1.3 }));
      },
      async run(c) {
        g.narration?.warm(g.reference('4:1'));
        await c.chapter('Act Five', 'The Gourd', 'Jonah 4', 2.6);
        await c.fade(0, 1.6);
        await c.verse('4:1');
        await fill(c, 'anger');
        await c.verse('4:3');
        await part(c, '4:4-said');
        c.objective('Go out of the city, to the east side of it.');
        lineOf(c, '4:5-a');
        await c.reach(...boothAt, 9, { via: [gateIn, gateOut] });
        // "and there made him a booth" (4:5): of four boughs, brought one at a time
        lineOf(c, '4:5-b');
        const left = BOUGHS.map((p, i) => ({ name: `bough${i}`, at: p }));
        for (let n = 0; n < 4; n++) {
          c.objective('Make a booth: bring boughs to the rise.', [{ label: `Boughs set up: ${n} of 4`, done: false }]);
          left.sort((a, b) => from(a.at) - from(b.at));
          const bough = left.shift();
          await c.act(...bough.at, 1.8, 'Take it up');
          g.props.carry(bough.name, g.player, { out: 0.38, up: 1.0, size: 1, wide: 0.3 });
          g.burden(3.4);
          await c.act(...boothAt, 2.6, 'Set it up');
          g.burden(null);
          g.props.hide(bough.name);
          booth(n + 1);
          g.music.pluck();
        }
        c.objective('Sit under it, in the shadow.');
        await c.act(...boothAt, 2.2, 'Sit in its shadow');
        c.objective(null);
        g.standAt(...boothAt, yawTo(boothAt, cityward));
        g.player.sit = 1;
        await lineOf(c, '4:5-c');
        await c.fade(1, 1.2);
      },
    },
    {
      id: 'a5-gourd',
      label: 'Act Five',
      scene: true,
      setup() {
        reset({ hour: 15.4, place: 'land', as: 'sackcloth', stand: boothAt, face: cityward });
        multitudes();
        for (let i = 0; i < 4; i++) crowds[i].sackcloth(1);
        booth(4);
        g.player.sit = 1;
      },
      async run(c) {
        // seen from before the booth, the city behind the eye
        const before = { from: [...P(AT_SEA.booth[0] + 5.6, AT_SEA.booth[1] - 3.4), 1.5], to: [...P(AT_SEA.booth[0] - 0.4, AT_SEA.booth[1] + 0.3), 1.25] };
        c.freeze(true);
        g.view(before);
        heat.set(0.3);
        await c.fade(0, 1.6);
        // the gourd comes up over him (4:6)
        g.music.still(0.5);
        await Promise.all([lineOf(c, '4:6-a'), over(c, 9, (k) => gourd(k))]);
        heat.set(0);
        await lineOf(c, '4:6-b');
        // the evening, and the night; and when the morning rose the next day, the worm (4:7)
        await sweep(c, 15.4, 19.6, g.auto ? 1 : 5);
        await c.fade(1, 1.4);
        g.music.still(0);
        hour(6.5);
        gourd(0);
        sets.withered.show();
        await c.fade(0, 1.8);
        await c.verse('4:7');
        // the sun arises; a vehement east wind; the sun beats upon his head (4:8)
        g.wind(12);
        g.music.breath(0.5);
        heat.set(0.55);
        await sweep(c, 6.5, 10.6, g.auto ? 1 : 6);
        heat.set(0.8);
        await c.verse('4:8');
        await part(c, '4:9-said');
        await part(c, '4:9-answer');
        g.wind(6);
        heat.set(0.35);
        g.music.breath(0);
        await part(c, '4:10-said');
        // The eye is given back, looking the way it did: away from the city. He is asked to look upon it; and as he
        // does, the LORD's question is read, with which the book ends.
        g.view(null);
        c.freeze(false);
        c.objective('Look upon Nineveh, that great city.');
        await lookToward(c, cityward, { within: 0.3, hold: 1.2 });
        c.objective(null);
        heat.set(0);
        g.music.theme();
        await verse(c, '4:11');
        c.freeze(true);
        g.view({ from: [...P(AT_SEA.booth[0] - 6, AT_SEA.booth[1] + 2.4), 3.4], to: [...P(GATE[0], 0), 6] });
        await c.wait(g.auto ? 0.5 : 4);
        await c.fade(1, 2);
        g.view(null);
        c.freeze(false);
        g.end();
      },
    },
  ];
}
