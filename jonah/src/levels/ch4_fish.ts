// Chapter 4: The Great Fish (Jonah 1:17–2:10).
//
// What the account says: the LORD had prepared a great fish to swallow up Jonah, and Jonah was in the belly of the
// fish three days and three nights (1:17). Then Jonah prayed unto the LORD his God out of the fish's belly (2:1).
// His prayer (2:2–9) looks back on the going down: cast into the deep, in the midst of the seas; the floods, the
// billows and the waves passing over him (3); "I am cast out of thy sight; yet I will look again toward thy holy
// temple" (4); the waters, the depth, the weeds wrapped about his head (5); down to the bottoms of the mountains,
// the earth with her bars about him, "yet hast thou brought up my life from corruption" (6); his soul fainting,
// and he remembered the LORD (7); lying vanities (8); thanksgiving, his vow, "Salvation is of the LORD" (9). And the
// LORD spake unto the fish, and it vomited out Jonah upon the dry land (2:10).
//
// The game's own: the way down is a shaft of rock shelves with weed to keep out of (the prayer names the deep, the
// weeds and the bottoms of the mountains; their shape here is ours). The inside of the fish is a great dark place
// with water, flotsam, currents and a rising and falling water, where each verse of the prayer is a light to be
// found, in order; finding them is play, the words are the verses themselves and nothing is added to them. The
// days and nights are marked quietly as the lights are found. The fish is a great fish: it is not fought, and it
// does not hurt him. It is prepared for him and it is his keeping. Nothing is put in the mouth of the LORD: 1:17
// and 2:10 are shown as written. Nobody can drown: there is no air to run out of, in either mode.
import * as THREE from 'three';
import type { Quality } from '../core/quality';
import { tween, type Routine } from '../core/script';
import { TAU, clamp01, damp, ease, lerp, smoothstep } from '../core/util';
import type { Bot } from '../game/bot';
import { Chapter } from '../game/chapter';
import { cite, part } from '../game/verses';
import { buildMesh } from '../gfx/build';
import { CALM_WAVES, Ocean, type OceanLook } from '../gfx/ocean';
import { Motes } from '../gfx/particles';
import { Sky, makeLights } from '../gfx/sky';
import { dotTexture } from '../gfx/textures';
import type { Shot } from '../player/camera';
import type { Water } from '../player/controller';
import { Flecks, GlowField, GreatFish, Jellies, WaterSheet, Weeds, type JellySpec, type WeedZone } from './ch4_parts';
import { BX, FLOOR_Y, LEES, MEET, PEARLS, ROOMS, SCROLL_DEEP, SEC_NIGHT, SHELF, SILL, SLABS, SLAB_T, SPAR_TOP, STONES, SX, VEILS, WEED_ROWS, buildBelly, buildDeep, buildShore, shoreY, type Belly, type Deep } from './ch4_world';

type Phase = 'sink' | 'fish' | 'belly' | 'stones' | 'weeds' | 'tide' | 'turn' | 'vow' | 'shore' | 'done';
const ORDER: Phase[] = ['sink', 'fish', 'belly', 'stones', 'weeds', 'tide', 'turn', 'vow', 'shore', 'done'];
type Region = 'deep' | 'belly' | 'shore';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** A place inside the fish. */
const BV = (x: number, y: number, z: number) => new THREE.Vector3(BX + x, y, z);
/** A place on the shore. */
const SV = (x: number, y: number, z: number) => new THREE.Vector3(SX + x, y, z);

/** Seeking into the belly: how many lights are already found, and where he stands. */
const SEEK: Partial<Record<Phase, { found: number; at: THREE.Vector3 }>> = {
  stones: { found: 2, at: BV(-2, 0.6, 38) },
  weeds: { found: 3, at: BV(0, 0.6, 67.5) },
  tide: { found: 4, at: BV(0, 0.6, 90.5) },
  turn: { found: 5, at: BV(0, 3.3, 112) },
  vow: { found: 7, at: BV(0, 1.1, 155.5) },
};
/** Three days and three nights (1:17), marked as the lights are found. */
const DAYS = ['The first day', 'The first day', 'The first night', 'The second day', 'The second night', 'The third day', 'The third night', 'The third night', 'The third night'];

const TIDE_PERIOD = 18;
const FLOW_PERIOD = 7.5;
const FLOW_FAIR = 2.7;

const SEA_TOP = new THREE.Color(0x1b6394);
const SEA_DEEP = new THREE.Color(0x06142a);
const BELLY_FOG = new THREE.Color(0x0b0720);
const BELLY_FOG_LIT = new THREE.Color(0x1a1038);

const DAWN: OceanLook = {
  deep: 0x1c4a66,
  shallow: 0x4aa0a8,
  glow: 0x8fe0d0,
  foam: 0xfff6ea,
  skyTop: 0x5f8fd0,
  skyHorizon: 0xffe0b8,
  sunDir: V(0.35, 0.3, -1).normalize(),
  sunColor: 0xfff0d0,
  spec: 1.3,
  ambient: 0.55,
  foamAmount: 0.18,
};

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _c = new THREE.Color();

export class Fish extends Chapter {
  private phase: Phase = 'sink';
  private seek: Phase | null = null;
  private region: Region = 'deep';
  private sky!: Sky;
  private fish!: GreatFish;

  // the deep
  private deep!: Deep;
  private deepWeeds!: Weeds;
  private deepGlow!: GlowField;
  private deepJellies!: Jellies;
  private seaSkin!: WaterSheet;
  private hull!: THREE.Object3D;
  private motes!: Motes;
  private deepWater: Water = { surfaceY: null, sink: 1.1, current: (p, out) => this.deepCurrent(p, out) };
  private fogWide = 1;
  private said = 0;
  /** Times caught by the weeds of the deep: the chapter's challenge is that there are none. */
  private deepCatches = 0;

  // the belly
  private belly!: Belly;
  private bellyWeeds!: Weeds;
  private bellyGlow!: GlowField;
  private jellies!: Jellies;
  private pool!: WaterSheet;
  private flecks!: Flecks;
  private veils: WaterSheet[] = [];
  private veilOpen: number[] = [];
  private pearls: { group: THREE.Group; halo: THREE.Sprite; core: THREE.Mesh }[] = [];
  private lamps: THREE.PointLight[] = [];
  /** Inside the fish a man floats: he rises to the top of the water unless he dives. */
  private bellyWater: Water = { surfaceY: 0, sink: -2.4, current: (p, out) => this.bellyCurrent(p, out) };
  /** How many of the eight lights are found. */
  private found = 0;
  private litTarget = new Float32Array(12);
  private level = 0;
  private tideOn = false;
  private tideT = 0;
  private flowT = 0;
  private glowAll = 0;

  // the shore
  private shore!: THREE.Group;
  private ocean!: Ocean;

  // the weeds' hold
  private caught: WeedZone | null = null;
  private anchor = new THREE.Vector3();
  private shakes = 0;
  private immune = 0;
  private jumpWas = false;
  private bubbleT = 0;

  build() {
    const g = this.g;
    const q = g.quality;
    const seek = g.params.get('seek') as Phase | null;
    if (seek && ORDER.includes(seek)) this.seek = seek;

    this.sky = new Sky({ top: SEA_TOP, horizon: SEA_TOP, bottom: SEA_TOP, sunDir: V(0.2, 1, 0.1), sunColor: 0xffffff, sunSize: 0, sunGlow: 0, cloudCover: 0, cloudLit: 0xffffff, cloudDark: 0x8090a0, cloudSpeed: 0.15, stars: 0 });
    g.root.add(this.sky.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: V(0.25, 1, 0.15), sunColor: 0x8fc4e8, sunIntensity: 1.4, skyColor: 0x4a86b8, groundColor: 0x0c1c30, hemiIntensity: 2.5, shadowSize: q.shadowSize, shadowRange: 26 });
    g.engine.setView(460, 6, 56, SEA_TOP);

    // ---- the deep
    this.deep = buildDeep(g.physics);
    g.root.add(this.deep.group);
    this.deepWeeds = new Weeds(this.deep.weeds, [0x3f8a52, 0x56963e, 0x2f7a62, 0x6a8a34], 9, q.level === 'low' ? 5 : 8);
    g.root.add(this.deepWeeds.mesh);
    this.deepGlow = new GlowField(this.deep.glow, 1);
    this.deepGlow.lit[0] = 1;
    g.root.add(this.deepGlow.object);
    const drift: JellySpec[] = [];
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      drift.push({ x: Math.cos(a) * (4 + (i % 5) * 1.9), z: Math.sin(a) * (4 + (i % 4) * 2.2), depth: -6 - i * 5.3, color: i % 3 ? 0x5fe8ff : 0xc890ff, size: 0.3 + (i % 3) * 0.14, sec: 0 });
    }
    this.deepJellies = new Jellies(drift);
    g.root.add(this.deepJellies.mesh);
    this.seaSkin = new WaterSheet(120, 120, 0x2a86b8, 0xdff6ff, 1);
    this.seaSkin.mesh.position.y = 0.5;
    this.seaSkin.uniforms.uBright.value = 1.6;
    g.root.add(this.seaSkin.mesh);
    // the ship he was cast from, seen from beneath: a dark shape on the bright water
    this.hull = buildMesh((b) => b.ball(5, 0.2, -6, 1, 0x08121c, { squash: V(2.7, 1.2, 9.5), detail: 2, jitter: 0, shade: 0, noShadow: true }), 3);
    g.root.add(this.hull);
    this.motes = new Motes(Math.round(300 * q.particles), { box: V(26, 22, 26), color: 0x9fd8ff, size: 0.06, velocity: V(0.04, 0.3, 0.02), wander: 0.7, opacity: 0.55, additive: true });
    g.root.add(this.motes.object);

    // ---- the belly of the fish
    this.belly = buildBelly(g.physics);
    g.root.add(this.belly.group, this.belly.flotsam.mesh);
    this.bellyWeeds = new Weeds(this.belly.weeds, [0x2f8a72, 0x3a7a8a, 0x4a6a9a], 14, q.level === 'low' ? 6 : 9);
    g.root.add(this.bellyWeeds.mesh);
    this.bellyGlow = new GlowField(this.belly.glow, 0.05);
    g.root.add(this.bellyGlow.object);
    this.jellies = new Jellies(this.belly.jellies);
    g.root.add(this.jellies.mesh);
    this.pool = new WaterSheet(34, 210, 0x0a1838, 0x48c8d0, 0.72);
    (this.pool.uniforms.uScale.value as THREE.Vector2).set(0.85, 0.85);
    this.pool.mesh.position.set(BX, 0, 88);
    g.root.add(this.pool.mesh);
    this.flecks = new Flecks(Math.round(110 * q.particles));
    g.root.add(this.flecks.mesh);
    VEILS.forEach((z) => {
      const v = new WaterSheet(30, 24, 0x120a2a, 0x8a5ad0, 0.62, true);
      (v.uniforms.uScale.value as THREE.Vector2).set(1.3, 0.1);
      v.uniforms.uBright.value = 0.5;
      v.mesh.position.set(BX, 2.5, z);
      v.mesh.renderOrder = 14;
      g.root.add(v.mesh);
      this.veils.push(v);
      this.veilOpen.push(0);
    });
    const coreGeo = new THREE.IcosahedronGeometry(0.24, 2);
    PEARLS.forEach((pl) => {
      const group = new THREE.Group();
      const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xfff6e4, fog: false }));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: 0xffe9c0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
      halo.scale.setScalar(2.4);
      group.add(core, halo);
      group.position.set(BX + pl.x, pl.y, pl.z);
      g.root.add(group);
      this.pearls.push({ group, halo, core });
    });
    for (let i = 0; i < q.lights; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 30, 1.6);
      g.root.add(l);
      this.lamps.push(l);
    }
    this.litTarget[0] = 0.62;

    // ---- the shore
    this.shore = buildShore(g.physics);
    g.root.add(this.shore);
    this.ocean = new Ocean(q.oceanGrid, DAWN, CALM_WAVES, { low: q.level === 'low' });
    this.ocean.amp = 0.45;
    g.root.add(this.ocean.mesh);

    this.fish = new GreatFish();
    this.fish.group.visible = false;
    g.root.add(this.fish.group);

    // ---- Jonah
    const p = g.spawnPlayer({ x: 0, y: -2.5, z: 0 }, 0);
    p.killY = -400;
    p.canSlide = false;
    p.canCarry = false;
    const stroke = p.onStroke;
    p.onStroke = () => {
      stroke();
      g.fx.emit(p.chest(_v), { count: 6, color: 0xcfefff, color2: 0x8fd0ff, speed: 0.9, speedVar: 0.6, dir: V(0, 1, 0), spread: 0.7, size: 0.07, life: 1.3, gravity: -2.4, drag: 1.5, additive: true, opacity: 0.7 });
    };

    const rec = g.save.record(4);
    g.scrolls.add(0, SCROLL_DEEP, 'Psalm 130:1', g.root, rec.scrolls[0]);
    g.scrolls.add(1, BV(SPAR_TOP.x + 0.5, SPAR_TOP.top + 1.2, SPAR_TOP.z), 'Psalm 42:7', g.root, rec.scrolls[1]);
    g.scrolls.add(2, BV(SHELF.x - 0.5, SHELF.top + 1.2, SHELF.z), 'Matthew 12:40', g.root, rec.scrolls[2]);

    this.enter('deep');
  }

  // ---- the three places ----------------------------------------------------------------------------------------

  private enter(r: Region) {
    const g = this.g;
    const p = g.player;
    this.region = r;
    const deep = r === 'deep';
    const belly = r === 'belly';
    const shore = r === 'shore';
    this.deep.group.visible = this.deepWeeds.mesh.visible = this.deepGlow.object.visible = this.deepJellies.mesh.visible = this.seaSkin.mesh.visible = this.hull.visible = this.motes.object.visible = deep;
    this.belly.group.visible = this.belly.flotsam.mesh.visible = this.bellyWeeds.mesh.visible = this.bellyGlow.object.visible = this.jellies.mesh.visible = this.pool.mesh.visible = this.flecks.mesh.visible = belly;
    this.veils.forEach((v, i) => (v.mesh.visible = belly && this.veilOpen[i] < 1));
    for (const pl of this.pearls) pl.group.visible = belly;
    this.shore.visible = this.ocean.mesh.visible = shore;
    for (const l of this.lamps) l.intensity = 0;
    this.release();
    p.water = deep ? this.deepWater : belly ? this.bellyWater : null;

    const L = g.lights!;
    const grade = g.engine.post.grade;
    const fog = g.engine.scene.fog as THREE.Fog;
    L.sun.castShadow = shore && g.quality.shadowSize > 0;
    if (deep) {
      L.setSun(V(0.25, 1, 0.15), 0x8fc4e8, 1.4);
      L.hemi.color.set(0x5a96c8);
      L.hemi.groundColor.set(0x10243c);
      this.sky.set({ sunSize: 0, sunGlow: 0, cloudCover: 0 });
      grade.tint.setRGB(0.92, 1.0, 1.08);
      grade.lift.setRGB(0.008, 0.024, 0.042);
      grade.saturation = 1.06;
      grade.contrast = 1.05;
      grade.vignette = 0.5;
      grade.bloom = 0.8;
      grade.threshold = 0.7;
      grade.exposure = 1.12;
      g.cam.hint = () => ({ pitch: 0.8, dist: 7.6, strength: 1.3 });
      g.audio.bed('deep', 0.7);
      g.audio.bed('waves', 0);
      g.audio.bed('wind', 0);
      g.touch.setJump('Stroke');
    } else if (belly) {
      L.setSun(V(0.1, 1, 0.2), 0x7a60b8, 0.4);
      L.hemi.color.set(0x7a68c0);
      L.hemi.groundColor.set(0x2c1a50);
      this.sky.set({ top: BELLY_FOG, horizon: BELLY_FOG, bottom: BELLY_FOG, sunSize: 0, sunGlow: 0, cloudCover: 0 });
      fog.near = 7;
      fog.far = 64;
      grade.tint.setRGB(1.0, 0.97, 1.06);
      grade.lift.setRGB(0.02, 0.012, 0.036);
      grade.saturation = 1.14;
      grade.contrast = 1.04;
      grade.vignette = 0.52;
      grade.bloom = 1.0;
      grade.threshold = 0.62;
      grade.exposure = 1.14;
      g.cam.hint = () => ({ pitch: 0.3, dist: 6.8, strength: 0.7 });
      g.audio.bed('deep', 0.5);
      g.touch.setJump('Jump');
    } else {
      L.setSun(V(0.5, 0.42, -0.75), 0xffe2b8, 2.6);
      L.hemi.color.set(0xc4daff);
      L.hemi.groundColor.set(0xb09a6a);
      L.hemi.intensity = 1.15;
      this.sky.set({ top: 0x4f7fc4, horizon: 0xffdcb0, bottom: 0xe8caa0, sunDir: V(0.35, 0.3, -1), sunColor: 0xfff0d0, sunSize: 0.03, sunGlow: 1.25, cloudCover: 0.32, cloudLit: 0xffecd8, cloudDark: 0xb89aa4 });
      fog.color.set(0xf2dcbc);
      fog.near = 70;
      fog.far = 430;
      grade.tint.setRGB(1.04, 1.0, 0.95);
      grade.lift.setRGB(0.02, 0.015, 0.01);
      grade.saturation = 1.05;
      grade.contrast = 1.04;
      grade.vignette = 0.3;
      grade.bloom = 0.5;
      grade.threshold = 0.86;
      grade.exposure = 1.0;
      g.cam.hint = null;
      g.audio.bed('deep', 0);
      g.audio.bed('waves', 0.5);
      g.audio.bed('wind', 0.2);
      g.touch.setJump('Jump');
    }
  }

  private deepCurrent(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    // all thy billows and thy waves: the sea's heave, felt less the deeper he goes
    const k = clamp01(1 + p.y / 34);
    const t = this.g.engine.time;
    return out.set(Math.sin(t * 0.7) * 2.1 * k, 0, Math.cos(t * 0.45) * 1.2 * k);
  }

  /** The flow in the turning stretch: fair for a little, then foul. Positive is onward. */
  private flow(): number {
    const u = this.flowT % FLOW_PERIOD;
    const foul = this.g.story ? -3.4 : -5.4;
    const a = smoothstep(0, 0.45, u) * (1 - smoothstep(FLOW_FAIR, FLOW_FAIR + 0.45, u));
    return lerp(foul, 1.0, a);
  }

  private bellyCurrent(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    const z = p.z;
    const win = (a: number, b: number) => smoothstep(a, a + 2, z) * (1 - smoothstep(b - 2, b, z));
    let fx = 0;
    let fz = 0;
    const easy = this.g.story;
    if (z > 17 && z < 36) fz += 2.2 * win(17, 36);
    else if (z > 41 && z < 67) {
      fz -= (easy ? 2.0 : 3.8) * win(41, 67);
      fx += Math.sin(z * 0.4) * 0.5;
    } else if (z > 70 && z < 90) {
      const k = easy ? 0.5 : 1;
      fx += k * (1.6 * win(71, 78) - 1.8 * win(77, 84) + 1.6 * win(83, 90));
    } else if (z > 118 && z < 141) {
      let lee = 1;
      for (const [lx, lz] of LEES) lee = Math.min(lee, smoothstep(2.2, 3.4, Math.hypot(p.x - BX - lx, z - lz)));
      fz += this.flow() * win(118, 141) * lee;
    }
    return out.set(fx, 0, fz);
  }

  /** The water's height in the belly while it rises and falls. */
  private tideAt(t: number): number {
    const s = 0.5 - 0.5 * Math.cos((t / TIDE_PERIOD) * TAU);
    return -1.2 + 4.1 * smoothstep(0.2, 0.8, s);
  }

  // ---- the story -----------------------------------------------------------------------------------------------

  start() {
    const g = this.g;
    g.touch.setSlide(true, 'Dive');
    g.audio.play('fish');
    g.run(() => this.story());
  }

  private from(phase: Phase): boolean {
    return !this.seek || ORDER.indexOf(phase) >= ORDER.indexOf(this.seek);
  }

  private *story(): Routine {
    if (this.from('sink')) yield* this.pSink();
    if (this.from('fish')) yield* this.pFish();
    if (!this.seek || ORDER.indexOf(this.seek) <= ORDER.indexOf('vow')) yield* this.pBelly();
    yield* this.pShore();
  }

  /** Cast into the deep (2:3), and the going down (2:5, 2:6). */
  private *pSink(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'sink';
    g.hud.cinema(true);
    p.lock('faint');
    p.teleport(V(0, -1.5, 0), 0);
    g.cam.setShot({ pos: V(4.6, -10.5, 6.5), look: V(0, -3.2, 0), fov: 50 }, 0);
    g.audio.splash(1.3);
    g.hud.verse(part('2:3', 'For thou hadst cast me into the deep', 'in the midst of the seas'), { who: 'Jonah', seconds: 6 });
    let n = 0;
    yield* tween(4.4, (k) => {
      p.teleport(_v.set(0, lerp(-1.2, -7.5, k), 0), k * 1.4);
      if (k * 14 > n) {
        n++;
        g.fx.emit(_w.set(0, p.pos.y + 1.2, 0), { count: 5, color: 0xdff6ff, speed: 1.2, speedVar: 0.7, dir: V(0, 1, 0), spread: 0.8, size: 0.09, life: 1.6, gravity: -3, drag: 1.2, additive: true, opacity: 0.8, radius: 0.5 });
      }
    });
    g.cam.setShot(null, 1.5);
    g.hud.cinema(false);
    p.unlock();
    g.hud.objective('Go down through the deep', 'Steer, and stroke to rise. Keep out of the weeds');
    yield () => p.pos.y < FLOOR_Y + 4.6;
  }

  /** 1:17. The great fish, prepared; it swallows him up. */
  private *pFish(): Routine {
    const g = this.g;
    const p = g.player;
    const f = this.fish;
    this.phase = 'fish';
    g.hud.clearBanners();
    if (this.seek === 'fish') p.teleport(V(-8, FLOOR_Y + 4, -2), 0);
    g.hud.objective(null);
    g.hud.cinema(true);
    this.release();
    p.lock('faint');
    const from = p.pos.clone();
    const rest = V(0, FLOOR_Y + 2.4, -3);
    g.cam.setShot({ pos: V(7.5, FLOOR_Y + 2.0, 8.5), look: V(-1.5, FLOOR_Y + 4.2, -8), fov: 52 }, 1.8);
    g.hud.verse(part('2:6', 'I went down to the bottoms of the mountains', 'about me for ever'), { who: 'Jonah', seconds: 7.5 });
    yield* tween(3.6, (k) => p.teleport(_v.lerpVectors(from, rest, k), 0.5 + k), ease.inOutQuad);
    yield 1.2;
    // lights pass, beyond the bars: something vast
    f.group.visible = true;
    f.gape = 0;
    f.beat = 1;
    f.glow = 1.3;
    f.group.rotation.set(0, Math.PI / 2, 0);
    g.audio.whale();
    g.cam.setShot({ pos: V(6.5, FLOOR_Y + 1.5, 7.5), look: V(-3, FLOOR_Y + 8.5, -30), fov: 58 }, 3.2);
    yield* tween(9, (k) => {
      f.group.position.set(lerp(-88, 84, k), -81 - Math.sin(k * Math.PI) * 1.5, -37);
      this.fogWide = lerp(1, 2.4, smoothstep(0, 0.35, k));
      p.teleport(_v.set(rest.x, rest.y + Math.sin(k * 5) * 0.12, rest.z), 1.5 + k * 0.6);
    });
    yield 0.5;
    // it turns, and comes for him; he is drawn out through the gap in the bars
    f.group.rotation.set(0, 0, 0);
    g.audio.whale();
    g.audio.heartbeat();
    g.cam.setShot({ pos: V(12.5, FLOOR_Y + 2.6, -15.5), look: V(-1, FLOOR_Y + 7, -34), fov: 54 }, 0);
    const lamp = this.lamps[0];
    lamp.position.set(4, MEET.y + 4, MEET.z + 4);
    lamp.color.set(0xcfe8ff);
    lamp.distance = 60;
    g.hud.verse(part('1:17', 'Now the LORD had prepared', 'swallow up Jonah'), { seconds: 7 });
    let fade: (() => boolean) | null = null;
    let beat = 0;
    yield* tween(8.2, (k) => {
      const e = ease.inOutQuad(k);
      f.group.position.set(0, lerp(-81, MEET.y + 4, smoothstep(0, 0.75, k)), lerp(-138, MEET.z - 21.2, e));
      f.gape = smoothstep(0.42, 0.9, k);
      f.beat = lerp(1, 0.35, k);
      lamp.intensity = 160 * smoothstep(0.2, 0.8, k);
      p.teleport(_v.lerpVectors(rest, MEET, smoothstep(0.12, 0.85, k)), Math.PI + Math.sin(k * 3) * 0.3);
      if (k > 0.55) g.cam.shake(0.1 * (k - 0.55));
      if (k * 5 > beat) {
        beat++;
        g.audio.heartbeat();
      }
      if (k > 0.88 && !fade) {
        fade = g.hud.fade(1, 0.55);
        g.audio.whoosh(1);
      }
    });
    yield 0.7;
    f.group.visible = false;
    lamp.distance = 30;
    this.fogWide = 1;
    this.enter('belly');
    this.layHim();
    yield g.hud.verse(part('1:17', 'And Jonah was in the belly'), { block: true });
  }

  /** He lies on a piece of some ship's side, afloat inside the fish. */
  private layHim() {
    const g = this.g;
    g.player.lock('lie');
    g.player.teleport(BV(0, 0.34, 2.4), 0);
    g.cam.setShot({ pos: BV(3.4, 2.1, -1.6), look: BV(0, 0.7, 3.6), fov: 44 }, 0);
  }

  /** 2:1–9. Inside: the eight lights of his prayer, three days and three nights. */
  private *pBelly(): Routine {
    const g = this.g;
    const p = g.player;
    const s = this.seek ? SEEK[this.seek] : undefined;
    this.phase = 'belly';
    if (s) {
      // dropped in part-way, for testing
      this.enter('belly');
      this.found = s.found;
      for (let i = 0; i < s.found; i++) this.openAfter(i, true);
      this.tideOn = s.found === 4;
      p.teleport(s.at, 0);
      g.hud.fade(0, 0.6);
    } else {
      if (this.seek === 'belly') {
        this.enter('belly');
        this.layHim();
        g.hud.cinema(true);
      }
      yield g.hud.fade(0, 2.8);
      yield 0.6;
      p.setLockedPose('kneel');
      g.cam.setShot({ pos: BV(-4.2, 2.5, -2.2), look: BV(0, 1.6, 9), fov: 50 }, 3.2);
      yield g.hud.verse(part('2:1'), { block: true });
      p.setLockedPose('pray');
      yield 0.9;
      g.cam.setShot(null, 1.4);
      g.hud.cinema(false);
      p.unlock();
      g.hud.toast(DAYS[0], 4);
    }
    this.say();
    yield () => this.found >= 8;

    // 2:9: the vow, and "Salvation is of the LORD"
    this.phase = 'vow';
    g.hud.clearBanners();
    g.hud.objective(null);
    g.hud.marker('light', null);
    g.hud.cinema(true);
    p.lock('pray');
    const top = PEARLS[7];
    p.teleport(BV(top.x, 4.62, top.z - 0.4), 0);
    g.cam.setShot({ pos: BV(3.4, 5.5, top.z - 6.5), look: BV(0, 6.0, top.z + 1), fov: 46 }, 1.6);
    yield g.hud.verse(cite('2:9'), { who: 'Jonah', block: true });
    // every light wakes; the great fish stirs
    for (let i = 0; i < this.litTarget.length; i++) this.litTarget[i] = 1;
    g.audio.whale();
    g.audio.swell(110);
    g.cam.setShot({ pos: BV(-2.5, 6.6, top.z - 9), look: BV(0, 6.4, top.z + 12), fov: 56 }, 3.4);
    let fade: (() => boolean) | null = null;
    yield* tween(4.2, (k) => {
      this.glowAll = k;
      g.cam.shake(0.08 + 0.3 * k);
      if (k > 0.72 && !fade) {
        fade = g.hud.fade(1, 1.1, '#fff');
        g.audio.whoosh(1.2);
      }
    });
    yield 0.4;
  }

  /** 2:10. Upon the dry land. */
  private *pShore(): Routine {
    const g = this.g;
    const p = g.player;
    const f = this.fish;
    this.phase = 'shore';
    this.enter('shore');
    g.hud.cinema(true);
    g.hud.objective(null);
    p.lock('air');
    p.teleport(SV(0, -6, -12), 0);
    p.figure.root.visible = false;
    f.group.visible = true;
    f.gape = 0;
    f.glow = 0;
    f.beat = 0.5;
    f.group.rotation.set(0, 0, 0);
    f.group.position.copy(SV(0, -12, -42));
    g.audio.play('calm');
    g.cam.setShot({ pos: SV(-17, 3.2, 9), look: SV(1, 1.6, -9), fov: 48 }, 0);
    g.hud.fade(1, 0, '#fff');
    yield g.hud.fade(0, 1.8, '#fff');
    yield 1.1;
    // the sea heaves, and the great fish comes up out of it
    g.audio.whale();
    g.audio.splash(1.6);
    g.cam.setShot({ pos: SV(-15, 2.4, 8), look: SV(1, 3.2, -9), fov: 50 }, 3);
    let n = 0;
    yield* tween(3.4, (k) => {
      const e = ease.outCubic(k);
      f.group.position.copy(SV(0, lerp(-12, -3.4, e), lerp(-42, -31, e)));
      f.group.rotation.x = -0.44 * smoothstep(0.25, 1, k);
      g.cam.shake(0.25 * (1 - k));
      if (k * 12 > n) {
        n++;
        g.fx.emit(SV((n % 5) * 3 - 6, 0.2, -13 - (n % 3) * 3), { count: 26, color: 0xffffff, color2: 0xbfe8f0, speed: 9, speedVar: 0.5, dir: V(0, 1, 0.25), spread: 0.45, size: 0.3, life: 1.3, gravity: 13, opacity: 0.8, radius: 2.5, grow: 1.6 });
      }
    });
    g.hud.verse(part('2:10', 'And the LORD spake unto the fish', 'unto the fish'), { seconds: 4.5 });
    yield* tween(0.9, (k) => (f.gape = 0.85 * ease.outQuad(k)));
    // out upon the dry land
    const mouth = SV(0, 4.6, -11.5);
    const land = SV(0.6, shoreY(7.5) + 0.04, 7.5);
    p.figure.root.visible = true;
    g.audio.whoosh(1.2);
    g.fx.emit(mouth, { count: 40, color: 0xffffff, color2: 0xcfeef4, speed: 12, speedVar: 0.5, dir: V(0, 0.45, 1), spread: 0.3, size: 0.26, life: 1.2, gravity: 12, opacity: 0.8, radius: 1.5, grow: 1.5 });
    yield* tween(1.3, (k) => {
      _v.lerpVectors(mouth, land, k);
      _v.y += Math.sin(k * Math.PI) * 3.4;
      p.teleport(_v, k * 5);
    });
    p.teleport(land, 0.4);
    p.setLockedPose('lie');
    g.audio.thud(1, 'sand');
    g.cam.shake(0.3);
    g.fx.emit(land, { count: 18, color: 0xe8d8b0, speed: 2.6, speedVar: 0.5, dir: V(0, 1, 0), spread: 0.9, size: 0.2, life: 0.8, gravity: 5, opacity: 0.6, radius: 0.5, grow: 2 });
    yield 0.7;
    // the fish shuts its mouth and goes down again into the sea
    g.run(() =>
      tween(
        7,
        (k) => {
          f.gape = 0.85 * (1 - smoothstep(0, 0.3, k));
          f.group.rotation.x = -0.44 * (1 - smoothstep(0.1, 0.6, k));
          f.group.position.copy(SV(0, lerp(-3.4, -14, smoothstep(0.2, 1, k)), lerp(-31, -56, ease.inQuad(k))));
          if (k >= 1) f.group.visible = false;
        },
      ),
    );
    g.cam.setShot({ pos: SV(4.4, shoreY(13) + 1.5, 13.5), look: SV(0.4, shoreY(7) + 0.8, 5.5), fov: 46 }, 3.4);
    yield 2.2;
    p.setLockedPose('kneel');
    yield g.hud.verse(part('2:10', 'and it vomited out Jonah'), { block: true });
    g.cam.setShot(null, 1.5);
    g.hud.cinema(false);
    p.unlock();
    const goal = SV(0, shoreY(24) + 1.2, 24.4);
    g.hud.objective('Go up from the sea', 'The morning');
    g.hud.marker('way', goal, { label: 'Dry land' });
    yield () => p.pos.z > 22.6;
    g.hud.marker('way', null);
    yield g.hud.fade(1, 1.4);
    this.phase = 'done';
    g.complete(this.deepCatches === 0);
  }

  // ---- the lights of the prayer --------------------------------------------------------------------------------

  /** What the top of the screen says while he is inside. */
  private say() {
    const g = this.g;
    const day = DAYS[Math.min(this.found, DAYS.length - 1)];
    const what = this.found === 4 ? 'The water rises and falls. Go over when it is high' : this.found === 5 ? 'The current turns. Rest behind the ribs' : 'Find the lights in the dark';
    g.hud.objective(what, day);
  }

  /** What follows from light `i` being found: its stretch wakes, and the veil beyond it parts. */
  private openAfter(i: number, atOnce = false) {
    this.litTarget[i] = 1;
    this.litTarget[i + 1] = 1;
    if (atOnce) this.bellyGlow.lit[i] = this.bellyGlow.lit[i + 1] = 1;
    if (i < VEILS.length) {
      const c = this.belly.veils[i];
      if (c) this.g.physics.world.removeCollider(c, false);
      this.belly.veils[i] = null;
      if (atOnce) {
        this.veilOpen[i] = 1;
        this.veils[i].mesh.visible = false;
      } else this.veilOpen[i] = 0.001;
    }
  }

  private take(i: number) {
    const g = this.g;
    const pl = PEARLS[i];
    this.found = i + 1;
    this.openAfter(i);
    g.audio.chime();
    g.audio.verse();
    const night = SEC_NIGHT[i + 1];
    g.fx.emit(BV(pl.x, pl.y, pl.z), { count: 46, color: night ? 0xff70e0 : 0x70ffe4, color2: 0xfff2d0, speed: 5, speedVar: 0.7, spread: 1, size: 0.16, life: 1.6, gravity: -0.6, drag: 1.6, additive: true, opacity: 0.9 });
    this.tideOn = this.found === 4;
    if (i < 7) {
      // the newest words are the ones on the screen: an earlier verse still showing gives way
      g.hud.clearBanners();
      g.hud.verse(cite(pl.v), { who: 'Jonah', seconds: 5.5 + cite(pl.v).text.length * 0.035 });
      if (DAYS[this.found] !== DAYS[i]) g.hud.toast(DAYS[this.found], 4);
      this.say();
      if (i === 3) g.audio.swell(82);
    }
  }

  // ---- the weeds' hold -----------------------------------------------------------------------------------------

  private release() {
    if (!this.caught) return;
    const g = this.g;
    this.caught = null;
    this.immune = 2.6;
    g.player.push.set(0, 0, 0);
    g.player.speedScale = 1;
    g.hud.meter('weed', null);
  }

  override fixedUpdate(dt: number) {
    const g = this.g;
    const p = g.player;
    this.belly.flotsam.body.setNextKinematicTranslation({ x: BX, y: this.level, z: 0 });
    this.immune -= dt;
    const down = g.input.jump.down;
    const pressed = down && !this.jumpWas;
    this.jumpWas = down;
    const need = g.story ? 2 : 3;
    if (this.caught) {
      if (pressed) {
        this.shakes++;
        g.audio.bubble();
        g.fx.emit(p.chest(_v), { count: 10, color: 0x9fe0a0, color2: 0xdff6ff, speed: 2.2, speedVar: 0.6, spread: 1, size: 0.1, life: 0.9, gravity: -1.5, drag: 2, opacity: 0.8 });
      }
      if (this.shakes >= need || p.locked) {
        const deep = this.region === 'deep';
        this.release();
        if (deep) p.vel.y = 3.2;
        g.audio.good();
      } else {
        _v.copy(this.anchor).sub(p.pos).multiplyScalar(4);
        if (_v.length() > 6) _v.setLength(6);
        if (this.region !== 'deep') _v.y = 0;
        p.push.copy(_v);
        p.vel.multiplyScalar(0.6);
        g.hud.meter('weed', { label: 'Caught in the weeds: stroke to shake free', value: this.shakes / need, danger: true });
      }
    } else if (this.immune <= 0 && p.state === 'swim' && this.region !== 'shore') {
      const zone = (this.region === 'deep' ? this.deepWeeds : this.bellyWeeds).at(p.pos);
      if (zone) {
        this.caught = zone;
        this.anchor.copy(p.pos);
        this.shakes = 0;
        p.speedScale = 0.1;
        if (zone.deep) this.deepCatches++;
        g.bot?.note(`caught in weed at (${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)}, ${p.pos.z.toFixed(1)}): zone (${zone.x.toFixed(1)}, ${zone.y.toFixed(1)}, ${zone.z.toFixed(1)}) ${zone.hangs ? 'hanging' : 'standing'} ${zone.height.toFixed(1)}`);
        g.audio.bad();
        g.cam.shake(0.12);
      }
    }
  }

  // ---- every frame ---------------------------------------------------------------------------------------------

  override update(dt: number) {
    const g = this.g;
    const p = g.player;
    const t = g.engine.time;
    const vh = g.engine.canvas.clientHeight;
    const cam = g.engine.camera;
    this.sky.update(t);
    if (this.fish.group.visible) this.fish.update(t, vh);
    if (this.region === 'deep') this.updateDeep(dt, t, vh, cam);
    else if (this.region === 'belly') this.updateBelly(dt, t, vh, cam);
    else this.ocean.update(t, cam);
    void p;
  }

  private updateDeep(dt: number, t: number, vh: number, cam: THREE.Camera) {
    const g = this.g;
    const p = g.player;
    const fog = g.engine.scene.fog as THREE.Fog;
    const depth = clamp01(-cam.position.y / 96);
    _c.copy(SEA_TOP).lerp(SEA_DEEP, Math.pow(depth, 0.75));
    fog.color.copy(_c);
    fog.near = lerp(7, 3, depth);
    fog.far = lerp(60, 42, depth) * this.fogWide;
    this.sky.set({ top: _c, horizon: _c, bottom: _c });
    const L = g.lights!;
    L.sun.intensity = lerp(1.6, 0.3, depth);
    L.hemi.intensity = lerp(2.6, 1.9, depth);
    this.deepWeeds.update(t, this.caught ? p.pos : undefined, this.caught ? 1 : 0);
    this.deepGlow.update(t, vh);
    this.deepJellies.update(t, this.deepGlow.lit, null);
    this.motes.update(t, cam, vh);
    this.seaSkin.update(t);
    // the prayer remembers the going down
    if (this.phase === 'sink' && !g.hud.inCinema) {
      if (this.said === 0 && p.pos.y < -19) {
        this.said = 1;
        g.hud.verse(part('2:3', 'the floods compassed me about'), { who: 'Jonah', seconds: 6.5 });
      } else if (this.said === 1 && p.pos.y < -47) {
        this.said = 2;
        g.hud.verse(part('2:5', 'the depth closed me round about'), { who: 'Jonah', seconds: 6.5 });
      }
      this.bubbleT -= dt;
      if (this.bubbleT < 0) {
        this.bubbleT = 0.7;
        g.fx.emit(p.chest(_v), { count: 2, color: 0xcfefff, speed: 0.5, dir: V(0, 1, 0), spread: 0.5, size: 0.06, life: 1.8, gravity: -2.2, drag: 1, additive: true, opacity: 0.6 });
      }
    }
  }

  private updateBelly(dt: number, t: number, vh: number, cam: THREE.Camera) {
    const g = this.g;
    const p = g.player;
    // the water
    if (this.tideOn) this.tideT += dt;
    this.level = damp(this.level, this.tideOn ? this.tideAt(this.tideT) : 0, 1.4, dt);
    this.bellyWater.surfaceY = this.level;
    this.flowT += dt;
    this.pool.mesh.position.y = this.level;
    this.pool.flow.y += this.bellyCurrent(_w.copy(p.pos), _v).z * dt * 0.42;
    this.pool.update(t);
    this.belly.flotsam.mesh.position.set(BX, this.belly.flotsam.body.translation().y, 0);
    this.flecks.update(dt, p.pos, BX, 12, 24, this.level, (at, out) => this.bellyCurrent(at, out));
    // what is awake
    const lit = this.bellyGlow.lit;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      lit[i] = damp(lit[i], Math.max(this.litTarget[i], this.glowAll), 1.3, dt);
      sum += lit[i];
    }
    this.bellyGlow.update(t, vh);
    this.jellies.update(t, lit, this.level);
    this.bellyWeeds.update(t, this.caught ? p.pos : undefined, this.caught ? 1 : 0);
    const awake = sum / 9;
    const L = g.lights!;
    L.hemi.intensity = 1.25 + awake * 1.0 + this.glowAll * 1.2;
    const fog = g.engine.scene.fog as THREE.Fog;
    fog.color.copy(BELLY_FOG).lerp(BELLY_FOG_LIT, awake);
    if (this.glowAll > 0) fog.color.lerp(_c.set(0xfff0e0), this.glowAll * 0.5);
    this.sky.set({ top: fog.color, horizon: fog.color, bottom: fog.color });
    this.pool.uniforms.uBright.value = 0.14 + awake * 0.2;

    // veils part
    this.veils.forEach((v, i) => {
      const o = this.veilOpen[i];
      if (o > 0 && o < 1) {
        this.veilOpen[i] = Math.min(1, o + dt / 1.6);
        v.uniforms.uAlpha.value = 0.62 * (1 - this.veilOpen[i]);
        v.uniforms.uBright.value = 0.5 + 2 * Math.sin(this.veilOpen[i] * Math.PI);
        if (this.veilOpen[i] >= 1) v.mesh.visible = false;
      }
      v.update(t);
    });

    // the lights of the prayer
    const free = !g.hud.inCinema && !p.locked;
    this.pearls.forEach((pl, i) => {
      const spec = PEARLS[i];
      const next = i === this.found;
      pl.group.visible = i >= this.found;
      if (!pl.group.visible) return;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.4 + i);
      pl.group.position.y = spec.y + Math.sin(t * 1.3 + i) * 0.14;
      pl.core.scale.setScalar(next ? 1 + pulse * 0.25 : 0.5);
      pl.halo.scale.setScalar(next ? 2.6 + pulse * 0.9 : 0.9);
      (pl.halo.material as THREE.SpriteMaterial).opacity = next ? 0.95 : 0.3;
    });
    if (this.found < 8) {
      const spec = PEARLS[this.found];
      _v.set(BX + spec.x, spec.y, spec.z);
      g.hud.marker('light', free ? _v : null, { label: 'A light' });
      if (free && p.chest(_w).distanceTo(_v) < 1.75) this.take(this.found);
    }

    // real light, lent to the lamps nearest him: the lights already found, and the next
    const cands: { x: number; y: number; z: number; c: number; k: number; d: number }[] = [];
    for (let i = 0; i <= Math.min(this.found, 7); i++) {
      const spec = PEARLS[i];
      const next = i === this.found;
      const d = Math.hypot(BX + spec.x - p.pos.x, spec.z - p.pos.z);
      cands.push({ x: BX + spec.x, y: spec.y + (next ? 0.6 : 3), z: spec.z, c: next ? 0xffeccc : SEC_NIGHT[i + 1] ? 0xf0a8ff : 0xa8fff0, k: next ? 9 : 13, d });
    }
    cands.sort((a, b) => a.d - b.d);
    this.lamps.forEach((l, i) => {
      const c = cands[i];
      if (!c) {
        l.intensity = damp(l.intensity, 0, 4, dt);
        return;
      }
      if (l.position.x !== c.x || l.position.z !== c.z) {
        // moved to another lamp: come up from dark, so nothing pops
        l.position.set(c.x, c.y, c.z);
        l.color.set(c.c);
        l.intensity = 0;
      }
      l.intensity = damp(l.intensity, c.k, 3, dt);
    });
  }

  // ---- the automated player ------------------------------------------------------------------------------------

  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const self = this;
    const free = () => !p.locked && !g.hud.inCinema;
    const pulse = () => self.caught !== null && g.engine.time % 0.3 < 0.14;
    /** Swims in the deep: steers to (x, z), and keeps his feet near `y` (or lets him sink when it is null). */
    function* swimTo(x: number, y: number | null, z: number, dist = 1.4, until?: () => boolean): Routine {
      let t = 0;
      for (;;) {
        if (!free() || self.region !== 'deep') break;
        const d = b.steer(x, z, 1);
        if (d < 0.5) b.input.moveX = b.input.moveY = 0;
        if (self.caught) b.input.jump = pulse();
        else b.input.jump = y !== null && p.pos.y + p.vel.y * 0.45 < y;
        if (until ? until() : d < dist && (y === null || Math.abs(p.pos.y - y) < 1.3)) break;
        const dt: number = (yield) ?? 0;
        t += dt;
        if (t > 40) {
          b.assist(`could not swim to (${x.toFixed(1)}, ${y ?? 0}, ${z.toFixed(1)}) from (${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)}, ${p.pos.z.toFixed(1)})`);
          p.teleport(V(x, (y ?? p.pos.y) + 0.2, z));
          break;
        }
      }
      b.stop();
    }
    const walk = (to: THREE.Vector3, o: Parameters<Bot['goTo']>[1] = {}) => b.goTo(to, { holdJump: pulse, timeout: 20, ...o });

    /** The height to cross a room of the deep at: over the standing weed, under the hanging. */
    const flyAt = (k: number): number | null => {
      if (k === 0) return null;
      const room = ROOMS[k];
      const lo = SLABS[k].y + SLAB_T / 2 + room.stand - 0.6;
      const hi = SLABS[k - 1].y - SLAB_T / 2 - room.hang - 1.2;
      return room.hang > 0 ? (lo + hi) / 2 : lo + 1.7;
    };
    if (this.from('sink')) {
      yield* b.until(free, 30, 'the sinking to begin');
      for (let k = 0; k < SLABS.length; k++) {
        const s = SLABS[k];
        const fly = flyAt(k);
        if (k === 2 && !g.scrolls.pieces[0]?.found) {
          let tried = 0;
          yield* swimTo(SCROLL_DEEP.x, SCROLL_DEEP.y - 1.05, SCROLL_DEEP.z, 0.3, () => !!g.scrolls.pieces[0]?.found || (tried += 1 / 60) > 14);
          b.note(`scroll in the deep: ${g.scrolls.pieces[0]?.found ? 'found' : 'missed'}`);
        }
        yield* swimTo(s.x, fly, s.z, 1.3);
        // down the well, and on down in its open water to the height of the next crossing
        const next = SLABS[k + 1];
        const until = next ? flyAt(k + 1)! + 0.9 : s.y - SLAB_T / 2 - 0.4;
        yield* swimTo(s.x, null, s.z, 0, () => p.pos.y < until);
      }
      b.note(`through the deep; caught ${this.deepCatches} times`);
    }
    if (!this.seek || ORDER.indexOf(this.seek) <= ORDER.indexOf('vow')) {
      yield* b.until(() => this.region === 'belly' && free(), 150, 'waking in the fish');
      const at = (i: number, y = 0.5) => BV(PEARLS[i].x, y, PEARLS[i].z);
      // the first light, and the second: down the timber, then carried by the current
      if (this.found < 1) yield* walk(at(0), { dist: 0.8 });
      if (this.found < 2) yield* walk(at(1), { dist: 0.9, y: true });
      // the flotsam, against the current
      if (this.found < 3) {
        for (let tries = 0; tries < 6 && this.found < 3; tries++) {
          let prev = at(1);
          let fell = false;
          const stops: THREE.Vector3[] = STONES.map(([x, z]) => BV(x, 0.3, z));
          stops.push(at(2));
          for (let i = 0; i < stops.length && !fell; i++) {
            const here = prev;
            const reach = i === 0 ? 2.4 : 1.3;
            yield* walk(stops[i], { dist: 0.55, timeout: 6, noAssist: true, jump: () => p.grounded && Math.hypot(p.pos.x - here.x, p.pos.z - here.z) > reach, until: () => p.state === 'swim' });
            if (p.state === 'swim') fell = true;
            prev = stops[i];
            // the scroll up the spar
            if (!fell && i === 2 && !g.scrolls.pieces[1]?.found) {
              yield* walk(BV(SPAR_TOP.x + 0.3, SPAR_TOP.top, SPAR_TOP.z), { dist: 0.7, timeout: 8, noAssist: true, until: () => p.state === 'swim' });
              b.note(`scroll up the spar: ${g.scrolls.pieces[1]?.found ? 'found' : 'missed'}`);
              yield* walk(stops[2], { dist: 0.5, timeout: 8, noAssist: true, until: () => p.state === 'swim' });
              if (p.state === 'swim') fell = true;
            }
          }
          if (fell) {
            // climb out on whatever is nearest ahead, or go back to the start of the stretch
            b.note('fell among the flotsam; back to try again');
            yield* walk(at(1), { dist: 0.9, y: true, timeout: 25 });
          }
        }
        if (this.found < 3) yield* walk(at(2), { dist: 0.8, y: true });
      }
      // the hanging weeds: through the gap in each row
      if (this.found < 4) {
        for (const [z, gap] of WEED_ROWS) {
          yield* walk(BV(gap, 0, z - 2.6), { dist: 0.9, timeout: 14 });
          yield* walk(BV(gap, 0, z + 2.2), { dist: 0.9, timeout: 14 });
        }
        yield* walk(at(3), { dist: 0.8, y: true });
      }
      // the rising and falling water: a scroll on the shelf, then over the sill to the high light
      if (this.found < 5) {
        const phase = () => (this.tideT / TIDE_PERIOD) % 1;
        if (!g.scrolls.pieces[2]?.found) {
          yield* walk(BV(SHELF.x + 3.2, 0, SHELF.z), { dist: 1, timeout: 14 });
          yield* b.until(() => this.level > SHELF.top - 0.8 && phase() < 0.56, 40, 'high water at the shelf');
          yield* walk(BV(SHELF.x - 0.4, SHELF.top, SHELF.z), { dist: 0.8, y: true, timeout: 8, noAssist: true });
          b.note(`scroll on the shelf: ${g.scrolls.pieces[2]?.found ? 'found' : 'missed'}`);
        }
        yield* walk(BV(0, 0, SILL.z - 4), { dist: 1.2, timeout: 20 });
        yield* b.until(() => this.level > SILL.top + 1.45 && phase() < 0.5, 40, 'high water at the sill');
        yield* walk(at(4, 3.2), { dist: 0.8, y: true, timeout: 9, noAssist: true });
        for (let tries = 0; tries < 4 && this.found < 5; tries++) {
          yield* b.until(() => this.level > 2.5 && phase() < 0.55, 40, 'high water at the high light');
          yield* walk(at(4, 3.2), { dist: 0.8, y: true, timeout: 9, noAssist: true });
        }
        if (this.found < 5) yield* walk(at(4, 3.2), { dist: 0.8, y: true, timeout: 5 });
      }
      // the turning current: from rib to rib while it is fair
      if (this.found < 6) {
        const fair = () => this.flowT % FLOW_PERIOD < 0.5;
        yield* walk(BV(0, 0, 117.2), { dist: 1, timeout: 12 });
        const rests: THREE.Vector3[] = LEES.map(([x, z]) => BV(x, 0, z - 1.5));
        for (const r of rests) {
          yield* b.until(fair, 20, 'the current to turn');
          yield* walk(r, { dist: 0.7, timeout: 6, noAssist: true });
        }
        yield* b.until(fair, 20, 'the current to turn');
        yield* walk(at(5), { dist: 0.8, y: true, timeout: 12 });
      }
      // up the throat
      if (this.found < 7) yield* walk(at(6, 1.0), { dist: 0.9, y: true, timeout: 20 });
      if (this.found < 8) {
        yield* walk(BV(0, 2.2, 160.3), { dist: 0.7, y: true, timeout: 8 });
        yield* walk(BV(0, 3.4, 163.8), { dist: 0.7, y: true, timeout: 8 });
        yield* walk(BV(0, 4.6, 167.5), { dist: 0.7, y: true, timeout: 8 });
        yield* walk(at(7, 4.6), { dist: 0.8, y: true, timeout: 8 });
      }
    }
    yield* b.until(() => this.region === 'shore' && free(), 150, 'the dry land');
    yield* b.goTo(SV(0, shoreY(24), 24), { dist: 0.8, timeout: 20 });
    yield* b.until(() => this.phase === 'done', 10, 'the end');
  }

  override plate(): Shot | null {
    // the belly of the fish, every light awake
    this.enter('belly');
    this.glowAll = 1;
    for (let i = 0; i < 9; i++) this.bellyGlow.lit[i] = 1;
    this.g.player.teleport(BV(0, 0.52, 67.5), 0);
    return { pos: BV(-5.5, 3.4, 58), look: BV(1, 1.6, 74), fov: 58 };
  }

  override onQuality(q: Quality) {
    if (this.g.lights) this.g.lights.sun.castShadow = this.region === 'shore' && q.shadowSize > 0;
  }

  override dispose() {
    this.fish.dispose();
    this.deepWeeds.dispose();
    this.deepGlow.dispose();
    this.deepJellies.dispose();
    this.seaSkin.dispose();
    this.bellyWeeds.dispose();
    this.bellyGlow.dispose();
    this.jellies.dispose();
    this.pool.dispose();
    this.flecks.dispose();
    for (const v of this.veils) v.dispose();
    for (const pl of this.pearls) {
      (pl.core.material as THREE.Material).dispose();
      (pl.halo.material as THREE.Material).dispose();
    }
    this.pearls[0]?.core.geometry.dispose();
    this.g.touch.setJump('Jump');
    this.g.touch.setSlide(false);
    this.g.hud.meter('weed', null);
    this.g.hud.marker('light', null);
    this.g.hud.marker('way', null);
  }
}
