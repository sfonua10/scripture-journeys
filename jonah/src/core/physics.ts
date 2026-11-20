import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export { RAPIER };

/** Collision groups: who is what. */
export const GROUP = {
  WORLD: 0x0001,
  PROP: 0x0002,
  PLAYER: 0x0004,
  NPC: 0x0008,
  /** Solid to props only (rails that stop cargo but not people, and the like). */
  PROP_ONLY: 0x0010,
  /** Solid to the player only (invisible walls that keep him on the level). */
  PLAYER_ONLY: 0x0020,
} as const;

/** Rapier packs membership in the high 16 bits and the filter in the low 16. */
export const groups = (member: number, filter: number) => ((member & 0xffff) << 16) | (filter & 0xffff);
export const WORLD_GROUPS = groups(GROUP.WORLD, 0xffff);
export const PROP_GROUPS = groups(GROUP.PROP, GROUP.WORLD | GROUP.PROP | GROUP.PLAYER | GROUP.NPC | GROUP.PROP_ONLY);
export const PLAYER_GROUPS = groups(GROUP.PLAYER, GROUP.WORLD | GROUP.PROP | GROUP.PLAYER_ONLY);
/** What a ray cast for "ground and walls" should see. */
export const SOLID_FILTER = groups(0xffff, GROUP.WORLD);
export const SOLID_AND_PROPS_FILTER = groups(0xffff, GROUP.WORLD | GROUP.PROP);

export type Surface = 'stone' | 'wood' | 'sand' | 'cloth' | 'water' | 'flesh' | 'plant';

export interface ColliderInfo {
  surface?: Surface;
  tag?: string;
  prop?: Prop;
  /** The player cannot grab the top edge of this. */
  noLedge?: boolean;
}

export type PropKind = 'crate' | 'barrel' | 'basket' | 'jar' | 'net' | 'sack' | 'plank' | 'pole' | 'bundle' | 'stone';

/** A thing that can be picked up, thrown, stacked and knocked over. */
export class Prop {
  readonly prev = new THREE.Vector3();
  readonly prevQ = new THREE.Quaternion();
  readonly pos = new THREE.Vector3();
  readonly quat = new THREE.Quaternion();
  held = false;
  /** Set when a chapter has taken the prop out of play (thrown overboard, delivered). */
  gone = false;
  /** Free for a chapter's own use. */
  data: Record<string, unknown> = {};
  /** Seconds since something last hit it hard (for sound). */
  quiet = 1;
  lastSpeed = 0;

  constructor(
    readonly kind: PropKind,
    readonly body: RAPIER.RigidBody,
    readonly collider: RAPIER.Collider,
    readonly mesh: THREE.Object3D,
    readonly size: THREE.Vector3,
    readonly surface: Surface,
  ) {
    const t = body.translation();
    this.pos.set(t.x, t.y, t.z);
    this.prev.copy(this.pos);
    const r = body.rotation();
    this.quat.set(r.x, r.y, r.z, r.w);
    this.prevQ.copy(this.quat);
  }

  get mass() {
    return this.body.mass();
  }

  /** Remembers where it was, before a physics step. */
  store() {
    this.prev.copy(this.pos);
    this.prevQ.copy(this.quat);
  }

  /** Reads where it is, after a physics step. */
  read() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.pos.set(t.x, t.y, t.z);
    this.quat.set(r.x, r.y, r.z, r.w);
  }

  /** Moves it at once, with no interpolation trail. */
  teleport(p: THREE.Vector3, q?: THREE.Quaternion) {
    this.body.setTranslation(p, true);
    if (q) this.body.setRotation(q, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.read();
    this.store();
  }
}

export interface RayHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  collider: RAPIER.Collider;
  info: ColliderInfo | undefined;
}

let ready: Promise<void> | null = null;
export function initPhysics(): Promise<void> {
  if (!ready) {
    // Rapier's loader passes its wasm the old way and the browser grumbles about it once; nothing is wrong.
    const warn = console.warn;
    console.warn = (...a: unknown[]) => {
      if (!String(a[0]).includes('deprecated parameters for the initialization function')) warn.apply(console, a);
    };
    ready = RAPIER.init().finally(() => {
      console.warn = warn;
    });
  }
  return ready;
}

const _ray = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 0 } };

/** The Rapier world of one chapter. */
export class Physics {
  world: RAPIER.World;
  readonly props: Prop[] = [];
  readonly info = new Map<number, ColliderInfo>();
  readonly gravity = new THREE.Vector3(0, -24, 0);
  private fixedBody: RAPIER.RigidBody;
  /** Called for hard knocks, so the level can make a sound: (prop, impact speed). */
  onKnock: (prop: Prop, speed: number) => void = () => {};

  constructor() {
    this.world = new RAPIER.World(this.gravity);
    this.world.timestep = 1 / 60;
    this.fixedBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  }

  setGravity(x: number, y: number, z: number) {
    this.gravity.set(x, y, z);
    this.world.gravity = { x, y, z };
  }

  step() {
    for (const p of this.props) if (!p.gone) p.store();
    this.world.step();
    for (const p of this.props) {
      if (p.gone) continue;
      p.read();
      if (p.held) continue;
      // A sudden loss of speed is a knock.
      const v = p.body.linvel();
      const speed = Math.hypot(v.x, v.y, v.z);
      p.quiet += 1 / 60;
      if (p.lastSpeed - speed > 2.2 && p.quiet > 0.12) {
        p.quiet = 0;
        this.onKnock(p, p.lastSpeed - speed);
      }
      p.lastSpeed = speed;
    }
  }

  /** Places prop meshes between the last two physics states. */
  interpolate(alpha: number) {
    for (const p of this.props) {
      if (p.gone || p.held) continue;
      p.mesh.position.lerpVectors(p.prev, p.pos, alpha);
      p.mesh.quaternion.slerpQuaternions(p.prevQ, p.quat, alpha);
    }
  }

  // ---- static world -------------------------------------------------------------------------------------------

  private finish(desc: RAPIER.ColliderDesc, info: ColliderInfo | undefined, collisionGroups: number, body?: RAPIER.RigidBody) {
    desc.setCollisionGroups(collisionGroups);
    desc.setFriction(0.9);
    const c = this.world.createCollider(desc, body ?? this.fixedBody);
    if (info) this.info.set(c.handle, info);
    return c;
  }

  box(center: THREE.Vector3Like, half: THREE.Vector3Like, quat?: THREE.QuaternionLike, info?: ColliderInfo, collisionGroups = WORLD_GROUPS, body?: RAPIER.RigidBody) {
    const d = RAPIER.ColliderDesc.cuboid(Math.max(0.01, half.x), Math.max(0.01, half.y), Math.max(0.01, half.z)).setTranslation(center.x, center.y, center.z);
    if (quat) d.setRotation(quat);
    return this.finish(d, info, collisionGroups, body);
  }

  cylinder(center: THREE.Vector3Like, halfHeight: number, radius: number, quat?: THREE.QuaternionLike, info?: ColliderInfo, collisionGroups = WORLD_GROUPS, body?: RAPIER.RigidBody) {
    const d = RAPIER.ColliderDesc.cylinder(halfHeight, radius).setTranslation(center.x, center.y, center.z);
    if (quat) d.setRotation(quat);
    return this.finish(d, info, collisionGroups, body);
  }

  trimesh(vertices: Float32Array, indices: Uint32Array, info?: ColliderInfo, collisionGroups = WORLD_GROUPS, body?: RAPIER.RigidBody) {
    const d = RAPIER.ColliderDesc.trimesh(vertices, indices);
    return this.finish(d, info, collisionGroups, body);
  }

  /** A grid of heights as ground. `heights` is (nx+1)*(nz+1), x slowest, as Rapier wants it. */
  heightfield(nx: number, nz: number, heights: Float32Array, size: THREE.Vector3Like, center: THREE.Vector3Like, info?: ColliderInfo) {
    const d = RAPIER.ColliderDesc.heightfield(nx, nz, heights, { x: size.x, y: size.y, z: size.z }).setTranslation(center.x, center.y, center.z);
    return this.finish(d, info, WORLD_GROUPS);
  }

  /** A body moved by code that carries what stands on it (a cart, a floating plank). */
  kinematic(position: THREE.Vector3Like): RAPIER.RigidBody {
    return this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(position.x, position.y, position.z));
  }

  removeCollider(c: RAPIER.Collider) {
    this.info.delete(c.handle);
    this.world.removeCollider(c, true);
  }

  // ---- props --------------------------------------------------------------------------------------------------

  addProp(kind: PropKind, mesh: THREE.Object3D, shape: 'box' | 'cylinder' | 'ball', size: THREE.Vector3, position: THREE.Vector3Like, opts: { density?: number; friction?: number; restitution?: number; surface?: Surface; yaw?: number; damping?: number } = {}): Prop {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), opts.yaw ?? 0);
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setRotation(q)
        .setLinearDamping(opts.damping ?? 0.15)
        .setAngularDamping(0.6)
        .setCcdEnabled(false),
    );
    let desc: RAPIER.ColliderDesc;
    if (shape === 'box') desc = RAPIER.ColliderDesc.roundCuboid(Math.max(0.02, size.x / 2 - 0.03), Math.max(0.02, size.y / 2 - 0.03), Math.max(0.02, size.z / 2 - 0.03), 0.03);
    else if (shape === 'cylinder') desc = RAPIER.ColliderDesc.roundCylinder(Math.max(0.02, size.y / 2 - 0.03), Math.max(0.02, size.x / 2 - 0.03), 0.03);
    else desc = RAPIER.ColliderDesc.ball(size.x / 2);
    desc
      .setDensity(opts.density ?? 0.5)
      .setFriction(opts.friction ?? 0.8)
      .setRestitution(opts.restitution ?? 0.05)
      .setCollisionGroups(PROP_GROUPS);
    const collider = this.world.createCollider(desc, body);
    const prop = new Prop(kind, body, collider, mesh, size.clone(), opts.surface ?? 'wood');
    this.info.set(collider.handle, { prop, surface: prop.surface });
    this.props.push(prop);
    mesh.position.copy(prop.pos);
    mesh.quaternion.copy(prop.quat);
    return prop;
  }

  removeProp(prop: Prop) {
    if (prop.gone) return;
    prop.gone = true;
    this.info.delete(prop.collider.handle);
    this.world.removeRigidBody(prop.body);
    const i = this.props.indexOf(prop);
    if (i >= 0) this.props.splice(i, 1);
  }

  // ---- queries ------------------------------------------------------------------------------------------------

  raycast(origin: THREE.Vector3Like, dir: THREE.Vector3Like, max: number, filter = SOLID_FILTER, exclude?: RAPIER.Collider): RayHit | null {
    _ray.origin.x = origin.x;
    _ray.origin.y = origin.y;
    _ray.origin.z = origin.z;
    _ray.dir.x = dir.x;
    _ray.dir.y = dir.y;
    _ray.dir.z = dir.z;
    const hit = this.world.castRayAndGetNormal(_ray as unknown as RAPIER.Ray, max, true, undefined, filter, exclude);
    if (!hit) return null;
    const t = hit.timeOfImpact;
    return {
      point: new THREE.Vector3(origin.x + dir.x * t, origin.y + dir.y * t, origin.z + dir.z * t),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
      distance: t,
      collider: hit.collider,
      info: this.info.get(hit.collider.handle),
    };
  }

  /** The height of the ground under a point, or null. */
  groundY(x: number, z: number, fromY = 60, max = 200): number | null {
    const hit = this.raycast({ x, y: fromY, z }, { x: 0, y: -1, z: 0 }, max);
    return hit ? hit.point.y : null;
  }

  dispose() {
    this.props.length = 0;
    this.info.clear();
    this.world.free();
  }
}
