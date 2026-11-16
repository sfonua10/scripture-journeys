import * as THREE from 'three';
import { cloudTexture } from './textures';

export interface SkyLook {
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  bottom: THREE.ColorRepresentation;
  /** Where the sun (or moon) stands; need not be unit length. */
  sunDir: THREE.Vector3;
  sunColor: THREE.ColorRepresentation;
  /** Angular size of the disc (0.02 is a small sun; 0 hides it). */
  sunSize: number;
  /** Strength of the glow round it. */
  sunGlow: number;
  /** 0 clear .. 1 overcast. */
  cloudCover: number;
  cloudLit: THREE.ColorRepresentation;
  cloudDark: THREE.ColorRepresentation;
  /** How fast the clouds drift. */
  cloudSpeed: number;
  stars: number;
}

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const frag = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uBottom;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunSize;
uniform float uSunGlow;
uniform sampler2D uCloud;
uniform float uCover;
uniform vec3 uCloudLit;
uniform vec3 uCloudDark;
uniform float uTime;
uniform float uSpeed;
uniform float uStars;
uniform float uFlash;
uniform vec3 uFlashDir;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 c = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
  c = mix(c, uBottom, 1.0 - smoothstep(-0.25, 0.0, h));
  float sd = max(dot(d, uSunDir), 0.0);

  // stars: a sparse grid of points, steady enough at this scale
  if (uStars > 0.0 && h > 0.0) {
    vec2 sp = d.xz / (h + 0.35) * 46.0;
    vec2 cell = floor(sp);
    float r = hash(cell);
    vec2 f = fract(sp) - 0.5 - (vec2(hash(cell + 7.0), hash(cell + 13.0)) - 0.5) * 0.6;
    float star = step(0.93, r) * (1.0 - smoothstep(0.0, 0.09, length(f)));
    c += star * uStars * (0.6 + 0.4 * sin(uTime * 2.0 + r * 40.0)) * smoothstep(0.02, 0.3, h);
  }

  // the disc and its glow
  if (uSunSize > 0.0) {
    float disc = smoothstep(1.0 - uSunSize * uSunSize, 1.0 - uSunSize * uSunSize * 0.6, sd);
    c += uSunColor * disc * 3.0;
  }
  c += uSunColor * (pow(sd, 40.0) * 0.5 + pow(sd, 6.0) * 0.18) * uSunGlow;

  // clouds, on a flat layer above
  if (uCover > 0.001 && h > -0.02) {
    vec2 uv = d.xz / (max(h, 0.0) + 0.14);
    float t = uTime * uSpeed;
    float n = texture2D(uCloud, uv * 0.07 + vec2(t * 0.012, t * 0.004)).r * 0.62
            + texture2D(uCloud, uv * 0.19 + vec2(-t * 0.02, t * 0.011)).r * 0.38;
    float edge = 1.0 - uCover;
    float m = smoothstep(edge * 0.9, edge * 0.9 + 0.28, n);
    float body = smoothstep(edge * 0.9 + 0.05, edge * 0.9 + 0.5, n);
    vec3 cc = mix(uCloudLit, uCloudDark, body);
    cc += uSunColor * pow(sd, 5.0) * 0.35 * (1.0 - body);
    // lightning lights the cloud from inside, strongest toward where it struck
    float fl = uFlash * (0.35 + 0.65 * pow(max(dot(d, uFlashDir), 0.0), 3.0));
    cc += vec3(0.75, 0.82, 1.0) * fl * (0.6 + n);
    float far = smoothstep(-0.02, 0.16, h);
    c = mix(c, cc, m * far);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** The sky: a gradient, a sun or moon, a drifting cloud layer, stars. Drawn behind everything. */
export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms: Record<string, THREE.IUniform>;

  constructor(look: SkyLook) {
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uSunSize: { value: 0.03 },
      uSunGlow: { value: 1 },
      uCloud: { value: cloudTexture() },
      uCover: { value: 0.4 },
      uCloudLit: { value: new THREE.Color() },
      uCloudDark: { value: new THREE.Color() },
      uTime: { value: 0 },
      uSpeed: { value: 1 },
      uStars: { value: 0 },
      uFlash: { value: 0 },
      uFlashDir: { value: new THREE.Vector3(0, 0.3, 1).normalize() },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.set(look);
  }

  set(look: Partial<SkyLook>) {
    const u = this.uniforms;
    if (look.top !== undefined) (u.uTop.value as THREE.Color).set(look.top);
    if (look.horizon !== undefined) (u.uHorizon.value as THREE.Color).set(look.horizon);
    if (look.bottom !== undefined) (u.uBottom.value as THREE.Color).set(look.bottom);
    if (look.sunDir) (u.uSunDir.value as THREE.Vector3).copy(look.sunDir).normalize();
    if (look.sunColor !== undefined) (u.uSunColor.value as THREE.Color).set(look.sunColor);
    if (look.sunSize !== undefined) u.uSunSize.value = look.sunSize;
    if (look.sunGlow !== undefined) u.uSunGlow.value = look.sunGlow;
    if (look.cloudCover !== undefined) u.uCover.value = look.cloudCover;
    if (look.cloudLit !== undefined) (u.uCloudLit.value as THREE.Color).set(look.cloudLit);
    if (look.cloudDark !== undefined) (u.uCloudDark.value as THREE.Color).set(look.cloudDark);
    if (look.cloudSpeed !== undefined) u.uSpeed.value = look.cloudSpeed;
    if (look.stars !== undefined) u.uStars.value = look.stars;
  }

  update(time: number) {
    this.uniforms.uTime.value = time;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export interface LightRig {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** Keeps the shadow box round a point (the player). */
  follow(target: THREE.Vector3): void;
  setSun(dir: THREE.Vector3, color: THREE.ColorRepresentation, intensity: number): void;
  dispose(): void;
}

/** A sun with a shadow box that follows the player, and a hemisphere fill. */
export function makeLights(scene: THREE.Scene, opts: { sunDir: THREE.Vector3; sunColor: THREE.ColorRepresentation; sunIntensity: number; skyColor: THREE.ColorRepresentation; groundColor: THREE.ColorRepresentation; hemiIntensity: number; shadowSize: number; shadowRange?: number }): LightRig {
  const sun = new THREE.DirectionalLight(opts.sunColor, opts.sunIntensity);
  const dir = opts.sunDir.clone().normalize();
  const range = opts.shadowRange ?? 26;
  sun.castShadow = opts.shadowSize > 0;
  if (sun.castShadow) {
    sun.shadow.mapSize.set(opts.shadowSize, opts.shadowSize);
    const cam = sun.shadow.camera;
    cam.left = -range;
    cam.right = range;
    cam.top = range;
    cam.bottom = -range;
    cam.near = 1;
    cam.far = 140;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.05;
    sun.shadow.radius = 3;
  }
  const hemi = new THREE.HemisphereLight(opts.skyColor, opts.groundColor, opts.hemiIntensity);
  scene.add(sun, sun.target, hemi);
  const texel = (range * 2) / Math.max(1, opts.shadowSize);
  return {
    sun,
    hemi,
    follow(target) {
      // Snap to shadow texels so the shadow edge does not crawl as the player walks.
      const x = Math.round(target.x / texel) * texel;
      const y = Math.round(target.y / texel) * texel;
      const z = Math.round(target.z / texel) * texel;
      sun.target.position.set(x, y, z);
      sun.position.set(x + dir.x * 60, y + dir.y * 60, z + dir.z * 60);
      sun.target.updateMatrixWorld();
    },
    setSun(d, color, intensity) {
      dir.copy(d).normalize();
      sun.color.set(color);
      sun.intensity = intensity;
    },
    dispose() {
      scene.remove(sun, sun.target, hemi);
      sun.shadow.map?.dispose();
      sun.dispose();
      hemi.dispose();
    },
  };
}
