import * as THREE from 'three';
import { dotTexture } from './textures';

// ---- Rain: streaks in a box that travels with the camera --------------------------------------------------------

const rainVert = /* glsl */ `
attribute vec3 aSeed;
attribute float aEnd;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uVel;
uniform float uTime;
uniform float uLen;
varying float vAlpha;
void main() {
  vec3 p = aSeed * uBox + uVel * uTime * (0.8 + 0.4 * fract(aSeed.x * 91.7));
  vec3 local = mod(p - uCam, uBox) - uBox * 0.5;
  vec3 world = uCam + local;
  world -= normalize(uVel) * uLen * aEnd * (0.6 + 0.8 * fract(aSeed.y * 53.3));
  vAlpha = (1.0 - aEnd) * smoothstep(uBox.x * 0.5, uBox.x * 0.3, length(local.xz));
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}`;
const rainFrag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Rain {
  readonly object: THREE.LineSegments;
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(count: number, box = new THREE.Vector3(34, 22, 34)) {
    const seeds = new Float32Array(count * 2 * 3);
    const ends = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = Math.random();
      const y = Math.random();
      const z = Math.random();
      seeds.set([x, y, z, x, y, z], i * 6);
      ends[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
    this.uniforms = {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: box },
      uVel: { value: new THREE.Vector3(-6, -24, 2) },
      uTime: { value: 0 },
      uLen: { value: 1.1 },
      uColor: { value: new THREE.Color(0xb8c8d8) },
      uOpacity: { value: 0.5 },
    };
    const m = new THREE.ShaderMaterial({ vertexShader: rainVert, fragmentShader: rainFrag, uniforms: this.uniforms, transparent: true, depthWrite: false });
    this.object = new THREE.LineSegments(g, m);
    this.object.frustumCulled = false;
    this.object.renderOrder = 20;
  }

  update(time: number, camera: THREE.Camera) {
    this.uniforms.uTime.value = time;
    (this.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

// ---- Motes: drifting points in a box round the camera (dust, plankton, bubbles, embers, blown sand) -------------

const moteVert = /* glsl */ `
attribute vec3 aSeed;
uniform vec3 uCam;
uniform vec3 uBox;
uniform vec3 uVel;
uniform float uTime;
uniform float uSize;
uniform float uWander;
uniform float uScale;
varying float vAlpha;
void main() {
  float ph = aSeed.x * 37.0 + aSeed.z * 17.0;
  vec3 p = aSeed * uBox + uVel * uTime * (0.6 + 0.8 * fract(ph));
  p += uWander * vec3(sin(uTime * 0.7 + ph), sin(uTime * 0.53 + ph * 1.7), cos(uTime * 0.61 + ph * 1.3));
  vec3 local = mod(p - uCam, uBox) - uBox * 0.5;
  vec4 mv = viewMatrix * vec4(uCam + local, 1.0);
  float edge = smoothstep(uBox.x * 0.5, uBox.x * 0.36, length(local));
  vAlpha = edge * (0.45 + 0.55 * fract(ph * 3.3));
  gl_PointSize = uSize * (0.5 + fract(ph * 7.1)) * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const moteFrag = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Motes {
  readonly object: THREE.Points;
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(count: number, opts: { box?: THREE.Vector3; color?: THREE.ColorRepresentation; size?: number; velocity?: THREE.Vector3; wander?: number; opacity?: number; additive?: boolean } = {}) {
    const seeds = new Float32Array(count * 3);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    this.uniforms = {
      uCam: { value: new THREE.Vector3() },
      uBox: { value: opts.box ?? new THREE.Vector3(30, 14, 30) },
      uVel: { value: opts.velocity ?? new THREE.Vector3(0.4, 0.05, 0.2) },
      uTime: { value: 0 },
      uSize: { value: opts.size ?? 0.08 },
      uWander: { value: opts.wander ?? 0.5 },
      uScale: { value: 600 },
      uMap: { value: dotTexture() },
      uColor: { value: new THREE.Color(opts.color ?? 0xffffff) },
      uOpacity: { value: opts.opacity ?? 0.6 },
    };
    const m = new THREE.ShaderMaterial({ vertexShader: moteVert, fragmentShader: moteFrag, uniforms: this.uniforms, transparent: true, depthWrite: false, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.object = new THREE.Points(g, m);
    this.object.frustumCulled = false;
    this.object.renderOrder = 19;
  }

  update(time: number, camera: THREE.Camera, viewportHeight: number) {
    this.uniforms.uTime.value = time;
    (this.uniforms.uCam.value as THREE.Vector3).copy(camera.position);
    this.uniforms.uScale.value = viewportHeight * 0.9;
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

// ---- Bursts: a pool of short-lived particles thrown by events (spray, dust puffs, splinters, sparkles) ----------

const burstVert = /* glsl */ `
attribute vec4 aColor;
attribute vec2 aSizeAdd;
uniform float uScale;
varying vec4 vColor;
varying float vAdd;
void main() {
  vec4 mv = viewMatrix * vec4(position, 1.0);
  vColor = aColor;
  vAdd = aSizeAdd.y;
  gl_PointSize = aSizeAdd.x * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const burstFrag = /* glsl */ `
uniform sampler2D uMap;
varying vec4 vColor;
varying float vAdd;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vColor.a;
  if (a < 0.004) discard;
  // premultiplied: an additive particle adds colour and covers nothing
  gl_FragColor = vec4(vColor.rgb * a, a * (1.0 - vAdd));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface BurstOpts {
  count?: number;
  color?: THREE.ColorRepresentation;
  /** A second colour to vary toward. */
  color2?: THREE.ColorRepresentation;
  speed?: number;
  /** Speed varies by this fraction. */
  speedVar?: number;
  /** The direction thrown, and how far it fans (0 a jet, 1 a sphere). */
  dir?: THREE.Vector3;
  spread?: number;
  size?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  additive?: boolean;
  /** Extra velocity every particle starts with. */
  inherit?: THREE.Vector3;
  /** Start scattered within this radius. */
  radius?: number;
  opacity?: number;
  /** Size grows (>1) or shrinks (<1) over life. */
  grow?: number;
}

export class Bursts {
  readonly object: THREE.Points;
  private n: number;
  private pos: Float32Array;
  private vel: Float32Array;
  private color: Float32Array;
  private sizeAdd: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size0: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private grow: Float32Array;
  private alpha0: Float32Array;
  private next = 0;
  private live = 0;
  private uniforms: Record<string, THREE.IUniform>;
  /** Scales every count asked for (the quality setting). */
  density = 1;

  constructor(capacity = 700) {
    this.n = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4);
    this.sizeAdd = new Float32Array(capacity * 2);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.size0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.grow = new Float32Array(capacity);
    this.alpha0 = new Float32Array(capacity);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSizeAdd', new THREE.BufferAttribute(this.sizeAdd, 2).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uMap: { value: dotTexture() }, uScale: { value: 600 } };
    const m = new THREE.ShaderMaterial({
      vertexShader: burstVert,
      fragmentShader: burstFrag,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendEquation: THREE.AddEquation,
    });
    this.object = new THREE.Points(g, m);
    this.object.frustumCulled = false;
    this.object.renderOrder = 21;
  }

  emit(at: THREE.Vector3Like, o: BurstOpts = {}) {
    const count = Math.max(1, Math.round((o.count ?? 10) * this.density));
    const c1 = _c1.set(o.color ?? 0xffffff);
    const c2 = _c2.set(o.color2 ?? o.color ?? 0xffffff);
    const speed = o.speed ?? 3;
    const sv = o.speedVar ?? 0.5;
    const spread = o.spread ?? 1;
    const dir = o.dir ? _d.copy(o.dir).normalize() : _d.set(0, 1, 0);
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.n;
      // a random direction, pulled toward dir
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      _v.set(r * Math.cos(th), u, r * Math.sin(th)).multiplyScalar(spread).add(_t.copy(dir).multiplyScalar(1 - spread * 0.5));
      if (_v.lengthSq() < 1e-6) _v.copy(dir);
      _v.normalize().multiplyScalar(speed * (1 - sv + Math.random() * sv * 2));
      if (o.inherit) _v.add(o.inherit);
      const rad = o.radius ?? 0;
      this.pos[i * 3] = at.x + (Math.random() - 0.5) * 2 * rad;
      this.pos[i * 3 + 1] = at.y + (Math.random() - 0.5) * 2 * rad;
      this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 2 * rad;
      this.vel[i * 3] = _v.x;
      this.vel[i * 3 + 1] = _v.y;
      this.vel[i * 3 + 2] = _v.z;
      const mix = Math.random();
      this.color[i * 4] = c1.r + (c2.r - c1.r) * mix;
      this.color[i * 4 + 1] = c1.g + (c2.g - c1.g) * mix;
      this.color[i * 4 + 2] = c1.b + (c2.b - c1.b) * mix;
      this.alpha0[i] = o.opacity ?? 0.9;
      this.color[i * 4 + 3] = this.alpha0[i];
      this.size0[i] = (o.size ?? 0.25) * (0.6 + Math.random() * 0.8);
      this.sizeAdd[i * 2] = this.size0[i];
      this.sizeAdd[i * 2 + 1] = o.additive ? 1 : 0;
      this.maxLife[i] = (o.life ?? 0.8) * (0.7 + Math.random() * 0.6);
      this.life[i] = this.maxLife[i];
      this.grav[i] = o.gravity ?? 9;
      this.drag[i] = o.drag ?? 0.6;
      this.grow[i] = o.grow ?? 1;
    }
    this.live = this.n;
  }

  update(dt: number, viewportHeight: number) {
    this.uniforms.uScale.value = viewportHeight * 0.9;
    if (this.live <= 0) return;
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.color[i * 4 + 3] = 0;
        this.sizeAdd[i * 2] = 0;
        continue;
      }
      alive++;
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= k;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * k - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= k;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      this.color[i * 4 + 3] = this.alpha0[i] * (1 - t * t);
      this.sizeAdd[i * 2] = this.size0[i] * (1 + (this.grow[i] - 1) * t);
    }
    this.live = alive;
    const g = this.object.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSizeAdd.needsUpdate = true;
  }

  dispose() {
    this.object.geometry.dispose();
    (this.object.material as THREE.Material).dispose();
  }
}

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _d = new THREE.Vector3();
const _v = new THREE.Vector3();
const _t = new THREE.Vector3();
