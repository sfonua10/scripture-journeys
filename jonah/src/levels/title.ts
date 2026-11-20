// The scene behind the title and the ending: the ship of Tarshish on an open sea before sunrise. Nobody is staged
// and nothing is said; it is a picture to open the book on.
import * as THREE from 'three';
import { Chapter } from '../game/chapter';
import { CALM_WAVES, Ocean, type OceanLook, type WaveSpec } from '../gfx/ocean';
import { Sky, makeLights } from '../gfx/sky';
import { Ship } from './ship';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const SUN = V(-0.95, 0.075, 0.31).normalize();
const SEA_LOOK: OceanLook = {
  deep: 0x0a1d30,
  shallow: 0x1f4a5c,
  glow: 0x4f9aa0,
  foam: 0xe6dccb,
  skyTop: new THREE.Color(0x26375e),
  skyHorizon: new THREE.Color(0xe9a878),
  sunDir: SUN,
  sunColor: 0xffc890,
  spec: 1.0,
  ambient: 0.62,
  foamAmount: 0.3,
};
// a long easy swell: more than the calm after the storm, far less than the tempest
const SWELL: WaveSpec[] = CALM_WAVES.map((w, i) => ({ ...w, amplitude: w.amplitude * (i < 2 ? 3 : 2.4) }));

export class Title extends Chapter {
  private sky!: Sky;
  private ocean!: Ocean;
  private ship!: Ship;
  private t = 0;
  private look = V(0, 2, 0);

  build() {
    const g = this.g;
    const q = g.quality;
    this.sky = new Sky({ top: 0x1a2748, horizon: 0xf0aa74, bottom: 0x8a6a66, sunDir: SUN, sunColor: 0xffd9a8, sunSize: 0.03, sunGlow: 1.1, cloudCover: 0.42, cloudLit: 0xf2b48a, cloudDark: 0x3a3a58, cloudSpeed: 1.6, stars: 0.35 });
    g.root.add(this.sky.mesh);
    this.ocean = new Ocean(q.oceanGrid, SEA_LOOK, SWELL, { low: q.level === 'low' });
    g.root.add(this.ocean.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: SUN.clone().setY(0.3), sunColor: 0xffc48e, sunIntensity: 3.0, skyColor: 0x7088b4, groundColor: 0x4a4038, hemiIntensity: 1.7, shadowSize: q.shadowSize, shadowRange: 22 });
    g.engine.setView(900, 60, 520, 0xb08a80);
    const grade = g.engine.post.grade;
    grade.tint.setRGB(1.03, 1.0, 0.97);
    grade.lift.setRGB(0.02, 0.022, 0.035);
    grade.saturation = 1.05;
    grade.contrast = 1.06;
    grade.vignette = 0.5;
    grade.bloom = 0.7;
    grade.threshold = 0.82;
    grade.exposure = 1.0;

    this.ship = new Ship(null, { lights: Math.min(2, q.lights) });
    this.ship.flog = 0.05;
    g.root.add(this.ship.group);
    this.ocean.time = 0;
    this.ocean.amp = 0.5;
    this.ship.settle(this.ocean);
    this.ship.lightFor(V(0, 3, 0), 10);
    this.frame(0);
  }

  start() {}

  /** The camera drifts slowly round the ship, low over the water, keeping her clear of the menu. */
  private frame(dt: number) {
    const g = this.g;
    const cam = g.engine.camera;
    this.t += dt;
    const tall = cam.aspect < 0.8;
    const a = 2.5 + Math.sin(this.t * 0.045) * 0.16;
    const d = tall ? 46 : 37;
    const h = 3.4 + Math.sin(this.t * 0.07) * 0.9;
    cam.position.set(Math.sin(a) * d, h, Math.cos(a) * d);
    const sea = this.ocean.height(cam.position.x, cam.position.z, this.ocean.time);
    cam.position.y = Math.max(cam.position.y, sea + 1.6);
    // on a wide screen the menu is on the left, so the ship sits right of centre; on a tall one she sits high
    const right = V(Math.cos(a), 0, -Math.sin(a));
    this.look.copy(this.ship.group.position).setY(tall ? -7.5 : 2.2).addScaledVector(right, tall ? 0 : -7.5);
    cam.fov = tall ? 58 : 44;
    cam.updateProjectionMatrix();
    cam.lookAt(this.look);
    g.lights?.follow(this.ship.group.position);
    this.sky.mesh.position.copy(cam.position);
  }

  override update(dt: number) {
    const g = this.g;
    const time = g.engine.time;
    this.ocean.time = time;
    let left = Math.min(dt, 0.25);
    while (left > 1e-5) {
      const step = Math.min(left, 1 / 60);
      this.ship.float(step, this.ocean, time);
      left -= step;
    }
    this.frame(dt);
    this.ocean.setShip(this.ship.group);
    this.ocean.update(time, g.engine.camera);
    this.ship.update(dt, 0.25);
    this.sky.update(time);
  }

  override dispose() {
    this.sky.dispose();
    this.ocean.dispose();
    this.ship.dispose();
  }
}
