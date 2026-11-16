// The people of Nineveh: several hundred simple robed shapes drawn as three instanced meshes (robe, head, headgear),
// each one a soul that can hear the word, pass it to those beside it, and turn: sackcloth gray, down on its knees.
import * as THREE from 'three';
import { Rng, TAU, clamp01, damp, dampAngle, ease, lerp } from '../core/util';

export const SACK = [0x7c7264, 0x6f6658, 0x857a6a, 0x655d50];
const ASH = 0x8d8880;

export interface Soul {
  /** Where it stands (feet). */
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** The walled space it is in: the word passes only within a zone, or between zones whose gate is open. */
  zone: number;
  district: number;
  /** 0 has not heard, 1 has heard (turning to listen), 2 has turned. */
  state: 0 | 1 | 2;
  /** Seconds until a heard soul passes the word on and turns. */
  wait: number;
  /** 0..1, how far into sackcloth and onto its knees. */
  turned: number;
  /** How it kneels: 0 bowed low, 1 kneeling upright, 2 bent. */
  style: number;
  scale: number;
  robe: THREE.Color;
  gear: THREE.Color;
  sack: THREE.Color;
  /** Idle sway. */
  phase: number;
  /** Stepping aside from the player. */
  ox: number;
  oz: number;
  /** A startle when the word reaches it. */
  hop: number;
  wantYaw: number;
  near: number[];
  /** A short beat to and fro, for those who are walking somewhere. */
  walk: { dx: number; dz: number; len: number; speed: number; t: number } | null;
  /** A reason it may not hear yet (asleep, away): unused souls are skipped. */
  deaf: boolean;
}

export interface CrowdLook {
  robes: number[];
  gears: number[];
}

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _c = new THREE.Color();
const SKINS = [0xb07a50, 0x9a6a44, 0xc8946a, 0x8a5a3a, 0xbb8860, 0xa87048];

function tint(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.getAttribute('position').count;
  const c = new THREE.Color(color);
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  for (const g of parts) {
    pos.push(...(g.getAttribute('position').array as Float32Array));
    col.push(...(g.getAttribute('color').array as Float32Array));
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeVertexNormals();
  return out;
}

function robeGeometry(): THREE.BufferGeometry {
  const skirt = new THREE.CylinderGeometry(0.2, 0.33, 0.95, 6, 1, false);
  skirt.translate(0, 0.475, 0);
  const chest = new THREE.CylinderGeometry(0.22, 0.2, 0.42, 6, 1, false);
  chest.translate(0, 1.14, 0);
  const shoulders = new THREE.BoxGeometry(0.56, 0.14, 0.26);
  shoulders.translate(0, 1.3, 0);
  const armL = new THREE.BoxGeometry(0.12, 0.56, 0.14);
  armL.rotateZ(0.14);
  armL.translate(0.31, 1.02, 0.02);
  const armR = new THREE.BoxGeometry(0.12, 0.56, 0.14);
  armR.rotateZ(-0.14);
  armR.translate(-0.31, 1.02, 0.02);
  // a darker band at the waist, so the shape reads as a person and not a skittle
  const sash = new THREE.CylinderGeometry(0.225, 0.225, 0.09, 6, 1, true);
  sash.translate(0, 0.94, 0);
  return merge([tint(skirt, 0xffffff), tint(chest, 0xf4f4f4), tint(shoulders, 0xffffff), tint(armL, 0xe9e9e9), tint(armR, 0xe9e9e9), tint(sash, 0x8a8a8a)]);
}

function headGeometry(): THREE.BufferGeometry {
  const head = new THREE.IcosahedronGeometry(0.15, 0);
  head.translate(0, 0.02, 0);
  const neck = new THREE.CylinderGeometry(0.06, 0.07, 0.1, 5);
  neck.translate(0, -0.14, 0);
  const beard = new THREE.BoxGeometry(0.17, 0.13, 0.08);
  beard.translate(0, -0.09, 0.11);
  return merge([tint(head, 0xffffff), tint(neck, 0xeeeeee), tint(beard, 0x3a2c24)]);
}

function gearGeometry(): THREE.BufferGeometry {
  // a wound head-cloth: a low drum with a fall of cloth behind
  const drum = new THREE.CylinderGeometry(0.15, 0.17, 0.12, 6);
  drum.translate(0, 0.12, 0);
  const fall = new THREE.BoxGeometry(0.26, 0.26, 0.06);
  fall.translate(0, -0.03, -0.14);
  return merge([tint(drum, 0xffffff), tint(fall, 0xe6e6e6)]);
}

export class Crowd {
  readonly souls: Soul[] = [];
  robes!: THREE.InstancedMesh;
  heads!: THREE.InstancedMesh;
  gear!: THREE.InstancedMesh;
  /** Whether the word may pass between two zones (a gate stands open). */
  linked: (a: number, b: number) => boolean = () => false;
  /** Called as each soul turns. */
  onTurn: (s: Soul) => void = () => {};
  /** Souls that have heard or turned. */
  reached = 0;
  private rng: Rng;
  private materials: THREE.Material[] = [];
  private t = 0;

  constructor(seed = 5) {
    this.rng = new Rng(seed);
  }

  add(x: number, y: number, z: number, zone: number, district: number, look: CrowdLook, yaw?: number): Soul {
    const r = this.rng;
    const s: Soul = {
      x,
      y,
      z,
      yaw: yaw ?? r.range(0, TAU),
      zone,
      district,
      state: 0,
      wait: 0,
      turned: 0,
      style: r.int(0, 2),
      scale: r.range(0.92, 1.08),
      robe: new THREE.Color(look.robes[r.int(0, look.robes.length - 1)]),
      gear: new THREE.Color(look.gears[r.int(0, look.gears.length - 1)]),
      sack: new THREE.Color(SACK[r.int(0, SACK.length - 1)]),
      phase: r.range(0, TAU),
      ox: 0,
      oz: 0,
      hop: 0,
      wantYaw: 0,
      near: [],
      walk: null,
      deaf: false,
    };
    // each robe a little its own
    s.robe.offsetHSL(r.range(-0.015, 0.015), r.range(-0.06, 0.04), r.range(-0.05, 0.05));
    s.wantYaw = s.yaw;
    this.souls.push(s);
    return s;
  }

  /** A knot of people about a point, facing inward as people talking do. */
  cluster(cx: number, cz: number, n: number, radius: number, zone: number, district: number, look: CrowdLook, opts: { y?: number; face?: 'in' | 'out' | number; free?: (x: number, z: number) => boolean } = {}): Soul[] {
    const out: Soul[] = [];
    const r = this.rng;
    let tries = 0;
    while (out.length < n && tries++ < n * 40) {
      const a = r.range(0, TAU);
      const d = Math.sqrt(r.next()) * radius;
      const x = cx + Math.cos(a) * d;
      const z = cz + Math.sin(a) * d;
      if (opts.free && !opts.free(x, z)) continue;
      if (this.souls.some((s) => Math.hypot(s.x - x, s.z - z) < 0.95)) continue;
      const face = opts.face ?? 'in';
      const yaw = typeof face === 'number' ? face + r.range(-0.5, 0.5) : face === 'in' ? Math.atan2(cx - x, cz - z) + r.range(-0.6, 0.6) : r.range(0, TAU);
      out.push(this.add(x, opts.y ?? 0, z, zone, district, look, yaw));
    }
    return out;
  }

  /** People strung along a line (a street's edge), a few of them walking. */
  line(x0: number, z0: number, x1: number, z1: number, n: number, spread: number, zone: number, district: number, look: CrowdLook, walkers = 0.25): Soul[] {
    const out: Soul[] = [];
    const r = this.rng;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const dx = (x1 - x0) / len;
    const dz = (z1 - z0) / len;
    for (let i = 0; i < n; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const t = (i + r.range(0.1, 0.9)) / n;
        const off = r.range(-spread, spread);
        const x = lerp(x0, x1, t) - dz * off;
        const z = lerp(z0, z1, t) + dx * off;
        if (this.souls.some((s) => Math.hypot(s.x - x, s.z - z) < 0.95)) continue;
        const s = this.add(x, 0, z, zone, district, look);
        if (r.chance(walkers)) {
          const sign = r.sign();
          s.walk = { dx: dx * sign, dz: dz * sign, len: r.range(2.5, 5), speed: r.range(0.7, 1.1), t: r.range(0, 10) };
        }
        out.push(s);
        break;
      }
    }
    return out;
  }

  /**
   * Makes the meshes and works out who stands near whom. Call once, after every soul is added. `pass` is how far
   * a soul's word carries to its neighbour (less where there is din): two are neighbours within the lesser reach.
   */
  finish(parent: THREE.Object3D, pass: (s: Soul) => number, shadows = true) {
    const n = this.souls.length;
    const mat = () => {
      const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      this.materials.push(m);
      return m;
    };
    this.robes = new THREE.InstancedMesh(robeGeometry(), mat(), n);
    this.heads = new THREE.InstancedMesh(headGeometry(), mat(), n);
    this.gear = new THREE.InstancedMesh(gearGeometry(), mat(), n);
    for (const m of [this.robes, this.heads, this.gear]) {
      m.frustumCulled = false;
      m.receiveShadow = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parent.add(m);
    }
    this.robes.castShadow = shadows;
    const r = this.rng;
    this.souls.forEach((s, i) => {
      this.robes.setColorAt(i, s.robe);
      this.heads.setColorAt(i, _c.set(SKINS[r.int(0, SKINS.length - 1)]));
      this.gear.setColorAt(i, s.gear);
    });
    // neighbours, by a grid
    const reach = this.souls.map(pass);
    const cell = Math.max(1, ...reach);
    const grid = new Map<string, number[]>();
    this.souls.forEach((s, i) => {
      const key = `${Math.floor(s.x / cell)}:${Math.floor(s.z / cell)}`;
      let list = grid.get(key);
      if (!list) grid.set(key, (list = []));
      list.push(i);
    });
    this.souls.forEach((s, i) => {
      const cx = Math.floor(s.x / cell);
      const cz = Math.floor(s.z / cell);
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          for (const j of grid.get(`${cx + ax}:${cz + az}`) ?? []) {
            if (j === i) continue;
            const o = this.souls[j];
            if (Math.abs(o.y - s.y) < 2.5 && Math.hypot(o.x - s.x, o.z - s.z) < Math.min(reach[i], reach[j])) s.near.push(j);
          }
        }
      }
    });
    this.update(0, null);
  }

  private open(a: number, b: number) {
    return a === b || this.linked(a, b);
  }

  /** The word reaches a soul from a place. It turns to listen, then passes it on. */
  hear(s: Soul, fromX: number, fromZ: number, delay: number) {
    if (s.state !== 0 || s.deaf) return false;
    s.state = 1;
    s.wait = delay;
    s.wantYaw = Math.atan2(fromX - s.x, fromZ - s.z);
    s.hop = 1;
    s.walk = null;
    this.reached++;
    return true;
  }

  /**
   * A cry from (x, z). Within `radius` every soul hears whose zone is `zone` (or joined to it by an open gate);
   * a cry from a height (`over`) carries over walls to every zone. Returns how many newly heard.
   */
  cry(x: number, z: number, radius: number, zone: number, over: boolean): number {
    let n = 0;
    for (const s of this.souls) {
      if (s.state !== 0) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d > radius) continue;
      if (!over && !this.open(s.zone, zone)) continue;
      // the sound takes a moment to arrive: the ring of listeners widens
      if (this.hear(s, x, z, 0.25 + d * 0.035 + this.rng.range(0, 0.25))) n++;
    }
    return n;
  }

  /** When a gate opens: those who have turned on either side tell those beyond it. */
  repass(a: number, b: number) {
    for (const s of this.souls) {
      if (s.state !== 2 || (s.zone !== a && s.zone !== b)) continue;
      this.pass(s);
    }
  }

  private pass(s: Soul) {
    for (const j of s.near) {
      const o = this.souls[j];
      if (o.state === 0 && this.open(s.zone, o.zone)) this.hear(o, s.x, s.z, 0.42 + this.rng.range(0, 0.4));
    }
  }

  /** The word carried through the whole city from a point, a wave by distance (the close of the chapter). */
  sweep(x: number, z: number, speed: number) {
    for (const s of this.souls) {
      if (s.state !== 0) continue;
      s.deaf = false;
      this.hear(s, x, z, Math.hypot(s.x - x, s.z - z) / speed + this.rng.range(0, 0.5));
    }
  }

  count(district?: number): { total: number; reached: number; turned: number } {
    let total = 0;
    let reached = 0;
    let turned = 0;
    for (const s of this.souls) {
      if (district !== undefined && s.district !== district) continue;
      total++;
      if (s.state > 0) reached++;
      if (s.state === 2) turned++;
    }
    return { total, reached, turned };
  }

  /** The nearest soul that has not heard, optionally within one district. */
  nearestUnheard(x: number, z: number, district?: number, zone?: number): Soul | null {
    let best: Soul | null = null;
    let bestD = Infinity;
    for (const s of this.souls) {
      if (s.state !== 0 || (district !== undefined && s.district !== district) || (zone !== undefined && s.zone !== zone)) continue;
      const d = Math.hypot(s.x - x, s.z - z);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  update(dt: number, player: THREE.Vector3 | null) {
    this.t += dt;
    const t = this.t;
    let colours = false;
    for (let i = 0; i < this.souls.length; i++) {
      const s = this.souls[i];
      if (s.state === 1) {
        s.wait -= dt;
        if (s.wait <= 0) {
          s.state = 2;
          this.pass(s);
          this.onTurn(s);
        }
      }
      if (s.state === 2 && s.turned < 1) {
        s.turned = Math.min(1, s.turned + dt / 0.9);
        const k = ease.inOutQuad(s.turned);
        this.robes.setColorAt(i, _c.copy(s.robe).lerp(s.sack, k));
        this.gear.setColorAt(i, _c.copy(s.gear).lerp(_q2c.set(ASH), k * 0.85));
        colours = true;
      }
      s.hop = Math.max(0, s.hop - dt * 3.2);
      let x = s.x;
      let z = s.z;
      let yaw = s.wantYaw;
      if (s.state === 0) {
        if (s.walk) {
          const w = s.walk;
          w.t += dt;
          const period = (w.len / w.speed) * 2 + 3;
          const u = w.t % period;
          const leg = w.len / w.speed;
          // out, wait, back, wait
          let along: number;
          let dir = 1;
          if (u < leg) along = u * w.speed;
          else if (u < leg + 1.5) along = w.len;
          else if (u < leg * 2 + 1.5) {
            along = w.len - (u - leg - 1.5) * w.speed;
            dir = -1;
          } else {
            along = 0;
            dir = -1;
          }
          x += w.dx * along;
          z += w.dz * along;
          yaw = Math.atan2(w.dx * dir, w.dz * dir);
        } else yaw = s.wantYaw + Math.sin(t * 0.5 + s.phase) * 0.22;
      } else if (s.walk === null && s.state >= 1) {
        yaw = s.wantYaw;
      }
      s.yaw = dampAngle(s.yaw, yaw, s.state === 0 ? 3 : 9, dt);
      // step aside from the one who walks among them
      let px = 0;
      let pz = 0;
      if (player && Math.abs(player.y - s.y) < 1.6) {
        const dx = x + s.ox - player.x;
        const dz = z + s.oz - player.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.85) {
          const push = (0.85 - d) / Math.max(d, 0.05);
          px = dx * push;
          pz = dz * push;
        }
      }
      if (px || pz) {
        const k = Math.min(1, dt * 14);
        s.ox = clampLen(s.ox + px * k, 0.8);
        s.oz = clampLen(s.oz + pz * k, 0.8);
      } else {
        s.ox = damp(s.ox, 0, 1.6, dt);
        s.oz = damp(s.oz, 0, 1.6, dt);
      }

      // ---- the body
      const k = ease.inOutQuad(s.turned);
      const sway = s.state === 2 ? Math.sin(t * 0.9 + s.phase) * 0.035 : Math.sin(t * 1.3 + s.phase) * 0.02;
      const squash = s.style === 0 ? 0.5 : s.style === 1 ? 0.68 : 0.6;
      const lean = (s.style === 0 ? 0.95 : s.style === 1 ? 0.16 : 0.5) + sway;
      const sy = lerp(1, squash, k) * s.scale;
      const pitch = lerp(sway, lean, k);
      const hop = Math.sin(clamp01(1 - s.hop) * Math.PI) * 0.12 * (s.hop > 0 ? 1 : 0);
      _p.set(x + s.ox, s.y + hop, z + s.oz);
      _e.set(pitch, s.yaw, 0);
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _s.set(s.scale, sy, s.scale));
      this.robes.setMatrixAt(i, _m);
      // the head sits on the neck, which the lean has carried forward and down
      const neck = 1.47 * sy;
      const fx = Math.sin(s.yaw);
      const fz = Math.cos(s.yaw);
      const out = Math.sin(pitch) * neck;
      _p.set(x + s.ox + fx * out, s.y + hop + Math.cos(pitch) * neck, z + s.oz + fz * out);
      _e.set(pitch + lerp(0, s.style === 1 ? 0.5 : 0.25, k) + (s.state === 1 ? -0.12 : 0), s.yaw, 0);
      _q.setFromEuler(_e);
      _m.compose(_p, _q, _s.set(s.scale, s.scale, s.scale));
      this.heads.setMatrixAt(i, _m);
      this.gear.setMatrixAt(i, _m);
    }
    this.robes.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    this.gear.instanceMatrix.needsUpdate = true;
    if (colours) {
      if (this.robes.instanceColor) this.robes.instanceColor.needsUpdate = true;
      if (this.gear.instanceColor) this.gear.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    for (const m of [this.robes, this.heads, this.gear]) {
      if (!m) continue;
      m.parent?.remove(m);
      m.geometry.dispose();
      m.dispose();
    }
    for (const m of this.materials) m.dispose();
  }
}

const _q2c = new THREE.Color();

function clampLen(v: number, max: number) {
  return v < -max ? -max : v > max ? max : v;
}

/**
 * The far city: small still figures in the streets beyond the walls the player walks within, seen only from above.
 * They turn to ash gray as the word crosses the city.
 */
export class FarCrowd {
  readonly mesh: THREE.InstancedMesh;
  private pts: { x: number; z: number; at: number; done: number; base: THREE.Color }[] = [];
  private t = -1;
  private material: THREE.MeshLambertMaterial;

  constructor(points: { x: number; z: number }[], colours: number[], seed = 9) {
    const r = new Rng(seed);
    const g = new THREE.CylinderGeometry(0.16, 0.34, 1.5, 5);
    g.translate(0, 0.75, 0);
    this.material = new THREE.MeshLambertMaterial({ flatShading: true });
    this.mesh = new THREE.InstancedMesh(g, this.material, points.length);
    this.mesh.frustumCulled = false;
    points.forEach((p, i) => {
      const base = new THREE.Color(colours[r.int(0, colours.length - 1)]);
      this.pts.push({ x: p.x, z: p.z, at: Infinity, done: 0, base });
      _m.compose(_p.set(p.x, 0, p.z), _q.identity(), _s.set(1, r.range(0.9, 1.1), 1));
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, base);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Starts the wave from a point. */
  sweep(x: number, z: number, speed: number) {
    this.t = 0;
    for (const p of this.pts) p.at = Math.hypot(p.x - x, p.z - z) / speed + Math.random() * 0.6;
  }

  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    let any = false;
    this.pts.forEach((p, i) => {
      if (p.done >= 1 || this.t < p.at) return;
      p.done = Math.min(1, p.done + dt / 0.8);
      this.mesh.setColorAt(i, _c.copy(p.base).lerp(_q2c.set(SACK[i % SACK.length]), p.done));
      _m.compose(_p.set(p.x, 0, p.z), _q.identity(), _s.set(1, lerp(1, 0.62, p.done), 1));
      this.mesh.setMatrixAt(i, _m);
      any = true;
    });
    if (any) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.parent?.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
