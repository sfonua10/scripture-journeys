// The ship of Tarshish: a round-hulled merchantman with a single mast, a hold, a quarterdeck and a foredeck.
// Built once in the ship's own space (z toward the bow, +x to port, the main deck at y = 0). The physics world of a
// chapter that sails her IS this space: the deck is still, and gravity is what tilts.
import * as THREE from 'three';
import type { Physics } from '../core/physics';
import { clamp, clamp01, damp, lerp } from '../core/util';
import { LevelBuilder, solid, worldMaterial } from '../gfx/build';
import type { Ocean } from '../gfx/ocean';
import { dotTexture } from '../gfx/textures';
import type { ClimbZone } from '../player/controller';

// ---- the hull's shape: the same numbers are in the ocean shader, which cuts the sea away inside her ------------
export const HULL = { beam: 3.7, len: 13, keel: -3.3 };
const uOf = (z: number) => Math.min(1, Math.abs(z) / HULL.len);
export const halfBeam = (z: number) => HULL.beam * Math.pow(Math.max(0, 1 - Math.pow(uOf(z), 2.4)), 0.55);
export const keelY = (z: number) => HULL.keel + 2.6 * Math.pow(uOf(z), 4);
export const gunY = (z: number) => 0.95 + 3.2 * Math.pow(uOf(z), 3);
/** Half the hull's width at a height. */
export function hullHalf(z: number, y: number): number {
  const k = keelY(z);
  const g = gunY(z);
  return halfBeam(z) * Math.pow(clamp01((y - k) / (g - k)), 0.3);
}
export const QUARTER = { z: -6.5, y: 1.2 };
export const FORE = { z: 8.5, y: 1.0 };
export const HOLD_Y = -2.5;
export const HATCH = { x: 0.9, z0: 0.5, z1: 4.5 };
export const MAST_Z = -2.2;
export const TOP_Y = 7.6;
/** The height of the deck underfoot at a place along the ship. */
export const deckY = (z: number) => (z < QUARTER.z ? QUARTER.y : z > FORE.z ? FORE.y : 0);
/** The same, eased over the steps, for people who walk without physics. */
export function walkY(z: number): number {
  if (z < QUARTER.z + 1.2) return QUARTER.y * clamp01((QUARTER.z + 1.2 - z) / 1.2);
  if (z > FORE.z - 1.1) return FORE.y * clamp01((z - (FORE.z - 1.1)) / 1.1);
  return 0;
}

const WOOD = 0x8a6a48;
const DARK = 0x4a3524;
const PITCH = 0x2a211c;
const ROPE = 0x9a8a68;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _e = new THREE.Euler();
const Y = new THREE.Vector3(0, 1, 0);

/** A round timber or rope between two points. */
function beam(b: LevelBuilder, p0: THREE.Vector3Like, p1: THREE.Vector3Like, r: number, color: number, opts: { mat?: 'wood' | 'plain'; noShadow?: boolean; seg?: number } = {}) {
  _a.set(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
  const len = _a.length();
  _q.setFromUnitVectors(Y, _a.normalize());
  _e.setFromQuaternion(_q);
  b.cyl((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, (p0.z + p1.z) / 2, r, r, len, color, { rot: _e.clone(), collide: false, mat: opts.mat ?? 'plain', noShadow: opts.noShadow, seg: opts.seg ?? 5, shade: 0, jitter: 0.03 });
}

export interface Lantern {
  group: THREE.Group;
  glow: THREE.Sprite;
  /** Where it hangs, in the ship's space. */
  at: THREE.Vector3;
  base: number;
  seed: number;
}

/** One rope that can be loose (whipping in the wind) or made fast. */
export interface Line {
  /** Where it comes down from (a yard-arm). */
  from: THREE.Vector3;
  /** The pin on the rail where it is made fast. */
  pin: THREE.Vector3;
  loose: boolean;
  /** 0 flying free .. 1 made fast, eased. */
  taut: number;
  seed: number;
}

export interface Oar {
  pivot: THREE.Group;
  side: number;
  phase: number;
}

const SEG = 9;

export class Ship {
  /** Everything of the ship hangs here; a sailing chapter moves this group over the waves. */
  readonly group = new THREE.Group();
  readonly lanterns: Lantern[] = [];
  /** The real lights are few: they are lent to the lanterns nearest whoever is being followed. */
  private lights: { light: THREE.PointLight; lantern: Lantern | null; level: number }[] = [];
  readonly lines: Line[] = [];
  readonly oars: Oar[] = [];
  readonly climb: ClimbZone;
  /** How hard the sail flogs (0 quiet .. 1 torn loose). */
  flog = 0.5;
  /** How hard the men row (0 oars at rest). */
  rowing = 0;
  /** Seconds through the stroke, for the rowers to keep time with. */
  stroke = 0;

  // ---- how she lies on the sea
  heave = 0;
  pitch = 0;
  roll = 0;
  yaw = 0;
  private vPitch = 0;
  private vRoll = 0;
  private vHeave = 0;
  /** How strongly the sea's slope turns into roll (drama) and pitch. */
  rollGain = 1.15;
  pitchGain = 0.9;
  /** What "down" is to things aboard, as a unit vector in her own space. */
  readonly down = new THREE.Vector3(0, -1, 0);

  private sail: THREE.Mesh;
  private sailBase: Float32Array;
  private ropes: THREE.InstancedMesh;
  private oarGroup = new THREE.Group();
  private t = 0;

  constructor(physics: Physics | null, opts: { lights: number; seed?: number } = { lights: 2 }) {
    const b = new LevelBuilder(physics, opts.seed ?? 11);
    b.chunk = 1e6;
    this.buildHull(b);
    this.buildDecks(b);
    this.buildMast(b);
    this.buildFittings(b);
    const mesh = b.finish('ship');
    this.group.add(mesh);

    this.climb = { origin: new THREE.Vector3(0, 0, -0.57), normal: new THREE.Vector3(0, 0, 1), halfWidth: 0.3, yMin: 0, yMax: TOP_Y };

    // ---- the sail: half furled, the loose part flogging
    const sg = new THREE.PlaneGeometry(8.4, 3.4, 12, 6);
    sg.translate(0, -1.7, 0);
    const colors = new Float32Array(sg.attributes.position.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < sg.attributes.position.count; i++) {
      const x = sg.attributes.position.getX(i);
      const y = sg.attributes.position.getY(i);
      const stripe = Math.abs(((x + 4.2) % 2.1) - 1.05) < 0.3;
      c.set(stripe ? 0x8a3a30 : 0xcfc4a8).multiplyScalar(0.72 + 0.28 * clamp01(-y / 3.4 + 0.3));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    sg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sailBase = new Float32Array(sg.attributes.position.array);
    this.sail = new THREE.Mesh(sg, worldMaterial('cloth', true));
    this.sail.position.set(0, 9.25, MAST_Z + 0.42);
    this.sail.castShadow = true;
    this.group.add(this.sail);

    // ---- running rigging that can come loose
    const pins: [number, number, number, number][] = [
      [1, 3.9, -4.6, 0],
      [-1, 3.9, 6.2, 1],
      [1, 3.9, 5.6, 2],
      [-1, 3.9, -4.2, 3],
    ];
    for (const [side, , z, seed] of pins) {
      const x = side * (hullHalf(z, 0.7) - 0.28);
      this.lines.push({ from: new THREE.Vector3(side * 4.6, 9.35, MAST_Z + 0.35), pin: new THREE.Vector3(x, 0.78, z), loose: false, taut: 1, seed });
    }
    const rg = new THREE.CylinderGeometry(0.035, 0.035, 1, 5);
    rg.translate(0, 0.5, 0);
    this.ropes = new THREE.InstancedMesh(rg, solid(ROPE), this.lines.length * SEG);
    this.ropes.frustumCulled = false;
    this.ropes.castShadow = false;
    this.group.add(this.ropes);

    // ---- lanterns
    const spots: [number, number, number][] = [
      [0, 3.25, MAST_Z - 0.62],
      [-0.4, -0.72, -8.8],
      [0, 3.95, -10.6],
      [0, 4.25, 12.3],
      [-1.3, -0.72, 6.6],
      [1.45, -0.72, -1.0],
    ];
    spots.forEach((p, i) => this.lanterns.push(this.makeLantern(new THREE.Vector3(...p), i)));
    for (let i = 0; i < Math.min(opts.lights, this.lanterns.length); i++) {
      const light = new THREE.PointLight(0xffc488, 0, 11, 1.8);
      this.group.add(light);
      this.lights.push({ light, lantern: null, level: 0 });
    }
    this.lightFor(new THREE.Vector3(0, 0, 0), 10);

    // ---- oars (shown when the men row)
    const oarMat = solid(0x7a5a38);
    const bladeMat = solid(0x9a7a50);
    for (const z of [-5.2, -3.7, 6.2]) {
      for (const side of [1, -1]) {
        const pivot = new THREE.Group();
        pivot.position.set(side * (hullHalf(z, 0.9) + 0.02), gunY(z) + 0.04, z);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 6, 6), oarMat);
        shaft.rotation.z = Math.PI / 2;
        shaft.position.x = side * 1.9;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.34), bladeMat);
        blade.position.x = side * 4.5;
        pivot.add(shaft, blade);
        this.oarGroup.add(pivot);
        this.oars.push({ pivot, side, phase: 0 });
      }
    }
    this.oarGroup.visible = false;
    this.group.add(this.oarGroup);
  }

  // ---- building ------------------------------------------------------------------------------------------------

  private buildHull(b: LevelBuilder) {
    // The skin: strakes lofted between stations, drawn from both sides (inside it is the wall of the hold).
    const stations: number[] = [];
    const N = 30;
    for (let i = 0; i <= N; i++) stations.push(HULL.len * Math.sin((Math.PI / 2) * (-1 + (2 * i) / N)));
    const levels = [0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.76, 0.88, 1];
    const tones = [0x5a4a3e, 0x5a4a3e, 0x64503e, 0x7a5c40, 0x94704a, 0x9e7850, 0xa67e52, 0x9a4234];
    const pt = (z: number, t: number, side: number, out: THREE.Vector3) => {
      const k = keelY(z);
      const g = gunY(z);
      return out.set(side * halfBeam(z) * Math.pow(t, 0.3), k + (g - k) * t, z);
    };
    const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const n = new THREE.Vector3();
    for (let j = 0; j < levels.length - 1; j++) {
      for (const side of [1, -1]) {
        const pos: number[] = [];
        for (let i = 0; i < N; i++) {
          pt(stations[i], levels[j], side, p[0]);
          pt(stations[i + 1], levels[j], side, p[1]);
          pt(stations[i + 1], levels[j + 1], side, p[2]);
          pt(stations[i], levels[j + 1], side, p[3]);
          for (const [i0, i1, i2] of [
            [0, 1, 2],
            [0, 2, 3],
          ]) {
            n.crossVectors(_a.subVectors(p[i1], p[i0]), _b.subVectors(p[i2], p[i0]));
            // faces look outward
            const out = n.x * side + (j < 2 ? -n.y * 0.5 : 0) > 0;
            const tri = out ? [i0, i1, i2] : [i0, i2, i1];
            for (const k of tri) pos.push(p[k].x, p[k].y, p[k].z);
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        b.geo(g, _m.identity(), tones[j], { mat: 'wood', doubleSide: true, shade: 0.08, jitter: 0.04 });
        g.dispose();
      }
    }
    // the cap rail along the gunwale, and what stops people and cargo at the side
    const cuts: number[] = [];
    for (let z = -12.5; z <= 12.5001; z += 1) cuts.push(z);
    for (let i = 0; i < cuts.length - 1; i++) {
      const z0 = cuts[i];
      const z1 = cuts[i + 1];
      const zm = (z0 + z1) / 2;
      const dy = gunY(z1) - gunY(z0);
      for (const side of [1, -1]) {
        const x0 = side * halfBeam(z0);
        const x1 = side * halfBeam(z1);
        const len = Math.hypot(x1 - x0, z1 - z0);
        const yaw = Math.atan2(x1 - x0, z1 - z0);
        b.box((x0 + x1) / 2, gunY(zm) + 0.03, zm, 0.24, 0.12, len + 0.06, DARK, { rot: new THREE.Euler(-Math.atan2(dy, len), yaw, 0, 'YXZ'), collide: false, mat: 'wood' });
        // the bulwark, from the deck up to the rail
        const dk = deckY(zm);
        const top = gunY(zm) + 0.06;
        const xi0 = side * (hullHalf(z0, dk + 0.5) + 0.1);
        const xi1 = side * (hullHalf(z1, dk + 0.5) + 0.1);
        const yawIn = Math.atan2(xi1 - xi0, z1 - z0);
        const lenIn = Math.hypot(xi1 - xi0, z1 - z0) + 0.12;
        b.solid((xi0 + xi1) / 2, (dk - 0.2 + top) / 2, zm, 0.3, top - dk + 0.2, lenIn, { rotY: yawIn, surface: 'wood', noLedge: true });
        // above the rail nothing stops cargo, but people do not go over the side
        b.wall((xi0 + xi1) / 2, top + 7, zm, 0.3, 14, lenIn, yawIn);
        // the hold's sides
        if (zm > -9.5 && zm < 9.5) {
          const h0 = side * (hullHalf(z0, -2.1) + 0.14);
          const h1 = side * (hullHalf(z1, -2.1) + 0.14);
          b.solid((h0 + h1) / 2, -1.35, zm, 0.3, 2.5, Math.hypot(h1 - h0, z1 - z0) + 0.12, { rotY: Math.atan2(h1 - h0, z1 - z0), surface: 'wood', noLedge: true });
        }
      }
    }
    b.wall(0, 7, -12.75, 4, 20, 0.3);
    b.wall(0, 7, 12.75, 4, 20, 0.3);
    b.solid(0, 2.2, -12.7, 3, 3, 0.3, { surface: 'wood', noLedge: true });
    b.solid(0, 2.2, 12.7, 3, 3, 0.3, { surface: 'wood', noLedge: true });

    // the stem, rising and curling forward; the stern post, curling back over the helm
    const stem: [number, number][] = [
      [12.75, 3.6],
      [13.15, 4.7],
      [13.7, 5.6],
      [14.45, 6.1],
      [15.0, 5.85],
    ];
    for (let i = 0; i < stem.length - 1; i++) beam(b, { x: 0, y: stem[i][1], z: stem[i][0] }, { x: 0, y: stem[i + 1][1], z: stem[i + 1][0] }, 0.2 - i * 0.025, DARK, { mat: 'wood', seg: 6 });
    b.ball(0, 5.8, 15.12, 0.24, 0x8a3226, { detail: 0 });
    const stern: [number, number][] = [
      [-12.75, 3.6],
      [-13.2, 4.9],
      [-13.3, 6.1],
      [-12.8, 7.0],
      [-11.9, 7.3],
      [-11.3, 6.9],
    ];
    for (let i = 0; i < stern.length - 1; i++) beam(b, { x: 0, y: stern[i][1], z: stern[i][0] }, { x: 0, y: stern[i + 1][1], z: stern[i + 1][0] }, 0.2 - i * 0.022, DARK, { mat: 'wood', seg: 6 });
  }

  private buildDecks(b: LevelBuilder) {
    const cuts = new Set<number>();
    for (let z = -12; z <= 12; z++) cuts.add(z);
    for (const z of [HATCH.z0, HATCH.z1, QUARTER.z, FORE.z]) cuts.add(z);
    const zs = [...cuts].sort((x, y) => x - y);
    for (let i = 0; i < zs.length - 1; i++) {
      const z0 = zs[i];
      const z1 = zs[i + 1];
      const zm = (z0 + z1) / 2;
      const y = deckY(zm);
      const half = Math.min(hullHalf(z0, y), hullHalf(z1, y), hullHalf(zm, y)) + 0.06;
      const inHatch = zm > HATCH.z0 && zm < HATCH.z1;
      if (inHatch) {
        const w = half - HATCH.x;
        for (const side of [1, -1]) b.box(side * (HATCH.x + w / 2), y - 0.1, zm, w, 0.2, z1 - z0, WOOD, { mat: 'wood', jitter: 0.07 });
      } else b.box(0, y - 0.1, zm, half * 2, 0.2, z1 - z0, WOOD, { mat: 'wood', jitter: 0.07 });
      // the floor of the hold
      if (zm > -9.5 && zm < 9.5) {
        const hh = Math.max(hullHalf(z0, -2.1), hullHalf(z1, -2.1)) + 0.2;
        b.box(0, HOLD_Y - 0.15, zm, hh * 2, 0.3, z1 - z0, 0x5a4632, { mat: 'wood', jitter: 0.06 });
        // a rib up each side
        if (Math.abs(zm % 2) < 0.6) {
          for (const side of [1, -1]) {
            beam(b, { x: side * (hullHalf(zm, -2.4) - 0.02), y: -2.5, z: zm }, { x: side * (hullHalf(zm, -1.2) - 0.05), y: -1.2, z: zm }, 0.09, 0x3a2a1e, { mat: 'wood' });
            beam(b, { x: side * (hullHalf(zm, -1.2) - 0.05), y: -1.2, z: zm }, { x: side * (hullHalf(zm, -0.2) - 0.05), y: -0.2, z: zm }, 0.09, 0x3a2a1e, { mat: 'wood' });
          }
          b.box(0, -0.3, zm, hullHalf(zm, -0.3) * 2, 0.16, 0.18, 0x3a2a1e, { collide: false, mat: 'wood' });
        }
      }
    }
    // the ends of the hold
    b.box(0, -1.35, -9.6, hullHalf(-9.6, -0.5) * 2, 2.5, 0.2, 0x4f3c2a, { mat: 'wood' });
    b.box(0, -1.35, 9.6, hullHalf(9.6, -0.5) * 2, 2.5, 0.2, 0x4f3c2a, { mat: 'wood' });
    // the faces of the raised decks, with their steps
    b.box(0, 0.5, QUARTER.z - 0.1, hullHalf(QUARTER.z, 0.6) * 2, 1.4, 0.2, 0x6e5238, { mat: 'wood' });
    b.box(0, 0.4, FORE.z + 0.1, hullHalf(FORE.z, 0.5) * 2, 1.2, 0.2, 0x6e5238, { mat: 'wood' });
    // a door painted on the quarterdeck's face
    b.box(0, 0.5, QUARTER.z + 0.02, 0.9, 1.0, 0.06, 0x3f2c1e, { collide: false, mat: 'wood' });
    for (const side of [1, -1]) {
      b.block(side * 1.9, 0, QUARTER.z + 0.85, 1.2, 0.4, 0.6, WOOD, { mat: 'wood' });
      b.block(side * 1.9, 0, QUARTER.z + 0.3, 1.2, 0.8, 0.6, WOOD, { mat: 'wood' });
      b.block(side * 1.6, 0, FORE.z - 0.8, 1.2, 0.34, 0.55, WOOD, { mat: 'wood' });
      b.block(side * 1.6, 0, FORE.z - 0.28, 1.2, 0.67, 0.55, WOOD, { mat: 'wood' });
    }
    // the hatch: a coaming on three sides, and the stair down
    b.block(HATCH.x + 0.07, 0, (HATCH.z0 + HATCH.z1) / 2, 0.14, 0.16, HATCH.z1 - HATCH.z0 + 0.28, DARK, { mat: 'wood', noLedge: true });
    b.block(-HATCH.x - 0.07, 0, (HATCH.z0 + HATCH.z1) / 2, 0.14, 0.16, HATCH.z1 - HATCH.z0 + 0.28, DARK, { mat: 'wood', noLedge: true });
    b.block(0, 0, HATCH.z0 - 0.07, HATCH.x * 2, 0.16, 0.14, DARK, { mat: 'wood', noLedge: true });
    const run = HATCH.z1 - 0.7;
    b.ramp(0, HOLD_Y, 0.7 + run / 2, 1.5, -HOLD_Y, run, 0x6a5038, { mat: 'wood', noLedge: true });
    for (let i = 0; i < 8; i++) {
      const f = (i + 0.5) / 8;
      b.box(0, HOLD_Y + -HOLD_Y * f + 0.05, 0.7 + run * f, 1.56, 0.07, 0.3, 0x8a6a48, { collide: false, mat: 'wood' });
    }
    // benches for the rowers
    for (const z of [-5.2, -3.7, 6.2]) {
      for (const side of [1, -1]) b.block(side * (hullHalf(z, 0.3) - 0.62), 0, z + 0.55, 0.95, 0.4, 0.36, 0x7a5c3e, { mat: 'wood' });
    }
  }

  private buildMast(b: LevelBuilder) {
    b.post(0, HOLD_Y, MAST_Z, 0.3, 14.3, 0x6a4c30, { mat: 'wood', seg: 8, rTop: 0.19, noLedge: true });
    // the top: a small platform a man can stand on
    b.box(0, TOP_Y - 0.1, -1.9, 2.2, 0.2, 2.6, 0x7a5c3e, { mat: 'wood' });
    for (const [x, z] of [
      [1.02, -3.12],
      [-1.02, -3.12],
      [1.02, -0.68],
      [-1.02, -0.68],
    ]) {
      b.post(x, TOP_Y, z, 0.05, 0.85, DARK, { collide: false, seg: 5 });
    }
    beam(b, { x: 1.02, y: TOP_Y + 0.8, z: -3.12 }, { x: -1.02, y: TOP_Y + 0.8, z: -3.12 }, 0.025, ROPE, { noShadow: true });
    beam(b, { x: 1.02, y: TOP_Y + 0.8, z: -3.12 }, { x: 1.02, y: TOP_Y + 0.8, z: -0.68 }, 0.025, ROPE, { noShadow: true });
    beam(b, { x: -1.02, y: TOP_Y + 0.8, z: -3.12 }, { x: -1.02, y: TOP_Y + 0.8, z: -0.68 }, 0.025, ROPE, { noShadow: true });
    // unseen rails so nobody is blown off the top by mistake on three sides
    b.wall(1.2, TOP_Y + 1.2, -1.9, 0.2, 2.4, 2.8);
    b.wall(-1.2, TOP_Y + 1.2, -1.9, 0.2, 2.4, 2.8);
    b.wall(0, TOP_Y + 1.2, -3.3, 2.6, 2.4, 0.2);
    // the rope ladder up to it
    for (const x of [0.36, -0.36]) beam(b, { x, y: 0, z: -0.6 }, { x, y: TOP_Y - 0.1, z: -0.6 }, 0.035, ROPE, { noShadow: true });
    for (let y = 0.35; y < TOP_Y - 0.2; y += 0.42) b.box(0, y, -0.6, 0.78, 0.05, 0.06, 0x8a7a58, { collide: false, shade: 0 });
    // the yard and the sail gathered up to it
    beam(b, { x: -5, y: 9.35, z: MAST_Z + 0.35 }, { x: 5, y: 9.35, z: MAST_Z + 0.35 }, 0.13, 0x5f4630, { mat: 'wood', seg: 6 });
    beam(b, { x: -4.4, y: 9.12, z: MAST_Z + 0.4 }, { x: 4.4, y: 9.12, z: MAST_Z + 0.4 }, 0.27, 0xc6baa0, { seg: 7 });
    for (let x = -4; x <= 4; x += 1.6) b.box(x, 9.14, MAST_Z + 0.4, 0.07, 0.62, 0.62, ROPE, { collide: false, shade: 0 });
    // standing rigging
    const head = { x: 0, y: 11.3, z: MAST_Z };
    beam(b, head, { x: 0, y: 4.6, z: 13.1 }, 0.03, ROPE, { noShadow: true });
    beam(b, head, { x: 0, y: 4.9, z: -13.15 }, 0.03, ROPE, { noShadow: true });
    for (const side of [1, -1]) {
      for (const z of [-3.6, -0.9]) beam(b, head, { x: side * halfBeam(z), y: gunY(z), z }, 0.03, ROPE, { noShadow: true });
      beam(b, { x: side * 5, y: 9.35, z: MAST_Z + 0.35 }, head, 0.025, ROPE, { noShadow: true });
    }
  }

  private buildFittings(b: LevelBuilder) {
    // the two steering oars at the quarters
    for (const side of [1, -1]) {
      beam(b, { x: side * 1.5, y: 2.9, z: -10.2 }, { x: side * 2.3, y: -2.2, z: -13.2 }, 0.075, 0x6a4c30, { mat: 'wood' });
      b.box(side * 2.36, -2.6, -13.44, 0.08, 1.5, 0.52, 0x7a5c3e, { collide: false, rot: new THREE.Euler(0.5, 0, side * -0.15) });
      b.post(side * 1.15, QUARTER.y, -10.6, 0.07, 1.1, DARK, { collide: false, seg: 5 });
    }
    // pins on the rail where lines are made fast
    for (const [side, z] of [
      [1, -4.6],
      [-1, 6.2],
      [1, 5.6],
      [-1, -4.2],
    ]) {
      const x = side * (hullHalf(z, 0.7) - 0.2);
      b.box(x, 0.7, z, 0.16, 0.1, 0.6, DARK, { collide: false, mat: 'wood' });
      for (const dz of [-0.2, 0, 0.2]) b.post(x, 0.55, z + dz, 0.03, 0.4, 0x8a7a58, { collide: false, seg: 5 });
    }
    // brackets for the lanterns
    b.box(0, 3.55, MAST_Z - 0.45, 0.08, 0.08, 0.5, DARK, { collide: false });
    b.box(1.25, -0.42, -4.6, 0.08, 0.3, 0.08, DARK, { collide: false });
    b.box(-1.3, -0.42, 6.6, 0.08, 0.3, 0.08, DARK, { collide: false });
    beam(b, { x: 0, y: 4.25, z: -10.6 }, { x: 0, y: 5.6, z: -13.2 }, 0.04, DARK);
    beam(b, { x: 0, y: 4.5, z: 12.3 }, { x: 0, y: 4.7, z: 13.15 }, 0.04, DARK);
  }

  private makeLantern(at: THREE.Vector3, seed: number): Lantern {
    const group = new THREE.Group();
    group.position.copy(at);
    const frame = solid(0x2a2018);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.14, 6), frame);
    top.position.y = -0.03;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.05, 6), frame);
    base.position.y = -0.36;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.24, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.55) }));
    core.position.y = -0.2;
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.28, 0.018), frame);
      bar.position.set(Math.cos((i * Math.PI) / 2 + 0.78) * 0.11, -0.2, Math.sin((i * Math.PI) / 2 + 0.78) * 0.11);
      group.add(bar);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xffa040, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.scale.setScalar(2.2);
    glow.position.y = -0.2;
    group.add(top, base, core, glow);
    this.group.add(group);
    return { group, glow, at, base: 8, seed };
  }

  /** Lends the lights to the lanterns nearest a place aboard. Call every frame with the player's place. */
  lightFor(at: THREE.Vector3, dt: number) {
    const near = [...this.lanterns].sort((a, b) => a.at.distanceToSquared(at) - b.at.distanceToSquared(at)).slice(0, this.lights.length);
    for (const slot of this.lights) {
      const keep = slot.lantern && near.includes(slot.lantern);
      if (keep) slot.level = Math.min(1, slot.level + dt * 3);
      else {
        slot.level = Math.max(0, slot.level - dt * 3);
        if (slot.level <= 0) {
          const free = near.find((l) => !this.lights.some((o) => o.lantern === l));
          slot.lantern = free ?? null;
          if (free) slot.light.position.set(free.at.x, free.at.y - 0.25, free.at.z);
        }
      }
    }
  }

  // ---- afloat --------------------------------------------------------------------------------------------------

  /** Lays the ship on the sea: heave, pitch and roll from the water under her, with the weight of a ship. */
  float(dt: number, ocean: Ocean, t = ocean.time) {
    const s = Math.sin(this.yaw);
    const c = Math.cos(this.yaw);
    const at = (x: number, z: number) => ocean.height(x * c + z * s, -x * s + z * c, t);
    const bow = at(0, 9);
    const stern = at(0, -9);
    const port = at(3.2, 0);
    const stbd = at(-3.2, 0);
    const mid = at(0, 0);
    const wantHeave = (bow + stern + port + stbd + mid * 2) / 6 + 1.45;
    const wantPitch = clamp(-Math.atan2(bow - stern, 18) * this.pitchGain, -0.36, 0.36);
    const wantRoll = clamp(Math.atan2(port - stbd, 6.4) * this.rollGain, -0.62, 0.62);
    // springs: stiff enough to follow the swell, loose enough to overshoot and wallow
    this.vHeave += ((wantHeave - this.heave) * 26 - this.vHeave * 7) * dt;
    this.heave += this.vHeave * dt;
    this.vPitch += ((wantPitch - this.pitch) * 20 - this.vPitch * 5.5) * dt;
    this.pitch += this.vPitch * dt;
    this.vRoll += ((wantRoll - this.roll) * 15 - this.vRoll * 4.2) * dt;
    this.roll += this.vRoll * dt;
    this.place();
  }

  /** Sets her down exactly as the sea would have her now (a chapter start). */
  settle(ocean: Ocean) {
    for (let i = 0; i < 240; i++) this.float(1 / 60, ocean, ocean.time);
  }

  place() {
    this.group.position.set(0, this.heave, 0);
    this.group.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.group.updateMatrixWorld(true);
    _q.copy(this.group.quaternion).invert();
    this.down.set(0, -1, 0).applyQuaternion(_q);
  }

  /** A place aboard, in the world. */
  toWorld(local: THREE.Vector3Like, out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(local.x, local.y, local.z).applyMatrix4(this.group.matrixWorld);
  }

  showOars(on: boolean) {
    this.oarGroup.visible = on;
  }

  /** Once a frame: everything aboard that moves by itself. `wind` is 0..1. */
  update(dt: number, wind: number) {
    this.t += dt;
    const t = this.t;
    // the sail
    const pos = this.sail.geometry.attributes.position as THREE.BufferAttribute;
    const base = this.sailBase;
    const f = this.flog;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const hang = clamp01(-y / 3.4);
      const k = hang * hang * (0.25 + f * 1.5) * (0.4 + wind);
      const z = Math.sin(t * (5 + f * 6) + x * 1.3 + y * 0.8) * 0.5 * k + Math.sin(t * 2.3 + x * 0.5) * 0.6 * k + k * 0.9;
      pos.setXYZ(i, x + Math.sin(t * 7.1 + y * 2) * 0.12 * k, y + Math.abs(z) * 0.18, z);
    }
    pos.needsUpdate = true;
    this.sail.geometry.computeVertexNormals();

    // lanterns swing against the roll and gutter in the wind
    for (const l of this.lanterns) {
      l.group.rotation.z = damp(l.group.rotation.z, -this.roll * 1.3 + Math.sin(t * 2.1 + l.seed) * 0.08 * wind, 4, dt);
      l.group.rotation.x = damp(l.group.rotation.x, -this.pitch * 1.3 + Math.sin(t * 1.7 + l.seed * 2) * 0.06 * wind, 4, dt);
      const flick = 0.86 + 0.14 * Math.sin(t * 13 + l.seed * 5) * Math.sin(t * 7.3 + l.seed) - (Math.sin(t * 0.9 + l.seed * 3) > 0.93 ? 0.3 * wind : 0);
      for (const slot of this.lights) if (slot.lantern === l) slot.light.intensity = l.base * flick * slot.level;
      (l.glow.material as THREE.SpriteMaterial).opacity = 0.42 * flick;
    }

    // ropes
    let n = 0;
    for (const line of this.lines) {
      line.taut = damp(line.taut, line.loose ? 0 : 1, 5, dt);
      const free = 1 - line.taut;
      let px = line.from.x;
      let py = line.from.y;
      let pz = line.from.z;
      for (let i = 1; i <= SEG; i++) {
        const u = i / SEG;
        // made fast: a line to the pin with a little belly. Loose: streaming and cracking downwind.
        const tx = lerp(line.from.x, line.pin.x, u);
        const ty = lerp(line.from.y, line.pin.y, u) - Math.sin(u * Math.PI) * 0.35;
        const tz = lerp(line.from.z, line.pin.z, u);
        const whip = u * u;
        const lx = line.from.x + Math.sin(t * 5.3 + line.seed * 2 + u * 4) * 1.9 * whip - Math.sign(line.from.x) * u * 1.2;
        const ly = line.from.y - u * 5.6 + Math.sin(t * 7.7 + line.seed + u * 5) * 0.9 * whip;
        const lz = line.from.z + u * 3.4 * (0.6 + wind) + Math.cos(t * 6.1 + line.seed * 3 + u * 3) * 1.5 * whip;
        const x = lerp(tx, lx, free);
        const y = lerp(ty, ly, free);
        const z = lerp(tz, lz, free);
        _a.set(x - px, y - py, z - pz);
        const len = _a.length();
        _q.setFromUnitVectors(Y, _a.divideScalar(len || 1));
        _m.compose(_b.set(px, py, pz), _q, _a.set(1, len, 1));
        this.ropes.setMatrixAt(n++, _m);
        px = x;
        py = y;
        pz = z;
      }
    }
    this.ropes.instanceMatrix.needsUpdate = true;

    // oars
    if (this.oarGroup.visible) {
      this.stroke += dt * (0.55 + this.rowing * 0.35);
      const ph = this.stroke * Math.PI * 2;
      for (const o of this.oars) {
        const sweep = Math.sin(ph) * 0.5 * this.rowing;
        const dip = (Math.cos(ph) > 0 ? -0.34 : -0.12) - 0.1;
        o.pivot.rotation.set(0, sweep * o.side, lerp(-0.2, dip, this.rowing) * o.side, 'YXZ');
      }
    }
  }

  /** The free end of a loose line, roughly, for a marker. */
  dispose() {
    this.sail.geometry.dispose();
    this.ropes.geometry.dispose();
    this.ropes.dispose();
    for (const l of this.lanterns) (l.glow.material as THREE.Material).dispose();
  }
}
