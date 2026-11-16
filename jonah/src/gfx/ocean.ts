// The sea. One set of Gerstner waves is used twice: by the shader that draws the water, and here on the CPU so a
// ship (or a swimmer) can ask "how high is the water at this spot, and which way does it slope". A single travelling
// ridge can be added on top: the great wave.
import * as THREE from 'three';
import { TAU } from '../core/util';
import { cloudTexture } from './textures';

export const WAVES = 6;

export interface WaveSpec {
  /** Compass of travel, radians (0 runs toward +z). */
  heading: number;
  length: number;
  amplitude: number;
  /** 0..1: how sharply the crest is pinched. */
  steep: number;
}

/** A storm sea: a long heavy swell under shorter chop, mostly from one quarter. */
export const STORM_WAVES: WaveSpec[] = [
  { heading: 1.9, length: 74, amplitude: 2.3, steep: 0.5 },
  { heading: 1.35, length: 46, amplitude: 1.3, steep: 0.55 },
  { heading: 2.5, length: 29, amplitude: 0.78, steep: 0.6 },
  { heading: 1.0, length: 17, amplitude: 0.42, steep: 0.6 },
  { heading: 2.9, length: 11, amplitude: 0.24, steep: 0.5 },
  { heading: 0.4, length: 8, amplitude: 0.13, steep: 0.4 },
];

/** A fair-weather sea: low and slow. */
export const CALM_WAVES: WaveSpec[] = [
  { heading: 1.9, length: 60, amplitude: 0.5, steep: 0.3 },
  { heading: 1.2, length: 34, amplitude: 0.3, steep: 0.35 },
  { heading: 2.6, length: 21, amplitude: 0.18, steep: 0.4 },
  { heading: 0.8, length: 13, amplitude: 0.1, steep: 0.4 },
  { heading: 3.0, length: 9, amplitude: 0.06, steep: 0.4 },
  { heading: 0.3, length: 8, amplitude: 0.04, steep: 0.3 },
];

export interface OceanLook {
  deep: THREE.ColorRepresentation;
  shallow: THREE.ColorRepresentation;
  /** The light that shows through thin crests. */
  glow: THREE.ColorRepresentation;
  foam: THREE.ColorRepresentation;
  skyTop: THREE.ColorRepresentation;
  skyHorizon: THREE.ColorRepresentation;
  sunDir: THREE.Vector3;
  sunColor: THREE.ColorRepresentation;
  /** Strength of the sun's glitter. */
  spec: number;
  ambient: number;
  /** How much of the sea wears foam (0 none .. 1 white water). */
  foamAmount: number;
}

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform vec4 uWave[${WAVES}];   // dir.x, dir.z, k, amplitude
uniform vec2 uWave2[${WAVES}];  // steepness, omega
uniform float uTime;
uniform float uAmp;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec4 uRidge;            // dir.x, dir.z, place along dir, height
uniform float uRidgeWidth;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFoam;
varying float vHeight;
void main() {
  // The grid is finest under the camera and stretches toward the horizon.
  vec2 g = position.xz;
  vec2 w = sign(g) * (0.16 * abs(g) + 0.84 * abs(g) * abs(g) * abs(g)) * uRadius;
  vec2 p = w + uCenter;
  // far water lies flat, so the grid's coarse far rings do not saw at the horizon
  float calm = 1.0 - smoothstep(0.55, 0.98, max(abs(g.x), abs(g.y)));
  vec3 d = vec3(0.0);
  vec3 n = vec3(0.0, 1.0, 0.0);
  float pinch = 0.0;
  for (int i = 0; i < ${WAVES}; i++) {
    vec4 wv = uWave[i];
    float a = wv.w * uAmp * calm;
    float f = wv.z * dot(wv.xy, p) - uWave2[i].y * uTime;
    float s = sin(f);
    float c = cos(f);
    float q = uWave2[i].x;
    d.x += q * a * wv.x * c;
    d.z += q * a * wv.y * c;
    d.y += a * s;
    n.x -= wv.x * wv.z * a * c;
    n.z -= wv.y * wv.z * a * c;
    n.y -= q * wv.z * a * s;
    pinch += q * wv.z * a * s;
  }
  // the great wave: one ridge crossing the sea
  if (uRidge.w > 0.001) {
    float s = (dot(uRidge.xy, p) - uRidge.z) / uRidgeWidth;
    float e = exp(-s * s) * uRidge.w * calm;
    d.y += e;
    float slope = e * (-2.0 * s / uRidgeWidth);
    n.x -= uRidge.x * slope;
    n.z -= uRidge.y * slope;
    pinch += e * 0.16 * smoothstep(-0.2, 1.2, -s);
  }
  vec3 world = vec3(p.x + d.x, d.y, p.y + d.z);
  vWorld = world;
  vNormal = n;
  vFoam = pinch;
  vHeight = d.y;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlow;
uniform vec3 uFoam;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSpec;
uniform float uAmbient;
uniform float uFoamAmount;
uniform float uTime;
uniform float uAmp;
uniform sampler2D uNoise;
uniform float uFlash;
uniform vec3 uFlashDir;
uniform mat4 uShipInv;
uniform vec4 uHull;      // half beam, half length, keel depth, deck height
uniform float uHullOn;
uniform vec3 uLamp;      // a warm light on the water near the ship (world position)
uniform vec3 uLampColor;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vFoam;
varying float vHeight;

float hullHalfBeam(float z) {
  float u = clamp(abs(z) / uHull.y, 0.0, 1.0);
  return uHull.x * pow(max(0.0, 1.0 - pow(u, 2.4)), 0.55);
}

void main() {
  float wake = 0.0;
  if (uHullOn > 0.5) {
    // No sea inside the ship: cut the water away within the hull, below the deck.
    vec3 l = (uShipInv * vec4(vWorld, 1.0)).xyz;
    float u = clamp(abs(l.z) / uHull.y, 0.0, 1.0);
    float keel = uHull.z + 2.6 * u * u * u * u;
    float gun = 0.95 + 3.2 * u * u * u;
    float t = clamp((l.y - keel) / (gun - keel), 0.0, 1.0);
    float hw = hullHalfBeam(l.z) * pow(t, 0.3);
    float dx = abs(l.x) - hw;
    if (dx < 0.07 && l.y < uHull.w && abs(l.z) < uHull.y) discard;
    float dz = abs(l.z) - uHull.y;
    float dist = max(dx, dz);
    wake = (1.0 - smoothstep(0.0, 2.2, dist)) * step(l.y, 1.5);
  }

  vec3 N = normalize(vNormal);
  vec2 uv = vWorld.xz;
  float t = uTime;
  #ifndef OCEAN_LOW
  // small ripples the grid cannot carry
  float e = 0.012;
  vec2 u1 = uv * 0.045 + vec2(t * 0.018, t * 0.011);
  vec2 u2 = uv * 0.13 + vec2(-t * 0.03, t * 0.021);
  float h1 = texture2D(uNoise, u1).r;
  float h2 = texture2D(uNoise, u2).r;
  vec2 grad = vec2(texture2D(uNoise, u1 + vec2(e, 0.0)).r - h1, texture2D(uNoise, u1 + vec2(0.0, e)).r - h1) * 1.6
            + vec2(texture2D(uNoise, u2 + vec2(e, 0.0)).r - h2, texture2D(uNoise, u2 + vec2(0.0, e)).r - h2) * 0.9;
  N = normalize(N - vec3(grad.x, 0.0, grad.y) * (2.2 + uAmp * 3.0));
  float grain = h1 * 0.6 + h2 * 0.4;
  #else
  float grain = texture2D(uNoise, uv * 0.07 + vec2(t * 0.02, t * 0.012)).r;
  #endif

  vec3 V = normalize(cameraPosition - vWorld);
  float nv = max(dot(N, V), 0.0);
  float fres = 0.03 + 0.97 * pow(1.0 - nv, 4.0);
  float ndl = max(dot(N, uSunDir), 0.0);

  // the body of the water: darker in the troughs, greener and lighter where the crest thins
  float crest = smoothstep(-0.6, 2.4, vHeight);
  vec3 body = mix(uDeep, uShallow, crest * 0.75);
  float thin = pow(max(dot(V, -uSunDir) * 0.5 + 0.5, 0.0), 2.0) * smoothstep(0.2, 2.6, vHeight);
  body += uGlow * thin * 0.55;
  vec3 lit = body * (uAmbient + uSunColor * ndl);

  vec3 R = reflect(-V, N);
  vec3 sky = mix(uSkyHorizon, uSkyTop, pow(clamp(R.y, 0.0, 1.0), 0.6));
  vec3 c = mix(lit, sky, fres * 0.85);
  c += uSunColor * pow(max(dot(R, uSunDir), 0.0), 90.0) * uSpec;

  // lightning: a second, hard light for an instant
  if (uFlash > 0.001) {
    float fl = max(dot(N, uFlashDir) * 0.65 + 0.35, 0.0);
    c += (body * 2.4 + vec3(0.25, 0.3, 0.4)) * fl * uFlash;
    c += vec3(0.8, 0.88, 1.0) * pow(max(dot(R, uFlashDir), 0.0), 40.0) * uFlash;
  }

  // lantern light on the water close by
  vec3 toLamp = uLamp - vWorld;
  float ld = length(toLamp);
  c += uLampColor * (body + 0.05) * max(dot(N, toLamp / max(ld, 0.001)), 0.0) * 22.0 / (1.0 + ld * ld * 0.09);

  // foam: on pinched crests, and churned along the hull
  float cap = smoothstep(0.62 - uFoamAmount * 0.5, 1.02 - uFoamAmount * 0.5, vFoam + grain * 0.42);
  float streak = smoothstep(0.55, 0.9, grain) * smoothstep(-0.4, 1.6, vHeight) * uFoamAmount * 0.7;
  float fm = clamp(max(cap, streak) + wake * smoothstep(0.3, 0.7, grain + wake * 0.5), 0.0, 1.0);
  vec3 foamLit = uFoam * (uAmbient * 1.5 + uSunColor * (ndl * 0.7 + 0.3) + uFlash * 1.6);
  c = mix(c, foamLit, fm * 0.92);

  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const G = 9.81;
const _n = new THREE.Vector3();

export class Ocean {
  readonly mesh: THREE.Mesh;
  readonly uniforms: Record<string, THREE.IUniform>;
  /** Scales every wave: 1 is the sea as specified, 0 a mirror. */
  amp = 1;
  time = 0;
  /** The great wave: a ridge travelling along `dir`; `at` is how far along that line its crest is. */
  readonly ridge = { dirX: 1, dirZ: 0, at: -1e4, height: 0, width: 9 };
  private k = new Float32Array(WAVES);
  private dx = new Float32Array(WAVES);
  private dz = new Float32Array(WAVES);
  private a = new Float32Array(WAVES);
  private q = new Float32Array(WAVES);
  private w = new Float32Array(WAVES);
  private radius: number;

  constructor(grid: number, look: OceanLook, waves: WaveSpec[] = STORM_WAVES, opts: { radius?: number; low?: boolean } = {}) {
    this.radius = opts.radius ?? 330;
    const wave: THREE.Vector4[] = [];
    const wave2: THREE.Vector2[] = [];
    for (let i = 0; i < WAVES; i++) {
      wave.push(new THREE.Vector4());
      wave2.push(new THREE.Vector2());
    }
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uWave: { value: wave },
        uWave2: { value: wave2 },
        uTime: { value: 0 },
        uAmp: { value: 1 },
        uCenter: { value: new THREE.Vector2() },
        uRadius: { value: this.radius },
        uRidge: { value: new THREE.Vector4(1, 0, -1e4, 0) },
        uRidgeWidth: { value: 9 },
        uDeep: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() },
        uGlow: { value: new THREE.Color() },
        uFoam: { value: new THREE.Color() },
        uSkyTop: { value: new THREE.Color() },
        uSkyHorizon: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color() },
        uSpec: { value: 1 },
        uAmbient: { value: 0.5 },
        uFoamAmount: { value: 0.5 },
        uNoise: { value: null },
        uFlash: { value: 0 },
        uFlashDir: { value: new THREE.Vector3(0, 0.5, 1).normalize() },
        uShipInv: { value: new THREE.Matrix4() },
        uHull: { value: new THREE.Vector4(3.7, 13, -3.3, 0) },
        uHullOn: { value: 0 },
        uLamp: { value: new THREE.Vector3(0, -1000, 0) },
        uLampColor: { value: new THREE.Color(0, 0, 0) },
      },
    ]);
    this.uniforms.uNoise.value = cloudTexture();
    const geo = new THREE.PlaneGeometry(2, 2, grid, grid);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms, fog: true, defines: opts.low ? { OCEAN_LOW: 1 } : {} });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.setWaves(waves);
    this.setLook(look);
  }

  setWaves(waves: WaveSpec[]) {
    const wave = this.uniforms.uWave.value as THREE.Vector4[];
    const wave2 = this.uniforms.uWave2.value as THREE.Vector2[];
    for (let i = 0; i < WAVES; i++) {
      const s = waves[i] ?? { heading: 0, length: 10, amplitude: 0, steep: 0 };
      const k = TAU / s.length;
      this.k[i] = k;
      this.dx[i] = Math.sin(s.heading);
      this.dz[i] = Math.cos(s.heading);
      this.a[i] = s.amplitude;
      // Pinch is held under what would fold the surface over itself.
      this.q[i] = Math.min(s.steep, 0.9 / (k * Math.max(0.001, s.amplitude) * WAVES));
      this.w[i] = Math.sqrt(G * k) * 0.82;
      wave[i].set(this.dx[i], this.dz[i], k, s.amplitude);
      wave2[i].set(this.q[i], this.w[i]);
    }
  }

  setLook(look: Partial<OceanLook>) {
    const u = this.uniforms;
    if (look.deep !== undefined) (u.uDeep.value as THREE.Color).set(look.deep);
    if (look.shallow !== undefined) (u.uShallow.value as THREE.Color).set(look.shallow);
    if (look.glow !== undefined) (u.uGlow.value as THREE.Color).set(look.glow);
    if (look.foam !== undefined) (u.uFoam.value as THREE.Color).set(look.foam);
    if (look.skyTop !== undefined) (u.uSkyTop.value as THREE.Color).set(look.skyTop);
    if (look.skyHorizon !== undefined) (u.uSkyHorizon.value as THREE.Color).set(look.skyHorizon);
    if (look.sunDir) (u.uSunDir.value as THREE.Vector3).copy(look.sunDir).normalize();
    if (look.sunColor !== undefined) (u.uSunColor.value as THREE.Color).set(look.sunColor);
    if (look.spec !== undefined) u.uSpec.value = look.spec;
    if (look.ambient !== undefined) u.uAmbient.value = look.ambient;
    if (look.foamAmount !== undefined) u.uFoamAmount.value = look.foamAmount;
  }

  /** Tells the shader where the ship is, so no water is drawn inside her. Pass null for open sea. */
  setShip(ship: THREE.Object3D | null) {
    this.uniforms.uHullOn.value = ship ? 1 : 0;
    if (ship) (this.uniforms.uShipInv.value as THREE.Matrix4).copy(ship.matrixWorld).invert();
  }

  /** Once a frame. */
  update(time: number, camera: THREE.Camera) {
    this.time = time;
    const u = this.uniforms;
    u.uTime.value = time;
    u.uAmp.value = this.amp;
    (u.uCenter.value as THREE.Vector2).set(camera.position.x, camera.position.z);
    const r = this.ridge;
    (u.uRidge.value as THREE.Vector4).set(r.dirX, r.dirZ, r.at, r.height);
    u.uRidgeWidth.value = r.width;
  }

  /**
   * The water's height at a spot, at time `t` (default: now). Gerstner waves slide points sideways, so the spot is
   * first walked back to the grid point that ends up there.
   */
  height(x: number, z: number, t = this.time, normal?: THREE.Vector3): number {
    let px = x;
    let pz = z;
    for (let it = 0; it < 2; it++) {
      let ox = 0;
      let oz = 0;
      for (let i = 0; i < WAVES; i++) {
        const a = this.a[i] * this.amp;
        const c = Math.cos(this.k[i] * (this.dx[i] * px + this.dz[i] * pz) - this.w[i] * t);
        ox += this.q[i] * a * this.dx[i] * c;
        oz += this.q[i] * a * this.dz[i] * c;
      }
      px = x - ox;
      pz = z - oz;
    }
    let y = 0;
    let nx = 0;
    let nz = 0;
    for (let i = 0; i < WAVES; i++) {
      const a = this.a[i] * this.amp;
      const f = this.k[i] * (this.dx[i] * px + this.dz[i] * pz) - this.w[i] * t;
      y += a * Math.sin(f);
      if (normal) {
        const c = Math.cos(f);
        nx -= this.dx[i] * this.k[i] * a * c;
        nz -= this.dz[i] * this.k[i] * a * c;
      }
    }
    const r = this.ridge;
    if (r.height > 0.001) {
      const s = (r.dirX * px + r.dirZ * pz - r.at) / r.width;
      const e = Math.exp(-s * s) * r.height;
      y += e;
      if (normal) {
        const slope = e * ((-2 * s) / r.width);
        nx -= r.dirX * slope;
        nz -= r.dirZ * slope;
      }
    }
    if (normal) normal.set(nx, 1, nz).normalize();
    return y;
  }

  /** The slope of the water at a spot, as a unit normal. */
  normal(x: number, z: number, out = _n): THREE.Vector3 {
    this.height(x, z, this.time, out);
    return out;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
