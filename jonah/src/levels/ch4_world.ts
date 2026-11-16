// Chapter 4's three places, kept far apart in one world: the deep, the belly of the fish, and the shore.
// The numbers here are the level's design; the chapter and its bot both read them.
import * as THREE from 'three';
import type { Physics, RAPIER } from '../core/physics';
import { Rng, TAU, lerp, smoothstep } from '../core/util';
import { LevelBuilder } from '../gfx/build';
import { barrelMesh, crateMesh, jarMesh } from '../gfx/props';
import { loft, type GlowSpot, type JellySpec, type Ring, type WeedZone } from './ch4_parts';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Where the belly of the fish is built (its own x), and the shore. */
export const BX = 500;
export const SX = -500;

// ---- the deep ------------------------------------------------------------------------------------------------------

/** Shelves of rock across the shaft, each with one well through it. */
export const SLABS = [
  { y: -16, x: 8, z: 0 },
  { y: -30, x: -8, z: 2 },
  { y: -44, x: -1, z: -9 },
  { y: -58, x: 2, z: 9 },
  { y: -72, x: 8.5, z: 1 },
  { y: -84, x: -8, z: -2 },
];
export const SLAB_T = 2.2;
/** Half the width of a well. */
export const HOLE = 4.2;
export const SHAFT = 14.5;
export const FLOOR_Y = -95;
/** The weeds of the room above each shelf: how tall they stand on it, how far they hang from the shelf above. */
export const ROOMS = [
  { stand: 0, hang: 0 },
  { stand: 4.5, hang: 0 },
  { stand: 6, hang: 0 },
  { stand: 5, hang: 3 },
  { stand: 4.8, hang: 3.2 },
  { stand: 4, hang: 2 },
];
export const SCROLL_DEEP = V(10, -35, 8);
/** Out beyond the gap in the bars: where the great fish meets him. */
export const MEET = V(0, -90, -27);

export interface Deep {
  group: THREE.Group;
  weeds: WeedZone[];
  glow: GlowSpot[];
}

export function buildDeep(physics: Physics): Deep {
  const b = new LevelBuilder(physics, 41);
  const extras: THREE.Mesh[] = [];
  const rng = new Rng(77);
  const rock = 0x3a5068;
  const glow: GlowSpot[] = [];
  const weeds: WeedZone[] = [];
  const S = 20;

  SLABS.forEach((s, k) => {
    const tone = new THREE.Color(rock).lerp(new THREE.Color(0x1c2638), k / 6).getHex();
    const o = { surface: 'stone' as const, jitter: 0.08, shade: 0.3, noShadow: true };
    b.box((-S + s.x - HOLE) / 2, s.y, 0, s.x - HOLE + S, SLAB_T, S * 2, tone, o);
    b.box((S + s.x + HOLE) / 2, s.y, 0, S - s.x - HOLE, SLAB_T, S * 2, tone, o);
    b.box(s.x, s.y, (-S + s.z - HOLE) / 2, HOLE * 2, SLAB_T, s.z - HOLE + S, tone, o);
    b.box(s.x, s.y, (S + s.z + HOLE) / 2, HOLE * 2, SLAB_T, S - s.z - HOLE, tone, o);
    // boulders round the well, and lights that live on its rim
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rng.range(-0.3, 0.3);
      const r = HOLE * 1.42 + rng.range(0.4, 1.4);
      const size = rng.range(0.7, 1.5);
      b.ball(s.x + Math.cos(a) * r, s.y + SLAB_T / 2 + size * 0.2, s.z + Math.sin(a) * r, size, tone, { squash: V(1.2, 0.6, 1), detail: 1, rotY: rng.range(0, TAU), noShadow: true });
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const sq = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const r = (HOLE + 0.25) / sq;
      glow.push({ pos: V(s.x + Math.cos(a) * r, s.y + SLAB_T / 2 + 0.25, s.z + Math.sin(a) * r), color: i % 3 ? 0x5fffe0 : 0xcffff4, size: i % 3 ? 0.5 : 0.8, sec: 0 });
      if (i % 2 === 0) glow.push({ pos: V(s.x + Math.cos(a) * r, s.y - SLAB_T / 2 - 0.2, s.z + Math.sin(a) * r), color: 0x4fd8ff, size: 0.45, sec: 0 });
    }
  });

  // the shaft's wall: drawn as one skin; what stops the swimmer is a ring of unseen walls
  {
    const rings: Ring[] = [];
    const n = 16;
    for (let y = -87; y <= 7; y += 5.5) {
      const pts: THREE.Vector3[] = [];
      const cols: THREE.Color[] = [];
      const depth = -y / 96;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const r = SHAFT + 1.6 + Math.sin(k * 2.3 + y * 0.21) * 1.1 + rng.range(-0.5, 0.5);
        pts.push(V(Math.cos(a) * r, Math.sin(a) * r, y));
        cols.push(new THREE.Color(0x35506e).lerp(new THREE.Color(0x141c2c), depth).multiplyScalar(rng.range(0.82, 1.12)));
      }
      rings.push({ pts, cols });
    }
    const g = loft(rings, { inward: true });
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    const wall = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    wall.name = 'shaft';
    extras.push(wall);
  }
  for (let i = 0; i < 12; i++) {
    const a = ((i + 0.5) / 12) * TAU;
    const r = SHAFT + 0.5;
    b.wall(Math.cos(a) * r, -46, Math.sin(a) * r, 2 * SHAFT * Math.tan(Math.PI / 12) + 1, 106, 1, Math.PI / 2 - a);
  }

  // the weeds of each room
  for (let k = 1; k < SLABS.length; k++) {
    const floor = SLABS[k];
    const ceil = SLABS[k - 1];
    const room = ROOMS[k];
    const fy = floor.y + SLAB_T / 2;
    const cy = ceil.y - SLAB_T / 2;
    for (let gx = -11.5; gx < 12; gx += 4.6) {
      for (let gz = -11.5; gz < 12; gz += 4.6) {
        const x = gx + rng.range(-0.7, 0.7);
        const z = gz + rng.range(-0.7, 0.7);
        if (Math.hypot(x, z) > 12.4) continue;
        const overFloorHole = Math.abs(x - floor.x) < HOLE + 1.7 && Math.abs(z - floor.z) < HOLE + 1.7;
        const underCeilHole = Math.abs(x - ceil.x) < HOLE + 1.7 && Math.abs(z - ceil.z) < HOLE + 1.7;
        const nook = k === 2 && Math.hypot(x - SCROLL_DEEP.x, z - SCROLL_DEEP.z) < 4;
        if (room.stand > 0 && rng.chance(0.8) && !overFloorHole && !(k === 1 && underCeilHole) && !nook) {
          weeds.push({ x, z, y: fy, height: room.stand * rng.range(0.9, 1), radius: 2.3, deep: true });
        }
        // hanging weed keeps well clear of both wells: the way in and the way out are open water
        const hx = x + 1.2;
        const hz = z - 1;
        const nearWell = (w: { x: number; z: number }) => Math.abs(hx - w.x) < HOLE + 2.4 && Math.abs(hz - w.z) < HOLE + 2.4;
        if (room.hang > 0 && rng.chance(0.62) && !nearWell(ceil) && !nearWell(floor)) {
          weeds.push({ x: hx, z: hz, y: cy, height: room.hang * rng.range(0.9, 1), radius: 2.1, hangs: true, deep: true });
        }
      }
    }
    // small lights along the walls of the room
    for (let i = 0; i < 12; i++) {
      const a = rng.range(0, TAU);
      const r = rng.range(11, 13.6);
      glow.push({ pos: V(Math.cos(a) * r, lerp(fy + 0.6, cy - 0.6, rng.next()), Math.sin(a) * r), color: rng.chance(0.7) ? 0x4fd0ff : 0x9fffe8, size: rng.range(0.25, 0.5), sec: 0 });
    }
  }
  // the scroll's nook: a ring of warm lights where no weed grows
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    glow.push({ pos: V(SCROLL_DEEP.x + Math.cos(a) * 1.7, SLABS[2].y + SLAB_T / 2 + 0.3, SCROLL_DEEP.z + Math.sin(a) * 1.7), color: 0xffd9a0, size: 0.45, sec: 0 });
  }

  // ---- the bottoms of the mountains: a floor, and the earth with her bars about it
  b.box(0, FLOOR_Y - 0.5, 0, 260, 1, 260, 0x25324a, { mat: 'sand', jitter: 0, shade: 0, noShadow: true });
  const roof = SLABS[5].y - SLAB_T / 2;
  for (let i = 0; i < 16; i++) {
    if (i === 0) continue; // the gate
    const a = (i / 16) * TAU;
    const x = Math.sin(a) * 13.2;
    const z = -Math.cos(a) * 13.2;
    const h = roof - FLOOR_Y + 0.4;
    b.cyl(x, FLOOR_Y + h / 2, z, 0.62, 1.05, h, 0x33425c, { seg: 7, jitter: 0.1, shade: 0.35, rotY: rng.range(0, 1), noShadow: true, noLedge: true });
    b.ball(x, FLOOR_Y + 0.2, z, 1.7, 0x2b3850, { squash: V(1, 0.45, 1), detail: 1, noShadow: true });
    glow.push({ pos: V(x * 0.94, FLOOR_Y + rng.range(1.5, 8), z * 0.94), color: 0x4fb8ff, size: 0.35, sec: 0 });
  }
  // the roots of the mountains, out in the dark (none on the fish's roads)
  const roots: [number, number][] = [
    [-48, 20],
    [50, 14],
    [-30, 52],
    [28, 58],
    [2, 74],
    [-74, -6],
    [76, -4],
    [-58, -86],
    [54, -90],
  ];
  for (const [x, z] of roots) {
    const h = rng.range(26, 60);
    b.cyl(x, FLOOR_Y + h / 2, z, rng.range(2, 5), rng.range(11, 16), h, 0x1c2638, { seg: 7, collide: false, jitter: 0.08, shade: 0.5, noShadow: true });
  }
  for (let i = 0; i < 22; i++) {
    const a = rng.range(0, TAU);
    const d = rng.range(2, 11);
    b.ball(Math.sin(a) * d, FLOOR_Y + 0.05, Math.cos(a) * d, rng.range(0.25, 0.7), 0x2f3c54, { squash: V(1.2, 0.5, 1), detail: 0, rotY: rng.range(0, TAU), noShadow: true });
  }

  const group = b.finish('deep');
  for (const m of extras) group.add(m);
  // the wares the mariners cast forth (1:5), come to rest on the first shelf
  const top = SLABS[0].y + SLAB_T / 2;
  const wares: [THREE.Object3D, number, number, number, number][] = [
    [crateMesh(0.8, 1), -3, top + 0.36, 5, 0.5],
    [jarMesh(), -5.2, top + 0.2, 3.4, 1.4],
    [barrelMesh(), -1.5, top + 0.34, -6.5, 1.5],
    [crateMesh(0.7, 2), 1.5, top + 0.3, -8, 0.3],
  ];
  for (const [m, x, y, z, tip] of wares) {
    m.position.set(x, y, z);
    m.rotation.set(tip > 1 ? Math.PI / 2 : 0, tip * 2, tip > 1 ? 0.3 : 0.12);
    group.add(m);
  }
  return { group, weeds, glow };
}

// ---- the belly of the fish -----------------------------------------------------------------------------------------
// Its own x runs across, z runs from where Jonah wakes (0) to the throat (178). The water rests at y = 0.

/** The lights that hold the words of Jonah's prayer, in the order they are found. */
export const PEARLS = [
  { v: '2:2', x: 0, y: 2.0, z: 13 },
  { v: '2:3', x: -2, y: 2.0, z: 38 },
  { v: '2:4', x: 0, y: 2.0, z: 67.5 },
  { v: '2:5', x: 0, y: 2.0, z: 90.5 },
  { v: '2:6', x: 0, y: 4.7, z: 112 },
  { v: '2:7', x: 0, y: 2.0, z: 142 },
  { v: '2:8', x: 1.5, y: 2.5, z: 156 },
  { v: '2:9', x: 0, y: 6.1, z: 172 },
];
/** A veil across the way after each light but the last; it parts when that light is found. */
export const VEILS = [17, 41.2, 70.6, 93.6, 115, 145.4, 158.3];
/** Flotsam to cross on, against the current. */
export const STONES: [number, number][] = [
  [1, 44.3],
  [4.5, 48.7],
  [1.5, 53.4],
  [-2.5, 57.3],
  [0.5, 62],
];
/** Ribs that stand in the turning current: the water is still about them. */
export const LEES: [number, number][] = [
  [-3, 123.5],
  [3, 129.5],
  [-2.5, 135.5],
];
/** The rows of hanging weed: where each row is, and where its gap is. */
export const WEED_ROWS: [number, number][] = [
  [75, 3],
  [81, -5],
  [87, 4],
];
export const SILL = { z: 104, top: 1.2 };
export const SHELF = { x: -10.4, z: 99, top: 2.3 };
export const SPAR_TOP = { x: 10.9, z: 56.5, top: 3.0 };
/** Whether each stretch (the water before light n) is a day (teal) or a night (magenta); the last is the way out. */
export const SEC_NIGHT = [false, false, true, false, true, false, true, true, false];
const TEAL = [0x3ff0d0, 0x8ffff0, 0x40c8ff];
const MAGENTA = [0xff4fd8, 0xc060ff, 0xff8fe8];
const PEARL = [0xfff0d8, 0xffffff, 0xcff8ff];

/** Half the belly's width at the water, by z. */
export function bellyHalf(z: number): number {
  const back = Math.max(0.12, smoothstep(-12, -3, z));
  const front = z < 146 ? 1 : z < 160 ? lerp(1, 0.62, smoothstep(146, 160, z)) : z < 178 ? 0.62 : lerp(0.62, 0.1, smoothstep(178, 188, z));
  return 13 * back * front;
}
function bellyUp(z: number): number {
  return 10 * Math.max(0.12, smoothstep(-12, -3, z)) * (z < 178 ? 1 : lerp(1, 0.25, smoothstep(178, 188, z)));
}
/** How far out the wall is at a height. */
export function bellyWall(y: number, z: number): number {
  const up = y >= 1 ? bellyUp(z) : 7.5;
  const k = (y - 1) / up;
  return bellyHalf(z) * Math.sqrt(Math.max(0, 1 - k * k));
}
/** The height of the roof over a place. */
export function bellyRoof(x: number, z: number): number {
  const k = x / bellyHalf(z);
  return 1 + bellyUp(z) * Math.sqrt(Math.max(0, 1 - k * k));
}
/** Which stretch a place belongs to: the number of lights behind it. */
export function secOf(z: number): number {
  let n = 0;
  for (const p of PEARLS) if (p.z < z + 1.5) n++;
  return n;
}

export interface Belly {
  group: THREE.Group;
  flotsam: { body: RAPIER.RigidBody; mesh: THREE.Group };
  weeds: WeedZone[];
  glow: GlowSpot[];
  jellies: JellySpec[];
  veils: (RAPIER.Collider | null)[];
}

export function buildBelly(physics: Physics): Belly {
  const b = new LevelBuilder(physics, 52);
  const extras: THREE.Mesh[] = [];
  const rng = new Rng(204);
  const glow: GlowSpot[] = [];
  const jellies: JellySpec[] = [];
  const weeds: WeedZone[] = [];
  const growth = 0x8f84b4;
  const pale = 0xb9b0d0;

  // ---- the skin of the place, and what stops a man at it
  {
    const rings: Ring[] = [];
    const n = 16;
    for (let z = -12; z <= 188; z += 4) {
      const pts: THREE.Vector3[] = [];
      const cols: THREE.Color[] = [];
      const w = bellyHalf(z);
      const up = bellyUp(z);
      const down = 7.5 * Math.max(0.12, smoothstep(-12, -3, z));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const s = Math.sin(a);
        const wob = 1 + 0.05 * Math.sin(z * 0.31 + k * 1.7) + rng.range(-0.02, 0.02);
        pts.push(V(BX + Math.cos(a) * w * wob, 1 + s * (s > 0 ? up : down) * wob, z));
        const c = new THREE.Color(s < -0.35 ? 0x1c1434 : s > 0.6 ? 0x2c1e50 : 0x3c2a62);
        cols.push(c.multiplyScalar(rng.range(0.8, 1.2)));
      }
      rings.push({ pts, cols });
    }
    const g = loft(rings, { inward: true });
    const skin = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    skin.name = 'belly';
    extras.push(skin);
    const pos = g.getAttribute('position').array as Float32Array;
    const idx = new Uint32Array(pos.length / 3);
    for (let i = 0; i < idx.length; i++) idx[i] = i;
    physics.trimesh(new Float32Array(pos), idx, { surface: 'cloth', noLedge: true });
  }
  // ribs: pale arches, to give the dark its size
  for (let z = 5; z < 180; z += 9) {
    const w = bellyHalf(z) - 0.35;
    const up = bellyUp(z) - 0.35;
    const m = 11;
    let px = 0;
    let py = 0;
    for (let j = 0; j <= m; j++) {
      const a = lerp(-0.2 * Math.PI, 1.2 * Math.PI, j / m);
      const s = Math.sin(a);
      const x = Math.cos(a) * w;
      const y = 1 + s * (s > 0 ? up : 7.2);
      if (j > 0) {
        const len = Math.hypot(x - px, y - py);
        b.box(BX + (x + px) / 2, (y + py) / 2, z, len + 0.25, 0.6, 0.95, 0x7d74a0, { rot: new THREE.Euler(0, 0, Math.atan2(y - py, x - px)), collide: false, jitter: 0.06, shade: 0, noShadow: true });
      }
      px = x;
      py = y;
    }
  }

  // ---- what stands in the water: growths of the fish itself
  const mound = (x: number, z: number, r: number, top = 0.5) => {
    b.cyl(BX + x, (top - 7) / 2, z, r, r, top + 7, growth, { seg: 10, jitter: 0.05, shade: 0.4, rotY: rng.range(0, 1) });
    b.ball(BX + x, top - 0.02, z, r * 0.985, pale, { squash: V(1, 0.06, 1), detail: 1, shade: 0 });
    for (let i = 0; i < 5; i++) {
      const a = rng.range(0, TAU);
      b.ball(BX + x + Math.cos(a) * r * 1.02, top - rng.range(0.7, 2.4), z + Math.sin(a) * r * 1.02, rng.range(0.4, 0.8), growth, { detail: 1, squash: V(1, 0.8, 1) });
    }
  };
  mound(0, 13, 2.2);
  mound(-2, 38, 2.6);
  mound(0, 67.5, 2.4);
  mound(0, 90.5, 2.4);
  mound(0, 112, 1.8, 3.2);
  mound(0, 142, 2.6);
  // the sill: a fold right across, too smooth to climb; the water must lift a man over it
  b.box(BX, (SILL.top - 7) / 2, SILL.z, 27, SILL.top + 7, 2.2, growth, { noLedge: true, shade: 0.4, jitter: 0.04 });
  for (let x = -12; x <= 12; x += 2.4) b.ball(BX + x, SILL.top - 0.25, SILL.z + rng.range(-0.2, 0.2), 1.25, pale, { squash: V(1.1, 0.42, 1), detail: 1, shade: 0.1 });
  // a shelf in the wall, reached only on high water
  b.box(BX + SHELF.x - 0.8, SHELF.top - 0.6, SHELF.z, 4.4, 1.2, 3.6, growth, { shade: 0.3 });
  // the shelf the spar leans on
  b.box(BX + SPAR_TOP.x + 0.6, SPAR_TOP.top - 0.5, SPAR_TOP.z, 3.4, 1.0, 3.6, growth, { shade: 0.3 });
  // ribs standing in the turning current
  for (const [x, z] of LEES) {
    b.cyl(BX + x, 2, z, 0.55, 0.8, 18, 0x9087b0, { seg: 8, noLedge: true, shade: 0.3, noShadow: true });
    for (let i = 0; i < 6; i++) glow.push({ pos: V(BX + x + Math.cos(i) * 0.9, 0.4 + i * 0.7, z + Math.sin(i) * 0.9), color: TEAL[i % 3], size: 0.4, sec: 5 });
  }
  // the throat: a rise out of the water, and three ledges
  const flesh = 0x7a6aa6;
  b.ramp(BX, -1.2, 150, 11, 2.2, 8, flesh, { shade: 0.2 });
  b.block(BX, -1.2, 156.25, 11, 2.2, 4.5, flesh, { shade: 0.2 });
  b.block(BX, -1.2, 160.25, 17, 3.4, 3.5, 0x8272ae, { shade: 0.25 });
  b.block(BX, -1.2, 163.75, 17, 4.6, 3.5, 0x8a7ab6, { shade: 0.25 });
  b.block(BX, -1.2, 172, 17, 5.8, 13, 0x9282be, { shade: 0.25 });

  // ---- veils
  const veils: (RAPIER.Collider | null)[] = VEILS.map((z) => b.wall(BX, 2, z, 30, 24, 0.5));

  // ---- hanging weed in rows
  for (const [z, gap] of WEED_ROWS) {
    for (let x = -11.2; x <= 11.3; x += 3.2) {
      if (Math.abs(x - gap) < 3.3) continue;
      const zz = z + rng.range(-0.5, 0.5);
      const top = bellyRoof(x, zz) + 0.2;
      weeds.push({ x: BX + x, z: zz, y: top, height: top + 1.7, radius: 1.75, hangs: true });
    }
  }

  // ---- lights that live here, asleep until the words wake them
  const tint = (sec: number) => (sec >= 8 ? PEARL : SEC_NIGHT[sec] ? MAGENTA : TEAL);
  for (let z = -6; z < 186; z += 1.9) {
    for (const side of [-1, 1]) {
      const zz = z + rng.range(-0.8, 0.8);
      const y = rng.range(0.5, 8.5);
      const sec = secOf(zz);
      glow.push({ pos: V(BX + side * bellyWall(y, zz) * 0.965, y, zz), color: rng.pick(tint(sec)), size: rng.range(0.32, 0.8), sec });
    }
  }
  for (let z = 2; z < 180; z += 7.5) {
    const cx = rng.range(-5, 5);
    for (let i = 0; i < 7; i++) {
      const x = cx + rng.range(-2.2, 2.2);
      const zz = z + rng.range(-2.2, 2.2);
      const sec = secOf(zz);
      glow.push({ pos: V(BX + x, bellyRoof(x, zz) - 0.45, zz), color: rng.pick(tint(sec)), size: rng.range(0.3, 0.65), sec });
    }
  }
  for (let z = 4; z < 150; z += 3.4) {
    const zz = z + rng.range(-1.2, 1.2);
    const sec = secOf(zz);
    jellies.push({ x: BX + rng.range(-10, 10), z: zz, depth: rng.range(0.35, 1.9), color: rng.pick(tint(sec)), size: rng.range(0.32, 0.7), sec });
  }

  const group = b.finish('belly');
  for (const m of extras) group.add(m);

  // ---- flotsam: all of it on one body, which rides the water
  const body = physics.kinematic({ x: BX, y: 0, z: 0 });
  const f = new LevelBuilder(physics, 53, body);
  const wood = 0x8a6842;
  const dark = 0x5c4026;
  const w = { mat: 'wood' as const, jitter: 0.08, shade: 0.2 };
  // a piece of some ship's side, where he wakes
  f.box(0, -0.15, 3, 4.6, 0.9, 6.6, wood, w);
  for (let i = 0; i < 5; i++) f.box(0, 0.33, 0.4 + i * 1.3, 4.9, 0.14, 0.34, dark, { ...w, collide: false });
  f.box(-2.36, 0.5, 3, 0.2, 0.5, 6.6, dark, { ...w, collide: false });
  f.box(0, -0.05, 8.7, 0.95, 0.7, 5, dark, w);
  // adrift on the way to the second light
  f.box(-5, -0.15, 24, 2.2, 0.9, 1.4, wood, { ...w, rotY: 0.5 });
  f.box(4.5, -0.15, 29, 1.6, 0.9, 2.4, wood, { ...w, rotY: -0.3 });
  // to cross on
  STONES.forEach(([x, z], i) => {
    f.box(x, -0.15, z, 3, 0.9, 3, i % 2 ? wood : 0x94744c, { ...w, rotY: (i % 3) * 0.14 - 0.14 });
    f.box(x, 0.33, z, 3.1, 0.1, 0.3, dark, { ...w, collide: false, rotY: (i % 3) * 0.14 - 0.14 });
    f.box(x, 0.33, z + 1, 3.1, 0.1, 0.3, dark, { ...w, collide: false, rotY: (i % 3) * 0.14 - 0.14 });
  });
  // a spar fallen against the wall: the way up to a shelf
  {
    const from = V(STONES[2][0] + 1.45, 0.2, STONES[2][1] + 0.4);
    const to = V(SPAR_TOP.x - 0.9, SPAR_TOP.top - 0.12, SPAR_TOP.z);
    const d = to.clone().sub(from);
    const len = d.length();
    const mid = from.clone().add(to).multiplyScalar(0.5);
    f.box(mid.x, mid.y, mid.z, 0.95, 0.36, len + 0.5, dark, { ...w, rot: new THREE.Euler(-Math.asin(d.y / len), Math.atan2(d.x, d.z), 0, 'YXZ') });
  }
  const mesh = f.finish('flotsam');
  const drift: [THREE.Object3D, number, number, number][] = [
    [barrelMesh(), 6.5, 20, 0.4],
    [crateMesh(0.7, 3), -7.5, 33, 0.2],
    [barrelMesh(), -8, 49, 1.1],
    [jarMesh(), 7, 61, 0.6],
    [crateMesh(0.8, 0), 8, 125, 0.3],
  ];
  for (const [m, x, z, tip] of drift) {
    m.position.set(x, 0.02, z);
    m.rotation.set(tip, tip * 3, Math.PI / 2 - 0.2);
    mesh.add(m);
  }
  return { group, flotsam: { body, mesh }, weeds, glow, jellies, veils };
}

// ---- the dry land ---------------------------------------------------------------------------------------------------
// The sea lies toward -z, the land rises toward +z; the water's edge is at z = 0.

export const SHORE_SLOPE = 1 / 8;
/** The height of the sand. */
export function shoreY(z: number): number {
  return Math.min(z, 55) * SHORE_SLOPE;
}

export function buildShore(physics: Physics): THREE.Group {
  const b = new LevelBuilder(physics, 61);
  const rng = new Rng(9);
  const sand = 0xe2cfa0;
  const th = Math.atan(SHORE_SLOPE);
  // the beach: one long tilted slab, its top through the water's edge
  const cz = 10;
  b.box(SX, cz * SHORE_SLOPE - 0.5 * Math.cos(th), cz + 0.5 * Math.sin(th), 240, 1, 90 / Math.cos(th), sand, { mat: 'sand', rot: new THREE.Euler(-th, 0, 0), jitter: 0, shade: 0 });
  b.box(SX, shoreY(55) - 0.5, 135, 240, 1, 160, 0xd8c492, { mat: 'sand', jitter: 0, shade: 0 });
  // rocks at the water's edge
  const rocks: [number, number, number][] = [
    [-24, -1.5, 1.6],
    [-27, 1.2, 1.1],
    [10.5, -0.5, 1.9],
    [13, 2.4, 1.2],
    [7.5, 4, 0.7],
    [-16, 6, 1.4],
    [18, 9, 1.0],
  ];
  for (const [x, z, r] of rocks) b.ball(SX + x, shoreY(z) + r * 0.25, z, r, 0x8a8478, { squash: V(1.15, 0.7, 1), detail: 1, rotY: rng.range(0, TAU), collide: true });
  // driftwood, wrack and tufts
  b.cyl(SX - 5, shoreY(7) + 0.16, 7, 0.14, 0.2, 3.4, 0x9a8468, { mat: 'wood', rot: new THREE.Euler(Math.PI / 2 - 0.1, 0.5, 0), collide: false, seg: 6 });
  b.cyl(SX + 6.5, shoreY(11) + 0.14, 11, 0.1, 0.16, 2.4, 0xa08a6c, { mat: 'wood', rot: new THREE.Euler(Math.PI / 2, -0.9, 0), collide: false, seg: 6 });
  for (let i = 0; i < 46; i++) {
    const x = rng.range(-42, 42);
    const z = rng.range(17, 70);
    const s = rng.range(0.35, 0.8);
    b.cyl(SX + x, shoreY(z) + s * 0.45, z, 0.02, s * 0.5, s, rng.pick([0x8f9a58, 0x7f8f4c, 0xa0a060]), { seg: 5, collide: false, jitter: 0.1 });
  }
  // a standing stone at the top of the beach, where the way goes on
  b.cyl(SX + 3.2, shoreY(24) + 1.0, 24.6, 0.5, 0.7, 2.4, 0xb0a48c, { seg: 7 });
  b.cyl(SX - 3.4, shoreY(24) + 0.7, 24.2, 0.45, 0.6, 1.8, 0xa89c84, { seg: 7 });
  // the land beyond
  const hills: [number, number, number, number, number][] = [
    [-60, 120, 46, 0xb8a878, 0.3],
    [20, 150, 70, 0xa89c70, 0.34],
    [95, 125, 50, 0xc0ae80, 0.28],
    [-130, 150, 60, 0xa49868, 0.36],
    [150, 170, 64, 0x9c9468, 0.4],
  ];
  for (const [x, z, r, c, sq] of hills) b.ball(SX + x, shoreY(55) - 2, z, r, c, { squash: V(1.5, sq, 1), detail: 2, noShadow: true, jitter: 0.03 });
  for (let i = 0; i < 9; i++) b.ball(SX + rng.range(-70, 70), shoreY(55) + 0.2, rng.range(75, 100), rng.range(1.2, 2.6), rng.pick([0x7a8a4a, 0x6f8244, 0x8a9050]), { squash: V(1.2, 0.8, 1), detail: 1, noShadow: true });
  return b.finish('shore');
}
