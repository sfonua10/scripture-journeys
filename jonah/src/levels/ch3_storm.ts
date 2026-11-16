// Chapter 3: The Storm (Jonah 1:4–16).
//
// What the account says: the LORD sent out a great wind; the ship was like to be broken (4). The mariners were
// afraid, cried every man unto his god, and cast forth the wares; Jonah lay fast asleep in the sides of the ship (5).
// The shipmaster woke him (6). They cast lots and the lot fell upon Jonah (7). They questioned him and he answered
// (8–9). They were exceedingly afraid (10) and asked what to do (11). He said, Take me up, and cast me forth (12).
// Nevertheless the men rowed hard, and could not (13). They cried unto the LORD (14), took up Jonah and cast him
// forth, and the sea ceased from her raging (15). The men feared the LORD exceedingly (16).
//
// The game's own: once woken, Jonah works beside the mariners (casting wares, making lines fast, bailing, holding
// men against the great waves). Nobody dies: a man swept off is hauled back by a line. Jonah does not row (the men
// do), does not leap (they take him up), and nothing is put in the mouth of the LORD.
import * as THREE from 'three';
import { RAPIER, type Prop } from '../core/physics';
import type { Quality } from '../core/quality';
import { tween, waitFor, type Routine } from '../core/script';
import { Rng, TAU, clamp, clamp01, damp, ease, lerp } from '../core/util';
import type { Bot } from '../game/bot';
import { Chapter } from '../game/chapter';
import { cite, part } from '../game/verses';
import { buildMesh } from '../gfx/build';
import { LOOKS, mariner } from '../gfx/character';
import { Ocean, STORM_WAVES, type OceanLook } from '../gfx/ocean';
import { Rain } from '../gfx/particles';
import { Toys, jarMesh } from '../gfx/props';
import { Sky } from '../gfx/sky';
import { makeLights } from '../gfx/sky';
import type { Shot } from '../player/camera';
import type { Focus, Interactable } from '../player/controller';
import { STAIR_UP, Sailor } from './crew';
import { FORE, HATCH, HOLD_Y, MAST_Z, QUARTER, Ship, TOP_Y, deckY, halfBeam, hullHalf } from './ship';

type Phase = 'asleep' | 'wake' | 'wares' | 'jobs' | 'chaos' | 'lots' | 'words' | 'rowing' | 'cast' | 'calm' | 'done';
const ORDER: Phase[] = ['asleep', 'wake', 'wares', 'jobs', 'chaos', 'lots', 'words', 'rowing', 'cast', 'calm', 'done'];

const GRAV = 24;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const STORM = {
  fog: new THREE.Color(0x17222a),
  skyTop: new THREE.Color(0x090d12),
  skyHorizon: new THREE.Color(0x26333c),
  skyBottom: new THREE.Color(0x121a20),
  cloudLit: new THREE.Color(0x3a4852),
  cloudDark: new THREE.Color(0x0a0e12),
  key: new THREE.Color(0x8fa8c4),
  seaTop: new THREE.Color(0x10161c),
  seaHorizon: new THREE.Color(0x2c3a42),
};
const CALM = {
  fog: new THREE.Color(0x27384c),
  skyTop: new THREE.Color(0x0b1530),
  skyHorizon: new THREE.Color(0x3c5878),
  skyBottom: new THREE.Color(0x1a2a3c),
  cloudLit: new THREE.Color(0x9ab0cc),
  cloudDark: new THREE.Color(0x26344a),
  key: new THREE.Color(0xcfe0ff),
  seaTop: new THREE.Color(0x142448),
  seaHorizon: new THREE.Color(0x5a7aa0),
};
const MOON = V(0.66, 0.4, -0.62).normalize();
const SEA: OceanLook = {
  deep: 0x07171c,
  shallow: 0x1d4a46,
  glow: 0x3f9a80,
  foam: 0xc4d2d0,
  skyTop: STORM.seaTop,
  skyHorizon: STORM.seaHorizon,
  sunDir: MOON,
  sunColor: 0x556a80,
  spec: 0.35,
  ambient: 0.42,
  foamAmount: 0.72,
};

interface Wave {
  victim: Sailor;
  /** The side it comes from: +1 port, −1 starboard. */
  side: number;
  /** Seconds until it strikes (negative after). */
  t: number;
  warn: number;
  hit: boolean;
  saved: boolean;
}

interface Flotsam {
  mesh: THREE.Object3D;
  t: number;
  spin: number;
  vx: number;
  vz: number;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _c = new THREE.Color();
const _q = new THREE.Quaternion();
const UP = V(0, 1, 0);

export class Storm extends Chapter {
  phase: Phase = 'asleep';
  private rng = new Rng(31);
  private sky!: Sky;
  private ocean!: Ocean;
  private rain!: Rain;
  private ship!: Ship;
  private toys!: Toys;
  private crew: Sailor[] = [];
  private master!: Sailor;
  private flashLight!: THREE.DirectionalLight;
  private bolt!: THREE.Mesh;
  private boltT = 0;
  private flash = 0;
  private flashDir = V(0, 0.5, 1).normalize();
  private nextStrike = 3;
  private thunderIn = -1;
  private thunderDist = 0.5;
  private holdWater!: THREE.Mesh;
  private lot!: THREE.Mesh;
  private jar!: THREE.Object3D;

  /** How wild the sea is: 0 calm .. 1.15 the worst of it. Eased toward `stormWant`. */
  private storm = 0.7;
  private stormWant = 0.7;
  /** 0 the tempest .. 1 the calm after. */
  private calm = 0;
  /** 0..1, the "ship damage" meter. */
  damage = 0.3;
  private meterOn = false;
  /** Water in the hold, 0..1. */
  flood = 0;
  private floodRate = 0;
  private cast = 0;
  private castNeed = 0;
  private swept = 0;
  private wave: Wave | null = null;
  private shove = 0;
  private shoveSide = 0;
  private flotsam: Flotsam[] = [];
  private holdMan!: Interactable;
  private rescue!: Interactable;
  private rescuing: Sailor | null = null;
  private rescueT = 0;
  private bail!: Interactable;
  private lash!: Interactable;
  private lashLoose = false;
  private lineJobs: Interactable[] = [];
  private failing = false;
  private lastPitch = 0;
  private sprayT = 0;
  private dripT = 0;
  private landT = 0;
  private lotAsk = false;
  private lotProgress = 0;
  private objectiveKey = '';
  private seek: Phase | null = null;
  private wind = V(-9, -22, 4);

  // ---- building ------------------------------------------------------------------------------------------------

  build() {
    const g = this.g;
    const q = g.quality;
    const seek = g.params.get('seek') as Phase | null;
    if (seek && ORDER.includes(seek)) this.seek = seek;

    this.sky = new Sky({ top: STORM.skyTop, horizon: STORM.skyHorizon, bottom: STORM.skyBottom, sunDir: MOON, sunColor: 0xdfe8ff, sunSize: 0, sunGlow: 0, cloudCover: 1, cloudLit: STORM.cloudLit, cloudDark: STORM.cloudDark, cloudSpeed: 7, stars: 0 });
    g.root.add(this.sky.mesh);
    this.ocean = new Ocean(q.oceanGrid, SEA, STORM_WAVES, { low: q.level === 'low' });
    g.root.add(this.ocean.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: V(0.5, 0.75, -0.4), sunColor: STORM.key, sunIntensity: 2.2, skyColor: 0x6a8aa0, groundColor: 0x2c2824, hemiIntensity: 2.3, shadowSize: q.shadowSize, shadowRange: 20 });
    g.engine.setView(700, 24, 230, STORM.fog);
    this.flashLight = new THREE.DirectionalLight(0xcfe0ff, 0);
    g.root.add(this.flashLight, this.flashLight.target);
    this.rain = new Rain(Math.round(3400 * q.particles));
    this.rain.uniforms.uVel.value = this.wind;
    this.rain.uniforms.uLen.value = 1.5;
    g.root.add(this.rain.object);
    this.makeBolt();
    const grade = g.engine.post.grade;
    grade.tint.setRGB(0.93, 1.0, 1.02);
    grade.lift.setRGB(0.012, 0.03, 0.04);
    grade.saturation = 0.94;
    grade.contrast = 1.1;
    grade.vignette = 0.46;
    grade.bloom = 0.6;
    grade.threshold = 0.8;
    grade.exposure = 1.08;

    // ---- the ship, and the world of physics that is her deck
    this.ship = new Ship(g.physics, { lights: q.lights });
    g.root.add(this.ship.group);
    this.ocean.time = 0;
    this.ocean.amp = this.storm;
    this.ship.settle(this.ocean);
    this.toys = new Toys(g.physics, this.ship.group);

    const p = g.spawnPlayer({ x: -1.25, y: HOLD_Y + 0.05, z: -6.9 }, 0, this.ship.group);
    p.climbZones.push(this.ship.climb);
    p.canSlide = false;
    p.killY = -7;
    g.cam.frame = this.ship.group;
    g.cam.frameTilt = 0.42;
    g.cam.dist = 7;
    g.cam.hint = (at) => (at.y < -1.2 ? { dist: 3.5, pitch: 0.14, strength: 2 } : at.y > 5 ? { dist: 6.2, pitch: 0.5, strength: 1.5 } : { dist: 7, strength: 1 });

    // ---- where Jonah lay: sacks in the sides of the ship
    const bed = buildMesh((b) => {
      b.ball(-1.25, HOLD_Y + 0.16, -7.4, 0.5, 0x9a8a68, { squash: V(1.1, 0.42, 0.8), detail: 1 });
      b.ball(-1.2, HOLD_Y + 0.14, -6.5, 0.52, 0x8f7f5e, { squash: V(1.1, 0.36, 0.85), detail: 1 });
      b.ball(-1.75, HOLD_Y + 0.3, -7.9, 0.44, 0xa39370, { squash: V(0.9, 0.6, 0.8), detail: 1 });
      b.ball(-0.4, HOLD_Y + 0.22, -8.3, 0.46, 0x94845f, { squash: V(1, 0.55, 0.8), detail: 1 });
    }, 4);
    this.ship.group.add(bed);

    // ---- the wares
    const t = this.toys;
    const ware = (prop: Prop) => {
      prop.data.ware = true;
      this.wet(prop);
      return prop;
    };
    ware(t.crate(-1.7, 0.45, 5.6));
    ware(t.crate(-1.55, 0.45, 6.9, 0.8, 0.3));
    ware(t.barrel(1.75, 0.5, 6.1));
    ware(t.jar(1.25, 0.45, 7.35));
    ware(t.sack(2.1, 0.35, 7.5));
    ware(t.basket(-0.3, 0.3, 7.3));
    // below: cargo still stowed (it may be brought up and cast forth too), and the pile that hides a scroll
    ware(t.crate(0.1, HOLD_Y + 0.42, 8.3));
    ware(t.crate(-0.85, HOLD_Y + 0.42, 7.9, 0.8, 0.2));
    ware(t.crate(0.75, HOLD_Y + 0.42, 7.3, 0.8, -0.3));
    ware(t.barrel(1.4, HOLD_Y + 0.47, 5.6));
    ware(t.barrel(-1.5, HOLD_Y + 0.47, -3.2));
    ware(t.jar(1.5, HOLD_Y + 0.42, -4.4));
    ware(t.sack(1.3, HOLD_Y + 0.32, -6.6));
    ware(t.basket(-1.4, HOLD_Y + 0.26, 5.2));

    // water in the hold
    this.holdWater = new THREE.Mesh(new THREE.PlaneGeometry(7, 19.2), new THREE.MeshLambertMaterial({ color: 0x2a5a52, transparent: true, opacity: 0.78, depthWrite: false }));
    this.holdWater.geometry.rotateX(-Math.PI / 2);
    this.holdWater.visible = false;
    this.holdWater.renderOrder = 3;
    this.ship.group.add(this.holdWater);

    // the lots
    this.jar = jarMesh(0.3, 0.7);
    this.jar.position.set(0, 0, 6.5);
    this.jar.visible = false;
    this.ship.group.add(this.jar);
    this.lot = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 0), new THREE.MeshLambertMaterial({ color: 0xd8d0c0, flatShading: true, emissive: 0x2a2620 }));
    this.lot.visible = false;
    this.ship.group.add(this.lot);

    // ---- the people
    const stations: [number, number, number, Sailor['pose']][] = [
      [2.75, -1.5, Math.PI / 2, 'pull'],
      [-2.7, 0.1, -Math.PI / 2, 'work'],
      [0.9, 10.2, 0.2, 'cry'],
      [-1.3, -4.2, 2.6, 'pray'],
      [-2.4, 6.4, -Math.PI / 2, 'throw'],
      [1.05, -10.4, Math.PI, 'pull'],
    ];
    stations.forEach(([x, z, yaw, pose], i) => {
      const s = new Sailor(`mariner ${i + 1}`, mariner(i), this.ship.group);
      s.home.set(x, deckY(z), z);
      s.homeYaw = yaw;
      s.homePose = pose;
      s.place(x, deckY(z), z, yaw, pose);
      this.crew.push(s);
    });
    this.master = new Sailor('The shipmaster', LOOKS.shipmaster, this.ship.group);
    this.master.home.set(-0.7, QUARTER.y, -8.6);
    this.master.homeYaw = 0;
    this.master.homePose = 'point';
    this.master.place(-0.7, QUARTER.y, -8.6, 0, 'point');

    // ---- the jobs
    this.ship.lines.forEach((line, i) => {
      const it: Interactable = {
        pos: V(line.pin.x - Math.sign(line.pin.x) * 0.5, deckY(line.pin.z), line.pin.z),
        radius: 1.7,
        prompt: 'Hold to make the line fast',
        hold: 1.5,
        pose: 'pull',
        enabled: () => line.loose,
        onProgress: (k) => {
          if (k > 0 && Math.random() < 0.05) g.audio.rope();
        },
        onUse: () => {
          line.loose = false;
          g.audio.rope();
          g.audio.good();
          this.mend(0.035);
          g.hud.marker(`line${i}`, null);
        },
      };
      this.lineJobs.push(it);
      p.interactables.push(it);
    });
    this.bail = {
      pos: V(1.55, HOLD_Y, 2.2),
      radius: 1.5,
      prompt: 'Hold to bail',
      hold: 0.5,
      pose: 'bail',
      enabled: () => this.flood > 0.04 && this.floodRate >= 0,
      onUse: () => {
        this.flood = Math.max(0, this.flood - (g.story ? 0.12 : 0.085));
        this.mend(0.006);
        g.audio.slosh();
        this.ship.toWorld(_v.set(1.2, HOLD_Y + 0.9, 2.4), _w);
        g.fx.emit(_w, { count: 14, color: 0x9fc4c0, color2: 0xdfeeee, speed: 5.5, dir: V(-0.25, 1, 0.1), spread: 0.25, life: 0.7, gravity: 14, size: 0.16, opacity: 0.7 });
      },
    };
    this.lash = {
      pos: V(0, TOP_Y, -1.5),
      radius: 1.6,
      prompt: 'Hold to lash the yard',
      hold: 2,
      pose: 'pull',
      enabled: () => this.lashLoose,
      onUse: () => {
        this.lashLoose = false;
        g.audio.rope();
        g.audio.good();
        this.mend(0.06);
        g.hud.marker('lash', null);
      },
    };
    this.holdMan = {
      pos: V(0, 0, 0),
      radius: 2.1,
      prompt: 'Hold him fast',
      hold: 30,
      pose: 'cling',
      priority: 2,
      enabled: () => !!this.wave && !this.wave.hit,
      onUse: () => {},
    };
    this.rescue = {
      pos: V(0, 0, 0),
      radius: 2.2,
      prompt: 'Hold to haul him in',
      hold: 2.2,
      pose: 'pull',
      priority: 1,
      enabled: () => !!this.rescuing && this.rescuing.overboard,
      onUse: () => {
        const s = this.rescuing;
        if (s) g.run(() => this.haul(s));
      },
    };
    p.interactables.push(this.bail, this.lash, this.holdMan, this.rescue);

    // Casting forth: at the rail, one press heaves the load over the side.
    p.carryPrompt = () => (this.atRail() ? 'Cast it into the sea' : null);
    p.onCarryAction = (prop) => {
      const side = this.atRail();
      if (!side) return false;
      p.yaw = Math.atan2(side, 0);
      p.release(prop, false);
      prop.body.setLinvel({ x: side * 7.2, y: 6.4, z: 0 }, true);
      prop.body.setAngvel({ x: this.rng.range(-3, 3), y: this.rng.range(-2, 2), z: this.rng.range(-3, 3) }, true);
      p.onThrow(prop, 0.7);
      return true;
    };
    p.onFall = () => g.hud.toast('Hauled back aboard');

    // ---- scroll pieces
    const rec = g.save.record(3);
    g.scrolls.add(0, V(0.1, -0.95, 8.75), 'Psalm 139:9', this.ship.group, rec.scrolls[0]);
    g.scrolls.add(1, V(0.55, TOP_Y + 1.0, -2.6), 'Psalm 107:25', this.ship.group, rec.scrolls[1]);
    g.scrolls.add(2, V(0, FORE.y + 1.15, 12.05), 'Psalm 89:9', this.ship.group, rec.scrolls[2]);

    if (this.seek && ORDER.indexOf(this.seek) >= ORDER.indexOf('wares')) {
      p.teleport(V(0, 0.05, 5.4), Math.PI);
      g.cam.snap(p, 0);
    }
    g.audio.bed('wind', 0.5);
    g.audio.bed('rain', 0.35);
    g.audio.bed('waves', 0.6);
    g.audio.creakEvery = 2.4;
    this.applyMood();
  }

  /** Cargo on a wet deck slides. */
  private wet(prop: Prop) {
    prop.collider.setFriction(0.3);
    prop.collider.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
  }

  /** ±1 if the player stands by the port or starboard rail on an open deck, else 0. */
  private atRail(): number {
    const p = this.g.player.pos;
    if (p.y < -0.6 || p.y > 2.2) return 0;
    const half = hullHalf(p.z, p.y + 0.5);
    if (Math.abs(p.x) > half - 1.75) return Math.sign(p.x);
    return 0;
  }

  private mend(by: number) {
    this.damage = Math.max(0.05, this.damage - by);
  }

  override plate(): Shot {
    return { pos: V(-19, 9, 17), look: V(0, 3, 0), fov: 50 };
  }

  override onQuality(_q: Quality) {
    this.applyMood();
  }

  // ---- lightning -----------------------------------------------------------------------------------------------

  private makeBolt() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 18), 3));
    this.bolt = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 5.6, 7), transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    this.bolt.renderOrder = 10;
    this.g.root.add(this.bolt);
  }

  /** A stroke of lightning at a compass bearing from the ship (radians; default anywhere). */
  private strike(bearing?: number, close = false) {
    const g = this.g;
    const rng = this.rng;
    const a = bearing ?? rng.range(0, TAU);
    const d = close ? rng.range(80, 120) : rng.range(150, 290);
    const cam = g.engine.camera.position;
    const pos = this.bolt.geometry.attributes.position as THREE.BufferAttribute;
    let n = 0;
    const width = d * 0.0075;
    const ribbon = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number) => {
      if (n >= 48) return;
      // a strip facing the camera
      _v.set(bx - ax, by - ay, bz - az);
      _w.set(ax - cam.x, ay - cam.y, az - cam.z).cross(_v).normalize().multiplyScalar(w);
      const o = n * 6;
      pos.setXYZ(o, ax - _w.x, ay - _w.y, az - _w.z);
      pos.setXYZ(o + 1, ax + _w.x, ay + _w.y, az + _w.z);
      pos.setXYZ(o + 2, bx + _w.x, by + _w.y, bz + _w.z);
      pos.setXYZ(o + 3, ax - _w.x, ay - _w.y, az - _w.z);
      pos.setXYZ(o + 4, bx + _w.x, by + _w.y, bz + _w.z);
      pos.setXYZ(o + 5, bx - _w.x, by - _w.y, bz - _w.z);
      n++;
    };
    const run = (x: number, y: number, z: number, steps: number, drop: number, w: number, fork: boolean) => {
      for (let i = 0; i < steps; i++) {
        const nx = x + rng.range(-1, 1) * drop * 0.55;
        const nz = z + rng.range(-1, 1) * drop * 0.55;
        const ny = y - drop * rng.range(0.7, 1.2);
        ribbon(x, y, z, nx, ny, nz, w * (1 - (i / steps) * 0.5));
        if (fork && i > 2 && i < steps - 3 && rng.chance(0.28)) run(nx, ny, nz, 4, drop * 0.7, w * 0.5, false);
        x = nx;
        y = ny;
        z = nz;
        if (y < -2) break;
      }
    };
    run(cam.x + Math.sin(a) * d, 150, cam.z + Math.cos(a) * d, 15, 11, width, true);
    for (let i = n * 6; i < 48 * 6; i++) pos.setXYZ(i, 0, -999, 0);
    pos.needsUpdate = true;
    this.bolt.visible = true;
    this.boltT = 0.3;
    this.flash = 1;
    this.flashDir.set(Math.sin(a), 0.55, Math.cos(a)).normalize();
    this.thunderIn = 0.25 + d / 190;
    this.thunderDist = clamp01(d / 300);
  }

  // ---- the look of the weather, between the tempest and the calm -------------------------------------------------

  private applyMood() {
    const g = this.g;
    const k = this.calm;
    const sky = this.sky;
    sky.set({
      top: _c.lerpColors(STORM.skyTop, CALM.skyTop, k).getHex(),
      horizon: _c.lerpColors(STORM.skyHorizon, CALM.skyHorizon, k).getHex(),
      bottom: _c.lerpColors(STORM.skyBottom, CALM.skyBottom, k).getHex(),
      cloudLit: _c.lerpColors(STORM.cloudLit, CALM.cloudLit, k).getHex(),
      cloudDark: _c.lerpColors(STORM.cloudDark, CALM.cloudDark, k).getHex(),
      cloudCover: lerp(1, 0.34, ease.inOutQuad(k)),
      cloudSpeed: lerp(7, 0.6, k),
      stars: clamp01(k * 1.4 - 0.4),
      sunSize: k > 0.3 ? 0.045 : 0,
      sunGlow: k * 0.9,
    });
    this.ocean.setLook({
      skyTop: _c.lerpColors(STORM.seaTop, CALM.seaTop, k).getHex(),
      skyHorizon: _c.lerpColors(STORM.seaHorizon, CALM.seaHorizon, k).getHex(),
      sunColor: _c.set(0x556a80).lerp(new THREE.Color(0xdfe8ff), k).getHex(),
      spec: lerp(0.35, 2.2, k),
      ambient: lerp(0.42, 0.6, k),
      foamAmount: lerp(0.3 + this.storm * 0.42, 0.05, k),
    });
    const fog = g.engine.scene.fog as THREE.Fog | null;
    const dd = g.quality.drawDistance;
    if (fog) {
      fog.color.lerpColors(STORM.fog, CALM.fog, k);
      fog.near = lerp(24, 60, k) * dd;
      fog.far = lerp(230, 560, k) * dd;
    }
    if (g.lights) {
      g.lights.setSun(k > 0.5 ? MOON : V(0.5, 0.75, -0.4), _c.lerpColors(STORM.key, CALM.key, k).getHex(), lerp(2.2, 3.4, k));
    }
    const grade = g.engine.post.grade;
    grade.saturation = lerp(0.94, 1.08, k);
    grade.vignette = lerp(0.46, 0.3, k);
    grade.exposure = lerp(1.08, 1.0, k);
    this.rain.uniforms.uOpacity.value = 0.5 * (1 - clamp01(k * 2.2));
  }

  // ---- the story -----------------------------------------------------------------------------------------------

  start() {
    const g = this.g;
    g.touch.setSlide(false);
    g.audio.play('storm');
    g.run(() => this.story());
  }

  private from(phase: Phase): boolean {
    return !this.seek || ORDER.indexOf(phase) >= ORDER.indexOf(this.seek);
  }

  private *story(): Routine {
    if (this.from('asleep')) yield* this.pAsleep();
    if (this.from('wake')) yield* this.pWake();
    if (this.from('wares')) yield* this.pWares();
    if (this.from('jobs')) yield* this.pJobs();
    if (this.from('chaos')) yield* this.pChaos();
    if (this.from('lots')) yield* this.pLots();
    if (this.from('words')) yield* this.pWords();
    if (this.from('rowing')) yield* this.pRowing();
    yield* this.pCast();
  }

  /** 1:5–6. Jonah asleep in the sides of the ship; the shipmaster comes to him. */
  private *pAsleep(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'asleep';
    this.stormWant = 0.72;
    g.hud.cinema(true);
    p.teleport(V(-1.25, HOLD_Y + 0.42, -6.9), 0);
    p.lock('lie');
    g.cam.setShot({ pos: V(1.4, -1.25, -3.4), look: V(-1.1, -2.0, -6.9), fov: 46, local: true }, 0);
    this.master.place(0.3, HOLD_Y, 1.4, Math.PI, 'idle');
    yield 1.6;
    yield g.hud.verse(part('1:5', 'But Jonah was gone down', 'fast asleep'));
    yield 0.3;
    this.master.follow([V(-0.9, HOLD_Y, -1.2), V(-0.5, HOLD_Y, -5.3)], 'point', Math.atan2(-0.75, -1.6));
    g.cam.setShot({ pos: V(1.5, -1.0, -4.6), look: V(-0.9, -1.6, -6.4), fov: 44, local: true }, 2.4);
    yield () => !this.master.walking;
    g.audio.shout(0.8, 1);
    yield g.hud.verse(part('1:6', 'What meanest thou'), { who: 'The shipmaster', block: true });
    p.setLockedPose('kneel');
    yield 0.7;
    this.master.follow([V(-0.9, HOLD_Y, -1.2), ...STAIR_UP], 'idle', null, () => this.master.goHome());
    g.cam.setShot(null, 1.4);
    p.teleport(V(-1.1, HOLD_Y + 0.02, -6.2), 0);
    p.unlock();
    g.hud.cinema(false);
  }

  /** Up out of the hold, into the tempest (1:4). */
  private *pWake(): Routine {
    const g = this.g;
    this.phase = 'wake';
    this.stormWant = 0.78;
    g.hud.objective('Go up on deck', 'The stair is forward of the mast');
    g.hud.marker('stair', V(0, HOLD_Y + 1.2, 1.2), { frame: this.ship.group });
    yield () => g.player.pos.y > -0.5;
    g.hud.marker('stair', null);
    this.strike(1.2, true);
    g.cam.shake(0.3);
    yield 0.5;
    g.hud.verse(cite('1:4'), { seconds: 7 });
    yield 2.5;
  }

  /** Teach: cast forth the wares (1:5). */
  private *pWares(): Routine {
    const g = this.g;
    this.phase = 'wares';
    this.stormWant = 0.82;
    this.meterOn = true;
    this.damage = 0.34;
    this.castNeed = this.cast + 5;
    g.audio.shout(1.1, 1);
    g.hud.say('A mariner', 'Cast forth the wares! Lighten the ship!', { seconds: 3.4 });
    yield () => this.cast >= this.castNeed;
    g.audio.good();
    yield 0.8;
  }

  /** Test: lines come loose, the hold takes water, and the first great wave. */
  private *pJobs(): Routine {
    const g = this.g;
    this.phase = 'jobs';
    this.stormWant = 1.0;
    this.strike(undefined, true);
    yield 1.2;
    g.audio.shout(0.9, 1.2);
    g.hud.say('The shipmaster', 'The lines are loose! And she takes water below!', { seconds: 3.6 });
    this.loosen(0);
    this.loosen(1);
    this.floodRate = 0.02;
    this.flood = Math.max(this.flood, 0.25);
    yield* waitFor(() => this.looseCount() < 2 || this.flood < 0.12, 22);
    yield* this.greatWave(this.crew[0]);
    yield () => this.looseCount() === 0 && this.flood < 0.3 && !this.anyOverboard();
    this.floodRate = 0;
    g.audio.good();
    yield 1;
  }

  /** Twist: everything at once, and the storm only grows (1:4, 1:11). */
  private *pChaos(): Routine {
    const g = this.g;
    this.phase = 'chaos';
    this.stormWant = 1.15;
    this.strike(undefined, true);
    g.hud.verse(part('1:11', 'for the sea wrought'), { seconds: 4.5 });
    yield 2;
    // more wares break loose and come sliding
    const t = this.toys;
    for (const prop of [t.crate(-2.2, 0.6, -0.8), t.barrel(2.2, 0.7, 5.4), t.sack(-1.9, 0.5, 6.8), t.jar(2.3, 0.6, -3.0)]) {
      prop.data.ware = true;
      this.wet(prop);
    }
    this.castNeed = this.cast + 3;
    this.loosen(2);
    this.loosen(3);
    this.lashLoose = true;
    this.floodRate = 0.026;
    this.flood = Math.max(this.flood, 0.3);
    g.audio.shout(1, 1.2);
    g.hud.say('A mariner', 'The yard is loose aloft! Up the ladder!', { seconds: 3.4 });
    const jobsDone = () => this.looseCount() === 0 && !this.lashLoose && this.cast >= this.castNeed && this.flood < 0.3;
    yield* waitFor(jobsDone, 16);
    yield* this.greatWave(this.crew[4]);
    yield* waitFor(jobsDone, 18);
    yield* this.greatWave(this.crew[2]);
    yield* waitFor(() => jobsDone() && !this.anyOverboard(), g.story ? 30 : 40);
    yield () => !this.anyOverboard() && !this.wave;
    this.floodRate = -0.02;
  }

  /** 1:7. The lots. */
  private *pLots(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'lots';
    this.stormWant = 1.05;
    g.hud.clearMarkers();
    g.hud.objective(null);
    if (p.carried) p.release(p.carried);
    yield g.hud.fade(1, 0.5);
    for (const line of this.ship.lines) line.loose = false;
    this.lashLoose = false;
    this.floodRate = -0.05;
    g.hud.cinema(true);
    const C = V(0, 0, 6.5);
    const R = 1.75;
    const ring = [...this.crew, this.master];
    ring.forEach((s, i) => {
      const a = ((i + 1) / 8) * TAU + Math.PI;
      s.scripted = false;
      s.overboard = false;
      s.place(C.x + Math.sin(a) * R, 0, C.z + Math.cos(a) * R, a + Math.PI, 'kneel');
    });
    this.master.pose = 'idle';
    this.clearDeck(C, 2.6);
    p.teleport(V(C.x, 0.02, C.z - R), 0);
    p.lock('kneel');
    this.jar.visible = true;
    g.cam.setShot({ pos: V(3.6, 3.3, 2.6), look: V(0, 0.7, 6.6), fov: 44, local: true }, 0);
    yield 0.3;
    yield g.hud.fade(0, 0.6);
    g.audio.shout(0.9, 1);
    yield g.hud.verse(part('1:7', 'Come, and let us cast lots', 'this evil is upon us'), { who: 'The mariners', block: true });
    g.cam.setShot({ pos: V(-1.9, 2.5, 3.6), look: V(0.2, 0.6, 6.7), fov: 40, local: true }, 5);
    // each man draws in turn; every stone is pale
    for (let i = 0; i < ring.length; i++) {
      const s = ring[i];
      s.pose = 'throw';
      g.audio.rattle();
      yield 0.45 - i * 0.03;
      yield* this.showLot(s.pos, 0xd8d0c0);
      g.audio.tick(1 + i * 0.05);
      s.pose = s === this.master ? 'idle' : 'kneel';
      g.audio.heartbeat();
      yield 0.35 - i * 0.03;
    }
    // and then Jonah
    this.lot.visible = false;
    g.cam.setShot({ pos: V(1.5, 1.5, 6.9), look: V(0, 0.95, 4.9), fov: 36, local: true }, 1.6);
    this.lotAsk = true;
    this.lotProgress = 0;
    let beat = 0;
    while (this.lotProgress < 1) {
      const dt: number = (yield) ?? 0;
      const held = g.input.action.down || (!!g.bot && g.bot.input.action);
      this.lotProgress = clamp01(this.lotProgress + (held ? dt / 1.6 : -dt * 0.8));
      const focus: Focus = { kind: 'use', prompt: 'Hold to draw your lot', progress: this.lotProgress, pos: p.pos };
      g.promptOverride = focus;
      p.setLockedPose(held ? 'throw' : 'kneel');
      beat -= dt;
      if (beat <= 0) {
        g.audio.heartbeat();
        beat = lerp(0.9, 0.42, this.lotProgress);
      }
    }
    this.lotAsk = false;
    g.promptOverride = null;
    g.audio.rattle();
    (this.lot.material as THREE.MeshLambertMaterial).color.set(0x16120f);
    (this.lot.material as THREE.MeshLambertMaterial).emissive.set(0x000000);
    this.lot.position.set(p.pos.x + 0.1, 1.25, p.pos.z + 0.45);
    this.lot.scale.setScalar(1.6);
    this.lot.visible = true;
    this.strike(0.2, true);
    g.cam.shake(0.45);
    for (const s of ring) {
      s.pose = 'stagger';
    }
    yield 0.9;
    yield g.hud.verse(part('1:7', 'So they cast lots'), { block: true });
    this.lot.visible = false;
    this.jar.visible = false;
    p.setLockedPose('idle');
  }

  private *showLot(at: THREE.Vector3, color: number): Routine {
    const lot = this.lot;
    (lot.material as THREE.MeshLambertMaterial).color.set(color);
    (lot.material as THREE.MeshLambertMaterial).emissive.set(0x3a3428);
    lot.scale.setScalar(1);
    lot.visible = true;
    const from = V(0, 0.75, 6.5);
    const to = V(lerp(0, at.x, 0.72), 1.25, lerp(6.5, at.z, 0.72));
    yield* tween(0.28, (k) => lot.position.lerpVectors(from, to, k).setY(lerp(0.75, 1.25, k) + Math.sin(k * Math.PI) * 0.3), ease.outQuad);
  }

  /** 1:8–12. The questions, and his answer. */
  private *pWords(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'words';
    const ring = [...this.crew, this.master];
    if (!p.locked) {
      // (arrived here by ?seek)
      g.hud.cinema(true);
      p.teleport(V(0, 0.02, 4.75), 0);
      p.lock('idle');
      ring.forEach((s, i) => {
        const a = ((i + 1) / 8) * TAU + Math.PI;
        s.place(Math.sin(a) * 1.75, 0, 6.5 + Math.cos(a) * 1.75, a + Math.PI, 'idle');
      });
    }
    for (const s of ring) s.pose = 'talk';
    ring[1].pose = 'point';
    ring[4].pose = 'point';
    g.cam.setShot({ pos: V(-2.9, 2.1, 3.3), look: V(0.2, 1.0, 6.2), fov: 42, local: true }, 1.6);
    yield g.hud.verse(part('1:8', 'Tell us, we pray thee'), { who: 'The mariners', block: true });
    p.setLockedPose('talk');
    g.cam.setShot({ pos: V(1.2, 1.7, 7.3), look: V(0, 1.2, 4.8), fov: 36, local: true }, 1.4);
    yield g.hud.verse(part('1:9', 'I am an Hebrew'), { who: 'Jonah', block: true });
    p.setLockedPose('idle');
    for (const s of ring) s.pose = 'stagger';
    this.strike(3.6, true);
    g.cam.shake(0.3);
    g.cam.setShot({ pos: V(-3.2, 2.6, 2.9), look: V(0.2, 0.9, 6.3), fov: 44, local: true }, 1.2);
    yield g.hud.verse(part('1:10', 'Then were the men exceedingly afraid', 'Why hast thou done this?'), { block: true });
    for (const s of ring) s.pose = 'talk';
    yield g.hud.verse(part('1:11', 'What shall we do unto thee', 'calm unto us?'), { who: 'The mariners', block: true });
    p.setLockedPose('talk');
    g.cam.setShot({ pos: V(0.9, 1.6, 7.0), look: V(0, 1.25, 4.8), fov: 34, local: true }, 1.4);
    yield g.hud.verse(part('1:12', 'Take me up'), { who: 'Jonah', block: true });
    p.setLockedPose('idle');
  }

  /** 1:13. Nevertheless the men rowed hard to bring it to the land; but they could not. */
  private *pRowing(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'rowing';
    this.stormWant = 1.15;
    yield g.hud.fade(1, 0.45);
    const benches: [number, number][] = [
      [1, -5.2],
      [-1, -5.2],
      [1, -3.7],
      [-1, -3.7],
      [1, 6.2],
      [-1, 6.2],
    ];
    this.crew.forEach((s, i) => {
      const [side, z] = benches[i];
      const x = side * (hullHalf(z, 0.3) - 0.62);
      s.scripted = false;
      s.overboard = false;
      s.place(x, 0.42, z + 0.55, Math.PI, 'row');
      s.home.set(x, 0.42, z + 0.55);
      s.homeYaw = Math.PI;
      s.homePose = 'row';
    });
    this.master.place(1.05, QUARTER.y, -10.4, Math.PI, 'pull');
    this.clearDeck(V(0, 0, -4.4), 0);
    this.ship.showOars(true);
    this.ship.rowing = 1;
    p.teleport(V(0, 0.05, 5.4), Math.PI);
    p.unlock();
    g.cam.setShot(null, 0);
    g.cam.snap(p, 0);
    g.hud.cinema(false);
    this.landT = 0;
    yield g.hud.fade(0, 0.5);
    g.hud.verse(part('1:13', 'Nevertheless the men rowed hard', 'to the land'), { seconds: 4.5 });
    yield 5;
    yield* this.greatWave(this.crew[1]);
    yield 4.5;
    yield* this.greatWave(this.crew[4]);
    yield () => !this.anyOverboard() && !this.wave;
    yield 1.5;
    this.ship.rowing = 0.25;
    for (const s of this.crew) s.pose = 'sit';
    yield g.hud.verse(part('1:13', 'but they could not'), { block: true });
  }

  /** 1:14–16. They cry unto the LORD, take up Jonah, and cast him forth; and the sea ceases from her raging. */
  private *pCast(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'cast';
    this.stormWant = 1.1;
    g.hud.clearMarkers();
    g.hud.objective(null);
    if (p.carried) p.release(p.carried);
    yield g.hud.fade(1, 0.45);
    g.hud.cinema(true);
    this.ship.rowing = 0;
    this.ship.showOars(false);
    for (const line of this.ship.lines) line.loose = false;
    this.clearDeck(V(-1, 0, 5.6), 3.2);
    const all = [...this.crew, this.master];
    const spots: [number, number][] = [
      [-1.5, 6.3],
      [-1.5, 4.9],
      [0.6, 6.9],
      [0.9, 5.6],
      [0.6, 4.3],
      [2.0, 6.2],
      [2.0, 4.9],
    ];
    all.forEach((s, i) => {
      s.scripted = false;
      s.overboard = false;
      s.place(spots[i][0], 0, spots[i][1], Math.atan2(-0.4 - spots[i][0], 5.6 - spots[i][1]), 'cry');
    });
    p.teleport(V(-0.4, 0.02, 5.6), -Math.PI / 2);
    p.lock('idle');
    g.cam.setShot({ pos: V(3.9, 2.6, 9.4), look: V(-0.4, 1.0, 5.5), fov: 42, local: true }, 0);
    yield 0.3;
    yield g.hud.fade(0, 0.6);
    g.audio.cry();
    yield g.hud.verse(part('1:14', 'We beseech thee'), { who: 'The mariners', block: true });
    // they take him up
    const a = all[0];
    const b = all[1];
    a.pose = 'pull';
    b.pose = 'pull';
    for (const s of all.slice(2)) s.pose = 'idle';
    g.hud.verse(part('1:15', 'So they took up Jonah', 'into the sea'), { seconds: 5 });
    p.setLockedPose('lie');
    const side = -1;
    const railX = side * (hullHalf(5.6, 0.6) - 0.75);
    yield* tween(0.9, (k) => p.teleport(V(-0.4, lerp(0.02, 1.3, k), 5.6), -Math.PI / 2), ease.outQuad);
    a.scripted = b.scripted = true;
    const a0 = a.pos.clone();
    const b0 = b.pos.clone();
    g.cam.setShot({ pos: V(2.6, 2.4, 9.6), look: V(-2.2, 1.2, 5.6), fov: 44, local: true }, 2.2);
    yield* tween(
      2.2,
      (k) => {
        const x = lerp(-0.4, railX, k);
        p.teleport(V(x, 1.3 + Math.sin(k * 9) * 0.03, 5.6), -Math.PI / 2);
        a.pos.set(x, 0, a0.z);
        b.pos.set(x, 0, b0.z);
        a.yaw = b.yaw = -Math.PI / 2;
        a.fig.pose = b.fig.pose = 'run';
        a.fig.speed = b.fig.speed = 0.4;
        a.fig.phase += 0.03;
        b.fig.phase += 0.03;
      },
      ease.inOutQuad,
    );
    a.fig.pose = b.fig.pose = 'throw';
    g.audio.whoosh(1);
    const outX = side * (halfBeam(5.6) + 2.3);
    yield* tween(1.05, (k) => p.teleport(V(lerp(railX, outX, k), lerp(1.3, -1.9, k * k) + Math.sin(k * Math.PI) * 1.7, 5.6), -Math.PI / 2 + k * 2), (k) => k);
    // into the sea
    this.ship.toWorld(_v.set(outX, -1.5, 5.6), _w);
    _w.y = this.ocean.height(_w.x, _w.z);
    this.splashAt(_w, 2.4);
    p.figure.root.visible = false;
    p.figure.blob.visible = false;
    a.scripted = b.scripted = false;
    a.pose = b.pose = 'idle';
    yield 0.5;

    // ---- and the sea ceased from her raging
    this.phase = 'calm';
    this.stormWant = 0.05;
    g.audio.play('calm');
    g.audio.swell(98);
    g.hud.verse(part('1:15', 'and the sea ceased'), { seconds: 7 });
    const world: Shot = { pos: V(-13, 4.2, 15), look: V(-1, 1.6, 2), fov: 48 };
    g.cam.setShot(world, 4.5);
    yield* tween(7.5, (k) => {
      this.calm = k;
      this.applyMood();
      this.ship.flog = lerp(this.ship.flog, 0.02, k);
      g.audio.bed('wind', lerp(0.9, 0.08, k));
      g.audio.bed('rain', lerp(0.7, 0, clamp01(k * 2)));
      g.audio.bed('waves', lerp(0.9, 0.22, k));
      g.audio.intensity = lerp(1, 0.3, k);
      this.damage = lerp(this.damage, 0, k * 0.2);
    });
    g.audio.creakEvery = 6;
    this.meterOn = false;
    g.hud.meter('ship', null);
    // 1:16
    for (const s of all) {
      s.pose = 'stagger';
    }
    yield 0.6;
    all.forEach((s, i) => (s.pose = i % 3 === 0 ? 'bow' : i % 3 === 1 ? 'kneel' : 'pray'));
    g.cam.setShot({ pos: V(-24, 9.5, 21), look: V(0, 2.5, 0), fov: 44 }, 9);
    yield g.hud.verse(cite('1:16'), { block: true });
    yield 1.2;
    yield g.hud.fade(1, 1.4);
    this.phase = 'done';
    g.hud.cinema(false);
    g.complete(this.swept === 0);
  }

  // ---- jobs and dangers ----------------------------------------------------------------------------------------

  private loosen(i: number) {
    const line = this.ship.lines[i];
    if (line.loose) return;
    line.loose = true;
    this.g.audio.rope();
  }

  private looseCount() {
    return this.ship.lines.filter((l) => l.loose).length;
  }

  private anyOverboard() {
    return [...this.crew, this.master].some((s) => s.overboard || s.scripted);
  }

  /** Moves loose cargo away from where a scene is to be staged. */
  private clearDeck(at: THREE.Vector3, radius: number) {
    for (const prop of this.g.physics.props) {
      if (prop.held || prop.pos.y < -0.6) continue;
      if (radius <= 0 || Math.hypot(prop.pos.x - at.x, prop.pos.z - at.z) < radius) {
        const side = prop.pos.x >= 0 ? 1 : -1;
        const z = clamp(prop.pos.z < 2 ? -1.2 : 7.6, -5, 7.8) + this.rng.range(-0.5, 0.5);
        prop.teleport(_v.set(side * (hullHalf(z, 0.5) - 0.8), 0.6, z));
      }
    }
  }

  /** A great wave comes for a man at the rail. Runs until it has passed. */
  private *greatWave(victim: Sailor): Routine {
    const g = this.g;
    const side = Math.sign(victim.pos.x) || 1;
    const warn = g.story ? 9.5 : 7;
    const wave: Wave = { victim, side, t: warn, warn, hit: false, saved: false };
    this.wave = wave;
    const r = this.ocean.ridge;
    r.dirX = -side;
    r.dirZ = 0;
    r.width = 8.5;
    victim.stop('stagger');
    this.holdMan.progress = 0;
    this.strike(side > 0 ? Math.PI / 2 : -Math.PI / 2, true);
    g.audio.shout(1.3, 1.4);
    g.hud.toast(g.story ? 'A great wave! Run to him and hold him fast' : 'A great wave! Hold him fast', 3.2);
    while (wave.t > 0) {
      const dt: number = (yield) ?? 0;
      wave.t -= dt;
    }
    // it strikes
    wave.hit = true;
    const holding = (this.holdMan.progress ?? 0) > 0;
    wave.saved = holding;
    g.cam.shake(0.85);
    g.cam.fovKick = 5;
    g.audio.splash(3);
    g.audio.thud(1.4, 'wood');
    g.audio.creak(1.6);
    this.washDeck(side);
    this.damage += holding ? 0.01 : 0.03;
    if (!holding) {
      this.shove = 1;
      this.shoveSide = -side;
    }
    g.hud.marker('man', null);
    if (holding) {
      this.mend(0.03);
      victim.pose = 'cling';
      g.hud.toast('He is held fast');
      g.audio.good();
      g.run(function* () {
        yield 2.2;
        if (!victim.scripted) victim.goHome();
      });
    } else {
      this.swept++;
      this.damage += 0.05;
      g.audio.cry();
      g.run(() => this.sweep(victim, -side));
    }
    yield 2.6;
    yield* tween(1.2, (k) => (r.height = lerp(r.height, 0, k)));
    r.height = 0;
    r.at = -1e4;
    this.wave = null;
  }

  private washDeck(side: number) {
    const g = this.g;
    const n = Math.round(46 * g.quality.particles) + 10;
    for (let i = 0; i < 6; i++) {
      const z = -9 + i * 3.6 + this.rng.range(-1, 1);
      this.ship.toWorld(_v.set(side * (hullHalf(z, 0.8) + 0.2), 1.2, z), _w);
      g.fx.emit(_w, { count: n, color: 0xc8d8d8, color2: 0x8fb0b0, speed: 12, speedVar: 0.6, dir: V(-side, 0.55, 0), spread: 0.45, life: 1.2, gravity: 13, size: 0.42, opacity: 0.75, radius: 1.4, grow: 1.6, drag: 0.6 });
    }
  }

  private splashAt(world: THREE.Vector3, size: number) {
    const g = this.g;
    g.audio.splash(size);
    g.fx.emit(world, { count: Math.round(22 * size * g.quality.particles) + 6, color: 0xd0dede, color2: 0x8fb4b4, speed: 4.5 * Math.sqrt(size), dir: UP, spread: 0.5, life: 0.9, gravity: 12, size: 0.24 * size, opacity: 0.8, radius: 0.3 * size });
  }

  /** A man is carried across the deck and over the lee rail. He is not lost: a line can haul him back. */
  private *sweep(s: Sailor, toSide: number): Routine {
    const g = this.g;
    s.scripted = true;
    s.fig.pose = 'faint';
    const z = clamp(s.pos.z, -9, 9.5);
    const from = s.pos.clone();
    const rail = V(toSide * (hullHalf(z, 0.8) + 0.3), deckY(z) + 1.5, z + 0.6);
    const sea = V(toSide * (halfBeam(z) + 2.0), -1.9, z + 1.2);
    yield* tween(0.9, (k) => {
      s.pos.lerpVectors(from, rail, k);
      s.pos.y = lerp(from.y, rail.y, k * k) + Math.sin(k * Math.PI) * 0.3;
      s.yaw += 0.2;
    });
    yield* tween(0.55, (k) => {
      s.pos.lerpVectors(rail, sea, k);
      s.pos.y = lerp(rail.y, sea.y, k * k);
    });
    this.ship.toWorld(sea, _w);
    _w.y = this.ocean.height(_w.x, _w.z);
    this.splashAt(_w, 1.6);
    s.fig.pose = 'swim';
    s.overboard = true;
    s.yaw = Math.atan2(-toSide, 0);
    this.rescuing = s;
    this.rescueT = 0;
    this.rescue.pos.set(toSide * (hullHalf(z, 0.6) - 0.7), deckY(z), z + 1.2);
    this.rescue.progress = 0;
    g.hud.toast('A man is swept away! Throw him a line and haul him in', 3.6);
  }

  private *haul(s: Sailor): Routine {
    const g = this.g;
    if (!s.overboard) return;
    s.overboard = false;
    this.rescuing = null;
    g.hud.marker('rescue', null);
    g.audio.rope();
    const from = s.pos.clone();
    const toSide = Math.sign(from.x) || 1;
    const z = from.z;
    const rail = V(toSide * (hullHalf(z, 0.8) + 0.1), deckY(z) + 1.3, z);
    const deck = V(toSide * (hullHalf(z, 0.6) - 1.1), deckY(z), z);
    s.fig.pose = 'cling';
    yield* tween(1.1, (k) => s.pos.lerpVectors(from, rail, k), ease.inOutQuad);
    yield* tween(0.5, (k) => s.pos.lerpVectors(rail, deck, k), ease.outQuad);
    s.fig.pose = 'faint';
    g.audio.good();
    g.hud.toast('He is aboard again');
    yield 1.6;
    s.fig.pose = 'kneel';
    yield 1.2;
    s.scripted = false;
    if (this.phase === 'rowing') s.place(s.home.x, s.home.y, s.home.z, s.homeYaw, 'row');
    else s.goHome();
  }

  private castForth(prop: Prop) {
    const g = this.g;
    const mesh = prop.mesh;
    g.physics.removeProp(prop);
    g.root.attach(mesh);
    const y = this.ocean.height(mesh.position.x, mesh.position.z);
    this.splashAt(_v.set(mesh.position.x, y, mesh.position.z), 1.2);
    this.flotsam.push({ mesh, t: 0, spin: this.rng.range(-1, 1), vx: this.rng.range(-1.6, -0.6), vz: this.rng.range(-3.2, -1.6) });
    if (prop.data.ware && (this.phase === 'wares' || this.phase === 'jobs' || this.phase === 'chaos' || this.phase === 'rowing')) {
      this.cast++;
      this.mend(0.04);
      g.audio.tick(1.2);
    }
  }

  // ---- every step ----------------------------------------------------------------------------------------------

  override fixedUpdate(dt: number) {
    const g = this.g;
    const p = g.player;
    // What is "down" aboard a rolling ship: gravity leans, and the lean is felt a little more than it is.
    const d = this.ship.down;
    const lean = 1.45;
    g.physics.setGravity(d.x * GRAV * lean, d.y * GRAV, d.z * GRAV * lean);
    for (const prop of g.physics.props) if (!prop.held) prop.body.wakeUp();
    // the deck's slope pulls at his feet; a wave that finds him unbraced throws him across
    const pull = p.pos.y > -1 ? 2.4 : 1.2;
    p.push.set(d.x * pull, 0, d.z * pull);
    if (this.shove > 0) {
      this.shove = Math.max(0, this.shove - dt * 1.1);
      p.push.x += this.shoveSide * 9 * this.shove;
    }
    // wading
    p.speedScale = p.pos.y < -1.2 ? 1 - this.flood * 0.3 : 1;
  }

  override afterStep(_dt: number) {
    // cargo that has cleared the rail belongs to the sea
    const props = this.g.physics.props;
    for (let i = props.length - 1; i >= 0; i--) {
      const prop = props[i];
      if (prop.held) continue;
      const q = prop.pos;
      if (Math.abs(q.x) > halfBeam(q.z) + 0.3 || Math.abs(q.z) > 13.4 || q.y < -5) this.castForth(prop);
    }
  }

  override update(dt: number) {
    const g = this.g;
    const p = g.player;
    const time = g.engine.time;
    const ship = this.ship;

    // ---- the sea and the ship on it
    this.storm = damp(this.storm, this.stormWant, 0.5, dt);
    this.ocean.amp = this.storm;
    const wave = this.wave;
    if (wave) {
      const r = this.ocean.ridge;
      r.at = -wave.t * 15;
      if (!wave.hit) r.height = 4.6 * clamp01((wave.warn - wave.t) / 2.5);
    }
    this.ocean.time = time;
    let left = Math.min(dt, 0.25);
    while (left > 1e-5) {
      const h = Math.min(left, 1 / 60);
      ship.float(h, this.ocean, time);
      left -= h;
    }
    this.ocean.setShip(ship.group);
    this.ocean.update(time, g.engine.camera);
    const wind = clamp01(this.storm) * (1 - this.calm);
    ship.flog = damp(ship.flog, this.calm > 0 ? 0.02 : 0.3 + this.looseCount() * 0.2 + (this.lashLoose ? 0.4 : 0), 2, dt);
    ship.update(dt, wind);
    this.sky.update(time);
    this.rain.update(time, g.engine.camera);
    const below = p.pos.y < -1.2 && !g.cam.inShot;
    this.rain.uniforms.uOpacity.value = damp(this.rain.uniforms.uOpacity.value as number, (below ? 0.07 : 0.5) * (1 - clamp01(this.calm * 2.2)), 4, dt);
    if (this.calm === 0) this.ocean.setLook({ foamAmount: 0.3 + this.storm * 0.42 });

    // a lantern's light on the water alongside
    const lamp = ship.lanterns[0];
    ship.toWorld(lamp.at, this.ocean.uniforms.uLamp.value as THREE.Vector3);
    (this.ocean.uniforms.uLampColor.value as THREE.Color).setRGB(1, 0.66, 0.36).multiplyScalar(0.07 * (1 - this.calm));

    // ---- sound follows the weather
    if (this.calm === 0) {
      g.audio.bed('wind', (below ? 0.35 : 0.55) + this.storm * 0.35);
      g.audio.bed('rain', below ? 0.22 : 0.5 + this.storm * 0.2);
      g.audio.bed('waves', 0.5 + this.storm * 0.35);
      g.audio.intensity = clamp01(0.35 + this.storm * 0.45 + (wave ? 0.2 : 0));
      g.audio.creakEvery = lerp(3.4, 1.3, clamp01(this.storm));
    }

    // ---- lightning and thunder
    if (this.calm < 0.2) {
      this.nextStrike -= dt * (0.5 + this.storm);
      if (this.nextStrike <= 0) {
        this.strike();
        this.nextStrike = this.rng.range(4.5, 10);
      }
    }
    if (this.thunderIn > 0) {
      this.thunderIn -= dt;
      if (this.thunderIn <= 0) {
        g.audio.thunder(this.thunderDist);
        if (this.thunderDist < 0.45) g.cam.shake(0.22);
      }
    }
    this.boltT -= dt;
    this.bolt.visible = this.boltT > 0 && (this.boltT > 0.22 || Math.sin(this.boltT * 90) > -0.2);
    // a flash is two or three quick pulses, then gone
    const fl = this.flash > 0 ? this.flash * (0.55 + 0.45 * Math.abs(Math.sin(this.flash * 17))) : 0;
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.flashLight.intensity = fl * 9;
    this.flashLight.position.copy(ship.group.position).addScaledVector(this.flashDir, 60);
    this.flashLight.target.position.copy(ship.group.position);
    this.sky.uniforms.uFlash.value = fl;
    (this.sky.uniforms.uFlashDir.value as THREE.Vector3).copy(this.flashDir);
    this.ocean.uniforms.uFlash.value = fl * 0.8;
    (this.ocean.uniforms.uFlashDir.value as THREE.Vector3).copy(this.flashDir);
    g.engine.post.flash.setRGB(0.5, 0.57, 0.7).multiplyScalar(fl * 0.2);
    if (g.lights) g.lights.hemi.intensity = lerp(2.3, 2.6, this.calm) + fl * 4;

    // ---- spray: the bow coming down, rain on the planks
    const dPitch = (ship.pitch - this.lastPitch) / Math.max(dt, 1e-4);
    this.lastPitch = ship.pitch;
    this.sprayT -= dt;
    if (dPitch > 0.14 && ship.pitch > 0.02 && this.sprayT <= 0 && this.calm < 0.3) {
      this.sprayT = 1.1;
      for (const side of [1, -1]) {
        ship.toWorld(_v.set(side * 1.6, 0.6, 11.3), _w);
        g.fx.emit(_w, { count: Math.round(34 * g.quality.particles) + 8, color: 0xcfdcdc, color2: 0x9fb8b8, speed: 9, speedVar: 0.5, dir: V(side * 0.7, 1, -0.5), spread: 0.5, life: 1.3, gravity: 11, size: 0.4, opacity: 0.6, radius: 1, grow: 1.8, drag: 0.5 });
      }
      if (!below) g.audio.splash(1.4);
    }
    this.dripT -= dt;
    if (this.dripT <= 0 && !below && this.calm < 0.4) {
      this.dripT = 0.05 / Math.max(0.2, g.quality.particles);
      const z = p.pos.z + this.rng.range(-7, 7);
      const half = hullHalf(z, 0.5) - 0.3;
      if (half > 0.5) {
        ship.toWorld(_v.set(p.pos.x + this.rng.range(-5, 5), deckY(z) + 0.03, z).setX(clamp(p.pos.x + this.rng.range(-5, 5), -half, half)), _w);
        g.fx.emit(_w, { count: 3, color: 0xb8c8d0, speed: 1.6, dir: UP, spread: 0.6, life: 0.22, gravity: 9, size: 0.07, opacity: 0.55 });
      }
    }

    // ---- the hold's water
    this.flood = clamp01(this.flood + this.floodRate * dt * (g.story ? 0.6 : 1));
    this.holdWater.visible = this.flood > 0.015;
    if (this.holdWater.visible) {
      this.holdWater.position.set(0, HOLD_Y - 0.05 + this.flood * 0.8, 0);
      // level with the world, not with the ship: it runs to the low side
      _q.setFromUnitVectors(UP, _v.copy(ship.down).negate());
      this.holdWater.quaternion.slerp(_q, 1 - Math.exp(-3 * dt));
    }

    // ---- the meter
    if (this.meterOn && this.calm === 0) {
      const working = this.phase === 'wares' || this.phase === 'jobs' || this.phase === 'chaos' || this.phase === 'rowing';
      if (working && !g.hud.blocking) {
        this.damage += dt * (0.0032 * this.storm + this.looseCount() * 0.0028 + (this.lashLoose ? 0.003 : 0) + this.flood * 0.0055);
      }
      const cap = g.story ? 0.92 : 1;
      this.damage = Math.min(cap, this.damage);
      g.hud.meter('ship', { label: 'Ship damage', value: this.damage, text: this.damage > 0.8 ? 'like to be broken' : '', danger: this.damage > 0.72 });
      if (this.damage >= 1 && !this.failing && working) g.run(() => this.fail());
    }
    if (this.phase === 'rowing') {
      this.landT += dt;
      const land = clamp01(0.16 + Math.sin(this.landT * 0.9) * 0.05 - this.landT * 0.0022);
      g.hud.meter('land', { label: 'Toward the land', value: land, text: 'they could not' });
    } else g.hud.meter('land', null);

    // ---- the crew
    for (const s of this.crew) s.update(dt);
    this.master.update(dt);
    for (const s of [...this.crew, this.master]) {
      if (!s.overboard) continue;
      // he rides the water alongside
      ship.toWorld(_v.set(s.pos.x, 0, s.pos.z), _w);
      const h = this.ocean.height(_w.x, _w.z);
      s.pos.y = damp(s.pos.y, h - _w.y - 0.55, 6, dt);
      s.fig.phase += dt * 0.8;
    }
    if (this.rescuing?.overboard) {
      this.rescueT += dt;
      g.hud.marker('rescue', _v.copy(this.rescue.pos).setY(this.rescue.pos.y + 1.4), { frame: ship.group, urgent: true, label: 'Haul him in' });
      // his fellows have him out themselves if no one else comes
      if (this.rescueT > (g.story ? 7 : 16) || this.phase === 'lots' || this.phase === 'cast') {
        const s = this.rescuing;
        g.run(() => this.haul(s));
      }
    }
    if (wave && !wave.hit) {
      this.holdMan.pos.copy(wave.victim.pos);
      const held = (this.holdMan.progress ?? 0) > 0;
      wave.victim.pose = held ? 'cling' : 'stagger';
      g.hud.marker('man', _v.copy(wave.victim.pos).setY(wave.victim.pos.y + 2.1), { frame: ship.group, urgent: true, label: held ? 'Hold fast!' : 'Hold him fast', progress: 1 - wave.t / wave.warn });
    }

    // ---- markers and the objective
    const jobs = this.phase === 'jobs' || this.phase === 'chaos';
    ship.lines.forEach((line, i) => {
      if (line.loose && jobs) g.hud.marker(`line${i}`, _v.copy(line.pin).setY(line.pin.y + 1.3), { frame: ship.group, label: 'Loose line' });
      else g.hud.marker(`line${i}`, null);
    });
    if (jobs && this.flood > 0.3) g.hud.marker('bail', p.pos.y < -1.2 ? _v.copy(this.bail.pos).setY(HOLD_Y + 1.5) : _v.set(0, 0.9, HATCH.z1 - 0.4), { frame: ship.group, label: 'Bail the hold', urgent: this.flood > 0.7 });
    else g.hud.marker('bail', null);
    if (this.lashLoose) g.hud.marker('lash', _v.set(0, p.pos.y > 5 ? TOP_Y + 1.6 : 2.2, p.pos.y > 5 ? -1.6 : -0.5), { frame: ship.group, label: p.pos.y > 5 ? 'Lash the yard' : 'Climb to the yard' });
    this.setObjective();

    // ---- what the sea has taken
    for (let i = this.flotsam.length - 1; i >= 0; i--) {
      const f = this.flotsam[i];
      f.t += dt;
      f.mesh.position.x += f.vx * dt;
      f.mesh.position.z += f.vz * dt;
      const sea = this.ocean.height(f.mesh.position.x, f.mesh.position.z);
      const want = sea - Math.max(0, f.t - 5) * 0.5 - 0.1;
      f.mesh.position.y = f.t < 0.3 ? Math.min(f.mesh.position.y, want + 1) : damp(f.mesh.position.y, want, 5, dt);
      f.mesh.rotation.x += f.spin * dt * 0.6;
      f.mesh.rotation.z += f.spin * dt * 0.4;
      if (f.t > 11) {
        f.mesh.parent?.remove(f.mesh);
        this.flotsam.splice(i, 1);
      }
    }
  }

  private setObjective() {
    const g = this.g;
    let text: string | null = null;
    let sub = '';
    switch (this.phase) {
      case 'wares':
        text = 'Cast the wares into the sea';
        sub = `${Math.min(5, 5 - (this.castNeed - this.cast))} of 5 · carry them to the rail`;
        break;
      case 'jobs': {
        text = 'Keep the ship alive';
        const parts: string[] = [];
        if (this.looseCount()) parts.push(`${this.looseCount()} loose ${this.looseCount() === 1 ? 'line' : 'lines'}`);
        if (this.flood > 0.3) parts.push('water in the hold');
        sub = parts.join(' · ') || 'Hold on';
        break;
      }
      case 'chaos': {
        text = 'The sea is against you';
        const parts: string[] = [];
        if (this.looseCount()) parts.push(`${this.looseCount()} loose ${this.looseCount() === 1 ? 'line' : 'lines'}`);
        if (this.lashLoose) parts.push('the yard aloft');
        if (this.cast < this.castNeed) parts.push(`${this.castNeed - this.cast} wares`);
        if (this.flood > 0.3) parts.push('water in the hold');
        sub = parts.join(' · ') || 'Hold on';
        break;
      }
      case 'rowing':
        text = 'The men row for the land';
        sub = 'Hold them fast when the waves come';
        break;
      default:
        return;
    }
    const key = `${text}|${sub}`;
    if (key !== this.objectiveKey) {
      this.objectiveKey = key;
      g.hud.objective(text, sub);
    }
  }

  /** Normal only: the ship can take no more. The work is taken up again a little way back; nothing is lost. */
  private *fail(): Routine {
    const g = this.g;
    this.failing = true;
    g.audio.bad();
    g.cam.shake(0.8);
    yield g.hud.fade(1, 0.6);
    g.hud.toast('The ship was like to be broken. Take heart, and to the work again', 4);
    this.damage = 0.6;
    this.flood = Math.min(this.flood, 0.3);
    for (const line of this.ship.lines) line.loose = false;
    this.lashLoose = false;
    yield 0.8;
    yield g.hud.fade(0, 0.8);
    this.failing = false;
  }

  // ---- the automated player ------------------------------------------------------------------------------------

  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const urgent = () => (!!this.wave && !this.wave.hit) || !!this.rescuing?.overboard;
    const below = () => p.pos.y < -1.2;
    const self = this;
    /** Walks to a place on the open decks or in the hold, by the stair when the level changes. */
    function* to(x: number, y: number, z: number, opts: { dist?: number; rush?: boolean } = {}): Routine {
      const until = opts.rush ? undefined : urgent;
      const wantBelow = y < -1.2;
      if (wantBelow !== below()) {
        if (wantBelow) {
          yield* deck(0, HATCH.z1 + 0.7, until);
          yield* b.goTo(V(0, HOLD_Y, 0.3), { dist: 0.5, timeout: 8, until });
        } else {
          yield* b.goTo(V(0, HOLD_Y, 0.35), { dist: 0.5, timeout: 10, until });
          yield* b.goTo(V(0, 0, HATCH.z1 + 0.9), { dist: 0.5, timeout: 8, until });
        }
      }
      if (wantBelow) yield* b.goTo(V(x, y, z), { dist: opts.dist ?? 0.6, timeout: 10, until });
      else yield* deck(x, z, until, opts.dist);
    }
    /** Across the open deck, round the hatch and the mast. */
    function* deck(x: number, z: number, until?: () => boolean, dist = 0.6): Routine {
      const fz = p.pos.z;
      const mid = (v: number) => v > -3.2 && v < HATCH.z1 + 0.5;
      const crosses = (fz < -3.2 && z > -3.2) || (fz > HATCH.z1 + 0.5 && z < HATCH.z1 + 0.5) || ((mid(fz) || mid(z)) && Math.abs(z - fz) > 0.8 && (Math.abs(p.pos.x) < 1.5 || Math.abs(x) < 1.5));
      if (crosses) {
        const side = Math.abs(x) > 0.6 ? Math.sign(x) : Math.abs(p.pos.x) > 0.6 ? Math.sign(p.pos.x) : 1;
        if (!mid(z) || Math.abs(x) >= 1.5) {
          yield* b.goTo(V(side * 1.9, 0, clamp(fz, -11, 11)), { dist: 0.5, timeout: 6, until });
          yield* b.goTo(V(side * 1.9, 0, clamp(z, -5.5, 7.6)), { dist: 0.6, timeout: 8, until });
        }
      }
      yield* b.goTo(V(x, deckY(z), z), { dist, timeout: 9, until });
    }
    function* holdMan(): Routine {
      const w = self.wave;
      if (!w || w.hit) return;
      if (p.carried) yield* b.setDown();
      const v = w.victim;
      const inboard = -Math.sign(v.pos.x || 1) * 0.9;
      yield* to(v.pos.x + inboard, v.pos.y, v.pos.z, { dist: 0.7, rush: true });
      b.input.action = true;
      while (self.wave === w && !w.hit) yield;
      yield 0.3;
      b.input.action = false;
      yield 0.2;
    }
    function* rescue(): Routine {
      const s = self.rescuing;
      if (!s) return;
      if (p.carried) yield* b.setDown();
      yield* to(self.rescue.pos.x, self.rescue.pos.y, self.rescue.pos.z, { dist: 0.8, rush: true });
      b.input.action = true;
      let t = 0;
      while (self.rescuing === s && s.overboard && t < 6) t += ((yield) as number) ?? 0;
      b.input.action = false;
      yield 0.2;
    }
    function* useAt(it: Interactable, seconds: number): Routine {
      yield* to(it.pos.x, it.pos.y, it.pos.z, { dist: 0.9 });
      if (urgent()) return;
      b.input.action = true;
      let t = 0;
      while (t < seconds && (!it.enabled || it.enabled()) && !urgent()) t += ((yield) as number) ?? 0;
      b.input.action = false;
      yield 0.15;
    }

    yield* b.until(() => this.phase !== 'asleep' && !p.locked, 90, 'the waking');
    // the scroll behind the cargo below
    if (this.from('wake')) {
      yield* b.goTo(V(0.2, HOLD_Y, 6.2), { timeout: 12 });
      yield* b.goTo(V(0.1, HOLD_Y + 0.8, 8.2), { timeout: 5, noAssist: true, jump: () => p.pos.z > 6.9 && p.grounded });
      yield 0.5;
      if (!g.scrolls.pieces[0].found) b.assist('could not reach the scroll in the hold');
      yield* to(0, 0, 6);
    }
    let idle = 0;
    for (;;) {
      if (this.phase === 'done') break;
      if (p.locked || g.hud.blocking || g.hud.inCinema) {
        b.stop();
        b.input.action = this.lotAsk;
        yield 0.1;
        continue;
      }
      if (this.wave && !this.wave.hit) {
        yield* holdMan();
        continue;
      }
      if (this.rescuing?.overboard) {
        yield* rescue();
        continue;
      }
      const working = this.phase === 'wares' || this.phase === 'jobs' || this.phase === 'chaos';
      if (working) {
        // the top first: the yard, and the scroll up there
        if (this.lashLoose || (this.phase !== 'wares' && !g.scrolls.pieces[1].found && this.looseCount() === 0)) {
          yield* to(0, 0, 0.1, { dist: 0.35 });
          if (urgent()) continue;
          yield* b.goTo(V(0, TOP_Y, -1.6), { dist: 0.5, timeout: 9, until: urgent });
          if (p.pos.y > 6) {
            yield* b.goTo(V(0.5, TOP_Y, -2.3), { dist: 0.3, timeout: 2, noAssist: true });
            if (this.lashLoose) yield* useAt(this.lash, 3);
            yield* b.goTo(V(0, TOP_Y, 0.4), { dist: 0.4, timeout: 3, noAssist: true });
            yield 0.9;
          }
          continue;
        }
        const line = this.lineJobs.find((it) => it.enabled!());
        if (line) {
          yield* useAt(line, 2.5);
          continue;
        }
        if (this.flood > 0.3 && this.floodRate >= 0) {
          yield* to(this.bail.pos.x - 0.3, HOLD_Y, this.bail.pos.z, { dist: 0.6 });
          while (this.flood > 0.06 && !urgent() && below()) {
            b.input.action = true;
            yield 0.56;
            b.input.action = false;
            yield 0.08;
          }
          continue;
        }
        if (this.cast < this.castNeed || this.phase === 'wares') {
          const wares = g.physics.props.filter((q) => q.data.ware && !q.held && q.pos.y > -0.6 && q.pos.y < 2);
          wares.sort((x, y) => x.pos.distanceTo(p.pos) - y.pos.distanceTo(p.pos));
          const w = p.carried ?? wares[0];
          if (w) {
            if (!p.carried) {
              yield* to(w.pos.x, 0, w.pos.z, { dist: 1.5 });
              if (urgent()) continue;
              yield* b.take(w);
            }
            const side = Math.sign(p.pos.x) || 1;
            const z = clamp(p.pos.z, -5.5, 7.8);
            yield* deck(side * (hullHalf(z, 0.5) - 0.9), z, urgent, 0.5);
            if (urgent()) continue;
            if (p.carried && this.atRail()) yield* b.tap('action', 0.08);
            else if (p.carried) yield* b.throw(0.6);
            yield 0.4;
            continue;
          }
        }
        // nothing pressing: the scroll at the bow
        if (!g.scrolls.pieces[2].found) {
          yield* to(1.6, 0, 7.2);
          yield* b.goTo(V(0.4, FORE.y, 10), { timeout: 5, until: urgent });
          yield* b.goTo(V(0, FORE.y, 11.9), { timeout: 4, until: urgent, noAssist: true });
          continue;
        }
      }
      idle += 0.3;
      yield 0.3;
      if (this.phase === 'rowing' && idle > 2) {
        // keep amidships, near the rowers
        yield* deck(0.2, -1.2, urgent, 1.2);
        idle = 0;
      }
    }
  }

  override dispose() {
    const g = this.g;
    this.sky.dispose();
    this.ocean.dispose();
    this.rain.dispose();
    this.ship.dispose();
    for (const s of this.crew) s.dispose();
    this.master.dispose();
    this.bolt.geometry.dispose();
    (this.bolt.material as THREE.Material).dispose();
    this.holdWater.geometry.dispose();
    (this.holdWater.material as THREE.Material).dispose();
    g.audio.creakEvery = 0;
    void MAST_Z;
  }
}
