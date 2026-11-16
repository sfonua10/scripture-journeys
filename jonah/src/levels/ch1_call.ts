// Chapter 1: The Call (Jonah 1:1–3).
//
// What the account says: the word of the LORD came unto Jonah the son of Amittai (1), saying, Arise, go to Nineveh,
// that great city, and cry against it (2). But Jonah rose up to flee unto Tarshish from the presence of the LORD,
// and went down to Joppa (3, its first part; the ship and the fare are Chapter 2's).
//
// Who goes: Jonah, alone. Who stays: everyone else; the people in the market are passers-by. Who speaks: only the
// LORD, and that word (1:2) is shown as the verse itself and is nowhere retold or shortened. Nobody answers, nobody
// follows him, nobody pursues.
//
// The game's own: the town (these verses do not name it, and neither does the game), its rooftops and market, the
// wind against him, and that he runs. Nineveh lies to the east: the road east is left behind at his first step, and
// he goes west and down, to the sea.
import * as THREE from 'three';
import type { Routine } from '../core/script';
import { tween } from '../core/script';
import { Rng, clamp, clamp01, damp, ease, fbm2, lerp, smoothstep } from '../core/util';
import type { Bot } from '../game/bot';
import { Chapter } from '../game/chapter';
import { cite, part } from '../game/verses';
import { LevelBuilder, buildMesh } from '../gfx/build';
import { Figure, mariner } from '../gfx/character';
import { CALM_WAVES, Ocean, type OceanLook } from '../gfx/ocean';
import { Motes, Rain } from '../gfx/particles';
import { Sky, makeLights } from '../gfx/sky';
import type { Shot } from '../player/camera';
import { CLOTH, DARKWOOD, PLASTER, Town, WOOD } from './ch1_town';

type Phase = 'call' | 'roofs' | 'market' | 'climb' | 'wind' | 'slide' | 'road' | 'done';
const ORDER: Phase[] = ['call', 'roofs', 'market', 'climb', 'wind', 'slide', 'road', 'done'];

/** The hilltop's ground above the sea. Everything in the town is given from the hilltop (0) and lifted by this. */
const Y = 84;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** A place given in the town's own heights. */
const L = (x: number, y: number, z: number) => new THREE.Vector3(x, Y + y, z);

/** Half the width of the way over the roofs. */
const HX = 5.5;
/** The town steps down toward the west: the level of the streets at `z`. */
const groundAt = (z: number) => (z < 60 ? 0 : z < 124 ? -3 : z < 165 ? -5.5 : z < 205 ? -8 : -10.5);
const LANE = -3;

interface Roof {
  name: string;
  z0: number;
  z1: number;
  top: number;
  /** Where along the east wall a ladder stands, for one who fell into the alley behind. */
  ladder?: number;
  /** Stands against the house before it (no alley between). */
  joined?: boolean;
  lips?: string;
}

/** The houses he crosses, east to west. */
const COURSE: Roof[] = [
  { name: 'H0', z0: -5, z1: 5, top: 4.0, lips: 'blr' },
  { name: 'H1', z0: 6.8, z1: 15, top: 4.0, ladder: 1.85 },
  { name: 'H2', z0: 17.8, z1: 26, top: 3.4, ladder: -1.85 },
  { name: 'H3', z0: 26, z1: 35, top: 5.3, joined: true },
  { name: 'H4', z0: 38.3, z1: 47, top: 4.6, ladder: 1.85 },
  { name: 'H5', z0: 49.6, z1: 58, top: 6.4, ladder: -1.85, lips: 'l' },
  { name: 'R1', z0: 124, z1: 134, top: 3.5, joined: true },
  { name: 'R2', z0: 137, z1: 146, top: 2.0, ladder: 1.85 },
  { name: 'R3', z0: 152, z1: 161, top: 1.6, ladder: -1.85 },
  { name: 'R4', z0: 164.2, z1: 172, top: -0.8, ladder: 1.85 },
  { name: 'T', z0: 172, z1: 178, top: 4.2, joined: true },
  { name: 'R5', z0: 182.5, z1: 192, top: -0.4, ladder: -1.85, lips: 'l' },
  { name: 'R6', z0: 194.8, z1: 206, top: -1.4, ladder: 1.85 },
  { name: 'R7', z0: 209, z1: 218, top: -2.8, ladder: -1.85 },
  { name: 'R8', z0: 218, z1: 228, top: -1.0, joined: true },
  { name: 'W', z0: 231.2, z1: 237, top: -2.2, ladder: 1.85 },
];
const roof = (name: string) => COURSE.find((r) => r.name === name)!;
/** The town wall's outer face. */
const WALL_Z = 240;

// ---- the slope down to the plain -----------------------------------------------------------------------------------

const T0 = 246;
const T1 = 486;
/** Where the track's middle runs at `z`. */
const trackX = (z: number) => 11 * Math.sin((z - T0) / 36) * smoothstep(T0, 288, z) * (1 - smoothstep(438, T1, z));
/** The height of the track's middle at `z` (the town's heights). */
const trackY = (z: number) => {
  const t = clamp01((z - T0) / (T1 - T0));
  return -10.5 - 69.5 * t * t * (3 - 2 * t);
};
const PLAIN = -80;
/** The hillside's height `u` metres to the side of the track's middle. */
function slopeY(u: number, z: number): number {
  const a = Math.abs(u);
  const shape = smoothstep(WALL_Z, 264, z) * (1 - smoothstep(452, 492, z));
  const base = trackY(z);
  if (a <= 5.5) return base + 0.012 * a * a * shape;
  const bank = 0.36 + Math.min(a - 5.5, 4) * 0.75;
  if (a <= 9.5) return base + bank * shape;
  const x = trackX(z) + u;
  const roll = (fbm2(x * 0.021 + 7, z * 0.021) - 0.5) * 16 * smoothstep(9.5, 44, a);
  const top = base + bank * shape + roll * (0.35 + 0.65 * shape) + (a - 9.5) * 0.03;
  return lerp(top, PLAIN - 0.3, smoothstep(46, 150, a));
}
/** Stones that stand in the track: [to the side of its middle, z, radius]. */
const ROCKS: [number, number, number][] = [
  [-3.2, 276, 1.2],
  [3.6, 291, 1.3],
  [0.4, 324, 1.4],
  [-4.0, 339, 1.1],
  [3.4, 372, 1.3],
  [-1.8, 386, 1.2],
  [4.2, 399, 1.1],
  [-3.4, 433, 1.3],
  [2.6, 448, 1.2],
];
/** Ledges of rock that throw him into the air. */
const HOPS = [303, 356, 414];
const SLIDE_FROM = 251;
const SLIDE_TO = 474;

// ---- the wind ------------------------------------------------------------------------------------------------------

const LULL = 3.8;
const WARN = 0.9;
const BLOW = 1.7;

interface Bouncer {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** The cloth's top, in the world. */
  top: number;
  speed: number;
  mesh: THREE.Object3D;
  dip: number;
  dipV: number;
}

interface Dove {
  flock: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  /** 0 on the ground, 1 in the air, 2 gone. */
  state: number;
  t: number;
  seed: number;
}

const SUN = V(0.3, 0.4, -0.87).normalize();
const SEA: OceanLook = {
  deep: 0x1c5a86,
  shallow: 0x3f98b4,
  glow: 0x86d6cc,
  foam: 0xf6f1e2,
  skyTop: 0x4a86c4,
  skyHorizon: 0xf0dcb6,
  sunDir: SUN,
  sunColor: 0xffe2b0,
  spec: 0.5,
  ambient: 0.8,
  foamAmount: 0.22,
};

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _e = new THREE.Euler();
const WEST = V(0, 0, 1);

export class Call extends Chapter {
  private phase: Phase = 'call';
  private seek: Phase | null = null;
  private sky!: Sky;
  private ocean!: Ocean;
  /** Where the far sea is centred (the ocean follows a camera; this one stays out to sea). */
  private seaAt = new THREE.PerspectiveCamera();
  private motes!: Motes;
  private streaks!: Rain;
  private rng = new Rng(41);
  private figures: Figure[] = [];
  private bouncers: Bouncer[] = [];
  private flags: { obj: THREE.Object3D; phase: number; reach: number }[] = [];
  private ladders: { x: number; z: number; y0: number; y1: number }[] = [];
  private doves: Dove[] = [];
  private flocks: { at: THREE.Vector3; flown: boolean }[] = [];
  private doveMesh!: THREE.InstancedMesh;

  // the wind
  private windOn = false;
  private gustT = 0;
  private gustState: 'lull' | 'warn' | 'blow' = 'lull';
  /** 0..1: how hard it blows now. */
  private gust = 0;
  private gustSide = 1;
  private sheltered = false;
  /** How long this time in the air he has been pushed by a gust. */
  private airGust = 0;
  private lastRoofY = 0;
  private wasGrounded = true;
  private blown = 0;
  private dustT = 0;

  // the slope
  private sliding = false;
  private lastZ = 0;
  private told = new Set<string>();

  // ---- building ------------------------------------------------------------------------------------------------

  build() {
    const g = this.g;
    const q = g.quality;
    const seek = g.params.get('seek') as Phase | null;
    if (seek && ORDER.includes(seek)) this.seek = seek;

    this.sky = new Sky({ top: 0x3f7cc0, horizon: 0xf3dcb0, bottom: 0xd8c49c, sunDir: SUN, sunColor: 0xfff0cc, sunSize: 0.04, sunGlow: 1.25, cloudCover: 0.3, cloudLit: 0xfff4e2, cloudDark: 0xd6bfa6, cloudSpeed: 2.2, stars: 0 });
    g.root.add(this.sky.mesh);
    // (a sea seen from miles off needs few squares)
    this.ocean = new Ocean(72, SEA, CALM_WAVES, { radius: 900, low: q.level === 'low' });
    this.ocean.amp = 0.3;
    this.seaAt.position.set(0, 0, 1500);
    g.root.add(this.ocean.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: SUN, sunColor: 0xffdcaa, sunIntensity: 2.7, skyColor: 0xbcd4f4, groundColor: 0xc9a273, hemiIntensity: 1.05, shadowSize: q.shadowSize, shadowRange: 34 });
    g.engine.setView(2600, 120, 1500, 0xf0dcb6);
    const grade = g.engine.post.grade;
    grade.tint.setRGB(1.03, 1.0, 0.95);
    grade.lift.setRGB(0.02, 0.014, 0.004);
    grade.saturation = 1.1;
    grade.contrast = 1.05;
    grade.vignette = 0.3;
    grade.bloom = 0.32;
    grade.threshold = 0.86;
    grade.exposure = 1.0;

    // ---- the town
    const b = new LevelBuilder(g.physics, 11);
    b.chunk = 96;
    const t = new Town(b, Y);
    this.buildGround(b);
    this.buildCourse(b, t);
    this.buildSides(b, t);
    this.buildFirstRoofs(b, t);
    this.buildMarket(b, t);
    this.buildWindRoofs(b, t);
    this.buildWall(b, t);
    this.buildTownBeyond(b, t);
    g.root.add(b.finish('town'));

    // ---- the hill, the plain, Joppa and the sea
    const far = new LevelBuilder(g.physics, 23);
    far.chunk = 1e6;
    this.buildSlope(far);
    this.buildFar(far);
    g.root.add(far.finish('far'));

    const p = g.spawnPlayer(L(0, 4.05, -3.4), Math.PI);
    p.killY = -20;
    p.climbZones.push(...t.climbs);
    g.cam.dist = 7.6;
    g.cam.hint = (at) => this.cameraHint(at);
    g.cam.snap(p, 0);

    this.buildLife();

    const rec = g.save.record(1);
    g.scrolls.add(0, L(10.7, 8.35, 56.2), 'Proverbs 16:9', g.root, rec.scrolls[0]);
    g.scrolls.add(1, L(4.5, 1.65, 114.2), 'Psalm 139:7', g.root, rec.scrolls[1]);
    g.scrolls.add(2, L(8.7, -6.95, 188.3), 'Jeremiah 23:24', g.root, rec.scrolls[2]);

    this.motes = new Motes(Math.round(220 * q.particles), { color: 0xfff0cc, size: 0.075, opacity: 0.5, box: V(34, 16, 34), velocity: V(0.2, 0.05, -0.9), wander: 0.6 });
    g.root.add(this.motes.object);
    this.streaks = new Rain(Math.round(380 * q.particles), V(36, 13, 36));
    this.streaks.uniforms.uVel.value = V(0, -0.8, -27);
    this.streaks.uniforms.uLen.value = 2.8;
    (this.streaks.uniforms.uColor.value as THREE.Color).set(0xfff6e0);
    this.streaks.uniforms.uOpacity.value = 0;
    g.root.add(this.streaks.object);
    g.audio.bed('wind', 0.2);

    if (this.seek && this.seek !== 'call') this.placeFor(this.seek);
  }

  private buildGround(b: LevelBuilder) {
    const pave = 0xd9c49a;
    const steps: [number, number][] = [
      [-72, 60],
      [60, 124],
      [124, 165],
      [165, 205],
      [205, WALL_Z + 0.5],
    ];
    for (const [z0, z1] of steps) {
      const top = groundAt((z0 + z1) / 2);
      b.block(0, Y - 14, (z0 + z1) / 2, 132, top + 14, z1 - z0, pave, { mat: 'sand', jitter: 0.02, shade: 0.12, noLedge: true });
    }
    // the unseen sides of the way, from the first house to the wall
    const tall = 44;
    const mid = Y + 8;
    b.wall(-HX - 0.1, mid, 117.5, 0.2, tall, 245.6);
    for (const [z0, z1] of [
      [-5.3, 49.6],
      [58, 184],
      [191, WALL_Z + 0.3],
    ]) b.wall(HX + 0.1, mid, (z0 + z1) / 2, 0.2, tall, z1 - z0);
    b.wall(0, mid, -5.1, 11.4, tall, 0.2);
  }

  /** The houses of the way, with a ladder in every alley. */
  private buildCourse(b: LevelBuilder, t: Town) {
    COURSE.forEach((r, i) => {
      const ground = Math.min(groundAt(r.z0), groundAt(r.z1));
      t.house({ x0: -HX, x1: HX, z0: r.z0, z1: r.z1, ground, top: r.top, color: PLASTER[i % PLASTER.length], lips: r.lips ?? 'lr', faces: r.joined ? 'f' : 'fb', vigas: i % 2 === 0 });
      if (r.ladder !== undefined) {
        const y0 = groundAt(r.z0 - 0.6);
        t.ladder(r.ladder, r.z0, y0, r.top, 0, -1);
        this.ladders.push({ x: r.ladder, z: r.z0, y0, y1: r.top });
      }
    });
  }

  /** The houses to either side of the way: its walls in the alleys, its skyline on the roofs. */
  private buildSides(b: LevelBuilder, t: Town) {
    const rng = b.rng;
    const level = (z: number) => {
      if (z > 58 && z < 124) return LANE + rng.range(6.4, 9.6);
      let best = COURSE[0];
      for (const r of COURSE) if (Math.abs((r.z0 + r.z1) / 2 - z) < Math.abs((best.z0 + best.z1) / 2 - z)) best = r;
      return best.top + rng.pick([-2.4, -1.5, -0.7, 0.9, 1.7, 2.6, 3.4]);
    };
    const row = (side: number, from: number, to: number) => {
      let z = from;
      while (z < to - 0.01) {
        let len = rng.range(6.2, 10.4);
        if (to - (z + len) < 4.5) len = to - z;
        const ground = Math.min(groundAt(z), groundAt(z + len));
        const top = Math.max(ground + 3.2, level(z + len / 2));
        const depth = rng.range(6.4, 8.8);
        const inner = side > 0 ? 'l' : 'r';
        const inLane = z + len / 2 > 60 && z + len / 2 < 122;
        t.house({ x0: side > 0 ? HX : -HX - depth, x1: side > 0 ? HX + depth : -HX, z0: z, z1: z + len, ground, top, lips: rng.chance(0.6) ? 'fblr' : '', faces: inner + 'fb', door: inLane && rng.chance(0.7) ? (inner as 'l' | 'r') : null, vigas: rng.chance(0.5), noLedge: true });
        const mx = side * (HX + depth / 2);
        const mz = z + len / 2;
        if (rng.chance(0.2) && len > 7) t.dome(mx, top, mz, Math.min(depth, len) * 0.3);
        else if (rng.chance(0.4)) for (let i = 0; i < 3; i++) t.pot(mx + rng.range(-2, 2), top, mz + rng.range(-2.5, 2.5), rng.chance(0.7));
        z += len;
      }
    };
    row(-1, -9, WALL_Z - 3);
    row(1, -9, 49.6);
    row(1, 58, 184);
    row(1, 191, WALL_Z - 3);
  }

  /** The first roofs: where he was, and the side roof that hides a scroll piece. */
  private buildFirstRoofs(b: LevelBuilder, t: Town) {
    // his own roof: a booth of poles and cloth, a mat, jars
    const top = 4;
    t.awning(-4.6, -1.6, 0.6, 4.2, top + 2.3, CLOTH.cream, CLOTH.olive, { collide: false, along: 'z' });
    for (const [x, z] of [
      [-4.5, 0.7],
      [-1.7, 0.7],
      [-4.5, 4.1],
      [-1.7, 4.1],
    ]) t.pole(x, z, top, top + 2.25);
    b.box(-3.1, Y + top + 0.06, 2.4, 1.9, 0.06, 2.6, 0xb4543a, { mat: 'weave', collide: false, shade: 0 });
    t.pot(4.4, top, -3.8);
    t.pot(4.5, top, 3.6, false);
    // the side roof by the sixth house, a step up, with a dome to hide what lies behind it
    t.house({ x0: HX, x1: 12, z0: 49.6, z1: 58, ground: 0, top: 7.3, color: PLASTER[2], lips: 'fbr', faces: 'fb' });
    t.dome(8.5, 7.3, 52.6, 1.6, 0xf4ecd6, { collide: true });
    t.pot(6.4, 7.3, 50.6);
    t.pot(11.2, 7.3, 51.2);
    b.wall(12.1, Y + 12, 53.8, 0.2, 30, 8.8);
    b.wall(8.9, Y + 12, 49.5, 6.8, 30, 0.2);
    b.wall(8.9, Y + 12, 58.1, 6.8, 30, 0.2);
  }

  /** The market lane, from under the sixth house to the vine wall. */
  private buildMarket(b: LevelBuilder, t: Town) {
    const g = this.g;
    // the awning he lands on, coming down from the roofs
    this.bouncer(-2.6, 2.6, 60.2, 63.8, LANE + 2.7, 13, CLOTH.terracotta, CLOTH.cream, t);
    // stalls along the walls
    t.stall(67.2, -1, -HX, LANE, CLOTH.ochre, CLOTH.cream);
    t.stall(72.4, 1, HX, LANE, CLOTH.olive, CLOTH.cream);
    t.stall(87.4, -1, -HX, LANE, CLOTH.blue, CLOTH.cream);
    t.stall(90.2, 1, HX, LANE, CLOTH.terracotta, CLOTH.ochre);
    t.stall(113.5, -1, -HX, LANE, CLOTH.wine, CLOTH.cream);
    // a low awning across the whole lane: under it, or over it
    t.awning(-HX, HX, 78, 82.2, LANE + 1.23, CLOTH.wine, CLOTH.cream, { along: 'x', noLedge: true, thick: 0.12 });
    for (const x of [-HX + 0.15, HX - 0.15]) for (const z of [78.1, 82.1]) t.pole(x, z, LANE, LANE + 1.3, true, 0.07);
    // a room built over the lane, and a loaded cart stood in its gate: the only way is beneath the cart
    const bridge = PLASTER[1];
    b.block(0, Y + LANE + 3.3, 97, 11, 4.9, 5, bridge, { mat: 'plaster', shade: 0.2 });
    for (const s of [-1, 1]) b.block(s * 3.6, Y + LANE, 97, 3.8, 3.3, 5, bridge, { mat: 'plaster', shade: 0.2, noLedge: true });
    b.box(0, Y + LANE + 3.42, 94.4, 4.2, 0.28, 0.3, WOOD, { mat: 'wood', collide: false });
    b.box(0, Y + LANE + 3.42, 99.6, 4.2, 0.28, 0.3, WOOD, { mat: 'wood', collide: false });
    for (const x of [-2.6, 2.6]) b.box(x, Y + LANE + 5.6, 94.46, 0.7, 1.0, 0.08, 0x3a2a1e, { collide: false, shade: 0 });
    t.cart(0, 97, LANE, { clear: 1.12, load: 'sacks', loadH: 1.5, width: 2.5, length: 2.9 });
    // crates to climb, a blue awning that throws him up, and a balcony with a scroll piece on it
    b.block(4.55, Y + LANE, 104.4, 1.7, 1.0, 1.7, 0x9a7044, { mat: 'wood', jitter: 0.08 });
    b.block(4.9, Y + LANE, 102.9, 1.0, 0.55, 1.0, 0x8a6238, { mat: 'wood', jitter: 0.08 });
    this.bouncer(2.7, HX, 105.6, 109.6, LANE + 2.1, 16, CLOTH.blue, CLOTH.cream, t);
    b.block(4.45, Y + 0.25, 113.6, 2.1, 0.4, 5.2, 0xd9c08c, { mat: 'plaster' });
    for (const z of [111.4, 115.8]) b.box(4.9, Y - 0.1, z, 1.0, 0.5, 0.2, WOOD, { mat: 'wood', collide: false, rot: new THREE.Euler(0, 0, 0.5) });
    b.block(3.5, Y + 0.65, 113.9, 0.12, 0.5, 4.5, WOOD, { mat: 'wood', noLedge: true });
    for (const z of [111.7, 113.9, 116.1]) t.pole(3.5, z, 0.65, 1.45, false, 0.05);
    b.box(3.5, Y + 1.47, 113.9, 0.1, 0.08, 4.6, WOOD, { mat: 'wood', collide: false });
    // the vine wall at the lane's end
    t.vines(0, 124, LANE, roof('R1').top, 1.7, 0, -1);
    // lines of washing high across the lane
    for (const [z, y] of [
      [65.6, 3.6],
      [74.6, 2.8],
      [85.4, 3.4],
      [103.2, 3.9],
      [119.4, 3.0],
    ]) this.washing(-HX, HX, y, z, 1);
    // things to knock over
    const lane = Y + LANE;
    g.toys.basket(-2.6, lane + 0.3, 69.4);
    g.toys.basket(-1.9, lane + 0.3, 70.3);
    g.toys.jar(2.9, lane + 0.45, 75.6);
    g.toys.jar(3.5, lane + 0.45, 76.4);
    g.toys.basket(1.2, lane + 0.3, 86.0);
    g.toys.jar(-3.0, lane + 0.45, 91.6);
    g.toys.sack(-2.6, lane + 0.3, 101.6);
    g.toys.basket(-1.2, lane + 0.3, 108.2);
    g.toys.jar(-2.4, lane + 0.45, 118.4);
    g.toys.jar(2.6, lane + 0.45, 120.2);
    t.palm(-3.9, LANE, 121.6, 6.4);
  }

  /** The roofs in the wind, from the top of the vine wall to the town wall. */
  private buildWindRoofs(b: LevelBuilder, t: Town) {
    const g = this.g;
    // a hut on the second roof to stand behind
    b.block(-3.9, Y + 2.0, 143.8, 2.6, 2.1, 2.5, PLASTER[3], { mat: 'plaster', noLedge: true });
    b.box(-3.9, Y + 4.14, 143.8, 2.9, 0.1, 2.8, 0xd2ba8a, { mat: 'sand', collide: false, shade: 0 });
    // a beam from the second roof to the third
    b.box(1.5, Y + 1.7, 149, 0.85, 0.2, 6.7, WOOD, { mat: 'wood', rot: new THREE.Euler(0.06, 0, 0), noLedge: true });
    // a pergola on the third roof, and one on the sixth
    t.pergola(-HX + 0.3, HX - 0.3, 155, 158.5, 1.6);
    t.pergola(-HX + 0.3, HX - 0.3, 198.5, 203, -1.4);
    // the tower: vines up its east face
    t.vines(0, 172, -0.8, 4.2, 1.6, 0, -1);
    // the fifth roof: a windbreak, and beside it the sunk court where a scroll piece lies
    b.block(3.8, Y - 0.4, 189.9, 2.8, 1.7, 0.5, PLASTER[4], { mat: 'plaster', noLedge: true });
    t.ladder(HX, 187.5, -8, -0.4, 1, 0);
    t.house({ x0: 11, x1: 18, z0: 181, z1: 194, ground: -8, top: 1.4, lips: 'fblr', faces: 'l', noLedge: true });
    b.wall(8.4, Y + 8, 183.9, 5.8, 44, 0.2);
    b.wall(8.4, Y + 8, 191.1, 5.8, 44, 0.2);
    b.box(8.25, Y - 7.97, 187.5, 5.3, 0.06, 6.8, 0xc9b48a, { mat: 'stone', collide: false, shade: 0 });
    t.palm(9.7, -8, 185.3, 9.6, 0.06);
    b.cyl(9.4, Y - 7.6, 189.4, 0.7, 0.7, 0.8, 0xbfae8e, { mat: 'stone', seg: 9, noLedge: true });
    t.pot(6.3, -8, 184.8);
    t.pot(10.3, -8, 190.2);
    // a hut on the eighth roof
    b.block(-3.8, Y - 1.0, 225.9, 2.8, 2.0, 2.6, PLASTER[0], { mat: 'plaster', noLedge: true });
    b.box(-3.8, Y + 1.04, 225.9, 3.1, 0.1, 2.9, 0xd2ba8a, { mat: 'sand', collide: false, shade: 0 });
    // washing on the side roofs, to show the wind
    for (const [x, y, z] of [
      [-9.2, 6.4, 129],
      [9.4, 5.2, 141],
      [-9.0, 4.2, 157],
      [9.2, 2.4, 169],
      [-9.4, 2.6, 197],
      [9.0, 1.0, 213],
    ]) this.washing(x - 2.6, x + 2.6, y, z, 0.8, true);
    // jars on the roofs
    g.toys.jar(3.4, Y + 3.95, 129.5);
    g.toys.jar(-3.6, Y + 3.95, 131.2);
    g.toys.basket(3.2, Y + 0.0, 186.2);
    g.toys.jar(-3.2, Y - 0.95, 201.0);
    t.pot(-4.4, 3.5, 126.2);
    t.pot(4.3, 2.0, 138.4);
    t.pot(-4.2, -0.8, 166.2, false);
    t.pot(4.3, -2.8, 211);
  }

  /** The town wall, its gate, and the cart of hay outside. */
  private buildWall(b: LevelBuilder, t: Town) {
    const stone = 0xd8c59c;
    const top = roof('W').top;
    b.block(0, Y - 10.5, 238.75, 132, 8.3, 3.5, stone, { mat: 'stone', shade: 0.25, jitter: 0.02 });
    // merlons, but for a breach above the gate
    for (let x = -64.8; x < 65; x += 2.4) {
      if (Math.abs(x) < 2.4) continue;
      b.block(x, Y + top, WALL_Z + 0.15, 1.3, 1.05, 0.7, stone, { mat: 'stone', noLedge: true, jitter: 0.04 });
    }
    for (const s of [-1, 1]) b.wall(s * 4.0, Y + top + 12, WALL_Z + 0.2, 3.4, 24, 0.3);
    // the gate below, shut
    b.box(0, Y - 8.4, WALL_Z + 0.52, 3.6, 4.2, 0.1, 0x3a2a1e, { collide: false, shade: 0 });
    for (const s of [-1, 1]) b.box(s * 0.86, Y - 8.5, WALL_Z + 0.6, 1.6, 3.9, 0.1, DARKWOOD, { mat: 'wood', collide: false });
    b.box(0, Y - 6.2, WALL_Z + 0.6, 4.2, 0.4, 0.3, stone, { mat: 'stone', collide: false });
    for (const s of [-1, 1]) b.block(s * 3.6, Y - 10.5, WALL_Z + 0.9, 2.2, 9.6, 1.4, stone, { mat: 'stone', shade: 0.25, noLedge: true });
    t.cart(0, 243.3, -10.5, { clear: 1.0, load: 'hay', loadH: 1.7, width: 2.8, length: 3.2 });
    this.bouncers.push({ x0: -1.4, x1: 1.4, z0: 241.7, z1: 244.9, top: Y - 10.5 + 1.0 + 0.22 + 1.7, speed: 8.5, mesh: new THREE.Object3D(), dip: 0, dipV: 0 });
  }

  /** The rest of the town, to look at: more houses to both sides, and the part behind him with the road east. */
  private buildTownBeyond(b: LevelBuilder, t: Town) {
    const rng = b.rng;
    for (const side of [-1, 1]) {
      for (let rowN = 0; rowN < 3; rowN++) {
        const x0 = HX + 9.6 + rowN * 14.5;
        let z = -66 + rng.range(0, 4);
        while (z < WALL_Z - 9) {
          const len = rng.range(7, 12);
          const ground = Math.min(groundAt(z), groundAt(z + len));
          const top = ground + rng.range(3.4, 7.8) + (rng.chance(0.12) ? 4 : 0);
          const w = rng.range(8, 12.5);
          const a = side * (x0 + rng.range(0, 1.6));
          const c = a + side * w;
          t.house({ x0: Math.min(a, c), x1: Math.max(a, c), z0: z, z1: z + len, ground, top, lips: rng.chance(0.5) ? 'fblr' : '', faces: (side > 0 ? 'l' : 'r') + 'b', collide: false, noShadow: true, plain: rowN > 0 });
          if (rng.chance(0.18)) t.dome((a + c) / 2, top, z + len / 2, Math.min(w, len) * 0.32, 0xf3ead2, { noShadow: true });
          if (rng.chance(0.16)) t.palm(a - side * 1.4, ground, z + len + 0.9, rng.range(6, 10));
          if (rng.chance(0.1)) t.cypress(a - side * 1.2, ground, z - 0.6, rng.range(6, 9));
          z += len + (rng.chance(0.3) ? 2.4 : 0.2);
        }
      }
    }
    // behind him: the houses toward the east gate, either side of the street that becomes the road east
    for (const side of [-1, 1]) {
      let z = -66;
      while (z < -10) {
        const len = rng.range(7, 11);
        const top = rng.range(3.0, 5.4);
        t.house({ x0: side > 0 ? 2.6 : -2.6 - 9, x1: side > 0 ? 2.6 + 9 : -2.6, z0: z, z1: Math.min(z + len, -7.5), ground: 0, top, lips: rng.chance(0.5) ? 'fblr' : '', faces: (side > 0 ? 'l' : 'r') + 'f', collide: false, vigas: true });
        z += len + 0.3;
      }
    }
    // the east wall and its gate, standing open
    const stone = 0xd8c59c;
    for (const s of [-1, 1]) b.block(s * 35, Y, -70.5, 62, 6.2, 3, stone, { mat: 'stone', collide: false, shade: 0.25 });
    b.block(0, Y + 4.6, -70.5, 8, 2.4, 3.4, stone, { mat: 'stone', collide: false });
    for (let x = -64; x < 65; x += 2.4) b.block(x, Y + (Math.abs(x) < 4.4 ? 7 : 6.2), -71.6, 1.3, 1.0, 0.7, stone, { mat: 'stone', collide: false, jitter: 0.04 });
  }

  /** The hillside west of the wall, with the track he slides down, as one sheet of ground. */
  private buildSlope(b: LevelBuilder) {
    const g = this.g;
    const us = [-160, -100, -60, -36, -22, -14, -9.5, -7.5, -5.5, -2.75, 0, 2.75, 5.5, 7.5, 9.5, 14, 22, 36, 60, 100, 160];
    const rows: number[] = [];
    for (let z = WALL_Z; z <= 522.01; z += 3) rows.push(z);
    const grid = rows.map((z) => us.map((u) => L(trackX(z) + u, slopeY(u, z), z)));
    // what is seen: every square its own tone
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(18);
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const tones = [0xbfae74, 0xb3a566, 0xc9b680, 0xa9a05e, 0xc2b078];
    const c = new THREE.Color();
    for (let r = 0; r < rows.length - 1; r++) {
      for (let k = 0; k < us.length - 1; k++) {
        const p0 = grid[r][k];
        const p1 = grid[r][k + 1];
        const p2 = grid[r + 1][k + 1];
        const p3 = grid[r + 1][k];
        _v.copy(p0).add(p1).add(p2).add(p3).multiplyScalar(0.25);
        [p0, p3, p1, p1, p3, p2].forEach((p, i) => {
          arr[i * 3] = p.x - _v.x;
          arr[i * 3 + 1] = p.y - _v.y;
          arr[i * 3 + 2] = p.z - _v.z;
        });
        const u = Math.abs((us[k] + us[k + 1]) / 2);
        if (u < 5.5) c.set(0xe4d2a6);
        else if (u < 9.5) c.set(0xcfb884);
        else c.set(tones[Math.floor(fbm2(_v.x * 0.05, _v.z * 0.05) * 9.99) % tones.length]);
        b.geo(geo, _m.makeTranslation(_v.x, _v.y, _v.z), c, { mat: 'sand', shade: 0, jitter: 0.04, noShadow: true });
      }
    }
    geo.dispose();
    // what is stood on: the track and its banks
    const lo = us.indexOf(-14);
    const hi = us.indexOf(14);
    const n = hi - lo + 1;
    const verts = new Float32Array(rows.length * n * 3);
    const idx: number[] = [];
    rows.forEach((_, r) => {
      for (let k = 0; k < n; k++) grid[r][lo + k].toArray(verts, (r * n + k) * 3);
      if (r === rows.length - 1) return;
      for (let k = 0; k < n - 1; k++) {
        const a = r * n + k;
        idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
      }
    });
    g.physics.trimesh(verts, new Uint32Array(idx), { surface: 'sand', noLedge: true });
    // unseen walls along the banks, and across the foot
    for (let r = 0; r < rows.length - 1; r++) {
      const z0 = rows[r];
      const z1 = rows[r + 1];
      const dx = trackX(z1) - trackX(z0);
      const zm = (z0 + z1) / 2;
      for (const s of [-1, 1]) b.wall(trackX(zm) + s * 8.3, Y + trackY(zm) + 7, zm, 0.3, 18, Math.hypot(dx, 3) + 0.5, Math.atan2(dx, 3));
    }
    b.wall(0, Y + PLAIN + 8, 522, 30, 20, 0.3);
    b.solid(0, Y + PLAIN - 1.2, 500, 60, 2, 60, { surface: 'sand', noLedge: true });
    // stones in the track
    for (const [u, z, r] of ROCKS) {
      const x = trackX(z) + u;
      const y = Y + slopeY(u, z);
      b.cyl(x, y + 0.5, z, r * 0.72, r, 1.8, 0xb9aa8c, { mat: 'stone', seg: 7, noLedge: true, jitter: 0.08, noShadow: true, rotY: b.rng.range(0, 3) });
      b.ball(x + r * 0.5, y + 0.2, z + r * 0.7, r * 0.6, 0xaea084, { detail: 0, jitter: 0.08, noShadow: true });
    }
    // ledges that throw him
    for (const z of HOPS) {
      const pitch = Math.atan2(trackY(z) - trackY(z + 2), 2);
      b.box(trackX(z + 1.2), Y + trackY(z + 1.2) + 0.12, z + 1.2, 10.4, 0.5, 5, 0xc4b28c, { mat: 'stone', collide: false, rot: new THREE.Euler(pitch - 0.2, 0, 0), noShadow: true, jitter: 0.03 });
    }
    // olives and scrub on the hillside
    const t = new Town(b, Y);
    const rng = b.rng;
    for (let i = 0; i < 90; i++) {
      const z = rng.range(250, 500);
      const u = rng.sign() * rng.range(11.5, 70);
      const y = slopeY(u, z);
      if (rng.chance(0.75)) t.olive(trackX(z) + u, y - 0.1, z, rng.range(0.8, 1.5), true);
      else b.ball(trackX(z) + u, Y + y + 0.3, z, rng.range(0.5, 1.1), rng.pick([0x8a8f5a, 0x9a9a62, 0x7f8752]), { detail: 0, squash: V(1.3, 0.6, 1.2), jitter: 0.08, noShadow: true });
    }
  }

  /** The hill under the town, the plain, the far hills, Joppa on the shore. Nothing here is stood on. */
  private buildFar(b: LevelBuilder) {
    const rng = b.rng;
    const off = { collide: false, noShadow: true } as const;
    // the hill and the plain
    b.block(0, Y + PLAIN, 60, 640, 68.5, 700, 0xc4b07a, { ...off, mat: 'sand', taper: 0.5, shade: 0.3, jitter: 0 });
    b.box(0, Y + PLAIN - 2, -470, 3400, 4, 2240, 0xcdb983, { ...off, mat: 'sand', shade: 0, jitter: 0 });
    // fields and groves on the plain, for the eye to measure by
    const fields = [0xb9b06a, 0xa9a85c, 0xd6c48a, 0x9a9c58, 0xc8b070, 0xb49a62];
    for (let i = 0; i < 70; i++) {
      const x = rng.range(-520, 520);
      const z = rng.range(300, 630);
      if (Math.abs(x) < 26 && z < 540) continue;
      if (Math.abs(x) < 95 && z > 548) continue;
      b.box(x, Y + PLAIN + 0.3, z, rng.range(26, 70), 0.3, rng.range(22, 56), rng.pick(fields), { ...off, mat: 'sand', shade: 0, rotY: rng.range(-0.25, 0.25) });
    }
    for (let i = 0; i < 110; i++) {
      const x = rng.range(-420, 420);
      const z = rng.range(505, 640);
      if (Math.abs(x) < 12) continue;
      if (Math.abs(x) < 86 && z > 556) continue;
      b.ball(x, Y + PLAIN + 1.6, z, rng.range(1.6, 2.6), rng.pick([0x7a8a5a, 0x6f8052, 0x869664]), { ...off, detail: 0, squash: V(1.2, 0.7, 1.1), jitter: 0.1 });
    }
    // the road east, pale across the plain toward the sunrise; and the road west, to Joppa
    b.box(0, Y + PLAIN + 0.35, -900, 9, 0.3, 1200, 0xead9ae, { ...off, shade: 0, jitter: 0 });
    b.box(0, Y + PLAIN / 2, -150, 7, 0.4, 330, 0xead9ae, { ...off, shade: 0, jitter: 0, rot: new THREE.Euler(-Math.atan2(69, 320), 0, 0) });
    b.box(0, Y + PLAIN + 0.35, 532, 6.4, 0.3, 64, 0xead9ae, { ...off, shade: 0, jitter: 0 });
    // far hills, round every side but the sea's
    for (let i = 0; i < 22; i++) {
      // (the angle is measured from due east)
      const a = (i / 21 - 0.5) * Math.PI * 1.2;
      const d = rng.range(1250, 1700);
      const h = rng.range(90, 220);
      b.cyl(Math.sin(a) * d, Y + PLAIN + h / 2 - 4, -Math.cos(a) * d, h * 0.35, h * rng.range(2.4, 3.4), h, i % 2 ? 0xb6a996 : 0xa99f94, { ...off, seg: 7, shade: 0.3, jitter: 0.04, rotY: rng.range(0, 3) });
    }
    // Joppa: houses heaped on a low rise by the water, a quay, ships
    const jz = 600;
    b.cyl(0, Y + PLAIN + 3, jz + 4, 46, 96, 7, 0xc9b684, { ...off, mat: 'sand', seg: 12, shade: 0.2, jitter: 0 });
    for (let i = 0; i < 64; i++) {
      const a = rng.range(0, 6.283);
      const d = Math.sqrt(rng.next()) * 62;
      const x = Math.cos(a) * d * 1.25;
      const z = jz + 4 + Math.sin(a) * d * 0.62;
      const rise = 6.4 * clamp01(1 - d / 80);
      const w = rng.range(6, 12);
      const dz = rng.range(6, 11);
      const h = rng.range(3.5, 8) + (rng.chance(0.1) ? 5 : 0);
      b.block(x, Y + PLAIN + rise - 0.5, z, w, h + 0.5, dz, rng.pick(PLASTER), { ...off, mat: 'plaster', shade: 0.25 });
      if (rng.chance(0.2)) b.ball(x, Y + PLAIN + rise + h, z, Math.min(w, dz) * 0.36, 0xf3ead2, { ...off, detail: 1, squash: V(1, 0.8, 1) });
    }
    const t = new Town(b, Y);
    for (let i = 0; i < 16; i++) t.palm(rng.range(-88, 88), PLAIN, jz + rng.range(-44, 34) * (i % 2 ? 1 : 0.9) + (i % 3 === 0 ? 40 : 0), rng.range(7, 11));
    // the shore, the quay, the mole
    b.box(0, Y + PLAIN - 2.4, 668, 3400, 4, 60, 0xe6d6a8, { ...off, mat: 'sand', shade: 0, jitter: 0, rot: new THREE.Euler(0.06, 0, 0) });
    b.box(0, Y + PLAIN - 1.6, 652, 150, 4, 12, 0xbcae92, { ...off, mat: 'stone', shade: 0.2 });
    b.box(62, Y + PLAIN - 2.0, 700, 7, 4.4, 90, 0xb4a68a, { ...off, mat: 'stone', shade: 0.2 });
    // ships at the quay, and one standing off
    for (const [x, z, yaw, s] of [
      [-34, 668, 0.3, 1],
      [6, 672, -0.2, 1.15],
      [40, 668, 0.1, 0.9],
      [-90, 760, 1.2, 1],
    ]) this.farShip(b, x, z, yaw, s);
  }

  /** A ship as it is seen from a hill: hull, mast, yard, a furled sail. */
  private farShip(b: LevelBuilder, x: number, z: number, yaw: number, s: number) {
    const off = { collide: false, noShadow: true } as const;
    const sea = 0;
    b.ball(x, sea + 0.5 * s, z, 1, 0x5a3c26, { ...off, detail: 1, squash: V(2.6 * s, 2.0 * s, 9 * s), rotY: yaw, mat: 'wood', shade: 0.3 });
    b.box(x, sea + 2.2 * s, z, 4.4 * s, 0.3, 15 * s, 0x8a6a48, { ...off, rotY: yaw, mat: 'wood' });
    b.post(x, sea + 2 * s, z, 0.22 * s, 11 * s, 0x6a4a30, { ...off, seg: 5 });
    b.box(x, sea + 11.4 * s, z, 9 * s, 0.26 * s, 0.26 * s, 0x6a4a30, { ...off, rotY: yaw });
    b.box(x, sea + 10.8 * s, z, 8 * s, 0.9 * s, 0.6 * s, 0xeadfc2, { ...off, rotY: yaw, mat: 'cloth' });
  }

  /** A striped awning that throws up whoever lands on it. */
  private bouncer(x0: number, x1: number, z0: number, z1: number, top: number, speed: number, c1: number, c2: number, t: Town) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const mesh = buildMesh((m) => {
      const n = Math.max(2, Math.round((x1 - x0) / 0.6));
      for (let i = 0; i < n; i++) m.box(x0 - cx + ((i + 0.5) / n) * (x1 - x0), -0.06, 0, (x1 - x0) / n, 0.12, z1 - z0, i % 2 ? c2 : c1, { mat: 'cloth', jitter: 0.02, shade: 0.05 });
      for (const z of [z0 - cz, z1 - cz]) m.box(0, -0.2, z, x1 - x0, 0.3, 0.05, c1, { mat: 'cloth', jitter: 0.02, shade: 0 });
    }, 3);
    mesh.position.set(cx, Y + top, cz);
    for (const o of mesh.children) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
    this.g.root.add(mesh);
    t.b.solid(cx, Y + top - 0.06, cz, x1 - x0, 0.12, z1 - z0, { surface: 'cloth', noLedge: true });
    for (const x of [x0 + 0.08, x1 - 0.08]) for (const z of [z0 + 0.08, z1 - 0.08]) t.pole(x, z, groundAt(cz), top - 0.1, false, 0.06);
    this.bouncers.push({ x0, x1, z0, z1, top: Y + top, speed, mesh, dip: 0, dipV: 0 });
  }

  /** A line of washing between two points along x; it swings in the wind. */
  private washing(x0: number, x1: number, y: number, z: number, scale: number, posts = false) {
    const rng = this.rng;
    const cx = (x0 + x1) / 2;
    const colors = [0xf2ead8, 0xc0522f, 0x3f7ea6, 0xd9a23a, 0xeedfbc, 0x7a8a4a, 0x8a3044, 0xf2ead8];
    const mesh = buildMesh((m) => {
      m.box(0, 0, 0, x1 - x0, 0.03, 0.03, 0x6a5a40, { shade: 0, jitter: 0 });
      let x = x0 - cx + 0.5;
      while (x < x1 - cx - 1.0) {
        const w = rng.range(0.6, 1.4) * scale;
        const h = rng.range(0.7, 1.5) * scale;
        m.box(x + w / 2, -h / 2 - 0.02, 0, w, h, 0.03, rng.pick(colors), { mat: 'cloth', jitter: 0.04, shade: 0.12, doubleSide: true });
        x += w + rng.range(0.15, 0.7);
      }
    }, Math.round(z * 7 + y * 13));
    mesh.position.set(cx, Y + y, z);
    this.g.root.add(mesh);
    this.flags.push({ obj: mesh, phase: rng.range(0, 6), reach: rng.range(0.8, 1.2) });
    if (posts) {
      const p = buildMesh((m) => {
        for (const x of [x0 - cx, x1 - cx]) m.post(x, -2.2, 0, 0.05, 2.25, WOOD, { seg: 5, mat: 'wood' });
      }, 5);
      p.position.copy(mesh.position);
      this.g.root.add(p);
    }
  }

  /** People in the market, and doves. */
  private buildLife() {
    const g = this.g;
    const lane = Y + LANE;
    const folk: [number, number, number, Figure['pose'], number][] = [
      [-4.3, 65.6, Math.PI / 2, 'work', 0],
      [-3.2, 67.6, -Math.PI / 2, 'talk', 3],
      [4.3, 74.4, -Math.PI / 2, 'sit', 2],
      [3.9, 88.6, -1.9, 'idle', 5],
      [-4.2, 111.9, 1.2, 'work', 1],
    ];
    for (const [x, z, yaw, pose, look] of folk) {
      const f = new Figure(mariner(look));
      f.root.position.set(x, lane, z);
      f.root.rotation.y = yaw;
      f.pose = pose;
      f.blob.userData.isBlob = true;
      // (the blob under each is shadow enough, and halves what they cost to draw)
      f.root.traverse((o) => {
        if (o !== f.blob) o.castShadow = false;
      });
      g.root.add(f.root);
      this.figures.push(f);
    }

    // doves: one instanced flock-of-flocks
    const flocks: [THREE.Vector3, number][] = [
      [L(2.2, 4.0, 11.4), 5],
      [L(-1.5, LANE, 109.5), 7],
      [L(2.4, 3.5, 130.4), 5],
      [L(-2.2, -2.8, 213.6), 5],
      [L(0.5, trackY(330) + 0.1, 330).setX(trackX(330) - 2.5), 8],
    ];
    const tri: number[] = [];
    const quad = (a: number[], b2: number[], c: number[]) => tri.push(...a, ...b2, ...c);
    // body, tail, two wings
    quad([0, 0.07, 0.16], [-0.06, 0, -0.05], [0.06, 0, -0.05]);
    quad([0, 0.07, 0.16], [0.06, 0, -0.05], [0, 0.1, -0.05]);
    quad([0, 0.07, 0.16], [0, 0.1, -0.05], [-0.06, 0, -0.05]);
    quad([0, 0.06, -0.05], [-0.05, 0.03, -0.2], [0.05, 0.03, -0.2]);
    quad([0.03, 0.07, 0.06], [0.36, 0.1, -0.02], [0.03, 0.07, -0.08]);
    quad([-0.03, 0.07, 0.06], [-0.03, 0.07, -0.08], [-0.36, 0.1, -0.02]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    geo.computeVertexNormals();
    const total = flocks.reduce((n, f) => n + f[1], 0);
    this.doveMesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xf2efe6, side: THREE.DoubleSide, flatShading: true }), total);
    this.doveMesh.frustumCulled = false;
    this.doveMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    g.root.add(this.doveMesh);
    flocks.forEach(([at, n], fi) => {
      this.flocks.push({ at, flown: false });
      for (let i = 0; i < n; i++) {
        const a = this.rng.range(0, 6.283);
        const d = this.rng.range(0.3, 1.5);
        this.doves.push({ flock: fi, pos: V(at.x + Math.cos(a) * d, at.y + 0.02, at.z + Math.sin(a) * d), vel: V(0, 0, 0), yaw: this.rng.range(0, 6.283), state: 0, t: 0, seed: this.rng.range(0, 10) });
      }
    });
    this.poseDoves(0);
  }

  private poseDoves(time: number) {
    this.doves.forEach((d, i) => {
      if (d.state === 2) _s.set(0, 0, 0);
      else if (d.state === 1) _s.set(1.5 * (0.25 + 0.75 * Math.abs(Math.sin(time * 17 + d.seed))), 1.5, 1.5);
      else _s.set(0.5, 1.5 + 0.12 * Math.sin(time * 3 + d.seed), 1.5);
      _q.setFromEuler(_e.set(d.state === 1 ? -0.25 : 0, d.yaw, 0, 'YXZ'));
      this.doveMesh.setMatrixAt(i, _m.compose(d.pos, _q, _s));
    });
    this.doveMesh.instanceMatrix.needsUpdate = true;
  }

  // ---- places and views ------------------------------------------------------------------------------------------

  /** Sets him down where a part of the chapter begins (for ?seek). */
  private placeFor(phase: Phase) {
    const g = this.g;
    const p = g.player;
    const at: Record<Phase, THREE.Vector3> = {
      call: L(0, 4.05, -3.4),
      roofs: L(0, 4.05, -1),
      market: L(0, LANE + 0.05, 71),
      climb: L(0, LANE + 0.05, 118),
      wind: L(0, 3.55, 126.5),
      slide: L(0, -2.15, 237.6),
      road: L(0, PLAIN + 0.3, 489),
      done: L(0, PLAIN + 0.3, 489),
    };
    p.teleport(at[phase], 0);
    g.cam.snap(p, Math.PI);
  }

  private cameraHint(at: THREE.Vector3) {
    const z = at.z;
    if (this.phase === 'call') return null;
    if (this.sliding || (z > 246 && z < 492)) {
      const heading = Math.atan2(trackX(z + 6) - trackX(z - 2), 8);
      return { yaw: heading + Math.PI, pitch: 0.36, dist: 8.6, strength: 2.6 };
    }
    // in the lane the houses stand close: nearer and lower
    if (z > 60 && z < 123 && at.y < Y + 1) return { yaw: Math.PI, pitch: 0.3, dist: 6.2, strength: 0.8 };
    if (z > 229 && z < 246) return { yaw: Math.PI, pitch: 0.42, dist: 8.4, strength: 1.2 };
    return { yaw: Math.PI, pitch: 0.4, dist: 7.6, strength: 0.7 };
  }

  override plate(): Shot {
    return { pos: L(-9.5, 9.5, 116), look: L(2, -4, 205), fov: 52 };
  }

  // ---- the wind ------------------------------------------------------------------------------------------------

  /** Whether no gust will blow for the next `seconds`. */
  private calmFor(seconds: number): boolean {
    if (!this.windOn || this.g.story) return true;
    if (this.gustState === 'blow' || this.gust > 0.2) return false;
    const until = this.gustState === 'lull' ? LULL - this.gustT + WARN : WARN - this.gustT;
    return until >= seconds;
  }

  private stepWind(dt: number) {
    const g = this.g;
    const p = g.player;
    const inWind = this.windOn && p.pos.z > 123 && p.pos.z < WALL_Z + 0.4;
    if (inWind) {
      this.gustT += dt;
      if (this.gustState === 'lull' && this.gustT > LULL) {
        this.gustState = 'warn';
        this.gustT = 0;
        this.gustSide = -this.gustSide;
        g.audio.gust(1);
      } else if (this.gustState === 'warn' && this.gustT > WARN) {
        this.gustState = 'blow';
        this.gustT = 0;
        g.cam.shake(0.12);
      } else if (this.gustState === 'blow' && this.gustT > BLOW) {
        this.gustState = 'lull';
        this.gustT = 0;
      }
    } else if (this.gustState !== 'lull' || this.gustT > 0) {
      this.gustState = 'lull';
      this.gustT = 0;
    }
    this.gust = damp(this.gust, inWind && this.gustState === 'blow' ? 1 : 0, 9, dt);

    // the push on him
    p.push.set(0, 0, 0);
    p.speedScale = 1;
    this.sheltered = false;
    if (this.gust > 0.02 && inWind && !p.locked) {
      // behind a wall, or low, the wind passes over
      _v.copy(p.pos).y += 1.0;
      this.sheltered = p.state === 'slide' || !!g.physics.raycast(_v, WEST, 2.7);
      if (!this.sheltered) {
        if (g.story) {
          if (p.state === 'ground') p.speedScale = 1 - 0.38 * this.gust;
        } else if (p.state === 'ground') p.push.set(this.gustSide * 1.0 * this.gust, 0, -2.5 * this.gust);
        else if (p.state === 'air') p.push.set(this.gustSide * 1.5 * this.gust, 0, -4.7 * this.gust);
      }
    }

    // was he blown from a roof into the street?
    if (inWind && !g.story) {
      const street = Y + groundAt(p.pos.z);
      if (p.grounded) {
        if (!this.wasGrounded) {
          const fell = this.lastRoofY - p.pos.y;
          if (fell > 2.4 && p.pos.y < street + 0.5 && this.airGust > 0.12 && Math.abs(p.pos.x) < HX) {
            this.blown++;
            g.hud.toast('Blown from the roof: climb back', 2.6);
            g.audio.bad();
          }
        }
        if (p.pos.y > street + 1.5) this.lastRoofY = p.pos.y;
        this.airGust = 0;
      } else if (p.state === 'air' && p.push.z < -1) this.airGust += dt;
      else if (p.state === 'climb' || p.state === 'hang') this.airGust = 0;
    }
    this.wasGrounded = p.grounded;
  }

  private stepBouncers() {
    const p = this.g.player;
    if (!p.grounded || (p.state !== 'ground' && p.state !== 'slide')) return;
    for (const a of this.bouncers) {
      if (p.pos.x < a.x0 || p.pos.x > a.x1 || p.pos.z < a.z0 || p.pos.z > a.z1 || Math.abs(p.pos.y - a.top) > 0.3) continue;
      p.vel.y = a.speed;
      p.grounded = false;
      if (p.state === 'ground') p.state = 'air';
      a.dipV = -4.5;
      this.g.audio.thud(0.7, 'cloth');
      this.g.audio.whoosh(0.5);
      this.g.fx.emit(_v.set(p.pos.x, a.top + 0.1, p.pos.z), { count: 10, color: 0xf2e6c8, speed: 2.2, dir: V(0, 1, 0), spread: 0.8, size: 0.16, life: 0.6, gravity: 3, drag: 2, opacity: 0.6 });
      return;
    }
  }

  private stepSlope(dt: number) {
    const g = this.g;
    const p = g.player;
    const z = p.pos.z;
    const on = this.phase === 'slide' && z > SLIDE_FROM && z < SLIDE_TO;
    if (on !== this.sliding) {
      this.sliding = on;
      p.canGrab = !on;
      if (on) g.audio.whoosh(1);
    }
    p.slideHold = on ? lerp(10, 14.5, smoothstep(SLIDE_FROM, 300, z)) * (z > 455 ? lerp(1, 0.72, smoothstep(455, SLIDE_TO, z)) : 1) : 0;
    if (!on) {
      this.lastZ = z;
      return;
    }
    // in the air he keeps his way
    if (!p.grounded) {
      const sp = Math.hypot(p.vel.x, p.vel.z);
      const want = p.slideHold * 0.94;
      if (sp < want) {
        const heading = Math.atan2(trackX(z + 3) - trackX(z), 3);
        const k = sp > 2 ? want / sp : 0;
        if (k) {
          p.vel.x *= k;
          p.vel.z *= k;
        } else {
          p.vel.x = Math.sin(heading) * want;
          p.vel.z = Math.cos(heading) * want;
        }
      }
    } else if (p.state === 'slide') {
      // never back up the hill
      if (p.vel.z < 4) p.vel.z = 4;
      for (const h of HOPS) {
        if (this.lastZ < h && z >= h) {
          p.vel.y = 9.8;
          p.grounded = false;
          g.cam.fovKick = Math.max(g.cam.fovKick, 9);
          g.audio.whoosh(1);
          g.fx.emit(p.pos, { count: 16, color: 0xe6d4a8, color2: 0xcbb688, speed: 4, dir: V(0, 1, -0.4), spread: 0.7, size: 0.5, life: 0.9, gravity: 4, drag: 1.4, opacity: 0.55, grow: 2 });
        }
      }
      // dust behind him
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.05;
        g.fx.emit(p.pos, { count: 2, color: 0xe8d6aa, color2: 0xd2bd8e, speed: 1.6, dir: V(0, 1, -0.6), spread: 0.6, size: 0.42, life: 0.8, gravity: -0.6, drag: 1.2, opacity: 0.42, grow: 2.4, radius: 0.3 });
      }
    }
    this.lastZ = z;
  }

  override fixedUpdate(dt: number) {
    if (this.phase === 'done') return;
    this.stepWind(dt);
    this.stepBouncers();
    this.stepSlope(dt);
  }

  override update(dt: number) {
    const g = this.g;
    const time = g.engine.time;
    const p = g.player;
    this.sky.update(time);
    this.ocean.update(time, this.seaAt);
    this.motes.update(time, g.engine.camera, g.engine.canvas.clientHeight);
    this.streaks.update(time, g.engine.camera);
    const warn = this.gustState === 'warn' ? clamp01(this.gustT / WARN) * 0.45 : 0;
    const blowing = Math.max(this.gust, warn);
    this.streaks.uniforms.uOpacity.value = damp(this.streaks.uniforms.uOpacity.value as number, blowing * 0.6, 8, dt);
    (this.streaks.uniforms.uVel.value as THREE.Vector3).x = this.gustSide * 5;
    const breeze = this.windOn ? 0.45 : 0.2;
    g.audio.bed('wind', clamp(breeze + blowing * 0.5 + (this.sliding ? 0.35 : 0), 0, 1));
    g.audio.bed('crowd', p.pos.z > 58 && p.pos.z < 124 && p.pos.y < Y + 1.5 ? 0.42 : 0.08);
    // washing
    for (const f of this.flags) f.obj.rotation.x = (0.12 + breeze * 0.25 + blowing * 0.95) * f.reach + Math.sin(time * (2.2 + blowing * 7) + f.phase) * (0.07 + blowing * 0.16);
    // awnings spring back
    for (const a of this.bouncers) {
      if (a.dip === 0 && a.dipV === 0) continue;
      a.dipV += (-a.dip * 220 - a.dipV * 9) * dt;
      a.dip += a.dipV * dt;
      if (Math.abs(a.dip) < 0.002 && Math.abs(a.dipV) < 0.02) a.dip = a.dipV = 0;
      a.mesh.position.y = a.top + a.dip;
    }
    // dust thrown by a gust
    if (this.gust > 0.4 && this.windOn && Math.random() < dt * 9 * g.quality.particles) {
      g.fx.emit(_v.set(p.pos.x + (Math.random() - 0.5) * 9, p.pos.y + 0.2, p.pos.z + 4 + Math.random() * 7), { count: 3, color: 0xead8ae, speed: 7, dir: V(this.gustSide * 0.2, 0.12, -1), spread: 0.25, size: 0.5, life: 1.0, gravity: 0, drag: 0.6, opacity: 0.3, grow: 2.2, radius: 0.8 });
    }
    // people look round as he passes
    for (const f of this.figures) {
      const dx = p.pos.x - f.root.position.x;
      const dz = p.pos.z - f.root.position.z;
      // (each is some thirty draws: not shown from far off, where the houses hide them anyway)
      f.root.visible = Math.abs(dz) < 52;
      if (!f.root.visible) continue;
      const near = dx * dx + dz * dz < 64;
      let turn = near ? Math.atan2(dx, dz) - f.root.rotation.y : 0;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      f.lookYaw = clamp(turn, -1.1, 1.1);
      f.update(dt);
    }
    // doves
    let moving = false;
    this.flocks.forEach((f, fi) => {
      if (f.flown || p.pos.distanceToSquared(f.at) > 6.5 * 6.5) return;
      f.flown = true;
      g.audio.whoosh(0.35);
      for (const d of this.doves) {
        if (d.flock !== fi) continue;
        d.state = 1;
        const away = Math.atan2(d.pos.x - p.pos.x, d.pos.z - p.pos.z) + this.rng.range(-0.7, 0.7);
        d.vel.set(Math.sin(away) * this.rng.range(3, 6), this.rng.range(5, 8), Math.cos(away) * this.rng.range(3, 6));
        d.yaw = away;
      }
    });
    for (const d of this.doves) {
      if (d.state !== 1) continue;
      moving = true;
      d.t += dt;
      d.vel.y = damp(d.vel.y, 2.2, 1.6, dt);
      d.vel.x += Math.sin(d.seed + d.t * 1.3) * dt * 2;
      d.pos.addScaledVector(d.vel, dt);
      d.yaw = Math.atan2(d.vel.x, d.vel.z);
      if (d.t > 9) d.state = 2;
    }
    if (moving || Math.floor(time * 4) !== Math.floor((time - dt) * 4)) this.poseDoves(time);
    if (this.sliding) g.cam.fovKick = Math.max(g.cam.fovKick, 5);
  }

  // ---- the story -----------------------------------------------------------------------------------------------

  start() {
    const g = this.g;
    g.touch.setSlide(true);
    g.audio.play('call');
    g.run(() => this.story());
  }

  private from(phase: Phase): boolean {
    return !this.seek || ORDER.indexOf(phase) >= ORDER.indexOf(this.seek);
  }

  private *story(): Routine {
    if (this.from('call')) yield* this.pCall();
    if (this.from('roofs')) yield* this.pRoofs();
    if (this.from('market')) yield* this.pMarket();
    if (this.from('climb')) yield* this.pClimb();
    if (this.from('wind')) yield* this.pWind();
    if (this.from('slide')) yield* this.pSlide();
    yield* this.pRoad();
  }

  private touch() {
    return this.g.hud.device === 'touch';
  }

  /** Says a thing about the controls once. */
  private tell(key: string, keys: string, touch: string, seconds = 5) {
    if (this.told.has(key)) return;
    this.told.add(key);
    this.g.hud.toast(this.touch() ? touch : keys, seconds);
  }

  /** 1:1–2, and the first words of 1:3. He stands on his roof at sunrise, facing the east road. */
  private *pCall(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'call';
    g.hud.cinema(true);
    p.teleport(L(0, 4.02, -3.5), Math.PI);
    p.lock('idle');
    // over his shoulder: the roofs, the east gate, the road east, the sun
    g.cam.setShot({ pos: L(2.3, 6.5, 1.8), look: L(-0.6, 4.6, -30), fov: 46 }, 0);
    yield 1.6;
    g.cam.setShot({ pos: L(1.5, 6.1, 0.2), look: L(-0.4, 4.8, -30), fov: 44 }, 7);
    yield g.hud.verse(cite('1:1'), { block: true });
    // his face, and behind him the town falling away to the west and the sea
    g.cam.setShot({ pos: L(-1.9, 5.2, -8.2), look: L(0.3, 5.3, -3.5), fov: 40 }, 0);
    yield 0.4;
    g.cam.setShot({ pos: L(-1.3, 5.3, -7.4), look: L(0.2, 5.3, -3.5), fov: 38 }, 9);
    yield g.hud.verse(cite('1:2'), { block: true });
    yield 0.7;
    // he turns his back on the east
    g.cam.setShot({ pos: L(-2.6, 6.4, -9.5), look: L(0, 4.6, 6), fov: 50 }, 2.2);
    yield* tween(1.1, (k) => p.teleport(L(0, 4.02, -3.5), Math.PI * (1 - k)), ease.inOutCubic);
    g.hud.verse(part('1:3', 'But Jonah rose up', 'presence of the LORD'), { seconds: 6 });
    yield 1.3;
    g.cam.snap(p, Math.PI);
    g.cam.setShot(null, 1.3);
    p.unlock();
    g.hud.cinema(false);
  }

  /** Run and jump: the first roofs. */
  private *pRoofs(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'roofs';
    g.hud.objective('Go down to Joppa', 'West, over the rooftops');
    g.hud.marker('way', L(0, 5.2, 10), { label: 'Jump' });
    yield 0.6;
    this.tell('jump', 'Space to jump the gap', 'Jump the gap');
    yield () => p.pos.z > 8;
    g.hud.marker('way', null);
    yield () => p.pos.z > 20.5;
    this.tell('ledge', 'Jump at the wall: he catches the edge and climbs', 'Jump at the wall: he catches the edge and climbs');
    yield () => p.pos.z > 41;
    this.tell('catch', 'Too high to land on? Jump, and he catches the edge', 'Too high to land on? Jump, and he catches the edge');
    yield () => p.pos.z > 59 && p.pos.y < Y + 1;
  }

  /** Slide: the market lane. */
  private *pMarket(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'market';
    g.hud.objective('Go down to Joppa', 'Through the market');
    yield () => p.pos.z > 70;
    this.tell('slide', 'Shift while running: slide under', 'Slide button while running: slide under', 6);
    yield () => p.pos.z > 88;
    if (p.pos.z < 96) g.hud.objective('Go down to Joppa', 'A cart blocks the gate: slide beneath it');
    yield () => p.pos.z > 100;
    g.hud.objective('Go down to Joppa', 'Through the market');
    yield () => p.pos.z > 116.5;
  }

  /** Climb: the vine wall. */
  private *pClimb(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'climb';
    g.hud.objective('Go down to Joppa', 'The lane ends: climb the vines');
    g.hud.marker('way', L(0, 1.2, 123.6), { label: 'Climb' });
    this.tell('climb', 'Run at the vines and keep pushing up', 'Run at the vines and keep pushing up');
    yield () => p.pos.z > 124.3 && p.pos.y > Y + 3;
    g.hud.marker('way', null);
  }

  /** The wind against him: everything together. */
  private *pWind(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'wind';
    this.windOn = true;
    this.gustState = 'lull';
    this.gustT = LULL - 1.2;
    this.lastRoofY = p.pos.y;
    g.hud.objective('Go down to Joppa', g.story ? 'The wind is against him' : 'The wind is against him: cross in the lulls');
    g.hud.marker('joppa', V(0, 12, 600), { label: 'Joppa' });
    yield () => this.gustState === 'blow' || p.pos.z > 150;
    if (!g.story) g.hud.toast('A gust! Stand behind a wall, or slide low beneath it', 5);
    yield () => p.pos.z > 172.5 && p.pos.y > Y + 3.6;
    if (!g.story) g.hud.toast('A long leap: wait for the lull', 4);
    yield () => p.pos.z > WALL_Z + 0.6;
    this.windOn = false;
  }

  /** The long slide down toward the coast. */
  private *pSlide(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'slide';
    this.windOn = false;
    this.lastZ = p.pos.z;
    g.hud.objective('Go down to Joppa', 'Down the hill');
    yield () => p.pos.z > SLIDE_FROM + 4;
    this.tell('steer', 'Steer round the stones · Space to hop', 'Steer round the stones · Jump to hop', 5);
    yield () => p.pos.z > 490;
  }

  /** "…and went down to Joppa." */
  private *pRoad(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'road';
    this.windOn = false;
    g.hud.marker('joppa', null);
    g.hud.objective('Go down to Joppa', 'The road to the harbour');
    yield () => p.pos.z > 499;
    g.hud.objective(null);
    g.hud.cinema(true);
    const at = L(clamp(p.pos.x, -2, 2), PLAIN + 0.36, Math.max(p.pos.z, 500));
    p.lock('idle');
    p.teleport(at, 0);
    g.cam.setShot({ pos: V(at.x + 3.2, at.y + 2.6, at.z - 6.5), look: V(at.x - 0.4, at.y + 2.4, at.z + 40), fov: 48 }, 1.2);
    yield 1.4;
    g.cam.setShot({ pos: V(at.x + 5, at.y + 15, at.z - 12), look: V(0, Y + PLAIN + 6, 640), fov: 40 }, 8);
    g.audio.gull();
    yield g.hud.verse(part('1:3', 'and went down to Joppa', 'Joppa'), { block: true });
    yield 0.8;
    yield g.hud.fade(1, 1.3);
    this.phase = 'done';
    g.hud.cinema(false);
    g.complete(this.blown === 0);
  }

  // ---- the automated player --------------------------------------------------------------------------------------

  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const self = this;
    const ly = () => p.pos.y - Y;
    /** Jump when the edge at `z` is underfoot. */
    const edge = (z: number) => () => p.grounded && p.pos.z > z - 0.55 && p.pos.z < z + 0.4;
    const inStreet = () => p.grounded && Math.abs(p.pos.x) < HX && (p.pos.z < 58 || p.pos.z > 124.2) && p.pos.z < WALL_Z && ly() < groundAt(p.pos.z) + 0.6;
    /** Out of an alley by the ladder on the wall ahead. */
    function* climbOut(): Routine {
      const ladder = self.ladders.filter((l) => l.z > p.pos.z - 0.6).sort((a, c) => a.z - c.z)[0];
      if (!ladder) return;
      b.note(`in the street at z=${p.pos.z.toFixed(1)}: up the ladder at z=${ladder.z}`);
      yield* b.goTo(L(ladder.x, ladder.y0, ladder.z - 0.9), { dist: 0.35, timeout: 6, noAssist: true });
      yield* b.goTo(L(ladder.x, ladder.y1, ladder.z + 1.6), { dist: 0.7, timeout: 9, noAssist: true });
    }
    /** One stretch of the way; if he falls into the street he climbs out and tries again. */
    function* leg(x: number, y: number, z: number, opts: Parameters<Bot['goTo']>[1] = {}): Routine {
      const dist = opts?.dist ?? 0.7;
      for (let tries = 0; tries < 4; tries++) {
        yield* b.goTo(L(x, y, z), { timeout: 9, ...opts, dist, noAssist: true, until: () => inStreet() && y > groundAt(z) + 1 });
        if (Math.hypot(p.pos.x - x, p.pos.z - z) < dist + 0.3 && Math.abs(ly() - y) < 1.3) return;
        if (inStreet()) yield* climbOut();
      }
      if (Math.hypot(p.pos.x - x, p.pos.z - z) > dist + 0.3 || Math.abs(ly() - y) > 1.3) {
        b.assist(`could not reach (${x}, ${y}, ${z}) from (${p.pos.x.toFixed(1)}, ${ly().toFixed(1)}, ${p.pos.z.toFixed(1)})`);
        p.teleport(L(x, y + 0.1, z));
      }
    }
    /** Leans into the wind at a spot until there is a lull long enough to cross in. */
    function* lull(need: number, x: number, z: number): Routine {
      let t = 0;
      while (!self.calmFor(need) && t < 16) {
        if (Math.hypot(p.pos.x - x, p.pos.z - z) > 0.5) b.steer(x, z, 1);
        else b.stop();
        const dt: number = yield;
        t += dt ?? 0;
      }
      b.stop();
    }

    yield () => !p.locked && !g.hud.inCinema && this.phase !== 'call';

    if (this.from('roofs')) {
      yield* leg(0, 4.0, 10, { jump: edge(5) });
      yield* leg(0, 3.4, 21.5, { jump: edge(15) });
      yield* leg(0, 5.3, 29.5, { jump: () => p.grounded && p.pos.z > 24.5 && ly() < 4 });
      yield* leg(0, 4.6, 42, { jump: edge(35) });
      yield* leg(0, 6.4, 53, { jump: edge(47) });
      // the first scroll piece: up onto the side roof, round the dome
      yield* leg(3.6, 6.4, 56.3);
      yield* leg(7.2, 7.3, 56.4, { jump: () => p.grounded && p.pos.x > 4.5 && ly() < 7 });
      yield* leg(10.7, 7.3, 56.2, { dist: 0.5 });
      yield 0.3;
      yield* leg(3, 6.4, 56.4);
      // down into the market
      yield* b.goTo(L(0, LANE, 67), { timeout: 9 });
    }
    if (this.from('market')) {
      yield* b.goTo(L(0, LANE, 76.2), { timeout: 9 });
      yield* b.goTo(L(0, LANE, 85), { timeout: 8, slide: () => p.pos.z > 76.4 && p.pos.z < 77.3 });
      yield* b.goTo(L(0, LANE, 93.2), { timeout: 8, dist: 0.4 });
      yield* b.goTo(L(0, LANE, 101.4), { timeout: 8, slide: () => p.pos.z > 93.9 && p.pos.z < 94.8 });
      // the second scroll piece: the crates, the blue awning, the balcony
      yield* b.goTo(L(4.7, LANE, 101.4), { timeout: 6, dist: 0.4 });
      yield* b.goTo(L(4.6, LANE + 1, 104.5), { timeout: 6, dist: 0.5, jump: () => p.grounded && ly() < LANE + 0.9 && p.pos.z > 102.6 });
      yield* b.goTo(L(4.4, LANE + 2.1, 107.4), { timeout: 6, dist: 0.6, y: true, jump: () => p.grounded && ly() < LANE + 1.5 && p.pos.z > 104.7 });
      yield* b.goTo(L(4.5, 0.65, 114), { timeout: 9, dist: 0.6, y: true });
      yield 0.3;
      yield* b.goTo(L(0.5, LANE, 118.5), { timeout: 8 });
    }
    if (this.from('climb')) {
      yield* b.goTo(L(0, LANE, 122.6), { timeout: 8, dist: 0.5 });
      yield* b.goTo(L(0, 3.5, 126.6), { timeout: 12, y: true });
    }
    if (this.from('wind')) {
      yield* lull(2.6, 0, 128);
      yield* leg(0, 2.0, 140, { jump: edge(134) });
      yield* leg(1.5, 2.0, 144.6, { dist: 0.35 });
      yield* lull(1.9, 1.5, 144.6);
      yield* leg(1.5, 1.6, 153.6, { dist: 0.4 });
      yield* leg(0, 1.6, 159.6, { slide: () => p.pos.z > 153.5 && p.pos.z < 154.5 });
      yield* lull(1.5, 0, 159.4);
      yield* leg(0, -0.8, 167.5, { jump: edge(161) });
      yield* leg(0, 4.2, 174.4, { timeout: 12 });
      yield* lull(2.0, 0, 175);
      yield* leg(0, -0.4, 186.5, { jump: edge(178) });
      // the third scroll piece: down into the court beside the roof, and back up the ladder
      yield* b.goTo(L(4.6, -0.4, 187.9), { timeout: 6, dist: 0.4 });
      yield* b.goTo(L(8.7, -8, 188.3), { timeout: 8, dist: 0.5 });
      yield 0.4;
      yield* b.goTo(L(6.6, -8, 187.5), { timeout: 6, dist: 0.3 });
      yield* b.goTo(L(3.6, -0.4, 187.5), { timeout: 12, y: true });
      yield* lull(1.7, 0, 190);
      yield* leg(0, -1.4, 196.8, { jump: edge(192) });
      yield* leg(0, -1.4, 204.4, { slide: () => p.pos.z > 197 && p.pos.z < 198 });
      yield* lull(1.5, 0, 204.4);
      yield* leg(0, -2.8, 212.5, { jump: edge(206) });
      yield* leg(0, -1.0, 221.5, { jump: () => p.grounded && p.pos.z > 216.5 && ly() < -2 });
      yield* lull(2.2, 0, 222);
      yield* leg(0, -2.2, 234, { jump: edge(228) });
      yield* leg(0, -2.2, 238.6);
    }
    if (this.from('slide')) {
      // off the wall onto the hay, and down the hill, round the stones
      yield* b.goTo(L(0, -10.5, 249.5), { timeout: 10, jump: edge(WALL_Z + 0.2) });
      let t = 0;
      while (p.pos.z < 490 && t < 60) {
        const z = p.pos.z;
        let u = 0;
        for (const [ru, rz, rr] of ROCKS) {
          if (rz < z - 1 || rz > z + 16) continue;
          const mine = p.pos.x - trackX(z);
          if (Math.abs(ru - mine) < rr + 1.6) u = ru > 0 ? ru - (rr + 2.6) : ru + (rr + 2.6);
        }
        b.steer(trackX(z + 9) + u, z + 9, 1);
        const dt: number = yield;
        t += dt ?? 0;
      }
      if (p.pos.z < 490) {
        b.assist(`stuck on the hill at z=${p.pos.z.toFixed(1)}`);
        p.teleport(L(0, PLAIN + 0.4, 491));
      }
    }
    yield* b.goTo(L(0, PLAIN, 501.5), { timeout: 10 });
    b.stop();
    b.note(`blown from a roof: ${this.blown}`);
    yield* b.until(() => this.phase === 'done', 60, 'the end of the chapter');
  }

  override dispose() {
    const g = this.g;
    g.cam.hint = null;
    g.audio.bed('crowd', 0);
    this.sky.dispose();
    this.ocean.dispose();
    this.motes.dispose();
    this.streaks.dispose();
    for (const f of this.figures) f.dispose();
    this.doveMesh.geometry.dispose();
    (this.doveMesh.material as THREE.Material).dispose();
  }
}
