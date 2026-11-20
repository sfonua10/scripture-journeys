// "Sow to yourselves in righteousness, reap in mercy; break up your fallow ground: for it is time to seek the LORD,
// till he come and rain righteousness upon you" (Hosea 10:12): the play of the journey of Hosea 10 (hosea.js), a short
// game against the coming of the rain.
//
// You have a plot of hard ground on the hill, an ox and a plough. Walk the plot behind the ox and the ground is
// broken where the plough goes. Press (E, a click, a tap on the prompt) to leave the plough and sow: then seed is
// cast where you walk, in a broad swath, and takes only where the ground was broken; press again to go back to the
// plough. The clouds gather as you work (TUNING.clock seconds), and how long is left is shown. Then the rain comes,
// which is none of your doing: whatever was broken and sown comes up, and the rest does not. Then you reap what
// grew, and it is bound in sheaves.
//
// The plot is the meadow's own grass (crop.js): scrub where it lies fallow, bare where it is broken, corn where it
// was sown and rained on. Everything that moves runs on the story's clock (c.time), which a test steps, so the
// autopilot (g.auto) can play it through: it ploughs the plot row by row, sows it, and reaps it.
import * as THREE from 'three';
import { reachArm } from '../figure/hold.js';
import { createCrop, LOOKS } from './crop.js';
import { createMiniHud, mmss } from './minihud.js';
import { ball, cone, limb, part, piece, solidMaterial } from './solid.js';
import { createWeather } from './weather.js';

/** What can be tuned after it is played. */
export const TUNING = {
  /** The plot: its corner in the world, and how many metres along x and z. */
  plot: { x0: -16, z0: -35, nx: 20, nz: 15 },
  /** Seconds from the first step to the rain. */
  clock: 90,
  /** Seconds left at which a word is said that the rain is coming. */
  warn: [30, 10],
  /** The plough: how wide a strip it breaks, metres, and how fast the ox goes, m/s (a man runs at 5.3). */
  plough: { width: 1.6, speed: 4.3 },
  /** The sowing: how wide the seed is cast, metres. */
  sow: { width: 3.2 },
  /** The reaping: how wide the sickle cuts, metres; how many seconds there are to the evening; cells to a sheaf. */
  reap: { width: 2, clock: 45, sheaf: 8 },
  /** The hours of the day: as the work begins and as the rain comes; and from the reaping's start to the evening. */
  hours: [8.2, 11.5],
  evening: [16.2, 19.9],
};

const FALLOW = 0;
const BROKEN = 1;
const SOWN = 2;
const GROWN = 3;
const REAPED = 4;

const HIDE = [0.25, 0.145, 0.09];
const HIDE_DARK = [0.13, 0.08, 0.06];
const MUZZLE = [0.8, 0.72, 0.6];
const HORN = [0.86, 0.8, 0.66];
const WOOD = [0.42, 0.29, 0.18];
const WOOD_DARK = [0.26, 0.18, 0.12];
const IRON = [0.3, 0.3, 0.33];
const EARTH = [0.17, 0.1, 0.07];
const STRAW = [0.9, 0.74, 0.38];
const STONE = [0.62, 0.6, 0.56];

/** An ox: his body along +z, his feet on the ground at y = 0. */
function oxShapes() {
  const trunk = new THREE.LatheGeometry(
    [[0, -0.9], [0.2, -0.86], [0.36, -0.6], [0.4, -0.2], [0.39, 0.2], [0.42, 0.52], [0.36, 0.78], [0.18, 0.92], [0, 0.94]].map(([r, y]) => new THREE.Vector2(r, y)),
    12,
  );
  const body = part(
    piece(trunk, HIDE, 0, { turn: [Math.PI / 2, 0, 0], scale: [0.86, 1.08, 1] }),
    // (the hump of his shoulders, and a tail)
    ball(0.26, HIDE, 0, { at: [0, 0.3, 0.5], scale: [0.9, 0.8, 1.3] }),
    limb(0.02, 0.03, 0.7, HIDE_DARK, 2, { at: [0, -0.05, -0.93], turn: [0.12, 0, 0] }),
    ball(0.05, HIDE_DARK, 2, { at: [0, -0.42, -0.98], scale: [1, 1.6, 1] }),
  );
  // the neck and head, about where the neck leaves the shoulders, along +z: lowered to pull, down to graze
  const head = part(
    limb(0.16, 0.24, 0.5, HIDE, 6, { at: [0, -0.02, 0.2], turn: [Math.PI / 2, 0, 0] }),
    ball(0.2, HIDE, 6, { at: [0, 0, 0.52], scale: [0.9, 0.95, 1.25] }),
    ball(0.14, MUZZLE, 4, { at: [0, -0.07, 0.76], scale: [0.9, 0.8, 1.1] }),
    ball(0.03, HIDE_DARK, 1, { at: [0.15, 0.07, 0.56] }),
    ball(0.03, HIDE_DARK, 1, { at: [-0.15, 0.07, 0.56] }),
    cone(0.05, 0.2, HIDE, 6, { at: [0.25, 0.08, 0.42], turn: [0, 0, -1.35] }),
    cone(0.05, 0.2, HIDE, 6, { at: [-0.25, 0.08, 0.42], turn: [0, 0, 1.35] }),
    ...[1, -1].flatMap((s) => [
      limb(0.03, 0.045, 0.24, HORN, 5, { at: [0.2 * s, 0.2, 0.42], turn: [0, 0, -1.1 * s] }),
      limb(0.012, 0.03, 0.2, HORN, 5, { at: [0.33 * s, 0.32, 0.44], turn: [0.2, 0, -0.35 * s] }),
    ]),
  );
  const leg = (thick) => part(limb(thick, 0.06, 0.74, HIDE, 5, { at: [0, -0.37, 0] }), ball(0.075, HIDE_DARK, 2, { at: [0, -0.75, 0.02], scale: [1, 0.6, 1.2] }));
  // the yoke on his neck, and the pole from it back to the plough
  const yoke = part(limb(0.045, 0.045, 0.8, WOOD, 3, { at: [0, 0.32, 0.42], turn: [0, 0, Math.PI / 2] }));
  return { body, head, foreleg: leg(0.1), hindleg: leg(0.12), yoke };
}

/** The plough: its share in the ground at the origin, its beam forward (+z) and up to the yoke, its stilt back to the hand. */
function ploughShape() {
  const beam = [[0, 0.16, 0.05], [0, 0.98, 2.35]];
  const stilt = [[0, 0.1, 0.02], [0, 0.96, -0.62]];
  const rod = ([a, b], r, colour, kind) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    return limb(r * 0.85, r, len, colour, kind, { at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], turn: [Math.atan2(d[2], d[1]), 0, 0] });
  };
  return part(
    rod(beam, 0.04, WOOD, 3),
    rod(stilt, 0.035, WOOD_DARK, 4),
    // (the handle across the top of the stilt, and the share: a point of iron, down and forward)
    limb(0.028, 0.028, 0.34, WOOD_DARK, 4, { at: [0, 0.97, -0.62], turn: [0, 0, Math.PI / 2] }),
    cone(0.07, 0.4, IRON, 2, { at: [0, 0.02, 0.16], turn: [1.95, 0, 0] }),
  );
}

/** A sickle, its handle up the hand (+y), its blade curving forward. */
function sickleShape() {
  const pieces = [limb(0.016, 0.02, 0.16, WOOD_DARK, 4, { at: [0, 0, 0] })];
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * 2.5;
    const a1 = ((i + 1) / 6) * 2.5;
    const p = (a) => [0.08 + 0.17 * (1 - Math.cos(a)), 0.17 * Math.sin(a)];
    const [y0, z0] = p(a0);
    const [y1, z1] = p(a1);
    pieces.push(limb(0.007, 0.012, Math.hypot(y1 - y0, z1 - z0) * 1.1, IRON, 2, { at: [0, (y0 + y1) / 2, (z0 + z1) / 2], turn: [Math.atan2(z1 - z0, y1 - y0), 0, 0], scale: [0.5, 1, 2.2] }));
  }
  return part(...pieces);
}

/** A sheaf: corn bound about its middle, standing on its cut ends, its heads spread. */
function sheafShape() {
  return part(
    limb(0.11, 0.2, 0.5, STRAW, 4, { at: [0, 0.25, 0] }),
    limb(0.115, 0.115, 0.05, WOOD, 3, { at: [0, 0.5, 0] }),
    limb(0.24, 0.11, 0.34, STRAW, 5, { at: [0, 0.69, 0] }),
    ball(0.24, [0.95, 0.8, 0.42], 5, { at: [0, 0.86, 0], scale: [1, 0.3, 1] }),
  );
}

/** A heap of stones, at a corner of the plot. */
function cairnShape() {
  return part(
    ball(0.3, STONE, 0, { at: [0, 0.12, 0], scale: [1.2, 0.7, 1] }),
    ball(0.22, STONE, 1, { at: [0.28, 0.1, 0.14], scale: [1, 0.8, 1.1] }),
    ball(0.2, STONE, 2, { at: [-0.24, 0.1, -0.16], scale: [1.1, 0.7, 1] }),
    ball(0.2, STONE, 3, { at: [0.02, 0.38, 0.02], scale: [1, 0.75, 1] }),
  );
}

const seedVertex = /* glsl */ `
uniform float uTime;
uniform float uPixels;   // the picture's height, pixels
in vec3 aVel;
in vec2 aLife;   // when it was cast, and how long it flies (0: it lies where it is)
out float vShow;
void main() {
  float t = uTime - aLife.x;
  vec3 p = position;
  vShow = 1.0;
  if (aLife.y > 0.0) {
    if (t < 0.0 || t > aLife.y) vShow = 0.0;
    p += aVel * t + vec3(0.0, -4.9 * t * t, 0.0);
  }
  vec4 v = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * v;
  gl_PointSize = vShow * max(1.5, 0.032 * projectionMatrix[1][1] * uPixels * 0.5 / max(0.1, -v.z));
}
`;
const seedFragment = /* glsl */ `
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
in float vShow;
layout(location = 0) out vec4 outC;
void main() {
  if (vShow < 0.5 || length(gl_PointCoord - 0.5) > 0.5) discard;
  // (a grain of corn, pale; it writes a figure's ink, so it is seen against the earth: solid.js)
  outC = vec4(vec3(0.92, 0.8, 0.5) * (uSunColor * 0.42 + uSkyColor * 0.3), 0.15);
}
`;

const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** @param g the game (main.js) */
export function createFallow(g) {
  const scene = g.scene;
  const material = solidMaterial(g.field);
  const crop = createCrop(g, TUNING.plot);
  const weather = createWeather(g);
  const hud = createMiniHud(['broken', 'sown', 'sheaves']);
  const mesh = (geometry) => {
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false;
    return m;
  };

  // ---- the ox and the plough ----
  const OX = oxShapes();
  const ox = new THREE.Group();
  const oxBody = mesh(OX.body);
  oxBody.position.y = 0.98;
  const oxHead = mesh(OX.head);
  oxHead.position.set(0, 0.12, 0.84);
  const oxLegs = [[0.2, 0.56, OX.foreleg], [-0.2, 0.56, OX.foreleg], [0.2, -0.6, OX.hindleg], [-0.2, -0.6, OX.hindleg]].map(([x, z, shape]) => {
    const leg = mesh(shape);
    leg.position.set(x, -0.2, z);
    return leg;
  });
  const oxYoke = mesh(OX.yoke);
  oxBody.add(oxHead, oxYoke, ...oxLegs);
  ox.add(oxBody);
  const plough = mesh(ploughShape());
  const sickle = mesh(sickleShape());
  const cairn = cairnShape();
  const cairns = [[crop.x0, crop.z0], [crop.x1, crop.z0], [crop.x0, crop.z1], [crop.x1, crop.z1], [(crop.x0 + crop.x1) / 2, crop.z0], [(crop.x0 + crop.x1) / 2, crop.z1]].map(([x, z], i) => {
    const m = mesh(cairn);
    m.position.set(x, g.heightAt(x, z), z);
    m.rotation.y = i * 1.3;
    return m;
  });
  const SHEAF = sheafShape();
  const sheaves = [];
  const things = new THREE.Group();
  things.add(ox, plough, sickle, ...cairns);
  things.visible = false;
  scene.add(things);

  // ---- the furrows: ridges of turned earth, laid as the plough goes ----
  // Four ridges side by side behind the share. Each is laid only where none lies yet (a grid of the plot, five
  // cells a metre, keeps when each place was ridged: what was ridged a moment ago is this same pass going on).
  const RIDGES = [-0.6, -0.2, 0.2, 0.6];
  const MOST = 6400;
  const furrow = new THREE.BufferGeometry();
  const fPos = new Float32Array(MOST * 12 * 3);
  const fNor = new Float32Array(MOST * 12 * 3);
  const fCol = new Float32Array(MOST * 12 * 3);
  const fKind = new Float32Array(MOST * 12);
  furrow.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  furrow.setAttribute('normal', new THREE.BufferAttribute(fNor, 3));
  furrow.setAttribute('aColor', new THREE.BufferAttribute(fCol, 3));
  furrow.setAttribute('aKind', new THREE.BufferAttribute(fKind, 1));
  furrow.setDrawRange(0, 0);
  const furrows = mesh(furrow);
  scene.add(furrows);
  let ridges = 0;
  const FINE = 5;
  const ridged = new Float32Array(crop.nx * FINE * crop.nz * FINE).fill(-1);
  const fine = (x, z) => {
    const i = Math.floor((x - crop.x0) * FINE);
    const j = Math.floor((z - crop.z0) * FINE);
    return i < 0 || j < 0 || i >= crop.nx * FINE || j >= crop.nz * FINE ? -1 : i + j * crop.nx * FINE;
  };
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  const N = new THREE.Vector3();
  /** One length of furrow from (ax, az) to (bx, bz), at the story's time `t`: a ridge wherever none lies. */
  function ridge(ax, az, bx, bz, t) {
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const sx = (bz - az) / len;
    const sz = -(bx - ax) / len;
    const corner = (x, z, off, up) => new THREE.Vector3(x + sx * off, g.heightAt(x + sx * off, z + sz * off) + up, z + sz * off);
    const first = ridges;
    for (const [r, off] of RIDGES.entries()) {
      const mx = (ax + bx) / 2 + sx * off;
      const mz = (az + bz) / 2 + sz * off;
      const cell = fine(mx, mz);
      if (cell < 0 || ridges >= MOST) continue;
      if (ridged[cell] >= 0 && t - ridged[cell] > 1) continue;
      // (this place, and a hand's breadth round it, is ridged now)
      for (const [dx, dz] of [[0, 0], [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]]) {
        const near = fine(mx + dx, mz + dz);
        if (near >= 0 && (ridged[near] < 0 || t - ridged[near] <= 1)) ridged[near] = t;
      }
      let o = ridges * 12;
      const tall = 0.12 + 0.06 * crop.chance(ridges, r);
      const tone = 0.85 + 0.3 * crop.chance(ridges, r + 9);
      // a crest, and a foot to either side of it
      const crest = [corner(ax, az, off, tall), corner(bx, bz, off, tall)];
      for (const side of [-1, 1]) {
        const foot = [corner(ax, az, off + side * 0.17, -0.03), corner(bx, bz, off + side * 0.17, -0.03)];
        N.crossVectors(A.subVectors(crest[1], crest[0]), B.subVectors(foot[0], crest[0])).normalize();
        if (N.y < 0) N.negate();
        const shade = tone * (side < 0 ? 1 : 0.78);
        for (const p of [crest[0], crest[1], foot[0], crest[1], foot[1], foot[0]]) {
          fPos.set([p.x, p.y, p.z], o * 3);
          fNor.set([N.x, N.y, N.z], o * 3);
          fCol.set([EARTH[0] * shade, EARTH[1] * shade, EARTH[2] * shade], o * 3);
          fKind[o++] = 2;
        }
      }
      ridges++;
    }
    if (ridges === first) return;
    // (only what is new is sent to the graphics card)
    for (const name of ['position', 'normal', 'aColor', 'aKind']) {
      const attribute = furrow.attributes[name];
      attribute.addUpdateRange(first * 12 * attribute.itemSize, (ridges - first) * 12 * attribute.itemSize);
      attribute.needsUpdate = true;
    }
    furrow.setDrawRange(0, ridges * 12);
  }

  // ---- the seed: cast from the hand, and lying where it fell ----
  const SEEDS = 3600;
  const seedGeometry = new THREE.BufferGeometry();
  const sPos = new Float32Array(SEEDS * 3);
  const sVel = new Float32Array(SEEDS * 3);
  const sLife = new Float32Array(SEEDS * 2).fill(-1);
  seedGeometry.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  seedGeometry.setAttribute('aVel', new THREE.BufferAttribute(sVel, 3));
  seedGeometry.setAttribute('aLife', new THREE.BufferAttribute(sLife, 2));
  const F = g.field.uniforms;
  const seedUniforms = { uTime: F.uTime, uPixels: { value: 720 }, uSunColor: F.uSunColor, uSkyColor: F.uSkyColor };
  const seeds = new THREE.Points(seedGeometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: seedVertex, fragmentShader: seedFragment, uniforms: seedUniforms }));
  seeds.frustumCulled = false;
  seeds.visible = false;
  scene.add(seeds);
  g.each(() => {
    if (seeds.visible) seedUniforms.uPixels.value = g.canvas.height;
  });
  /** Seeds that lie are kept from the start of the list; those in the air go round the rest of it. */
  let lying = 0;
  let flying = 0;
  const FLY0 = 2600;
  function seed(x, y, z, vx = 0, vy = 0, vz = 0, life = 0) {
    let i;
    if (life > 0) {
      i = FLY0 + (flying++ % (SEEDS - FLY0));
    } else {
      if (lying >= FLY0) return;
      i = lying++;
    }
    sPos.set([x, y, z], i * 3);
    sVel.set([vx, vy, vz], i * 3);
    sLife.set([F.uTime.value, life], i * 2);
    for (const name of ['position', 'aVel', 'aLife']) {
      const attribute = seedGeometry.attributes[name];
      attribute.addUpdateRange(i * attribute.itemSize, attribute.itemSize);
      attribute.needsUpdate = true;
    }
  }

  // ---- the state of one run ----
  const s = {
    live: false,
    phase: 'idle',
    cells: new Uint8Array(crop.cells),
    grew: new Float32Array(crop.cells),
    broken: 0,
    sown: 0,
    grown: 0,
    reaped: 0,
    lost: 0,
    tool: 'plough',
    last: 0,
    warned: 0,
    tick: 0,
    toggled: -9,
    heading: [0, -1],
    share: null,
    trail: null,
    oxAt: [0, 0],
    oxYaw: 0,
    oxHead: 0,
    stride: 0,
    cast: 0,
    swing: 0,
    prompt: '',
    row: 0,
    route: null,
    hinted: false,
  };
  let lastKey = '';
  addEventListener('keydown', (e) => {
    if (!e.repeat) lastKey = e.code;
  });
  addEventListener('pointerdown', () => (lastKey = 'pointer'));

  // ---- his arms, and what is in his hands: called each frame once his clip is set (main.js, g.player.pose) ----
  const T = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const hand = new THREE.Vector3();
  function pose(bones, object, yaw) {
    if (!s.live) return;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const y = g.heightAt(g.player.x, g.player.z);
    if (s.phase === 'work' && s.tool === 'plough' && s.share) {
      // both hands on the handle of the stilt
      const [hx, hz] = s.heading;
      const px = s.share[0] - hx * 0.62;
      const pz = s.share[1] - hz * 0.62;
      const py = g.heightAt(s.share[0], s.share[1]) + 0.97;
      for (const [side, k] of [['r', 1], ['l', -1]]) {
        T.set(px + hz * 0.13 * k, py, pz - hx * 0.13 * k);
        bend.set(fz * 0.5 * k, -1, -fx * 0.5 * k);
        reachArm(bones, side, T, bend, 1);
      }
    } else if (s.phase === 'work' && s.tool === 'sow') {
      // the right arm swung across before him as he goes, casting; the left held to the seed at his waist
      const a = Math.sin(s.swing);
      T.set(g.player.x + fx * 0.5 + fz * 0.5 * a, y + 1.05 + 0.12 * Math.cos(s.swing * 2), g.player.z + fz * 0.5 - fx * 0.5 * a);
      bend.set(fz * 0.6, -1, -fx * 0.6);
      reachArm(bones, 'r', T, bend, 0.9);
      T.set(g.player.x + fx * 0.28 - fz * 0.16, y + 1.02, g.player.z + fz * 0.28 + fx * 0.16);
      bend.set(-fz * 0.6, -1, fx * 0.6);
      reachArm(bones, 'l', T, bend, 0.8);
    } else if (s.phase === 'reap') {
      // the sickle swung low before him
      const a = Math.sin(s.swing);
      T.set(g.player.x + fx * 0.55 + fz * 0.45 * a, y + 0.72, g.player.z + fz * 0.55 - fx * 0.45 * a);
      bend.set(fz * 0.6, -0.6, -fx * 0.6);
      reachArm(bones, 'r', T, bend, 0.95);
      bones.hand_r?.getWorldPosition(hand);
      sickle.position.copy(hand);
      sickle.rotation.set(1.2, yaw + 0.5 * Math.cos(s.swing), 0, 'YXZ');
    }
  }

  const pct = (n) => Math.round((100 * n) / crop.cells);
  function draw(left, label) {
    hud.clock(left, label);
    hud.set('broken', s.phase === 'reap' ? null : `Broken <b>${pct(s.broken + s.sown)}%</b>`, true);
    hud.set('sown', s.phase === 'reap' ? null : `Sown <b>${pct(s.sown)}%</b>`, true);
    hud.set('sheaves', s.phase === 'reap' ? `Sheaves <b>${sheaves.filter((m) => m.visible).length}</b>` : null, true);
  }

  /** Stands the ox and the plough where the heading has them: the share before him, the ox before that. */
  function team(dt, snap = false) {
    const [hx, hz] = s.heading;
    const sx = g.player.x + hx * 0.95;
    const sz = g.player.z + hz * 0.95;
    s.share = [sx, sz];
    const tx = g.player.x + hx * 3.6;
    const tz = g.player.z + hz * 3.6;
    const k = snap ? 1 : Math.min(1, dt * 7);
    const [ox0, oz0] = s.oxAt;
    s.oxAt = [ox0 + (tx - ox0) * k, oz0 + (tz - oz0) * k];
    s.stride += Math.hypot(s.oxAt[0] - ox0, s.oxAt[1] - oz0);
    s.oxYaw = Math.atan2(s.oxAt[0] - sx, s.oxAt[1] - sz);
    plough.position.set(sx, g.heightAt(sx, sz), sz);
    plough.rotation.y = s.oxYaw;
  }
  /** The ox as he is: where he stands, his legs as he goes, his head lowered to pull or down to graze. */
  function beast(dt) {
    const [x, z] = s.oxAt;
    ox.position.set(x, g.heightAt(x, z), z);
    ox.rotation.y = s.oxYaw;
    const grazing = !(s.phase === 'work' && s.tool === 'plough');
    s.oxHead += ((grazing ? 0.95 : 0.3) - s.oxHead) * Math.min(1, dt * 2.5);
    oxHead.rotation.x = s.oxHead + (grazing ? 0.05 * Math.sin(s.last * 2.1) : 0);
    oxLegs.forEach((leg, i) => (leg.rotation.x = 0.42 * Math.sin(s.stride * 2.6 + (i === 0 || i === 3 ? 0 : Math.PI))));
  }

  /** Lays the plot out fallow, with the ox and the plough before him and the morning's sun. */
  function begin() {
    s.cells.fill(FALLOW);
    for (let k = 0; k < crop.cells; k++) {
      crop.look(k, LOOKS.fallow, 0.6);
      crop.stand(k, 0.05 + 0.12 * crop.chance(k, 3) ** 2);
    }
    crop.show();
    crop.border();
    Object.assign(s, { live: true, phase: 'work', broken: 0, sown: 0, grown: 0, reaped: 0, lost: 0, tool: 'plough', last: 0, warned: 0, tick: 0, toggled: 0.4, trail: null, cast: 0, swing: 0, prompt: '', row: 0, route: null, hinted: false, stride: 0, oxHead: 0.3 });
    ridges = 0;
    ridged.fill(-1);
    furrow.setDrawRange(0, 0);
    furrows.position.y = 0;
    lying = 0;
    flying = 0;
    sLife.fill(-1);
    seedGeometry.attributes.aLife.clearUpdateRanges();
    seedGeometry.attributes.aLife.needsUpdate = true;
    seeds.visible = true;
    for (const m of sheaves) m.visible = false;
    sickle.visible = false;
    plough.visible = true;
    things.visible = true;
    furrows.visible = true;
    weather.clear();
    weather.hour(TUNING.hours[0]);
    s.heading = [Math.sin(g.player.yaw), Math.cos(g.player.yaw)];
    s.oxAt = [g.player.x, g.player.z];
    team(0, true);
    beast(1);
    g.player.pose = pose;
    g.burden(TUNING.plough.speed);
    hud.show(true);
    hud.say(null);
    draw(TUNING.clock, 'Rain in');
  }

  /** The plough or the seed, turn about. */
  function toggle(t) {
    s.toggled = t;
    s.tool = s.tool === 'plough' ? 'sow' : 'plough';
    s.trail = null;
    g.burden(s.tool === 'plough' ? TUNING.plough.speed : null);
    if (s.tool === 'plough') {
      // (the ox is brought round before him again)
      s.heading = [Math.sin(g.player.yaw), Math.cos(g.player.yaw)];
    }
    g.music.pluck?.();
    g.log(`took up the ${s.tool === 'plough' ? 'plough' : 'seed'} at ${t.toFixed(0)} s`);
  }

  /** The autopilot's way over the plot: rows along x, `gap` apart, there and back. */
  function rows(gap) {
    const out = [];
    const n = Math.max(1, Math.round((crop.z1 - crop.z0) / gap));
    for (let i = 0; i < n; i++) {
      const z = crop.z0 + ((i + 0.5) * (crop.z1 - crop.z0)) / n;
      const ends = [[crop.x0 + 0.4, z], [crop.x1 - 0.4, z]];
      out.push(...(i % 2 ? ends.reverse() : ends));
    }
    return out;
  }
  function steer(c, gap) {
    if (!s.route || s.route.gap !== gap) s.route = { gap, points: rows(gap), at: 0 };
    const r = s.route;
    while (r.at < r.points.length && Math.hypot(r.points[r.at][0] - g.player.x, r.points[r.at][1] - g.player.z) < 1.1) r.at++;
    const p = r.points[r.at];
    c.lead(p ? { x: p[0], z: p[1], r: 0.9, mark: false } : null);
    return !p;
  }

  /** One frame of the work, until the rain. Resolves true when it comes (or all is broken and sown). */
  function work(c, t) {
    const dt = Math.min(0.1, Math.max(0, t - s.last));
    s.last = t;
    const k = Math.min(1, t / TUNING.clock);
    const left = Math.max(0, TUNING.clock - t);
    // the sun climbs, and the clouds gather: thin at first, and thick in the last third
    weather.cloud(0.12 * k + 0.5 * clamp01((k - 0.55) / 0.45) ** 1.5);
    weather.hour(TUNING.hours[0] + (TUNING.hours[1] - TUNING.hours[0]) * k, true);
    const due = TUNING.warn.filter((w) => left <= w).length;
    if (due > s.warned) {
      s.warned = due;
      const w = TUNING.warn[due - 1];
      hud.say(w > 10 ? `The clouds are gathering: <b>${w} seconds</b> to the rain` : '<b>Ten seconds!</b> The rain is nearly here', t, 3);
      g.music.thud?.(0.7);
    }
    if (!s.hinted && k > 0.5 && !s.sown) {
      s.hinted = true;
      hud.say('Half the time is gone: <b>sow</b> what you have broken', t, 4);
    }
    if (left <= 10 && left > 0 && Math.ceil(left) !== s.tick) {
      s.tick = Math.ceil(left);
      g.music.thud?.(0.3);
    }
    hud.tick(t);
    // the prompt: the other of the two
    const ready = t - s.toggled > 0.6 && !g.frozen;
    const prompt = ready ? (s.tool === 'plough' ? 'Sow the seed' : 'Take the plough') : '';
    if (prompt !== s.prompt) {
      c.prompt(prompt || null);
      s.prompt = prompt;
    }
    if (ready && c.pressed && lastKey !== 'Space') toggle(t);
    // which way he goes
    const speed = g.player.speed;
    if (speed > 0.4) {
      const want = [g.player.vx / speed, g.player.vz / speed];
      const turn = Math.min(1, dt * 9);
      const hx = s.heading[0] + (want[0] - s.heading[0]) * turn;
      const hz = s.heading[1] + (want[1] - s.heading[1]) * turn;
      const len = Math.hypot(hx, hz) || 1;
      s.heading = [hx / len, hz / len];
    }
    if (s.tool === 'plough') {
      team(dt);
      // the ground broken where the share has gone
      const [sx, sz] = s.share;
      if (!s.trail) s.trail = [sx, sz];
      const [ax, az] = s.trail;
      if (Math.hypot(sx - ax, sz - az) > 0.3) {
        s.trail = [sx, sz];
        if (crop.inside(sx, sz, 0.4) || crop.inside(ax, az, 0.4)) {
          crop.along(ax, az, sx, sz, TUNING.plough.width / 2, (cell) => {
            if (s.cells[cell] !== FALLOW) return;
            s.cells[cell] = BROKEN;
            s.broken++;
          });
          g.field.cutLine(ax, az, sx, sz, TUNING.plough.width, 0, 0, g.player.vx, g.player.vz);
          if (crop.inside(sx, sz, 0.1) && crop.inside(ax, az, 0.1)) ridge(ax, az, sx, sz, t);
        }
      }
    } else {
      // seed cast in a swath before him as he walks
      s.swing += dt * (speed > 0.4 ? 7.5 : 0);
      if (speed > 0.4 && t - s.cast > 0.16) {
        s.cast = t;
        const [hx, hz] = s.heading;
        const cx = g.player.x + hx * 1.9;
        const cz = g.player.z + hz * 1.9;
        const y = g.heightAt(g.player.x, g.player.z) + 1.1;
        const half = TUNING.sow.width / 2;
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = half * Math.sqrt(Math.random());
          const tx = cx + Math.cos(a) * r;
          const tz = cz + Math.sin(a) * r;
          const life = 0.42 + 0.2 * Math.random();
          const fall = g.heightAt(tx, tz) + 0.04 - y;
          seed(g.player.x + hx * 0.5, y, g.player.z + hz * 0.5, (tx - g.player.x - hx * 0.5) / life, (fall + 4.9 * life * life) / life, (tz - g.player.z - hz * 0.5) / life, life);
        }
        crop.along(g.player.x, g.player.z, cx + hx * half * 0.6, cz + hz * half * 0.6, half, (cell) => {
          if (s.cells[cell] === BROKEN) {
            s.cells[cell] = SOWN;
            s.broken--;
            s.sown++;
            const [x, z] = crop.centre(cell);
            for (let i = 0; i < 5; i++) {
              const px = x + crop.chance(cell, 20 + i) - 0.5;
              const pz = z + crop.chance(cell, 40 + i) - 0.5;
              seed(px, g.heightAt(px, pz) + 0.05, pz);
            }
          } else if (s.cells[cell] === FALLOW) s.lost++;
        });
      }
    }
    beast(dt);
    // the autopilot: the plough over the plot row by row, then the seed
    if (g.auto) {
      if (s.tool === 'plough') {
        const done = steer(c, TUNING.plough.width - 0.1);
        if ((done || t > TUNING.clock * 0.62) && t - s.toggled > 0.6) toggle(t);
      } else steer(c, TUNING.sow.width - 0.5);
    }
    draw(left, 'Rain in');
    return k >= 1 || s.sown === crop.cells;
  }

  const ramp = (c, seconds, fn) => {
    const began = c.time;
    return c.until(() => {
      const k = Math.min(1, (c.time - began) / seconds);
      fn(k);
      beast(0.016);
      return k >= 1;
    });
  };

  /** The rain: it clouds over and rains; what was sown comes up green; the sun comes out, and it ripens. */
  async function rain(c, watch) {
    s.phase = 'rain';
    c.prompt(null);
    c.lead(null);
    s.prompt = '';
    g.burden(null);
    hud.clock(null);
    c.freeze(true);
    if (watch) g.view(watch);
    const cover = weather.cover;
    const hour = TUNING.hours[1];
    await ramp(c, 2.6, (k) => {
      weather.cloud(cover + (1 - cover) * ease(k));
      weather.rain(ease(k));
    });
    await c.wait(2.2);
    // green, where the seed lay in broken ground
    const sown = [];
    for (let k = 0; k < crop.cells; k++) {
      if (s.cells[k] !== SOWN) continue;
      s.cells[k] = GROWN;
      sown.push(k);
      crop.look(k, LOOKS.green, 0.12);
      crop.stand(k, 0.01);
    }
    s.grown = sown.length;
    crop.show();
    seeds.visible = false;
    if (sown.length) g.music.chime?.();
    await ramp(c, 5.5, (k) => {
      // (each cell in its own time, the whole of it over the five seconds)
      for (const cell of sown) crop.stand(cell, 0.01 + 0.97 * ease(clamp01(k * 1.5 - 0.5 * crop.chance(cell, 9))));
      // (the rain beats the ridges down)
      furrows.position.y = -0.2 * ease(k);
    });
    for (const cell of sown) crop.stand(cell, null);
    // the rain passes; the sun comes out on it, later in the day; it ripens
    let step = -1;
    await ramp(c, 5, (k) => {
      weather.rain(1 - ease(k));
      weather.cloud(1 - ease(k));
      weather.hour(hour + (TUNING.evening[0] - hour) * ease(k), true);
      const now = Math.floor(k * 4);
      if (now !== step) {
        step = now;
        const dry = LOOKS.green[0] + (LOOKS.corn[0] - LOOKS.green[0]) * (now / 4);
        for (const cell of sown) crop.look(cell, [dry, 1, 1], 0.12);
        crop.show();
      }
    });
    weather.clear();
    weather.hour(TUNING.evening[0]);
    await c.wait(1.2);
    g.view(null);
    c.freeze(false);
  }

  /** One frame of the reaping. Resolves true when all is reaped, or it is evening. */
  function reaping(c, t) {
    const dt = Math.min(0.1, Math.max(0, t - s.last));
    s.last = t;
    const k = Math.min(1, t / TUNING.reap.clock);
    weather.hour(TUNING.evening[0] + (TUNING.evening[1] - TUNING.evening[0]) * k, true);
    hud.tick(t);
    const speed = g.player.speed;
    s.swing += dt * (speed > 0.4 ? 9 : 2);
    if (!s.trail) s.trail = [g.player.x, g.player.z];
    const [ax, az] = s.trail;
    const [bx, bz] = [g.player.x + Math.sin(g.player.yaw) * 0.6, g.player.z + Math.cos(g.player.yaw) * 0.6];
    if (Math.hypot(bx - ax, bz - az) > 0.35) {
      s.trail = [bx, bz];
      if (crop.inside(bx, bz, 1) || crop.inside(ax, az, 1)) {
        g.field.cutLine(ax, az, bx, bz, TUNING.reap.width, 0.06, 0.06, g.player.vx, g.player.vz);
        crop.along(ax, az, bx, bz, TUNING.reap.width / 2, (cell) => {
          if (s.cells[cell] !== GROWN) return;
          s.cells[cell] = REAPED;
          s.reaped++;
          // a sheaf stood up behind him for every few cells reaped
          if (s.reaped % TUNING.reap.sheaf === 0 || s.reaped === s.grown) {
            const n = Math.ceil(s.reaped / TUNING.reap.sheaf) - 1;
            if (!sheaves[n]) things.add((sheaves[n] = mesh(SHEAF)));
            const m = sheaves[n];
            const [x, z] = crop.centre(cell);
            m.position.set(x, g.heightAt(x, z), z);
            m.rotation.y = n * 2.1;
            m.scale.setScalar(0.8 + 0.12 * crop.chance(n, 5));
            m.visible = true;
            g.music.pluck?.();
          }
        });
      }
    }
    beast(dt);
    if (g.auto) steer(c, TUNING.reap.width - 0.2);
    draw(Math.max(0, TUNING.reap.clock - t), 'Evening in');
    return k >= 1 || s.reaped === s.grown;
  }

  return {
    TUNING,
    crop,
    begin,
    /**
     * Plays one run: the work, the rain, the reaping. Resolves with what was done.
     * @param o.watch the view the rain is seen from ({ from, to }: g.view); o.onRain called as it begins
     */
    async run(c, { watch = null, onRain = null, onReap = null } = {}) {
      const began = c.time;
      s.last = 0;
      await c.until(() => work(c, c.time - began));
      const spare = Math.max(0, TUNING.clock - (c.time - began));
      const broken = s.broken + s.sown;
      const sown = s.sown;
      g.log(`broke ${pct(broken)}%, sowed ${pct(sown)}% in ${(c.time - began).toFixed(0)} s`);
      hud.say(null);
      onRain?.();
      await rain(c, watch);
      if (s.grown) {
        s.phase = 'reap';
        s.trail = null;
        s.route = null;
        s.last = 0;
        sickle.visible = true;
        plough.visible = true;
        onReap?.();
        const from = c.time;
        await c.until(() => reaping(c, c.time - from));
        hud.say(s.reaped === s.grown ? 'All of it is reaped' : 'It is evening', c.time - from, 4);
      }
      c.lead(null);
      c.prompt(null);
      const out = {
        cells: crop.cells,
        broken,
        sown,
        grown: s.grown,
        reaped: s.reaped,
        sheaves: sheaves.filter((m) => m.visible).length,
        spare,
        /** Whether the whole plot was broken, sown and reaped. */
        all: sown === crop.cells && s.reaped === s.grown,
      };
      g.log(`reaped ${out.reaped} of ${out.grown}: ${out.sheaves} sheaves`);
      return out;
    },
    /** The eye's place for the rain and the end: over the plot from its south-west corner, towards the city. */
    watch: () => ({ from: [crop.x0 - 5, crop.z0 - 6, 4.2], to: [(crop.x0 + crop.x1) / 2 + 2, (crop.z0 + crop.z1) / 2 + 2, 0.4] }),
    /** Takes away what is drawn over the picture, and his tools from his hands (the plot stays as it is). */
    rest() {
      s.live = false;
      g.player.pose = null;
      sickle.visible = false;
      g.burden(null);
      hud.hide();
    },
    /** Takes it all away, and puts the hill back as it was. */
    stop() {
      s.live = false;
      s.phase = 'idle';
      g.player.pose = null;
      g.burden(null);
      things.visible = false;
      furrows.visible = false;
      seeds.visible = false;
      weather.clear();
      crop.restore();
      hud.hide();
    },
    mmss,
  };
}
