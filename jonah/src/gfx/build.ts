// LevelBuilder: makes what you see and what you stand on together. Every piece is flat-shaded, vertex-coloured
// geometry merged per material and per map square, with a matching Rapier collider.
import * as THREE from 'three';
import { GROUP, Physics, RAPIER, WORLD_GROUPS, groups, type ColliderInfo, type Surface } from '../core/physics';
import { Rng } from '../core/util';
import { TEX_SCALE, texture, type MatKey } from './textures';

const materials = new Map<string, THREE.Material>();

/** The shared material for merged level geometry of one texture kind. */
export function worldMaterial(key: MatKey, doubleSide = false): THREE.Material {
  const id = `${key}${doubleSide ? ':2' : ''}`;
  let m = materials.get(id);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ vertexColors: true, map: texture(key), side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
    materials.set(id, m);
  }
  return m;
}

/** A plain flat-shaded material of one colour, shared by everything that asks for that colour. */
export function solid(color: THREE.ColorRepresentation, opts: { emissive?: THREE.ColorRepresentation; emissiveIntensity?: number; doubleSide?: boolean; transparent?: boolean; opacity?: number } = {}): THREE.MeshLambertMaterial {
  const c = new THREE.Color(color);
  const id = `solid:${c.getHexString()}:${opts.emissive ? new THREE.Color(opts.emissive).getHexString() : ''}:${opts.emissiveIntensity ?? 1}:${opts.doubleSide ? 2 : 1}:${opts.opacity ?? 1}`;
  let m = materials.get(id) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color: c,
      flatShading: true,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0),
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    materials.set(id, m);
  }
  return m;
}

export interface PieceOpts {
  /** Turn about the vertical, radians. */
  rotY?: number;
  /** Full rotation (overrides rotY). */
  rot?: THREE.Euler;
  mat?: MatKey;
  /** Default true for solids. */
  collide?: boolean;
  /** How much this piece's colour may wander from the one given (0..1). Default 0.05. */
  jitter?: number;
  /** How much darker the bottom is than the top (0..1): a cheap grounded look. Default 0.14. */
  shade?: number;
  /** Scale of the top face against the bottom, for walls that lean in. */
  taper?: number;
  surface?: Surface;
  tag?: string;
  noLedge?: boolean;
  collisionGroups?: number;
  /** No shadow cast (for huge or far things). */
  noShadow?: boolean;
  /** Both faces drawn (thin cloth). */
  doubleSide?: boolean;
}

interface Bucket {
  pos: number[];
  nor: number[];
  col: number[];
  uv: number[];
  mat: MatKey;
  noShadow: boolean;
  doubleSide: boolean;
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _n = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _ac = new THREE.Vector3();
const _col = new THREE.Color();
const _hsl = { h: 0, s: 0, l: 0 };
const ONE = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

const unitBox = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const cylCache = new Map<string, THREE.BufferGeometry>();

export class LevelBuilder {
  private buckets = new Map<string, Bucket>();
  readonly rng: Rng;
  /** Size of a map square: geometry is merged per square so the far ones can be culled. */
  chunk = 48;

  constructor(readonly physics: Physics | null, seed = 7, private body?: RAPIER.RigidBody) {
    this.rng = new Rng(seed);
  }

  private bucket(mat: MatKey, x: number, z: number, noShadow: boolean, doubleSide: boolean): Bucket {
    const cx = Math.floor(x / this.chunk);
    const cz = Math.floor(z / this.chunk);
    const key = `${mat}:${cx}:${cz}:${noShadow ? 1 : 0}:${doubleSide ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = { pos: [], nor: [], col: [], uv: [], mat, noShadow, doubleSide };
      this.buckets.set(key, b);
    }
    return b;
  }

  /**
   * Adds any geometry, placed by `matrix`, in one colour. Flat normals, a top-to-bottom shade and world-scaled
   * texture coordinates are worked out here. No collider.
   */
  geo(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, color: THREE.ColorRepresentation, opts: PieceOpts = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const src = g.getAttribute('position') as THREE.BufferAttribute;
    matrix.decompose(_p, _q, _s);
    const mat = opts.mat ?? 'plain';
    const bucket = this.bucket(mat, _p.x, _p.z, !!opts.noShadow, !!opts.doubleSide);
    const jitter = opts.jitter ?? 0.05;
    const shade = opts.shade ?? 0.14;
    _col.set(color);
    if (jitter > 0) {
      _col.getHSL(_hsl);
      _hsl.l = THREE.MathUtils.clamp(_hsl.l * (1 + this.rng.range(-jitter, jitter)), 0, 1);
      _hsl.h = (_hsl.h + this.rng.range(-jitter, jitter) * 0.12 + 1) % 1;
      _col.setHSL(_hsl.h, _hsl.s, _hsl.l);
    }
    // local vertical extent, for the shade
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < src.count; i++) {
      const y = src.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanY = Math.max(1e-5, maxY - minY);
    const scale = 1 / TEX_SCALE[mat];
    const off = (Math.abs(_p.x * 0.37 + _p.z * 0.61 + _p.y * 0.13) % 1) * 3;
    const taper = opts.taper ?? 1;
    for (let i = 0; i < src.count; i += 3) {
      _a.fromBufferAttribute(src, i);
      _b.fromBufferAttribute(src, i + 1);
      _c.fromBufferAttribute(src, i + 2);
      const ys = [_a.y, _b.y, _c.y];
      if (taper !== 1) {
        for (const v of [_a, _b, _c]) {
          const k = THREE.MathUtils.lerp(1, taper, (v.y - minY) / spanY);
          v.x *= k;
          v.z *= k;
        }
      }
      // texture coordinates from the scaled local position, by the face's own leading axis
      _ab.subVectors(_b, _a).multiply(_s);
      _ac.subVectors(_c, _a).multiply(_s);
      _n.crossVectors(_ab, _ac);
      const ax = Math.abs(_n.x);
      const ay = Math.abs(_n.y);
      const az = Math.abs(_n.z);
      const verts = [_a, _b, _c];
      for (let k = 0; k < 3; k++) {
        const v = verts[k];
        const lx = v.x * _s.x;
        const ly = v.y * _s.y;
        const lz = v.z * _s.z;
        if (ay >= ax && ay >= az) bucket.uv.push(lx * scale + off, lz * scale + off);
        else if (ax >= az) bucket.uv.push(lz * scale + off, ly * scale + off);
        else bucket.uv.push(lx * scale + off, ly * scale + off);
        const t = (ys[k] - minY) / spanY;
        const dark = 1 - shade * (1 - t);
        bucket.col.push(_col.r * dark, _col.g * dark, _col.b * dark);
      }
      _a.applyMatrix4(matrix);
      _b.applyMatrix4(matrix);
      _c.applyMatrix4(matrix);
      _ab.subVectors(_b, _a);
      _ac.subVectors(_c, _a);
      _n.crossVectors(_ab, _ac).normalize();
      bucket.pos.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
      bucket.nor.push(_n.x, _n.y, _n.z, _n.x, _n.y, _n.z, _n.x, _n.y, _n.z);
    }
    if (g !== geometry) g.dispose();
  }

  private quat(opts: PieceOpts): THREE.Quaternion {
    if (opts.rot) return new THREE.Quaternion().setFromEuler(opts.rot);
    return new THREE.Quaternion().setFromAxisAngle(UP, opts.rotY ?? 0);
  }

  private info(opts: PieceOpts, fallback: Surface): ColliderInfo {
    return { surface: opts.surface ?? fallback, tag: opts.tag, noLedge: opts.noLedge };
  }

  private surfaceOf(mat: MatKey | undefined): Surface {
    switch (mat) {
      case 'wood':
        return 'wood';
      case 'sand':
        return 'sand';
      case 'cloth':
      case 'weave':
        return 'cloth';
      default:
        return 'stone';
    }
  }

  /** A box by its centre. */
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, opts: PieceOpts = {}) {
    const q = this.quat(opts);
    _m.compose(_p.set(x, y, z), q, _s.set(sx, sy, sz));
    this.geo(unitBox, _m.clone(), color, opts);
    if (opts.collide !== false && this.physics) {
      return this.physics.box({ x, y, z }, { x: sx / 2, y: sy / 2, z: sz / 2 }, q, this.info(opts, this.surfaceOf(opts.mat)), opts.collisionGroups ?? WORLD_GROUPS, this.body);
    }
    return null;
  }

  /** A box standing on `y`: (x, z) is the middle of its foot. */
  block(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, opts: PieceOpts = {}) {
    return this.box(x, y + sy / 2, z, sx, sy, sz, color, opts);
  }

  /** A cylinder or cone by its centre. Colliders are cylinders of the larger radius. */
  cyl(x: number, y: number, z: number, rTop: number, rBottom: number, h: number, color: THREE.ColorRepresentation, opts: PieceOpts & { seg?: number; open?: boolean } = {}) {
    const seg = opts.seg ?? 8;
    const key = `${rTop / Math.max(rTop, rBottom, 1e-5)}:${rBottom / Math.max(rTop, rBottom, 1e-5)}:${seg}:${opts.open ? 1 : 0}`;
    let g = cylCache.get(key);
    const rMax = Math.max(rTop, rBottom, 1e-5);
    if (!g) {
      g = new THREE.CylinderGeometry(rTop / rMax, rBottom / rMax, 1, seg, 1, !!opts.open).toNonIndexed();
      cylCache.set(key, g);
    }
    const q = this.quat(opts);
    _m.compose(_p.set(x, y, z), q, _s.set(rMax, h, rMax));
    this.geo(g, _m.clone(), color, opts);
    if (opts.collide !== false && this.physics) {
      return this.physics.cylinder({ x, y, z }, h / 2, rMax, q, this.info(opts, this.surfaceOf(opts.mat)), opts.collisionGroups ?? WORLD_GROUPS, this.body);
    }
    return null;
  }

  /** A cylinder standing on `y`. */
  post(x: number, y: number, z: number, r: number, h: number, color: THREE.ColorRepresentation, opts: PieceOpts & { seg?: number; rTop?: number } = {}) {
    return this.cyl(x, y + h / 2, z, opts.rTop ?? r, r, h, color, opts);
  }

  /**
   * A ramp: a wedge whose foot is at (x, y, z) centre-bottom, rising toward +z (before rotY) from 0 to sy.
   * The collider is its convex hull.
   */
  ramp(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, opts: PieceOpts = {}) {
    const hx = sx / 2;
    const hz = sz / 2;
    const pts = [
      [-hx, 0, -hz],
      [hx, 0, -hz],
      [-hx, 0, hz],
      [hx, 0, hz],
      [-hx, sy, hz],
      [hx, sy, hz],
    ];
    const tri = [
      [0, 1, 3],
      [0, 3, 2], // bottom
      [2, 3, 5],
      [2, 5, 4], // back
      [0, 4, 5],
      [0, 5, 1], // slope
      [0, 2, 4], // left
      [1, 5, 3], // right
    ];
    const arr: number[] = [];
    for (const t of tri) for (const i of t) arr.push(...pts[i]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const q = this.quat(opts);
    _m.compose(_p.set(x, y, z), q, ONE);
    this.geo(g, _m.clone(), color, opts);
    g.dispose();
    if (opts.collide !== false && this.physics) {
      const flat = new Float32Array(pts.flat());
      const d = RAPIER.ColliderDesc.convexHull(flat);
      if (d) {
        d.setTranslation(x, y, z).setRotation(q).setFriction(0.9).setCollisionGroups(opts.collisionGroups ?? WORLD_GROUPS);
        const c = this.physics.world.createCollider(d, this.body);
        this.physics.info.set(c.handle, this.info(opts, this.surfaceOf(opts.mat)));
        return c;
      }
    }
    return null;
  }

  /** A gabled roof: foot centre at (x, y, z), ridge along x (before rotY). No collider by default. */
  gable(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: THREE.ColorRepresentation, opts: PieceOpts = {}) {
    const hx = sx / 2;
    const hz = sz / 2;
    const p = [
      [-hx, 0, -hz],
      [hx, 0, -hz],
      [hx, 0, hz],
      [-hx, 0, hz],
      [-hx, sy, 0],
      [hx, sy, 0],
    ];
    const tri = [
      [0, 4, 5],
      [0, 5, 1],
      [2, 5, 4],
      [2, 4, 3],
      [3, 4, 0],
      [1, 5, 2],
    ];
    const arr: number[] = [];
    for (const t of tri) for (const i of t) arr.push(...p[i]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const q = this.quat(opts);
    _m.compose(_p.set(x, y, z), q, ONE);
    this.geo(g, _m.clone(), color, opts);
    g.dispose();
    if (opts.collide === true && this.physics) {
      const d = RAPIER.ColliderDesc.convexHull(new Float32Array(p.flat()));
      if (d) {
        d.setTranslation(x, y, z).setRotation(q).setCollisionGroups(opts.collisionGroups ?? WORLD_GROUPS);
        const c = this.physics.world.createCollider(d, this.body);
        this.physics.info.set(c.handle, this.info(opts, 'stone'));
      }
    }
  }

  /** A low-poly ball (a dome when squashed). No collider unless asked. */
  ball(x: number, y: number, z: number, r: number, color: THREE.ColorRepresentation, opts: PieceOpts & { detail?: number; squash?: THREE.Vector3 } = {}) {
    const g = new THREE.IcosahedronGeometry(1, opts.detail ?? 1);
    const sq = opts.squash ?? ONE;
    _m.compose(_p.set(x, y, z), this.quat(opts), _s.set(r * sq.x, r * sq.y, r * sq.z));
    this.geo(g, _m.clone(), color, opts);
    g.dispose();
    if (opts.collide === true && this.physics) {
      const d = RAPIER.ColliderDesc.ball(r * Math.min(sq.x, sq.y, sq.z)).setTranslation(x, y, z).setCollisionGroups(opts.collisionGroups ?? WORLD_GROUPS);
      const c = this.physics.world.createCollider(d, this.body);
      this.physics.info.set(c.handle, this.info(opts, 'stone'));
    }
  }

  /** An unseen wall, solid to the player only. */
  wall(x: number, y: number, z: number, sx: number, sy: number, sz: number, rotY = 0) {
    if (!this.physics) return null;
    const q = new THREE.Quaternion().setFromAxisAngle(UP, rotY);
    return this.physics.box({ x, y, z }, { x: sx / 2, y: sy / 2, z: sz / 2 }, q, { noLedge: true }, groups(GROUP.PLAYER_ONLY, GROUP.PLAYER), this.body);
  }

  /** An unseen solid (for a shape drawn some other way). */
  solid(x: number, y: number, z: number, sx: number, sy: number, sz: number, opts: PieceOpts = {}) {
    if (!this.physics) return null;
    return this.physics.box({ x, y, z }, { x: sx / 2, y: sy / 2, z: sz / 2 }, this.quat(opts), this.info(opts, opts.surface ?? 'stone'), opts.collisionGroups ?? WORLD_GROUPS, this.body);
  }

  /** Turns everything added so far into meshes under one group. */
  finish(name = 'level'): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const b of this.buckets.values()) {
      if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, worldMaterial(b.mat, b.doubleSide));
      mesh.castShadow = !b.noShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}

/** Builds one merged, flat-shaded mesh from pieces, for props and set dressing that move as one. */
export function buildMesh(make: (b: LevelBuilder) => void, seed = 3): THREE.Group {
  const b = new LevelBuilder(null, seed);
  b.chunk = 1e6;
  make(b);
  const g = b.finish('piece');
  for (const m of g.children) (m as THREE.Mesh).matrixAutoUpdate = false;
  return g;
}
