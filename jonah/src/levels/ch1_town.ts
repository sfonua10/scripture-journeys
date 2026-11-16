// The pieces a hill town is put together from (Chapter 1): plastered houses with flat roofs, domes, ladders, vines,
// awnings, stalls, pergolas, carts and trees. Everything is given in the town's own heights (0 is the hilltop's
// ground) and lifted by `Y` into the world, where 0 is the sea.
import * as THREE from 'three';
import type { LevelBuilder } from '../gfx/build';
import type { MatKey } from '../gfx/textures';
import type { ClimbZone } from '../player/controller';

export const PLASTER = [0xe9d2a2, 0xdfc591, 0xf0dcb2, 0xd9bb86, 0xe6c896, 0xeed9aa];
export const ROOF = [0xdcc79c, 0xd2ba8a, 0xe2cfa6];
export const WOOD = 0x8a5e3a;
export const DARKWOOD = 0x5a3c26;
export const SHUTTER = [0x4a7c9c, 0x6f8a4a, 0x8a5a36, 0x3f6f8f];
export const CLOTH = { terracotta: 0xc0522f, ochre: 0xd9a23a, blue: 0x3f7ea6, cream: 0xeedfbc, olive: 0x7a8a4a, wine: 0x8a3044 };
export const LEAF = [0x5f7f3a, 0x6f8f44, 0x4f6f34];

/** A side of a house: front is toward +z (the west, the way he runs), back toward −z, left −x, right +x. */
export type Side = 'f' | 'b' | 'l' | 'r';

export interface HouseOpts {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  ground: number;
  top: number;
  color?: number;
  /** Which edges of the roof have a low parapet: any of 'fblr'. */
  lips?: string;
  /** Which faces get windows and beam ends: any of 'fblr'. */
  faces?: string;
  door?: Side | null;
  collide?: boolean;
  noLedge?: boolean;
  noShadow?: boolean;
  /** Beam ends poking out under the roof line. */
  vigas?: boolean;
  /** A house seen only from afar: dark windows and nothing more. */
  plain?: boolean;
}

const unitQuad = new THREE.PlaneGeometry(1, 1);
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class Town {
  /** Every ladder and vine made, for the player to climb. */
  readonly climbs: ClimbZone[] = [];

  constructor(readonly b: LevelBuilder, readonly Y: number) {}

  private get rng() {
    return this.b.rng;
  }

  /** A flat thing fixed to a face of a house, standing `out` proud of it. `u` runs along the face. */
  private decal(o: HouseOpts, side: Side, u: number, y: number, w: number, h: number, t: number, color: number, mat: MatKey = 'plain', out = 0) {
    const b = this.b;
    const Y = this.Y;
    const opts = { collide: false, mat, jitter: 0.03, shade: 0, noShadow: true };
    if (side === 'f') b.box(u, Y + y, o.z1 + t / 2 + out, w, h, t, color, opts);
    else if (side === 'b') b.box(u, Y + y, o.z0 - t / 2 - out, w, h, t, color, opts);
    else if (side === 'l') b.box(o.x0 - t / 2 - out, Y + y, u, t, h, w, color, opts);
    else b.box(o.x1 + t / 2 + out, Y + y, u, t, h, w, color, opts);
  }

  /** A flat patch on a face of a house (a dark window, a shutter): two triangles. */
  private patch(o: HouseOpts, side: Side, u: number, y: number, w: number, h: number, color: number, mat: MatKey = 'plain', out = 0.03) {
    const Y = this.Y;
    if (side === 'f') _p.set(u, Y + y, o.z1 + out);
    else if (side === 'b') _p.set(u, Y + y, o.z0 - out);
    else if (side === 'l') _p.set(o.x0 - out, Y + y, u);
    else _p.set(o.x1 + out, Y + y, u);
    _q.setFromAxisAngle(UP, side === 'f' ? 0 : side === 'b' ? Math.PI : side === 'l' ? -Math.PI / 2 : Math.PI / 2);
    this.b.geo(unitQuad, _m.compose(_p, _q, _s.set(w, h, 1)), color, { mat, jitter: 0.03, shade: 0, noShadow: true });
  }

  /** A plastered house with a flat roof. */
  house(o: HouseOpts) {
    const b = this.b;
    const Y = this.Y;
    const rng = this.rng;
    const w = o.x1 - o.x0;
    const d = o.z1 - o.z0;
    const cx = (o.x0 + o.x1) / 2;
    const cz = (o.z0 + o.z1) / 2;
    const h = o.top - o.ground;
    const color = o.color ?? rng.pick(PLASTER);
    b.block(cx, Y + o.ground, cz, w, h, d, color, { mat: 'plaster', collide: o.collide !== false, noLedge: o.noLedge, jitter: 0.03, shade: 0.22, noShadow: o.noShadow });
    // the roof: beaten earth, a little paler than the walls
    b.box(cx, Y + o.top + 0.02, cz, w - 0.5, 0.05, d - 0.5, rng.pick(ROOF), { collide: false, mat: 'sand', shade: 0, jitter: 0.04, noShadow: true });
    for (const side of (o.plain ? '' : (o.lips ?? '')) as unknown as Side[]) {
      const lip = { mat: 'plaster' as MatKey, collide: o.collide !== false, jitter: 0.03, shade: 0.1, noLedge: true, noShadow: o.noShadow };
      if (side === 'f') b.block(cx, Y + o.top, o.z1 - 0.14, w, 0.34, 0.28, color, lip);
      else if (side === 'b') b.block(cx, Y + o.top, o.z0 + 0.14, w, 0.34, 0.28, color, lip);
      else if (side === 'l') b.block(o.x0 + 0.14, Y + o.top, cz, 0.28, 0.34, d, color, lip);
      else b.block(o.x1 - 0.14, Y + o.top, cz, 0.28, 0.34, d, color, lip);
    }
    const shutter = rng.pick(SHUTTER);
    for (const side of (o.faces ?? '') as unknown as Side[]) {
      const along = side === 'f' || side === 'b' ? w : d;
      const from = side === 'f' || side === 'b' ? o.x0 : o.z0;
      const n = Math.max(1, Math.floor(along / 3.3));
      for (let row = 0; row < 2; row++) {
        const y = o.top - 1.55 - row * 2.7;
        if (y - 0.7 < o.ground + (row === 0 ? 0.3 : 2.2)) break;
        for (let i = 0; i < n; i++) {
          if (rng.chance(0.22)) continue;
          const u = from + ((i + 0.5) / n) * along + rng.range(-0.3, 0.3);
          this.patch(o, side, u, y, 0.68, 0.96, 0x3a2a1e);
          if (o.plain) continue;
          this.decal(o, side, u, y - 0.54, 0.92, 0.09, 0.16, WOOD, 'wood');
          // a shutter standing open to one side
          if (rng.chance(0.6)) this.patch(o, side, u + 0.56, y, 0.36, 0.96, shutter, 'wood', 0.05);
        }
      }
      if (o.vigas && !o.plain) {
        const m = Math.floor(along / 1.9);
        for (let i = 0; i < m; i++) this.decal(o, side, from + ((i + 0.5) / m) * along, o.top - 0.5, 0.15, 0.15, 0.34, DARKWOOD, 'wood');
      }
    }
    if (o.door && !o.plain) {
      const along = o.door === 'f' || o.door === 'b' ? w : d;
      const from = o.door === 'f' || o.door === 'b' ? o.x0 : o.z0;
      const u = from + along * rng.range(0.3, 0.7);
      this.decal(o, o.door, u, o.ground + 1.0, 1.05, 2.0, 0.07, DARKWOOD, 'wood');
      this.decal(o, o.door, u, o.ground + 2.08, 1.4, 0.16, 0.14, WOOD, 'wood');
      this.decal(o, o.door, u, o.ground + 0.06, 1.5, 0.12, 0.3, 0xb9a684, 'stone');
    }
  }

  /** A whitewashed dome on a low drum. */
  dome(x: number, y: number, z: number, r: number, color = 0xf3ead2, opts: { collide?: boolean; noShadow?: boolean } = {}) {
    const b = this.b;
    b.post(x, this.Y + y, z, r * 1.02, r * 0.3, color, { mat: 'plaster', seg: 10, collide: opts.collide ?? false, noLedge: true, shade: 0.1, noShadow: opts.noShadow });
    b.ball(x, this.Y + y + r * 0.28, z, r, color, { mat: 'plaster', detail: 1, squash: new THREE.Vector3(1, 0.82, 1), shade: 0.12, jitter: 0.02, noShadow: opts.noShadow });
  }

  /** A wooden ladder up a wall. `nx, nz` point out of the wall. */
  ladder(x: number, z: number, y0: number, y1: number, nx: number, nz: number) {
    const b = this.b;
    const Y = this.Y;
    const tx = nz;
    const tz = -nx;
    const out = 0.16;
    const h = y1 - y0 + 0.7;
    for (const s of [-1, 1]) b.block(x + tx * 0.3 * s + nx * out, Y + y0, z + tz * 0.3 * s + nz * out, 0.09, h, 0.09, WOOD, { mat: 'wood', collide: false, rotY: Math.atan2(nx, nz) });
    for (let y = y0 + 0.35; y < y1 + 0.5; y += 0.42) {
      b.box(x + nx * out, Y + y, z + nz * out, Math.abs(tx) > 0.5 ? 0.66 : 0.06, 0.06, Math.abs(tz) > 0.5 ? 0.66 : 0.06, DARKWOOD, { mat: 'wood', collide: false, shade: 0 });
    }
    this.climbs.push({ origin: new THREE.Vector3(x, Y + y0, z), normal: new THREE.Vector3(nx, 0, nz), halfWidth: 0.5, yMin: Y + y0, yMax: Y + y1 });
  }

  /** Vines grown up a wall, thick enough to climb. */
  vines(x: number, z: number, y0: number, y1: number, halfWidth: number, nx: number, nz: number) {
    const b = this.b;
    const Y = this.Y;
    const rng = this.rng;
    const tx = nz;
    const tz = -nx;
    const wide = halfWidth * 2 + 0.5;
    b.box(x + nx * 0.05, Y + (y0 + y1) / 2 + 0.1, z + nz * 0.05, Math.abs(tx) > 0.5 ? wide : 0.1, y1 - y0 + 0.2, Math.abs(tz) > 0.5 ? wide : 0.1, 0x55753a, { mat: 'weave', collide: false, shade: 0.25 });
    const n = Math.round((y1 - y0) * wide * 1.3);
    for (let i = 0; i < n; i++) {
      const u = rng.range(-halfWidth - 0.5, halfWidth + 0.5);
      const y = rng.range(y0 + 0.1, y1 + 0.5);
      const r = rng.range(0.22, 0.42);
      b.ball(x + tx * u + nx * 0.14, Y + y, z + tz * u + nz * 0.14, r, rng.pick(LEAF), { detail: 0, squash: new THREE.Vector3(1, 0.8, 1), jitter: 0.1, noShadow: true });
    }
    // a few stems
    for (let i = 0; i < 4; i++) {
      const u = (i - 1.5) * (halfWidth / 2);
      b.box(x + tx * u + nx * 0.12, Y + (y0 + y1) / 2, z + tz * u + nz * 0.12, 0.07, y1 - y0, 0.07, 0x4a3a22, { mat: 'wood', collide: false, rot: new THREE.Euler(0, 0, rng.range(-0.05, 0.05)) });
    }
    this.climbs.push({ origin: new THREE.Vector3(x, Y + y0, z), normal: new THREE.Vector3(nx, 0, nz), halfWidth, yMin: Y + y0, yMax: Y + y1 });
  }

  /** A striped cloth awning lying flat at height `y` (its top). Poles are the caller's. */
  awning(x0: number, x1: number, z0: number, z1: number, y: number, c1: number, c2: number, opts: { collide?: boolean; along?: 'x' | 'z'; thick?: number; noLedge?: boolean } = {}) {
    const b = this.b;
    const Y = this.Y;
    const t = opts.thick ?? 0.1;
    const along = opts.along ?? 'x';
    const len = along === 'x' ? x1 - x0 : z1 - z0;
    const n = Math.max(2, Math.round(len / 0.62));
    for (let i = 0; i < n; i++) {
      const a = (i + 0.5) / n;
      const c = i % 2 ? c2 : c1;
      const o = { mat: 'cloth' as MatKey, collide: false, jitter: 0.02, shade: 0.06 };
      if (along === 'x') b.box(x0 + a * len, Y + y - t / 2, (z0 + z1) / 2, len / n, t, z1 - z0, c, o);
      else b.box((x0 + x1) / 2, Y + y - t / 2, z0 + a * len, x1 - x0, t, len / n, c, o);
    }
    // a scalloped edge hanging on the two long sides
    if (opts.collide !== false) b.solid((x0 + x1) / 2, Y + y - t / 2, (z0 + z1) / 2, x1 - x0, t, z1 - z0, { surface: 'cloth', noLedge: opts.noLedge });
  }

  pole(x: number, z: number, y0: number, y1: number, collide = false, r = 0.06) {
    this.b.post(x, this.Y + y0, z, r, y1 - y0, WOOD, { mat: 'wood', seg: 5, collide, noLedge: true });
  }

  /** A market stall against a wall: a table of goods under a small awning. `side` is −1 (left wall) or +1. */
  stall(z: number, side: number, wallX: number, ground: number, c1: number, c2: number) {
    const b = this.b;
    const Y = this.Y;
    const rng = this.rng;
    const x = wallX - side * 0.6;
    b.block(x, Y + ground, z, 0.9, 0.82, 2.3, WOOD, { mat: 'wood', jitter: 0.08 });
    b.box(x, Y + ground + 0.86, z, 1.0, 0.07, 2.5, 0x9a6e44, { mat: 'wood', collide: false });
    this.awning(wallX - side * 1.7, wallX, z - 1.5, z + 1.5, ground + 2.45, c1, c2, { collide: false, along: 'z' });
    this.pole(wallX - side * 1.62, z - 1.42, ground, ground + 2.4);
    this.pole(wallX - side * 1.62, z + 1.42, ground, ground + 2.4);
    // goods: heaps in shallow baskets
    const goods = [0xd9772f, 0xb7352a, 0xe2c14a, 0x7f9a3a, 0x8a4a7a, 0xd8c9a8];
    for (let i = 0; i < 4; i++) {
      const gz = z - 0.85 + i * 0.57;
      b.cyl(x, Y + ground + 0.95, gz, 0.24, 0.2, 0.12, 0xb08a54, { mat: 'weave', seg: 8, collide: false });
      b.ball(x, Y + ground + 1.02, gz, 0.2, rng.pick(goods), { detail: 0, squash: new THREE.Vector3(1, 0.6, 1), jitter: 0.08, noShadow: true });
    }
  }

  /** A pergola across a roof: low enough that he must slide beneath it, or go over the top. */
  pergola(x0: number, x1: number, z0: number, z1: number, floor: number, clear = 1.1) {
    const b = this.b;
    const Y = this.Y;
    const rng = this.rng;
    const top = floor + clear + 0.16;
    b.solid((x0 + x1) / 2, Y + floor + clear + 0.08, (z0 + z1) / 2, x1 - x0, 0.16, z1 - z0, { surface: 'wood' });
    // beams along and laths across
    for (const z of [z0 + 0.1, (z0 + z1) / 2, z1 - 0.1]) b.box((x0 + x1) / 2, Y + floor + clear + 0.07, z, x1 - x0, 0.14, 0.14, WOOD, { mat: 'wood', collide: false });
    const n = Math.round((x1 - x0) / 0.55);
    for (let i = 0; i <= n; i++) b.box(x0 + ((x1 - x0) * i) / n, Y + top - 0.03, (z0 + z1) / 2, 0.08, 0.06, z1 - z0 + 0.3, DARKWOOD, { mat: 'wood', collide: false, shade: 0 });
    for (const x of [x0 + 0.12, x1 - 0.12]) for (const z of [z0 + 0.1, z1 - 0.1]) this.pole(x, z, floor, floor + clear + 0.02, true, 0.08);
    // a vine over the top
    const m = Math.round((x1 - x0) * (z1 - z0) * 0.55);
    for (let i = 0; i < m; i++) {
      b.ball(rng.range(x0, x1), Y + top + rng.range(0.02, 0.14), rng.range(z0, z1), rng.range(0.3, 0.55), rng.pick(LEAF), { detail: 0, squash: new THREE.Vector3(1, 0.34, 1), jitter: 0.1, noShadow: true });
    }
  }

  /** A two-wheeled cart; the bed's underside is `clear` above the ground. Front toward +z. */
  cart(x: number, z: number, ground: number, opts: { clear?: number; load?: 'sacks' | 'hay' | null; loadH?: number; width?: number; length?: number } = {}) {
    const b = this.b;
    const Y = this.Y;
    const clear = opts.clear ?? 1.1;
    const w = opts.width ?? 2.5;
    const len = opts.length ?? 2.7;
    const bed = ground + clear;
    b.box(x, Y + bed + 0.11, z, w, 0.22, len, WOOD, { mat: 'wood', surface: 'wood' });
    for (const s of [-1, 1]) {
      // wheels: thin drums on their sides
      b.cyl(x + s * (w / 2 + 0.12), Y + ground + clear * 0.7, z, clear * 0.7, clear * 0.7, 0.16, DARKWOOD, { mat: 'wood', seg: 10, rot: new THREE.Euler(0, 0, Math.PI / 2), noLedge: true });
      b.cyl(x + s * (w / 2 + 0.22), Y + ground + clear * 0.7, z, 0.14, 0.14, 0.12, 0x3a2a1e, { seg: 6, rot: new THREE.Euler(0, 0, Math.PI / 2), collide: false });
      // side rails
      b.box(x + s * (w / 2 - 0.05), Y + bed + 0.42, z, 0.08, 0.4, len, DARKWOOD, { mat: 'wood', collide: false });
      // shafts
      b.box(x + s * 0.5, Y + bed + 0.02, z + len / 2 + 0.9, 0.09, 0.09, 1.9, WOOD, { mat: 'wood', collide: false, rot: new THREE.Euler(0.16, 0, 0) });
    }
    const loadH = opts.loadH ?? 1.2;
    if (opts.load === 'sacks') {
      const rng = this.rng;
      b.solid(x, Y + bed + 0.22 + loadH / 2, z, w - 0.2, loadH, len - 0.2, { surface: 'cloth', noLedge: true });
      const rows = Math.max(1, Math.round(loadH / 0.42));
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 2; k++) {
            b.ball(x + (i - 1) * (w / 3.2) + rng.range(-0.06, 0.06), Y + bed + 0.42 + r * 0.42, z + (k - 0.5) * (len / 2.2), 0.5, rng.pick([0xb49a6a, 0xa48a5c, 0xc0a878]), { detail: 1, squash: new THREE.Vector3(0.85, 0.5, 1.25), jitter: 0.06 });
          }
        }
      }
    } else if (opts.load === 'hay') {
      b.solid(x, Y + bed + 0.22 + loadH / 2, z, w - 0.1, loadH, len, { surface: 'cloth', noLedge: true });
      b.box(x, Y + bed + 0.22 + loadH / 2 - 0.1, z, w - 0.1, loadH - 0.2, len, 0xd6b356, { mat: 'weave', collide: false, shade: 0.2 });
      const rng = this.rng;
      for (let i = 0; i < 9; i++) b.ball(x + rng.range(-w / 2.6, w / 2.6), Y + bed + 0.22 + loadH - 0.16, z + rng.range(-len / 2.4, len / 2.4), rng.range(0.5, 0.75), rng.pick([0xdcbc5e, 0xcfae50, 0xe4c66c]), { detail: 0, squash: new THREE.Vector3(1.1, 0.5, 1.1), jitter: 0.06, noShadow: true });
    }
  }

  palm(x: number, y: number, z: number, h = 6, lean = 0.1) {
    const b = this.b;
    const Y = this.Y;
    const rng = this.rng;
    const yaw = rng.range(0, 6.28);
    let px = x;
    let pz = z;
    const seg = 4;
    for (let i = 0; i < seg; i++) {
      const hh = h / seg;
      b.post(px, Y + y + i * hh, pz, 0.17 - i * 0.02, hh + 0.05, 0x8a6a48, { mat: 'wood', seg: 5, collide: false, rTop: 0.15 - i * 0.02 });
      px += Math.sin(yaw) * lean * (i + 1) * 0.35;
      pz += Math.cos(yaw) * lean * (i + 1) * 0.35;
    }
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + rng.range(-0.2, 0.2);
      const droop = rng.range(0.35, 0.7);
      const len = rng.range(1.9, 2.5);
      const cx = px + Math.sin(a) * Math.cos(droop) * len * 0.5;
      const cz = pz + Math.cos(a) * Math.cos(droop) * len * 0.5;
      b.box(cx, Y + y + h + 0.1 - Math.sin(droop) * len * 0.5, cz, 0.5, 0.05, len, i % 2 ? 0x55803c : 0x4a7436, { collide: false, rot: new THREE.Euler(droop, a, 0, 'YXZ'), jitter: 0.08, shade: 0 });
    }
    b.ball(px, Y + y + h, pz, 0.3, 0x6a5a34, { detail: 0, noShadow: true });
  }

  cypress(x: number, y: number, z: number, h = 6) {
    const b = this.b;
    b.post(x, this.Y + y, z, 0.12, 0.7, 0x5a4630, { mat: 'wood', seg: 5, collide: false });
    b.cyl(x, this.Y + y + 0.5 + h / 2, z, 0.06, h * 0.15, h, 0x3f5a34, { seg: 6, collide: false, jitter: 0.1, shade: 0.3 });
  }

  olive(x: number, y: number, z: number, s = 1, noShadow = false) {
    const b = this.b;
    const rng = this.rng;
    b.post(x, this.Y + y, z, 0.16 * s, 1.3 * s, 0x6a5540, { mat: 'wood', seg: 5, collide: false, rTop: 0.1 * s, noShadow });
    b.ball(x, this.Y + y + 1.8 * s, z, 1.25 * s, rng.pick([0x7a8a5a, 0x6f8052, 0x869664]), { detail: 0, squash: new THREE.Vector3(1.2, 0.72, 1.1), jitter: 0.1, shade: 0.25, noShadow, rotY: rng.range(0, 3) });
    if (s > 0.9) b.ball(x + 0.7 * s, this.Y + y + 1.5 * s, z + 0.3 * s, 0.8 * s, 0x7a8a5a, { detail: 0, squash: new THREE.Vector3(1.1, 0.7, 1), jitter: 0.1, shade: 0.25, noShadow });
  }

  /** A potted plant, a jar, a rolled mat: small things that make a roof lived on. */
  pot(x: number, y: number, z: number, plant = true) {
    const b = this.b;
    const rng = this.rng;
    b.cyl(x, this.Y + y + 0.22, z, 0.2, 0.15, 0.44, 0xb9643a, { seg: 7, collide: false, jitter: 0.08 });
    if (plant) b.ball(x, this.Y + y + 0.62, z, 0.3, rng.pick(LEAF), { detail: 0, jitter: 0.1, noShadow: true });
  }
}
