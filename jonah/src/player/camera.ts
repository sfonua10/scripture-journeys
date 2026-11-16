// Third-person camera: follows on a spring, swings round behind the way you run, keeps walls out of the way,
// shakes, and can be handed a staged shot.
import * as THREE from 'three';
import type { Input } from '../core/input';
import { Physics, SOLID_FILTER } from '../core/physics';
import { angleDiff, clamp, damp, dampAngle, ease, noise1 } from '../core/util';
import type { Player } from './controller';

export interface CameraHint {
  yaw?: number;
  pitch?: number;
  dist?: number;
  /** How firmly the camera is drawn to the hint (1 is a normal pull). */
  strength?: number;
}

export interface Shot {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov?: number;
  /** Positions are in the frame's space (a ship's deck) rather than the world's. */
  local?: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _up = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class CameraRig {
  yaw = 0;
  pitch = 0.34;
  dist = 7.6;
  minPitch = -0.35;
  maxPitch = 1.25;
  /** How high above the feet the camera looks. */
  height = 1.45;
  /** Swing round behind the player when they run and the view is left alone. */
  auto = true;
  /** A chapter's preferred view for where the player is, or null. */
  hint: ((p: THREE.Vector3) => CameraHint | null) | null = null;
  /** The moving frame the player lives in (a ship), or null for the world. */
  frame: THREE.Object3D | null = null;
  /** How much of the frame's tilt the camera takes on (0 a level horizon, 1 bolted to the deck). */
  frameTilt = 0.3;
  shakeEnabled = true;
  /** Extra field of view, eased back to 0 (speed, a blow). */
  fovKick = 0;
  readonly target = new THREE.Vector3();
  /** The camera's place in the world after everything, for sound and effects. */
  readonly worldPos = new THREE.Vector3();

  private curDist = 7.6;
  private manual = 10;
  private trauma = 0;
  private t = Math.random() * 100;
  private shot: Shot | null = null;
  private lastShot: Shot | null = null;
  private shotW = 0;
  private shotBlend = 1;
  private baseFov = 58;
  private first = true;

  constructor(private camera: THREE.PerspectiveCamera, private physics: () => Physics | null) {}

  shake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Cuts or blends to a staged shot; null returns to following. */
  setShot(shot: Shot | null, blend = 1.2) {
    if (shot) this.lastShot = shot;
    this.shot = shot;
    this.shotBlend = Math.max(0.001, blend);
    if (blend <= 0.001) this.shotW = shot ? 1 : 0;
  }

  /** How far the camera actually sits from the player now (walls push it in). */
  get distance() {
    return this.curDist;
  }

  get inShot() {
    return !!this.shot;
  }

  /** Puts the camera behind the player at once (a chapter start, a respawn). */
  snap(player: Player, yaw?: number) {
    if (yaw !== undefined) this.yaw = yaw;
    player.chest(this.target);
    this.target.y = player.pos.y + this.height;
    this.curDist = this.dist;
    this.first = true;
  }

  update(dt: number, player: Player, input: Input) {
    this.t += dt;
    this.baseFov = this.camera.aspect < 1 ? 72 : 58;

    // ---- the view the player or the chapter asks for
    if (Math.abs(input.lookX) + Math.abs(input.lookY) > 1e-5) {
      this.yaw -= input.lookX;
      this.pitch = clamp(this.pitch + input.lookY, this.minPitch, this.maxPitch);
      this.manual = 0;
    } else this.manual += dt;

    const hint = this.hint ? this.hint(player.pos) : null;
    if (hint && this.manual > 1.4) {
      const s = hint.strength ?? 1;
      if (hint.yaw !== undefined) this.yaw = dampAngle(this.yaw, hint.yaw, 2.2 * s, dt);
      if (hint.pitch !== undefined) this.pitch = damp(this.pitch, hint.pitch, 2 * s, dt);
      if (hint.dist !== undefined) this.dist = damp(this.dist, hint.dist, 2 * s, dt);
    } else if (this.auto && this.manual > 0.9 && player.state !== 'hang' && player.state !== 'climb') {
      const sp = player.speed2D;
      if (sp > 1) {
        const behind = player.yaw + Math.PI;
        const d = angleDiff(this.yaw, behind);
        // running toward the camera should not whip it round
        if (Math.abs(d) < 2.5) this.yaw += d * (1 - Math.exp(-1.25 * dt)) * Math.min(1, sp / 5);
      }
      this.pitch = damp(this.pitch, clamp(this.pitch, 0.18, 0.62), 1.5, dt);
    }
    player.camYaw = this.yaw;

    // ---- the point looked at, on a spring
    const want = _a.copy(player.figure.root.position);
    want.y += this.height * (player.state === 'slide' ? 0.6 : 1);
    if (this.first) {
      this.target.copy(want);
      this.first = false;
    }
    this.target.x = damp(this.target.x, want.x, 14, dt);
    this.target.z = damp(this.target.z, want.z, 14, dt);
    // softer on the vertical, so a jump moves the figure and not the world
    this.target.y = damp(this.target.y, want.y, player.grounded || player.state === 'swim' || player.state === 'climb' ? 9 : 4.5, dt);

    // ---- where the camera sits
    const cp = Math.cos(this.pitch);
    const dir = _b.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    let allowed = this.dist;
    const phys = this.physics();
    if (phys) {
      const hit = phys.raycast(this.target, dir, this.dist + 0.3, SOLID_FILTER);
      if (hit) allowed = Math.max(0.9, hit.distance - 0.3);
    }
    this.curDist = allowed < this.curDist ? damp(this.curDist, allowed, 24, dt) : damp(this.curDist, allowed, 3.2, dt);
    const pos = _c.copy(this.target).addScaledVector(dir, this.curDist);
    const look = _d.copy(this.target);
    _up.copy(UP);

    // ---- into the world, if the player lives on something that moves
    if (this.frame) {
      this.frame.updateMatrixWorld();
      this.frame.localToWorld(pos);
      this.frame.localToWorld(look);
      _q.setFromRotationMatrix(this.frame.matrixWorld);
      _up.set(0, 1, 0).applyQuaternion(_q).lerp(UP, 1 - this.frameTilt).normalize();
    }

    // ---- a staged shot, blended in and out
    const goal = this.shot ? 1 : 0;
    if (this.shotW !== goal) {
      const step = dt / this.shotBlend;
      this.shotW = goal > this.shotW ? Math.min(1, this.shotW + step) : Math.max(0, this.shotW - step);
    }
    let fov = this.baseFov;
    const shot = this.shot ?? this.lastShot;
    if (shot && this.shotW > 0) {
      const w = ease.inOutCubic(this.shotW);
      const sp = _a.copy(shot.pos);
      const sl = _b.copy(shot.look);
      if (shot.local && this.frame) {
        this.frame.localToWorld(sp);
        this.frame.localToWorld(sl);
      }
      pos.lerp(sp, w);
      look.lerp(sl, w);
      // a staged shot is framed for a wide screen: on a tall one the lens opens so the picture still holds its people
      const aspect = this.camera.aspect;
      const open = aspect < 1.25 ? Math.min(2.2, 1.25 / aspect) : 1;
      const want = shot.fov ?? this.baseFov;
      const wide = open > 1 ? Math.min(84, (Math.atan(Math.tan((want * Math.PI) / 360) * open) * 360) / Math.PI) : want;
      fov += (wide - this.baseFov) * w;
      _up.lerp(UP, w * 0.5).normalize();
    }

    this.camera.position.copy(pos);
    this.camera.up.copy(_up);
    this.camera.lookAt(look);

    // ---- shake: trauma squared, so small knocks stay small
    this.trauma = Math.max(0, this.trauma - dt * 1.5);
    if (this.shakeEnabled && this.trauma > 0.001) {
      const k = this.trauma * this.trauma;
      const f = this.t * 34;
      this.camera.rotation.x += noise1(f) * 0.03 * k;
      this.camera.rotation.y += noise1(f + 31.7) * 0.03 * k;
      this.camera.rotation.z += noise1(f + 77.1) * 0.045 * k;
      this.camera.position.x += noise1(f + 11.3) * 0.16 * k;
      this.camera.position.y += noise1(f + 53.9) * 0.16 * k;
    }
    this.fovKick = damp(this.fovKick, 0, 4, dt);
    const nextFov = fov + this.fovKick;
    if (Math.abs(this.camera.fov - nextFov) > 0.01) {
      this.camera.fov = nextFov;
      this.camera.updateProjectionMatrix();
    }
    this.worldPos.copy(this.camera.position);
  }
}
