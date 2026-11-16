import * as THREE from 'three';
import { Post } from './post';
import { QUALITY, autoQuality, type Quality, type QualityChoice, type QualityLevel } from './quality';

export const FIXED_DT = 1 / 60;

/** The renderer, the camera, the scene, and the loop that drives everything else. */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly post: Post;
  quality: Quality;
  choice: QualityChoice;

  /** Seconds of game time since the engine began (stops while paused). */
  time = 0;
  /** Wall-clock seconds, for menus and things that move while paused. */
  realTime = 0;
  timeScale = 1;
  paused = false;
  /** 0..1, how far between two physics steps this frame is drawn. */
  alpha = 0;

  onFixed: (dt: number) => void = () => {};
  onUpdate: (dt: number) => void = () => {};
  /** Called every frame even while paused, with real seconds. */
  onFrame: (dt: number) => void = () => {};
  onQuality: (q: Quality) => void = () => {};

  /** Frame times of the last few seconds, for the fps read-out and the watchdog. */
  fps = 60;
  frameMs = 16.7;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private slowSeconds = 0;
  private acc = 0;
  private last = 0;
  private baseFar = 400;

  constructor(readonly canvas: HTMLCanvasElement, choice: QualityChoice) {
    this.choice = choice;
    this.quality = QUALITY[choice === 'auto' ? autoQuality() : choice];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.15, this.baseFar);
    this.scene.add(this.camera);
    this.post = new Post(this.renderer);
    this.applyQuality();
    addEventListener('resize', () => this.resize());
    // Phones report the new size a little after the turn.
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    const patch = (window as unknown as { patch?: EventTarget & { quality?: string } }).patch;
    patch?.addEventListener?.('qualitychange', () => {
      if (this.choice === 'auto') this.setQuality('auto');
    });
  }

  setQuality(choice: QualityChoice) {
    this.choice = choice;
    const level: QualityLevel = choice === 'auto' ? autoQuality() : choice;
    if (level === this.quality.level) return;
    this.quality = QUALITY[level];
    this.applyQuality();
    this.onQuality(this.quality);
  }

  private applyQuality() {
    const q = this.quality;
    this.renderer.shadowMap.enabled = q.shadows;
    this.renderer.shadowMap.needsUpdate = true;
    // Materials were compiled for the old shadow setting.
    this.scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (mat) for (const one of Array.isArray(mat) ? mat : [mat]) one.needsUpdate = true;
    });
    this.resize();
  }

  /** The far plane and fog a chapter asks for, scaled by the draw-distance setting. */
  setView(far: number, fogNear?: number, fogFar?: number, fogColor?: THREE.ColorRepresentation) {
    this.baseFar = far;
    const k = this.quality.drawDistance;
    this.camera.far = far * (0.55 + 0.45 * k);
    this.camera.updateProjectionMatrix();
    if (fogNear !== undefined && fogFar !== undefined) {
      const c = new THREE.Color(fogColor ?? 0xffffff);
      this.scene.fog = new THREE.Fog(c, fogNear * k, fogFar * k);
    }
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth || innerWidth);
    const h = Math.max(1, this.canvas.clientHeight || innerHeight);
    const forced = Number(new URLSearchParams(location.search).get('dpr'));
    const ratio = forced > 0 ? forced : Math.min(devicePixelRatio || 1, this.quality.pixelRatio);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // A phone held upright sees a narrow slice: widen the vertical field so the world still reads.
    this.camera.fov = w < h ? 72 : 58;
    this.camera.updateProjectionMatrix();
    this.post.resize(w * ratio, h * ratio, this.quality);
  }

  start() {
    this.last = performance.now();
    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  private frame(now: number) {
    const real = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.realTime += real;
    this.fpsAcc += real;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.frameMs = (this.fpsAcc / this.fpsFrames) * 1000;
      this.watchdog(this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    this.onFrame(real);
    if (!this.paused) {
      const dt = Math.min(0.05, real) * this.timeScale;
      this.acc += dt;
      let steps = 0;
      const maxSteps = Math.max(4, Math.ceil(this.timeScale * 4));
      while (this.acc >= FIXED_DT && steps < maxSteps) {
        this.onFixed(FIXED_DT);
        this.acc -= FIXED_DT;
        this.time += FIXED_DT;
        steps++;
      }
      if (this.acc > FIXED_DT) this.acc = 0; // fell behind: drop the debt rather than spiral
      this.alpha = this.acc / FIXED_DT;
      this.onUpdate(dt);
    }
    // Lightning fades by itself.
    this.post.flash.multiplyScalar(Math.exp(-real * 9));
    if (!this.quality.post) this.renderer.toneMappingExposure = this.post.grade.exposure;
    else this.renderer.toneMappingExposure = 1;
    this.renderer.info.reset();
    this.post.render(this.scene, this.camera, this.realTime);
  }

  /** On "auto", a device that cannot hold its frame rate is stepped down a level. */
  private watchdog(span: number) {
    if (this.choice !== 'auto' || this.paused || document.hidden) return;
    if (this.fps < 40) this.slowSeconds += span;
    else this.slowSeconds = Math.max(0, this.slowSeconds - span * 0.5);
    if (this.slowSeconds > 4) {
      this.slowSeconds = 0;
      const next: QualityLevel | null = this.quality.level === 'high' ? 'medium' : this.quality.level === 'medium' ? 'low' : null;
      if (next) {
        this.quality = QUALITY[next];
        this.applyQuality();
        this.onQuality(this.quality);
      }
    }
  }
}
