// The player's body: run, jump (coyote time, buffering, variable height), air control, ledge grab and mantle,
// wall climbing, sliding, swimming, carrying and throwing, and riding ground that moves.
import * as THREE from 'three';
import type { Input } from '../core/input';
import { GROUP, PLAYER_GROUPS, PROP_GROUPS, Physics, Prop, RAPIER, SOLID_AND_PROPS_FILTER, SOLID_FILTER, groups, type Surface } from '../core/physics';
import { approach, clamp, clamp01, dampAngle, ease, lerp } from '../core/util';
import { Figure, type FigureLook, type Pose } from '../gfx/character';

export type PlayerState = 'ground' | 'air' | 'hang' | 'mantle' | 'climb' | 'slide' | 'swim' | 'locked';

/** A stretch of wall that can be climbed (vines, a rope net, rough stone). */
export interface ClimbZone {
  /** A point on the wall's face, at the middle of the zone's width. */
  origin: THREE.Vector3;
  /** Out of the wall, level. */
  normal: THREE.Vector3;
  halfWidth: number;
  yMin: number;
  yMax: number;
  /** Whether the top can be climbed onto. Default true. */
  top?: boolean;
}

/** Something to use with the Action button. */
export interface Interactable {
  /** Where it is, in the player's space. */
  pos: THREE.Vector3;
  radius: number;
  prompt: string;
  /** Seconds the button must be held; 0 or absent for a tap. */
  hold?: number;
  enabled?: () => boolean;
  onUse: () => void;
  /** Called while being held, with 0..1. */
  onProgress?: (t: number) => void;
  /** The pose the figure takes while holding. */
  pose?: Pose;
  /** Higher wins when several are in reach. */
  priority?: number;
  /** Filled by the controller. */
  progress?: number;
}

export interface Water {
  /** The surface height, or null for water with no surface (the deep). */
  surfaceY: number | null;
  /** The flow at a point, added to the swimmer's motion. */
  current?: (p: THREE.Vector3, out: THREE.Vector3) => THREE.Vector3;
  /** Extra constant sinking speed. */
  sink?: number;
}

export interface Focus {
  kind: 'prop' | 'use' | 'carry';
  prompt: string;
  /** 0..1 while a hold is in progress. */
  progress: number;
  pos: THREE.Vector3;
}

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();

const RADIUS = 0.3;
const HEIGHT = 1.7;
const SLIDE_HEIGHT = 0.86;

export class Player {
  readonly figure: Figure;
  /** Feet position, in the space of `parent`. */
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  state: PlayerState = 'air';
  grounded = false;
  carried: Prop | null = null;

  // ---- feel: every number here was tuned by hand
  runSpeed = 6.3;
  carrySpeed = 4.7;
  groundAccel = 62;
  groundDecel = 48;
  airAccel = 26;
  airDecel = 5;
  gravity = 27;
  fallMultiplier = 1.65;
  jumpSpeed = 9.7;
  coyoteTime = 0.12;
  bufferTime = 0.14;
  swimSpeed = 4.3;
  climbSpeed = 3.1;
  /** Multiplies run speed (heat, deep water, a held breath of wind). */
  speedScale = 1;

  // ---- what the chapter sets
  /** Radians: the camera's yaw, so the stick is read relative to the view. */
  camYaw = 0;
  /** A push added to every step's motion (wind, a tilting deck), metres per second. */
  readonly push = new THREE.Vector3();
  water: Water | null = null;
  climbZones: ClimbZone[] = [];
  interactables: Interactable[] = [];
  canSlide = true;
  canGrab = true;
  canCarry = true;
  /** Below this the player has fallen out of the level. */
  killY = -30;
  /** Decides what Action does with a carried prop; return true to take it over. */
  onCarryAction: ((prop: Prop) => boolean) | null = null;
  /** What the prompt says while carrying, when the chapter has its own use for the load; null for the usual. */
  carryPrompt: ((prop: Prop) => string | null) | null = null;
  /** Where the carried prop would land if set down now, for a chapter's guide. */
  canPickUp: (prop: Prop) => boolean = () => true;

  // ---- what the chapter hears
  onStep: (surface: Surface, speed: number) => void = () => {};
  onJump: () => void = () => {};
  onLand: (impact: number, surface: Surface) => void = () => {};
  onGrab: () => void = () => {};
  onMantle: () => void = () => {};
  onSlide: () => void = () => {};
  onStroke: () => void = () => {};
  onPick: (prop: Prop) => void = () => {};
  onThrow: (prop: Prop, power: number) => void = () => {};
  onSetDown: (prop: Prop) => void = () => {};
  /** Fell out of the level; the chapter decides the cost. The controller has already put him back. */
  onFall: () => void = () => {};

  /** What Action would do now, for the prompt. */
  focus: Focus | null = null;
  /** 0..1 while a throw is being wound up. */
  charge = 0;
  /** The surface under the feet. */
  surface: Surface = 'stone';
  /** Seconds since last on the ground. */
  airTime = 0;
  /** The last place he stood on firm ground. */
  readonly lastSafe = new THREE.Vector3();
  /** How many times he has fallen out of the level this chapter. */
  falls = 0;

  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private cc: RAPIER.KinematicCharacterController;
  private coyote = 0;
  private buffer = 0;
  private jumping = false;
  private stepDist = 0;
  private grabCooldown = 0;
  private safeTimer = 0;
  private slideTimer = 0;
  private slideAir = 0;
  private small = false;
  private readonly prevPos = new THREE.Vector3();
  private readonly ledge = { normal: new THREE.Vector3(), top: new THREE.Vector3() };
  private mantleT = 0;
  private mantleDur = 0.34;
  private readonly mantleFrom = new THREE.Vector3();
  private readonly mantleTo = new THREE.Vector3();
  private zone: ClimbZone | null = null;
  private pickT = 1;
  private readonly pickFrom = new THREE.Vector3();
  private holding: Interactable | null = null;
  private actionEaten = false;
  private lockedPose: Pose = 'idle';
  private wish = new THREE.Vector3();
  private wishMag = 0;
  private strokeT = 0;
  private platformVel = new THREE.Vector3();
  private landLock = 0;

  constructor(private physics: Physics, private input: Input, readonly parent: THREE.Object3D, look: FigureLook) {
    this.figure = new Figure(look);
    parent.add(this.figure.root);
    const world = physics.world;
    this.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    this.collider = world.createCollider(RAPIER.ColliderDesc.capsule(HEIGHT / 2 - RADIUS, RADIUS).setCollisionGroups(PLAYER_GROUPS).setFriction(0), this.body);
    physics.info.set(this.collider.handle, { surface: 'flesh', tag: 'player', noLedge: true });
    this.cc = world.createCharacterController(0.02);
    this.cc.setUp({ x: 0, y: 1, z: 0 });
    this.cc.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
    this.cc.setMinSlopeSlideAngle((44 * Math.PI) / 180);
    this.cc.enableAutostep(0.5, 0.18, false);
    this.cc.enableSnapToGround(0.32);
    this.cc.setApplyImpulsesToDynamicBodies(true);
    this.cc.setCharacterMass(55);
  }

  get speed2D() {
    return Math.hypot(this.vel.x, this.vel.z);
  }

  get facing(): THREE.Vector3 {
    return _d.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  /** The point at chest height, for cameras and reach. */
  chest(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.pos).addScaledVector(UP, this.small ? 0.5 : 1.05);
  }

  teleport(p: THREE.Vector3Like, yaw?: number) {
    this.pos.set(p.x, p.y, p.z);
    this.prevPos.copy(this.pos);
    this.vel.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = yaw;
    this.syncBody(true);
    this.lastSafe.copy(this.pos);
    this.figure.root.position.copy(this.pos);
    this.figure.root.rotation.y = this.yaw;
    if (this.state !== 'locked') this.state = 'air';
  }

  /** Hands the body to a scene: no input, no physics; the chapter poses and moves it. */
  lock(pose: Pose = 'idle') {
    this.state = 'locked';
    this.lockedPose = pose;
    this.vel.set(0, 0, 0);
    this.focus = null;
    this.charge = 0;
  }

  setLockedPose(pose: Pose) {
    this.lockedPose = pose;
  }

  unlock() {
    if (this.state === 'locked') {
      this.state = 'air';
      this.syncBody(true);
      this.actionEaten = true;
    }
  }

  get locked() {
    return this.state === 'locked';
  }

  private setSmall(small: boolean) {
    if (small === this.small) return;
    this.small = small;
    const h = small ? SLIDE_HEIGHT : HEIGHT;
    this.collider.setShape(new RAPIER.Capsule(Math.max(0.01, h / 2 - RADIUS), RADIUS));
    this.syncBody(true);
  }

  private syncBody(now = false) {
    const h = this.small ? SLIDE_HEIGHT : HEIGHT;
    const c = { x: this.pos.x, y: this.pos.y + h / 2, z: this.pos.z };
    if (now) this.body.setTranslation(c, true);
    this.body.setNextKinematicTranslation(c);
  }

  /** Whether there is room to stand up from a slide. */
  private headroom(): boolean {
    _o.copy(this.pos).addScaledVector(UP, 0.5);
    return !this.physics.raycast(_o, UP, HEIGHT - 0.45, SOLID_AND_PROPS_FILTER, this.collider);
  }

  // ---- the step ------------------------------------------------------------------------------------------------

  fixedUpdate(dt: number) {
    this.prevPos.copy(this.pos);
    const inp = this.input;
    if (this.state === 'locked') {
      this.syncBody();
      this.updateCarry(dt);
      return;
    }

    // the stick, in the player's space
    if (inp.bot?.world) this.wish.set(inp.moveX, 0, inp.moveY);
    else {
      const s = Math.sin(this.camYaw);
      const c = Math.cos(this.camYaw);
      this.wish.set(c * inp.moveX - s * inp.moveY, 0, -s * inp.moveX - c * inp.moveY);
    }
    this.wishMag = Math.min(1, this.wish.length());
    if (this.wishMag > 0.001) this.wish.normalize();

    if (inp.jump.pressed) this.buffer = this.bufferTime;
    else this.buffer -= dt;
    this.grabCooldown -= dt;
    this.landLock -= dt;

    if (this.water && this.state !== 'swim' && this.state !== 'mantle' && this.state !== 'hang') {
      const s = this.water.surfaceY;
      if (s === null || this.pos.y + 0.9 < s) this.enterSwim();
    }

    switch (this.state) {
      case 'ground':
      case 'air':
        this.moveNormal(dt);
        break;
      case 'slide':
        this.moveSlide(dt);
        break;
      case 'hang':
        this.moveHang(dt);
        break;
      case 'mantle':
        this.moveMantle(dt);
        break;
      case 'climb':
        this.moveClimb(dt);
        break;
      case 'swim':
        this.moveSwim(dt);
        break;
    }

    this.updateAction(dt);
    this.updateCarry(dt);
    this.syncBody();

    if (this.pos.y < this.killY) this.respawn();
  }

  private respawn() {
    this.falls++;
    if (this.carried) this.release(this.carried, false);
    this.setSmall(false);
    this.state = 'air';
    this.teleport(_v.copy(this.lastSafe).addScaledVector(UP, 0.3));
    this.onFall();
  }

  /** Moves the capsule by `disp`, sliding along what it meets. Returns what actually moved. */
  private sweep(disp: THREE.Vector3): THREE.Vector3 {
    this.cc.computeColliderMovement(this.collider, disp, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, PLAYER_GROUPS);
    const m = this.cc.computedMovement();
    return _w.set(m.x, m.y, m.z);
  }

  private readGround() {
    // what is underfoot: its surface, and whether it moves
    this.platformVel.set(0, 0, 0);
    _o.copy(this.pos).addScaledVector(UP, 0.3);
    const hit = this.physics.raycast(_o, DOWN, 0.75, SOLID_AND_PROPS_FILTER, this.collider);
    if (!hit) return;
    this.surface = hit.info?.surface ?? 'stone';
    const body = hit.collider.parent();
    if (body && body.isKinematic()) {
      const lv = body.linvel();
      const av = body.angvel();
      const t = body.translation();
      const rx = hit.point.x - t.x;
      const ry = hit.point.y - t.y;
      const rz = hit.point.z - t.z;
      this.platformVel.set(lv.x + av.y * rz - av.z * ry, lv.y + av.z * rx - av.x * rz, lv.z + av.x * ry - av.y * rx);
    }
    if (!hit.info?.prop && this.grounded) {
      this.safeTimer -= 1 / 60;
      if (this.safeTimer <= 0 && !body?.isKinematic()) {
        this.safeTimer = 0.4;
        this.lastSafe.copy(this.pos);
      }
    }
  }

  private moveNormal(dt: number) {
    const inp = this.input;
    const carrying = !!this.carried;
    const max = (carrying ? this.carrySpeed : this.runSpeed) * this.speedScale * (this.charge > 0 ? 0.55 : 1);
    const tx = this.wish.x * this.wishMag * max;
    const tz = this.wish.z * this.wishMag * max;
    const has = this.wishMag > 0.05;
    const accel = this.grounded ? (has ? this.groundAccel : this.groundDecel) : has ? this.airAccel : this.airDecel;
    const dx = tx - this.vel.x;
    const dz = tz - this.vel.z;
    const dl = Math.hypot(dx, dz);
    if (dl > 0) {
      const k = Math.min(1, (accel * dt) / dl);
      this.vel.x += dx * k;
      this.vel.z += dz * k;
    }
    if (has) this.yaw = dampAngle(this.yaw, Math.atan2(this.wish.x, this.wish.z), this.grounded ? 16 : 9, dt);

    // jump
    if (this.grounded) this.coyote = this.coyoteTime;
    else this.coyote -= dt;
    if (this.buffer > 0 && this.coyote > 0 && this.landLock <= 0) {
      this.vel.y = this.jumpSpeed * (carrying ? 0.9 : 1);
      this.buffer = 0;
      this.coyote = 0;
      this.grounded = false;
      this.jumping = true;
      this.state = 'air';
      this.figure.squash = 0.16;
      this.onJump();
    }
    // gravity: lighter while rising with the button held, heavier on the way down
    let g = this.gravity;
    if (this.vel.y < 0 || !inp.jump.down || !this.jumping) g *= this.fallMultiplier;
    if (!this.grounded) this.vel.y = Math.max(-34, this.vel.y - g * dt);
    else if (this.vel.y < 0) this.vel.y = 0;

    const wasGrounded = this.grounded;
    const vyBefore = this.vel.y;
    _v.set(this.vel.x + this.push.x + this.platformVel.x, 0, this.vel.z + this.push.z + this.platformVel.z).multiplyScalar(dt);
    if (wasGrounded && this.vel.y <= 0) {
      // On the ground: a whisker of downward motion keeps contact; the controller's own snap holds slopes.
      // (Pressing down any harder is turned by a slope into sliding back down it.)
      _v.y = -0.012 + Math.min(0, this.platformVel.y + this.push.y) * dt;
    } else _v.y = (this.vel.y + this.push.y) * dt;
    const want = _o.copy(_v);
    const moved = this.sweep(_v);
    this.pos.add(moved);
    if (wasGrounded && this.platformVel.y > 0) this.pos.y += this.platformVel.y * dt;
    this.grounded = this.cc.computedGrounded() && this.vel.y <= 0.01;

    // What a wall took away is lost for good, so he does not run on the spot or sling off its end.
    const wantH = Math.hypot(want.x, want.z);
    const movedH = Math.hypot(moved.x, moved.z);
    if (wantH > 1e-4 && movedH < wantH * 0.35) {
      this.vel.x = moved.x / dt - this.push.x - this.platformVel.x;
      this.vel.z = moved.z / dt - this.push.z - this.platformVel.z;
    }
    // a ceiling
    if (this.vel.y > 0 && moved.y < want.y * 0.4) this.vel.y = 0;

    if (this.grounded) {
      if (!wasGrounded) {
        const impact = -vyBefore;
        this.figure.squash = -clamp(impact / 40, 0.08, 0.3);
        this.onLand(impact, this.surface);
        this.jumping = false;
        if (impact > 20) this.landLock = 0.12;
      }
      this.state = 'ground';
      this.airTime = 0;
      this.readGround();
      // footsteps by distance
      const sp = this.speed2D;
      this.stepDist += sp * dt;
      const stride = 1.15;
      if (this.stepDist > stride) {
        this.stepDist -= stride;
        this.onStep(this.surface, sp / this.runSpeed);
      }
      this.figure.phase += (sp * dt) / (stride * 2);
      if (inp.slide.pressed && this.canSlide && !carrying && sp > 3.2) this.enterSlide();
    } else {
      this.state = 'air';
      this.airTime += dt;
      this.platformVel.set(0, 0, 0);
      if (this.canGrab && !carrying && this.grabCooldown <= 0) {
        if (this.vel.y < 3.5 && this.tryLedge()) return;
      }
    }
    if (!carrying && this.grabCooldown <= 0 && this.tryClimbZone()) return;
  }

  // ---- ledges --------------------------------------------------------------------------------------------------

  private tryLedge(): boolean {
    // a wall ahead at chest height
    const dir = this.wishMag > 0.2 ? _d.copy(this.wish) : this.facing;
    _o.copy(this.pos).addScaledVector(UP, 1.15);
    const wall = this.physics.raycast(_o, dir, 0.62, SOLID_FILTER, this.collider);
    if (!wall || Math.abs(wall.normal.y) > 0.3 || wall.info?.noLedge) return false;
    const nx = wall.normal.x;
    const nz = wall.normal.z;
    const nl = Math.hypot(nx, nz) || 1;
    // the top of it, a little way in
    _o.set(wall.point.x - (nx / nl) * 0.16, this.pos.y + 2.3, wall.point.z - (nz / nl) * 0.16);
    const top = this.physics.raycast(_o, DOWN, 1.5, SOLID_FILTER, this.collider);
    if (!top || top.normal.y < 0.8 || top.distance < 0.02 || top.info?.noLedge) return false;
    const rise = top.point.y - this.pos.y;
    if (rise < 0.85 || rise > 2.25) return false;
    // room to stand on it
    _o.copy(top.point).addScaledVector(UP, 0.12);
    if (this.physics.raycast(_o, UP, 1.5, SOLID_FILTER, this.collider)) return false;
    this.ledge.normal.set(nx / nl, 0, nz / nl);
    this.ledge.top.copy(top.point);
    this.state = 'hang';
    this.vel.set(0, 0, 0);
    this.pos.set(wall.point.x + (nx / nl) * (RADIUS + 0.04), top.point.y - 1.52, wall.point.z + (nz / nl) * (RADIUS + 0.04));
    this.yaw = Math.atan2(-nx, -nz);
    this.jumping = false;
    this.onGrab();
    return true;
  }

  private moveHang(_dt: number) {
    const n = this.ledge.normal;
    const toward = -(this.wish.x * n.x + this.wish.z * n.z) * this.wishMag;
    if (this.input.jump.pressed || toward > 0.45) {
      this.startMantle(_v.set(this.ledge.top.x - n.x * 0.42, this.ledge.top.y + 0.02, this.ledge.top.z - n.z * 0.42));
      this.buffer = 0;
    } else if (toward < -0.5 || this.input.slide.pressed) {
      this.state = 'air';
      this.grabCooldown = 0.35;
      this.vel.set(n.x * 1.5, -1, n.z * 1.5);
    }
  }

  private startMantle(to: THREE.Vector3, dur = 0.34) {
    this.mantleFrom.copy(this.pos);
    this.mantleTo.copy(to);
    this.mantleT = 0;
    this.mantleDur = dur;
    this.state = 'mantle';
    this.onMantle();
  }

  private moveMantle(dt: number) {
    this.mantleT += dt / this.mantleDur;
    const t = clamp01(this.mantleT);
    // up first, then over
    const up = ease.outCubic(clamp01(t / 0.7));
    const over = ease.inOutQuad(clamp01((t - 0.35) / 0.65));
    this.pos.set(lerp(this.mantleFrom.x, this.mantleTo.x, over), lerp(this.mantleFrom.y, this.mantleTo.y, up), lerp(this.mantleFrom.z, this.mantleTo.z, over));
    if (t >= 1) {
      this.state = 'ground';
      this.grounded = true;
      this.vel.set(Math.sin(this.yaw) * 2.5, 0, Math.cos(this.yaw) * 2.5);
      this.figure.squash = -0.1;
    }
  }

  // ---- climbing ------------------------------------------------------------------------------------------------

  private tryClimbZone(): boolean {
    if (!this.climbZones.length || this.wishMag < 0.3) return false;
    for (const z of this.climbZones) {
      const toward = -(this.wish.x * z.normal.x + this.wish.z * z.normal.z);
      if (toward < 0.35) continue;
      _v.copy(this.pos).sub(z.origin);
      const d = _v.x * z.normal.x + _v.z * z.normal.z;
      if (d < -0.1 || d > 0.8) continue;
      const side = _v.x * -z.normal.z + _v.z * z.normal.x;
      if (Math.abs(side) > z.halfWidth + 0.15) continue;
      if (this.pos.y + 1.2 < z.yMin || this.pos.y + 0.5 > z.yMax) continue;
      this.zone = z;
      this.state = 'climb';
      this.vel.set(0, 0, 0);
      this.jumping = false;
      this.yaw = Math.atan2(-z.normal.x, -z.normal.z);
      this.onGrab();
      return true;
    }
    return false;
  }

  private moveClimb(dt: number) {
    const z = this.zone!;
    const inp = this.input;
    // forward on the stick is up the wall whatever the camera is doing
    let upIn = inp.moveY;
    let sideIn = inp.moveX;
    if (inp.bot?.world) {
      upIn = -(this.wish.x * z.normal.x + this.wish.z * z.normal.z) * this.wishMag;
      sideIn = 0;
    }
    // tangent: to the climber's right as he faces the wall
    const tx = z.normal.z;
    const tz = -z.normal.x;
    _v.copy(this.pos).sub(z.origin);
    let side = _v.x * tx + _v.z * tz;
    side = clamp(side + sideIn * this.climbSpeed * 0.7 * dt, -z.halfWidth, z.halfWidth);
    let y = this.pos.y + upIn * this.climbSpeed * dt;
    this.figure.phase += (Math.abs(upIn) + Math.abs(sideIn) * 0.7) * dt * 1.6;
    const face = RADIUS + 0.05;
    this.pos.set(z.origin.x + tx * side + z.normal.x * face, y, z.origin.z + tz * side + z.normal.z * face);
    if (inp.jump.pressed) {
      // spring off the wall
      this.state = 'air';
      this.vel.set(z.normal.x * 5.2, 8.6, z.normal.z * 5.2);
      this.yaw = Math.atan2(z.normal.x, z.normal.z);
      this.jumping = true;
      this.grabCooldown = 0.3;
      this.buffer = 0;
      this.onJump();
      return;
    }
    if (y + 1.45 > z.yMax && upIn > 0.2) {
      if (z.top !== false) {
        this.startMantle(_v.set(this.pos.x - z.normal.x * 0.75, z.yMax + 0.02, this.pos.z - z.normal.z * 0.75), 0.4);
      } else this.pos.y = z.yMax - 1.45;
      return;
    }
    if (y < z.yMin - 0.05 || inp.slide.pressed) {
      this.state = 'air';
      this.grabCooldown = 0.3;
      return;
    }
    // feet found the ground: step off
    if (upIn < -0.2) {
      _o.copy(this.pos).addScaledVector(UP, 0.3);
      if (this.physics.raycast(_o, DOWN, 0.4, SOLID_FILTER, this.collider)) {
        this.state = 'ground';
        this.grabCooldown = 0.3;
      }
    }
  }

  // ---- sliding -------------------------------------------------------------------------------------------------

  private enterSlide() {
    this.state = 'slide';
    this.slideTimer = 0.72;
    this.slideAir = 0;
    const sp = Math.max(this.speed2D, 8.6);
    const d = this.speed2D > 0.1 ? _d.set(this.vel.x, 0, this.vel.z).normalize() : this.facing;
    this.vel.x = d.x * sp;
    this.vel.z = d.z * sp;
    this.yaw = Math.atan2(d.x, d.z);
    this.setSmall(true);
    this.onSlide();
  }

  private moveSlide(dt: number) {
    this.slideTimer -= dt;
    const sp = this.speed2D;
    const next = approach(sp, 4.6, 6.5 * dt);
    if (sp > 0.01) {
      // a little steering
      const d = _d.set(this.vel.x / sp, 0, this.vel.z / sp);
      d.addScaledVector(this.wish, this.wishMag * 1.6 * dt).normalize();
      this.vel.x = d.x * next;
      this.vel.z = d.z * next;
      this.yaw = Math.atan2(d.x, d.z);
    }
    this.vel.y = Math.max(-34, this.vel.y - this.gravity * this.fallMultiplier * dt);
    _v.set(this.vel.x + this.push.x, this.vel.y, this.vel.z + this.push.z).multiplyScalar(dt);
    if (this.grounded) _v.y = -0.02;
    const moved = this.sweep(_v);
    this.pos.add(moved);
    this.grounded = this.cc.computedGrounded();
    if (this.grounded) {
      this.vel.y = -1;
      this.slideAir = 0;
    } else this.slideAir += dt;
    this.stepDist += sp * dt;
    const room = this.headroom();
    // (the body takes a step to settle into its smaller shape, so a moment in the air is not a fall)
    const wantsUp = this.slideTimer <= 0 || this.buffer > 0 || this.slideAir > 0.12 || sp < 1;
    if (wantsUp && room) {
      this.setSmall(false);
      this.state = this.grounded ? 'ground' : 'air';
    } else if (wantsUp && !room) {
      // still under something: keep low and keep moving
      const d = this.facing;
      const keep = Math.max(next, 4.2);
      this.vel.x = d.x * keep;
      this.vel.z = d.z * keep;
    }
  }

  // ---- swimming ------------------------------------------------------------------------------------------------

  private enterSwim() {
    this.state = 'swim';
    this.setSmall(false);
    this.jumping = false;
    this.vel.multiplyScalar(0.5);
  }

  private moveSwim(dt: number) {
    const w = this.water;
    if (!w) {
      this.state = 'air';
      return;
    }
    const inp = this.input;
    this.strokeT -= dt;
    const tx = this.wish.x * this.wishMag * this.swimSpeed * this.speedScale;
    const tz = this.wish.z * this.wishMag * this.swimSpeed * this.speedScale;
    const k = 1 - Math.exp(-3.2 * dt);
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;
    // sink slowly; a stroke lifts
    const sink = -(1.3 + (w.sink ?? 0));
    let ty = sink;
    if (inp.jump.down) ty = 2.2;
    if (inp.slide.down) ty = -3.6;
    this.vel.y += (ty - this.vel.y) * (1 - Math.exp(-2.4 * dt));
    if (inp.jump.pressed && this.strokeT <= 0) {
      this.vel.y = Math.max(this.vel.y, 0) + 4.4;
      this.vel.x += this.wish.x * this.wishMag * 1.6;
      this.vel.z += this.wish.z * this.wishMag * 1.6;
      this.strokeT = 0.28;
      this.figure.phase = 0.2;
      this.onStroke();
    }
    if (this.wishMag > 0.1) this.yaw = dampAngle(this.yaw, Math.atan2(this.wish.x, this.wish.z), 7, dt);
    _v.copy(this.vel).add(this.push);
    if (w.current) _v.add(w.current(this.pos, _w.set(0, 0, 0)));
    _v.multiplyScalar(dt);
    const moved = this.sweep(_v);
    this.pos.add(moved);
    this.figure.phase += dt * (0.5 + Math.hypot(this.vel.x, this.vel.z) * 0.22);
    if (w.surfaceY !== null) {
      const head = this.pos.y + 1.25;
      if (head > w.surfaceY) {
        // at the surface: jump leaps out, otherwise bob
        if (inp.jump.pressed || this.buffer > 0) {
          this.state = 'air';
          this.vel.y = this.jumpSpeed * 0.92;
          this.jumping = true;
          this.buffer = 0;
          this.grabCooldown = 0;
          this.onJump();
          return;
        }
        this.pos.y = w.surfaceY - 1.25;
        this.vel.y = Math.min(this.vel.y, 0);
      }
      // walked up out of it
      if (this.cc.computedGrounded() && this.pos.y + 0.9 >= w.surfaceY) {
        this.state = 'ground';
        this.grounded = true;
      }
    }
    if (this.canGrab && w.surfaceY !== null && this.pos.y + 1.6 > w.surfaceY && this.wishMag > 0.3 && this.tryLedge()) return;
  }

  // ---- Action: use, pick up, set down, throw --------------------------------------------------------------------

  private findProp(): Prop | null {
    let best: Prop | null = null;
    let bestScore = Infinity;
    const f = this.facing;
    const fx = f.x;
    const fz = f.z;
    for (const p of this.physics.props) {
      if (p.gone || p.held || p.data.fixed || !this.canPickUp(p)) continue;
      const dx = p.pos.x - this.pos.x;
      const dz = p.pos.z - this.pos.z;
      const dy = p.pos.y - (this.pos.y + 0.8);
      const d = Math.hypot(dx, dz);
      const reach = 1.25 + Math.max(p.size.x, p.size.z) * 0.5;
      if (d > reach || Math.abs(dy) > 1.5) continue;
      const dot = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      if (dot < -0.2) continue;
      const score = d - dot * 0.6;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private findUse(): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = Infinity;
    for (const it of this.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = Math.hypot(it.pos.x - this.pos.x, (it.pos.y - this.pos.y - 0.8) * 0.5, it.pos.z - this.pos.z);
      if (d > it.radius) continue;
      const score = d - (it.priority ?? 0) * 10;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    return best;
  }

  private updateAction(dt: number) {
    const a = this.input.action;
    if (this.actionEaten) {
      if (!a.down) this.actionEaten = false;
      this.focus = null;
      return;
    }
    const busy = this.state === 'hang' || this.state === 'mantle' || this.state === 'climb' || this.state === 'slide';
    if (this.carried) {
      const prop = this.carried;
      this.focus = { kind: 'carry', prompt: this.carryPrompt?.(prop) ?? (this.charge > 0 ? 'Release to throw' : 'Set down · hold to throw'), progress: this.charge, pos: prop.pos };
      if (this.onCarryAction && a.pressed && this.onCarryAction(prop)) {
        this.actionEaten = true;
        this.charge = 0;
        return;
      }
      if (a.down && a.held > 0.22) this.charge = clamp01((a.held - 0.22) / 0.6);
      if (a.released) {
        if (this.charge > 0) this.throwProp(prop, this.charge);
        else this.setDown(prop);
        this.charge = 0;
      }
      return;
    }
    this.charge = 0;
    if (busy) {
      this.focus = null;
      this.holding = null;
      return;
    }
    const use = this.findUse();
    const prop = this.canCarry && this.state !== 'swim' ? this.findProp() : null;
    // a held use in progress keeps its claim
    if (this.holding && (!a.down || this.holding !== use)) {
      this.holding.progress = 0;
      this.holding.onProgress?.(0);
      this.holding = null;
    }
    if (use && (use.priority ?? 0) >= 0) {
      this.focus = { kind: 'use', prompt: use.prompt, progress: use.progress ?? 0, pos: use.pos };
      const need = use.hold ?? 0;
      if (need <= 0) {
        if (a.pressed) {
          use.onUse();
          this.actionEaten = true;
        }
      } else if (a.down) {
        this.holding = use;
        use.progress = Math.min(1, (use.progress ?? 0) + dt / need);
        use.onProgress?.(use.progress);
        // face the work
        this.yaw = dampAngle(this.yaw, Math.atan2(use.pos.x - this.pos.x, use.pos.z - this.pos.z), 10, dt);
        if (use.progress >= 1) {
          use.progress = 0;
          this.holding = null;
          use.onUse();
          this.actionEaten = true;
        }
      }
      return;
    }
    if (prop) {
      this.focus = { kind: 'prop', prompt: 'Take up', progress: 0, pos: prop.pos };
      if (a.pressed) {
        this.pickUp(prop);
        this.actionEaten = true;
      }
      return;
    }
    this.focus = null;
  }

  /** The pose asked for by a held interaction, if any. */
  private get workPose(): Pose | null {
    return this.holding ? (this.holding.pose ?? 'work') : null;
  }

  pickUp(prop: Prop) {
    if (this.carried) return;
    this.carried = prop;
    prop.held = true;
    prop.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    prop.collider.setCollisionGroups(groups(GROUP.PROP, 0));
    this.pickT = 0;
    this.pickFrom.copy(prop.mesh.position);
    this.onPick(prop);
  }

  /** Lets go of the carried prop where it is, as a free body again. */
  release(prop: Prop, keepVelocity = true) {
    prop.held = false;
    prop.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    prop.collider.setCollisionGroups(PROP_GROUPS);
    prop.body.setTranslation(prop.mesh.position, true);
    prop.body.setRotation(prop.mesh.quaternion, true);
    prop.body.setLinvel(keepVelocity ? { x: this.vel.x, y: this.vel.y, z: this.vel.z } : { x: 0, y: 0, z: 0 }, true);
    prop.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    prop.read();
    prop.store();
    if (this.carried === prop) this.carried = null;
  }

  /** Where a set-down prop would rest: in front, on whatever is there. */
  setDownPoint(prop: Prop, out: THREE.Vector3): THREE.Vector3 {
    const f = this.facing;
    const reach = RADIUS + 0.3 + Math.max(prop.size.x, prop.size.z) * 0.5;
    out.set(this.pos.x + f.x * reach, 0, this.pos.z + f.z * reach);
    _o.set(out.x, this.pos.y + 2.4, out.z);
    const hit = this.physics.raycast(_o, DOWN, 4.5, SOLID_AND_PROPS_FILTER, this.collider);
    out.y = (hit ? hit.point.y : this.pos.y) + prop.size.y / 2 + 0.03;
    return out;
  }

  private setDown(prop: Prop) {
    this.setDownPoint(prop, _v);
    prop.mesh.position.copy(_v);
    // square to the way he faces, so stacks are tidy
    const snapped = Math.round(this.yaw / (Math.PI / 2)) * (Math.PI / 2);
    const near = Math.abs(this.yaw - snapped) < 0.3 ? snapped : this.yaw;
    prop.mesh.quaternion.setFromAxisAngle(UP, near);
    this.release(prop, false);
    this.onSetDown(prop);
  }

  private throwProp(prop: Prop, power: number) {
    const f = this.facing;
    const fx = f.x;
    const fz = f.z;
    this.release(prop, false);
    const sp = 6.5 + power * 6.5;
    prop.body.setLinvel({ x: fx * sp + this.vel.x * 0.5, y: 4.2 + power * 2.6, z: fz * sp + this.vel.z * 0.5 }, true);
    prop.body.setAngvel({ x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3, z: (Math.random() - 0.5) * 3 }, true);
    this.onThrow(prop, power);
    this.throwT = 0.25;
  }

  private throwT = 0;

  private updateCarry(dt: number) {
    const prop = this.carried;
    if (!prop) return;
    this.pickT = Math.min(1, this.pickT + dt / 0.2);
    prop.body.setNextKinematicTranslation(prop.mesh.position);
    prop.body.setNextKinematicRotation(prop.mesh.quaternion);
    prop.pos.copy(prop.mesh.position);
  }

  // ---- drawing -------------------------------------------------------------------------------------------------

  /** Once a frame: places and animates the figure between physics steps. */
  update(dt: number, alpha: number) {
    const fig = this.figure;
    const root = fig.root;
    root.position.lerpVectors(this.prevPos, this.pos, alpha);
    root.rotation.y = this.yaw;
    this.throwT -= dt;
    let pose: Pose;
    switch (this.state) {
      case 'ground':
        pose = this.speed2D > 0.4 ? 'run' : 'idle';
        break;
      case 'air':
        pose = this.airTime > 0.06 || this.vel.y > 1 ? 'air' : this.speed2D > 0.4 ? 'run' : 'idle';
        break;
      case 'hang':
        pose = 'hang';
        break;
      case 'mantle':
        pose = 'mantle';
        break;
      case 'climb':
        pose = 'climb';
        break;
      case 'slide':
        pose = 'slide';
        break;
      case 'swim':
        pose = 'swim';
        break;
      default:
        pose = this.lockedPose;
    }
    if (this.state === 'ground' || this.state === 'air') {
      const work = this.workPose;
      if (work) pose = work;
      else if (this.throwT > 0 || this.charge > 0.05) pose = this.charge > 0.05 ? fig.pose : 'throw';
    }
    fig.pose = pose;
    fig.speed = clamp01(this.speed2D / this.runSpeed);
    fig.vy = this.vel.y;
    fig.carrying = !!this.carried;
    fig.update(dt);

    const prop = this.carried;
    if (prop) {
      fig.carryPoint(_v);
      this.parent.worldToLocal(_v);
      _v.y += prop.size.y / 2 - 0.05;
      // wind up: draw it back before a throw
      if (this.charge > 0) {
        _v.x -= Math.sin(this.yaw) * 0.25 * this.charge;
        _v.z -= Math.cos(this.yaw) * 0.25 * this.charge;
        _v.y -= 0.08 * this.charge;
      }
      const t = ease.outCubic(this.pickT);
      if (t < 1) prop.mesh.position.lerpVectors(this.pickFrom, _v, t);
      else prop.mesh.position.copy(_v);
      _q.setFromAxisAngle(UP, this.yaw);
      prop.mesh.quaternion.slerp(_q, 1 - Math.exp(-14 * dt));
    }
  }

  dispose() {
    this.parent.remove(this.figure.root);
    this.figure.dispose();
  }
}
