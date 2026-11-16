// Chapter 5: Nineveh (Jonah 3:1–10).
//
// What the account says: the word of the LORD came unto Jonah the second time: Arise, go unto Nineveh, that great
// city, and preach unto it the preaching that I bid thee (1–2). Jonah arose and went; Nineveh was an exceeding great
// city of three days' journey (3). He began to enter into the city a day's journey, and he cried, and said, Yet forty
// days, and Nineveh shall be overthrown (4). The people of Nineveh believed God, proclaimed a fast and put on
// sackcloth, from the greatest of them even to the least (5). Word came unto the king: he arose from his throne,
// laid his robe from him, covered him with sackcloth, and sat in ashes (6). He caused it to be proclaimed and
// published through Nineveh by the decree of the king and his nobles (7–9). God saw their works (10).
//
// Who goes, who stays, who speaks. Jonah goes alone, on foot, into the city, and the only words he cries are those of
// verse 4, taken from the verse; he adds nothing and explains nothing. The people do not answer him: they hear, they
// tell one another, and they turn. The king never leaves his palace and Jonah never comes before him: word *comes*
// to the king (6), carried by one of his own people. The decree is cried by the king's heralds, and its words are
// verses 7–9. The word of the LORD (2) and what God saw (10) are shown only as the verses.
//
// The game's own: that Jonah cries it quarter by quarter and from high places; that walls and the din of a market
// keep the word from carrying, and gates can be opened for it; that the player sees the king. Nothing here goes
// against the account, and no speech is invented for anyone.
import * as THREE from 'three';
import type { RAPIER } from '../core/physics';
import { tween, waitFor, type Routine } from '../core/script';
import { Rng, TAU, clamp01, damp, ease, lerp } from '../core/util';
import type { Bot } from '../game/bot';
import { Chapter } from '../game/chapter';
import { cite, citeRange, part } from '../game/verses';
import { LevelBuilder, buildMesh } from '../gfx/build';
import { Figure, type FigureLook } from '../gfx/character';
import { Motes } from '../gfx/particles';
import { Sky, makeLights } from '../gfx/sky';
import { dotTexture } from '../gfx/textures';
import type { Shot } from '../player/camera';
import type { Focus, Interactable } from '../player/controller';
import { Crowd, FarCrowd, type CrowdLook, type Soul } from './ch5_crowd';

type Phase = 'call' | 'gate' | 'market' | 'temple' | 'king' | 'done';
const ORDER: Phase[] = ['call', 'gate', 'market', 'temple', 'king', 'done'];

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const C = {
  sand: 0xd9bf8a,
  pave: 0xcdb68c,
  plaster: 0xdfc48e,
  pale: 0xead7a8,
  brick: 0xc99c64,
  brickDark: 0xb18650,
  lapis: 0x2a4fa6,
  glaze: 0x2e8ca4,
  gold: 0xdcab3a,
  crimson: 0xaa3229,
  ochre: 0xd09a38,
  saffron: 0xe0a82e,
  wood: 0x7a5a3a,
  woodDark: 0x4b3726,
  leaf: 0x5d7f3a,
  ash: 0x8d8880,
};

// Where things are. North is −z: he comes in by the south gate and goes up through the city.
const SIDE = 44; // the walls east and west of the quarters he walks
const WALL_S = 40;
const ARCH_A = 5; // gate quarter | market
const ARCH_B = -31; // market | temple quarter
const WALL_C = -75; // temple quarter | the palace
const WALL_N = -98;
const ZIG = { x: 0, z: -57 };
const TOP = V(0, 10.5, -52); // where he stands to cry from the temple tower
const HIGH = 2.4; // above this a cry carries over walls

/** The walled spaces. 0 gate quarter, 1 the walled garden, 2 market, 3 the khan, 4 temple quarter, 5 west court, 6 east court. */
const ROOMS: { zone: number; x0: number; z0: number; x1: number; z1: number }[] = [
  { zone: 1, x0: 18.5, z0: 12, x1: 31, z1: 28 },
  { zone: 3, x0: 14, z0: -28, x1: 32, z1: -10 },
  { zone: 5, x0: -42.5, z0: -70, x1: -20, z1: -46 },
  { zone: 6, x0: 20, z0: -70, x1: 42.5, z1: -46 },
];
const zoneOf = (x: number, z: number) => {
  for (const r of ROOMS) if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return r.zone;
  return z > ARCH_A ? 0 : z > ARCH_B ? 2 : 4;
};
const districtOf = (zone: number) => (zone <= 1 ? 0 : zone <= 3 ? 1 : 2);
const QUARTER = ['the gate quarter', 'the market', 'the temple quarter'];
/** How far a cry carries at street level in each quarter (the market's din swallows it). */
const GROUND = [8, 4.6, 8];

const LOOK_GATE: CrowdLook = { robes: [0xcf9a4a, 0xe8dcc0, 0xb8683a, 0xd8c08a, 0x9a6a3a, 0xc7502f], gears: [0xe8dcc0, 0xc04a3a, 0xd8c08a, 0x7a5a3a] };
const LOOK_MARKET: CrowdLook = { robes: [0xc23a2e, 0x2f8ca0, 0xe0a82e, 0x7a3a8a, 0x4a8a4a, 0xe8dcc0, 0xd0602a], gears: [0xe8dcc0, 0xe0a82e, 0x2f6aa0, 0xc23a2e] };
const LOOK_TEMPLE: CrowdLook = { robes: [0x2a4fa6, 0x6a2f8a, 0xf0e6d0, 0xb0282a, 0x2e8ca4, 0xd8a838], gears: [0xf0e6d0, 0xdcab3a, 0x2a4fa6] };
const LOOK_FAR = [0xc23a2e, 0x2f8ca0, 0xe0a82e, 0xe8dcc0, 0x2a4fa6, 0xcf9a4a, 0x7a3a8a];

const KING: FigureLook = { robe: 0x8f1f2c, hem: 0xdcab3a, sash: 0xdcab3a, mantle: 0x4a2a84, cloth: 0xdcab3a, skin: 0xb07a50, beard: 0x1a1410, head: 'crown', height: 1.88, build: 1.16 };
const KING_SACK: FigureLook = { robe: 0x6f6658, hem: 0x5a5246, sash: 0x4a4238, cloth: 0x6f6658, skin: 0xb07a50, beard: 0x1a1410, head: 'bare', height: 1.88, build: 1.16 };
const NOBLE_A: FigureLook = { robe: 0x2a4fa6, hem: 0xdcab3a, sash: 0xdcab3a, mantle: 0xf0e6d0, cloth: 0xf0e6d0, skin: 0xa87048, beard: 0x2a1c14, head: 'turban', height: 1.78, build: 1.08 };
const NOBLE_B: FigureLook = { robe: 0x6a2f8a, hem: 0xdcab3a, sash: 0xe8dcc0, mantle: 0x2e8ca4, cloth: 0xdcab3a, skin: 0xbb8860, beard: 0x6a5a4a, head: 'turban', height: 1.74, build: 1.1 };
const RUNNER: FigureLook = { robe: 0x756b5c, hem: 0x5a5246, sash: 0x4a4238, cloth: 0x8a7f6e, skin: 0x9a6a44, beard: 0x2a1c14, head: 'cap', height: 1.7 };

interface Gate {
  name: string;
  a: number;
  b: number;
  open: boolean;
  leaves: THREE.Object3D[];
  collider: RAPIER.Collider | null;
  it: Interactable;
  at: THREE.Vector3;
}

interface Ring {
  mesh: THREE.Mesh;
  t: number;
  radius: number;
  life: number;
}

const _v = new THREE.Vector3();
const _c = new THREE.Color();

export class Nineveh extends Chapter {
  phase: Phase = 'call';
  crowd = new Crowd(5);
  private far!: FarCrowd;
  private rng = new Rng(53);
  private sky!: Sky;
  private motes!: Motes;
  private seek: Phase | null = null;
  private gates: Gate[] = [];
  private links = new Set<string>();
  private rings: Ring[] = [];
  private canCry = false;
  private cool = 0;
  private cryLock = 0;
  cries = 0;
  private free = false;
  private cryFocus: Focus = { kind: 'use', prompt: 'Cry out', progress: 0, pos: V(0, 0, 0) };
  private topCry = false;
  private toastT = 0;
  private rustle = 0;
  private objectiveKey = '';
  private objective: { text: string; sub: () => string } | null = null;
  private lots: { x0: number; z0: number; x1: number; z1: number }[] = [];
  private king!: Figure;
  private kingSack!: Figure;
  private nobles: Figure[] = [];
  private runner!: Figure;
  private court: Figure[] = [];
  private robe!: THREE.Object3D;
  private crown!: THREE.Object3D;
  private ashes!: Motes;
  private banners: { mesh: THREE.Mesh; phase: number }[] = [];
  private dusk = 0;
  private quarterShown = -1;
  private stragglers = false;

  // ---- building ------------------------------------------------------------------------------------------------

  build() {
    const g = this.g;
    const q = g.quality;
    const seek = g.params.get('seek') as Phase | null;
    if (seek && ORDER.includes(seek)) this.seek = seek;

    const sun = V(-0.42, 0.7, 0.52);
    this.sky = new Sky({ top: 0x5f8fc0, horizon: 0xf2dcae, bottom: 0xdcc594, sunDir: sun, sunColor: 0xfff0c8, sunSize: 0.034, sunGlow: 1.1, cloudCover: 0.22, cloudLit: 0xfff4de, cloudDark: 0xd2bd9c, cloudSpeed: 0.8, stars: 0 });
    g.root.add(this.sky.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: sun, sunColor: 0xffe4b4, sunIntensity: 2.7, skyColor: 0xc4dcff, groundColor: 0xc09a62, hemiIntensity: 1.15, shadowSize: q.shadowSize, shadowRange: 30 });
    g.engine.setView(560, 60, 400, 0xe8d09c);
    const grade = g.engine.post.grade;
    grade.tint.setRGB(1.03, 1.0, 0.94);
    grade.lift.setRGB(0.02, 0.014, 0.004);
    grade.saturation = 1.12;
    grade.contrast = 1.06;
    grade.vignette = 0.3;
    grade.bloom = 0.32;
    grade.threshold = 0.9;
    grade.exposure = 1.0;

    const b = new LevelBuilder(g.physics, 51);
    this.buildGround(b);
    this.buildWalls(b);
    this.buildGateQuarter(b);
    this.buildMarket(b);
    this.buildTemple(b);
    this.buildPalace(b);
    this.buildFarCity(b);
    g.root.add(b.finish('nineveh'));

    const p = g.spawnPlayer({ x: 0, y: 0.1, z: 62 }, Math.PI);
    p.canSlide = false;
    // the ladder up the granary
    p.climbZones.push({ origin: V(-14, 0, -13), normal: V(1, 0, 0), halfWidth: 0.75, yMin: 0, yMax: 8.5 });
    g.cam.dist = 7.8;
    g.cam.hint = (at) => (at.y > 7 ? { dist: 10.5, pitch: 0.52, strength: 0.8 } : at.y > HIGH ? { dist: 9, pitch: 0.46, strength: 0.6 } : null);

    this.buildPeople();
    this.buildCourt();
    this.buildGates();
    this.buildToys();

    // ---- scroll pieces
    const rec = g.save.record(5);
    g.scrolls.add(0, V(14, 4.3, 33.2), 'Jeremiah 18:7', g.root, rec.scrolls[0]);
    g.scrolls.add(1, V(30.4, 3.1, -25.6), 'Jeremiah 18:8', g.root, rec.scrolls[1]);
    g.scrolls.add(2, V(-8, 8.6, -57), 'Matthew 12:41', g.root, rec.scrolls[2]);

    // ---- the cry's widening ring
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 8;
      g.root.add(mesh);
      this.rings.push({ mesh, t: 0, radius: 1, life: 0 });
    }

    this.motes = new Motes(Math.round(220 * q.particles), { color: 0xfff0cc, size: 0.075, opacity: 0.5, box: V(34, 14, 34), velocity: V(0.5, 0.04, 0.25) });
    g.root.add(this.motes.object);
    g.audio.bed('wind', 0.22);
    g.audio.bed('crowd', 0.0);

    if (this.seek && ORDER.indexOf(this.seek) >= ORDER.indexOf('market')) {
      const at = this.seek === 'market' ? V(0, 0.1, 2) : this.seek === 'temple' ? V(0, 0.1, -33.5) : TOP.clone();
      p.teleport(at, Math.PI);
      g.cam.snap(p, 0);
    } else if (this.seek === 'gate') {
      p.teleport(V(0, 0.1, 35), Math.PI);
      g.cam.snap(p, 0);
    }
  }

  private buildGround(b: LevelBuilder) {
    b.block(0, -1, -40, 460, 1, 520, C.sand, { mat: 'sand', jitter: 0, shade: 0 });
    // the way up through the city, and the road to the gate
    b.box(0, 0.016, 19, 9, 0.03, 122, C.pave, { mat: 'stone', collide: false, jitter: 0.02, shade: 0 });
    b.box(0, 0.018, 20, 18.4, 0.03, 14.4, C.pave, { mat: 'stone', collide: false, jitter: 0.02, shade: 0 });
    b.box(0, 0.018, -37.4, 40, 0.03, 12.6, C.pave, { mat: 'stone', collide: false, jitter: 0.02, shade: 0 });
    // he cannot wander off across the plain
    b.wall(-17, 5, 62, 1, 12, 44);
    b.wall(17, 5, 62, 1, 12, 44);
    b.wall(0, 5, 84, 36, 12, 1);
    // the road in: milestones, a few palms, a cart left by the way
    for (const [x, z, h] of [
      [-7.5, 71, 5.4],
      [8.5, 66, 6.2],
      [-9.5, 52, 5.8],
      [10, 50, 5.2],
      [-12, 46, 6.4],
    ]) {
      this.palm(b, x, z, h);
    }
    b.block(5.6, 0, 56, 0.5, 1.1, 0.5, 0xb9a47c, { mat: 'stone', rotY: 0.2 });
    b.block(-5.7, 0, 68, 0.5, 0.9, 0.5, 0xb9a47c, { mat: 'stone', rotY: -0.3 });
  }

  private palm(b: LevelBuilder, x: number, z: number, h: number) {
    const lean = b.rng.range(-0.06, 0.06);
    b.post(x, 0, z, 0.2, h, 0x8a6a48, { mat: 'wood', seg: 6, rTop: 0.13, rot: new THREE.Euler(lean, 0, lean * 0.7), noLedge: true });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + b.rng.range(-0.2, 0.2);
      const len = b.rng.range(1.9, 2.6);
      const droop = b.rng.range(0.35, 0.7);
      b.box(x + Math.sin(a) * len * 0.45, h + 0.1 - droop * 0.35, z + Math.cos(a) * len * 0.45, 0.5, 0.06, len, i % 2 ? 0x55783a : C.leaf, { rot: new THREE.Euler(droop, a, 0, 'YXZ'), collide: false, doubleSide: true, jitter: 0.1 });
    }
    b.ball(x, h + 0.05, z, 0.3, 0x6a5a34, { detail: 0 });
  }

  /** A run of wall along x at one z. */
  private wallX(b: LevelBuilder, x0: number, x1: number, z: number, h: number, t: number, opts: { crenel?: boolean; far?: boolean; color?: number } = {}) {
    const len = x1 - x0;
    if (len <= 0) return;
    b.block((x0 + x1) / 2, 0, z, len, h, t, opts.color ?? C.brick, { mat: 'brick', collide: !opts.far, noShadow: !!opts.far, jitter: 0.03 });
    if (opts.crenel !== false) {
      const n = Math.max(1, Math.floor(len / 2.4));
      for (let i = 0; i < n; i++) b.block(x0 + (i + 0.5) * (len / n), h, z, 1.2, 0.7, t, opts.color ?? C.brick, { mat: 'brick', collide: false, noShadow: !!opts.far, jitter: 0.03 });
    }
  }

  /** A run of wall along z at one x. */
  private wallZ(b: LevelBuilder, z0: number, z1: number, x: number, h: number, t: number, opts: { crenel?: boolean; far?: boolean; color?: number } = {}) {
    const len = z1 - z0;
    if (len <= 0) return;
    b.block(x, 0, (z0 + z1) / 2, t, h, len, opts.color ?? C.brick, { mat: 'brick', collide: !opts.far, noShadow: !!opts.far, jitter: 0.03 });
    if (opts.crenel !== false) {
      const n = Math.max(1, Math.floor(len / 2.4));
      for (let i = 0; i < n; i++) b.block(x, h, z0 + (i + 0.5) * (len / n), t, 0.7, 1.2, opts.color ?? C.brick, { mat: 'brick', collide: false, noShadow: !!opts.far, jitter: 0.03 });
    }
  }

  /** A band of glazed brick on a wall face that looks along ±z, with gold above, below and in rosettes. */
  private glazeZ(b: LevelBuilder, x: number, y: number, z: number, w: number, h: number, facing: number, color = C.lapis) {
    const o = { collide: false, jitter: 0.02, shade: 0.05 } as const;
    b.box(x, y, z + facing * 0.06, w, h, 0.12, color, o);
    b.box(x, y + h / 2 + 0.12, z + facing * 0.08, w + 0.04, 0.22, 0.16, C.gold, o);
    b.box(x, y - h / 2 - 0.12, z + facing * 0.08, w + 0.04, 0.22, 0.16, C.gold, o);
    const n = Math.max(1, Math.round(w / 1.5));
    for (let i = 0; i < n; i++) {
      const rx = x - w / 2 + (i + 0.5) * (w / n);
      b.box(rx, y, z + facing * 0.14, 0.46, 0.46, 0.08, 0xf2e6c0, { ...o, rot: new THREE.Euler(0, 0, Math.PI / 4) });
      b.box(rx, y, z + facing * 0.17, 0.2, 0.2, 0.08, C.gold, { ...o, rot: new THREE.Euler(0, 0, Math.PI / 4) });
    }
  }

  private glazeX(b: LevelBuilder, x: number, y: number, z: number, w: number, h: number, facing: number, color = C.lapis) {
    const o = { collide: false, jitter: 0.02, shade: 0.05 } as const;
    b.box(x + facing * 0.06, y, z, 0.12, h, w, color, o);
    b.box(x + facing * 0.08, y + h / 2 + 0.12, z, 0.16, 0.22, w + 0.04, C.gold, o);
    b.box(x + facing * 0.08, y - h / 2 - 0.12, z, 0.16, 0.22, w + 0.04, C.gold, o);
  }

  /** A banner hung from a bracket: it stirs a little in the wind. */
  private banner(x: number, y: number, z: number, w: number, h: number, color: number, yaw = 0) {
    const geo = new THREE.PlaneGeometry(w, h, 1, 5);
    geo.translate(0, -h / 2, 0);
    const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, flatShading: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.26, h * 0.9), new THREE.MeshLambertMaterial({ color: C.gold, side: THREE.DoubleSide }));
    stripe.position.set(0, -h / 2, 0.02);
    mesh.add(stripe);
    this.g.root.add(mesh);
    this.banners.push({ mesh, phase: this.rng.range(0, TAU) });
  }

  private buildWalls(b: LevelBuilder) {
    const H = 7;
    // the south wall and the great gate
    this.wallX(b, -150, -11.5, WALL_S, H, 3);
    this.wallX(b, 11.5, 150, WALL_S, H, 3);
    for (const s of [1, -1]) {
      b.block(s * 8, 0, WALL_S, 7, 11, 7, C.brick, { mat: 'brick', jitter: 0.02 });
      for (let i = 0; i < 3; i++) for (const zz of [-3, 3]) b.block(s * 8 - 2.4 + i * 2.4, 11, WALL_S + zz, 1.3, 0.8, 1, C.brick, { mat: 'brick', collide: false });
      for (const zz of [-1, 1]) for (const xx of [-3, 3]) b.block(s * 8 + xx, 11, WALL_S + zz * 1.2, 1, 0.8, 1.3, C.brick, { mat: 'brick', collide: false });
      for (const f of [1, -1]) {
        this.glazeZ(b, s * 8, 8.3, WALL_S + f * 3.5, 7, 2.3, f);
        this.glazeZ(b, s * 8, 3.4, WALL_S + f * 3.5, 7, 1.1, f, C.glaze);
      }
      this.glazeX(b, s * 4.5, 8.3, WALL_S, 7, 2.3, -s);
      // far towers along the wall
      for (const x of [34, 62, 92, 124]) b.block(s * x, 0, WALL_S, 6, 9.5, 6, C.brick, { mat: 'brick', noShadow: x > 40, collide: x < 40 });
      this.banner(s * 8, 6.4, WALL_S + 3.62, 1.5, 4.2, C.crimson);
      this.banner(s * 5.6, 6.2, WALL_S - 3.7, 1.2, 3.4, C.crimson);
      // the doors, standing open
      b.box(s * 4.3, 3.1, WALL_S - 2.9, 0.26, 6.2, 3.4, C.woodDark, { mat: 'wood', collide: false, rotY: s * 0.12 });
      for (const y of [1.2, 3.1, 5]) b.box(s * 4.14, y, WALL_S - 2.9, 0.1, 0.3, 3.44, 0xa8823a, { collide: false, rotY: s * 0.12 });
    }
    b.block(0, 6.4, WALL_S, 9, 3.3, 3, C.brick, { mat: 'brick' });
    for (const f of [1, -1]) this.glazeZ(b, 0, 8.05, WALL_S + f * 1.5, 9, 2.2, f);
    for (let i = 0; i < 4; i++) b.block(-3.4 + i * 2.27, 9.7, WALL_S, 1.2, 0.7, 3, C.brick, { mat: 'brick', collide: false });

    // east and west, and the north wall behind the palace
    for (const s of [1, -1]) {
      this.wallZ(b, WALL_N, WALL_S + 1.5, s * SIDE, H, 3);
      for (const z of [18, -13, -52, -86]) b.block(s * SIDE, 0, z, 5, 9.5, 5, C.brick, { mat: 'brick' });
    }
    this.wallX(b, -SIDE, SIDE, WALL_N, H, 3);

    // the two inner walls, each with its arch
    for (const z of [ARCH_A, ARCH_B]) {
      this.wallX(b, -SIDE + 1.5, -4, z, 5, 2);
      this.wallX(b, 4, SIDE - 1.5, z, 5, 2);
      b.block(0, 4.3, z, 8, 1.4, 2, C.brick, { mat: 'brick' });
      for (const s of [1, -1]) {
        b.block(s * 4.6, 0, z, 1.6, 6.3, 2.6, C.brickDark, { mat: 'brick' });
        for (const f of [1, -1]) this.glazeZ(b, s * 4.6, 5.2, z + f * 1.3, 1.6, 1.2, f, C.glaze);
      }
      for (const f of [1, -1]) this.glazeZ(b, 0, 5.0, z + f * 1.0, 6.2, 0.9, f);
    }
    for (const s of [1, -1]) {
      this.banner(s * 3.2, 4.1, ARCH_A + 1.06, 1, 2.6, C.ochre);
      this.banner(s * 3.2, 4.1, ARCH_B + 1.06, 1, 2.6, 0x2a4fa6);
    }

    // the wall before the palace, its bronze doors shut
    this.wallX(b, -SIDE + 1.5, -6.5, WALL_C, 5, 2);
    this.wallX(b, 6.5, SIDE - 1.5, WALL_C, 5, 2);
    for (const s of [1, -1]) {
      b.block(s * 5, 0, WALL_C, 3.4, 7.2, 3.4, C.brick, { mat: 'brick' });
      this.glazeZ(b, s * 5, 5.6, WALL_C + 1.7, 3.4, 1.6, 1);
      for (const xx of [-1.1, 1.1]) b.block(s * 5 + xx, 7.2, WALL_C + 1.2, 0.9, 0.6, 0.9, C.brick, { mat: 'brick', collide: false });
    }
    b.block(0, 0, WALL_C, 6.6, 5, 1.2, 0x8a6a34, { mat: 'wood', jitter: 0.02 });
    for (const y of [1, 2.5, 4]) b.box(0, y, WALL_C + 0.64, 6.6, 0.26, 0.1, C.gold, { collide: false });
    b.box(0, 2.5, WALL_C + 0.66, 0.16, 5, 0.1, 0x5a4420, { collide: false });
    // the heralds' walk above the doors
    b.block(0, 5, WALL_C, 6.6, 0.4, 2.2, C.brickDark, { mat: 'brick' });
  }

  /** A flat-roofed house of mud brick. Its roof can be walked. */
  private house(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, h: number, tone: number, opts: { door?: 'n' | 's' | 'e' | 'w'; far?: boolean; upper?: boolean } = {}) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const far = !!opts.far;
    b.block(cx, 0, cz, w, h, d, tone, { mat: 'plaster', collide: !far, noShadow: far, jitter: 0.06, shade: 0.2 });
    if (far) {
      if (opts.upper) b.block(cx + w * 0.12, h, cz - d * 0.1, w * 0.5, 2.2, d * 0.5, tone, { mat: 'plaster', collide: false, noShadow: true, jitter: 0.08 });
      return;
    }
    // a parapet round the roof
    const rim = { mat: 'plaster', collide: false, jitter: 0.04, shade: 0.05 } as const;
    b.block(cx, h, z0 + 0.14, w, 0.3, 0.28, tone, rim);
    b.block(cx, h, z1 - 0.14, w, 0.3, 0.28, tone, rim);
    b.block(x0 + 0.14, h, cz, 0.28, 0.3, d - 0.56, tone, rim);
    b.block(x1 - 0.14, h, cz, 0.28, 0.3, d - 0.56, tone, rim);
    if (opts.upper) {
      b.block(cx + w * 0.16, h, cz - d * 0.12, w * 0.46, 2.1, d * 0.46, tone, { mat: 'plaster', jitter: 0.08, shade: 0.2 });
    }
    const dark = 0x3b2a1e;
    const face = opts.door;
    if (face) {
      const o = { collide: false, jitter: 0, shade: 0 } as const;
      const along = face === 'n' || face === 's';
      const fz = face === 'n' ? z0 : z1;
      const fx = face === 'w' ? x0 : x1;
      const at = b.rng.range(-0.25, 0.25) * (along ? w : d);
      if (along) {
        const s = face === 'n' ? -1 : 1;
        b.box(cx + at, 1.0, fz + s * 0.03, 1.05, 2.0, 0.1, dark, o);
        b.box(cx + at, 2.12, fz + s * 0.06, 1.5, 0.22, 0.2, C.woodDark, { ...o, mat: 'wood' });
        for (const k of [-1, 1]) if (Math.abs(at + k * w * 0.3) < w / 2 - 0.7) b.box(cx + at + k * w * 0.3, Math.min(h - 0.9, 2.3), fz + s * 0.03, 0.55, 0.7, 0.1, dark, o);
        for (let i = 0; i < Math.floor(w / 1.3); i++) b.box(x0 + 0.7 + i * 1.3, h - 0.35, fz + s * 0.22, 0.14, 0.14, 0.5, C.woodDark, { ...o, mat: 'wood' });
      } else {
        const s = face === 'w' ? -1 : 1;
        b.box(fx + s * 0.03, 1.0, cz + at, 0.1, 2.0, 1.05, dark, o);
        b.box(fx + s * 0.06, 2.12, cz + at, 0.2, 0.22, 1.5, C.woodDark, { ...o, mat: 'wood' });
        for (const k of [-1, 1]) if (Math.abs(at + k * d * 0.3) < d / 2 - 0.7) b.box(fx + s * 0.03, Math.min(h - 0.9, 2.3), cz + at + k * d * 0.3, 0.1, 0.7, 0.55, dark, o);
        for (let i = 0; i < Math.floor(d / 1.3); i++) b.box(fx + s * 0.22, h - 0.35, z0 + 0.7 + i * 1.3, 0.5, 0.14, 0.14, C.woodDark, { ...o, mat: 'wood' });
      }
    }
  }

  /** Fills a block of the city with houses and narrow lanes between. */
  private fill(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, opts: { far?: boolean; lot?: number; lane?: number; door?: 'n' | 's' | 'e' | 'w' } = {}) {
    const r = b.rng;
    const lot = opts.lot ?? 8;
    const lane = opts.lane ?? 1.1;
    const tones = [C.plaster, C.pale, C.brick, 0xd6b47e, 0xcfa870];
    let z = z0;
    while (z < z1 - 3) {
      const d = Math.min(z1 - z, r.range(lot * 0.75, lot * 1.25));
      const dd = z1 - (z + d) < 3.5 ? z1 - z : d;
      let x = x0;
      while (x < x1 - 3) {
        const w = Math.min(x1 - x, r.range(lot * 0.75, lot * 1.3));
        const ww = x1 - (x + w) < 3.5 ? x1 - x : w;
        const h = opts.far ? r.range(3, 7.5) : r.range(3.2, 6.2);
        if (!opts.far || r.chance(0.92)) {
          this.house(b, x + lane / 2, z + lane / 2, x + ww - lane / 2, z + dd - lane / 2, h, r.pick(tones), { far: opts.far, door: opts.door ?? r.pick(['n', 's', 'e', 'w'] as const), upper: r.chance(0.3) });
          if (opts.far) this.lots.push({ x0: x, z0: z, x1: x + ww, z1: z + dd });
        }
        x += ww;
      }
      z += dd;
    }
  }

  private buildGateQuarter(b: LevelBuilder) {
    // ---- the houses on the way and round the square
    this.house(b, -17, 28.7, -5.5, 36.5, 3.6, C.plaster, { door: 'e' });
    this.house(b, -20, 13, -9.5, 25.8, 4.2, C.pale, { door: 'e', upper: true });
    this.house(b, -17, 7, -5.5, 12.2, 3.4, C.brick, { door: 'e' });
    this.house(b, 5.5, 7, 17.5, 11.6, 3.6, C.plaster, { door: 'w' });
    // the house with the outer stair (the first high place), and the roof beyond the gap
    this.house(b, 11, 13, 18.2, 27, 3.2, C.pale, { door: 'w' });
    b.ramp(10.1, 0, 22.5, 1.8, 3.2, 8, 0xd8c096, { mat: 'plaster', rotY: Math.PI });
    b.block(10.1, 0, 17.6, 1.8, 3.2, 1.8, 0xd8c096, { mat: 'plaster' });
    this.house(b, 11, 29.4, 17.5, 36.5, 3.2, C.plaster, { door: 'w' });
    // a hut on that roof, with the scroll piece behind it
    b.block(14, 3.2, 31.2, 3.2, 1.9, 1.6, C.brick, { mat: 'plaster' });
    b.box(14, 5.2, 31.2, 3.6, 0.12, 2.0, 0xb8683a, { mat: 'cloth', collide: false });

    // ---- the walled garden east of the square: its wall keeps the word out
    const y0 = 3.4;
    this.wallZ(b, 12, 28, 18.5, y0, 0.6, { crenel: false, color: C.pale });
    this.wallZ(b, 12, 28, 31, y0, 0.6, { crenel: false, color: C.pale });
    this.wallX(b, 18.5, 31, 12, y0, 0.6, { crenel: false, color: C.pale });
    this.wallX(b, 18.5, 31, 28, y0, 0.6, { crenel: false, color: C.pale });
    this.palm(b, 28.5, 14.5, 5.6);
    this.palm(b, 21.5, 25, 4.8);
    b.block(25, 0, 20, 3.4, 0.35, 2.2, 0x8a9a8a, { mat: 'stone' });
    b.box(25, 0.36, 20, 2.8, 0.04, 1.6, 0x3f9ab0, { collide: false, jitter: 0, shade: 0 });
    // an oven by the wall: the way back out
    b.block(19.9, 0, 26.4, 1.7, 1.7, 1.7, 0xb8845a, { mat: 'plaster', taper: 0.8 });
    // green things
    for (const [x, z] of [
      [22, 14],
      [29, 23],
      [23.5, 26.5],
      [29.5, 18],
    ]) {
      b.ball(x, 0.45, z, 0.75, 0x5f8a3a, { detail: 1, squash: V(1, 0.7, 1), jitter: 0.1 });
    }

    // ---- the square: a well, two palms, a seller's awnings
    b.post(-5.5, 0, 20, 0.95, 0.8, 0xb9a47c, { mat: 'stone', seg: 10 });
    b.cyl(-5.5, 0.78, 20, 0.7, 0.7, 0.06, 0x2f6f8a, { collide: false, seg: 10, jitter: 0, shade: 0 });
    for (const s of [1, -1]) b.post(-5.5 + s * 1.05, 0, 20, 0.08, 2.2, C.wood, { mat: 'wood', collide: false });
    b.box(-5.5, 2.2, 20, 2.5, 0.12, 0.12, C.wood, { mat: 'wood', collide: false });
    this.palm(b, -7.6, 14.8, 6.2);
    this.palm(b, 7.4, 25.6, 5.4);
    this.stall(b, 5.2, 15.2, Math.PI, 0xc7502f, 0);
    this.stall(b, -4.4, 25.6, 0, 0x2f8ca0, 1);

    // ---- behind them, houses to the walls; a lane leads west from the square to a small court
    this.fill(b, -42, 7, -31, 37.5);
    this.fill(b, -31, 7, -20.6, 20.4, { door: 's' });
    this.fill(b, -31, 33.6, -17.6, 37.5, { door: 'n' });
    this.house(b, -20.6, 28.9, -17.6, 33.4, 3.4, C.brick, {});
    this.palm(b, -28.4, 30.6, 5);
    b.block(-23, 0, 22.2, 2.2, 0.5, 1, 0xb9a47c, { mat: 'stone' });
    this.fill(b, 32, 7, 42, 37.5);
    this.fill(b, 18.5, 29, 31.4, 37.5, { door: 'n' });
    this.fill(b, 18.6, 7, 31.4, 11.4, { door: 's' });
    // lamps of colour along the way: awnings over doors
    for (const [x, z, c, s] of [
      [-5.4, 32, 0xc7502f, 1],
      [-9.4, 17, 0xe0a82e, 1],
      [5.4, 9.4, 0x2f8ca0, -1],
    ] as const) {
      b.box(x + s * 0.6, 2.5, z, 1.4, 0.08, 2.4, c, { mat: 'cloth', collide: false, rot: new THREE.Euler(0, 0, -s * 0.28), doubleSide: true });
    }
  }

  /** A market stall: four posts, an awning, a table of wares. `rot` 0 looks south (+z). */
  private stall(b: LevelBuilder, x: number, z: number, rot: number, cloth: number, kind: number) {
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const at = (lx: number, lz: number) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
    for (const [lx, lz] of [
      [-1.6, -1.2],
      [1.6, -1.2],
      [-1.6, 1.2],
      [1.6, 1.2],
    ]) {
      const p = at(lx, lz);
      b.post(p.x, 0, p.z, 0.07, lz > 0 ? 2.38 : 2.62, C.wood, { mat: 'wood', collide: false });
    }
    // the awning leans to the front, and can be stood on
    b.box(x, 2.56, z, 3.7, 0.1, 2.9, cloth, { mat: 'cloth', rot: new THREE.Euler(0.08, rot, 0, 'YXZ'), surface: 'cloth', doubleSide: true, jitter: 0.03 });
    for (const lx of [-1.2, 0, 1.2]) {
      const p = at(lx, 0);
      b.box(p.x, 2.63, p.z, 0.4, 0.04, 2.92, 0xf0e6d0, { collide: false, rot: new THREE.Euler(0.08, rot, 0, 'YXZ'), jitter: 0 });
    }
    const t = at(0, 0.75);
    b.block(t.x, 0, t.z, 3.0, 0.78, 0.95, C.wood, { mat: 'wood', rotY: rot });
    const r = b.rng;
    for (let i = 0; i < 6; i++) {
      const p = at(-1.2 + i * 0.48, 0.75 + r.range(-0.2, 0.2));
      if (kind === 0) b.ball(p.x, 0.92, p.z, r.range(0.13, 0.19), r.pick([0xc8452a, 0xe0a82e, 0x7a9a3a, 0xa83a5a]), { detail: 0, jitter: 0.1 });
      else if (kind === 1) b.box(p.x, 0.9, p.z, 0.34, r.range(0.14, 0.3), 0.6, r.pick([0xc23a2e, 0x2f8ca0, 0xe0a82e, 0x7a3a8a, 0xf0e6d0]), { collide: false, mat: 'cloth', rotY: rot + r.range(-0.2, 0.2) });
      else if (kind === 2) b.cyl(p.x, 0.96, p.z, 0.08, 0.14, 0.36, r.pick([0xb8683a, 0x9a5a3a, 0xc8946a]), { collide: false, seg: 6 });
      else b.box(p.x, 0.86, p.z, 0.3, 0.14, 0.3, r.pick([C.gold, 0xb8b0a0, 0xa8823a]), { collide: false, rotY: r.range(0, 1) });
    }
    // sacks or jars by the side
    const s = at(2.1, 0.4);
    b.ball(s.x, 0.3, s.z, 0.42, 0xb09a6a, { detail: 1, squash: V(1, 0.72, 1) });
  }

  private buildMarket(b: LevelBuilder) {
    // ---- the granary: the market's high place, with its ladder
    b.block(-17, 0, -13, 6, 8.5, 6, 0xd2b078, { mat: 'plaster', taper: 0.94, jitter: 0.02 });
    b.solid(-17, 4.25, -13, 6, 8.5, 6, { surface: 'stone' });
    const rim = { mat: 'plaster', collide: false } as const;
    for (const s of [1, -1]) {
      b.block(-17, 8.5, -13 + s * 2.72, 5.7, 0.32, 0.24, 0xc9a66e, rim);
      b.block(-17 - 2.72, 8.5, -13, 0.24, 0.32, 5.2, 0xc9a66e, rim);
    }
    b.block(-14.36, 8.5, -15.1, 0.24, 0.32, 1.4, 0xc9a66e, rim);
    b.block(-14.36, 8.5, -10.9, 0.24, 0.32, 1.4, 0xc9a66e, rim);
    for (const y of [2.2, 4.6, 7]) b.box(-17, y, -13, 6.1, 0.22, 6.1, C.brickDark, { collide: false, mat: 'brick' });
    // the ladder
    for (const s of [1, -1]) b.box(-13.86, 4.4, -13 + s * 0.42, 0.09, 8.9, 0.09, C.woodDark, { mat: 'wood', collide: false, rot: new THREE.Euler(0, 0, 0.012) });
    for (let i = 0; i < 17; i++) b.box(-13.86, 0.4 + i * 0.5, -13, 0.07, 0.07, 0.84, C.wood, { mat: 'wood', collide: false });
    this.banner(-14, 8.2, -15.9, 1.1, 3, C.saffron, Math.PI / 2);
    // sacks of grain at its foot
    for (const [x, z] of [
      [-13.2, -15.2],
      [-12.6, -16],
      [-20.9, -9.6],
    ]) {
      b.ball(x, 0.34, z, 0.5, 0xb89c66, { detail: 1, squash: V(1.1, 0.7, 0.9), collide: false });
    }

    // ---- the stalls
    const cloths = [0xc23a2e, 0x2f8ca0, 0xe0a82e, 0x7a3a8a, 0xd0602a, 0x4a8a4a, 0xf0e6d0];
    this.stalls.forEach(([x, z, rot], i) => this.stall(b, x, z, rot, cloths[i % cloths.length], i % 4));

    // ---- the dyer's house and vats: the east side's high place
    this.house(b, 20, -8, 31, 1, 3.4, C.pale, { door: 'w' });
    b.ramp(19.1, 0, -3.5, 1.8, 3.4, 8, 0xd8c096, { mat: 'plaster', rotY: Math.PI });
    b.block(19.1, 0, -8.4, 1.8, 3.4, 1.8, 0xd8c096, { mat: 'plaster' });
    for (const [x, z, c] of [
      [14.6, -1.6, 0xb0282a],
      [16.4, -4.6, 0x2a4fa6],
      [14.2, -6.4, 0xe0a82e],
    ]) {
      b.post(x, 0, z, 0.95, 0.55, 0xb9a47c, { mat: 'stone', seg: 9 });
      b.cyl(x, 0.54, z, 0.74, 0.74, 0.05, c, { collide: false, seg: 9, jitter: 0, shade: 0 });
    }
    // cloth hung to dry on the roof
    for (const [x, c] of [
      [22.5, 0xb0282a],
      [25, 0x2a4fa6],
      [27.5, 0xe0a82e],
      [29.6, 0x7a3a8a],
    ]) {
      b.box(x, 4.5, -5.6, 1.6, 1.7, 0.05, c, { mat: 'cloth', collide: false, doubleSide: true });
    }
    b.box(26, 5.4, -5.6, 9.4, 0.06, 0.06, C.woodDark, { collide: false });
    for (const x of [21.4, 30.6]) b.post(x, 3.4, -5.6, 0.07, 2.1, C.woodDark, { collide: false });

    // ---- the khan: a walled court for travellers, its gate barred
    const K = ROOMS[1];
    const kh = 4;
    this.wallZ(b, K.z0, -20.6, K.x0, kh, 0.8, { crenel: false, color: C.pale });
    this.wallZ(b, -17.4, K.z1, K.x0, kh, 0.8, { crenel: false, color: C.pale });
    b.block(K.x0, 3.2, -19, 1.0, 1.1, 3.4, C.brickDark, { mat: 'brick' });
    this.wallZ(b, K.z0, K.z1, K.x1, kh, 0.8, { crenel: false, color: C.pale });
    this.wallX(b, K.x0, K.x1, K.z0, kh, 0.8, { crenel: false, color: C.pale });
    this.wallX(b, K.x0, K.x1, K.z1, kh, 0.8, { crenel: false, color: C.pale });
    this.glazeX(b, K.x0 - 0.4, 3.75, -19, 3.4, 0.5, -1, C.glaze);
    // the raised sleeping floor along its east wall, bales to climb by, a trough
    b.block(30.3, 0, -19, 2.6, 2.0, 17.2, 0xcfae78, { mat: 'plaster' });
    b.block(28.2, 0, -12, 1.5, 1.0, 1.7, 0xb09a6a, { mat: 'weave' });
    b.block(28.3, 0, -13.9, 1.2, 0.5, 1.2, 0xa88f5e, { mat: 'weave' });
    b.block(20.5, 0, -14, 3.6, 0.5, 1.1, 0x9a8a78, { mat: 'stone' });
    b.box(20.5, 0.5, -14, 3.2, 0.04, 0.7, 0x3f8aa0, { collide: false, jitter: 0, shade: 0 });
    this.palm(b, 17, -25.5, 5.2);
    for (let i = 0; i < 4; i++) b.post(29.2, 2, -26 + i * 4.6, 0.12, 2.3, C.wood, { mat: 'wood', collide: false });
    b.box(30.3, 4.34, -19, 2.9, 0.08, 17.4, 0xb8683a, { mat: 'cloth', collide: false, doubleSide: true });

    // ---- houses to the walls
    this.fill(b, -42, -29.4, -32.4, 3.4, { door: 'e' });
    this.fill(b, 32.8, -29.4, 42, 3.4, { door: 'w' });
    this.palm(b, 6.6, -14, 5.8);
    this.palm(b, -6.8, -25, 5.2);
  }

  /** Where the stalls stand: x, z, which way the front looks. */
  private stalls: [number, number, number][] = [
    [-26, -1.5, 0],
    [-18.5, -1.5, 0],
    [-11, -1.5, 0],
    [9.5, -1.8, 0],
    [-27, -8.5, 0],
    [-9.6, -8.6, Math.PI / 2],
    [9.6, -9, -Math.PI / 2],
    [-27, -21, Math.PI],
    [-19, -22.5, Math.PI],
    [-10, -20, Math.PI / 2],
    [9.6, -21, -Math.PI / 2],
    [-24, -27, Math.PI],
    [-15.5, -27, Math.PI],
    [9.6, -27, -Math.PI / 2],
  ];

  private buildTemple(b: LevelBuilder) {
    const tier = 0xcfa66c;
    const o = { mat: 'brick', jitter: 0.02 } as const;
    // ---- the temple tower: three stages and a shrine of glazed brick
    b.block(ZIG.x, 0, ZIG.z, 26, 4, 26, tier, o);
    b.block(ZIG.x, 4, ZIG.z, 19, 3.5, 19, 0xd4ac72, o);
    b.block(ZIG.x, 7.5, ZIG.z, 12, 3, 12, 0xd9b278, o);
    // buttresses on every face: the look of such towers
    for (const [half, y, h] of [
      [13, 0, 4],
      [9.5, 4, 3.5],
      [6, 7.5, 3],
    ]) {
      const n = Math.round(half / 1.6);
      for (let i = 0; i < n; i++) {
        const at = -half + (i + 0.5) * ((half * 2) / n);
        for (const s of [1, -1]) {
          if (!(y === 0 && s === 1 && Math.abs(at) < 3)) b.box(at, y + h / 2, ZIG.z + s * (half + 0.12), ((half * 2) / n) * 0.5, h, 0.24, 0xdcb880, { collide: false, mat: 'brick', shade: 0.25 });
          b.box(ZIG.x + s * (half + 0.12), y + h / 2, ZIG.z + at, 0.24, h, ((half * 2) / n) * 0.5, 0xdcb880, { collide: false, mat: 'brick', shade: 0.25 });
        }
      }
    }
    // the stairs: up the front, then by the east face, then by the back
    b.ramp(0, 0, ZIG.z + 13 + 3.1, 5, 4, 6.2, 0xdcc49a, { mat: 'stone', rotY: Math.PI });
    for (const s of [1, -1]) b.block(s * 2.8, 0, ZIG.z + 13 + 3.1, 0.6, 4.5, 6.2, tier, { mat: 'brick', taper: 1 });
    b.ramp(10.85, 4, ZIG.z + 5, 2.5, 3.5, 6, 0xdcc49a, { mat: 'stone', rotY: Math.PI });
    b.block(10.85, 4, ZIG.z + 0.8, 2.5, 3.5, 2.4, 0xd4ac72, o);
    b.ramp(-1, 7.5, ZIG.z - 7.35, 2.5, 3, 6, 0xdcc49a, { mat: 'stone', rotY: Math.PI / 2 });
    b.block(3.2, 7.5, ZIG.z - 7.35, 2.4, 3, 2.5, 0xd9b278, o);
    // the shrine
    b.block(ZIG.x, 10.5, ZIG.z, 5, 3.6, 5, C.lapis, { jitter: 0.02 });
    for (const s of [1, -1]) {
      this.glazeZ(b, ZIG.x, 12.3, ZIG.z + s * 2.5, 5, 1.2, s, C.glaze);
      this.glazeX(b, ZIG.x + s * 2.5, 12.3, ZIG.z, 5, 1.2, s, C.glaze);
    }
    b.box(ZIG.x, 11.6, ZIG.z + 2.52, 1.3, 2.2, 0.1, 0x1a2440, { collide: false });
    b.block(ZIG.x, 14.1, ZIG.z, 5.5, 0.36, 5.5, C.gold, { collide: false, jitter: 0.02 });
    for (const sx of [1, -1]) for (const sz of [1, -1]) b.block(ZIG.x + sx * 2.5, 14.4, ZIG.z + sz * 2.5, 0.5, 1.1, 0.5, C.gold, { collide: false, taper: 0.3 });
    for (const s of [1, -1]) {
      this.banner(s * 5.4, 10.2, ZIG.z + 6.06, 1.1, 2.6, 0x2a4fa6);
      this.banner(s * 8.6, 7.2, ZIG.z + 9.56, 1.1, 2.8, C.crimson);
      // fire bowls at the foot of the stair
      b.post(s * 4.4, 0, ZIG.z + 20, 0.5, 1.5, 0xb9a47c, { mat: 'stone', seg: 8, rTop: 0.7 });
      b.ball(s * 4.4, 1.6, ZIG.z + 20, 0.36, 0xffa040, { detail: 0, jitter: 0, shade: 0 });
    }

    // ---- the two walled courts, each with a barred gate on the tower's side
    for (const s of [1, -1]) {
      const x0 = s * 20;
      const x1 = s * 42.5;
      const col = C.pale;
      this.wallZ(b, -70, -58.6, x0, 4, 0.8, { crenel: false, color: col });
      this.wallZ(b, -55.4, -46, x0, 4, 0.8, { crenel: false, color: col });
      b.block(x0, 3.2, -57, 1.0, 1.1, 3.4, C.brickDark, { mat: 'brick' });
      this.glazeX(b, x0 - s * 0.4, 3.75, -57, 3.4, 0.5, -s, C.lapis);
      this.wallX(b, Math.min(x0, x1), Math.max(x0, x1), -46, 4, 0.8, { crenel: false, color: col });
      this.wallX(b, Math.min(x0, x1), Math.max(x0, x1), -70, 4, 0.8, { crenel: false, color: col });
    }
    // west: a garden of the great. east: the craftsmen's yard.
    b.block(-31, 0, -57.5, 4.5, 0.4, 7, 0x9aa49a, { mat: 'stone' });
    b.box(-31, 0.41, -57.5, 3.8, 0.04, 6.2, 0x3f9ab0, { collide: false, jitter: 0, shade: 0 });
    for (const [x, z, h] of [
      [-24, -49, 5.4],
      [-38, -50, 6],
      [-24, -67, 5],
      [-38.5, -66, 5.6],
      [-36, -58, 6.4],
    ]) {
      this.palm(b, x, z, h);
    }
    for (const [x, z] of [
      [-27, -62],
      [-34, -48.5],
      [-26, -53],
    ]) {
      b.ball(x, 0.5, z, 0.9, 0x5f8a3a, { detail: 1, squash: V(1, 0.7, 1), jitter: 0.1 });
    }
    this.house(b, 34, -69.4, 41.6, -61, 3.4, C.brick, { door: 'w' });
    b.block(25, 0, -66, 2.4, 1.0, 2.4, 0x8a7a68, { mat: 'stone' });
    b.ball(25, 1.1, -66, 0.5, 0xff8a30, { detail: 0, jitter: 0, shade: 0 });
    for (const [x, z] of [
      [37, -49.5],
      [39, -52],
      [35.5, -53.5],
    ]) {
      b.post(x, 0, z, 0.5, 1.1, 0xb8683a, { seg: 8, rTop: 0.34 });
    }
    b.block(27, 0, -48.6, 5, 0.9, 1.4, C.wood, { mat: 'wood' });
    this.stall(b, 38, -57.5, -Math.PI / 2, 0xd0602a, 3);

    // ---- the open ground before the tower: palms, an incense seller, the wings
    this.palm(b, -9.5, -34.5, 6.2);
    this.palm(b, 9.5, -34.5, 6.2);
    this.stall(b, -17, -36.5, 0, 0x7a3a8a, 2);
    this.stall(b, 17, -36.5, 0, 0x2a4fa6, 3);
    this.fill(b, -42, -44.6, -24, -32.6, { door: 'e' });
    this.fill(b, 24, -44.6, 42, -32.6, { door: 'w' });
  }

  private buildPalace(b: LevelBuilder) {
    const z0 = -82;
    // the terrace and its stair
    b.block(0, 0, -89.5, 40, 3, 15, 0xd9b880, { mat: 'brick', jitter: 0.02 });
    b.ramp(0, 0, z0 + 2.25, 12, 3, 4.5, 0xdcc49a, { mat: 'stone', rotY: Math.PI });
    for (const s of [1, -1]) {
      b.block(s * 6.6, 0, z0 + 2.25, 1.2, 3.6, 4.5, 0xd4ac72, { mat: 'brick' });
      this.glazeZ(b, s * 13.5, 1.6, z0 + 0.02, 12, 1.5, 1);
      // winged guardians stood for by tall glazed piers
      b.block(s * 8.6, 3, z0 - 1.2, 2, 5, 2, C.lapis, { jitter: 0.02 });
      b.block(s * 8.6, 8, z0 - 1.2, 2.4, 0.4, 2.4, C.gold, { collide: false });
      this.glazeZ(b, s * 8.6, 5.6, z0 - 0.2, 2, 1.2, 1, C.glaze);
    }
    // the back wall of the throne court, all blue and gold
    b.block(0, 3, -96, 40, 8, 1.4, C.lapis, { jitter: 0.02 });
    this.glazeZ(b, 0, 9.4, -95.3, 40, 1.4, 1, C.glaze);
    this.glazeZ(b, 0, 5.0, -95.3, 40, 1.0, 1, 0x1f3c86);
    for (let i = 0; i < 9; i++) b.block(-18 + i * 4.5, 11, -96, 2, 0.9, 1.4, C.lapis, { collide: false });
    // columns
    for (const x of [-17, -12, -7, 7, 12, 17]) {
      b.post(x, 3, -86, 0.55, 5.2, 0xe2cfa0, { mat: 'stone', seg: 10, rTop: 0.45 });
      b.block(x, 8.2, -86, 1.5, 0.45, 1.5, C.gold, { collide: false });
      b.block(x, 3, -86, 1.4, 0.4, 1.4, 0xcdb68c, { collide: false, mat: 'stone' });
    }
    // the dais, the throne, a canopy over it
    b.block(0, 3, -91.5, 7, 0.6, 4.6, 0xcdb68c, { mat: 'stone' });
    b.block(0, 3.6, -92.3, 1.5, 0.62, 1.2, C.gold, { jitter: 0.02 });
    b.block(0, 4.2, -92.9, 1.7, 2.3, 0.3, C.gold, { jitter: 0.02 });
    b.box(0, 5.6, -92.72, 1.1, 0.8, 0.08, C.lapis, { collide: false });
    for (const s of [1, -1]) b.block(s * 0.85, 4.2, -92.3, 0.22, 0.5, 1.2, C.gold, { collide: false });
    for (const sx of [1, -1]) for (const sz of [-93.6, -89.6]) b.post(sx * 3.1, 3.6, sz, 0.09, 4.2, C.gold, { collide: false });
    b.box(0, 7.85, -91.6, 6.8, 0.1, 4.6, C.crimson, { mat: 'cloth', collide: false, doubleSide: true });
    b.box(0, 7.6, -89.3, 6.8, 0.55, 0.06, C.crimson, { mat: 'cloth', collide: false, doubleSide: true });
    // a brazier, cold: the ashes he will sit in
    b.post(3.4, 3, -86.6, 0.75, 0.3, 0x8a7a68, { mat: 'stone', seg: 9 });
    b.ball(3.4, 3.26, -86.6, 0.72, C.ash, { detail: 1, squash: V(1, 0.34, 1), jitter: 0.04, shade: 0.3 });
    this.banner(-10, 8.6, -95.2, 1.6, 4.4, C.crimson);
    this.banner(10, 8.6, -95.2, 1.6, 4.4, C.crimson);
    // palms either side of the stair
    this.palm(b, -11.5, -79, 6.4);
    this.palm(b, 11.5, -79, 6.4);
    // wings of the palace
    this.house(b, -42, -96, -24, -80, 6.4, C.pale, { door: 's', upper: true });
    this.house(b, 24, -96, 42, -80, 6.4, C.pale, { door: 's', upper: true });
  }

  /** The city beyond the quarters he walks: seen from the high places and from above. */
  private buildFarCity(b: LevelBuilder) {
    b.chunk = 96;
    this.fill(b, -150, -150, -47.5, 37, { far: true, lot: 13, lane: 3.4 });
    this.fill(b, 47.5, -150, 150, 37, { far: true, lot: 13, lane: 3.4 });
    this.fill(b, -150, -230, 150, -152, { far: true, lot: 15, lane: 3.6 });
    this.fill(b, -46, -150, 46, -102, { far: true, lot: 13, lane: 3.4 });
    // other towers, far off
    const far = { collide: false, noShadow: true, mat: 'brick', jitter: 0.03 } as const;
    for (const [x, z, s] of [
      [-98, -64, 1],
      [104, -120, 1.25],
      [-70, -178, 1.1],
      [96, 2, 0.8],
    ]) {
      b.block(x, 0, z, 30 * s, 6 * s, 30 * s, 0xcba470, far);
      b.block(x, 6 * s, z, 21 * s, 5 * s, 21 * s, 0xd2ac76, far);
      b.block(x, 11 * s, z, 12 * s, 4 * s, 12 * s, 0xd8b47e, far);
      b.block(x, 15 * s, z, 5 * s, 4 * s, 5 * s, C.lapis, { ...far, mat: 'plain' });
    }
    // the walls go on
    for (const s of [1, -1]) this.wallZ(b, -236, WALL_S, s * 152, 7, 3, { far: true });
    this.wallX(b, -152, 152, -236, 7, 3, { far: true });
  }

  // ---- the people ----------------------------------------------------------------------------------------------

  private buildPeople() {
    const g = this.g;
    const k = g.quality.crowd;
    const N = (n: number) => Math.max(2, Math.round(n * k));
    const c = this.crowd;
    c.linked = (a, b2) => this.links.has(a < b2 ? `${a}:${b2}` : `${b2}:${a}`);

    // ---- the gate quarter: strung along the way, so that one cry runs the length of it
    c.line(-3.3, 36, -3.3, 28, N(4), 0.9, 0, 0, LOOK_GATE);
    c.line(3.3, 36, 3.3, 28, N(4), 0.9, 0, 0, LOOK_GATE);
    c.cluster(-5.5, 20, N(9), 2.9, 0, 0, LOOK_GATE, { free: (x, z) => Math.hypot(x + 5.5, z - 20) > 1.5 });
    c.cluster(5, 17.5, N(7), 2.2, 0, 0, LOOK_GATE, { face: Math.PI });
    c.cluster(-4.4, 23.2, N(6), 1.9, 0, 0, LOOK_GATE, { face: 0 });
    c.cluster(1, 21.5, N(5), 2.4, 0, 0, LOOK_GATE);
    c.line(-3.2, 13, -3.2, 7.5, N(3), 0.8, 0, 0, LOOK_GATE);
    c.line(3.2, 13, 3.2, 7.5, N(3), 0.8, 0, 0, LOOK_GATE);
    c.line(0, 27.5, 0, 26, N(2), 2.5, 0, 0, LOOK_GATE, 0);
    // a small court down the lane west of the square: the word must be carried there
    c.cluster(-25.6, 27, N(5), 2.6, 0, 0, LOOK_GATE);
    // the household in the walled garden
    c.cluster(25, 20, N(14), 4.8, 1, 0, LOOK_TEMPLE, { free: (x, z) => !(Math.abs(x - 25) < 2.2 && Math.abs(z - 20) < 1.6) && x > 19.6 && x < 30.2 && z > 13 && z < 27 && !(x < 21.2 && z > 25.2) });

    // ---- the market: a knot at every stall, and the din between them
    for (const [x, z, rot] of this.stalls) {
      const fx = x + Math.sin(rot) * 2.7;
      const fz = z + Math.cos(rot) * 2.7;
      c.cluster(fx, fz, N(6), 1.8, 2, 1, LOOK_MARKET, { face: rot + Math.PI });
    }
    c.line(-2.6, 1.5, -2.6, -28, N(6), 1.1, 2, 1, LOOK_MARKET, 0.7);
    c.line(2.6, 1.5, 2.6, -28, N(6), 1.1, 2, 1, LOOK_MARKET, 0.7);
    c.cluster(15.4, -3.9, N(5), 1.2, 2, 1, LOOK_MARKET);
    // the khan: travellers at the far end of the court, and on its sleeping floor
    c.cluster(23, -24.2, N(10), 2.7, 3, 1, LOOK_GATE);
    for (let i = 0; i < N(3); i++) c.add(30.3 + this.rng.range(-0.4, 0.4), 2, -21.5 - i * 1.5, 3, 1, LOOK_GATE, -Math.PI / 2);

    // ---- the temple quarter
    c.cluster(-7, -37, N(9), 2.8, 4, 2, LOOK_TEMPLE);
    c.cluster(7, -37, N(9), 2.8, 4, 2, LOOK_TEMPLE);
    c.line(-2.5, -33.5, -2.5, -42, N(3), 0.9, 4, 2, LOOK_TEMPLE, 0.5);
    c.cluster(-17, -39.8, N(6), 1.8, 4, 2, LOOK_TEMPLE, { face: Math.PI });
    c.cluster(17, -39.8, N(6), 1.8, 4, 2, LOOK_TEMPLE, { face: Math.PI });
    c.cluster(-16.5, -51, N(6), 2.2, 4, 2, LOOK_TEMPLE);
    c.cluster(16.5, -63, N(6), 2.2, 4, 2, LOOK_TEMPLE);
    c.cluster(0, -72.2, N(8), 1.6, 4, 2, LOOK_TEMPLE, { face: Math.PI });
    // priests on the first stage of the tower
    for (let i = 0; i < N(4); i++) c.add(-11.4 + this.rng.range(-0.5, 0.5), 4, -50 - i * 1.7, 4, 2, LOOK_TEMPLE, -Math.PI / 2);
    // the courts: the great in their garden, the craftsmen in their yard
    c.cluster(-34.5, -52.5, N(10), 3.2, 5, 2, LOOK_TEMPLE, { free: (x, z) => x < -29.4 && !(Math.abs(x + 31) < 2.6 && Math.abs(z + 57.5) < 3.9) });
    c.cluster(-34, -63.5, N(8), 2.8, 5, 2, LOOK_TEMPLE, { free: (x, z) => x < -29.4 && !(Math.abs(x + 31) < 2.6 && Math.abs(z + 57.5) < 3.9) });
    c.cluster(33.6, -50.8, N(10), 2.8, 6, 2, LOOK_GATE, { free: (x) => x > 29.4 && x < 35 });
    c.cluster(31.2, -64, N(8), 1.8, 6, 2, LOOK_GATE, { free: (x) => x > 29.4 });

    // where there is din a word carries less far from mouth to ear; a thin crowd (low picture settings) is given
    // a longer reach so that it still passes along
    const stretch = Math.min(1.45, 1 / Math.sqrt(k));
    c.finish(g.root, (s) => (s.district === 1 && s.zone === 2 ? 2.45 : 3.3) * stretch, g.quality.shadows);
    c.onTurn = () => {
      this.rustle += 1;
    };

    // ---- the far city's people, in its streets
    const pts: { x: number; z: number }[] = [];
    const want = Math.round(520 * k);
    const r = this.rng;
    for (let tries = 0; pts.length < want && tries < want * 30; tries++) {
      const x = r.range(-146, 146);
      const z = r.range(-226, 34);
      if (Math.abs(x) < 47 && z > -100) continue;
      if (this.lots.some((l) => x > l.x0 + 1.2 && x < l.x1 - 1.2 && z > l.z0 + 1.2 && z < l.z1 - 1.2)) continue;
      pts.push({ x, z });
    }
    this.far = new FarCrowd(pts, LOOK_FAR);
    g.root.add(this.far.mesh);
  }

  /** The king, his nobles, and the one who brings him word: seen only at the close. */
  private buildCourt() {
    const g = this.g;
    const mk = (look: FigureLook, x: number, y: number, z: number, yaw: number, pose: Figure['pose']) => {
      const f = new Figure(look);
      f.root.position.set(x, y, z);
      f.root.rotation.y = yaw;
      f.pose = pose;
      f.snap();
      f.root.visible = false;
      g.root.add(f.root);
      this.court.push(f);
      return f;
    };
    this.king = mk(KING, 0, 3.62, -92.05, 0, 'sit');
    this.kingSack = mk(KING_SACK, 0, 3.6, -91, 0, 'idle');
    this.nobles = [mk(NOBLE_A, -2.6, 3, -89.4, 0.5, 'idle'), mk(NOBLE_B, 2.7, 3, -89.6, -0.5, 'idle')];
    this.runner = mk(RUNNER, 0, 0, -78, Math.PI, 'idle');
    // the robe he lays from him, and the crown
    this.robe = buildMesh((b) => {
      b.ball(0, 0.16, 0, 0.62, KING.robe as number, { detail: 1, squash: V(1.2, 0.3, 0.9), jitter: 0.03 });
      b.ball(0.2, 0.26, 0.1, 0.4, KING.mantle as number, { detail: 1, squash: V(1.1, 0.34, 0.8), jitter: 0.03 });
      b.box(-0.2, 0.3, -0.1, 0.9, 0.05, 0.14, C.gold, { rotY: 0.5, collide: false });
    }, 8);
    this.robe.visible = false;
    g.root.add(this.robe);
    this.crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.2, 8, 1, true), new THREE.MeshLambertMaterial({ color: 0xe0b040, emissive: 0x805010, emissiveIntensity: 0.6, side: THREE.DoubleSide, flatShading: true }));
    this.crown.visible = false;
    g.root.add(this.crown);
    this.ashes = new Motes(Math.round(60 * g.quality.particles), { color: 0xb8b2a8, size: 0.05, opacity: 0, box: V(3, 2.5, 3), velocity: V(0.1, 0.25, 0.05), wander: 0.8 });
    g.root.add(this.ashes.object);
  }

  private buildGates() {
    const g = this.g;
    const make = (name: string, a: number, b2: number, x: number, z: number, side: number) => {
      // two leaves across a 3.2 m way in a wall that runs along z; `side` is the side the bar is lifted from
      const leaves: THREE.Object3D[] = [];
      for (const s of [1, -1]) {
        const leaf = buildMesh((b) => {
          b.box(0, 1.55, s * 0.8, 0.2, 3.1, 1.6, C.woodDark, { mat: 'wood', collide: false, jitter: 0.02 });
          for (const y of [0.6, 1.55, 2.5]) b.box(side * 0.12, y, s * 0.8, 0.06, 0.2, 1.6, 0xa8823a, { collide: false });
          // the bar
          b.box(side * 0.2, 1.3, s * 0.72, 0.14, 0.2, 1.5, 0x6a4a2a, { mat: 'wood', collide: false });
        }, 12);
        leaf.position.set(x, 0, z - s * 1.6);
        g.root.add(leaf);
        leaves.push(leaf);
      }
      const collider = g.physics.box({ x, y: 1.6, z }, { x: 0.3, y: 1.6, z: 1.6 }, undefined, { surface: 'wood', noLedge: true });
      const at = V(x + side * 1.2, 0, z);
      const gate: Gate = {
        name,
        a,
        b: b2,
        open: false,
        leaves,
        collider,
        at,
        it: {
          pos: at,
          radius: 2.0,
          prompt: 'Hold to lift the bar',
          hold: 1.3,
          pose: 'pull',
          priority: 1,
          enabled: () => !gate.open && this.canCry,
          onUse: () => this.openGate(gate),
        },
      };
      this.gates.push(gate);
      g.player.interactables.push(gate.it);
    };
    make('khan', 2, 3, ROOMS[1].x0, -19, -1);
    make('west', 4, 5, -20, -57, 1);
    make('east', 4, 6, 20, -57, -1);
  }

  private openGate(gate: Gate) {
    const g = this.g;
    if (gate.open) return;
    gate.open = true;
    if (gate.collider) g.physics.removeCollider(gate.collider);
    gate.collider = null;
    this.links.add(gate.a < gate.b ? `${gate.a}:${gate.b}` : `${gate.b}:${gate.a}`);
    g.audio.creak(1);
    g.audio.thud(0.7, 'wood');
    g.audio.good();
    g.hud.marker(`gate-${gate.name}`, null);
    g.hud.toast('The way stands open');
    // the leaves swing away from him
    const dir = gate.at.x > gate.leaves[0].position.x ? -1 : 1;
    g.run(() =>
      tween(
        0.9,
        (t) => {
          gate.leaves.forEach((leaf, i) => (leaf.rotation.y = (i === 0 ? -1 : 1) * dir * 1.75 * t));
        },
        ease.outBack,
      ),
    );
    // those within who stand by the gate come to see: and those who have turned tell them
    this.crowd.repass(gate.a, gate.b);
  }

  private buildToys() {
    const t = this.g.toys;
    // things to take up, carry, stack and knock about in the market and the square
    t.jar(-8.2, 0.45, 2.2);
    t.jar(-7.4, 0.45, 2.9);
    t.basket(-21.6, 0.3, 2.4);
    t.crate(-13.4, 0.45, -3.4, 0.8, 0.3);
    t.crate(-13.2, 1.3, -3.5, 0.7, 0.1);
    t.barrel(6.4, 0.5, -4.2);
    t.basket(6.6, 0.3, -24.4);
    t.jar(-6.6, 0.45, -17.4);
    t.sack(-22, 0.35, -17);
    t.crate(-21.4, 0.45, -24.6, 0.8, 0.5);
    t.barrel(-12.6, 0.5, -24.4);
    t.jar(7.4, 0.45, 13.4);
    t.basket(-8, 0.3, 24.4);
    t.crate(24.6, 0.45, -12.2, 0.8, 0.2);
  }

  // ---- the story -----------------------------------------------------------------------------------------------

  start() {
    const g = this.g;
    g.touch.setSlide(false);
    g.audio.play('nineveh');
    g.run(() => this.story());
  }

  private from(phase: Phase): boolean {
    return !this.seek || ORDER.indexOf(phase) >= ORDER.indexOf(this.seek);
  }

  private *story(): Routine {
    if (this.from('call')) yield* this.pCall();
    if (this.from('gate')) yield* this.pGate();
    if (this.from('market')) yield* this.pMarket();
    if (this.from('temple')) yield* this.pTemple();
    yield* this.pKing();
  }

  private setObjective(text: string, sub: () => string) {
    this.objective = { text, sub };
    this.objectiveKey = '';
  }

  /** 3:1–3. The word comes the second time; he arises and goes. */
  private *pCall(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'call';
    g.hud.cinema(true);
    p.lock('idle');
    g.cam.setShot({ pos: V(6.5, 2.6, 71), look: V(-1.5, 6.2, 40), fov: 46 }, 0);
    yield 1.4;
    yield g.hud.verse(citeRange('3:1', '3:2'), { block: true });
    g.cam.setShot(null, 1.6);
    p.unlock();
    g.hud.cinema(false);
    g.hud.verse(part('3:3', undefined, 'word of the LORD'), { seconds: 5 });
    this.setObjective('Go up to Nineveh', () => 'The great gate stands open');
    g.hud.marker('way', V(0, 3, WALL_S));
    yield () => p.pos.z < WALL_S - 2.2;
    g.hud.marker('way', null);
    // through the gate: the city opens before him
    g.hud.cinema(true);
    p.lock('idle');
    g.cam.setShot({ pos: V(-3, 12.5, 43), look: V(1.5, 2, 6), fov: 56 }, 1.8);
    g.audio.bed('crowd', 0.5);
    yield 0.8;
    g.cam.setShot({ pos: V(2, 14.5, 40), look: V(0, 3, -30), fov: 52 }, 5);
    yield g.hud.verse(part('3:3', 'Now Nineveh'), { seconds: 5.2 });
    g.cam.setShot(null, 1.4);
    p.unlock();
    g.hud.cinema(false);
  }

  /** 3:4. Teach: the cry, and how the word passes from one to another. Then the wall, and the high place. */
  private *pGate(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'gate';
    this.canCry = true;
    g.hud.meter('souls', { label: 'The city has heard', value: 0, text: '' });
    this.setObjective('Cry against the city', () => 'Go in among the people and cry out');
    g.hud.marker('square', V(0, 2.6, 21));
    yield () => this.cries > 0;
    g.hud.marker('square', null);
    yield 2.8;
    this.setObjective('The word passes from one to another', () => this.left(0));
    yield* waitFor(() => this.frac(0, 0) > 0.7, 26);
    // the garden wall
    if (this.zoneLeft(1) > 0) {
      g.hud.toast('A wall keeps the word from the house beyond', 3.4);
      this.setObjective('Find a high place', () => 'From a roof the cry carries over the wall');
      g.hud.marker('roof', V(14.6, 4.6, 20), { label: 'High place' });
      yield () => this.zoneLeft(1) < this.zoneTotal(1) || p.pos.z < ARCH_A - 1.5;
      g.hud.marker('roof', null);
      yield 1.5;
    }
    this.setObjective('Go on into the city', () => this.left(0));
    g.hud.marker('way', V(0, 3, ARCH_A));
    yield () => p.pos.z < ARCH_A - 1.5;
    g.hud.marker('way', null);
  }

  /** The test: the market's din, the stalls apart from one another, the granary above them all. */
  private *pMarket(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'market';
    this.canCry = true;
    g.hud.meter('souls', { label: 'The city has heard', value: 0, text: '' });
    this.setObjective('The market drowns the cry', () => 'Find a high place above the stalls');
    g.hud.marker('granary', V(-17, 9.8, -13), { label: 'High place' });
    this.markGates();
    yield* waitFor(() => this.frac(1, 2) > 0.5 || p.pos.z < ARCH_B - 1.5);
    g.hud.marker('granary', null);
    this.setObjective('Go up to the temple quarter', () => this.left(1));
    g.hud.marker('way', V(0, 3, ARCH_B));
    yield () => p.pos.z < ARCH_B - 1.5;
    g.hud.marker('way', null);
  }

  /** The twist: walled courts with barred gates, and the highest place in the city. */
  private *pTemple(): Routine {
    const g = this.g;
    this.phase = 'temple';
    this.canCry = true;
    g.hud.meter('souls', { label: 'The city has heard', value: 0, text: '' });
    this.setObjective('Cry from the high place of the city', () => this.leftAll());
    g.hud.marker('top', V(TOP.x, TOP.y + 2.2, TOP.z), { label: 'High place' });
    this.markGates();
    yield () => this.topCry;
    g.hud.marker('top', null);
  }

  private markGates() {
    for (const gate of this.gates) {
      if (gate.open) continue;
      const d = districtOf(gate.a);
      if ((d === 1 && this.phase === 'market') || (d === 2 && this.phase === 'temple')) this.g.hud.marker(`gate-${gate.name}`, V(gate.at.x, 2.4, gate.at.z), { label: 'Barred gate' });
    }
  }

  /** 3:5–10. The city turns; word comes to the king; the decree; what God saw. */
  private *pKing(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'king';
    this.canCry = false;
    g.promptOverride = null;
    g.hud.clearMarkers();
    this.objective = null;
    g.hud.objective(null);
    if (!this.topCry) {
      // (reached by ?seek=king)
      p.teleport(TOP, Math.PI);
      this.cry();
    }
    // the cry is given a moment to do its own work: what it reaches of itself is the player's doing
    yield 3.6;
    const all = this.crowd.count();
    const every = all.reached >= all.total;
    g.bot?.note(`the cry from the tower: ${all.reached} of ${all.total} had heard (gate ${this.left(0)}; market ${this.left(1)}; temple ${this.left(2)})`);
    g.hud.cinema(true);
    p.lock('idle');
    g.audio.swell(110);
    g.audio.chime();
    // ---- the word crosses the whole city
    this.crowd.sweep(TOP.x, TOP.z, 8.5);
    this.far.sweep(TOP.x, TOP.z, 13);
    g.cam.setShot({ pos: V(0, 27, -24), look: V(0, 3, -50), fov: 52 }, 2.2);
    yield 2.6;
    g.cam.setShot({ pos: V(44, 64, 34), look: V(-4, 0, -46), fov: 50 }, 6.5);
    yield g.hud.verse(cite('3:5'), { block: true });
    yield* waitFor(() => this.crowd.count().turned >= all.total, 9);
    g.hud.meter('souls', null);

    // ---- word comes to the king
    for (const f of this.court) f.root.visible = f !== this.kingSack;
    const run = this.runner;
    run.root.position.set(0.4, 0, -78.2);
    g.cam.setShot({ pos: V(8.5, 6.4, -80.5), look: V(-0.6, 4.4, -91), fov: 40 }, 0);
    g.run(() => this.walk(run, [V(0.4, 3, -82.2), V(0.6, 3, -87.6)], 3.4, 'bow'));
    const read = g.hud.verse(cite('3:6'), { block: true });
    yield 2.6;
    // he arose from his throne
    this.king.pose = 'idle';
    yield* tween(1.1, (t) => this.king.root.position.set(0, lerp(3.62, 3.6, t), lerp(-92.05, -91.1, t)), ease.inOutQuad);
    for (const n of this.nobles) n.pose = 'talk';
    yield 0.9;
    // and he laid his robe from him, and covered him with sackcloth
    g.cam.setShot({ pos: V(4.6, 5.6, -86.2), look: V(-0.2, 4.5, -91.2), fov: 38 }, 1.6);
    yield 0.9;
    this.kingSack.root.position.copy(this.king.root.position);
    this.kingSack.root.rotation.y = 0;
    this.kingSack.pose = 'idle';
    this.kingSack.snap();
    this.kingSack.root.visible = true;
    this.king.root.visible = false;
    this.robe.visible = true;
    this.crown.visible = true;
    g.audio.stepSound('cloth', 1.4);
    yield* tween(
      0.7,
      (t) => {
        this.robe.position.set(-0.75, lerp(4.9, 3.62, t), -91.3);
        this.robe.scale.set(lerp(0.5, 1, t), lerp(2.4, 1, t), lerp(0.5, 1, t));
        this.crown.position.set(lerp(0, 0.1, t), lerp(5.5, 4.33, t), lerp(-91.1, -92.3, t));
      },
      ease.inQuad,
    );
    for (const n of this.nobles) n.pose = 'bow';
    yield 1.0;
    // and sat in ashes
    g.cam.setShot({ pos: V(-1.4, 4.9, -81.6), look: V(2.6, 3.7, -87.4), fov: 42 }, 2.4);
    yield* this.walk(this.kingSack, [V(1.2, 3.6, -89.4), V(1.6, 3, -88.4), V(3.0, 3, -87.3)], 3.2, 'idle');
    this.kingSack.root.rotation.y = 0.5;
    this.kingSack.pose = 'sit';
    yield* tween(0.6, (t) => (this.kingSack.root.position.y = lerp(3, 3.12, t)));
    (this.ashes.uniforms.uOpacity as THREE.IUniform<number>).value = 0.55;
    this.ashes.object.position.set(3.2, 3.4, -86.8);
    for (const n of this.nobles) n.pose = 'kneel';
    run.pose = 'kneel';
    yield read;
    yield 0.4;

    // ---- the decree, cried from the wall above the palace doors
    const heralds = this.nobles;
    heralds[0].root.position.set(-1.7, 5.4, WALL_C + 0.3);
    heralds[1].root.position.set(1.7, 5.4, WALL_C + 0.3);
    for (const h of heralds) {
      h.root.rotation.y = 0;
      h.pose = 'cry';
      h.snap();
    }
    g.cam.setShot({ pos: V(-5.2, 6.6, -66.6), look: V(0.6, 5.6, WALL_C), fov: 46 }, 0);
    g.audio.shout(0.9, 0.9);
    yield g.hud.verse(part('3:7', undefined, 'his nobles'), { seconds: 5 });
    g.cam.setShot({ pos: V(4.6, 7.4, -67.4), look: V(-0.4, 5.2, WALL_C), fov: 44 }, 9);
    g.audio.shout(1.05, 0.9);
    const who = 'The decree of the king and his nobles';
    yield g.hud.verse(part('3:7', 'Let neither man'), { who, block: true });
    g.audio.shout(0.9, 0.9);
    yield g.hud.verse(cite('3:8'), { who, block: true });
    yield g.hud.verse(cite('3:9'), { who, block: true });

    // ---- and God saw their works
    for (const h of heralds) h.pose = 'kneel';
    g.cam.setShot({ pos: V(-40, 44, 22), look: V(4, 0, -52), fov: 48 }, 0);
    g.cam.setShot({ pos: V(-30, 54, 30), look: V(4, 0, -56), fov: 46 }, 14);
    g.audio.play('calm');
    g.run(() => tween(8, (t) => (this.dusk = t)));
    yield 1.2;
    yield g.hud.verse(cite('3:10'), { block: true });
    yield 0.8;
    yield g.hud.fade(1, 1.4);
    this.phase = 'done';
    g.hud.cinema(false);
    g.complete(every);
  }

  /** A figure walks a line of points in so many seconds, then takes a pose. */
  private *walk(f: Figure, points: THREE.Vector3[], seconds: number, then: Figure['pose']): Routine {
    let total = 0;
    let from = f.root.position.clone();
    const legs = points.map((to) => {
      const leg = { from, to, len: from.distanceTo(to) };
      total += leg.len;
      from = to;
      return leg;
    });
    f.pose = 'run';
    f.speed = 0.5;
    for (const leg of legs) {
      const time = (leg.len / Math.max(total, 0.01)) * seconds;
      const yaw = Math.atan2(leg.to.x - leg.from.x, leg.to.z - leg.from.z);
      let t = 0;
      while (t < time) {
        const dt: number = (yield) ?? 0;
        t += dt;
        f.root.position.lerpVectors(leg.from, leg.to, clamp01(t / time));
        f.root.rotation.y = yaw;
        f.phase += ((leg.len / time) * dt) / 1.9 * 0.5;
      }
    }
    f.pose = then;
  }

  // ---- the cry -------------------------------------------------------------------------------------------------

  /** How far a cry carries from where he stands, and whether it goes over walls. */
  private reach(): { radius: number; over: boolean; zone: number } {
    const p = this.g.player.pos;
    const zone = zoneOf(p.x, p.z);
    const over = p.y > HIGH;
    const ease2 = this.g.story ? 1.2 : 1;
    const radius = over ? Math.min(27, 13 + p.y * 1.3) * (this.g.story ? 1.08 : 1) : GROUND[districtOf(zone)] * ease2;
    return { radius, over, zone };
  }

  private cry() {
    const g = this.g;
    const p = g.player;
    const { radius, over, zone } = this.reach();
    const before = this.crowd.reached;
    const n = this.crowd.cry(p.pos.x, p.pos.z, radius, zone, over);
    this.cries++;
    this.cool = 1.5;
    g.audio.cry();
    p.lock('cry');
    this.cryLock = 0.55;
    // the words: the narration the first time, and his words every time the card is free
    if (this.cries === 1) g.hud.verse(part('3:4', undefined, 'and said'), { seconds: 3.4 });
    if (!g.hud.bannerBusy || this.cries === 1) g.hud.verse(part('3:4', 'Yet forty days'), { who: 'Jonah', seconds: 2.8 });
    // the ring
    this.ring(p.pos.x, over ? 0.12 : p.pos.y + 0.12, p.pos.z, radius, over ? 1.0 : 0.7);
    if (over) this.ring(p.pos.x, p.pos.y + 0.2, p.pos.z, 3.2, 0.45);
    p.chest(_v);
    _v.y += 0.45;
    g.fx.emit(_v, { count: 14, color: 0xfff0c0, color2: 0xffd080, speed: 3.2, spread: 0.6, dir: V(Math.sin(p.yaw), 0.35, Math.cos(p.yaw)), life: 0.6, gravity: -0.5, size: 0.16, opacity: 0.6, additive: true, drag: 2 });
    if (over) g.cam.shake(0.12);
    if (n === 0 && before === this.crowd.reached && this.toastT <= 0) {
      // nobody new: say why
      let near = false;
      for (const s of this.crowd.souls) if (s.state === 0 && Math.hypot(s.x - p.pos.x, s.z - p.pos.z) < radius + 3) near = true;
      if (near) g.hud.toast(over ? 'They are beyond the reach of the cry' : 'A wall keeps the word out');
      this.toastT = 4;
    }
    if (this.phase === 'temple' && p.pos.y > 9.5 && Math.hypot(p.pos.x - ZIG.x, p.pos.z - ZIG.z) < 9) this.topCry = true;
  }

  private ring(x: number, y: number, z: number, radius: number, life: number) {
    const r = this.rings.find((it) => !it.mesh.visible) ?? this.rings[0];
    r.mesh.visible = true;
    r.mesh.position.set(x, y, z);
    r.t = 0;
    r.radius = radius;
    r.life = life;
  }

  // ---- counting ------------------------------------------------------------------------------------------------

  private frac(district: number, zone?: number) {
    let total = 0;
    let got = 0;
    for (const s of this.crowd.souls) {
      if (s.district !== district || (zone !== undefined && s.zone !== zone)) continue;
      total++;
      if (s.state > 0) got++;
    }
    return total ? got / total : 1;
  }

  private zoneTotal(zone: number) {
    return this.crowd.souls.filter((s) => s.zone === zone).length;
  }

  private zoneLeft(zone: number) {
    return this.crowd.souls.filter((s) => s.zone === zone && s.state === 0).length;
  }

  private left(district: number): string {
    const c = this.crowd.count(district);
    const n = c.total - c.reached;
    return n === 0 ? `All of ${QUARTER[district]} has heard` : `${n} in ${QUARTER[district]} yet to hear`;
  }

  private leftAll(): string {
    const parts: string[] = [];
    for (let d = 0; d < 3; d++) {
      const c = this.crowd.count(d);
      if (c.total - c.reached > 0) parts.push(`${c.total - c.reached} in ${QUARTER[d]}`);
    }
    return parts.length ? `Yet to hear: ${parts.join(' · ')}` : 'Every soul below has heard';
  }

  override plate(): Shot {
    return { pos: V(40, 46, 30), look: V(-4, 0, -46), fov: 50 };
  }

  // ---- every step ----------------------------------------------------------------------------------------------

  override fixedUpdate(dt: number) {
    const g = this.g;
    this.cool = Math.max(0, this.cool - dt);
    if (this.free && this.cool <= 0 && g.input.action.pressed) this.cry();
  }

  override update(dt: number) {
    const g = this.g;
    const p = g.player;
    const time = g.engine.time;
    this.sky.update(time);
    this.motes.update(time, g.engine.camera, g.engine.canvas.clientHeight);
    this.ashes.update(time, g.engine.camera, g.engine.canvas.clientHeight);
    this.crowd.update(dt, p.locked && g.hud.inCinema ? null : p.pos);
    this.far.update(dt);
    for (const f of this.court) if (f.root.visible) f.update(dt);

    // ---- the cry: its prompt, its little lock, its rings
    if (this.cryLock > 0) {
      this.cryLock -= dt;
      if (this.cryLock <= 0 && !g.hud.inCinema) p.unlock();
    }
    this.toastT = Math.max(0, this.toastT - dt);
    this.free = this.canCry && g.state === 'play' && !p.locked && !p.carried && p.focus === null && p.state === 'ground' && !g.hud.blocking && !g.hud.inCinema;
    this.cryFocus.pos = p.pos;
    this.cryFocus.progress = 0;
    g.promptOverride = this.free && this.cool <= 0 ? this.cryFocus : null;
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt;
      const k = clamp01(r.t / r.life);
      const s = Math.max(0.01, r.radius * ease.outCubic(k));
      r.mesh.scale.set(s, s, 1);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.75;
      if (k >= 1) r.mesh.visible = false;
    }

    // ---- sound: the murmur of a city, hushed as it turns; cloth as they kneel
    const all = this.crowd.count();
    const turned = all.total ? all.turned / all.total : 0;
    if (this.phase !== 'call') g.audio.bed('crowd', lerp(0.55, 0.06, turned) * (zoneOf(p.pos.x, p.pos.z) === 2 ? 1.25 : 1));
    if (this.rustle > 0) {
      this.rustle = Math.max(0, this.rustle - dt * 9);
      if (Math.random() < dt * 9) g.audio.stepSound('cloth', 0.35);
    }

    // ---- the look of the city follows its turning: colour drains to ash, and at the close the light grows soft
    const grade = g.engine.post.grade;
    grade.saturation = damp(grade.saturation, lerp(1.12, 0.9, turned) + this.dusk * 0.06, 2, dt);
    if (this.dusk > 0) {
      grade.tint.setRGB(lerp(1.03, 1.08, this.dusk), 1.0, lerp(0.94, 0.86, this.dusk));
      grade.vignette = lerp(0.3, 0.42, this.dusk);
    }
    for (const b of this.banners) b.mesh.rotation.x = Math.sin(time * 1.4 + b.phase) * 0.07 + 0.04;

    // ---- the meter and the task
    if (this.phase !== 'call' && this.phase !== 'king' && this.phase !== 'done') {
      g.hud.meter('souls', { label: 'The city has heard', value: all.total ? all.reached / all.total : 0, text: `${all.reached} of ${all.total}`, good: all.reached >= all.total });
    }
    if (this.objective) {
      const sub = this.objective.sub();
      const key = `${this.objective.text}|${sub}`;
      if (key !== this.objectiveKey) {
        this.objectiveKey = key;
        g.hud.objective(this.objective.text, sub);
      }
    }
    // the name of each quarter as he comes into it
    if (this.canCry) {
      const d = districtOf(zoneOf(p.pos.x, p.pos.z));
      if (p.pos.z < WALL_S - 3 && d !== this.quarterShown) {
        if (this.quarterShown >= 0 || d > 0) g.hud.toast(QUARTER[d].replace(/^t/, 'T'));
        this.quarterShown = d;
      }
    }
    // in Story, those still to hear are pointed out once most of a quarter has turned
    if (g.story && this.canCry) this.pointStragglers();
  }

  private pointStragglers() {
    const g = this.g;
    const p = g.player.pos;
    const d = districtOf(zoneOf(p.x, p.z));
    const c = this.crowd.count(d);
    const show = c.reached / Math.max(1, c.total) > 0.6 && c.reached < c.total;
    if (!show) {
      if (this.stragglers) g.hud.marker('straggler', null);
      this.stragglers = false;
      return;
    }
    const s = this.crowd.nearestUnheard(p.x, p.z, d);
    if (s) {
      g.hud.marker('straggler', _v.set(s.x, s.y + 2.3, s.z), { label: 'Yet to hear' });
      this.stragglers = true;
    }
  }

  // ---- the automated player ------------------------------------------------------------------------------------

  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const crowd = this.crowd;
    const self = this;
    function* cry(): Routine {
      yield* b.until(() => self.free && self.cool <= 0, 6, 'leave to cry');
      yield* b.tap('action', 0.1);
      yield 0.75;
    }
    /** Goes to those who have not heard in one walled space and cries among them until all there have. */
    function* tell(zone: number, tries = 12): Routine {
      for (let i = 0; i < tries; i++) {
        yield 1.4;
        const s = crowd.nearestUnheard(p.pos.x, p.pos.z, undefined, zone);
        if (!s) return;
        yield* b.goTo(V(s.x, s.y, s.z), { dist: 2.2, timeout: 9 });
        yield* cry();
      }
    }
    function* path(points: [number, number, number][], opts: { dist?: number; timeout?: number; jump?: () => boolean } = {}): Routine {
      for (const [x, y, z] of points) yield* b.goTo(V(x, y, z), { dist: opts.dist ?? 0.6, timeout: opts.timeout ?? 9, jump: opts.jump });
    }
    function* lift(name: string): Routine {
      const gate = self.gates.find((it) => it.name === name)!;
      if (gate.open) return;
      yield* b.goTo(gate.at, { dist: 0.8, timeout: 12 });
      b.input.action = true;
      yield* b.until(() => gate.open, 5, `the ${name} gate`);
      b.input.action = false;
      yield 0.6;
    }

    yield* b.until(() => this.phase !== 'call' || (!p.locked && !g.hud.inCinema && !g.hud.blocking), 60, 'the call');
    if (this.from('call')) {
      yield* path([[0, 0, 44]]);
      yield* b.until(() => this.canCry && !p.locked, 30, 'the gate');
    }
    if (this.from('gate')) {
      // the square
      yield* path([[0, 0, 21]]);
      yield* cry();
      yield 3;
      yield* tell(0, 6);
      // the court down the lane
      yield* path([
        [-8.6, 0, 27.3],
        [-20, 0, 27.3],
        [-25, 0, 27.5],
      ]);
      yield* cry();
      yield* path([
        [-20, 0, 27.3],
        [-8.6, 0, 27.3],
        [9.8, 0, 28.4],
      ]);
      // up the outer stair to the roof, and the scroll across the gap
      yield* path([
        [10.1, 0.2, 26],
        [10.1, 3.2, 18.6],
        [14, 3.2, 20],
      ]);
      yield* cry();
      yield 2.5;
      yield* path([[14, 3.2, 26.2]], { dist: 0.5 });
      yield* b.goTo(V(14.6, 3.2, 30.2), { dist: 0.5, timeout: 5, jump: () => p.pos.z > 26.55 && p.grounded });
      yield* path([
        [16.3, 3.2, 31.2],
        [15.6, 3.2, 33.4],
        [14.2, 3.2, 33.4],
      ]);
      yield 0.5;
      // down into the lane, and on
      yield* path([
        [9.6, 0, 33],
        [3, 0, 26],
      ]);
      yield* tell(0, 4);
      yield* path([
        [0, 0, 12],
        [0, 0, 2],
      ]);
    }
    if (this.from('market')) {
      yield* b.until(() => this.phase === 'market' || this.phase === 'temple', 20, 'the market');
      // the granary, by its ladder
      yield* path([
        [-6, 0, -4.5],
        [-11, 0, -13],
      ]);
      yield* b.goTo(V(-16, 8.5, -13), { dist: 1.3, timeout: 14, y: true });
      yield* path([[-17, 8.5, -13]], { timeout: 3 });
      yield* cry();
      yield 3;
      // down, and to those the cry did not reach
      yield* path([
        [-13, 0, -9],
        [-6, 0, -9],
      ]);
      yield* tell(2, 14);
      // the dyer's roof
      if (crowd.nearestUnheard(p.pos.x, p.pos.z, undefined, 2)) {
        yield* path([
          [17, 0, 2.4],
          [19.1, 0.2, 0.2],
          [19.1, 3.4, -7.6],
          [22, 3.4, -4],
        ]);
        yield* cry();
        yield 2.5;
        yield* path([[17.4, 0, -9.5]]);
        yield* tell(2, 8);
      }
      // the khan
      yield* path([[11.4, 0, -19]]);
      yield* lift('khan');
      yield* path([[18.5, 0, -19.4]]);
      yield* tell(3, 5);
      // its sleeping floor, and the scroll
      yield* path([[26.6, 0, -12]]);
      yield* b.goTo(V(28.3, 1, -12), { dist: 0.4, timeout: 4, jump: () => p.grounded && p.pos.x > 26.8 });
      yield* b.goTo(V(30.3, 2, -12.2), { dist: 0.5, timeout: 4, jump: () => p.grounded && p.pos.x > 28.6 });
      yield* path([[30.3, 2, -25.2]]);
      yield 0.5;
      yield* tell(3, 3);
      yield* path([
        [27.4, 0, -20],
        [18, 0, -19],
        [11.4, 0, -19],
        [1.5, 0, -26],
        [0, 0, -34],
      ]);
    }
    if (this.from('temple')) {
      yield* b.until(() => this.phase === 'temple', 20, 'the temple quarter');
      yield* cry();
      yield* tell(4, 6);
      // the courts
      yield* path([
        [-16.5, 0, -44],
        [-18.4, 0, -57],
      ]);
      yield* lift('west');
      yield* path([[-27, 0, -57]]);
      yield* tell(5, 6);
      yield* path([
        [-24, 0, -57],
        [-16.5, 0, -57],
        [-16.5, 0, -41.5],
        [16.5, 0, -41.5],
        [18.4, 0, -57],
      ]);
      yield* lift('east');
      yield* path([[26.5, 0, -57]]);
      yield* tell(6, 6);
      yield* path([
        [24, 0, -57],
        [16.5, 0, -57],
      ]);
      yield* tell(4, 6);
      // the tower: front stair, east stair, round by the west for the scroll, the back stair, the top
      yield* path([
        [16.5, 0, -41],
        [0, 0, -36.5],
        [0, 4, -44.8],
        [10.85, 4, -45.6],
        [10.85, 4, -48.6],
        [10.85, 7.5, -55.4],
        [8, 7.5, -56],
        [8, 7.5, -49],
        [-8, 7.5, -49],
        [-8, 7.5, -57],
        [-8, 7.5, -64.35],
        [-4.6, 7.5, -64.35],
        [2.6, 10.5, -64.35],
        [4.4, 10.5, -62],
        [4.4, 10.5, -53],
        [0.4, 10.5, -52.2],
      ]);
      yield* cry();
    }
    yield* b.until(() => this.phase === 'done', 120, 'the close');
  }

  override dispose() {
    const g = this.g;
    g.promptOverride = null;
    this.crowd.dispose();
    this.far?.dispose();
    this.sky.dispose();
    this.motes.dispose();
    this.ashes?.dispose();
    for (const f of this.court) {
      f.root.parent?.remove(f.root);
      f.dispose();
    }
    for (const b of this.banners) {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
    for (const r of this.rings) {
      r.mesh.geometry.dispose();
      (r.mesh.material as THREE.Material).dispose();
    }
    void dotTexture;
    void _c;
  }
}

export type { Soul };
