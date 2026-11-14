// "By Small Means": 1 Nephi 16:9–32, in beats. The ball of curious workmanship, the bow of fine steel that broke, a
// bow made out of wood, and food for their families from the top of the mountain.
//
// It is not told as the first journey is. There is no marker on the land in it: the family has the ball, and so has
// the one who plays (liahona.js). And most of it is done, not read: he follows the spindle, hunts with a bow that is
// truly drawn and loosed (bow.js) at beasts that must be come up with softly (beasts.js, hunt.js), tries boughs for
// one that will make a bow, and goes up a mountain by the heed he gives the ball.
//
// What is said is first-hand and short (spoken-nephi16.js), each line from a verse. The scripture itself is kept,
// word for word and with its reference in gold, where the account turns on it (scripture-nephi16.js): the ball found
// (16:10), the bow broken (16:18), their father's murmuring (16:20, the verse's words and none of his), the voice of
// the Lord (16:26, never retold), the pointers and the writing (16:28–29), the joy and the thanks (16:32), and at
// the end "by small means the Lord can bring about great things" (16:29).
//
// What happens is fixed, as it is written; how he does it is the player's. The steel bow breaks at its first full
// draw of the third act, whatever he aims at. A herd that takes alarm is gone to other ground, and is found again.
// An arrow that misses is taken up again. Nothing he does changes the account.
//
// What is shown follows the text and how a family would want it told. Of the hunt: an arrow in the air, and a beast
// lying where it fell; nothing more. What was written on the ball is not given, and none is made up: it is shown as
// marks of light that are no letters. The text does not say what the wild beasts were, nor name the mountain; they
// are drawn as the wild goats of that country, on a mountain of its kind.
import * as THREE from 'three';
import { reachArm } from '../figure/hold.js';
import { createBeasts } from './beasts.js';
import { createBow } from './bow.js';
import { ground, IN_LEMUEL, lemuelCamp, PART, tent } from './city.js';
import { createHunt } from './hunt.js';
import { createLiahona } from './liahona.js';
import { LEMUEL, WILD } from './places.js';
import { BLANKS, EXCERPTS, SAID } from './scripture-nephi16.js';
import { ball, cone, limb, part, solidMaterial } from './solid.js';
import { BOOK, SPOKEN } from './spoken-nephi16.js';
import { CLOTHES as FIRST } from './story.js';
import { telling } from './telling.js';

// They are dressed as in the first journey (story.js): the same family, some months on.
export const CLOTHES = { laman: FIRST.laman, lemuel: FIRST.lemuel, sam: FIRST.sam, lehi: FIRST.lehi, sariah: FIRST.sariah };
export const PEOPLE = [
  ['laman', 'laman', true],
  ['lemuel', 'lemuel', true],
  ['sam', 'sam', false],
  ['lehi', 'lehi', true],
  ['sariah', 'sariah', false, 0.93],
];
export const NAMES = { you: 'Nephi', laman: 'Laman', lemuel: 'Lemuel', sam: 'Sam', lehi: 'Lehi', sariah: 'Sariah' };
/** The rest of the camp (the household of Ishmael, Zoram, their wives: 16:7): the ten the game always has, who say nothing. */
const HOUSEHOLD = ['town0', 'town1', 'town2', 'town3', 'town4', 'town5'];

/**
 * The wilderness has no city: only the story's own sets stand in it (the tents). A look must still name a room and
 * build something, so it builds one small stone under the ground, far from anywhere he walks.
 */
export const LOOK = {
  name: 'wilderness',
  bare: true,
  stone: [0.84, 0.74, 0.56],
  plasters: [[0.84, 0.74, 0.56]],
  inside() {},
  outside(b) {
    b.box(-0.2, 0.2, 479.8, 480.2, -60, -59.6, { part: PART.STONE, colour: [0.5, 0.5, 0.5], solid: false });
  },
  rooms: { none: { u: 0, v: 480, half: [0.1, 0.1], up: 1, reach: 0.01, shade: 0 } },
  room: 'none',
};
/** No town: the people of the camp are placed by the story. */
export const town = () => ({ day() {}, night() {}, watch() {} });

/** The tents of the camp in the wilderness, about WILD.camp: their father's, and four more round a ring of stones. */
const CAMP_TENTS = [
  [-11, -14, 0.3],
  [-12, 13, -0.3],
  [-1, -21, 1.25],
  [0, 20, -1.25],
];
const FIRE = [4, 0];
function wildCamp(b, random) {
  const [cu, cv] = WILD.camp.at;
  tent(b, cu - 9, cv, 7.4, 5.6, 2.9, 0);
  for (const [du, dv, turn] of CAMP_TENTS) tent(b, cu + du, cv + dv, 5.2, 4.0, 2.2, turn);
  // a cloth before their father's tent, and jars by it
  const base = ground(cu - 3.6, cv);
  b.box(cu - 4.8, cu - 2.4, cv - 1.5, cv + 1.5, base - 0.2, base + 0.06, { part: PART.CLOTH, colour: [0.5, 0.3, 0.2], seed: 0.59, base, solid: false, roofPart: PART.CLOTH, roofColour: [0.56, 0.34, 0.22] });
  for (const [du, dv, r, h] of [[-5.4, 3.4, 0.3, 0.95], [-4.7, 3.9, 0.24, 0.72], [-5.5, -3.5, 0.28, 0.85]]) {
    const y = ground(cu + du, cv + dv);
    b.turned(cu + du, cv + dv, y - 0.1, [[r * 0.55, 0], [r, h * 0.45], [r * 0.9, h * 0.8], [r * 0.5, h], [r * 0.62, h + 0.08]], 8, PART.PLASTER, [0.62, 0.4, 0.26], 0.3 + random() * 0.4);
  }
  // the fire: a ring of stones, and the ash within it
  const [fu, fv] = [cu + FIRE[0], cv + FIRE[1]];
  const fy = ground(fu, fv);
  b.box(fu - 0.5, fu + 0.5, fv - 0.5, fv + 0.5, fy - 0.2, fy + 0.04, { part: PART.STONE, colour: [0.2, 0.18, 0.17], seed: 0.2, base: fy, solid: false, roofPart: PART.STONE, roofColour: [0.16, 0.15, 0.15] });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + random() * 0.2;
    const [u, v] = [fu + Math.cos(a) * 0.74, fv + Math.sin(a) * 0.74];
    const r = 0.13 + random() * 0.06;
    const h = 0.14 + random() * 0.08;
    const tone = 0.34 + random() * 0.12;
    // (a stone of the wadi, rounded: broad at the foot, drawn in at the top)
    b.turned(u, v, fy - 0.06, [[r * 0.8, 0], [r, h * 0.45], [r * 0.82, h * 0.85], [r * 0.4, h + 0.03]], 6, PART.STONE, [tone + 0.04, tone, tone - 0.05], random());
  }
}

const SACK = [0.7, 0.6, 0.42];
const SACK_DARK = [0.46, 0.38, 0.26];
const BASKET = [0.62, 0.46, 0.26];
const BREAD = [0.8, 0.64, 0.4];
const BARK = [0.42, 0.31, 0.2];
const BARK_GREY = [0.52, 0.48, 0.42];
const LEAF = [0.36, 0.5, 0.26];
const PEBBLE = [0.6, 0.57, 0.52];

export function story(g) {
  const { P } = g;
  const yawTo = ([x0, z0], [x1, z1]) => Math.atan2(x1 - x0, z1 - z0);
  const who = (name) => g.cast.get(name);
  const at = (npc) => [npc.x, npc.z];
  const me = () => [g.player.x, g.player.z];
  const from = ([x, z]) => Math.hypot(g.player.x - x, g.player.z - z);
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const { part: card, verse, fill } = telling(g, { EXCERPTS, BLANKS, SAID });
  const told = (key) => ({ voice: SPOKEN[key].voice, from: `${BOOK} ${SPOKEN[key].from}` });
  /** Face to face: a card under the speaker's name. */
  const say = (c, key) => c.said(SPOKEN[key].who, SPOKEN[key].text, told(key));
  /** As they go: a line low on the screen under the speaker's name, which stops no one. */
  const bark = (c, key) => c.aside(SPOKEN[key].who, SPOKEN[key].text, told(key));
  /** A few such lines one after another; `stop()` says no more of them. */
  function talk(c, lines, { first = 0, gap = 0.7 } = {}) {
    let stopped = false;
    const done = (async () => {
      if (first) await c.wait(first);
      for (const key of lines) {
        if (stopped) return;
        await bark(c, key);
        await c.wait(gap);
      }
    })();
    done.stop = () => void (stopped = true);
    return done;
  }
  /** What to do, said plainly low on the screen for a few seconds (how a thing is done: not a line of the story). */
  const how = (text, seconds = 7) => g.ui.toast(text, '', seconds);

  // ---- the new things of this journey ----
  const beasts = createBeasts(g.scene, g.field, g.heightAt, { count: 5 });
  const bow = createBow(g, beasts);
  const ball_ = createLiahona(g);
  const hunt = createHunt(g, beasts, bow, ball_);
  // (for tests and stills: window.__tg.g.wild)
  g.wild = { beasts, bow, ball: ball_, hunt };
  /** Where he is, for a beast borne on his shoulders. */
  const bearer = () => ({ x: g.player.x, y: g.heightAt(g.player.x, g.player.z), z: g.player.z, yaw: g.player.yaw });
  /**
   * His hands on the legs of the beast he bears, where they hang before his shoulders (the hand that has a bow keeps
   * the bow). It is laid over whatever else the story does with his arms, and taken off again.
   */
  const grip = new THREE.Vector3();
  const elbowTo = new THREE.Vector3();
  function hold(on) {
    const now = g.player.pose;
    if (!on) {
      if (now?.bearing) g.player.pose = now.under;
      return;
    }
    if (now?.bearing) return;
    const under = now;
    g.player.pose = Object.assign(
      (bones, object, yaw, dt) => {
        under?.(bones, object, yaw, dt);
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const y = g.heightAt(g.player.x, g.player.z);
        for (const [side, s] of [['l', 1], ['r', -1]]) {
          if (side === 'l' && bow.state.kind) continue;
          grip.set(g.player.x + fz * 0.3 * s + fx * 0.25, y + 1.34, g.player.z - fx * 0.3 * s + fz * 0.25);
          reachArm(bones, side, grip, elbowTo.set(fz * s * 0.7, -1, -fx * s * 0.7), 1);
        }
      },
      { bearing: true, under },
    );
  }

  // ---- small things of the camp and of the wood, painted as the people are (solid.js) ----
  const paint = solidMaterial(g.field);
  const things = [];
  function thing(geometry, material = paint) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    g.scene.add(mesh);
    const t = {
      mesh,
      at: [0, 0],
      put([x, z], { up = 0, turn = 0 } = {}) {
        t.at = [x, z];
        mesh.position.set(x, g.heightAt(x, z) + up, z);
        mesh.rotation.set(0, turn, 0);
        mesh.visible = true;
        return t;
      },
      hide() {
        mesh.visible = false;
        return t;
      },
    };
    things.push(t);
    return t;
  }
  const sacks = thing(
    part(
      ball(0.25, SACK, 5, { at: [0, 0.2, 0], scale: [1, 0.86, 1] }),
      cone(0.07, 0.14, SACK_DARK, 2, { at: [0, 0.46, 0] }),
      ball(0.21, SACK, 5, { at: [0.44, 0.17, 0.12], scale: [1, 0.86, 1] }),
      cone(0.06, 0.12, SACK_DARK, 2, { at: [0.44, 0.39, 0.12] }),
      ball(0.18, SACK, 5, { at: [0.16, 0.14, -0.38], scale: [1.2, 0.8, 1] }),
    ),
  );
  const provisions = thing(
    part(
      limb(0.27, 0.2, 0.3, BASKET, 5, { at: [0, 0.15, 0] }),
      ...[[0, 0.3, 0], [0.11, 0.33, 0.07], [-0.1, 0.32, -0.06]].map((p) => ball(0.1, BREAD, 4, { at: p, scale: [1.2, 0.6, 1] })),
      limb(0.2, 0.15, 0.24, BASKET, 5, { at: [0.5, 0.12, 0.15] }),
      // a skin of water, lying by them
      ball(0.16, SACK_DARK, 2, { at: [-0.42, 0.13, 0.2], scale: [1.5, 0.8, 0.9] }),
    ),
  );
  /** Three young boughs standing in the wood: one dry, one too stout, one that springs. Each is turned about its foot. */
  const bough = (thick, colour, leaves) =>
    thing(
      part(
        limb(thick * 0.45, thick, 2.1, colour, 5, { at: [0, 1.05, 0] }),
        ...(leaves ? [[0.08, 1.9, 0.02], [-0.1, 1.62, 0.05], [0.03, 2.1, -0.04], [0.11, 1.4, -0.06], [-0.08, 1.2, -0.03]].map((p) => ball(0.12, LEAF, 1, { at: p, scale: [1.4, 0.6, 1] })) : []),
      ),
    );
  const boughs = [
    Object.assign(bough(0.03, BARK_GREY, false), { kind: 'dry' }),
    Object.assign(bough(0.06, BARK, true), { kind: 'stiff' }),
    Object.assign(bough(0.032, BARK, true), { kind: 'springs' }),
  ];
  const stick = thing(part(limb(0.011, 0.013, 0.86, [0.66, 0.54, 0.36], 5, { at: [0, 0.03, 0], turn: [0, 0, Math.PI / 2] })));
  const pebbles = thing(part(...[[0, 0, 0], [0.16, 0, 0.1], [-0.1, 0, 0.17], [0.05, 0, -0.16], [-0.18, 0, -0.07]].map(([x, , z], i) => ball(0.055 + (i % 3) * 0.012, PEBBLE, i % 2 ? 0 : 4, { at: [x, 0.03, z], scale: [1.2, 0.6, 1] }))));
  // the fire in its ring of stones: brands laid across, and a flame that has its own light and is never still
  const FLAME = [1, 0.5, 0.14];
  const FLAME_PALE = [1, 0.82, 0.36];
  const BRAND = [0.2, 0.15, 0.12];
  const brands = thing(part(...[0.3, 1.5, 2.6].map((a, i) => limb(0.05, 0.06, 1.0, BRAND, 5, { at: [0, 0.09 + i * 0.05, 0], turn: [0, a, Math.PI / 2 - 0.12] }))));
  const flame = thing(
    part(
      cone(0.24, 0.72, FLAME, 2, { at: [0, 0.5, 0] }),
      cone(0.15, 0.5, FLAME, 2, { at: [0.17, 0.4, 0.07], turn: [0, 0, -0.2] }),
      cone(0.14, 0.44, FLAME, 2, { at: [-0.15, 0.37, -0.1], turn: [0, 0, 0.22] }),
      cone(0.12, 0.42, FLAME_PALE, 4, { at: [0, 0.4, 0.03] }),
    ),
    solidMaterial(g.field, { glint: 1.5 }),
  );
  let flicker = 0;
  g.each((dt) => {
    if (!flame.mesh.visible) return;
    flicker += dt;
    const k = 0.5 + 0.5 * Math.sin(flicker * 11) * Math.sin(flicker * 6.3 + 1);
    flame.mesh.scale.set(0.92 + 0.14 * Math.sin(flicker * 8.1), 0.86 + 0.3 * k, 0.92 + 0.14 * Math.cos(flicker * 7.2));
    flame.mesh.rotation.y = flicker * 1.7;
  });
  /** The bough he cut, lying before him as he works it. */
  const cut = thing(part(limb(0.014, 0.03, 1.5, BARK, 5, { at: [0, 0.04, 0], turn: [0, 0, Math.PI / 2] })));

  // ---- the places ----
  const valley = g.set(lemuelCamp);
  const tents = g.set(wildCamp);
  const L = (du, dv) => P(LEMUEL.at[0] + du, LEMUEL.at[1] + dv);
  const beforeTent = L(IN_LEMUEL.tent[0] + 7.8, 0.4);
  const bySariah = L(IN_LEMUEL.tent[0] + 5.6, 3.6);
  const atDoor = L(IN_LEMUEL.tent[0] + 5.4, -0.2);
  const brothersTents = L(-2.5, -15);
  const overRiver = L(30, -40);
  // the camp in the wilderness: its middle, the fire, their father's place before his tent
  const [cu, cv] = WILD.camp.at;
  const K = (du, dv) => P(cu + du, cv + dv);
  const fire = K(...FIRE);
  const byFire = K(FIRE[0] + 1.9, 0.6);
  const lehiPlace = K(-2.2, 0.4);
  const sariahPlace = K(-3.2, 3.4);
  const apart = K(-4.5, -8.5);
  const campEdge = K(22, -3);
  // the green way the ball leads along, and the feeding grounds by it
  const green = WILD.green[0][0].map(([u, v]) => P(u, v));
  const wayGround = P(...WILD.grounds.way);
  const northGround = P(...WILD.grounds.north);
  const top = P(...WILD.grounds.top);
  const wood = P(...WILD.wood);
  // (the edge of the wood nearest the tents, where the young boughs stand in the open: `along` metres out from its
  // middle towards the camp, `across` to one side)
  const woodEdge = (along, across) => {
    const to = P(cu + 10, cv + 6);
    const d = Math.hypot(to[0] - wood[0], to[1] - wood[1]);
    const [ax, az] = [(to[0] - wood[0]) / d, (to[1] - wood[1]) / d];
    return [wood[0] + ax * along + az * across, wood[1] + az * along - ax * across];
  };
  const trail = WILD.trail.map(([u, v]) => P(u, v));
  const foot = trail[0];
  /** A way in short steps (every 12 m or so), for the autopilot: so that it keeps to the middle of a trail cut in a flank. */
  const steps = (line) =>
    line.flatMap((p, i) => {
      if (!i) return [[p[0], p[1], 3]];
      const n = Math.max(1, Math.round(Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) / 12));
      return Array.from({ length: n }, (_, k) => [...lerp(line[i - 1], p, (k + 1) / n), 3]);
    });

  /** The three brothers, standing about a place and facing a point. */
  function brothersAt([x, z], face, spots = [[-2.4, 1.2], [-1.2, 2.8], [1.8, 2.2]]) {
    ['laman', 'lemuel', 'sam'].forEach((name, i) => {
      const p = [x + spots[i][0], z + spots[i][1]];
      who(name).place(p[0], p[1], yawTo(p, face)).face(...face);
    });
  }
  /** The three keep up with Nephi, Sam nearest. */
  function followMe() {
    who('sam').follow(g.player, 2.6, 1.2);
    who('laman').follow(g.player, 4.0, -1.5);
    who('lemuel').follow(g.player, 5.2, 1.7);
  }
  /** The camp in the wilderness: their father and mother before his tent, the household about the tents. */
  function camp({ weary = false, face = fire, lit = true } = {}) {
    brands.put(fire);
    if (lit) flame.put(fire);
    who('lehi').place(...lehiPlace, yawTo(lehiPlace, face)).face(...face);
    who('sariah').place(...sariahPlace, yawTo(sariahPlace, face)).face(...face);
    const spots = [[-7, -11], [-8.5, 10.5], [1.5, -16], [3, 15.5], [-6.5, 8], [0.5, -13.5]];
    HOUSEHOLD.forEach((name, i) => {
      const p = K(...spots[i]);
      const npc = who(name).place(p[0], p[1], yawTo(p, fire));
      npc.face(...fire);
      npc.sit = weary || i % 2 ? 1 : 0;
    });
  }
  function reset({ hour, stand, face, lemuel = false, pitched = false, have = true }) {
    g.cast.clear();
    for (const npc of g.cast.people.values()) Object.assign(npc, { sit: 0, kneel: 0, bow: 0, seated: 0, open: 0, holds: null });
    g.props.reset();
    valley.show(lemuel);
    tents.show(pitched);
    g.land(true, { city: false });
    g.setHour(hour);
    g.dress('nephi');
    g.view(null);
    g.guidance.lead(null);
    g.guidance.shine(null);
    g.music.stop();
    g.sounds.hush(0);
    g.burden(null);
    g.hurry(false);
    Object.assign(g.player, { kneel: 0, sit: 0, seated: 0, face: null });
    hunt.stop();
    beasts.clear();
    bow.take(null);
    ball_.reset();
    ball_.show(have);
    for (const t of things) t.hide();
    g.standAt(stand[0], stand[1], yawTo(stand, face));
  }
  /**
   * He goes where the ball points: to a place, along a way (`via`, which the spindle leads along and the autopilot
   * walks). Nothing is marked. Resolves when he is within `r` of the place.
   */
  async function follow(c, place, r, { via = [], unless = null } = {}) {
    ball_.point(via.length ? [...via, place] : place);
    const there = await c.reach(place[0], place[1], r, { via: via.map(([x, z]) => [x, z, 12]), mark: false, unless });
    return there;
  }
  /** Asks until he answers as it is written; what follows another answer is a thought. With ?wrong a test answers wrongly first. */
  async function ask(c, question, answers, right, otherwise) {
    for (let tries = 0; ; tries++) {
      const took = await c.choice(question, answers, { auto: g.flag('wrong') && tries === 0 ? (right + 1) % answers.length : right });
      if (took === right) return;
      await c.thought(otherwise[took]);
    }
  }
  /** Something done by holding (E, a finger on the prompt) until it is done: the bar fills, and empties slowly if he lets go. */
  async function work(c, label, seconds) {
    let k = 0;
    let t = c.time;
    await c.until(() => {
      const dt = c.time - t;
      t = c.time;
      k = c.holding ? Math.min(1, k + dt / seconds) : Math.max(0, k - dt * 0.4);
      c.prompt(label, k);
      return k >= 1;
    });
    c.prompt(null);
    g.music.pluck();
  }
  /** He walks up to a beast that lies where it fell, and takes it up on his shoulders. */
  async function takeUp(c, b, slot) {
    await c.act(b.x, b.z, 2.6, 'Take up the beast', { mark: false });
    beasts.bear(b, bearer, slot);
    hold(true);
    g.music.thud(0.5);
  }

  return [
    // ---- Act One: a round ball of curious workmanship (16:9–12) ----
    {
      id: 'a1',
      label: 'Act One',
      scene: true,
      setup() {
        reset({ hour: 7.2, stand: L(7, -24), face: atDoor, lemuel: true, have: false });
        who('lehi').place(...beforeTent, yawTo(beforeTent, atDoor)).face(...atDoor);
        who('sariah').place(...bySariah, yawTo(bySariah, atDoor)).face(...atDoor);
        brothersAt(brothersTents, beforeTent);
        ball_.lie(atDoor);
        provisions.put(L(-1.6, 7.2), { turn: 0.6 });
        sacks.put(L(-5.2, -8.6), { turn: 2.2 });
      },
      async run(c) {
        await c.fade(0, 2);
        await c.chapter('Act One', 'A Round Ball of Curious Workmanship', 'The valley of Lemuel · 1 Nephi 16');
        const lehi = who('lehi');
        const sariah = who('sariah');
        bark(c, 'call');
        c.objective('Go to your father, at the door of his tent.');
        await c.act(...at(lehi), 3.6, 'Speak with your father');
        c.objective(null);
        lehi.face(...me());
        g.shoulder(at(lehi), { back: 3.6, up: 2.1, look: 1.4 });
        await say(c, 'voice');
        await say(c, 'found');
        // the ball, on the ground at the tent door
        g.view({ from: [atDoor[0] + 2.2, atDoor[1] - 1.6, 1.1], to: [...atDoor, 0.12] });
        await card(c, '16:10-a');
        g.view(null);
        lehi.face(...atDoor);
        c.objective('Take up the ball.');
        await c.act(...atDoor, 2.4, 'Take up the ball');
        c.objective(null);
        ball_.lie(null);
        ball_.show(true);
        g.music.chime();
        // he looks upon it: two spindles
        ball_.open();
        await say(c, 'brass');
        await fill(c, 'spindles');
        ball_.close();
        lehi.face(...me());
        await say(c, 'points');
        await say(c, 'gatherall');
        // "we did gather together whatsoever things we should carry … and we did take seed of every kind" (16:11)
        const gather = [
          { thing: provisions, label: 'Our provisions', act: 'Gather the provisions', done: false },
          { thing: sacks, label: 'Seed of every kind', act: 'Gather the seed', done: false },
        ];
        // (their mother is by the seed; his brothers go to the tents)
        sariah.walk([lerp(sacks.at, bySariah, 0.25)], 1.6).then(() => sariah.face(...sacks.at));
        const list = () => c.objective('Gather what we will carry into the wilderness.', gather.map(({ label, done }) => ({ label, done })));
        list();
        while (gather.some((x) => !x.done)) {
          // (whichever he comes to first; the autopilot takes them in turn)
          const left = gather.filter((x) => !x.done);
          let took = null;
          c.lead({ x: left[0].thing.at[0], z: left[0].thing.at[1], r: 1.6, mark: false });
          await c.until(() => {
            const near = left.find((x) => from(x.thing.at) < 2.6);
            c.prompt(near && !g.frozen ? near.act : null);
            if (near && (c.pressed || g.auto)) took = near;
            return !!took;
          });
          c.prompt(null);
          c.lead(null);
          took.done = true;
          took.thing.hide();
          g.music.pluck();
          list();
          if (took.thing === sacks) bark(c, 'seed');
          else bark(c, 'whatnext');
        }
        await c.wait(0.8);
        c.objective(null);
        await card(c, '16:10-b');
        // across the river Laman, as the spindle points (16:12)
        ball_.point(overRiver);
        c.objective('Follow the spindle of the ball.');
        how('The ball is at the corner of the picture. Turn till its bright spindle points up: that is the way.', 9);
        await c.until(() => from(atDoor) > 9 || g.auto);
        bark(c, 'across');
        followMe();
        lehi.follow(g.player, 6.5, -2.4);
        sariah.follow(g.player, 7.5, 2.6);
        const crossing = c.until(() => from(overRiver) < 22).then(() => c.line(g.verses('16:12'), g.reference('16:12')));
        await c.reach(...overRiver, 6, { mark: false });
        await crossing;
        c.objective(null);
        await c.fade(1, 1.6);
      },
    },

    // ---- Act Two: the more fertile parts (16:13–17) ----
    {
      id: 'a2',
      label: 'Act Two',
      scene: true,
      setup() {
        const start = lerp(green[0], green[1], 0.3);
        reset({ hour: 9.6, stand: start, face: green[1] });
        brothersAt([start[0] - 3, start[1] - 4], green[1]);
        bow.take('steel');
        beasts.herd(wayGround, { n: 4, to: [P(214, -140), P(170, -128), P(224, -182)], spread: 7 });
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Act Two', 'The More Fertile Parts', '1 Nephi 16:13–17');
        followMe();
        c.objective('Follow the ball through the wilderness.');
        c.line(g.verses('16:13'), g.reference('16:13'));
        const going = talk(c, ['green', 'water', 'game'], { first: 9 });
        // along the green way, to where the feeding ground can be seen
        const stop = lerp(green[2], green[3], 0.05);
        await follow(c, stop, 9, { via: [green[1]] });
        going.stop();
        for (const name of ['laman', 'lemuel', 'sam']) who(name).stop().face(...wayGround);
        await card(c, '16:14-a');
        await say(c, 'there');
        await say(c, 'bestill');
        c.objective('Come up with the beasts softly, and draw your bow.');
        how(g.ui.touch ? 'Hold the prompt to draw. Look along the arrow. Let go to loose.' : 'Hold E to draw. Look along the arrow. Let go to loose.', 9);
        const [fell] = await hunt.run(c, { need: 1 });
        c.objective('Take up the beast.');
        ball_.point(at(fell));
        await takeUp(c, fell, 0);
        g.burden(3.6);
        c.objective('Bear it back to your brethren.');
        const sam = who('sam');
        await follow(c, at(sam), 5);
        g.burden(null);
        c.objective(null);
        for (const name of ['laman', 'lemuel', 'sam']) who(name).face(...me());
        await say(c, 'food');
        await say(c, 'fineshot');
        await c.card(g.verses('16:16'), g.reference('16:16'));
        // and on, the same direction
        beasts.lay(fell, sam.x + 0.8, sam.z + 0.6, 1);
        hold(false);
        bark(c, 'pointson');
        followMe();
        c.objective('Follow the ball.');
        await follow(c, lerp(green[3], green[4], 0.2), 8);
        c.objective(null);
        await c.fade(1, 1.6);
      },
    },

    // ---- Act Three: my bow, which was made of fine steel (16:17–22) ----
    {
      id: 'a3',
      label: 'Act Three',
      scene: true,
      setup() {
        reset({ hour: 15.8, stand: K(9, 3), face: lehiPlace, pitched: true });
        camp({ weary: true });
        brothersAt(K(10, -5), lehiPlace);
        bow.take('steel');
        beasts.herd(northGround, { n: 4, to: [P(150, 152), P(198, 98), P(176, 164)], spread: 7 });
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Act Three', 'My Bow, Which Was Made of Fine Steel', '1 Nephi 16:17–22');
        const lehi = who('lehi');
        c.line(g.verses('16:17'), g.reference('16:17'));
        c.objective('Speak with your father.');
        await c.act(...at(lehi), 3.6, 'Speak with your father');
        c.objective(null);
        g.shoulder(at(lehi), { back: 3.6, up: 2.1, look: 1.4 });
        await say(c, 'rest');
        await say(c, 'weary');
        g.view(null);
        followMe();
        c.objective('Follow the ball, and find food for your families.');
        const going = talk(c, ['soft', 'minealso', 'yours'], { first: 8 });
        // up the green way to the north, to within sight of the feeding ground
        const sight = lerp(green[8], green[9], 0.0);
        const via = [green[6], green[7]];
        ball_.point([...via, sight, northGround]);
        await c.reach(...sight, 60, { via: via.map(([x, z]) => [x, z, 12]), mark: false, unless: () => from(northGround) < 66 });
        going.stop();
        for (const name of ['laman', 'lemuel', 'sam']) who(name).stop().face(...northGround);
        c.objective('Come up with the beasts softly, and draw your bow.');
        // "behold, I did break my bow, which was made of fine steel" (16:18): as it comes to full draw
        bow.willBreak();
        await hunt.run(c, { need: 1, unless: () => bow.broken });
        c.objective(null);
        beasts.startle(g.player);
        c.freeze(true);
        await c.wait(1.1);
        c.freeze(false);
        await say(c, 'broken');
        await card(c, '16:18-a');
        // his brethren come up, angry
        followMe();
        await c.hold(c.wait(1.6));
        for (const name of ['laman', 'lemuel', 'sam']) who(name).face(...me());
        g.shoulder(at(who('laman')), { back: 3.2, up: 2.0, look: 1.4 });
        await say(c, 'angry');
        await card(c, '16:18-b');
        await say(c, 'takemine');
        g.view(null);
        // "their bows having lost their springs" (16:21): he tries one
        bow.take('limp');
        g.eye.turn(yawTo(me(), beasts.middle() ?? northGround), 0.1);
        c.objective('Try your brother’s bow.');
        bow.ready(c, true, { any: true });
        await c.until(() => !!bow.takeMissed() || !!bow.takeStruck());
        bow.ready(c, false);
        c.objective(null);
        await c.hold(c.wait(0.6));
        await say(c, 'yousee');
        await card(c, '16:21-b');
        bow.take(null);
        await say(c, 'nofood');
      },
    },
    // back to the tents without food; and they murmur, and their father also (16:19–22)
    {
      id: 'a3-back',
      label: 'Act Three',
      setup() {
        const stand = lerp(green[8], green[9], 0.4);
        reset({ hour: 18.8, stand, face: green[7], pitched: true });
        camp({ weary: true });
        brothersAt([stand[0] + 2, stand[1] - 3], green[7]);
      },
      async run(c) {
        g.setHour(18.8);
        g.burden(3.0);
        const [laman, lemuel, sam, lehi, sariah] = ['laman', 'lemuel', 'sam', 'lehi', 'sariah'].map(who);
        // his brethren go before him, back the way they came; Sam keeps by him
        const home = [green[7], green[6], campEdge, K(11, -4)];
        laman.walk(home, 2.7).then(() => laman.face(...fire));
        lemuel.walk(home.map(([x, z]) => [x + 1.6, z + 1.2]), 2.6).then(() => lemuel.face(...fire));
        sam.follow(g.player, 2.4, 1.2);
        c.objective('Return to the tents.');
        c.line(g.verses('16:19'), g.reference('16:19'));
        // (the ball: as they murmur, its spindles fall loose)
        const murmur = (async () => {
          await c.wait(9);
          await bark(c, 'neverleft');
          ball_.dead(true);
          await c.wait(1);
          await bark(c, 'hungry');
          await c.wait(1.5);
          await bark(c, 'heart');
        })();
        ball_.point([green[7], green[6], campEdge]);
        await c.reach(...K(12, -1), 8, { via: [green[7], green[6], campEdge].map(([x, z]) => [x, z, 12]), mark: false });
        await murmur;
        ball_.dead(true);
        g.burden(null);
        c.objective(null);
        g.setHour(19.7, true);
        // their mother comes to meet him
        await sariah.walk([lerp(at(sariah), me(), 0.7)], 1.7);
        sariah.face(...me());
        g.shoulder(at(sariah), { back: 3.4, up: 2.0, look: 1.4 });
        await say(c, 'nothing');
        // and their father: apart, sitting, his face from them. The verse says it; he is given no words.
        lehi.place(...apart, yawTo(fire, apart));
        lehi.sit = 1;
        await c.hold(c.wait(0.4));
        g.view({ from: [apart[0] + 5.2, apart[1] + 3.4, 1.7], to: [...apart, 0.9] });
        await c.card(EXCERPTS['16:20-b'].text, g.reference('16:20'), { voice: EXCERPTS['16:20-b'].voice });
        g.view(null);
        // "I, Nephi, did speak much unto my brethren, because they had hardened their hearts again" (16:22)
        c.objective('Speak to your brethren.');
        await c.act(...at(laman), 4, 'Speak to your brethren');
        c.objective(null);
        for (const npc of [laman, lemuel, sam]) npc.face(...me());
        g.shoulder(at(laman), { back: 3.4, up: 2.0, look: 1.4 });
        await say(c, 'harden');
        g.view(null);
        await c.fade(1, 1.8);
      },
    },

    // ---- Act Four: out of wood a bow (16:23–29) ----
    {
      id: 'a4',
      label: 'Act Four',
      scene: true,
      setup() {
        reset({ hour: 7.6, stand: K(8, 4), face: K(20, 20), pitched: true });
        camp({ weary: true });
        who('lehi').place(...apart, yawTo(fire, apart)).sit = 1;
        who('laman').place(...K(12, -7), 2).sit = 1;
        who('lemuel').place(...K(13.5, -5), 2.4).sit = 1;
        const p = K(10, 6);
        who('sam').place(p[0], p[1], yawTo(p, K(8, 4)));
        ball_.dead(true);
        // three boughs in the wood, a straight stick under them, and stones in the wadi's bed
        boughs[0].put(woodEdge(10, -5.5));
        boughs[1].put(woodEdge(11.5, 0.5));
        boughs[2].put(woodEdge(10, 6));
        for (const b of boughs) b.mesh.rotation.set(0, 0, 0);
        stick.put(woodEdge(8.5, 2.5), { turn: 0.8 });
        pebbles.put(lerp(woodEdge(10, 0), byFire, 0.5));
      },
      async run(c) {
        await c.fade(0, 1.8);
        await c.chapter('Act Four', 'Out of Wood a Bow', '1 Nephi 16:23–29');
        const sam = who('sam');
        sam.face(...me());
        await say(c, 'make');
        await say(c, 'trees');
        // Sam shows the way (the ball does not point): he goes before, to the trees
        const edge = woodEdge(13.5, -2);
        sam.walk([lerp(K(10, 6), edge, 0.5), edge], 3.4).then(() => sam.face(...wood));
        c.objective('Go with Sam to the trees.');
        await c.reach(...woodEdge(12, 0), 6, { mark: false, via: [[...lerp(K(10, 6), edge, 0.5), 12]] });
        // ---- a bough that will make a bow: he bends them, and one springs ----
        c.objective('Find a bough that bends and springs back.');
        how(g.ui.touch ? 'Stand by a bough, and hold the prompt to bend it.' : 'Stand by a bough, and hold E to bend it.', 8);
        const tried = new Set();
        const order = g.flag('wrong') ? [0, 1, 2] : [2];
        let found = false;
        let k = 0;
        let t = c.time;
        let last = null;
        while (!found) {
          const next = boughs[order.find((i) => !tried.has(boughs[i])) ?? 2];
          c.lead({ x: next.at[0], z: next.at[1], r: 1.5, mark: false });
          let done = null;
          await c.until(() => {
            const dt = c.time - t;
            t = c.time;
            const near = boughs.find((b) => b.mesh.visible && !tried.has(b) && from(b.at) < 2.3);
            if (near !== last) k = 0;
            last = near;
            if (!near || g.frozen) {
              c.prompt(null);
              return false;
            }
            k = c.holding ? Math.min(1, k + dt / 1.2) : Math.max(0, k - dt * 3);
            c.prompt('Bend the bough', k);
            // how each takes it: the dry one hardly gives, and then cracks; the stout one hardly gives at all
            const give = near.kind === 'springs' ? 0.75 : near.kind === 'dry' ? 0.3 : 0.1;
            near.mesh.rotation.z = give * k + (near.kind === 'stiff' ? 0.012 * Math.sin(c.time * 40) * k : 0);
            if (k >= 1) done = near;
            return !!done;
          });
          c.prompt(null);
          c.lead(null);
          tried.add(done);
          if (done.kind === 'dry') {
            done.mesh.rotation.z = 1.2;
            g.music.thud(0.6);
            await bark(c, 'dry');
          } else if (done.kind === 'stiff') {
            done.mesh.rotation.z = 0;
            await bark(c, 'stiff');
          } else {
            // (it springs back, and stands quivering)
            const let_ = c.time;
            await c.until(() => {
              const s = c.time - let_;
              done.mesh.rotation.z = 0.75 * Math.exp(-s * 4) * Math.cos(s * 16);
              return s > 1.1;
            });
            g.music.pluck();
            await bark(c, 'springs');
            done.hide();
            found = true;
          }
        }
        // ---- "and out of a straight stick, an arrow" ----
        c.objective('Find a straight stick, for an arrow.');
        await c.act(...stick.at, 2.2, 'Take up the stick', { mark: false });
        stick.hide();
        g.music.pluck();
        bark(c, 'stick');
        // ---- "with a sling and with stones" ----
        c.objective('Gather stones for your sling, on the way back to the tents.');
        sam.follow(g.player, 2.6, 1.2);
        await c.act(...pebbles.at, 2.4, 'Gather stones', { mark: false, unless: null });
        pebbles.hide();
        g.music.pluck();
        bark(c, 'stones');
        c.objective('Go back to the tents, and make your bow by the fire.');
        await c.reach(...byFire, 5, { mark: false });
      },
    },
    // by the fire he makes it; he asks his father; the voice of the Lord; and they look upon the ball (16:23–29)
    {
      id: 'a4-make',
      label: 'Act Four',
      setup() {
        reset({ hour: 9.4, stand: K(FIRE[0] + 6, 2), face: fire, pitched: true });
        camp({ weary: true });
        who('lehi').place(...apart, yawTo(fire, apart)).sit = 1;
        who('laman').place(...K(12, -7), 2).sit = 1;
        who('lemuel').place(...K(13.5, -5), 2.4).sit = 1;
        const p = K(10, 6);
        who('sam').place(p[0], p[1], yawTo(p, fire));
        ball_.dead(true);
      },
      async run(c) {
        g.setHour(9.4, true);
        const [laman, lemuel, sam, lehi, sariah] = ['laman', 'lemuel', 'sam', 'lehi', 'sariah'].map(who);
        c.objective('Make your bow by the fire.');
        await c.act(...byFire, 2.6, 'Sit, and make your bow', { mark: false });
        c.objective(null);
        g.standAt(byFire[0], byFire[1], yawTo(byFire, fire));
        g.player.sit = 1;
        cut.put(lerp(byFire, fire, 0.45), { turn: 0.5 });
        for (const npc of [laman, lemuel]) {
          npc.sit = 0;
          npc.face(...byFire);
        }
        sam.walk([K(FIRE[0] + 1.2, 3.2)], 1.6).then(() => sam.face(...byFire));
        await c.wait(1.2);
        await work(c, 'Shave the bough', 2.2);
        cut.hide();
        bow.take('wood', { arrows: 0 });
        bark(c, 'onearrow');
        await work(c, 'Shape its limbs', 2.2);
        bark(c, 'itisabow');
        await work(c, 'String it, and fit the arrow', 2.2);
        bow.take('wood', { arrows: 1 });
        await fill(c, 'wood');
        g.player.sit = 0;
        await c.wait(0.9);
        await say(c, 'enough');
        // "And I said unto my father: Whither shall I go to obtain food?" (16:23)
        await ask(c, 'I have a bow. Where shall I go to obtain food?', ['Wherever I think best', 'I will ask Laman, who is eldest', 'I will ask my father'], 2, [
          'The ball does not point. I do not know this country.',
          'Laman’s bow failed as mine did. He does not know.',
          '',
        ]);
        c.objective('Go to your father.');
        await c.act(...at(lehi), 3.2, 'Ask your father', { mark: false });
        c.objective(null);
        lehi.sit = 0;
        await c.hold(c.wait(0.9));
        lehi.face(...me());
        g.shoulder(at(lehi), { back: 3.4, up: 2.0, look: 1.4 });
        await card(c, '16:23-said');
        await say(c, 'askme');
        await say(c, 'inquire');
        // he inquires of the Lord (16:24): on his knees, and the camp is still
        lehi.face(null);
        lehi.kneel = 1;
        g.music.still(1);
        g.sounds.hush(0.6);
        g.view({ from: [apart[0] + 4.6, apart[1] - 3.6, 1.5], to: [...apart, 0.9] });
        await c.hold(c.wait(2.2));
        await verse(c, '16:25');
        // the voice of the Lord: its own words, and no others
        await card(c, '16:26-said');
        g.music.still(0);
        g.sounds.hush(0);
        lehi.kneel = 0;
        g.view(null);
        await c.hold(c.wait(1));
        lehi.face(...me());
        await say(c, 'bringball');
        // they gather to it, and look
        for (const npc of [laman, lemuel, sam, sariah]) npc.walk([lerp(at(npc), at(lehi), 0.72)], 2).then(() => npc.face(...at(lehi)));
        c.objective('Look upon the ball.');
        await c.act(...at(lehi), 4, 'Look upon the ball', { mark: false });
        c.objective(null);
        ball_.dead(false);
        ball_.written(true);
        ball_.point(foot, { quiet: true });
        g.music.chime();
        ball_.open();
        await verse(c, '16:27');
        await fill(c, 'heed');
        await card(c, '16:29-a');
        ball_.close();
        ball_.heedful(true);
        g.shoulder(at(lehi), { back: 3.4, up: 2.0, look: 1.4 });
        await say(c, 'top');
        g.view(null);
        // out of the camp, the way it points: to the mountain's foot
        c.objective('Go where the ball directs.');
        how(g.ui.touch ? 'Go as the spindle points and it holds true. If it stops, stand and tap the ball.' : 'Go as the spindle points and it holds true. If it stops, stand and press Q to look upon it.', 9);
        ball_.point([campEdge, foot]);
        await c.reach(...lerp(campEdge, foot, 0.45), 9, { mark: false, via: [[...campEdge, 12]] });
        c.objective(null);
        await c.fade(1, 1.6);
      },
    },

    // ---- Act Five: into the top of the mountain (16:30–32) ----
    {
      id: 'a5',
      label: 'Act Five',
      scene: true,
      setup() {
        const stand = lerp(campEdge, foot, 0.8);
        reset({ hour: 13.5, stand, face: foot });
        bow.take('wood', { arrows: 1 });
        ball_.written(true);
        ball_.heedful(true);
        beasts.herd(top, { n: 4, to: [P(356, 38), P(394, 4), P(362, -8)], spread: 7 });
      },
      async run(c) {
        await c.fade(0, 1.6);
        await c.chapter('Act Five', 'Into the Top of the Mountain', '1 Nephi 16:30–32');
        c.objective('Go up into the top of the mountain, as the ball directs.');
        c.line(g.verses('16:30'), g.reference('16:30'));
        ball_.point([...trail, top]);
        talk(c, ['asiheed'], { first: 14 });
        // up the trail; the last of it is the top, where they feed. Where the trail turns, another way goes on and is
        // lost (WILD.spurs): nothing says which is which but the ball
        const parts = WILD.spurs.map((line) => P(...line[0]));
        let told = false;
        await c.reach(...trail[trail.length - 1], 8, {
          mark: false,
          via: steps(trail.slice(0, -1)),
          unless: () => {
            if (!told && from(parts[0]) < 16) {
              told = true;
              how('The way parts. The ball knows which is the way.', 7);
            }
            return from(top) < 52;
          },
        });
      },
    },
    {
      id: 'a5-top',
      label: 'Act Five',
      setup() {
        const stand = trail[trail.length - 2];
        reset({ hour: 15.2, stand, face: top });
        bow.take('wood', { arrows: 1 });
        ball_.written(true);
        ball_.heedful(true);
        beasts.herd(top, { n: 4, to: [P(356, 38), P(394, 4), P(362, -8)], spread: 7 });
      },
      async run(c) {
        g.setHour(15.2, true);
        // on the top the ball points to them, and asks no more heed than he gives by going to them
        ball_.heedful(false);
        await bark(c, 'onearrowmine');
        // (the autopilot keeps to the trail till it is on the top: the flank beside it is too steep to go straight up)
        if (g.auto) await c.reach(...trail[trail.length - 2], 5, { mark: false });
        c.objective('Come up with the beasts softly. You have one arrow.');
        how('A bow of wood throws a short way. Come near, hold steady, and loose.', 8);
        const fell = await hunt.run(c, {
          need: 2,
          softly: 70,
          struck(b, n) {
            if (n === 1) {
              bark(c, 'notall');
              c.objective('Come up with them again. Take up your arrow from the one that fell.');
            }
          },
        });
        c.objective(null);
        await bark(c, 'obtained');
        await verse(c, '16:31');
        c.objective('Take up the beasts you have slain.');
        // (the nearer first)
        fell.sort((a, b) => from([a.x, a.z]) - from([b.x, b.z]));
        ball_.point([fell[0].x, fell[0].z], { quiet: true });
        bow.take(null);
        await takeUp(c, fell[0], 0);
        ball_.point([fell[1].x, fell[1].z], { quiet: true });
        await takeUp(c, fell[1], 1);
        g.burden(3.8);
        c.objective('Return to the tents, bearing the beasts.');
        const down = [...trail].reverse();
        ball_.point(down);
        await c.reach(...down[1], 9, { mark: false, via: [down[0]] });
        c.objective(null);
        await c.fade(1, 1.8);
      },
    },
    // "… how great was their joy! And … they did humble themselves before the Lord, and did give thanks unto him" (16:32)
    {
      id: 'a5-home',
      label: 'Act Five',
      scene: true,
      setup() {
        const stand = lerp(campEdge, foot, 0.5);
        reset({ hour: 19.2, stand, face: campEdge, pitched: true });
        camp({ weary: true });
        who('laman').place(...K(12, -7), 2).sit = 1;
        who('lemuel').place(...K(13.5, -5), 2.4).sit = 1;
        const p = K(15, 2);
        who('sam').place(p[0], p[1], yawTo(p, campEdge));
        ball_.written(true);
        ball_.point(fire, { quiet: true });
        beasts.show(true);
        beasts.bear(beasts.beasts[0], bearer, 0);
        beasts.bear(beasts.beasts[1], bearer, 1);
        hold(true);
        g.burden(3.8);
      },
      async run(c) {
        await c.fade(0, 1.8);
        const [laman, lemuel, sam, lehi, sariah] = ['laman', 'lemuel', 'sam', 'lehi', 'sariah'].map(who);
        const all = [laman, lemuel, sam, lehi, sariah, ...HOUSEHOLD.map(who)];
        c.objective('Return to the tents, bearing the beasts.');
        c.line(EXCERPTS['16:32-a'].text, g.reference('16:32'), { voice: EXCERPTS['16:32-a'].voice });
        // Sam sees him first; and they rise, and come
        await c.reach(...campEdge, 16, { mark: false });
        sam.face(...me());
        bark(c, 'hehasfood');
        for (const npc of all) {
          npc.sit = 0;
          npc.face(...me());
        }
        for (const npc of [laman, lemuel, sam, sariah]) npc.walk([lerp(at(npc), campEdge, 0.5)], 2.6).then(() => npc.face(...me()));
        c.objective('Bring them in to the fire.');
        await c.reach(...fire, 3.9, { mark: false });
        g.burden(null);
        c.objective(null);
        // the beasts are laid down by the fire, on his side of it
        const a0 = Math.atan2(g.player.x - fire[0], g.player.z - fire[1]);
        const round = (a, r) => [fire[0] + Math.sin(a0 + a) * r, fire[1] + Math.cos(a0 + a) * r];
        beasts.lay(beasts.beasts[0], ...round(0.55, 1.9), a0 + 2.2);
        beasts.lay(beasts.beasts[1], ...round(-0.5, 2.0), a0 - 2.0);
        hold(false);
        g.music.thud(0.5);
        g.player.face = a0 + Math.PI;
        // and they come round the fire to him: his mother at one hand and Sam at the other, his father over against him
        const ring = [[sariah, 1.05], [lehi, 2.1], [lemuel, 3.14], [laman, -2.1], [sam, -1.05]].map(([npc, a]) => [npc, round(a, 3.4)]);
        const come = ring.map(([npc, spot]) => npc.walk([spot], 2.6).then(() => npc.face(...fire)));
        await c.hold(Promise.race([Promise.all(come), c.wait(8)]));
        for (const [npc, spot] of ring) {
          if (Math.hypot(npc.x - spot[0], npc.z - spot[1]) > 1) npc.place(spot[0], spot[1], yawTo(spot, fire));
          npc.face(...me());
        }
        g.shoulder(at(sariah), { back: 3.2, up: 2.0, look: 1.4 });
        await say(c, 'joy');
        g.shoulder(at(laman), { back: 3.2, up: 2.0, look: 1.4 });
        await say(c, 'withyou');
        g.shoulder(at(lehi), { back: 3.2, up: 2.0, look: 1.4 });
        await say(c, 'thanks');
        // they humble themselves, and give thanks: and so does he. Seen from a little way off, all of them about the fire
        g.view({ from: [...round(-0.62, 8.6), 3.1], to: [...round(2.6, 0.6), 0.9] });
        for (const npc of all) {
          npc.face(...fire);
          npc.kneel = 1;
        }
        g.setHour(19.8, true);
        c.objective('Kneel, and give thanks.');
        await c.until(() => {
          c.prompt(g.frozen ? null : 'Kneel, and give thanks');
          return c.pressed || g.auto;
        });
        c.prompt(null);
        c.objective(null);
        g.player.kneel = 1;
        g.music.theme();
        await c.hold(c.wait(2.4));
        await card(c, '16:32-b');
        await c.hold(c.wait(1.5));
        // "And thus we see that by small means the Lord can bring about great things."
        ball_.open();
        await fill(c, 'small');
        ball_.close();
        await c.hold(c.wait(2));
        await c.fade(1, 2.4);
        g.end();
      },
    },
  ];
}
