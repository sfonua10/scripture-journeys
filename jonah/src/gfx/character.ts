// A robed low-poly figure, built and animated in code. Facing +Z; its left hand is on +X.
import * as THREE from 'three';
import { TAU, clamp, damp, lerp } from '../core/util';
import { solid } from './build';
import { dotTexture } from './textures';

export interface FigureLook {
  robe: THREE.ColorRepresentation;
  /** A second, darker tone for the lower robe's hem band. */
  hem?: THREE.ColorRepresentation;
  sash: THREE.ColorRepresentation;
  /** An over-mantle on the shoulders; omit for none. */
  mantle?: THREE.ColorRepresentation;
  cloth: THREE.ColorRepresentation;
  band?: THREE.ColorRepresentation;
  skin: THREE.ColorRepresentation;
  beard?: THREE.ColorRepresentation;
  /** 'cloth' a draped head-cloth, 'turban', 'cap', 'bare', 'crown'. */
  head?: 'cloth' | 'turban' | 'cap' | 'bare' | 'crown';
  height?: number;
  /** Stockier (>1) or slighter (<1). */
  build?: number;
  /** Bare arms (mariners). */
  bareArms?: boolean;
}

export type Pose =
  | 'idle'
  | 'run'
  | 'air'
  | 'hang'
  | 'mantle'
  | 'climb'
  | 'slide'
  | 'swim'
  | 'sit'
  | 'kneel'
  | 'bow'
  | 'lie'
  | 'pull'
  | 'row'
  | 'brace'
  | 'pray'
  | 'talk'
  | 'point'
  | 'work'
  | 'bail'
  | 'stagger'
  | 'throw'
  | 'cling'
  | 'cry'
  | 'faint'
  | 'cheer';

/** Every joint the animation drives. Angles in radians, heights in metres. */
interface Channels {
  y: number; // root height offset
  pitch: number; // whole body lean, + forward
  roll: number;
  upPitch: number; // upper body bend, + forward
  upYaw: number;
  headPitch: number; // + down
  headYaw: number;
  lSwing: number; // arm forward (+) / back (-); PI is straight up
  rSwing: number;
  lOut: number; // arm out to the side
  rOut: number;
  lElbow: number; // bend
  rElbow: number;
  lLeg: number; // leg forward (+)
  rLeg: number;
  lKnee: number;
  rKnee: number;
  skirt: number;
}

const zero = (): Channels => ({ y: 0, pitch: 0, roll: 0, upPitch: 0, upYaw: 0, headPitch: 0, headYaw: 0, lSwing: 0, rSwing: 0, lOut: 0.1, rOut: 0.1, lElbow: 0.15, rElbow: 0.15, lLeg: 0, rLeg: 0, lKnee: 0, rKnee: 0, skirt: 0 });
const KEYS = Object.keys(zero()) as (keyof Channels)[];

function lathe(points: [number, number][], seg: number): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );
}

let blobTex: THREE.Texture | null = null;

export class Figure {
  readonly root = new THREE.Group();
  /** Where the body is drawn inside root (squash and lean happen here). */
  readonly body = new THREE.Group();
  readonly blob: THREE.Mesh;
  pose: Pose = 'idle';
  /** 0..1, how fast it is going against its top speed (run), or how hard it works. */
  speed = 0;
  /** Vertical speed, for the airborne pose. */
  vy = 0;
  /** Carrying something overhead. */
  carrying = false;
  /** Where the head turns to look, relative yaw; eased. */
  lookYaw = 0;
  /** Advances with distance run, so feet match the ground. */
  phase = 0;
  /** A spring for landing squash: set to a negative number on landing. */
  squash = 0;
  private squashV = 0;
  private t = Math.random() * 10;
  private cur = zero();
  private target = zero();
  private hips: THREE.Group;
  private upper: THREE.Group;
  private skirt: THREE.Group;
  private head: THREE.Group;
  private drape: THREE.Object3D | null = null;
  private arms: { shoulder: THREE.Group; elbow: THREE.Group }[] = [];
  private legs: { hip: THREE.Group; knee: THREE.Group }[] = [];
  readonly height: number;
  private robeMeshes: THREE.Mesh[] = [];
  private look: FigureLook;

  constructor(look: FigureLook) {
    this.look = look;
    const H = (this.height = look.height ?? 1.72);
    const s = H / 1.72;
    const w = look.build ?? 1;
    const robe = solid(look.robe);
    const hem = solid(look.hem ?? look.robe);
    const skin = solid(look.skin);
    const sash = solid(look.sash);
    const cloth = solid(look.cloth);

    this.root.add(this.body);
    this.body.scale.setScalar(s);
    this.hips = new THREE.Group();
    this.hips.position.y = 0.95;
    this.body.add(this.hips);

    // ---- lower robe
    this.skirt = new THREE.Group();
    this.hips.add(this.skirt);
    const lower = new THREE.Mesh(
      lathe(
        [
          [0.33 * w, -0.74],
          [0.3 * w, -0.5],
          [0.25 * w, -0.2],
          [0.22 * w, 0.02],
        ],
        7,
      ),
      robe,
    );
    this.skirt.add(lower);
    this.robeMeshes.push(lower);
    const band = new THREE.Mesh(
      lathe(
        [
          [0.34 * w, -0.79],
          [0.335 * w, -0.7],
        ],
        7,
      ),
      hem,
    );
    this.skirt.add(band);

    // ---- legs (mostly hidden; the feet show)
    for (const side of [1, -1]) {
      const hip = new THREE.Group();
      hip.position.set(0.1 * side * w, -0.3, 0);
      this.hips.add(hip);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 5), skin);
      thigh.position.y = -0.15;
      hip.add(thigh);
      const knee = new THREE.Group();
      knee.position.y = -0.3;
      hip.add(knee);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 0.3, 5), skin);
      shin.position.y = -0.15;
      knee.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.25), solid(0x5a3b22));
      foot.position.set(0, -0.315, 0.05);
      knee.add(foot);
      this.legs.push({ hip, knee });
    }

    // ---- upper body
    this.upper = new THREE.Group();
    this.hips.add(this.upper);
    const chest = new THREE.Mesh(
      lathe(
        [
          [0.22 * w, 0.0],
          [0.255 * w, 0.24],
          [0.23 * w, 0.4],
          [0.12 * w, 0.49],
          [0.085, 0.53],
        ],
        7,
      ),
      robe,
    );
    this.upper.add(chest);
    this.robeMeshes.push(chest);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.232 * w, 0.236 * w, 0.085, 7), sash);
    belt.position.y = 0.03;
    this.upper.add(belt);
    // the sash's hanging end
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.03), sash);
    tail.position.set(0.1 * w, -0.14, 0.215 * w);
    tail.rotation.x = -0.08;
    this.upper.add(tail);
    if (look.mantle !== undefined) {
      const m = new THREE.Mesh(
        lathe(
          [
            [0.3 * w, 0.2],
            [0.275 * w, 0.36],
            [0.24 * w, 0.43],
            [0.13 * w, 0.505],
          ],
          7,
        ),
        solid(look.mantle),
      );
      this.upper.add(m);
      // a stripe down the mantle's front edges
      for (const side of [1, -1]) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.25, 0.02), sash);
        stripe.position.set(0.09 * side, 0.3, 0.262 * w);
        stripe.rotation.x = -0.28;
        this.upper.add(stripe);
      }
    }

    // ---- arms
    const sleeve = look.bareArms ? skin : robe;
    for (const side of [1, -1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.245 * side * w, 0.4, 0);
      this.upper.add(shoulder);
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.3, 5), sleeve);
      upperArm.position.y = -0.14;
      shoulder.add(upperArm);
      if (!look.bareArms) this.robeMeshes.push(upperArm);
      const elbow = new THREE.Group();
      elbow.position.y = -0.29;
      shoulder.add(elbow);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(look.bareArms ? 0.06 : 0.092, look.bareArms ? 0.052 : 0.1, 0.25, 5), sleeve);
      fore.position.y = -0.12;
      elbow.add(fore);
      if (!look.bareArms) this.robeMeshes.push(fore);
      const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.066, 0), skin);
      hand.position.y = -0.28;
      elbow.add(hand);
      this.arms.push({ shoulder, elbow });
    }

    // ---- head
    this.head = new THREE.Group();
    this.head.position.y = 0.53;
    this.upper.add(this.head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 5), skin);
    neck.position.y = 0.02;
    this.head.add(neck);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 1), skin);
    skull.scale.set(0.94, 1.06, 1);
    skull.position.y = 0.19;
    this.head.add(skull);
    const eyeMat = solid(0x2a1c14);
    for (const side of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.036, 0.02), eyeMat);
      eye.position.set(0.062 * side, 0.205, 0.158);
      this.head.add(eye);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), skin);
    nose.position.set(0, 0.17, 0.175);
    nose.rotation.x = Math.PI / 2 - 0.5;
    this.head.add(nose);
    if (look.beard !== undefined) {
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.24, 5), solid(look.beard));
      beard.position.set(0, 0.06, 0.09);
      beard.rotation.x = Math.PI + 0.32;
      beard.scale.set(1, 1, 0.75);
      this.head.add(beard);
      const stache = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.03), solid(look.beard));
      stache.position.set(0, 0.125, 0.165);
      this.head.add(stache);
    }
    const kind = look.head ?? 'cloth';
    if (kind === 'cloth') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.192, 7, 4, 0, TAU, 0, Math.PI * 0.56), cloth);
      cap.position.y = 0.2;
      cap.scale.set(0.98, 1.05, 1.04);
      this.head.add(cap);
      const drape = new THREE.Group();
      drape.position.set(0, 0.2, -0.09);
      const fall = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.42, 0.05), cloth);
      fall.position.set(0, -0.2, -0.07);
      fall.rotation.x = 0.16;
      drape.add(fall);
      for (const side of [1, -1]) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.2), cloth);
        flap.position.set(0.172 * side, -0.14, 0.04);
        flap.rotation.z = -0.1 * side;
        drape.add(flap);
      }
      this.head.add(drape);
      this.drape = drape;
      const bandMesh = new THREE.Mesh(new THREE.TorusGeometry(0.187, 0.022, 4, 8), solid(look.band ?? 0x3a2a20));
      bandMesh.position.y = 0.265;
      bandMesh.rotation.x = Math.PI / 2 + 0.1;
      this.head.add(bandMesh);
    } else if (kind === 'turban') {
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.075, 5, 8), cloth);
      wrap.position.y = 0.3;
      wrap.rotation.x = Math.PI / 2 + 0.12;
      this.head.add(wrap);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 3, 0, TAU, 0, Math.PI / 2), cloth);
      top.position.y = 0.31;
      this.head.add(top);
    } else if (kind === 'cap') {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.13, 7), cloth);
      cap.position.y = 0.34;
      this.head.add(cap);
    } else if (kind === 'crown') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.185, 7, 4, 0, TAU, 0, Math.PI * 0.6), solid(look.beard ?? 0x2a1c14));
      hair.position.y = 0.2;
      this.head.add(hair);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 8, 1, true), solid(0xe0b040, { emissive: 0x805010, emissiveIntensity: 0.6, doubleSide: true }));
      crown.position.y = 0.42;
      this.head.add(crown);
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.182, 7, 4, 0, TAU, 0, Math.PI * 0.55), solid(look.beard ?? 0x2a1c14));
      hair.position.y = 0.2;
      this.head.add(hair);
    }

    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = false;
      }
    });

    // ---- the soft dark spot that stands in for a shadow when shadows are off
    blobTex ??= dotTexture();
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.03;
    this.blob.renderOrder = 2;
    this.root.add(this.blob);
  }

  /** Changes the robe's colour (sackcloth). */
  setRobe(color: THREE.ColorRepresentation) {
    const m = solid(color);
    for (const mesh of this.robeMeshes) mesh.material = m;
  }

  /** World position of the point above the head where a carried thing sits. */
  carryPoint(out: THREE.Vector3): THREE.Vector3 {
    return this.root.localToWorld(out.set(0, this.height * 1.02 + 0.08, 0.12));
  }

  private aim(dt: number) {
    const c = this.target;
    const t = this.t;
    const sp = this.speed;
    Object.assign(c, zero());
    const breathe = Math.sin(t * 1.7) * 0.02;
    switch (this.pose) {
      case 'idle': {
        c.upPitch = breathe;
        c.headYaw = Math.sin(t * 0.37) * 0.25 + this.lookYaw;
        c.lOut = c.rOut = 0.12 + breathe;
        c.lElbow = c.rElbow = 0.2;
        c.lSwing = c.rSwing = 0.05;
        break;
      }
      case 'run': {
        const p = this.phase * TAU;
        const a = 0.25 + 0.75 * sp;
        c.lLeg = Math.sin(p) * 0.85 * a;
        c.rLeg = -Math.sin(p) * 0.85 * a;
        c.lKnee = Math.max(0, -Math.cos(p)) * 1.1 * a;
        c.rKnee = Math.max(0, Math.cos(p)) * 1.1 * a;
        c.lSwing = -Math.sin(p) * 0.75 * a;
        c.rSwing = Math.sin(p) * 0.75 * a;
        c.lElbow = c.rElbow = 0.25 + 0.75 * a;
        c.y = Math.abs(Math.sin(p)) * 0.055 * a - 0.02 * a;
        c.pitch = 0.07 + 0.13 * sp;
        c.upYaw = Math.sin(p) * 0.14 * a;
        c.roll = Math.sin(p) * 0.03 * a;
        c.skirt = -0.1 * sp + Math.sin(p * 2) * 0.03;
        c.headYaw = this.lookYaw;
        break;
      }
      case 'air': {
        const rise = clamp(this.vy / 8, -1, 1);
        c.lOut = c.rOut = 0.75 - rise * 0.35;
        c.lSwing = c.rSwing = 0.5 + rise * 0.5;
        c.lElbow = c.rElbow = 0.5;
        c.lLeg = 0.55 + rise * 0.25;
        c.lKnee = 0.9;
        c.rLeg = -0.3 - rise * 0.2;
        c.rKnee = 0.4;
        c.pitch = 0.1 + rise * 0.06;
        c.skirt = rise * 0.12;
        break;
      }
      case 'hang': {
        c.lSwing = c.rSwing = Math.PI - 0.1;
        c.lOut = c.rOut = 0.1;
        c.lElbow = c.rElbow = 0.1;
        c.lLeg = Math.sin(t * 2.1) * 0.1;
        c.rLeg = -Math.sin(t * 2.1) * 0.1;
        c.lKnee = c.rKnee = 0.25;
        c.headPitch = -0.3;
        break;
      }
      case 'mantle': {
        c.lSwing = c.rSwing = 1.5;
        c.lElbow = c.rElbow = 1.2;
        c.lLeg = 1.2;
        c.lKnee = 1.4;
        c.rLeg = 0.2;
        c.pitch = 0.45;
        break;
      }
      case 'climb': {
        const p = this.phase * TAU;
        c.lSwing = Math.PI - 0.5 + Math.sin(p) * 0.45;
        c.rSwing = Math.PI - 0.5 - Math.sin(p) * 0.45;
        c.lElbow = 0.5 - Math.sin(p) * 0.4;
        c.rElbow = 0.5 + Math.sin(p) * 0.4;
        c.lLeg = 0.6 - Math.sin(p) * 0.5;
        c.rLeg = 0.6 + Math.sin(p) * 0.5;
        c.lKnee = 0.9 - Math.sin(p) * 0.5;
        c.rKnee = 0.9 + Math.sin(p) * 0.5;
        c.headPitch = -0.35;
        break;
      }
      case 'slide': {
        c.pitch = -1.05;
        c.y = -0.5;
        c.lLeg = 1.25;
        c.rLeg = 0.75;
        c.rKnee = 0.9;
        c.lSwing = c.rSwing = -0.7;
        c.lOut = c.rOut = 0.5;
        c.headPitch = 0.5;
        c.upPitch = 0.3;
        break;
      }
      case 'swim': {
        const p = this.phase * TAU;
        const stroke = Math.sin(p);
        c.pitch = 1.2;
        c.y = -0.55;
        c.headPitch = -0.9;
        c.lSwing = c.rSwing = 2.3 + stroke * 0.7;
        c.lOut = c.rOut = 0.5 + Math.cos(p) * 0.55;
        c.lElbow = c.rElbow = 0.35 - stroke * 0.25;
        c.lLeg = Math.sin(p * 2) * 0.35;
        c.rLeg = -Math.sin(p * 2) * 0.35;
        c.lKnee = c.rKnee = 0.3;
        c.skirt = 0.1;
        break;
      }
      case 'sit': {
        c.y = -0.62;
        c.lLeg = c.rLeg = 1.45;
        c.lKnee = c.rKnee = 1.3;
        c.upPitch = 0.22 + breathe;
        c.lSwing = c.rSwing = 0.7;
        c.lElbow = c.rElbow = 0.7;
        c.headYaw = Math.sin(t * 0.3) * 0.2 + this.lookYaw;
        c.headPitch = 0.05;
        c.skirt = 0.5;
        break;
      }
      case 'kneel': {
        c.y = -0.5;
        c.lLeg = c.rLeg = 0.1;
        c.lKnee = c.rKnee = 2.0;
        c.upPitch = 0.25 + breathe;
        c.headPitch = 0.45;
        c.lSwing = c.rSwing = 0.5;
        c.lElbow = c.rElbow = 1.4;
        c.lOut = c.rOut = -0.15;
        break;
      }
      case 'bow': {
        c.y = -0.56;
        c.lLeg = c.rLeg = 0.15;
        c.lKnee = c.rKnee = 2.1;
        c.upPitch = 1.25;
        c.headPitch = 0.4;
        c.lSwing = c.rSwing = 2.2;
        c.lElbow = c.rElbow = 0.3;
        break;
      }
      case 'lie': {
        c.pitch = -Math.PI / 2;
        c.y = -0.78;
        c.lSwing = 0.2;
        c.rSwing = 0.5;
        c.rElbow = 1.4;
        c.lLeg = 0.1;
        c.rLeg = 0.35;
        c.rKnee = 0.6;
        c.headYaw = 0.5;
        c.upPitch = breathe * 2;
        break;
      }
      case 'faint': {
        c.pitch = Math.PI / 2 - 0.06;
        c.y = -0.74;
        c.lSwing = 2.6;
        c.rSwing = 0.3;
        c.lOut = 0.5;
        c.rOut = 0.3;
        c.headYaw = 0.9;
        c.lKnee = 0.3;
        break;
      }
      case 'pull': {
        const p = Math.sin(t * 5.5);
        c.pitch = -0.32 + p * 0.08;
        c.lSwing = c.rSwing = 1.25 - p * 0.25;
        c.lElbow = c.rElbow = 0.55 + p * 0.4;
        c.lLeg = 0.5;
        c.rLeg = -0.25;
        c.lKnee = 0.3;
        c.y = -0.08;
        break;
      }
      case 'row': {
        const p = Math.sin(this.phase * TAU);
        c.y = -0.62;
        c.lLeg = c.rLeg = 1.4;
        c.lKnee = c.rKnee = 1.1 - p * 0.3;
        c.upPitch = 0.35 + p * 0.45;
        c.lSwing = c.rSwing = 1.35 + p * 0.3;
        c.lElbow = c.rElbow = 0.7 - p * 0.6;
        c.skirt = 0.5;
        break;
      }
      case 'brace': {
        c.y = -0.3;
        c.lLeg = 0.5;
        c.rLeg = -0.5;
        c.lKnee = 0.9;
        c.rKnee = 0.9;
        c.upPitch = 0.5;
        c.lSwing = c.rSwing = 1.5;
        c.lElbow = c.rElbow = 0.8;
        c.headPitch = 0.3;
        break;
      }
      case 'cling': {
        c.y = -0.42;
        c.pitch = 0.5;
        c.lSwing = c.rSwing = 2.3 + Math.sin(t * 9) * 0.05;
        c.lElbow = c.rElbow = 0.3;
        c.lLeg = -0.4 + Math.sin(t * 6) * 0.3;
        c.rLeg = -0.3 - Math.sin(t * 6) * 0.3;
        c.lKnee = c.rKnee = 0.6;
        c.headPitch = -0.4;
        break;
      }
      case 'pray': {
        c.lSwing = c.rSwing = 2.25;
        c.lOut = c.rOut = 0.55;
        c.lElbow = c.rElbow = 0.6;
        c.headPitch = -0.35;
        c.upPitch = -0.08 + breathe;
        break;
      }
      case 'cry': {
        c.lSwing = c.rSwing = 2.0 + Math.sin(t * 6) * 0.08;
        c.lOut = c.rOut = 0.85;
        c.lElbow = c.rElbow = 0.35;
        c.headPitch = -0.25;
        c.upPitch = -0.12;
        c.lLeg = 0.2;
        c.rLeg = -0.15;
        break;
      }
      case 'cheer': {
        const p = Math.sin(t * 7);
        c.lSwing = c.rSwing = 2.6 + p * 0.2;
        c.lOut = c.rOut = 0.4;
        c.y = Math.max(0, p) * 0.08;
        c.headPitch = -0.2;
        break;
      }
      case 'talk': {
        c.rSwing = 0.8 + Math.sin(t * 3.1) * 0.25;
        c.rElbow = 1.1 + Math.sin(t * 4.3) * 0.3;
        c.rOut = 0.25;
        c.lSwing = 0.15;
        c.lElbow = 0.3;
        c.headPitch = Math.sin(t * 2.2) * 0.06;
        c.headYaw = this.lookYaw;
        c.upPitch = 0.05 + breathe;
        break;
      }
      case 'point': {
        c.rSwing = 1.5;
        c.rElbow = 0.05;
        c.rOut = 0.1;
        c.lElbow = 0.3;
        c.headYaw = this.lookYaw;
        c.upYaw = -0.2;
        break;
      }
      case 'work': {
        const p = Math.sin(t * 9);
        c.y = -0.34;
        c.lLeg = 0.6;
        c.rLeg = -0.4;
        c.lKnee = c.rKnee = 1.0;
        c.upPitch = 0.6;
        c.lSwing = 1.1 + p * 0.35;
        c.rSwing = 1.1 - p * 0.35;
        c.lElbow = 0.8 - p * 0.3;
        c.rElbow = 0.8 + p * 0.3;
        c.headPitch = 0.35;
        break;
      }
      case 'bail': {
        const p = (t * 1.6) % 1;
        const scoop = p < 0.5 ? p * 2 : 0;
        const toss = p >= 0.5 ? (p - 0.5) * 2 : 0;
        c.y = -0.25 * (1 - toss);
        c.upPitch = 0.9 * Math.sin(scoop * Math.PI) - 0.3 * Math.sin(toss * Math.PI);
        c.lSwing = c.rSwing = 0.9 + 1.7 * Math.sin(toss * Math.PI);
        c.lElbow = c.rElbow = 0.5;
        c.upYaw = 0.9 * Math.sin(toss * Math.PI);
        c.lLeg = 0.3;
        c.rLeg = -0.3;
        c.lKnee = c.rKnee = 0.5 * (1 - toss);
        break;
      }
      case 'stagger': {
        c.roll = Math.sin(t * 7) * 0.22;
        c.pitch = Math.sin(t * 5.3) * 0.15;
        c.lOut = 1.0 + Math.sin(t * 8) * 0.3;
        c.rOut = 1.0 - Math.sin(t * 8) * 0.3;
        c.lLeg = Math.sin(t * 7) * 0.4;
        c.rLeg = -Math.sin(t * 7) * 0.4;
        break;
      }
      case 'throw': {
        c.lSwing = c.rSwing = 1.7;
        c.lElbow = c.rElbow = 0.1;
        c.pitch = 0.25;
        c.lLeg = 0.5;
        c.rLeg = -0.4;
        break;
      }
    }
    if (this.carrying && (this.pose === 'idle' || this.pose === 'run' || this.pose === 'air')) {
      c.lSwing = c.rSwing = 2.75;
      c.lOut = c.rOut = 0.22;
      c.lElbow = c.rElbow = 0.45;
      c.pitch *= 0.5;
      c.upPitch = -0.06;
    }
    void dt;
  }

  update(dt: number) {
    this.t += dt;
    this.aim(dt);
    const quick = this.pose === 'run' || this.pose === 'climb' || this.pose === 'swim' || this.pose === 'row' ? 22 : 11;
    const cur = this.cur;
    const tg = this.target;
    for (const k of KEYS) cur[k] = damp(cur[k], tg[k], quick, dt);

    // landing squash, a small spring
    this.squashV += (-this.squash * 220 - this.squashV * 18) * dt;
    this.squash += this.squashV * dt;
    const sq = clamp(this.squash, -0.3, 0.3);
    const s = this.height / 1.72;
    this.body.scale.set(s * (1 - sq * 0.5), s * (1 + sq), s * (1 - sq * 0.5));

    this.body.position.y = cur.y * s;
    // lean about the hips rather than the feet, so a lying body lies where it stood
    this.hips.rotation.set(cur.pitch, 0, cur.roll);
    this.upper.rotation.set(cur.upPitch, cur.upYaw, 0);
    this.head.rotation.set(cur.headPitch, cur.headYaw, 0);
    this.skirt.rotation.x = cur.skirt;
    if (this.drape) this.drape.rotation.x = clamp(cur.pitch * 0.5 + this.speed * 0.25 + Math.sin(this.t * 3) * 0.03 * (1 + this.speed), -0.2, 0.9);
    const A = this.arms;
    A[0].shoulder.rotation.set(-cur.lSwing, 0, cur.lOut);
    A[1].shoulder.rotation.set(-cur.rSwing, 0, -cur.rOut);
    A[0].elbow.rotation.x = -cur.lElbow;
    A[1].elbow.rotation.x = -cur.rElbow;
    const L = this.legs;
    L[0].hip.rotation.x = -cur.lLeg;
    L[1].hip.rotation.x = -cur.rLeg;
    L[0].knee.rotation.x = cur.lKnee;
    L[1].knee.rotation.x = cur.rKnee;
  }

  /** Snaps to the target pose with no easing (after a cut). */
  snap() {
    this.aim(0);
    Object.assign(this.cur, this.target);
    this.update(0);
  }

  dispose() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    (this.blob.material as THREE.Material).dispose();
  }
}

/** A few stock looks. */
export const LOOKS = {
  jonah: { robe: 0xe8dcc0, hem: 0x8a5a3a, sash: 0x9a3a2a, mantle: 0x6a7f8f, cloth: 0xf2ead8, band: 0x3a2a20, skin: 0xc8946a, beard: 0x3a2a22, head: 'cloth' } as FigureLook,
  jonahSackcloth: { robe: 0x7a6a58, hem: 0x5a4a3a, sash: 0x4a3a2a, cloth: 0x8a7a66, band: 0x3a2a20, skin: 0xc8946a, beard: 0x3a2a22, head: 'cloth' } as FigureLook,
  shipmaster: { robe: 0x3f5f7a, hem: 0x2a3f52, sash: 0xd0a040, mantle: 0x7a2f2a, cloth: 0xd8c8a0, skin: 0xb07a50, beard: 0x8a8a8a, head: 'turban', build: 1.12, height: 1.8 } as FigureLook,
};

export function mariner(i: number): FigureLook {
  const robes = [0x8a6a4a, 0x5a7a6a, 0x9a8a6a, 0x6a5a7a, 0x7a8a9a, 0xa07a5a];
  const cloths = [0xc04a3a, 0xd8c8a0, 0x3a6a8a, 0xe0b050, 0x8a3a5a, 0x4a8a6a];
  const skins = [0xb07a50, 0x9a6a44, 0xc8946a, 0x8a5a3a, 0xbb8860, 0xa87048];
  const beards = [0x2a1c14, 0x4a3a2a, 0x1a1410, undefined, 0x6a5a4a, 0x2a1c14];
  return {
    robe: robes[i % robes.length],
    sash: cloths[(i + 2) % cloths.length],
    cloth: cloths[i % cloths.length],
    skin: skins[i % skins.length],
    beard: beards[i % beards.length],
    head: i % 3 === 0 ? 'cap' : i % 3 === 1 ? 'turban' : 'bare',
    bareArms: true,
    height: 1.66 + ((i * 37) % 10) * 0.014,
    build: 1 + ((i * 53) % 7) * 0.03,
  };
}

export { lerp };
