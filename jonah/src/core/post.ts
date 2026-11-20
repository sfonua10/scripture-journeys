import * as THREE from 'three';
import type { Quality } from './quality';

/** The look of a chapter, applied in the last pass (medium and high) and through fog and lights (always). */
export interface Grade {
  /** Multiplies the picture, per channel: the colour cast. */
  tint: THREE.Color;
  /** Added to the shadows, per channel. */
  lift: THREE.Color;
  saturation: number;
  contrast: number;
  vignette: number;
  bloom: number;
  /** Bloom starts above this brightness. */
  threshold: number;
  exposure: number;
}

export const defaultGrade = (): Grade => ({
  tint: new THREE.Color(1, 1, 1),
  lift: new THREE.Color(0, 0, 0),
  saturation: 1.05,
  contrast: 1.04,
  vignette: 0.32,
  bloom: 0.35,
  threshold: 0.85,
  exposure: 1,
});

const quadVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const brightFrag = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
  // 4-tap box downsample, then keep what is brighter than the threshold.
  vec3 c = texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
  c += texture2D(tDiffuse, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  c += texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
  c += texture2D(tDiffuse, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = max(0.0, l - uThreshold) / max(l, 0.0001);
  gl_FragColor = vec4(min(c * k, vec3(6.0)), 1.0);
}`;

const blurFrag = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
  c += texture2D(tDiffuse, vUv + uDir * 1.384615).rgb * 0.316216;
  c += texture2D(tDiffuse, vUv - uDir * 1.384615).rgb * 0.316216;
  c += texture2D(tDiffuse, vUv + uDir * 3.230769).rgb * 0.070270;
  c += texture2D(tDiffuse, vUv - uDir * 3.230769).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}`;

const finalFrag = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tBloom;
uniform float uBloom;
uniform vec3 uTint;
uniform vec3 uLift;
uniform float uSaturation;
uniform float uContrast;
uniform float uVignette;
uniform float uExposure;
uniform float uWobble;
uniform float uTime;
uniform vec3 uFlash;
uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  if (uWobble > 0.0) {
    uv += uWobble * 0.006 * vec2(sin(uv.y * 18.0 + uTime * 1.7), cos(uv.x * 14.0 + uTime * 1.3));
  }
  vec3 c = texture2D(tDiffuse, uv).rgb;
  c += texture2D(tBloom, uv).rgb * uBloom;
  c *= uExposure;
  c += uFlash;
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  c = gl_FragColor.rgb;
  // The grade is done after tone mapping and in display (gamma) space, where the numbers mean what the eye
  // sees: contrast pivots on middle grey there, and shadows are not crushed.
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c = c * uTint + uLift * (1.0 - c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = (c - 0.5) * uContrast + 0.5;
  vec2 q = (vUv - 0.5) * vec2(mix(1.0, uAspect, 0.35), 1.0);
  float v = smoothstep(0.35, 1.05, length(q) * 1.25);
  c *= 1.0 - v * uVignette;
  c = pow(max(c, 0.0), vec3(2.2));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

/** One render target and a last pass: grade, vignette, bloom. Skipped entirely on low. */
export class Post {
  grade: Grade = defaultGrade();
  /** Added light, for lightning. Decays on its own. */
  flash = new THREE.Color(0, 0, 0);
  wobble = 0;

  private target: THREE.WebGLRenderTarget | null = null;
  private bloomA: THREE.WebGLRenderTarget | null = null;
  private bloomB: THREE.WebGLRenderTarget | null = null;
  private quad: THREE.Mesh;
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private bright: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;
  private final: THREE.ShaderMaterial;
  private w = 1;
  private h = 1;
  private samples = 0;

  constructor(private renderer: THREE.WebGLRenderer) {
    const base = { vertexShader: quadVert, depthTest: false, depthWrite: false };
    this.bright = new THREE.ShaderMaterial({ ...base, fragmentShader: brightFrag, uniforms: { tDiffuse: { value: null }, uThreshold: { value: 0.85 }, uTexel: { value: new THREE.Vector2() } }, toneMapped: false });
    this.blur = new THREE.ShaderMaterial({ ...base, fragmentShader: blurFrag, uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, toneMapped: false });
    this.final = new THREE.ShaderMaterial({
      ...base,
      fragmentShader: finalFrag,
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uBloom: { value: 0 },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uLift: { value: new THREE.Color(0, 0, 0) },
        uSaturation: { value: 1 },
        uContrast: { value: 1 },
        uVignette: { value: 0.3 },
        uExposure: { value: 1 },
        uWobble: { value: 0 },
        uTime: { value: 0 },
        uFlash: { value: new THREE.Color(0, 0, 0) },
        uAspect: { value: 1 },
      },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.final);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  resize(width: number, height: number, quality: Quality) {
    this.w = Math.max(2, Math.floor(width));
    this.h = Math.max(2, Math.floor(height));
    this.disposeTargets();
    if (!quality.post) return;
    this.samples = quality.samples;
    this.target = new THREE.WebGLRenderTarget(this.w, this.h, {
      type: THREE.HalfFloatType,
      samples: quality.samples,
      depthBuffer: true,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    if (quality.bloom) {
      const bw = Math.max(2, Math.floor(this.w / 4));
      const bh = Math.max(2, Math.floor(this.h / 4));
      const opts = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
      this.bloomA = new THREE.WebGLRenderTarget(bw, bh, opts);
      this.bloomB = new THREE.WebGLRenderTarget(bw, bh, opts);
    }
  }

  private disposeTargets() {
    this.target?.dispose();
    this.bloomA?.dispose();
    this.bloomB?.dispose();
    this.target = this.bloomA = this.bloomB = null;
  }

  private pass(material: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget | null) {
    this.quad.material = material;
    this.renderer.setRenderTarget(to);
    this.renderer.render(this.scene, this.cam);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, time: number) {
    const r = this.renderer;
    if (!this.target) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    r.setRenderTarget(this.target);
    r.render(scene, camera);

    const g = this.grade;
    const u = this.final.uniforms;
    if (this.bloomA && this.bloomB && g.bloom > 0.001) {
      this.bright.uniforms.tDiffuse.value = this.target.texture;
      this.bright.uniforms.uThreshold.value = g.threshold;
      (this.bright.uniforms.uTexel.value as THREE.Vector2).set(1 / this.w, 1 / this.h);
      this.pass(this.bright, this.bloomA);
      const bw = this.bloomA.width;
      const bh = this.bloomA.height;
      for (let i = 0; i < 2; i++) {
        const spread = 1 + i * 1.2;
        this.blur.uniforms.tDiffuse.value = this.bloomA.texture;
        (this.blur.uniforms.uDir.value as THREE.Vector2).set(spread / bw, 0);
        this.pass(this.blur, this.bloomB);
        this.blur.uniforms.tDiffuse.value = this.bloomB.texture;
        (this.blur.uniforms.uDir.value as THREE.Vector2).set(0, spread / bh);
        this.pass(this.blur, this.bloomA);
      }
      u.tBloom.value = this.bloomA.texture;
      u.uBloom.value = g.bloom;
    } else {
      u.tBloom.value = null;
      u.uBloom.value = 0;
    }
    u.tDiffuse.value = this.target.texture;
    (u.uTint.value as THREE.Color).copy(g.tint);
    (u.uLift.value as THREE.Color).copy(g.lift);
    u.uSaturation.value = g.saturation;
    u.uContrast.value = g.contrast;
    u.uVignette.value = g.vignette;
    u.uExposure.value = g.exposure;
    u.uWobble.value = this.wobble;
    u.uTime.value = time;
    (u.uFlash.value as THREE.Color).copy(this.flash);
    u.uAspect.value = this.w / this.h;
    this.pass(this.final, null);
  }

  dispose() {
    this.disposeTargets();
    this.bright.dispose();
    this.blur.dispose();
    this.final.dispose();
    this.quad.geometry.dispose();
  }
}
