// Chapter 4's pieces: the great fish, the lights that live in it, the weeds, and the water inside.
import * as THREE from 'three';
import { Rng, TAU, clamp01, lerp } from '../core/util';
import { dotTexture } from '../gfx/textures';

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

// ---- lofted skins ------------------------------------------------------------------------------------------------

export interface Ring {
  pts: THREE.Vector3[];
  cols: THREE.Color[];
}

/**
 * A skin stretched over rings of points (each ring counter-clockwise seen from +z, rings marching along +z).
 * Flat-shaded, vertex-coloured. `inward` turns the faces to look in (a cave), `open` leaves the ring unclosed.
 */
export function loft(rings: Ring[], opts: { inward?: boolean; open?: boolean } = {}): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const put = (r: Ring, k: number) => {
    const p = r.pts[k];
    const c = r.cols[k];
    pos.push(p.x, p.y, p.z);
    col.push(c.r, c.g, c.b);
  };
  for (let i = 0; i < rings.length - 1; i++) {
    const a = rings[i];
    const b = rings[i + 1];
    const n = a.pts.length;
    const last = opts.open ? n - 1 : n;
    for (let k = 0; k < last; k++) {
      const k2 = (k + 1) % n;
      if (opts.inward) {
        put(a, k), put(b, k2), put(a, k2);
        put(a, k), put(b, k), put(b, k2);
      } else {
        put(a, k), put(a, k2), put(b, k2);
        put(a, k), put(b, k2), put(b, k);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Loose triangles in one colour each, added to position and colour lists. */
function tri(pos: number[], col: number[], a: THREE.Vector3Like, b: THREE.Vector3Like, c: THREE.Vector3Like, color: THREE.Color) {
  pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
}

// ---- the great fish ----------------------------------------------------------------------------------------------

// Along the body from the root of the tail (t = 0) to the snout (t = 1): t, half width, half height, lift.
const PROFILE: [number, number, number, number][] = [
  [0.0, 0.4, 1.15, 0.35],
  [0.08, 0.75, 1.55, 0.3],
  [0.2, 1.9, 2.7, 0.15],
  [0.35, 3.6, 4.3, 0],
  [0.5, 4.9, 5.5, 0],
  [0.65, 5.6, 6.0, 0],
  [0.78, 5.5, 5.7, -0.1],
  [0.88, 5.0, 5.0, -0.25],
  [0.95, 4.1, 3.9, -0.45],
  [1.0, 2.5, 2.2, -0.8],
];
const HEAD_FROM = 6; // index into PROFILE where the mouth begins
const SIDES = 16;
/** Where the lips part, as an angle below the midline. */
const LIP = 0.1 * Math.PI;

/**
 * The great fish that the LORD had prepared (1:17). Long as a ship and more; slate above, pearl beneath, with
 * lights along its flanks. Its nose is at +z. Nothing here is a monster: it is slow, vast and calm.
 */
export class GreatFish {
  readonly group = new THREE.Group();
  readonly length: number;
  /** 0 shut .. 1 wide. */
  gape = 0;
  /** How strongly the tail beats (0 still). */
  beat = 1;
  /** How bright the lights along it are. */
  glow = 1;
  private jaw = new THREE.Group();
  private uniforms = { uTime: { value: 0 }, uAmp: { value: 1.5 } };
  private lights: THREE.Points;
  private lightUniforms: Record<string, THREE.IUniform>;
  private disposables: { dispose(): void }[] = [];

  constructor(length = 46) {
    this.length = length;
    const L = length;
    const rng = new Rng(404);
    const top = new THREE.Color(0x22324e);
    const flank = new THREE.Color(0x415a82);
    const belly = new THREE.Color(0xd9d3c6);
    const inside = new THREE.Color(0x4a2a56);
    const shade = (ny: number, out: THREE.Color) => {
      if (ny > 0.25) out.copy(flank).lerp(top, clamp01((ny - 0.25) / 0.45));
      else out.copy(belly).lerp(flank, clamp01((ny + 0.45) / 0.7));
      const l = 1 + rng.range(-0.07, 0.07);
      out.multiplyScalar(l);
      return out;
    };
    const station = (i: number, from: number, to: number, n: number): Ring => {
      const [t, w, h, lift] = PROFILE[i];
      const z = (t - 0.5) * L;
      const pts: THREE.Vector3[] = [];
      const cols: THREE.Color[] = [];
      for (let k = 0; k < n; k++) {
        const a = lerp(from, to, n === 1 ? 0 : k / (n - 1));
        const ny = Math.sin(a);
        pts.push(new THREE.Vector3(Math.cos(a) * w, lift + ny * h, z));
        cols.push(shade(ny, new THREE.Color()));
      }
      return { pts, cols };
    };

    // ---- the body, tail to the back of the head: whole rings
    const pos: number[] = [];
    const col: number[] = [];
    const take = (g: THREE.BufferGeometry) => {
      const p = g.getAttribute('position').array as Float32Array;
      const c = g.getAttribute('color').array as Float32Array;
      for (let i = 0; i < p.length; i++) pos.push(p[i]);
      for (let i = 0; i < c.length; i++) col.push(c[i]);
      g.dispose();
    };
    const whole: Ring[] = [];
    for (let i = 0; i <= HEAD_FROM; i++) whole.push(station(i, 0, TAU * (1 - 1 / SIDES), SIDES));
    take(loft(whole));
    // the root of the tail closed
    {
      const r = whole[0];
      const mid = new THREE.Vector3(0, PROFILE[0][3], r.pts[0].z);
      for (let k = 0; k < SIDES; k++) tri(pos, col, mid, r.pts[(k + 1) % SIDES], r.pts[k], r.cols[k]);
    }
    // ---- the upper head: an arch from lip to lip, and the roof of the mouth under it
    const upperN = 10;
    const upper: Ring[] = [];
    for (let i = HEAD_FROM; i < PROFILE.length; i++) upper.push(station(i, -LIP, Math.PI + LIP, upperN));
    take(loft(upper, { open: true }));
    for (let i = 0; i < upper.length - 1; i++) {
      const a = upper[i];
      const b = upper[i + 1];
      // the palate, a little vaulted
      const am = a.pts[0].clone().add(a.pts[upperN - 1]).multiplyScalar(0.5);
      const bm = b.pts[0].clone().add(b.pts[upperN - 1]).multiplyScalar(0.5);
      am.y += PROFILE[HEAD_FROM + i][2] * 0.3;
      bm.y += PROFILE[HEAD_FROM + i + 1][2] * 0.3;
      _c.copy(inside).multiplyScalar(1 + rng.range(-0.1, 0.1));
      tri(pos, col, a.pts[0], am, bm, _c);
      tri(pos, col, a.pts[0], bm, b.pts[0], _c);
      tri(pos, col, am, a.pts[upperN - 1], b.pts[upperN - 1], _c);
      tri(pos, col, am, b.pts[upperN - 1], bm, _c);
    }
    // the snout closed
    {
      const r = upper[upper.length - 1];
      const mid = r.pts[0].clone().add(r.pts[upperN - 1]).multiplyScalar(0.5);
      for (let k = 0; k < upperN - 1; k++) tri(pos, col, mid, r.pts[k], r.pts[k + 1], r.cols[k]);
    }
    // the back of the throat, dark
    {
      const r = whole[HEAD_FROM];
      const mid = new THREE.Vector3(0, PROFILE[HEAD_FROM][3], r.pts[0].z - 0.5);
      for (let k = 0; k < SIDES; k++) tri(pos, col, mid, r.pts[k], r.pts[(k + 1) % SIDES], inside);
    }

    // ---- fins: flat blades
    const fin = new THREE.Color(0x2a3c5c);
    const tz = -L / 2;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // the tail: two lobes, upright as a fish's is
    tri(pos, col, V(0, 1.5, tz + 1.5), V(0, 0.4, tz - 4.2), V(0, 10.5, tz - 9.5), fin);
    tri(pos, col, V(0, -0.8, tz + 1.5), V(0, -9.5, tz - 8.5), V(0, 0.4, tz - 4.2), fin);
    tri(pos, col, V(0, 1.5, tz + 1.5), V(0, -0.8, tz + 1.5), V(0, 0.4, tz - 4.2), fin);
    // the back fin
    tri(pos, col, V(0, 5.6, L * 0.1), V(0, 4.6, -L * 0.14), V(0, 10.2, -L * 0.1), fin);
    // the breast fins
    for (const s of [1, -1]) {
      tri(pos, col, V(s * 5.0, -2.2, L * 0.24), V(s * 4.6, -2.8, L * 0.1), V(s * 12.5, -6.4, L * 0.02), fin);
      tri(pos, col, V(s * 5.0, -2.2, L * 0.24), V(s * 12.5, -6.4, L * 0.02), V(s * 10.5, -5.2, L * 0.16), fin);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    const uniforms = this.uniforms;
    const half = (L / 2).toFixed(1);
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uAmp = uniforms.uAmp;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uAmp;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\n  float sw = clamp((4.0 - position.z) / (${half} + 4.0), 0.0, 1.0);\n  transformed.x += sin(uTime - position.z * 0.12) * uAmp * sw * sw;`);
    };
    const body = new THREE.Mesh(geo, mat);
    body.frustumCulled = false;
    this.group.add(body);
    this.disposables.push(geo, mat);

    // ---- the lower jaw: hinged at the back of the head
    const hinge = V(0, PROFILE[HEAD_FROM][3] - Math.sin(LIP) * PROFILE[HEAD_FROM][2], (PROFILE[HEAD_FROM][0] - 0.5) * L);
    const lowerN = 8;
    const lower: Ring[] = [];
    for (let i = HEAD_FROM; i < PROFILE.length; i++) lower.push(station(i, Math.PI + LIP, TAU - LIP, lowerN));
    const jpos: number[] = [];
    const jcol: number[] = [];
    {
      const g = loft(lower, { open: true });
      const p = g.getAttribute('position').array as Float32Array;
      const c = g.getAttribute('color').array as Float32Array;
      for (let i = 0; i < p.length; i++) jpos.push(p[i]);
      for (let i = 0; i < c.length; i++) jcol.push(c[i]);
      g.dispose();
    }
    for (let i = 0; i < lower.length - 1; i++) {
      const a = lower[i];
      const b = lower[i + 1];
      _c.copy(inside).multiplyScalar(1.25 + rng.range(-0.1, 0.1));
      // the tongue: the floor of the mouth
      tri(jpos, jcol, a.pts[0], b.pts[lowerN - 1], a.pts[lowerN - 1], _c);
      tri(jpos, jcol, a.pts[0], b.pts[0], b.pts[lowerN - 1], _c);
    }
    {
      const r = lower[lower.length - 1];
      const mid = r.pts[0].clone().add(r.pts[lowerN - 1]).multiplyScalar(0.5);
      for (let k = 0; k < lowerN - 1; k++) tri(jpos, jcol, mid, r.pts[k + 1], r.pts[k], r.cols[k]);
    }
    for (let i = 0; i < jpos.length; i += 3) {
      jpos[i] -= hinge.x;
      jpos[i + 1] -= hinge.y;
      jpos[i + 2] -= hinge.z;
    }
    const jgeo = new THREE.BufferGeometry();
    jgeo.setAttribute('position', new THREE.Float32BufferAttribute(jpos, 3));
    jgeo.setAttribute('color', new THREE.Float32BufferAttribute(jcol, 3));
    jgeo.computeVertexNormals();
    const jmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
    const jaw = new THREE.Mesh(jgeo, jmat);
    jaw.frustumCulled = false;
    this.jaw.position.copy(hinge);
    this.jaw.add(jaw);
    this.group.add(this.jaw);
    this.disposables.push(jgeo, jmat);

    // ---- the eyes: dark and quiet, with a pale ring
    const eyeGeo = new THREE.IcosahedronGeometry(1, 1);
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x8a949a });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x05070c });
    for (const s of [1, -1]) {
      const z = L * 0.385;
      const ring = new THREE.Mesh(eyeGeo, ringMat);
      ring.position.set(s * 4.72, 1.5, z);
      ring.scale.set(0.3, 0.62, 0.62);
      const pupil = new THREE.Mesh(eyeGeo, pupilMat);
      pupil.position.set(s * 4.9, 1.5, z);
      pupil.scale.set(0.26, 0.47, 0.47);
      this.group.add(ring, pupil);
    }
    this.disposables.push(eyeGeo, ringMat, pupilMat);

    // ---- lights along the flanks, and a dim glow in the throat
    const spots: number[] = [];
    const tint: number[] = [];
    const size: number[] = [];
    const seed: number[] = [];
    const spot = (x: number, y: number, z: number, c: number, s: number) => {
      spots.push(x, y, z);
      _c.set(c);
      tint.push(_c.r, _c.g, _c.b);
      size.push(s);
      seed.push(rng.next());
    };
    for (const s of [1, -1]) {
      for (let i = 0; i < 15; i++) {
        const t = 0.4 + (i / 14) * 0.52;
        const k = (t - 0.5) * L;
        const w = this.widthAt(t);
        spot(s * (w + 0.15), -0.6 + Math.sin(i * 1.3) * 0.5, k, i % 3 === 0 ? 0xffe9c8 : 0x8ff0e0, 1.5 + (i % 3 === 0 ? 0.9 : 0));
        if (i % 2 === 0) spot(s * (w * 0.86 + 0.15), -2.6, k + 0.7, 0xc48cff, 1.1);
      }
    }
    for (let i = 0; i < 7; i++) spot(rng.range(-2.6, 2.6), rng.range(-1.2, 1.4), L * 0.3 + rng.range(-1, 3), i % 2 ? 0xd070ff : 0x60e0d8, 2.6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(spots, 3));
    lg.setAttribute('aColor', new THREE.Float32BufferAttribute(tint, 3));
    lg.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    this.lightUniforms = { uMap: { value: dotTexture() }, uTime: { value: 0 }, uScale: { value: 600 }, uGlow: { value: 1 } };
    const lm = new THREE.ShaderMaterial({
      uniforms: this.lightUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aSeed;
uniform float uTime;
uniform float uScale;
uniform float uGlow;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.7 + 0.3 * sin(uTime * (0.7 + aSeed) + aSeed * 40.0);
  gl_PointSize = min(160.0, aSize * 0.6 * uScale / max(0.5, -mv.z));
  vColor = aColor * tw * uGlow * (1.0 - smoothstep(70.0, 150.0, -mv.z));
}`,
      fragmentShader: /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a;
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    });
    this.lights = new THREE.Points(lg, lm);
    this.lights.frustumCulled = false;
    this.lights.renderOrder = 18;
    this.group.add(this.lights);
    this.disposables.push(lg, lm);
  }

  /** Half the body's width at a place along it (0 tail .. 1 snout). */
  widthAt(t: number): number {
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const a = PROFILE[i];
      const b = PROFILE[i + 1];
      if (t <= b[0]) return lerp(a[1], b[1], clamp01((t - a[0]) / (b[0] - a[0])));
    }
    return PROFILE[PROFILE.length - 1][1];
  }

  update(time: number, viewportHeight: number) {
    this.uniforms.uTime.value = time * 1.25;
    this.uniforms.uAmp.value = 1.5 * this.beat;
    this.jaw.rotation.x = this.gape * 0.66;
    this.lightUniforms.uTime.value = time;
    this.lightUniforms.uScale.value = viewportHeight * 0.9;
    this.lightUniforms.uGlow.value = this.glow;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    for (const d of this.disposables) d.dispose();
  }
}

// ---- lights that live in the dark --------------------------------------------------------------------------------

export interface GlowSpot {
  pos: THREE.Vector3Like;
  color: THREE.ColorRepresentation;
  /** Metres across, roughly. */
  size: number;
  /** Which stretch of the way it belongs to: it wakes when that stretch is lit. */
  sec: number;
}

const MAX_SEC = 12;

/** Soft points of light, in stretches that are dark until woken. One draw call. */
export class GlowField {
  readonly object: THREE.Points;
  /** How awake each stretch is, 0..1. Write to it; `update` sends it to the shader. */
  readonly lit = new Float32Array(MAX_SEC);
  private uniforms: Record<string, THREE.IUniform>;

  constructor(spots: GlowSpot[], rest = 0.05) {
    const n = spots.length;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const sec = new Float32Array(n);
    const seed = new Float32Array(n);
    spots.forEach((s, i) => {
      pos[i * 3] = s.pos.x;
      pos[i * 3 + 1] = s.pos.y;
      pos[i * 3 + 2] = s.pos.z;
      _c.set(s.color);
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
      size[i] = s.size;
      sec[i] = s.sec;
      seed[i] = Math.random();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSec', new THREE.BufferAttribute(sec, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.uniforms = { uMap: { value: dotTexture() }, uTime: { value: 0 }, uScale: { value: 600 }, uLit: { value: this.lit }, uRest: { value: rest } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
attribute float aSec;
attribute float aSeed;
uniform float uLit[${MAX_SEC}];
uniform float uTime;
uniform float uScale;
uniform float uRest;
varying vec3 vColor;
void main() {
  float lit = uLit[int(aSec + 0.5)];
  vec3 p = position;
  p.y += sin(uTime * (0.4 + aSeed * 0.5) + aSeed * 30.0) * 0.12;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.72 + 0.28 * sin(uTime * (0.8 + aSeed * 1.9) + aSeed * 50.0);
  gl_PointSize = min(200.0, aSize * (0.55 + 0.45 * lit) * uScale / max(0.5, -mv.z));
  vColor = aColor * (uRest + (1.0 - uRest) * lit) * tw * (1.0 - smoothstep(55.0, 110.0, -mv.z));
}`,
      fragmentShader: /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a;
  gl_FragColor = vec4(vColor * a, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
    });
    this.object = new THREE.Points(g, m);
    this.object.frustumCulled = false;
    this.object.renderOrder = 17;
  }

  update(time: number, viewportHeight: number) {
    this.uniforms.uTime.value = time;
    this.uniforms.uScale.value = viewportHeight * 0.9;
  }

  dispose() {
    this.object.parent?.remove(this.object);
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

export interface JellySpec {
  x: number;
  z: number;
  /** Metres under the surface (or, with no surface, its height). */
  depth: number;
  color: THREE.ColorRepresentation;
  size: number;
  sec: number;
}

/** Small glowing bells that pulse and drift just under the water. One instanced draw call. */
export class Jellies {
  readonly mesh: THREE.InstancedMesh;
  private base: THREE.Color[] = [];
  private phase: number[] = [];

  constructor(private specs: JellySpec[]) {
    // a bell and four trailing ribbons
    const bell = new THREE.SphereGeometry(1, 7, 4, 0, TAU, 0, Math.PI * 0.55).toNonIndexed();
    const parts: number[] = Array.from(bell.getAttribute('position').array as Float32Array);
    bell.dispose();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.4;
      const x = Math.cos(a) * 0.5;
      const z = Math.sin(a) * 0.5;
      const w = 0.09;
      parts.push(x - w, -0.1, z, x + w, -0.1, z, x, -1.9, z * 0.6);
      parts.push(x, -0.1, z - w, x, -0.1, z + w, x * 0.6, -1.7, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(parts, 3));
    g.computeVertexNormals();
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(g, m, Math.max(1, specs.length));
    this.mesh.count = specs.length;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 16;
    specs.forEach((s, i) => {
      this.base.push(new THREE.Color(s.color));
      this.phase.push(Math.random() * TAU);
      this.mesh.setColorAt(i, _c.set(0));
    });
  }

  /** `lit` is per stretch; `surface` is the water's height, or null when `depth` is a height in the world. */
  update(time: number, lit: ArrayLike<number>, surface: number | null, rest = 0.07) {
    const specs = this.specs;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const ph = this.phase[i];
      const pulse = Math.sin(time * 1.5 + ph);
      const y = (surface === null ? s.depth : surface - s.depth) + Math.sin(time * 0.5 + ph) * 0.3 + pulse * 0.08;
      _p.set(s.x + Math.sin(time * 0.21 + ph) * 0.8, y, s.z + Math.cos(time * 0.17 + ph * 1.3) * 0.8);
      _s.set(s.size * (1 + pulse * 0.12), s.size * (1 - pulse * 0.16), s.size * (1 + pulse * 0.12));
      _q.setFromEuler(_e.set(Math.sin(time * 0.3 + ph) * 0.2, ph, Math.cos(time * 0.27 + ph) * 0.2));
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
      const k = rest + (1 - rest) * clamp01(lit[s.sec] ?? 0);
      this.mesh.setColorAt(i, _c.copy(this.base[i]).multiplyScalar(k * (0.85 + pulse * 0.15)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ---- weeds -------------------------------------------------------------------------------------------------------

export interface WeedZone {
  x: number;
  z: number;
  /** Where the weed is rooted (its lowest point when it stands, its highest when it hangs). */
  y: number;
  height: number;
  radius: number;
  /** Hangs down from `y` rather than standing up from it. */
  hangs?: boolean;
  /** The weeds of the deep count against the chapter's challenge; those inside the fish do not. */
  deep?: boolean;
}

/** Long ribbons that sway. Each zone is a clump of them; the zone is what catches a swimmer. One draw call. */
export class Weeds {
  readonly mesh: THREE.InstancedMesh;
  private uniforms = { uTime: { value: 0 }, uStir: { value: new THREE.Vector4(0, 0, 0, 0) } };

  constructor(readonly zones: WeedZone[], colors: number[], seed = 9, per = 8) {
    const rng = new Rng(seed);
    const blade = new THREE.PlaneGeometry(1, 1, 1, 9);
    blade.translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const uniforms = this.uniforms;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uStir = uniforms.uStir;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec4 uStir;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  float wy = position.y;
  vec3 root = instanceMatrix[3].xyz;
  float ph = root.x * 0.9 + root.z * 1.3;
  transformed.x *= 1.0 - 0.65 * wy;
  float stir = uStir.w * exp(-distance(root.xz, uStir.xz) * 0.5);
  transformed.x += (sin(uTime * 1.1 + ph + wy * 3.2) * 0.9 + sin(uTime * 9.0 + ph) * stir * 1.4) * wy * wy;
  transformed.z += cos(uTime * 0.8 + ph * 1.7 + wy * 2.6) * 0.7 * wy * wy;`,
        );
    };
    this.mesh = new THREE.InstancedMesh(blade, mat, Math.max(1, zones.length * per));
    this.mesh.count = zones.length * per;
    let n = 0;
    for (const zn of zones) {
      for (let i = 0; i < per; i++) {
        const a = rng.range(0, TAU);
        const r = Math.sqrt(rng.next()) * zn.radius * 0.75;
        const h = zn.height * rng.range(0.8, 1.06);
        _p.set(zn.x + Math.cos(a) * r, zn.y, zn.z + Math.sin(a) * r);
        _q.setFromEuler(_e.set(zn.hangs ? Math.PI : 0, rng.range(0, TAU), 0));
        _s.set(rng.range(0.7, 1.3), h, 1);
        this.mesh.setMatrixAt(n, _m.compose(_p, _q, _s));
        this.mesh.setColorAt(n, _c.set(colors[rng.int(0, colors.length - 1)]).multiplyScalar(rng.range(0.8, 1.15)));
        n++;
      }
    }
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  /** The zone a point is tangled in, if any. */
  at(p: THREE.Vector3Like): WeedZone | null {
    for (const z of this.zones) {
      const lo = z.hangs ? z.y - z.height : z.y;
      const hi = z.hangs ? z.y : z.y + z.height;
      // a swimmer is caught when his feet are well into standing weed, or his head well into hanging weed
      if (z.hangs ? p.y < lo - 1.2 || p.y > hi : p.y < lo - 1.5 || p.y > hi - 0.6) continue;
      const dx = p.x - z.x;
      const dz = p.z - z.z;
      if (dx * dx + dz * dz < z.radius * z.radius) return z;
    }
    return null;
  }

  /** `stirAt` shakes the weeds near a place (someone struggling in them); strength 0..1. */
  update(time: number, stirAt?: THREE.Vector3Like, strength = 0) {
    this.uniforms.uTime.value = time;
    const s = this.uniforms.uStir.value;
    if (stirAt) s.set(stirAt.x, stirAt.y, stirAt.z, strength);
    else s.w = 0;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ---- water seen from inside and from beneath ----------------------------------------------------------------------

const sheetVert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const sheetFrag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uDeep;
uniform vec3 uSheen;
uniform float uTime;
uniform float uAlpha;
uniform float uBright;
uniform vec2 uFlow;
uniform float uUp;
uniform vec2 uScale;
varying vec3 vWorld;
void main() {
  vec2 p = mix(vWorld.xz, vWorld.xy, uUp) * uScale - uFlow;
  float a = sin(p.x * 1.3 + uTime * 0.7 + sin(p.y * 0.8 + uTime * 0.31) * 1.6);
  float b = sin(p.y * 1.5 - uTime * 0.6 + sin(p.x * 0.7 - uTime * 0.23) * 1.4);
  float c = sin((p.x + p.y) * 2.3 + uTime * 1.1);
  float r = a * b * 0.75 + c * 0.25;
  // bright where the pattern crosses nought: a net of thin moving lines, as light makes on water
  float line = smoothstep(0.9, 1.0, 1.0 - abs(r)) + smoothstep(0.5, 1.0, r) * 0.2;
  vec3 col = uDeep + uSheen * line * uBright;
  gl_FragColor = vec4(col, clamp(uAlpha + line * 0.18 * uBright, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** A flat sheet of water with moving light on it: the pool inside the fish, or the sea's skin seen from under. */
export class WaterSheet {
  readonly mesh: THREE.Mesh;
  readonly uniforms: Record<string, THREE.IUniform>;
  /** How far the pattern has been carried by the flow. */
  readonly flow = new THREE.Vector2();

  constructor(sx: number, sz: number, deep: THREE.ColorRepresentation, sheen: THREE.ColorRepresentation, alpha: number, upright = false) {
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      { uDeep: { value: new THREE.Color(deep) }, uSheen: { value: new THREE.Color(sheen) }, uTime: { value: 0 }, uAlpha: { value: alpha }, uBright: { value: 1 }, uFlow: { value: new THREE.Vector2() }, uUp: { value: upright ? 1 : 0 }, uScale: { value: new THREE.Vector2(0.42, 0.42) } },
    ]);
    const m = new THREE.ShaderMaterial({ vertexShader: sheetVert, fragmentShader: sheetFrag, uniforms: this.uniforms, fog: true, transparent: alpha < 1, depthWrite: false, side: THREE.DoubleSide });
    const g = new THREE.PlaneGeometry(sx, sz, 1, 1);
    if (!upright) g.rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(g, m);
    this.mesh.renderOrder = 12;
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
    (this.uniforms.uFlow.value as THREE.Vector2).copy(this.flow);
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Flecks of foam that ride whatever current they are in, so the current can be seen. One instanced draw call. */
export class Flecks {
  readonly mesh: THREE.InstancedMesh;
  private at: THREE.Vector3[] = [];
  private spin: number[] = [];
  private out = new THREE.Vector3();

  constructor(count: number, color: THREE.ColorRepresentation = 0x9fd8d8) {
    const g = new THREE.PlaneGeometry(0.36, 0.09);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, m, Math.max(1, count));
    this.mesh.count = count;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 13;
    for (let i = 0; i < count; i++) {
      this.at.push(new THREE.Vector3(1e6, 0, 0));
      this.spin.push(Math.random() * TAU);
    }
  }

  /**
   * Carries each fleck along `current` and keeps them in a window round `centre` (x within ±halfX of `midX`, z
   * within ±halfZ of the centre's z), on the water at `surface`.
   */
  update(dt: number, centre: THREE.Vector3Like, midX: number, halfX: number, halfZ: number, surface: number, current: (p: THREE.Vector3, out: THREE.Vector3) => THREE.Vector3) {
    for (let i = 0; i < this.at.length; i++) {
      const p = this.at[i];
      if (Math.abs(p.z - centre.z) > halfZ || Math.abs(p.x - midX) > halfX) {
        const fresh = p.x > 1e5;
        p.x = midX + (Math.random() * 2 - 1) * halfX;
        // come back in at the far edge they left by, so the stream does not pop in mid-view
        p.z = fresh ? centre.z + (Math.random() * 2 - 1) * halfZ : centre.z + (p.z > centre.z ? -1 : 1) * halfZ * (0.9 + Math.random() * 0.1);
      }
      p.y = surface;
      const v = current(p, this.out.set(0, 0, 0));
      const sp = Math.hypot(v.x, v.z);
      p.x += v.x * dt;
      p.z += v.z * dt;
      if (sp > 0.2) this.spin[i] = Math.atan2(v.x, v.z) + Math.PI / 2;
      _p.set(p.x, surface + 0.03, p.z);
      _q.setFromEuler(_e.set(0, this.spin[i], 0));
      const stretch = 0.7 + Math.min(2.6, sp * 0.55);
      this.mesh.setMatrixAt(i, _m.compose(_p, _q, _s.set(stretch, 1, 1)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
