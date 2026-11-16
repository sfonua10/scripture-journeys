// Chapter 6's pieces: the hill east of the city, the turning of the day, the booth, the gourd, the worm, and
// Nineveh far off across the plain. The chapter itself (what happens, and when) is in ch6_plant.ts.
import * as THREE from 'three';
import { GROUP, RAPIER, groups, type Physics } from '../core/physics';
import { Rng, TAU, clamp01, ease, fbm2, lerp, smoothstep } from '../core/util';
import { LevelBuilder, buildMesh, solid, worldMaterial } from '../gfx/build';
import { TEX_SCALE, dotTexture } from '../gfx/textures';

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Colliders that only cast shade: the shade ray sees them, and they are solid to nothing. */
export const SHADE = 0x0100;
export const SHADE_GROUPS = groups(SHADE, SHADE);
/** What the ray from Jonah's head toward the sun may strike: the world, and whatever only casts shade. */
export const SHADE_RAY = groups(0xffff, GROUP.WORLD | SHADE);

// ---- the ground ------------------------------------------------------------------------------------------------
// West is −x (the city), east is +x (the sun's rising and the wind), north is −z (the dry watercourse).

const WADI = { ax: -4, az: -22, bx: 38, bz: -36 };
const PATH: [number, number][] = [
  [-58, 7],
  [-40, 4.5],
  [-26, 6.5],
  [-13, 3],
  [-5, 1],
];

function segment(x: number, z: number, ax: number, az: number, bx: number, bz: number): [number, number] {
  const dx = bx - ax;
  const dz = bz - az;
  const t = clamp01(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz));
  return [Math.hypot(x - ax - dx * t, z - az - dz * t), t];
}

/** How far a place is from the middle of the dry watercourse. */
export function wadiDist(x: number, z: number): number {
  return segment(x, z, WADI.ax, WADI.az, WADI.bx, WADI.bz)[0];
}

function pathDist(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) best = Math.min(best, segment(x, z, PATH[i][0], PATH[i][1], PATH[i + 1][0], PATH[i + 1][1])[0]);
  return best;
}

/** The height of the hill. Its crown (the booth's place) is level; the plain lies fourteen metres below. */
export function hillY(x: number, z: number): number {
  const r = Math.hypot(x * 0.92, z);
  let y = -14 * smoothstep(9, 58, r);
  y += fbm2(x * 0.05 + 3.1, z * 0.05 - 1.7) * 2.2 * smoothstep(10, 24, r) * (1 - smoothstep(54, 70, r));
  const [d, t] = segment(x, z, WADI.ax, WADI.az, WADI.bx, WADI.bz);
  y -= 1.8 * Math.exp(-(d * d) / 13) * smoothstep(0, 0.14, t) * (1 - smoothstep(0.9, 1, t));
  return y;
}

export function hillNormal(x: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const e = 0.6;
  return out.set(hillY(x - e, z) - hillY(x + e, z), 2 * e, hillY(x, z - e) - hillY(x, z + e)).normalize();
}

/** The colour of the plain, where nothing is tilled. */
const PLAIN = 0xd9cc9e;
const HALF = 72;
const CELLS = 72;

/** The hill and the plain round it: one flat-shaded mesh, and the ground it is to the feet. */
export function buildTerrain(physics: Physics): THREE.Mesh {
  const n = CELLS;
  const cell = (HALF * 2) / n;
  const hs = new Float32Array((n + 1) * (n + 1));
  const verts = new Float32Array((n + 1) * (n + 1) * 3);
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = -HALF + i * cell;
      const z = -HALF + j * cell;
      const y = hillY(x, z);
      const k = i * (n + 1) + j;
      hs[k] = y;
      verts.set([x, y, z], k * 3);
    }
  }
  const index = new Uint32Array(n * n * 6);
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const rng = new Rng(61);
  const sand = new THREE.Color(0xe9dcbb);
  const rock = new THREE.Color(0xb7a98c);
  const bed = new THREE.Color(0xd3c6a4);
  const road = new THREE.Color(0xf4ecd4);
  const field = new THREE.Color(PLAIN);
  const c = new THREE.Color();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const d = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const scale = 1 / TEX_SCALE.sand;
  let w = 0;
  // colour is laid on by the place, not by the facet, so the path and the watercourse have soft edges
  const tint = (x: number, z: number, ny: number) => {
    const r = Math.hypot(x, z);
    c.copy(sand);
    c.lerp(field, Math.max(smoothstep(46, 64, r) * (0.6 + 0.4 * fbm2(x * 0.09, z * 0.09)), smoothstep(62, 70, Math.max(Math.abs(x), Math.abs(z)))));
    c.lerp(bed, clamp01(1.25 - wadiDist(x, z) / 3.2) * 0.9);
    c.lerp(road, clamp01(1.6 - pathDist(x, z) / 0.9) * 0.55 * smoothstep(6, 10, r));
    c.lerp(rock, smoothstep(0.95, 0.86, ny) * 0.8);
    c.multiplyScalar(1 + fbm2(x * 0.21 + 9, z * 0.21) * 0.045 + rng.range(-0.008, 0.008));
  };
  const tri = (i0: number, i1: number, i2: number) => {
    a.fromArray(verts, i0 * 3);
    b.fromArray(verts, i1 * 3);
    d.fromArray(verts, i2 * 3);
    for (const v of [a, b, d]) {
      // a dune is smooth: the normal is the hill's own, not the facet's
      hillNormal(v.x, v.z, e2);
      tint(v.x, v.z, e2.y);
      pos.push(v.x, v.y, v.z);
      col.push(c.r, c.g, c.b);
      uv.push(v.x * scale, v.z * scale);
      nor.push(e2.x, e2.y, e2.z);
    }
  };
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const k00 = i * (n + 1) + j;
      const k10 = (i + 1) * (n + 1) + j;
      const k01 = k00 + 1;
      const k11 = k10 + 1;
      // the diagonal alternates, so the facets do not all lean one way
      if ((i + j) % 2 === 0) {
        tri(k00, k01, k11);
        tri(k00, k11, k10);
        index.set([k00, k01, k11, k00, k11, k10], w);
      } else {
        tri(k00, k01, k10);
        tri(k01, k11, k10);
        index.set([k00, k01, k10, k01, k11, k10], w);
      }
      w += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mesh = new THREE.Mesh(g, worldMaterial('sand'));
  mesh.receiveShadow = true;
  mesh.name = 'hill';
  physics.trimesh(verts, index, { surface: 'sand', noLedge: true });
  // the plain beyond, out to the haze: one untextured sheet (a tiled one shimmers at this distance)
  const far = 1600;
  const py = -14.05;
  const plain = new THREE.Mesh(new THREE.PlaneGeometry(far * 2, far * 2), new THREE.MeshLambertMaterial({ color: PLAIN }));
  plain.rotation.x = -Math.PI / 2;
  plain.position.y = py;
  plain.receiveShadow = false;
  mesh.add(plain);
  physics.box({ x: 0, y: py - 0.5, z: 0 }, { x: far, y: 0.5, z: far }, undefined, { surface: 'sand', noLedge: true });
  return mesh;
}

// ---- what stands on the hill -----------------------------------------------------------------------------------

/** Something tall enough to stand in the shade of: for the painted shadows where there are no real ones. */
export interface Caster {
  x: number;
  z: number;
  /** The height of its top above the ground under it. */
  h: number;
  r: number;
  /** A canopy on a stem (its shadow falls clear of its foot) rather than a block standing on the ground. */
  floating?: boolean;
  /** A shelter to go under, not a mass to go round. */
  open?: boolean;
  /** 0..1: how much of it is there (a roof half made, a gourd half grown). */
  amount?: () => number;
}

export interface Scenery {
  casters: Caster[];
  /** Where the pieces of the booth lie. */
  poles: THREE.Vector3[];
  branches: THREE.Vector3[];
  cloth: THREE.Vector3;
  stones: THREE.Vector3[];
  scrolls: THREE.Vector3[];
}

const ROCKS = [0xbcae92, 0xad9f84, 0xc6b99c, 0xa3957b];

/** One lump of rock: a squashed, tilted, faceted ball. No collider. */
function lump(b: LevelBuilder, rng: Rng, x: number, y: number, z: number, rx: number, ry: number, rz: number, detail = 1) {
  b.ball(x, y, z, 1, rng.pick(ROCKS), { squash: V(rx, ry, rz), detail, mat: 'plaster', jitter: 0.05, shade: 0.28, rot: new THREE.Euler(rng.range(-0.25, 0.25), rng.range(0, TAU), rng.range(-0.25, 0.25)) });
}

/** A boulder: a great lump with lesser ones leaning on it. Solid, and it casts shade. */
function boulder(b: LevelBuilder, rng: Rng, casters: Caster[], x: number, z: number, size: number, height: number) {
  const y = hillY(x, z);
  const yaw = rng.range(0, TAU);
  lump(b, rng, x, y + height * 0.38, z, size * 0.6, height * 0.64, size * 0.52);
  const ox = Math.cos(yaw) * size * 0.5;
  const oz = Math.sin(yaw) * size * 0.5;
  lump(b, rng, x + ox, hillY(x + ox, z + oz) + height * 0.2, z + oz, size * 0.4, height * 0.4, size * 0.36);
  lump(b, rng, x - ox * 0.9, hillY(x - ox, z - oz) + height * 0.12, z - oz * 0.9, size * 0.3, height * 0.26, size * 0.3, 0);
  if (size > 2.3) lump(b, rng, x + oz * 0.8, hillY(x + oz, z - ox) + height * 0.1, z - ox * 0.8, size * 0.24, height * 0.2, size * 0.26, 0);
  b.solid(x, y + height * 0.42, z, size * 1.0, height * 1.0, size * 0.88, { surface: 'stone', noLedge: true });
  casters.push({ x, z, h: height, r: size * 0.52 });
}

/** A tamarisk: a leaning trunk and a flat, feathery crown that throws a wide shade. */
function tamarisk(b: LevelBuilder, physics: Physics, rng: Rng, casters: Caster[], x: number, z: number, height: number) {
  const y = hillY(x, z);
  const lean = rng.range(-0.18, 0.18);
  const top = V(x + lean * height, y + height * 0.72, z + rng.range(-0.3, 0.3));
  // trunk, in two crooked lengths
  limb(b, V(x, y - 0.2, z), V(x + lean * height * 0.5, y + height * 0.4, z + 0.15), 0.2, 0x6a5540);
  limb(b, V(x + lean * height * 0.5, y + height * 0.4, z + 0.15), top, 0.14, 0x74604a);
  physics.cylinder({ x, y: y + height * 0.3, z }, height * 0.3, 0.22, undefined, { surface: 'wood', noLedge: true });
  const greens = [0x7f9463, 0x8ea070, 0x6f8558, 0x9aa878];
  const crown = height * 0.62;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rng.range(-0.3, 0.3);
    const d = i === 0 ? 0 : crown * rng.range(0.4, 0.7);
    b.ball(top.x + Math.cos(a) * d, top.y + rng.range(-0.15, 0.4), top.z + Math.sin(a) * d, crown * rng.range(0.5, 0.72), rng.pick(greens), { squash: V(1, 0.42, 1), detail: 1, jitter: 0.08, shade: 0.3 });
  }
  const ball = RAPIER.ColliderDesc.ball(crown * 0.72).setTranslation(top.x, top.y + 0.1, top.z).setCollisionGroups(SHADE_GROUPS);
  physics.world.createCollider(ball);
  const flat = RAPIER.ColliderDesc.cylinder(0.15, crown * 1.15).setTranslation(top.x, top.y + 0.1, top.z).setCollisionGroups(SHADE_GROUPS);
  physics.world.createCollider(flat);
  casters.push({ x: top.x, z: top.z, h: top.y - y, r: crown * 1.1, floating: true });
}

const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const UP = V(0, 1, 0);

/** A straight length of wood from one point to another. No collider. */
export function limb(b: LevelBuilder, from: THREE.Vector3, to: THREE.Vector3, r: number, color: THREE.ColorRepresentation, rTop = r * 0.8) {
  _mid.addVectors(from, to).multiplyScalar(0.5);
  _dir.subVectors(to, from);
  const len = _dir.length();
  _q.setFromUnitVectors(UP, _dir.normalize());
  _e.setFromQuaternion(_q);
  b.cyl(_mid.x, _mid.y, _mid.z, rTop, r, len, color, { rot: _e.clone(), collide: false, seg: 6, mat: 'wood', jitter: 0.07 });
}

/** A dry bush: a few grey-green tufts. */
function bush(b: LevelBuilder, rng: Rng, x: number, z: number, s: number) {
  const y = hillY(x, z);
  const tones = [0x9a9870, 0xa8a27a, 0x8a8c64, 0xb4a880];
  for (let i = 0; i < 3; i++) b.ball(x + rng.range(-0.4, 0.4) * s, y + 0.18 * s, z + rng.range(-0.4, 0.4) * s, rng.range(0.3, 0.5) * s, rng.pick(tones), { squash: V(1, 0.7, 1), detail: 0, jitter: 0.1, shade: 0.35 });
}

/** A waymark: three stones piled. */
function cairn(b: LevelBuilder, rng: Rng, x: number, z: number) {
  const y = hillY(x, z);
  const st = (dx: number, dy: number, r: number, h: number) => b.ball(x + dx, y + dy, z + dx * 0.5, 1, rng.pick(ROCKS), { squash: V(r, h, r * 0.85), detail: 0, mat: 'plaster', jitter: 0.05, shade: 0.2, rotY: rng.range(0, 3) });
  st(0, 0.14, 0.36, 0.22);
  st(0.04, 0.45, 0.27, 0.17);
  st(-0.02, 0.7, 0.17, 0.13);
}

/** Everything that stands on the hill but the booth: rocks, trees, the old fold, the bounds. */
export function buildScenery(b: LevelBuilder, physics: Physics): Scenery {
  const rng = new Rng(404);
  const casters: Caster[] = [];

  // ---- rocks to rest in the shade of, between the crown and where the pieces lie
  boulder(b, rng, casters, 3.5, -10.5, 2.8, 3.3); // toward the watercourse
  boulder(b, rng, casters, 9, -17.5, 2.4, 2.9);
  boulder(b, rng, casters, 10.5, 7.5, 2.6, 3.2); // toward the old fold
  boulder(b, rng, casters, -8.5, 9.5, 2.7, 3.3); // toward the fallen tent
  boulder(b, rng, casters, -15.5, 15.5, 2.3, 2.8);
  boulder(b, rng, casters, -19, -4, 3.0, 3.1); // beside the path up
  boulder(b, rng, casters, -33, 9, 2.2, 2.0);
  boulder(b, rng, casters, 20, -14, 1.8, 1.6);
  boulder(b, rng, casters, 30, 8, 2.6, 2.2);
  boulder(b, rng, casters, -6, 24, 2.0, 1.7);
  boulder(b, rng, casters, 14, 28, 2.4, 2.0);
  boulder(b, rng, casters, -40, -18, 2.6, 2.1);
  // small stones scattered, for the look of scree
  for (let i = 0; i < 46; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(8, 56);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const s = rng.range(0.25, 0.7);
    b.ball(x, hillY(x, z) + s * 0.12, z, 1, rng.pick(ROCKS), { squash: V(s * 0.6, s * 0.36, s * 0.5), detail: 0, mat: 'plaster', jitter: 0.06, shade: 0.2, rotY: rng.range(0, 3), noShadow: s < 0.45 });
  }
  for (let i = 0; i < 40; i++) {
    const a = rng.range(0, TAU);
    const r = rng.range(9, 58);
    bush(b, rng, Math.cos(a) * r, Math.sin(a) * r, rng.range(0.7, 1.3));
  }

  // ---- the dry watercourse: tamarisks, and the branches lie under them
  tamarisk(b, physics, rng, casters, 4.5, -24.6, 4.2);
  tamarisk(b, physics, rng, casters, 14.5, -27.6, 4.8);
  tamarisk(b, physics, rng, casters, 23, -30.6, 4.0);
  tamarisk(b, physics, rng, casters, 31.5, -34.2, 5.0);
  for (let i = 0; i < 9; i++) {
    const t = rng.range(0.1, 0.9);
    const x = lerp(WADI.ax, WADI.bx, t) + rng.range(-2.6, 2.6);
    const z = lerp(WADI.az, WADI.bz, t) + rng.range(-2.6, 2.6);
    bush(b, rng, x, z, rng.range(0.9, 1.5));
  }
  // a slab leaning on two rocks at the head of the watercourse: deep shade, and something in it
  {
    const x = -5.5;
    const z = -21.5;
    const y = hillY(x, z);
    b.block(x - 1.7, y - 0.4, z, 1.3, 2.75, 2.2, ROCKS[1], { mat: 'plaster', rotY: 0.12, taper: 0.85, shade: 0.25, jitter: 0.05 });
    b.block(x + 1.8, y - 0.4, z + 0.2, 1.2, 2.6, 2.0, ROCKS[0], { mat: 'plaster', rotY: -0.15, taper: 0.86, shade: 0.25, jitter: 0.05 });
    b.box(x + 0.05, y + 2.55, z + 0.1, 5.2, 0.5, 2.9, ROCKS[3], { mat: 'plaster', rot: new THREE.Euler(0.04, 0.1, -0.05), noLedge: true });
    casters.push({ x, z, h: 2.6, r: 2.4, open: true });
  }

  // ---- the old fold on the south-east side: low walls, and poles left leaning in it
  {
    const x = 17;
    const z = 15;
    const stone = [0xc2b497, 0xb3a588, 0xcbbea2];
    for (let i = 0; i < 7; i++) {
      const px = x - 3.6 + i * 1.2;
      b.block(px, hillY(px, z + 2.6) - 0.2, z + 2.6, 1.25, rng.range(0.75, 1.1), 0.6, rng.pick(stone), { mat: 'stone', rotY: rng.range(-0.08, 0.08), jitter: 0.07 });
    }
    for (let i = 0; i < 4; i++) {
      const pz = z - 2 + i * 1.2;
      b.block(x + 3.9, hillY(x + 3.9, pz) - 0.2, pz, 0.6, rng.range(0.6, 1.0), 1.25, rng.pick(stone), { mat: 'stone', rotY: rng.range(-0.08, 0.08), jitter: 0.07 });
    }
    // fallen stones of the wall
    for (let i = 0; i < 5; i++) b.block(x - 3 + rng.range(0, 6), hillY(x, z - 3) - 0.1, z - 3.4 + rng.range(-1, 1), 0.5, 0.3, 0.45, rng.pick(stone), { mat: 'stone', rotY: rng.range(0, 3), collide: false });
  }

  // ---- a tent that fell long ago, on the south-west side: its poles, and its cloth
  {
    const x = -21;
    const z = 20;
    const y = hillY(x, z);
    limb(b, V(x - 0.8, y - 0.1, z - 0.6), V(x + 0.5, y + 1.7, z - 0.2), 0.07, 0x7a6248);
    limb(b, V(x + 1.6, y - 0.1, z + 0.1), V(x + 0.5, y + 1.7, z - 0.2), 0.07, 0x846a4e);
    limb(b, V(x + 0.3, y, z + 1.6), V(x - 1.3, y + 0.12, z + 2.4), 0.06, 0x7a6248);
    // a rag of the old cloth still hanging
    b.box(x + 0.5, y + 1.15, z - 0.2, 0.9, 0.95, 0.04, 0xb9a98a, { collide: false, mat: 'cloth', rot: new THREE.Euler(0.12, 0.5, 0.05), doubleSide: true });
    for (let i = 0; i < 6; i++) b.ball(x + Math.cos(i * 1.05) * 2.1, hillY(x, z) + 0.06, z + Math.sin(i * 1.05) * 2.1, 1, rng.pick(ROCKS), { squash: V(0.24, 0.15, 0.2), detail: 0, mat: 'plaster', rotY: i, shade: 0.15 });
  }

  // ---- a tall rock on the east side, in steps: something lies on top
  {
    const x = 25;
    const z = -5;
    const y = hillY(x, z) - 0.5;
    b.block(x - 2.3, y, z + 0.4, 2.2, 1.5, 2.2, ROCKS[0], { mat: 'plaster', rotY: 0.1, taper: 0.9, shade: 0.25 });
    b.block(x - 0.4, y, z, 2.3, 2.6, 2.5, ROCKS[1], { mat: 'plaster', rotY: -0.06, taper: 0.9, shade: 0.25 });
    b.block(x + 1.7, y, z - 0.3, 2.3, 3.9, 2.6, ROCKS[2], { mat: 'plaster', rotY: 0.05, taper: 0.88, shade: 0.25 });
    casters.push({ x: x + 1.2, z: z - 0.2, h: 3.2, r: 1.6 });
  }

  // ---- a shelf on the west brow, behind two rocks, that looks out on the city
  boulder(b, rng, casters, -29, -13.5, 2.4, 2.3);
  boulder(b, rng, casters, -27.5, -18.5, 2.0, 1.8);

  // ---- the way up
  cairn(b, rng, -41, 2.6);
  cairn(b, rng, -27, 8.4);
  cairn(b, rng, -14, 1.2);
  // a ring of stones on the crown: where a fire was, and where the booth will be
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2;
    b.ball(Math.cos(a) * 2.9, 0.05, Math.sin(a) * 2.6, 1, rng.pick(ROCKS), { squash: V(0.2, 0.12, 0.16), detail: 0, mat: 'plaster', rotY: a, noShadow: true, shade: 0.15 });
  }

  // ---- the bounds: an unseen ring, well down the slopes
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TAU;
    b.wall(Math.cos(a) * 61, -6, Math.sin(a) * 61, 20, 40, 1, -a + Math.PI / 2);
  }

  const at = (x: number, z: number, lift = 0.4) => V(x, hillY(x, z) + lift, z);
  return {
    casters,
    poles: [at(16.2, 15.4), at(18.6, 16.2)],
    // in the morning shadow of the trees, which falls to the north-west of them
    branches: [at(11.6, -28.8), at(20.4, -31.8)],
    cloth: at(-20.2, 21.4),
    stones: [at(-5.4, 3.8, 0.3), at(-6.5, 2.5, 0.3), at(-4.7, 5.2, 0.3), at(-4.6, -5.2, 0.3)],
    scrolls: [at(-5.4, -21.3, 0.95), V(26.7, hillY(25, -5) + 4.35, -5.3), at(-31.6, -16.2, 1.0)],
  };
}

// ---- the pieces of the booth, as things to carry ----------------------------------------------------------------

const POLE = [0x8a6e4c, 0x7c6244, 0x957852];

/** Two long poles bound together. */
export function polesMesh(): THREE.Group {
  return buildMesh((b) => {
    b.cyl(-0.08, 0, 0, 0.055, 0.07, 2.5, POLE[0], { rot: new THREE.Euler(Math.PI / 2, 0, 0.02), collide: false, seg: 6, mat: 'wood' });
    b.cyl(0.08, 0.01, 0.05, 0.05, 0.065, 2.4, POLE[1], { rot: new THREE.Euler(Math.PI / 2, 0, -0.03), collide: false, seg: 6, mat: 'wood' });
    for (const z of [-0.7, 0.7]) b.box(0, 0, z, 0.3, 0.17, 0.08, 0xcdbb92, { collide: false, mat: 'weave' });
  }, 11);
}

/** An armful of cut branches. */
export function branchesMesh(): THREE.Group {
  const rng = new Rng(77);
  const tones = [0x8f9a5e, 0x7e8a52, 0xa19f66, 0x6f7c4a, 0x9a8a58];
  return buildMesh((b) => {
    for (let i = 0; i < 9; i++) {
      const x = rng.range(-0.22, 0.22);
      const y = rng.range(-0.1, 0.12);
      b.box(x, y, rng.range(-0.1, 0.1), rng.range(0.12, 0.2), 0.05, rng.range(1.3, 1.7), rng.pick(tones), { collide: false, rot: new THREE.Euler(rng.range(-0.08, 0.08), rng.range(-0.14, 0.14), rng.range(-0.5, 0.5)), jitter: 0.1 });
    }
    b.cyl(0, 0, 0, 0.03, 0.035, 1.5, 0x6a5238, { rot: new THREE.Euler(Math.PI / 2, 0, 0), collide: false, seg: 5, mat: 'wood' });
    b.box(0, 0, 0, 0.5, 0.3, 0.07, 0xcdbb92, { collide: false, mat: 'weave' });
  }, 12);
}

const STRIPES = [0xe8dcc0, 0x9a3a2a, 0xe8dcc0, 0x35506e, 0xe8dcc0];

/** The cloth, rolled. */
export function clothRollMesh(): THREE.Group {
  return buildMesh((b) => {
    STRIPES.forEach((c, i) => b.cyl(0, 0, -0.4 + i * 0.2, 0.17, 0.17, 0.2, c, { rot: new THREE.Euler(Math.PI / 2, 0, 0), collide: false, seg: 8, mat: 'cloth', jitter: 0.03, shade: 0.05 }));
    b.box(0.05, -0.15, 0, 0.3, 0.03, 0.96, STRIPES[0], { collide: false, mat: 'cloth' });
  }, 13);
}

export function stoneMesh(seed: number): THREE.Group {
  const rng = new Rng(seed);
  return buildMesh((b) => {
    b.ball(0, 0, 0, 0.25, rng.pick(ROCKS), { squash: V(1, 0.68, 0.9), detail: 0, jitter: 0.08, shade: 0.25, mat: 'stone' });
  }, seed);
}

// ---- the booth --------------------------------------------------------------------------------------------------

interface Rise {
  obj: THREE.Object3D;
  t: number;
  from: number;
}

/**
 * The booth on the crown of the hill, raised a piece at a time: two pairs of posts, two loads of branches for the
 * roof, a cloth over it and down its east side, and stones to hold the cloth against the wind. Each piece that goes
 * up changes the shade it gives.
 */
export class Booth {
  readonly group = new THREE.Group();
  posts = 0;
  thatch = 0;
  cloth = false;
  stones = 0;
  /** How hard the wind is worrying the cloth, 0..1. */
  flap = 0.15;
  private postParts: THREE.Group[] = [];
  private thatchParts: THREE.Group[] = [];
  private clothTop: THREE.Group;
  private clothFlap: THREE.Group;
  private stoneParts: THREE.Group[] = [];
  private rises: Rise[] = [];
  private roof: RAPIER.Collider;
  private wall: RAPIER.Collider;
  private postColliders: RAPIER.Collider[] = [];
  private time = 0;

  constructor(private physics: Physics) {
    const rng = new Rng(9);
    // the west posts are the taller: the roof falls away toward the morning sun
    const corners: [number, number, number][] = [
      [-1.25, -1.05, 2.25],
      [-1.25, 1.05, 2.3],
      [1.3, -1.05, 1.9],
      [1.3, 1.05, 1.85],
    ];
    for (let pair = 0; pair < 2; pair++) {
      const [a, c] = [corners[pair * 2], corners[pair * 2 + 1]];
      const part = buildMesh((b) => {
        for (const [x, z, h] of [a, c]) {
          const lean = rng.range(-0.05, 0.05);
          limb(b, V(x, -0.25, z), V(x + lean, h, z + rng.range(-0.04, 0.04)), 0.075, rng.pick(POLE), 0.055);
          // a fork at the top, and stones wedged at the foot
          limb(b, V(x + lean, h - 0.05, z), V(x + lean + 0.12, h + 0.2, z + 0.03), 0.04, POLE[1], 0.03);
          limb(b, V(x + lean, h - 0.05, z), V(x + lean - 0.1, h + 0.17, z - 0.03), 0.04, POLE[1], 0.03);
          b.block(x + 0.14, -0.05, z + 0.1, 0.24, 0.16, 0.2, ROCKS[1], { mat: 'stone', collide: false, rotY: 0.4 });
          b.block(x - 0.12, -0.05, z - 0.12, 0.2, 0.14, 0.22, ROCKS[3], { mat: 'stone', collide: false, rotY: 1.1 });
        }
        // the beam between the pair
        limb(b, V(a[0], a[2] + 0.04, a[1] - 0.25), V(c[0], c[2] + 0.04, c[1] + 0.25), 0.05, POLE[2], 0.045);
      }, 20 + pair);
      this.add(part);
      this.postParts.push(part);
    }
    // the roof's slope: from 2.3 at the west beam to 1.9 at the east
    const roofY = (x: number) => lerp(2.34, 1.94, (x + 1.25) / 2.55);
    const tilt = Math.atan2(0.4, 2.55);
    const greens = [0x8f9a5e, 0x7e8a52, 0xa19f66, 0x6f7c4a, 0x9a8a58, 0xb0a070];
    // the first load: rafters and a first, open layer
    this.thatchParts.push(
      buildMesh((b) => {
        for (const z of [-0.95, -0.3, 0.35, 0.98]) limb(b, V(-1.6, roofY(-1.6) + 0.02, z + rng.range(-0.05, 0.05)), V(1.62, roofY(1.62) + 0.02, z + rng.range(-0.05, 0.05)), 0.04, rng.pick(POLE), 0.035);
        for (let i = 0; i < 9; i++) {
          const x = -1.45 + i * 0.36 + rng.range(-0.05, 0.05);
          b.box(x, roofY(x) + 0.09, rng.range(-0.1, 0.1), rng.range(0.16, 0.24), 0.04, rng.range(2.5, 2.9), rng.pick(greens), { collide: false, rot: new THREE.Euler(rng.range(-0.05, 0.05), rng.range(-0.12, 0.12), -tilt + rng.range(-0.1, 0.1)), jitter: 0.1, doubleSide: true });
        }
      }, 31),
    );
    // the second: a thick thatch that hangs over the edges
    this.thatchParts.push(
      buildMesh((b) => {
        for (let i = 0; i < 26; i++) {
          const x = rng.range(-1.7, 1.75);
          const z = rng.range(-1.25, 1.25);
          b.box(x, roofY(x) + 0.15 + rng.range(0, 0.07), z, rng.range(0.2, 0.34), 0.045, rng.range(1.1, 1.9), rng.pick(greens), { collide: false, rot: new THREE.Euler(rng.range(-0.1, 0.1), rng.range(-0.5, 0.5), -tilt + rng.range(-0.14, 0.14)), jitter: 0.12, doubleSide: true });
        }
        for (let i = 0; i < 10; i++) {
          const z = -1.3 + i * 0.29;
          b.box(-1.78, roofY(-1.7) + 0.02, z, 0.5, 0.04, 0.2, rng.pick(greens), { collide: false, rot: new THREE.Euler(0, rng.range(-0.3, 0.3), 0.55), jitter: 0.12, doubleSide: true });
        }
      }, 32),
    );
    for (const part of this.thatchParts) this.add(part);
    // the cloth: over the roof, and hanging down the east side as a wall against the low sun
    this.clothTop = buildMesh((b) => {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const z = -1.28 + (i + 0.5) * (2.56 / n);
        b.box(0.02, roofY(0) + 0.24, z, 3.56, 0.035, 2.56 / n + 0.005, STRIPES[i % 2 === 0 ? 0 : i % 4 === 1 ? 1 : 3], { collide: false, mat: 'cloth', rot: new THREE.Euler(0, 0, -tilt), jitter: 0.03, shade: 0, doubleSide: true });
      }
    }, 33);
    this.add(this.clothTop);
    this.clothFlap = buildMesh((b) => {
      const n = 9;
      for (let i = 0; i < n; i++) {
        const z = -1.28 + (i + 0.5) * (2.56 / n);
        b.box(0, -0.78, z, 0.035, 1.56, 2.56 / n + 0.005, STRIPES[i % 2 === 0 ? 0 : i % 4 === 1 ? 1 : 3], { collide: false, mat: 'cloth', jitter: 0.03, shade: 0.08, doubleSide: true });
      }
    }, 34);
    this.clothFlap.position.set(1.8, roofY(1.8) + 0.2, 0);
    for (const m of this.clothFlap.children) m.matrixAutoUpdate = false;
    this.group.add(this.clothFlap);
    this.clothFlap.visible = false;
    this.clothFlap.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    for (const [x, z, s] of [
      [-1.5, -1.0, 41],
      [-1.45, 1.05, 42],
    ]) {
      const st = stoneMesh(s);
      st.position.set(x, roofY(x) + 0.38, z);
      st.scale.setScalar(0.85);
      this.add(st);
      this.stoneParts.push(st);
    }

    // what it is to the shade ray and to the body
    const q = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -tilt);
    this.roof = physics.box({ x: 0.02, y: roofY(0) + 0.14, z: 0 }, { x: 1.82, y: 0.07, z: 1.34 }, q, undefined, SHADE_GROUPS);
    this.wall = physics.box({ x: 1.8, y: 1.2, z: 0 }, { x: 0.04, y: 0.8, z: 1.3 }, undefined, undefined, SHADE_GROUPS);
    this.roof.setEnabled(false);
    this.wall.setEnabled(false);
    for (const [x, z, h] of corners) {
      const c = physics.cylinder({ x, y: h / 2, z }, h / 2, 0.09, undefined, { surface: 'wood', noLedge: true });
      c.setEnabled(false);
      this.postColliders.push(c);
    }
  }

  private add(part: THREE.Object3D) {
    part.visible = false;
    part.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.group.add(part);
  }

  get roofHandle() {
    return this.roof.handle;
  }

  /** How much of the sun the roof keeps off: branches let some through, the cloth none. */
  get roofShade() {
    return this.cloth ? 1 : [0, 0.5, 0.8][this.thatch];
  }

  get done() {
    return this.posts === 2 && this.thatch === 2 && this.cloth && this.stones === 2;
  }

  /** Sets what is standing. `quick` puts it there without the piece rising into place. */
  set(posts: number, thatch: number, cloth: boolean, stones: number, quick = false) {
    const show = (obj: THREE.Object3D, on: boolean, from = 0.35) => {
      if (on && !obj.visible && !quick) this.rises.push({ obj, t: 0, from });
      obj.visible = on;
      if (!on || quick) {
        obj.scale.setScalar(obj === this.stoneParts[0] || obj === this.stoneParts[1] ? 0.85 : 1);
        this.rises = this.rises.filter((r) => r.obj !== obj);
      }
    };
    this.postParts.forEach((p, i) => show(p, i < posts));
    this.thatchParts.forEach((p, i) => show(p, i < thatch, 0.7));
    show(this.clothTop, cloth, 0.8);
    show(this.clothFlap, cloth, 0.8);
    this.stoneParts.forEach((p, i) => show(p, i < stones, 0.6));
    this.posts = posts;
    this.thatch = thatch;
    this.cloth = cloth;
    this.stones = stones;
    this.roof.setEnabled(thatch > 0 || cloth);
    this.wall.setEnabled(cloth);
    this.postColliders.forEach((c, i) => c.setEnabled(i < posts * 2));
  }

  update(dt: number) {
    this.time += dt;
    for (const r of this.rises) {
      r.t = Math.min(1, r.t + dt / 0.5);
      const base = this.stoneParts.includes(r.obj as THREE.Group) ? 0.85 : 1;
      r.obj.scale.setScalar(base * lerp(r.from, 1, ease.outBack(r.t)));
    }
    this.rises = this.rises.filter((r) => r.t < 1);
    if (this.clothFlap.visible) {
      const t = this.time;
      const k = this.flap * (this.stones >= 2 ? 0.5 : 1);
      this.clothFlap.rotation.z = -0.05 - k * (0.22 + Math.sin(t * 5.1) * 0.13 + Math.sin(t * 8.7 + 1) * 0.07);
      this.clothFlap.rotation.x = Math.sin(t * 3.3) * 0.03 * k;
    }
  }

  dispose() {
    for (const c of [this.roof, this.wall, ...this.postColliders]) this.physics.removeCollider(c);
  }
}

// ---- the gourd --------------------------------------------------------------------------------------------------

interface Leaf {
  p: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  size: number;
  /** When in the growing it opens, 0..1. */
  born: number;
  /** How far out over the edge it hangs (these sag most when it withers). */
  out: number;
  tone: THREE.Color;
  fall: number;
}

interface Stem {
  a: THREE.Vector3;
  b: THREE.Vector3;
  r: number;
  born: number;
}

function leafGeometry(): THREE.BufferGeometry {
  // a broad lobed leaf lying in the xz plane, its stalk at the origin, its tip toward +z; a little cupped
  const rim: [number, number, number][] = [
    [0.0, 0.0, 0.0],
    [0.36, 0.05, 0.1],
    [0.55, 0.0, 0.42],
    [0.34, -0.04, 0.6],
    [0.3, -0.07, 0.9],
    [0.0, -0.1, 1.06],
    [-0.3, -0.07, 0.9],
    [-0.34, -0.04, 0.6],
    [-0.55, 0.0, 0.42],
    [-0.36, 0.05, 0.1],
  ];
  const mid: [number, number, number] = [0, 0.07, 0.5];
  const pos: number[] = [];
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % rim.length];
    pos.push(...mid, ...b, ...a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const GREEN = [0x62b23e, 0x4f9a34, 0x7cc650, 0x68ae3c, 0x94d262, 0x57a238];
const DEAD = [0x8a6a3a, 0x7a5a30, 0x9a7a44, 0x6e5230];
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _qa = new THREE.Quaternion();

/**
 * The gourd: a vine that comes up by the booth's north-east post, runs over the roof and hangs over its edges in
 * broad leaves. It grows (0..1) and it withers (0..1); both only move instances about.
 */
export class Gourd {
  readonly group = new THREE.Group();
  grown = 0;
  withered = 0;
  /** Where the worm can get at it: the root, and two runners that touch the ground. */
  readonly roots = [V(2.0, 0, -1.75), V(-2.55, 0, 1.7), V(0.4, 0, 2.5)];
  private leaves: Leaf[] = [];
  private stems: Stem[] = [];
  private leafMesh: THREE.InstancedMesh;
  private stemMesh: THREE.InstancedMesh;
  private fruits: { mesh: THREE.Mesh; born: number; at: THREE.Vector3; size: number }[] = [];
  private flowers: THREE.InstancedMesh;
  private flowerAt: { p: THREE.Vector3; born: number }[] = [];
  private canopy: RAPIER.Collider[] = [];
  private time = 0;
  private lastKey = '';

  constructor(private physics: Physics) {
    const rng = new Rng(4606);
    const roofY = (x: number) => lerp(2.62, 2.22, clamp01((x + 1.25) / 2.55));
    // ---- the runners: up the post from the root, then out over the roof every way
    const run = (pts: THREE.Vector3[], from: number, to: number, r: number, leafEvery: number, hang = 0) => {
      let len = 0;
      const lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push((len += pts[i].distanceTo(pts[i - 1])));
      for (let i = 1; i < pts.length; i++) this.stems.push({ a: pts[i - 1], b: pts[i], r: lerp(r, r * 0.5, lens[i] / len), born: lerp(from, to, lens[i - 1] / len) });
      let next = leafEvery * 0.5;
      let side = rng.sign();
      for (let i = 1; i < pts.length; i++) {
        while (next <= lens[i]) {
          const t = (next - lens[i - 1]) / (lens[i] - lens[i - 1]);
          const p = pts[i - 1].clone().lerp(pts[i], t);
          const along = Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
          side = -side;
          const over = Math.max(0, Math.max(Math.abs(p.x) - 1.75, Math.abs(p.z) - 1.3));
          this.leaves.push({
            p: p.add(V(rng.range(-0.06, 0.06), 0.05 + rng.range(0, 0.1), rng.range(-0.06, 0.06))),
            yaw: along + side * rng.range(0.6, 1.5),
            pitch: rng.range(-0.25, 0.2) + (p.y < 1.8 ? -0.5 : 0),
            roll: rng.range(-0.3, 0.3),
            size: rng.range(0.62, 1.12) * (p.y < 1.6 ? 0.7 : 1) * lerp(1, 0.72, next / len),
            born: lerp(from, to, next / len) + 0.04,
            out: over + hang,
            tone: new THREE.Color(rng.pick(GREEN)),
            fall: rng.range(0.55, 1),
          });
          next += leafEvery * rng.range(0.8, 1.25);
        }
      }
    };
    const root = this.roots[0];
    const top = V(1.34, 2.05, -1.1);
    // the main stem winds up the north-east post
    const climb: THREE.Vector3[] = [root.clone().setY(-0.1)];
    for (let i = 1; i <= 7; i++) {
      const t = i / 7;
      const a = t * 5.2;
      climb.push(V(lerp(root.x - 0.3, top.x, t) + Math.cos(a) * 0.13 * (1 - t * 0.3), lerp(0.1, top.y, t), lerp(root.z + 0.25, top.z, t) + Math.sin(a) * 0.13));
    }
    run(climb, 0, 0.3, 0.07, 0.42);
    // runners over the roof, each ending past an edge and hanging a little
    const spread: [number, number, number][] = [
      [-2.5, -1.5, 0.75],
      [-2.75, -0.3, 0.65],
      [-2.6, 1.0, 0.8],
      [-1.2, 2.1, 0.9],
      [0.4, 2.2, 0.85],
      [1.9, 1.9, 0.75],
      [2.5, 0.3, 0.55],
      [0.2, -2.1, 0.6],
      [-1.2, -2.1, 0.7],
      [-2.0, 1.8, 0.8],
      [-0.5, 1.2, 0.7],
      [-1.6, -0.9, 0.7],
      [2.4, -1.4, 0.5],
    ];
    spread.forEach(([ex, ez], k) => {
      const pts: THREE.Vector3[] = [top.clone()];
      const n = 6;
      const bend = rng.range(-0.5, 0.5);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const x = lerp(top.x, ex, t) + Math.sin(t * Math.PI) * bend * 0.6;
        const z = lerp(top.z, ez, t) + Math.sin(t * Math.PI) * bend * 0.6;
        const overEdge = Math.max(0, Math.max(Math.abs(x) - 1.8, Math.abs(z) - 1.35));
        pts.push(V(x, roofY(x) - overEdge * 0.55 + Math.sin(t * 9 + k) * 0.03, z));
      }
      run(pts, 0.28, 0.82 + rng.range(0, 0.1), 0.045, 0.25);
    });
    // two runners come right down to the ground, on the west and the south: more of it for the worm to find
    for (const [k, foot] of [
      [2, this.roots[1]],
      [4, this.roots[2]],
    ] as [number, THREE.Vector3][]) {
      const [ex, ez] = spread[k];
      const from = V(ex, roofY(ex) - 0.45, ez);
      run([from, V(lerp(ex, foot.x, 0.5), 1.15, lerp(ez, foot.z, 0.5)), V(foot.x, 0.25, foot.z), V(foot.x - 0.4, 0.04, foot.z + 0.3)], 0.8, 1, 0.035, 0.4, 0.4);
    }
    // ---- drawn as instances
    this.leafMesh = new THREE.InstancedMesh(leafGeometry(), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, flatShading: true, emissive: 0x1c3c0e }), this.leaves.length);
    this.leafMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.leafMesh.castShadow = true;
    this.leafMesh.receiveShadow = true;
    this.leafMesh.frustumCulled = false;
    const stemGeo = new THREE.CylinderGeometry(0.72, 1, 1, 5, 1, true);
    stemGeo.translate(0, 0.5, 0);
    this.stemMesh = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ flatShading: true }), this.stems.length);
    this.stemMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.stemMesh.castShadow = true;
    this.stemMesh.frustumCulled = false;
    this.group.add(this.leafMesh, this.stemMesh);
    // gourds hanging under the eaves, and a few flowers
    const fruitGeo = new THREE.LatheGeometry(
      [
        [0, 0.0],
        [0.05, -0.04],
        [0.07, -0.18],
        [0.15, -0.3],
        [0.2, -0.44],
        [0.15, -0.58],
        [0, -0.62],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      7,
    );
    const fruitMat = new THREE.MeshLambertMaterial({ color: 0xcfd98a, flatShading: true });
    for (const [x, z, s, born] of [
      [-2.15, -0.7, 1, 0.86],
      [-1.6, 1.75, 0.8, 0.9],
      [0.9, 1.85, 1.1, 0.93],
      [-0.4, -1.85, 0.7, 0.96],
    ]) {
      const mesh = new THREE.Mesh(fruitGeo, fruitMat);
      mesh.castShadow = true;
      const at = V(x, roofY(x) - 0.42, z);
      mesh.position.copy(at);
      this.group.add(mesh);
      this.fruits.push({ mesh, born, at, size: s });
    }
    const flowerGeo = new THREE.ConeGeometry(0.11, 0.1, 5, 1, true);
    flowerGeo.rotateX(Math.PI);
    this.flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshLambertMaterial({ color: 0xf6e27a, emissive: 0x5a4a10, flatShading: true, side: THREE.DoubleSide }), 9);
    this.flowers.frustumCulled = false;
    for (let i = 0; i < 9; i++) {
      const l = this.leaves[Math.floor(rng.range(0.25, 1) * (this.leaves.length - 1))];
      this.flowerAt.push({ p: l.p.clone().add(V(rng.range(-0.2, 0.2), 0.16, rng.range(-0.2, 0.2))), born: Math.min(0.98, l.born + 0.12) });
    }
    this.group.add(this.flowers);
    // its shade: a wide canopy over the booth and past its edges
    this.canopy.push(physics.box({ x: -0.2, y: 2.62, z: 0.1 }, { x: 2.75, y: 0.06, z: 2.35 }, undefined, undefined, SHADE_GROUPS));
    this.canopy.push(physics.box({ x: 2.3, y: 1.5, z: 0 }, { x: 0.05, y: 1.1, z: 2.0 }, undefined, undefined, SHADE_GROUPS));
    for (const c of this.canopy) c.setEnabled(false);
    this.apply(true);
  }

  isCanopy(handle: number) {
    return this.canopy.some((c) => c.handle === handle);
  }

  /** How much sun it keeps off now. */
  get shade() {
    return smoothstep(0.55, 0.95, this.grown) * (1 - smoothstep(0.25, 0.9, this.withered));
  }

  update(dt: number) {
    this.time += dt;
    this.apply(false);
  }

  private apply(force: boolean) {
    const on = this.grown > 0.6 && this.withered < 0.9;
    for (const c of this.canopy) if (c.isEnabled() !== on) c.setEnabled(on);
    this.group.visible = this.grown > 0;
    if (!this.group.visible) return;
    // leaves stir in the air while alive, so they are written every frame it is seen; a dead vine is written once
    const key = `${this.grown.toFixed(4)}|${this.withered.toFixed(4)}`;
    const still = this.withered >= 1;
    if (!force && still && key === this.lastKey) return;
    this.lastKey = key;
    const g = this.grown;
    const w = this.withered;
    const t = this.time;
    this.leaves.forEach((l, i) => {
      const open = ease.outBack(clamp01((g - l.born) / 0.1));
      const wl = clamp01(w * 1.5 - l.fall * 0.5);
      const droop = wl * (0.9 + l.out * 0.6);
      const sway = (1 - wl) * Math.sin(t * 1.3 + i * 1.7) * 0.05;
      _e.set(l.pitch - droop + sway, l.yaw, l.roll + wl * (i % 2 ? 0.5 : -0.5), 'YXZ');
      _qa.setFromEuler(_e);
      const s = l.size * open * (1 - wl * 0.4);
      _p.copy(l.p);
      _p.y -= wl * (0.12 + l.out * 0.5);
      _m.compose(_p, _qa, _s.set(s * (1 - wl * 0.35), s, s));
      this.leafMesh.setMatrixAt(i, _m);
      _c.copy(l.tone).lerp(_c2.set(DEAD[i % DEAD.length]), smoothstep(0.05, 0.8, wl));
      this.leafMesh.setColorAt(i, _c);
    });
    this.leafMesh.instanceMatrix.needsUpdate = true;
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    // a living leaf lets the light through; a dead one does not
    (this.leafMesh.material as THREE.MeshLambertMaterial).emissive.set(0x1c3c0e).multiplyScalar(1 - smoothstep(0.1, 0.7, w));
    this.stems.forEach((st, i) => {
      const k = clamp01((g - st.born) / 0.05);
      _dir.subVectors(st.b, st.a);
      const len = _dir.length();
      _qa.setFromUnitVectors(UP, _dir.normalize());
      _m.compose(st.a, _qa, _s.set(st.r * (k > 0 ? 1 : 0) * (1 - w * 0.3), len * k * 1.04, st.r * (k > 0 ? 1 : 0) * (1 - w * 0.3)));
      this.stemMesh.setMatrixAt(i, _m);
      _c.set(0x4c8a34).lerp(_c2.set(0x6a5232), smoothstep(0.1, 0.8, w));
      this.stemMesh.setColorAt(i, _c);
    });
    this.stemMesh.instanceMatrix.needsUpdate = true;
    if (this.stemMesh.instanceColor) this.stemMesh.instanceColor.needsUpdate = true;
    for (const f of this.fruits) {
      const k = ease.outBack(clamp01((g - f.born) / 0.08));
      f.mesh.scale.setScalar(Math.max(0.0001, k * f.size * (1 - w * 0.3)));
      f.mesh.position.copy(f.at);
      f.mesh.position.y -= w * 0.5;
      f.mesh.rotation.z = Math.sin(t * 1.1 + f.at.x) * 0.06 * (1 - w) + w * 0.5;
    }
    (this.fruits[0].mesh.material as THREE.MeshLambertMaterial).color.set(0xcfd98a).lerp(_c2.set(0x9a8450), w);
    this.flowerAt.forEach((f, i) => {
      const k = ease.outBack(clamp01((g - f.born) / 0.06)) * (1 - smoothstep(0, 0.4, w));
      _m.compose(f.p, _qa.identity(), _s.setScalar(Math.max(0.0001, k)));
      this.flowers.setMatrixAt(i, _m);
    });
    this.flowers.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const c of this.canopy) this.physics.removeCollider(c);
    this.leafMesh.geometry.dispose();
    (this.leafMesh.material as THREE.Material).dispose();
    this.stemMesh.geometry.dispose();
    (this.stemMesh.material as THREE.Material).dispose();
    this.flowers.geometry.dispose();
    (this.flowers.material as THREE.Material).dispose();
    this.fruits[0].mesh.geometry.dispose();
    (this.fruits[0].mesh.material as THREE.Material).dispose();
  }
}

// ---- the worm ---------------------------------------------------------------------------------------------------

/** A fat pale worm, a good deal bigger than life so it can be seen and chased. */
export class WormFigure {
  readonly group = new THREE.Group();
  private segs: THREE.Mesh[] = [];
  private t = 0;
  /** 0 still .. 1 going flat out. */
  speed = 0;
  /** 0..1: how far out of the ground it is. */
  out = 1;
  gnawing = false;

  constructor() {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const body = new THREE.MeshLambertMaterial({ color: 0xf0d6b8, flatShading: true });
    const band = new THREE.MeshLambertMaterial({ color: 0xe0b890, flatShading: true });
    const head = new THREE.MeshLambertMaterial({ color: 0x9a4a2a, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(geo, i === 0 ? head : i % 2 ? body : band);
      m.castShadow = true;
      this.segs.push(m);
      this.group.add(m);
    }
  }

  update(dt: number) {
    this.t += dt * (3 + this.speed * 16 + (this.gnawing ? 6 : 0));
    const n = this.segs.length;
    this.segs.forEach((m, i) => {
      const k = i / (n - 1);
      const r = (i === 0 ? 0.082 : lerp(0.1, 0.058, k)) * (0.6 + 0.4 * this.out);
      // an inching wave runs down the body; the head bobs when it gnaws
      const wave = Math.sin(this.t - i * 0.9);
      const z = -i * 0.102 * (1 + wave * 0.12 * (0.4 + this.speed));
      const y = r + Math.max(0, wave) * 0.07 * (0.3 + this.speed) + (i === 0 && this.gnawing ? Math.abs(Math.sin(this.t * 1.7)) * 0.06 : 0);
      m.position.set(Math.sin(this.t * 0.5 + i * 0.7) * 0.02 * (1 + this.speed), y - (1 - this.out) * 0.3, z);
      m.scale.set(r * 1.05, r * (1 - wave * 0.08), r * 1.2);
    });
    this.group.visible = this.out > 0.02;
  }

  dispose() {
    this.segs[0].geometry.dispose();
    for (const i of [0, 1, 2]) (this.segs[i].material as THREE.Material).dispose();
  }
}

/** A worm hole: a dark mouth in a little mound. */
export function holeMesh(): THREE.Group {
  const g = buildMesh((b) => {
    b.cyl(0, 0.03, 0, 0.2, 0.42, 0.12, 0xd8c8a2, { collide: false, seg: 8, mat: 'sand', shade: 0.1 });
  }, 55);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.19, 8), new THREE.MeshBasicMaterial({ color: 0x1c140c }));
  mouth.rotation.x = -Math.PI / 2;
  mouth.position.y = 0.095;
  g.add(mouth);
  return g;
}

// ---- Nineveh, far off -------------------------------------------------------------------------------------------

export interface FarCity {
  group: THREE.Group;
  /** Lamps in the windows: shown at dusk and by night. */
  lamps: THREE.Points;
  /** People on the road and the walls, as far motes. */
  people: THREE.Points;
  cattle: THREE.InstancedMesh;
  update(time: number, night: number): void;
  dispose(): void;
}

/** That great city across the plain, and the cattle between: seen, never reached. Nothing here is solid. */
export function buildCity(crowd: number): FarCity {
  const rng = new Rng(3003);
  const group = new THREE.Group();
  const y0 = -14;
  const wallX = -235;
  const ochre = [0xd8b884, 0xcaa872, 0xe0c494, 0xc49e6a];
  const lapis = 0x3a5f9a;
  const lampAt: number[] = [];
  const city = buildMesh((b) => {
    b.chunk = 1e6;
    const far = { collide: false, noShadow: true, mat: 'plaster' as const, jitter: 0.05, shade: 0.2 };
    // the wall, with towers, along the city's east side
    b.block(wallX, y0, 0, 9, 17, 620, ochre[0], far);
    for (let z = -300; z <= 300; z += 30) {
      if (Math.abs(z) < 20) continue;
      b.block(wallX + 2, y0, z, 13, 24, 12, ochre[1], { ...far, taper: 0.92 });
      for (const dz of [-4, 0, 4]) b.block(wallX + 2, y0 + 24, z + dz, 13, 2, 2.4, ochre[1], far);
    }
    // battlements
    for (let z = -296; z <= 296; z += 6) b.block(wallX + 3.6, y0 + 17, z, 1.6, 1.8, 3, ochre[2], far);
    // the gate: two great towers, blue-glazed, and the dark way between
    for (const s of [-1, 1]) {
      b.block(wallX + 4, y0, s * 13, 16, 31, 13, ochre[2], { ...far, taper: 0.94 });
      b.block(wallX + 12.2, y0 + 6, s * 13, 0.6, 17, 8, lapis, { ...far, mat: 'brick' });
      b.block(wallX + 12.4, y0 + 24, s * 13, 0.6, 2.2, 10, 0xd9b24a, far);
      for (const dz of [-4.6, 0, 4.6]) b.block(wallX + 4, y0 + 31, s * 13 + dz, 16, 2.4, 2.6, ochre[2], far);
    }
    b.block(wallX + 4, y0 + 18, 0, 12, 9, 14, ochre[0], far);
    b.block(wallX + 9.7, y0 + 19.5, 0, 0.6, 6, 13.4, lapis, { ...far, mat: 'brick' });
    b.block(wallX + 10.2, y0, 0, 0.5, 18, 13, 0x2a2018, far);
    // within: the stepped tower, the palace, and roofs upon roofs
    const zx = wallX - 95;
    for (let i = 0; i < 5; i++) b.block(zx, y0 + i * 12, -70, 84 - i * 15, 12, 84 - i * 15, i % 2 ? ochre[3] : ochre[2], { ...far, taper: 0.93 });
    b.block(zx, y0 + 60, -70, 12, 9, 12, lapis, { ...far, mat: 'brick' });
    b.block(wallX - 60, y0, 95, 70, 34, 90, ochre[2], { ...far, taper: 0.96 });
    b.block(wallX - 60, y0 + 34, 95, 48, 9, 60, ochre[0], far);
    for (const dz of [-34, -17, 0, 17, 34]) b.block(wallX - 24.6, y0 + 4, 95 + dz, 1, 22, 6, 0x4a3a2a, far);
    for (let i = 0; i < 150; i++) {
      const x = wallX - rng.range(14, 190);
      const z = rng.range(-290, 290);
      const w = rng.range(9, 20);
      const h = rng.range(15, 30) + (rng.chance(0.12) ? 12 : 0);
      b.block(x, y0, z, w, h, rng.range(9, 20), rng.pick(ochre), far);
      lampAt.push(x + w / 2 + 0.6, y0 + h - rng.range(2, 6), z + rng.range(-3, 3));
      if (h > 19) lampAt.push(x + w / 2 + 0.6, y0 + h - rng.range(7, 12), z + rng.range(-4, 4));
    }
    // lamps along the wall and at the gate
    for (let z = -296; z <= 296; z += 7.5) lampAt.push(wallX + 5.2, y0 + rng.pick([15, 15, 11, 19]), z + rng.range(-2, 2));
    for (let z = -300; z <= 300; z += 30) lampAt.push(wallX + 9.2, y0 + 21, z - 2.5, wallX + 9.2, y0 + 21, z + 2.5);
    for (const s of [-1, 1]) lampAt.push(wallX + 12.9, y0 + 9, s * 6.6, wallX + 12.9, y0 + 22, s * 13);
    // palms and gardens outside the wall, along the water
    for (let i = 0; i < 46; i++) {
      const x = wallX + rng.range(22, 60);
      const z = rng.range(-280, 280);
      if (Math.abs(z) < 16) continue;
      const h = rng.range(7, 12);
      b.cyl(x, y0 + h / 2, z, 0.3, 0.5, h, 0x7a6248, { collide: false, noShadow: true, seg: 5 });
      const green = rng.pick([0x5f8a4a, 0x6f9a52, 0x527a40]);
      const fronds = 7;
      const a0 = rng.range(0, TAU);
      for (let k = 0; k < fronds; k++) {
        const a = a0 + (k / fronds) * TAU;
        const len = rng.range(3.2, 4.4);
        const droop = rng.range(0.3, 0.6);
        b.box(x + Math.cos(a) * len * 0.45, y0 + h + 0.3 - Math.sin(droop) * len * 0.45, z - Math.sin(a) * len * 0.45, len, 0.12, 1.0, green, { collide: false, noShadow: true, rot: new THREE.Euler(0, a, -droop), taper: 1, jitter: 0.08, shade: 0 });
      }
      b.ball(x, y0 + h + 0.2, z, 0.7, green, { detail: 0, noShadow: true, shade: 0.2 });
    }
    // tilled land between the river and the hill
    const tilled = [0xa9b06a, 0xb8b878, 0x98a460, 0xc4b67a, 0xcdbf8a];
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-190, -85);
      const z = rng.range(-240, 240);
      b.box(x, y0 + 0.05, z, rng.range(14, 34), 0.3, rng.range(10, 30), rng.pick(tilled), { collide: false, noShadow: true, rotY: rng.range(-0.2, 0.2), shade: 0, jitter: 0.06 });
    }
    // and the open country all round: pasture, fallow, bare ground, in great faint patches
    const open = [0xcfc48f, 0xd2c08e, 0xc6bd86, 0xdccfa6, 0xbfb67c];
    for (let i = 0; i < 80; i++) {
      const a = rng.range(0, TAU);
      const r = rng.range(95, 520);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (x < wallX + 70) continue;
      b.box(x, y0 + 0.03, z, rng.range(30, 90), 0.26, rng.range(24, 70), rng.pick(open), { collide: false, noShadow: true, rotY: rng.range(-0.5, 0.5), shade: 0, jitter: 0.03 });
    }
    // the road from the gate to the foot of the hill
    b.box(-145, y0 + 0.07, 3, 172, 0.3, 5, 0xf0e6cc, { collide: false, noShadow: true, shade: 0, jitter: 0.02, rotY: -0.02 });
  }, 3003);
  group.add(city);
  // the river under the wall, catching the sky
  const river = new THREE.Mesh(new THREE.PlaneGeometry(26, 900), new THREE.MeshBasicMaterial({ color: 0x9fc4d8, fog: true }));
  river.rotation.x = -Math.PI / 2;
  river.position.set(wallX + 40, y0 + 0.26, 0);
  group.add(river);

  // lamps
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampAt, 3));
  const lamps = new THREE.Points(lampGeo, new THREE.PointsMaterial({ color: 0xffc070, map: dotTexture(), size: 5.5, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  lamps.frustumCulled = false;
  group.add(lamps);

  // people: on the road, in the fields, before the gate
  const count = Math.max(24, Math.round(90 * crowd));
  const walkers: { x: number; z: number; vx: number; vz: number; lo: number; hi: number }[] = [];
  for (let i = 0; i < count; i++) {
    const onRoad = i % 3 !== 0;
    const x = onRoad ? rng.range(-222, -70) : rng.range(-200, -90);
    const z = onRoad ? 3 + rng.range(-1.8, 1.8) + (x + 145) * 0.02 : rng.range(-120, 120);
    const sp = rng.range(0.6, 1.3) * rng.sign();
    walkers.push({ x, z, vx: onRoad ? sp : sp * 0.3, vz: onRoad ? 0 : sp * 0.5, lo: onRoad ? -222 : x - 12, hi: onRoad ? -70 : x + 12 });
  }
  const peopleGeo = new THREE.BufferGeometry();
  const peoplePos = new Float32Array(count * 3);
  peopleGeo.setAttribute('position', new THREE.BufferAttribute(peoplePos, 3));
  const people = new THREE.Points(peopleGeo, new THREE.PointsMaterial({ color: 0x4a3a2e, map: dotTexture(), alphaTest: 0.4, size: 1.3, sizeAttenuation: true, fog: true }));
  people.frustumCulled = false;
  group.add(people);

  // much cattle
  const cow = buildMesh((b) => {
    b.box(0, 0.95, 0, 0.75, 0.8, 1.7, 0xffffff, { collide: false, noShadow: true, shade: 0.25, jitter: 0 });
    b.box(0, 1.25, 1.05, 0.5, 0.5, 0.7, 0xffffff, { collide: false, noShadow: true, shade: 0.2, jitter: 0, rot: new THREE.Euler(0.5, 0, 0) });
    for (const [x, z] of [
      [-0.26, -0.6],
      [0.26, -0.6],
      [-0.26, 0.6],
      [0.26, 0.6],
    ])
      b.box(x, 0.3, z, 0.16, 0.6, 0.18, 0xdddddd, { collide: false, noShadow: true, shade: 0.2, jitter: 0 });
  }, 8);
  const cowMesh = cow.children[0] as THREE.Mesh;
  const herd = Math.max(40, Math.round(130 * crowd));
  const cattle = new THREE.InstancedMesh(cowMesh.geometry, new THREE.MeshLambertMaterial({ vertexColors: true }), herd);
  const hides = [0x6a4a34, 0x8a6a4a, 0x3a2c24, 0xd8ccb4, 0xa07a54, 0x54402e];
  // herds, not a scatter: a few gatherings on the plain near the foot of the hill
  const herds: [number, number, number][] = [
    [-88, -22, 16],
    [-104, 30, 20],
    [-126, -48, 22],
    [-80, 46, 12],
    [-150, 64, 22],
  ];
  for (let i = 0; i < herd; i++) {
    const [hx, hz, hr] = herds[i % herds.length];
    const a = rng.range(0, TAU);
    const r = Math.sqrt(rng.next()) * hr;
    _m.compose(_p.set(hx + Math.cos(a) * r, y0, hz + Math.sin(a) * r * 1.4), _qa.setFromAxisAngle(UP, rng.range(0, TAU)), _s.setScalar(rng.range(0.85, 1.25)));
    cattle.setMatrixAt(i, _m);
    cattle.setColorAt(i, _c.set(rng.pick(hides)));
  }
  cattle.frustumCulled = false;
  group.add(cattle);

  return {
    group,
    lamps,
    people,
    cattle,
    update(time, night) {
      (lamps.material as THREE.PointsMaterial).opacity = night * (0.85 + Math.sin(time * 2.1) * 0.06);
      lamps.visible = night > 0.02;
      for (let i = 0; i < count; i++) {
        const w = walkers[i];
        const span = w.hi - w.lo;
        const u = (((w.x - w.lo + w.vx * time) % (span * 2)) + span * 2) % (span * 2);
        const x = w.lo + (u < span ? u : span * 2 - u);
        peoplePos[i * 3] = x;
        peoplePos[i * 3 + 1] = y0 + 1;
        peoplePos[i * 3 + 2] = w.z + Math.sin(time * 0.07 * (1 + (i % 5)) + i) * (w.vz !== 0 ? 6 : 0.4);
      }
      peopleGeo.attributes.position.needsUpdate = true;
      (people.material as THREE.PointsMaterial).opacity = 1;
    },
    dispose() {
      lampGeo.dispose();
      (lamps.material as THREE.Material).dispose();
      peopleGeo.dispose();
      (people.material as THREE.Material).dispose();
      (cattle.material as THREE.Material).dispose();
      river.geometry.dispose();
      (river.material as THREE.Material).dispose();
    },
  };
}

// ---- the turning of the day -------------------------------------------------------------------------------------

export interface DayLook {
  top: THREE.Color;
  horizon: THREE.Color;
  bottom: THREE.Color;
  fog: THREE.Color;
  key: THREE.Color;
  keyI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  stars: number;
  cover: number;
  cloudLit: THREE.Color;
  cloudDark: THREE.Color;
}

interface Key {
  d: number;
  look: DayLook;
}

const look = (top: number, horizon: number, bottom: number, fog: number, key: number, keyI: number, hemiSky: number, hemiGround: number, hemiI: number, stars: number, cover: number, cloudLit: number, cloudDark: number): DayLook => ({
  top: new THREE.Color(top),
  horizon: new THREE.Color(horizon),
  bottom: new THREE.Color(bottom),
  fog: new THREE.Color(fog),
  key: new THREE.Color(key),
  keyI,
  hemiSky: new THREE.Color(hemiSky),
  hemiGround: new THREE.Color(hemiGround),
  hemiI,
  stars,
  cover,
  cloudLit: new THREE.Color(cloudLit),
  cloudDark: new THREE.Color(cloudDark),
});

const NIGHT = look(0x060a1c, 0x1b2a4c, 0x0c1222, 0x18243e, 0xa8c0ff, 1.3, 0x6a80b8, 0x3c3a48, 2.0, 1, 0.12, 0x34446a, 0x121a30);
// d is the fraction of a day: 0.25 sunrise, 0.5 noon, 0.75 sunset.
const KEYS: Key[] = [
  { d: 0.0, look: NIGHT },
  { d: 0.215, look: NIGHT },
  { d: 0.245, look: look(0x28385e, 0xdc9c7c, 0x5c4c52, 0x8c7884, 0xffb890, 0.5, 0x8c96ba, 0x6c5a54, 1.9, 0.3, 0.2, 0xf0a888, 0x4a4a68) },
  { d: 0.268, look: look(0x86aad2, 0xf8dcc2, 0xdcc4ac, 0xf2dcc8, 0xffd2a4, 2.5, 0xd0dcf0, 0xc8ae90, 2.0, 0, 0.2, 0xffe6d0, 0xd0b8b0) },
  { d: 0.33, look: look(0x5c98d8, 0xf2e6cc, 0xdccfb0, 0xefe4cc, 0xfff0d4, 3.0, 0xc4dcff, 0xd0b488, 1.7, 0, 0.1, 0xffffff, 0xd8dce4) },
  { d: 0.5, look: look(0x3f86e0, 0xf8f2e2, 0xe6dcc4, 0xf6eede, 0xfffaf0, 3.3, 0xd0e4ff, 0xe0cca4, 1.45, 0, 0.03, 0xffffff, 0xe0e4ea) },
  { d: 0.68, look: look(0x4c84cc, 0xf6dfb4, 0xe0cca4, 0xf0d8ac, 0xffe0a8, 2.9, 0xc8d8f4, 0xd0b080, 1.6, 0, 0.12, 0xfff0d0, 0xd8c8b8) },
  { d: 0.74, look: look(0x4a5c98, 0xf4985c, 0x9a6a58, 0xdc9c74, 0xff9a58, 2.2, 0xb0a8cc, 0x94705a, 1.8, 0, 0.24, 0xffb070, 0x6a5068) },
  { d: 0.785, look: look(0x1c2850, 0x8a5878, 0x2c2838, 0x4a3c5c, 0xff8060, 0.15, 0x7680b4, 0x483c4c, 1.95, 0.55, 0.2, 0x8a5a78, 0x1c2038) },
  { d: 0.84, look: NIGHT },
  { d: 1.0, look: NIGHT },
];

/** The light of the hour, written into `out`. */
export function dayLook(d: number, out: DayLook): DayLook {
  d = ((d % 1) + 1) % 1;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].d <= d) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = clamp01((d - a.d) / Math.max(1e-6, b.d - a.d));
  const A = a.look;
  const B = b.look;
  out.top.copy(A.top).lerp(B.top, t);
  out.horizon.copy(A.horizon).lerp(B.horizon, t);
  out.bottom.copy(A.bottom).lerp(B.bottom, t);
  out.fog.copy(A.fog).lerp(B.fog, t);
  out.key.copy(A.key).lerp(B.key, t);
  out.keyI = lerp(A.keyI, B.keyI, t);
  out.hemiSky.copy(A.hemiSky).lerp(B.hemiSky, t);
  out.hemiGround.copy(A.hemiGround).lerp(B.hemiGround, t);
  out.hemiI = lerp(A.hemiI, B.hemiI, t);
  out.stars = lerp(A.stars, B.stars, t);
  out.cover = lerp(A.cover, B.cover, t);
  out.cloudLit.copy(A.cloudLit).lerp(B.cloudLit, t);
  out.cloudDark.copy(A.cloudDark).lerp(B.cloudDark, t);
  return out;
}

export const blankLook = (): DayLook => look(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

const MOON = V(-0.3, 0.72, -0.62).normalize();

/** Where the sun stands at an hour of the day (it rises in the east, +x, and sets over the city). Unit length. */
export function sunDir(d: number, out: THREE.Vector3): THREE.Vector3 {
  const a = (d - 0.25) * TAU;
  return out.set(Math.cos(a), Math.sin(a) * 0.94, Math.sin(a) * 0.36 + 0.1).normalize();
}

/** The light that casts the shadows: the sun by day, the moon by night. */
export function keyDir(d: number, out: THREE.Vector3): THREE.Vector3 {
  sunDir(d, out);
  if (out.y < 0.03) out.copy(MOON);
  return out;
}

/** 0 by day .. 1 in the night. */
export function nightOf(d: number): number {
  d = ((d % 1) + 1) % 1;
  return d < 0.5 ? 1 - smoothstep(0.215, 0.262, d) : smoothstep(0.745, 0.83, d);
}

// ---- painted shadows, where the picture setting gives none -----------------------------------------------------

/** Dark patches on the ground under what casts shade, for the low setting, which has no shadow map. */
export class PaintedShade {
  readonly mesh: THREE.InstancedMesh;
  private n = new THREE.Vector3();

  constructor(private casters: Caster[]) {
    const geo = new THREE.CircleGeometry(1, 14);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x241c14, transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), casters.length);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  /** `toSun` is the unit direction to the light; `strength` 0..1 fades them (night, haze). */
  update(toSun: THREE.Vector3, strength: number) {
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = 0.36 * strength;
    this.mesh.visible = strength > 0.02;
    if (!this.mesh.visible) return;
    const flat = Math.hypot(toSun.x, toSun.z) || 1;
    const dx = -toSun.x / flat;
    const dz = -toSun.z / flat;
    // how far a thing's shadow reaches, per metre of its height
    const reach = Math.min(3.4, flat / Math.max(0.12, toSun.y));
    const yaw = Math.atan2(dx, dz);
    this.casters.forEach((c, i) => {
      const amount = c.amount ? c.amount() : 1;
      const len = c.h * reach;
      const cx = c.x + dx * (c.floating ? len : len * 0.5);
      const cz = c.z + dz * (c.floating ? len : len * 0.5);
      const along = c.floating ? c.r * Math.min(2.2, 1 / Math.max(0.45, toSun.y)) : c.r + len * 0.5;
      hillNormal(cx, cz, this.n);
      _qa.setFromUnitVectors(UP, this.n);
      _q.setFromAxisAngle(UP, yaw);
      _qa.multiply(_q);
      _m.compose(_p.set(cx, hillY(cx, cz) + 0.07, cz), _qa, _s.set(c.r * amount, 1, along * amount));
      this.mesh.setMatrixAt(i, _m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ---- loose things in the wind ----------------------------------------------------------------------------------

/** The cloth when the wind has it: a striped sheet that billows as it goes. */
export class LooseCloth {
  readonly mesh: THREE.Mesh;
  private flat: Float32Array;

  constructor() {
    const geo = new THREE.PlaneGeometry(3.5, 2.56, 12, 9);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const k = Math.min(8, Math.floor(((pos.getZ(i) + 1.28) / 2.56) * 9));
      c.set(STRIPES[k % 2 === 0 ? 0 : k % 4 === 1 ? 1 : 3]);
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.flat = (pos.array as Float32Array).slice();
    this.mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  flutter(t: number, amount: number) {
    const pos = this.mesh.geometry.attributes.position;
    const a = pos.array as Float32Array;
    for (let i = 0; i < pos.count; i++) {
      const x = this.flat[i * 3];
      const z = this.flat[i * 3 + 2];
      a[i * 3 + 1] = (Math.sin(x * 2.1 + t * 9) * 0.26 + Math.sin(z * 3.3 - t * 6.5) * 0.14 + Math.sin((x + z) * 1.2 + t * 4) * 0.2) * amount;
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Dry brush torn loose and bowled along by the east wind. */
export class Tumbleweeds {
  readonly group = new THREE.Group();
  private items: { mesh: THREE.Mesh; x: number; z: number; speed: number; hop: number; r: number }[] = [];
  private geo = new THREE.IcosahedronGeometry(1, 1);
  private mat = new THREE.MeshBasicMaterial({ color: 0x8a7650, wireframe: true });

  constructor(count: number) {
    const rng = new Rng(808);
    for (let i = 0; i < count; i++) {
      const r = rng.range(0.3, 0.55);
      const mesh = new THREE.Mesh(this.geo, this.mat);
      mesh.scale.setScalar(r);
      this.group.add(mesh);
      this.items.push({ mesh, x: rng.range(-60, 60), z: rng.range(-34, 34), speed: rng.range(8, 14), hop: rng.range(0, 6), r });
    }
    this.group.visible = false;
  }

  update(dt: number, time: number, wind: number) {
    this.group.visible = wind > 0.05;
    if (!this.group.visible) return;
    for (const it of this.items) {
      it.x -= it.speed * wind * dt;
      if (it.x < -62) {
        it.x = 62;
        it.z = ((it.z + 23.7 + 34) % 68) - 34;
      }
      const hop = Math.abs(Math.sin(time * (2.2 + it.r * 2) + it.hop)) * (0.3 + it.r * 1.6) * wind;
      it.mesh.position.set(it.x, hillY(it.x, it.z) + it.r + hop, it.z);
      it.mesh.rotation.z += it.speed * wind * dt * 1.4;
      it.mesh.rotation.x += dt * 2;
    }
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
