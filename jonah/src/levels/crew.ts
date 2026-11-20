// The people aboard: figures that walk the deck by waypoints (no physics) and hold poses.
import * as THREE from 'three';
import { dampAngle } from '../core/util';
import { Figure, type FigureLook, type Pose } from '../gfx/character';
import { HATCH, HOLD_Y, walkY } from './ship';

const _v = new THREE.Vector3();

export class Sailor {
  readonly fig: Figure;
  /** Feet, in the ship's space. */
  readonly pos = new THREE.Vector3();
  yaw = 0;
  /** The pose held when standing still. */
  pose: Pose = 'idle';
  speed = 3.1;
  /** Taken out of the walking logic (being swept, hauled, carried by a script). */
  scripted = false;
  /** In the sea. */
  overboard = false;
  /** Where he works when nothing else is asked. */
  readonly home = new THREE.Vector3();
  homeYaw = 0;
  homePose: Pose = 'work';
  private path: THREE.Vector3[] = [];
  private then: (() => void) | null = null;
  private wantYaw: number | null = null;

  constructor(readonly name: string, look: FigureLook, parent: THREE.Object3D) {
    this.fig = new Figure(look);
    this.fig.blob.userData.isBlob = true;
    parent.add(this.fig.root);
  }

  place(x: number, y: number, z: number, yaw = 0, pose: Pose = 'idle') {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.pose = pose;
    this.path.length = 0;
    this.then = null;
    this.wantYaw = null;
    this.fig.root.position.copy(this.pos);
    this.fig.root.rotation.y = yaw;
    this.fig.pose = pose;
    this.fig.snap();
  }

  get walking() {
    return this.path.length > 0;
  }

  /** Walks across the open deck to a place, keeping clear of the hatch, then takes a pose. */
  goTo(x: number, z: number, pose: Pose = 'idle', yaw: number | null = null, then: (() => void) | null = null) {
    this.path.length = 0;
    const from = this.pos;
    const crossesMid = (from.z < HATCH.z0 - 0.4 && z > HATCH.z0 - 0.4) || (from.z > HATCH.z1 + 0.4 && z < HATCH.z1 + 0.4) || (from.z > HATCH.z0 - 0.6 && from.z < HATCH.z1 + 0.6) || (z > HATCH.z0 - 0.6 && z < HATCH.z1 + 0.6) || (Math.min(from.z, z) < -2.2 && Math.max(from.z, z) > -0.6);
    if (crossesMid && Math.abs(z - from.z) > 0.8) {
      const side = Math.abs(x) > 0.5 ? Math.sign(x) : Math.abs(from.x) > 0.5 ? Math.sign(from.x) : 1;
      const lane = side * 1.75;
      this.path.push(new THREE.Vector3(lane, walkY(from.z), from.z), new THREE.Vector3(lane, walkY(z), z));
    }
    this.path.push(new THREE.Vector3(x, walkY(z), z));
    this.pose = pose;
    this.wantYaw = yaw;
    this.then = then;
  }

  /** Walks a given line of points exactly (the stair to the hold, say). */
  follow(points: THREE.Vector3[], pose: Pose = 'idle', yaw: number | null = null, then: (() => void) | null = null) {
    this.path = points.map((p) => p.clone());
    this.pose = pose;
    this.wantYaw = yaw;
    this.then = then;
  }

  goHome() {
    this.goTo(this.home.x, this.home.z, this.homePose, this.homeYaw);
  }

  stop(pose: Pose) {
    this.path.length = 0;
    this.then = null;
    this.pose = pose;
  }

  update(dt: number) {
    const f = this.fig;
    if (!this.scripted) {
      if (this.path.length) {
        const to = this.path[0];
        _v.subVectors(to, this.pos);
        const d = _v.length();
        const step = this.speed * dt;
        if (d <= step) {
          this.pos.copy(to);
          this.path.shift();
          if (!this.path.length) {
            if (this.wantYaw !== null) this.yaw = this.wantYaw;
            const then = this.then;
            this.then = null;
            then?.();
          }
        } else {
          this.pos.addScaledVector(_v, step / d);
          this.yaw = dampAngle(this.yaw, Math.atan2(_v.x, _v.z), 12, dt);
        }
        f.pose = 'run';
        f.speed = 0.55;
        f.phase += (step / 1.9) * 0.5;
      } else {
        f.pose = this.pose;
        if (this.wantYaw !== null) this.yaw = dampAngle(this.yaw, this.wantYaw, 8, dt);
      }
    }
    f.root.position.copy(this.pos);
    f.root.rotation.y = this.yaw;
    f.update(dt);
  }

  dispose() {
    this.fig.root.parent?.remove(this.fig.root);
    this.fig.dispose();
  }
}

/** The stair from the hold to the deck, as a walk: bottom to top. */
export const STAIR_UP = [new THREE.Vector3(0, HOLD_Y, 0.9), new THREE.Vector3(0, 0, HATCH.z1 + 0.1), new THREE.Vector3(0, 0, HATCH.z1 + 0.9)];
