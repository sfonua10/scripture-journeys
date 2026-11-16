// Chapter 6: The Gourd (Jonah 4:1–11).
//
// What the account says: it displeased Jonah exceedingly, and he was very angry (1). He prayed, and said why he had
// fled, and asked to die (2–3). The LORD said, Doest thou well to be angry? (4). Jonah went out of the city, sat on
// the east side of it, made him a booth and sat under it in the shadow, till he might see what would become of the
// city (5). The LORD God prepared a gourd and made it come up over Jonah, a shadow over his head, and Jonah was
// exceeding glad of it (6). God prepared a worm when the morning rose the next day, and it smote the gourd that it
// withered (7). When the sun arose God prepared a vehement east wind; the sun beat upon Jonah's head, and he fainted
// and wished to die (8). God asked, Doest thou well to be angry for the gourd? and Jonah said, I do well to be angry,
// even unto death (9). Then the LORD's last question, of the gourd and of Nineveh (10–11). The book ends there: no
// answer is written.
//
// Who is here: Jonah, alone. Nineveh stands to the west, across the plain, and is never entered.
//
// The game's own: the account does not say where Jonah stood to pray, and the game puts it on the road outside the
// gate; the booth is made of pieces gathered about the hill (poles, branches, a cloth, stones), and the wind takes
// the cloth once before it is weighted; shade cools and the open sun heats, as a meter; the worm can be chased, and
// always gets away; in the east wind the booth is stripped piece by piece. The hours of the day at which these
// things fall are the game's, except those the account gives (the morning of the next day, the sun's rising, a
// night). Every word of the LORD is shown as the verse itself, whole. Nothing is added after 4:11: Jonah sits, and
// the player rises when they choose.
import * as THREE from 'three';
import type { Prop } from '../core/physics';
import type { Quality } from '../core/quality';
import { tween, type Routine } from '../core/script';
import { clamp01, damp, ease, lerp, noise1, smoothstep } from '../core/util';
import type { Bot } from '../game/bot';
import { Chapter } from '../game/chapter';
import { cite, part } from '../game/verses';
import { LevelBuilder } from '../gfx/build';
import { Motes, Rain } from '../gfx/particles';
import { Sky, makeLights } from '../gfx/sky';
import type { Shot } from '../player/camera';
import type { Interactable } from '../player/controller';
import {
  Booth,
  Gourd,
  LooseCloth,
  PaintedShade,
  SHADE_RAY,
  Tumbleweeds,
  V,
  WormFigure,
  blankLook,
  branchesMesh,
  buildCity,
  buildScenery,
  buildTerrain,
  clothRollMesh,
  dayLook,
  hillY,
  holeMesh,
  keyDir,
  nightOf,
  polesMesh,
  stoneMesh,
  sunDir,
  type FarCity,
  type Scenery,
} from './ch6_parts';

type Phase = 'prayer' | 'climb' | 'booth' | 'sit' | 'gourd' | 'worm' | 'wind' | 'question' | 'rest' | 'done';
const ORDER: Phase[] = ['prayer', 'climb', 'booth', 'sit', 'gourd', 'worm', 'wind', 'question', 'rest', 'done'];
type Piece = 'poles' | 'branches' | 'cloth' | 'stone';

/** Seconds of the booth's making before the sun is high (the challenge). */
const SUN_HIGH = 170;
/** How near the booth's place a piece can be set from. */
const REACH = 3.7;
/** Seconds of gnawing it takes. */
const GNAW = 6.5;
const WEST = -Math.PI / 2;

const NEED: Record<Piece, [string, string]> = {
  poles: ['Raise the posts of a booth', 'Poles lean in the old fold, south-east of the hilltop'],
  branches: ['Roof it with branches', 'Trees stand in the dry watercourse, to the north'],
  cloth: ['Spread a cloth over it', 'A tent fell long ago, south-west of the hilltop'],
  stone: ['Weigh the cloth down', 'Stones lie on the hilltop'],
};
const PLACE: Record<Piece, string> = {
  poles: 'Set up the posts',
  branches: 'Lay the branches on',
  cloth: 'Spread the cloth over',
  stone: 'Weigh the cloth down',
};

interface Worm {
  mode: 'away' | 'under' | 'rise' | 'gnaw' | 'flee' | 'dive' | 'gone';
  t: number;
  root: number;
  pos: THREE.Vector3;
  to: THREE.Vector3;
  yaw: number;
}

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _c = new THREE.Color();
const WHITE = new THREE.Color(0xfff7e6);
const HAZE = new THREE.Color(0xf6ecd2);

export class Plant extends Chapter {
  phase: Phase = 'prayer';
  private seek: Phase | null = null;
  private sky!: Sky;
  private scenery!: Scenery;
  private booth!: Booth;
  private gourd!: Gourd;
  private city!: FarCity;
  private painted!: PaintedShade;
  private motes!: Motes;
  private streaks!: Rain;
  private weeds!: Tumbleweeds;
  private loose!: LooseCloth;
  private wormFig!: WormFigure;
  private holes: THREE.Vector3[] = [];
  private holeGroup = new THREE.Group();
  private pieces: Prop[] = [];

  /** The hour, in days: 0.25 sunrise, 0.5 noon, 0.75 sunset. It only ever goes forward. */
  day = 0.258;
  private look = blankLook();
  private sunV = V(1, 0, 0);
  private keyV = V(1, 0.2, 0);
  /** 0..1: the white heat of the east wind's day. */
  private white = 0;

  /** 0..1: how hot he is. */
  heat = 0;
  /** 0..1: how much of the sun is kept off him now. */
  shade = 0;
  private heatOn = false;
  private beat = 0;
  private told = { sun: false, shade: false, first: 0 };

  private boothTime = 0;
  private boothFrom = 0.292;
  private challenge = false;
  private gusts = 0;
  private flying = false;
  private unweighted = 0;
  private needKey = '';
  private sat = false;
  private sitSpot: Interactable | null = null;

  private worm: Worm = { mode: 'away', t: 0, root: 0, pos: V(0, 0, 0), to: V(0, 0, 0), yaw: 0 };
  private gnawed = 0;
  private wormClock = 0;
  private crunch = 0;
  driven = 0;

  /** 0..1: the east wind. */
  private wind = 0;
  private windWant = 0;
  private windClock = 0;
  private loss = 0;
  private lost = 0;
  private holdSpot: Interactable | null = null;
  private gustIn = 2;
  private restAsk = false;
  private rise = 0;

  // ---- building ------------------------------------------------------------------------------------------------

  build() {
    const g = this.g;
    const q = g.quality;
    const seek = g.params.get('seek') as Phase | null;
    if (seek && ORDER.includes(seek)) this.seek = seek;

    const terrain = buildTerrain(g.physics);
    g.root.add(terrain);
    const b = new LevelBuilder(g.physics, 606);
    this.scenery = buildScenery(b, g.physics);
    g.root.add(b.finish('hill'));
    this.booth = new Booth(g.physics);
    this.gourd = new Gourd(g.physics);
    this.city = buildCity(q.crowd);
    this.loose = new LooseCloth();
    this.weeds = new Tumbleweeds(q.level === 'low' ? 5 : 9);
    this.wormFig = new WormFigure();
    this.wormFig.group.visible = false;
    g.root.add(this.booth.group, this.gourd.group, this.city.group, this.loose.mesh, this.weeds.group, this.wormFig.group, this.holeGroup);

    // where the worm goes to ground: a ring of holes about the booth
    for (const a of [0.55, 1.75, 3.05, 4.25, 5.45]) {
      const at = V(Math.cos(a) * 4.5, 0, Math.sin(a) * 4.3);
      at.y = hillY(at.x, at.z);
      this.holes.push(at);
      const h = holeMesh();
      h.position.copy(at);
      this.holeGroup.add(h);
    }
    this.holeGroup.visible = false;

    // shade painted on the ground, for the setting that has no shadow map
    this.painted = new PaintedShade([
      ...this.scenery.casters,
      { x: 0.2, z: 0, h: 2.1, r: 2.0, floating: true, amount: () => (this.booth.roofShade > 0 ? 0.6 + 0.4 * this.booth.roofShade : 0) },
      { x: -0.2, z: 0.1, h: 2.6, r: 3.0, floating: true, amount: () => this.gourd.shade },
    ]);
    this.painted.mesh.visible = !q.shadows;
    g.root.add(this.painted.mesh);

    // ---- sky and light: all of it follows `day`
    sunDir(this.day, this.sunV);
    this.sky = new Sky({ top: 0x5c98d8, horizon: 0xf2e6cc, bottom: 0xdccfb0, sunDir: this.sunV, sunColor: 0xfff4dc, sunSize: 0.04, sunGlow: 1, cloudCover: 0.1, cloudLit: 0xffffff, cloudDark: 0xd8dce4, cloudSpeed: 1.2, stars: 0 });
    g.root.add(this.sky.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: V(1, 0.5, 0.2), sunColor: 0xfff0d4, sunIntensity: 2.5, skyColor: 0xc4dcff, groundColor: 0xc0a67c, hemiIntensity: 1.05, shadowSize: q.shadowSize, shadowRange: 24 });
    g.engine.setView(1300, 60, 600, 0xefe4cc);
    this.motes = new Motes(Math.round(260 * q.particles), { box: V(34, 12, 34), color: 0xfff0d0, size: 0.07, opacity: 0.35, velocity: V(-0.5, 0.04, 0.15), wander: 0.6 });
    g.root.add(this.motes.object);
    this.streaks = new Rain(Math.round(900 * q.particles), V(44, 9, 44));
    (this.streaks.uniforms.uVel.value as THREE.Vector3).set(-30, -0.5, 3.5);
    this.streaks.uniforms.uLen.value = 2.6;
    (this.streaks.uniforms.uColor.value as THREE.Color).set(0xfff6e2);
    this.streaks.uniforms.uOpacity.value = 0;
    this.streaks.object.visible = false;
    g.root.add(this.streaks.object);
    const grade = g.engine.post.grade;
    grade.tint.setRGB(1.02, 1.0, 0.96);
    grade.lift.setRGB(0.01, 0.008, 0.004);
    grade.saturation = 1.06;
    grade.contrast = 1.06;
    grade.vignette = 0.3;
    grade.bloom = 0.5;
    grade.threshold = 0.82;
    grade.exposure = 1;

    // ---- Jonah
    const p = g.spawnPlayer(this.startAt(), Math.PI / 2);
    p.canSlide = false;
    p.killY = -40;
    g.cam.dist = 7.4;

    // ---- the pieces of the booth, lying where such things would lie
    const s = this.scenery;
    const piece = (what: Piece, prop: Prop) => {
      prop.data.piece = what;
      prop.body.setLinearDamping(0.9);
      prop.body.setAngularDamping(1.6);
      this.pieces.push(prop);
      return prop;
    };
    s.poles.forEach((at, i) => piece('poles', g.toys.custom('pole', polesMesh(), V(0.36, 0.2, 2.5), at.x, at.y, at.z, { density: 0.25, yaw: 1.2 + i * 0.5 })));
    s.branches.forEach((at, i) => piece('branches', g.toys.custom('bundle', branchesMesh(), V(0.62, 0.34, 1.6), at.x, at.y, at.z, { density: 0.2, yaw: 0.4 + i * 1.3 })));
    piece('cloth', g.toys.custom('bundle', clothRollMesh(), V(0.36, 0.36, 1.0), s.cloth.x, s.cloth.y, s.cloth.z, { density: 0.3, yaw: 0.6 }));
    s.stones.forEach((at, i) => this.stoneAt(at, i));
    p.carryPrompt = (prop) => {
      const what = this.canSet(prop);
      return what ? PLACE[what] : null;
    };
    p.onCarryAction = (prop) => {
      const what = this.canSet(prop);
      if (!what) return false;
      this.setPiece(prop, what);
      return true;
    };

    // ---- scroll pieces
    const rec = g.save.record(6);
    g.scrolls.add(0, s.scrolls[0], 'Psalm 121:5', g.root, rec.scrolls[0]);
    g.scrolls.add(1, s.scrolls[1], 'Psalm 121:6', g.root, rec.scrolls[1]);
    g.scrolls.add(2, s.scrolls[2], 'Psalm 145:8', g.root, rec.scrolls[2]);

    // ---- arriving part-way, by ?seek
    const at = (phase: Phase) => !!this.seek && ORDER.indexOf(this.seek) >= ORDER.indexOf(phase);
    if (at('sit')) {
      this.booth.set(2, 2, true, 2, true);
      this.clearPieces();
    }
    if (at('worm')) this.gourd.grown = 1;
    if (at('wind')) this.gourd.withered = 1;
    if (at('question')) this.booth.set(2, 0, false, 0, true);
    if (at('booth')) p.teleport(V(-4, 0.1, 1.2), Math.PI / 2);
    this.applyDay();
  }

  private startAt() {
    return V(-52, hillY(-52, 6.4) + 0.1, 6.4);
  }

  private stoneAt(at: THREE.Vector3Like, seed: number): Prop {
    const prop = this.g.toys.custom('stone', stoneMesh(60 + seed), V(0.46, 0.32, 0.42), at.x, at.y, at.z, { density: 1.1, yaw: seed * 1.3 });
    prop.data.piece = 'stone';
    prop.body.setLinearDamping(0.9);
    prop.body.setAngularDamping(1.6);
    this.pieces.push(prop);
    return prop;
  }

  private drop(prop: Prop) {
    const g = this.g;
    if (g.player.carried === prop) g.player.release(prop, false);
    g.physics.removeProp(prop);
    prop.mesh.removeFromParent();
    this.pieces = this.pieces.filter((x) => x !== prop);
  }

  private clearPieces() {
    for (const prop of [...this.pieces]) this.drop(prop);
  }

  // ---- the turning of the day ----------------------------------------------------------------------------------

  private applyDay() {
    const g = this.g;
    const L = dayLook(this.day, this.look);
    const sun = sunDir(this.day, this.sunV);
    const key = keyDir(this.day, this.keyV);
    const w = this.white;
    // the key light dims to nothing as it passes from the moon to the sun and back, so the change is not seen
    const up = sun.y >= 0.03 ? smoothstep(0.03, 0.14, sun.y) : smoothstep(-0.02, -0.14, sun.y);
    const night = nightOf(this.day);
    if (w > 0) {
      L.top.lerp(_c.set(0xc4d8ea), w * 0.7);
      L.horizon.lerp(WHITE, w * 0.85);
      L.bottom.lerp(HAZE, w * 0.7);
      L.fog.lerp(HAZE, w * 0.8);
      L.key.lerp(WHITE, w * 0.6);
      L.hemiGround.lerp(_c.set(0xeeddb8), w * 0.6);
    }
    const sunUp = sun.y > -0.07;
    this.sky.set({
      top: L.top,
      horizon: L.horizon,
      bottom: L.bottom,
      sunDir: sunUp ? sun : key,
      sunColor: sunUp ? _c.copy(L.key).lerp(WHITE, 0.5) : _c.set(0xdfe8ff),
      sunSize: sunUp ? 0.04 + w * 0.03 : 0.032,
      sunGlow: sunUp ? 1 + w * 1.6 : 0.45 * night,
      cloudCover: L.cover * (1 - w * 0.8),
      cloudLit: L.cloudLit,
      cloudDark: L.cloudDark,
      stars: L.stars,
    });
    if (g.lights) {
      g.lights.setSun(key, L.key, L.keyI * up * (1 + w * 0.3));
      g.lights.hemi.color.copy(L.hemiSky);
      g.lights.hemi.groundColor.copy(L.hemiGround);
      g.lights.hemi.intensity = L.hemiI * (1 + w * 0.25);
    }
    const fog = g.engine.scene.fog as THREE.Fog | null;
    if (fog) {
      const dd = g.quality.drawDistance;
      fog.color.copy(L.fog);
      fog.near = lerp(60, 24, w) * dd;
      fog.far = lerp(600, 420, w) * dd;
    }
    this.painted.update(key, up * (night > 0.5 ? 0.45 : 1));
    this.city.update(g.engine.time, night);
    // dust in the air shows by day and not by night
    this.motes.uniforms.uOpacity.value = 0.35 * (1 - night) + this.wind * 0.3;
  }

  // ---- shade and heat ------------------------------------------------------------------------------------------

  /** How strong the sun is now, 0..1: nothing by night, less when it is low. */
  private get sunForce() {
    const y = this.sunV.y;
    return smoothstep(0.02, 0.16, y) * lerp(0.5, 1, smoothstep(0.15, 0.75, y));
  }

  private updateHeat(dt: number) {
    const g = this.g;
    const p = g.player;
    const force = this.sunForce;
    // a ray from his head toward the sun: what it strikes is his shade
    let shade = 0;
    if (force > 0) {
      const hit = g.physics.raycast(_v.copy(p.pos).setY(p.pos.y + 1.5), this.sunV, 90, SHADE_RAY);
      if (hit) {
        const h = hit.collider.handle;
        if (h === this.booth.roofHandle) shade = Math.max(this.booth.roofShade, this.gourd.shade);
        else if (this.gourd.isCanopy(h)) shade = Math.max(this.gourd.shade, this.booth.roofShade * 0.5);
        else shade = 1;
      }
    } else shade = 1;
    this.shade = damp(this.shade, shade, 9, dt);
    const grade = g.engine.post.grade;
    if (!this.heatOn) {
      this.heat = Math.max(0, this.heat - dt * 0.2);
      g.hud.meter('heat', null);
    } else {
      const rise = (g.story ? 0.027 : 0.04) * force * (1 - this.shade);
      // in the east wind there is no cool anywhere, only less heat
      const scorch = this.phase === 'wind' ? 0.016 + 0.05 * clamp01((this.windClock - 30) / 10) : 0;
      const cool = this.phase === 'wind' ? 0 : 0.2 * Math.max(this.shade, 1 - smoothstep(0, 0.1, force)) - 0.02;
      this.heat = clamp01(this.heat + (rise + scorch - Math.max(0, cool)) * dt);
      const shaded = this.shade > 0.5 && force > 0.05;
      g.hud.meter('heat', { label: 'The heat of the sun', value: this.heat, text: this.phase === 'wind' ? '' : shaded ? 'in the shade' : force <= 0.05 ? '' : 'in the sun', danger: this.heat > 0.72, good: shaded && this.heat < 0.72 });
      // teaching, once each: the first heat, and the first relief
      if (this.phase === 'booth') {
        if (!this.told.sun && this.heat > 0.2) {
          this.told.sun = true;
          g.hud.toast('The sun is hot in the open', 3.4);
        }
        if (this.told.sun && !this.told.shade && shaded && this.heat > 0.12) {
          this.told.shade = true;
          g.hud.toast('Shade cools you', 3);
        }
        if (this.heat > 0.97 && g.engine.time - this.told.first > 14) {
          this.told.first = g.engine.time;
          g.hud.toast('Rest in the shade of a rock or a tree', 3.4);
        }
      }
    }
    // what the heat does to him: never more than slowing
    const faint = smoothstep(0.62, 1, this.heat);
    p.speedScale = this.phase === 'wind' ? lerp(1, 0.68, faint) : lerp(1, 0.58, faint);
    g.audio.bed('heat', this.heatOn ? this.heat * 0.55 : 0);
    if (this.heatOn && this.heat > 0.8) {
      this.beat -= dt;
      if (this.beat <= 0) {
        this.beat = lerp(1.2, 0.75, faint);
        g.audio.heartbeat();
      }
    }
    const hot = this.heatOn ? this.heat : 0;
    grade.exposure = 1 + hot * 0.16 + this.white * 0.2;
    grade.bloom = 0.5 + hot * 0.35 + this.white * 0.5;
    grade.saturation = 1.06 - this.white * 0.22 - faint * 0.1;
    grade.vignette = 0.3 + faint * 0.16;
    g.engine.post.wobble = hot > 0.45 ? (hot - 0.45) * 1.5 + this.white * 0.5 : this.white * 0.5;
  }

  // ---- the booth -----------------------------------------------------------------------------------------------

  /** The kind of piece the booth wants next, or null when it stands. */
  private get need(): Piece | null {
    const b = this.booth;
    if (b.posts < 2) return 'poles';
    if (b.thatch < 2) return 'branches';
    if (!b.cloth) return 'cloth';
    if (b.stones < 2) return 'stone';
    return null;
  }

  /** What the carried thing would be set as, if it can be set now from here. */
  private canSet(prop: Prop): Piece | null {
    if (this.phase !== 'booth' || this.flying) return null;
    const p = this.g.player;
    if (Math.hypot(p.pos.x, p.pos.z) > REACH) return null;
    const what = prop.data.piece as Piece | undefined;
    return what && what === this.need ? what : null;
  }

  private setPiece(prop: Prop, what: Piece) {
    const g = this.g;
    const b = this.booth;
    this.drop(prop);
    if (what === 'poles') b.set(b.posts + 1, b.thatch, b.cloth, b.stones);
    else if (what === 'branches') b.set(b.posts, b.thatch + 1, b.cloth, b.stones);
    else if (what === 'cloth') b.set(b.posts, b.thatch, true, b.stones);
    else b.set(b.posts, b.thatch, b.cloth, b.stones + 1);
    g.audio.thud(what === 'stone' ? 0.9 : 0.6, what === 'stone' ? 'stone' : 'wood');
    if (what === 'cloth') g.audio.whoosh(0.7);
    g.audio.tick(what === 'poles' ? 0.7 : what === 'branches' ? 0.9 : 1.1);
    g.fx.emit(V(0, what === 'poles' ? 0.2 : 2.2, 0), { count: 14, color: 0xe6d8b4, color2: 0xcdbb92, speed: 1.6, spread: 1, size: 0.16, life: 0.7, gravity: -1, radius: 1.4, opacity: 0.6 });
    this.unweighted = 0;
    // the twist: the first time the cloth is spread, the wind has it
    if (what === 'cloth' && this.gusts === 0) g.run(() => this.takeCloth(V(-15, 0, -3.5), 1.5));
    if (b.done) g.audio.good();
  }

  /** A gust lifts the cloth off the booth and carries it down the west slope. */
  private *takeCloth(to: THREE.Vector3, after: number): Routine {
    const g = this.g;
    const b = this.booth;
    this.gusts++;
    this.flying = true;
    b.flap = 1;
    yield after;
    g.audio.gust(1);
    g.cam.shake(0.18);
    const had = b.stones;
    b.set(b.posts, b.thatch, false, 0);
    b.flap = 0.15;
    // any stone already on it is thrown down beside the booth
    for (let i = 0; i < had; i++) this.stoneAt(V(-2.6 - i * 0.7, 0.4, -1.2 + i * 0.9), 20 + this.gusts * 3 + i);
    g.hud.toast('The wind takes the cloth', 3);
    to.y = hillY(to.x, to.z);
    const from = V(0, 2.5, 0);
    const m = this.loose.mesh;
    m.visible = true;
    const t0 = g.engine.time;
    yield* tween(2.3, (t) => {
      m.position.lerpVectors(from, to, t);
      m.position.y += Math.sin(t * Math.PI) * 5.5 + (1 - t) * 0.4;
      m.rotation.set(Math.sin(t * 7) * 0.7, t * 2.6, -0.5 + Math.sin(t * 5) * 0.8);
      this.loose.flutter(g.engine.time - t0, 1);
      g.player.push.x = -2.2 * Math.sin(t * Math.PI);
    });
    g.player.push.x = 0;
    m.visible = false;
    const prop = g.toys.custom('bundle', clothRollMesh(), V(0.36, 0.36, 1.0), to.x, to.y + 0.5, to.z, { density: 0.3, yaw: 1.1 });
    prop.data.piece = 'cloth';
    prop.body.setLinearDamping(1.4);
    prop.body.setAngularDamping(2.5);
    this.pieces.push(prop);
    g.fx.emit(to, { count: 10, color: 0xe6d8b4, speed: 1.4, size: 0.18, life: 0.7, gravity: -1, radius: 0.5, opacity: 0.6 });
    this.flying = false;
  }

  private updateBooth(dt: number) {
    const g = this.g;
    const p = g.player;
    const b = this.booth;
    this.boothTime += dt;
    // the sun climbs while he works
    const t = this.boothTime;
    this.day = Math.max(this.day, lerp(this.boothFrom, 0.42, clamp01(t / SUN_HIGH)) + 0.05 * clamp01((t - SUN_HIGH) / 240));
    g.hud.meter('sun', { label: 'The sun climbs', value: clamp01(t / SUN_HIGH), text: t >= SUN_HIGH ? 'the sun is high' : '', danger: t >= SUN_HIGH });
    // a cloth with nothing on it does not stay (Normal only: in Story the one gust is the lesson)
    if (b.cloth && b.stones < 2 && !this.flying && this.gusts > 0) {
      b.flap = lerp(0.3, 1, clamp01(this.unweighted / 20));
      if (!g.story && this.gusts < 3) {
        this.unweighted += dt;
        if (this.unweighted > 20) {
          this.unweighted = 0;
          g.run(() => this.takeCloth(this.gusts === 1 ? V(-11.5, 0, 6.5) : V(-13, 0, -1), 0.2));
        }
      }
    } else if (b.done) b.flap = 0.2;

    // what is wanted, and where it lies
    const need = this.need;
    const carrying = p.carried && p.carried.data.piece === need;
    const key = `${need}|${carrying ? 1 : 0}|${this.gusts}|${this.flying ? 1 : 0}`;
    if (key !== this.needKey) {
      this.needKey = key;
      if (need) {
        if (need === 'cloth' && this.gusts > 0) g.hud.objective('Fetch the cloth back', 'The wind carried it down the west slope');
        else g.hud.objective(NEED[need][0], carrying ? 'Carry it to the hilltop' : NEED[need][1]);
      }
    }
    let n = 0;
    if (need && !carrying && !this.flying) {
      for (const prop of this.pieces) {
        if (prop.data.piece !== need || prop.held || n >= 4) continue;
        g.hud.marker(`piece${n++}`, _w.copy(prop.pos).setY(prop.pos.y + 0.7));
      }
    }
    for (; n < 4; n++) g.hud.marker(`piece${n}`, null);
    g.hud.marker('site', need && carrying ? _w.set(0, 1.6, 0) : null, { label: 'The booth' });
    // carrying the wrong thing to the booth: say what comes first
    if (p.carried && !carrying && need && Math.hypot(p.pos.x, p.pos.z) < REACH && g.engine.time - this.told.first > 6) {
      const what = p.carried.data.piece as Piece | undefined;
      if (what && what !== need) {
        this.told.first = g.engine.time;
        g.hud.toast(need === 'poles' ? 'The posts must stand first' : need === 'branches' ? 'The branches go on first' : 'The cloth goes on first', 2.6);
      }
    }
  }

  // ---- the story -----------------------------------------------------------------------------------------------

  start() {
    const g = this.g;
    g.touch.setSlide(false);
    g.audio.play('plant');
    g.audio.bed('wind', 0.16);
    g.run(() => this.story());
  }

  private from(phase: Phase): boolean {
    return !this.seek || ORDER.indexOf(phase) >= ORDER.indexOf(this.seek);
  }

  private *story(): Routine {
    if (this.from('prayer')) yield* this.pPrayer();
    if (this.from('climb')) yield* this.pClimb();
    if (this.from('booth')) yield* this.pBooth();
    if (this.from('sit')) yield* this.pSit();
    if (this.from('gourd')) yield* this.pGourd();
    if (this.from('worm')) yield* this.pWorm();
    if (this.from('wind')) yield* this.pWind();
    if (this.from('question')) yield* this.pQuestion();
    yield* this.pRest();
  }

  /** 4:1–4: his anger, his prayer, and the question. On the road, with the city standing behind him. */
  private *pPrayer(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'prayer';
    this.day = 0.262;
    g.hud.cinema(true);
    const road = V(-150, -13.78, 3.1);
    p.teleport(road, Math.PI / 2);
    p.lock('idle');
    this.city.people.visible = false;
    g.cam.setShot({ pos: V(-141.2, -11.5, 8.6), look: V(-232, -1, -8), fov: 50 }, 0);
    yield 1.2;
    g.cam.setShot({ pos: V(-144.2, -12.0, 6.6), look: V(-232, -3, -6), fov: 45 }, 24);
    yield g.hud.verse(cite('4:1'), { block: true });
    yield 0.3;
    p.teleport(road, WEST);
    p.setLockedPose('pray');
    yield 0.5;
    yield g.hud.verse(cite('4:2'), { block: true });
    yield g.hud.verse(cite('4:3'), { block: true });
    yield 0.9;
    yield g.hud.verse(cite('4:4'), { block: true });
    yield 1.1;
    yield g.hud.fade(1, 1.1);
    this.city.people.visible = true;
  }

  /** 4:5, its first part: out of the city, to the east side of it. */
  private *pClimb(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'climb';
    this.day = 0.272;
    p.teleport(this.startAt(), Math.PI / 2);
    p.unlock();
    g.cam.setShot(null, 0);
    g.cam.snap(p, WEST);
    g.cam.pitch = 0.22;
    g.hud.cinema(false);
    yield g.hud.fade(0, 1.2);
    g.hud.verse(part('4:5', 'So Jonah went out', 'east side of the city'), { seconds: 6.5 });
    g.hud.objective('Go up the hill', 'East of the city, where all of it can be seen');
    g.hud.marker('top', V(0, 1.6, 0), { label: 'The hilltop' });
    yield () => Math.hypot(p.pos.x, p.pos.z) < 9;
    g.hud.marker('top', null);
  }

  /** 4:5, "and there made him a booth": the gathering and the raising. */
  private *pBooth(): Routine {
    const g = this.g;
    this.phase = 'booth';
    this.heatOn = true;
    this.boothTime = 0;
    this.day = Math.max(this.day, 0.292);
    this.boothFrom = this.day;
    this.needKey = '';
    yield () => this.booth.done;
    this.challenge = !this.seek && this.boothTime <= SUN_HIGH;
    for (let n = 0; n < 4; n++) g.hud.marker(`piece${n}`, null);
    g.hud.marker('site', null);
    g.hud.meter('sun', null);
    yield 0.6;
  }

  /** 4:5, its end: he sat under it in the shadow. */
  private *pSit(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'sit';
    this.heatOn = true;
    this.day = Math.max(this.day, 0.3);
    g.hud.objective('Sit in the shadow of the booth');
    g.hud.marker('site', V(0, 1.4, 0));
    this.sat = false;
    this.sitSpot = { pos: V(0.1, 0.8, 0), radius: 2.1, prompt: 'Sit in the shadow', onUse: () => (this.sat = true) };
    p.interactables.push(this.sitSpot);
    yield () => this.sat;
    p.interactables = p.interactables.filter((it) => it !== this.sitSpot);
    this.sitSpot = null;
    g.hud.marker('site', null);
    g.hud.objective(null);
    if (p.carried) p.release(p.carried, false);
    g.hud.cinema(true);
    p.teleport(V(0.15, 0.02, 0.1), WEST);
    p.lock('sit');
    g.cam.setShot({ pos: V(3.2, 1.5, 5.4), look: V(-9, 0.5, -1.6), fov: 48 }, 1.6);
    yield 1.2;
    yield g.hud.verse(part('4:5', 'and there made him a booth'));
    yield 0.4;
  }

  /** 4:6: the gourd comes up over him in a night, and he is exceeding glad of it. */
  private *pGourd(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'gourd';
    this.heatOn = false;
    g.hud.cinema(true);
    g.hud.objective(null);
    p.teleport(V(0.15, 0.02, 0.1), WEST);
    p.lock('sit');
    this.day = Math.max(this.day, 0.3);
    // the day goes over; the sun sets behind the city
    g.cam.setShot({ pos: V(8.2, 3.0, 7.6), look: V(-7, 0.8, -2), fov: 46 }, this.seek === 'gourd' ? 0 : 2.5);
    const d0 = this.day;
    yield* tween(7, (t) => (this.day = lerp(d0, 0.762, t)), ease.inOutQuad);
    g.cam.setShot({ pos: V(6.4, 2.2, 5.2), look: V(-9, 1.0, -1.8), fov: 44 }, 5);
    yield* tween(3.6, (t) => (this.day = lerp(0.762, 0.9, t)), ease.inOutQuad);
    // by night, it comes up
    g.cam.setShot({ pos: V(4.2, 0.55, -4.1), look: V(1.6, 1.0, -1.4), fov: 40 }, 2.4);
    yield 1.6;
    g.audio.swell(147);
    const read = g.hud.verse(part('4:6', 'And the LORD God prepared a gourd', 'deliver him from his grief'));
    let rung = 0;
    g.cam.setShot({ pos: V(6.8, 2.6, -5.6), look: V(0, 1.7, 0), fov: 42 }, 9);
    yield* tween(12.5, (t) => {
      this.gourd.grown = ease.inOutQuad(clamp01(t / 0.9));
      this.day = lerp(0.9, 1.238, t * t);
      if (t > rung) {
        rung += 0.085;
        g.audio.chime();
      }
    });
    this.gourd.grown = 1;
    yield read;
    // morning: he sees it
    g.cam.setShot({ pos: V(-5.8, 1.45, -2.9), look: V(0.3, 1.55, 0.2), fov: 44 }, 2.2);
    yield* tween(3.2, (t) => (this.day = lerp(1.238, 1.285, t)));
    p.setLockedPose('cheer');
    g.audio.good();
    yield g.hud.verse(part('4:6', 'So Jonah was exceeding glad'));
    p.setLockedPose('sit');
    // a glad day under it, and the night after
    g.cam.setShot({ pos: V(-7.4, 3.6, 6.8), look: V(0, 1.4, 0), fov: 44 }, 6);
    yield* tween(7.5, (t) => (this.day = lerp(1.285, 2.2, t)), ease.inOutQuad);
  }

  /** 4:7: the worm, when the morning rose the next day. It can be driven off; it cannot be kept off. */
  private *pWorm(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'worm';
    this.heatOn = false;
    this.gourd.grown = 1;
    this.holeGroup.visible = true;
    if (this.day < 2.2) this.day = 2.2;
    g.hud.cinema(true);
    p.teleport(V(0.15, 0.02, 0.1), WEST);
    p.lock('sit');
    const d0 = this.day;
    g.cam.setShot({ pos: V(4.6, 1.1, -4.4), look: V(1.7, 0.4, -1.5), fov: 40 }, this.seek === 'worm' ? 0 : 3);
    yield* tween(3, (t) => (this.day = lerp(d0, 2.262, t)));
    // it comes up at the root
    this.worm = { mode: 'rise', t: 0, root: 0, pos: this.gourd.roots[0].clone().add(V(0.35, 0, -0.3)), to: V(0, 0, 0), yaw: -2.4 };
    this.gnawed = 0;
    this.wormClock = 0;
    g.audio.tick(1.7);
    yield g.hud.verse(part('4:7', 'But God prepared a worm', 'next day'));
    p.teleport(V(0.15, 0.05, 0.1), Math.PI / 2);
    p.unlock();
    g.cam.setShot(null, 1.2);
    g.hud.cinema(false);
    this.heatOn = true;
    g.hud.objective('Drive the worm from the gourd', 'It is at the root');
    yield () => this.worm.mode === 'gone';
    g.hud.marker('worm', null);
    g.hud.objective(null);
    // and it withers
    const w0 = this.gourd.withered;
    const read = g.hud.verse(part('4:7', 'and it smote the gourd'));
    g.audio.swell(98);
    yield* tween(5, (t) => {
      this.gourd.withered = lerp(w0, 1, t);
      this.day = Math.max(this.day, lerp(this.day, 2.29, t * 0.05));
      if (Math.random() < 0.3) g.fx.emit(V(-0.2 + (Math.random() - 0.5) * 4.6, 2.5, (Math.random() - 0.5) * 4), { count: 1, color: 0x8a6a3a, color2: 0x9a7a44, speed: 0.4, size: 0.2, life: 1.6, gravity: 2.2, drag: 1.5, opacity: 0.9 });
    });
    this.gourd.withered = 1;
    yield read;
    this.holeGroup.visible = false;
  }

  /** 4:8: the vehement east wind, and the sun on his head, until he faints. */
  private *pWind(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'wind';
    this.heatOn = true;
    this.gourd.grown = 1;
    this.gourd.withered = 1;
    if (this.seek === 'wind') {
      p.teleport(V(0.15, 0.05, 0.1), Math.PI / 2);
      this.day = 2.285;
    }
    this.day = Math.max(this.day, 2.275);
    this.windClock = 0;
    this.loss = 0;
    this.lost = 0;
    this.windWant = 1;
    g.audio.gust(1.2);
    g.hud.verse(part('4:8', 'And it came to pass', 'vehement east wind'), { seconds: 7 });
    g.hud.objective('Keep in what shade is left', 'The booth will not stand long in this wind');
    this.holdSpot = {
      pos: V(-1.25, 1.0, 0),
      radius: 1.9,
      prompt: 'Hold the booth together',
      hold: 2.2,
      pose: 'work',
      enabled: () => this.phase === 'wind' && this.booth.roofShade > 0 && !p.locked,
      onUse: () => {
        this.loss = Math.max(0, this.loss - 4.5);
        g.audio.rope();
      },
    };
    p.interactables.push(this.holdSpot);
    yield () => this.heat >= 1 && this.windClock > 20;
    p.interactables = p.interactables.filter((it) => it !== this.holdSpot);
    this.holdSpot = null;
    // he faints
    g.hud.objective(null);
    g.hud.cinema(true);
    if (p.carried) p.release(p.carried, false);
    p.push.set(0, 0, 0);
    const at = p.pos.clone();
    at.y = hillY(at.x, at.z) + 0.02;
    p.teleport(at, p.yaw);
    p.lock('stagger');
    g.cam.setShot({ pos: at.clone().add(V(-3.4, 1.5, 2.6)), look: at.clone().add(V(0, 0.7, 0)), fov: 46 }, 1.4);
    yield 1.1;
    p.setLockedPose('faint');
    g.audio.thud(0.6, 'sand');
    g.cam.setShot({ pos: at.clone().add(V(-2.6, 0.8, 2.0)), look: at.clone().add(V(0, 0.3, 0)), fov: 42 }, 6);
    yield 0.8;
    yield g.hud.verse(part('4:8', 'and the sun beat upon the head of Jonah'), { block: true });
    yield g.hud.fade(1, 2.4, '#fff6e4');
    this.windWant = 0.2;
    yield 0.6;
  }

  /** 4:9–11: the question of the gourd, his answer, and the last question, which the book leaves open. */
  private *pQuestion(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'question';
    this.heatOn = false;
    this.heat = 0.3;
    this.windWant = 0.18;
    this.wind = Math.min(this.wind, 0.25);
    this.white = 0.3;
    this.day = Math.max(this.day, 2.655);
    this.gourd.grown = 1;
    this.gourd.withered = 1;
    this.booth.set(2, 0, false, 0, true);
    this.clearPieces();
    g.hud.cinema(true);
    g.hud.objective(null);
    p.teleport(V(0.15, 0.02, 0.1), WEST);
    p.lock('sit');
    g.cam.setShot({ pos: V(4.4, 1.5, 3.8), look: V(-1.4, 0.9, -0.5), fov: 46 }, 0);
    g.audio.play('calm');
    yield g.hud.fade(0, 2.6, '#fff6e4');
    g.run(() => tween(8, (t) => (this.white = lerp(0.3, 0, t))));
    yield 0.8;
    yield g.hud.verse(cite('4:9'), { block: true });
    yield 0.8;
    // the view turns from the dead gourd toward the city
    g.cam.setShot({ pos: V(5.4, 2.5, 1.5), look: V(-60, -7, -1), fov: 42 }, 7);
    yield 1.4;
    yield g.hud.verse(cite('4:10'), { block: true });
    yield 0.5;
    g.cam.setShot({ pos: V(5.4, 2.7, 1.2), look: V(-170, -12.5, 2), fov: 15 }, 16);
    yield 2.2;
    yield g.hud.verse(cite('4:11'), { block: true });
    yield 2.2;
  }

  /** After the last word: he sits, the city stands, evening comes on. The player rises when they will. */
  private *pRest(): Routine {
    const g = this.g;
    const p = g.player;
    this.phase = 'rest';
    this.heatOn = false;
    this.windWant = 0.15;
    this.gourd.grown = 1;
    this.gourd.withered = 1;
    this.booth.set(2, 0, false, 0, true);
    this.day = Math.max(this.day, 2.66);
    g.hud.objective(null);
    p.teleport(V(0.15, 0.02, 0.1), WEST);
    p.lock('sit');
    // the camera is the player's again, behind him, looking where he looks
    g.cam.yaw = Math.PI / 2 + 0.16;
    g.cam.pitch = 0.2;
    g.cam.dist = 5.6;
    g.cam.hint = null;
    g.cam.setShot(null, this.seek === 'rest' ? 0 : 4.5);
    g.hud.cinema(false);
    if (this.seek === 'rest') g.audio.play('calm');
    yield 3.2;
    this.restAsk = true;
    this.rise = 0;
    yield () => this.rise >= 1;
    this.restAsk = false;
    g.promptOverride = null;
    p.setLockedPose('idle');
    yield 1.3;
    yield g.hud.fade(1, 1.8);
    this.phase = 'done';
    g.complete(this.challenge);
  }

  // ---- the worm ------------------------------------------------------------------------------------------------

  private updateWorm(dt: number) {
    const g = this.g;
    const p = g.player;
    const w = this.worm;
    const fig = this.wormFig;
    if (w.mode === 'away' || w.mode === 'gone') {
      fig.group.visible = false;
      return;
    }
    const free = this.phase === 'worm' && !p.locked;
    if (free) this.wormClock += dt;
    w.t += dt;
    const near = Math.hypot(p.pos.x - w.pos.x, p.pos.z - w.pos.z);
    const finished = this.gnawed >= GNAW || this.wormClock > 44;
    fig.gnawing = false;
    fig.speed = 0;
    switch (w.mode) {
      case 'under': {
        fig.out = 0;
        if (w.t > (finished ? 0.2 : 1.15)) {
          if (finished) {
            w.mode = 'gone';
            break;
          }
          // up at whichever root he is farthest from
          let best = 0;
          let far = -1;
          this.gourd.roots.forEach((r, i) => {
            const d = Math.hypot(p.pos.x - r.x, p.pos.z - r.z) + (i === w.root ? -1.5 : 0);
            if (d > far) {
              far = d;
              best = i;
            }
          });
          w.root = best;
          const r = this.gourd.roots[best];
          const out = Math.atan2(r.x, r.z);
          w.pos.set(r.x + Math.sin(out) * 0.42, 0, r.z + Math.cos(out) * 0.42);
          w.yaw = out + Math.PI;
          w.mode = 'rise';
          w.t = 0;
          g.audio.tick(1.7);
          g.fx.emit(w.pos, { count: 6, color: 0xe6d8b4, speed: 1.2, size: 0.12, life: 0.5, gravity: 3, opacity: 0.7 });
        }
        break;
      }
      case 'rise': {
        fig.out = clamp01(w.t / 0.3);
        if (w.t > 0.3) {
          w.mode = 'gnaw';
          w.t = 0;
        }
        break;
      }
      case 'gnaw': {
        fig.out = 1;
        fig.gnawing = true;
        if (free) {
          this.gnawed += dt;
          this.gourd.withered = Math.max(this.gourd.withered, 0.5 * clamp01(this.gnawed / GNAW));
          this.crunch -= dt;
          if (this.crunch <= 0) {
            this.crunch = 0.32;
            g.audio.tick(0.55);
            g.fx.emit(_v.copy(w.pos).setY(0.25), { count: 2, color: 0x5fae3c, color2: 0x88c95a, speed: 1.6, size: 0.08, life: 0.5, gravity: 5, opacity: 0.9 });
          }
          if (finished) this.flee(true);
          else if (near < 2.0) this.flee(false);
        }
        break;
      }
      case 'flee': {
        fig.out = 1;
        fig.speed = 1;
        const dx = w.to.x - w.pos.x;
        const dz = w.to.z - w.pos.z;
        const d = Math.hypot(dx, dz);
        // too close to catch: it is into the ground where it is
        if (d < 0.25 || (near < 0.75 && w.t > 0.15)) {
          w.mode = 'dive';
          w.t = 0;
          g.audio.tick(2.1);
          g.fx.emit(w.pos, { count: 8, color: 0xe6d8b4, speed: 1.5, size: 0.13, life: 0.5, gravity: 3, opacity: 0.7 });
          break;
        }
        const step = Math.min(d, 9.6 * dt);
        const weave = Math.sin(w.t * 22) * 0.35;
        w.pos.x += (dx / d) * step + (dz / d) * weave * step;
        w.pos.z += (dz / d) * step - (dx / d) * weave * step;
        w.yaw = Math.atan2(dx, dz) + weave * 0.6;
        break;
      }
      case 'dive': {
        fig.out = 1 - clamp01(w.t / 0.18);
        if (w.t > 0.18) {
          w.mode = 'under';
          w.t = 0;
        }
        break;
      }
    }
    w.pos.y = hillY(w.pos.x, w.pos.z);
    fig.group.position.copy(w.pos);
    fig.group.rotation.y = w.yaw;
    fig.update(dt);
    g.hud.marker('worm', free && w.mode === 'gnaw' ? _w.copy(w.pos).setY(w.pos.y + 0.6) : null, { urgent: true });
  }

  /** Off to a hole, away from Jonah. */
  private flee(done: boolean) {
    const g = this.g;
    const p = g.player;
    const w = this.worm;
    let best = this.holes[0];
    let score = -Infinity;
    for (const h of this.holes) {
      const d = Math.hypot(h.x - w.pos.x, h.z - w.pos.z);
      const fromHim = Math.hypot(h.x - p.pos.x, h.z - p.pos.z);
      const s = fromHim * 1.2 - d - (d < 1.2 ? 4 : 0);
      if (s > score) {
        score = s;
        best = h;
      }
    }
    w.to.copy(best);
    w.mode = 'flee';
    w.t = 0;
    if (!done) this.driven++;
    g.audio.tick(2.4);
    g.audio.whoosh(0.35);
  }

  // ---- the east wind -------------------------------------------------------------------------------------------

  private updateWind(dt: number) {
    const g = this.g;
    const p = g.player;
    const time = g.engine.time;
    this.wind = damp(this.wind, this.windWant, 0.9, dt);
    const wind = this.wind;
    const gust = 0.72 + 0.28 * noise1(time * 0.9) + 0.2 * Math.sin(time * 2.3);
    this.streaks.object.visible = wind > 0.08;
    this.streaks.uniforms.uOpacity.value = clamp01(wind - 0.08) * 0.42;
    if (this.streaks.object.visible) this.streaks.update(time, g.engine.camera);
    this.weeds.update(dt, time, this.phase === 'wind' ? wind : wind > 0.3 ? wind : 0);
    (this.motes.uniforms.uVel.value as THREE.Vector3).set(lerp(-0.5, -11, wind), 0.04, lerp(0.15, 1.2, wind));
    g.audio.bed('wind', 0.16 + wind * 0.75);
    if (this.phase !== 'wind') {
      if (!this.flying) p.push.set(0, 0, 0);
      if (this.phase === 'question' || this.phase === 'rest') this.booth.flap = 0.2;
      return;
    }
    this.windClock += dt;
    this.white = damp(this.white, clamp01(this.windClock / 16) * 0.75 + this.heat * 0.25, 1.2, dt);
    this.day = Math.max(this.day, 2.275 + 0.13 * clamp01(this.windClock / 45));
    this.booth.flap = 1;
    // it leans on him, unless his hands are on the booth
    if (p.locked || p.braced) p.push.set(0, 0, 0);
    else {
      // a man standing braces his feet and is only edged along; one walking is taken by it
      const k = (0.3 + 2.1 * clamp01(p.speed2D / 4)) * wind * gust;
      p.push.set(-k, 0, 0.12 * k);
    }
    this.gustIn -= dt;
    if (this.gustIn <= 0) {
      this.gustIn = 2.4 + Math.random() * 2.6;
      g.audio.gust(0.7 + Math.random() * 0.5);
    }
    if (p.locked) return;
    // the booth comes apart, a piece at a time; holding it only puts the next loss off
    this.loss += dt * (p.braced ? 0.35 : 1);
    const b = this.booth;
    const due = [5, 12, 19, 26][this.lost];
    if (due !== undefined && this.loss >= due) {
      this.lost++;
      g.audio.gust(1.3);
      g.cam.shake(0.22);
      const chaff = (color: number, color2: number, count: number, y: number) => g.fx.emit(V(0, y, 0), { count, color, color2, speed: 9, speedVar: 0.5, dir: V(-1, 0.25, 0.1), spread: 0.35, size: 0.2, life: 1.3, gravity: 2.5, drag: 0.3, radius: 1.4, opacity: 0.95 });
      if (this.lost === 1) {
        // the stones roll off
        b.set(b.posts, b.thatch, b.cloth, 0);
        for (let i = 0; i < 2; i++) {
          const st = this.stoneAt(V(-1.6, 2.5, -1 + i * 2), 30 + i);
          st.body.setLinvel({ x: -3.5, y: 1, z: i ? 1 : -1 }, true);
        }
      } else if (this.lost === 2) {
        b.set(b.posts, b.thatch, false, 0);
        g.run(() => this.loseCloth());
      } else if (this.lost === 3) {
        b.set(b.posts, 1, false, 0);
        chaff(0x8f9a5e, 0xa19f66, 26, 2.3);
      } else {
        b.set(b.posts, 0, false, 0);
        chaff(0x7e8a52, 0x9a8a58, 30, 2.2);
      }
    }
  }

  /** The cloth goes for good, away to the west. */
  private *loseCloth(): Routine {
    const g = this.g;
    const m = this.loose.mesh;
    m.visible = true;
    const t0 = g.engine.time;
    yield* tween(2.6, (t) => {
      m.position.set(lerp(0, -70, t * t * 0.6 + t * 0.4), 2.5 + Math.sin(t * 2.2) * 7, lerp(0, 9, t));
      m.rotation.set(Math.sin(t * 9) * 0.9, t * 4, -0.6 + Math.sin(t * 6) * 0.9);
      this.loose.flutter(g.engine.time - t0, 1.2);
    });
    m.visible = false;
  }

  // ---- every frame ---------------------------------------------------------------------------------------------

  override update(dt: number) {
    const g = this.g;
    const p = g.player;
    const time = g.engine.time;
    if (this.phase === 'booth') this.updateBooth(dt);
    if (this.phase === 'climb') this.day = Math.min(0.292, this.day + dt * 0.0009);
    if (this.phase === 'sit') this.day += dt * 0.00012;
    this.updateWorm(dt);
    this.updateWind(dt);
    this.applyDay();
    this.updateHeat(dt);
    this.sky.update(time);
    this.booth.update(dt);
    this.gourd.update(dt);
    this.motes.update(time, g.engine.camera, g.engine.canvas.clientHeight);

    // sitting at the end: evening comes on slowly, and stays
    if (this.phase === 'rest') {
      this.day = Math.min(2.805, this.day + dt * 0.0021);
      if (this.restAsk) {
        const held = g.input.action.down || (!!g.bot && g.bot.input.action);
        this.rise = held ? Math.min(1, this.rise + dt / 0.9) : Math.max(0, this.rise - dt * 2);
        g.promptOverride = { kind: 'use', prompt: 'Hold to rise', progress: this.rise, pos: p.pos };
      }
    }
  }

  override onQuality(q: Quality) {
    this.painted.mesh.visible = !q.shadows;
  }

  override plate(): Shot | null {
    return { pos: V(-7.6, 3.2, 6.6), look: V(0, 1.5, 0), fov: 46 };
  }

  // ---- the automated player ------------------------------------------------------------------------------------

  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const self = this;
    const s = this.scenery;
    const at = (x: number, z: number) => V(x, hillY(x, z), z);
    const rocks = s.casters.filter((c) => !c.floating && !c.open).map((c) => ({ x: c.x, z: c.z, r: c.r + 1.5 }));
    /** The way from one place to another, bent round whatever rock stands between. */
    const way = (ax: number, az: number, bx: number, bz: number, depth = 0): [number, number][] => {
      if (depth > 3) return [[bx, bz]];
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      if (len2 < 0.01) return [[bx, bz]];
      let hit: { x: number; z: number; r: number } | null = null;
      let first = 2;
      for (const c of rocks) {
        const t = ((c.x - ax) * dx + (c.z - az) * dz) / len2;
        if (t <= 0.02 || t >= 0.98) continue;
        const d = Math.hypot(ax + dx * t - c.x, az + dz * t - c.z);
        if (d < c.r && t < first) {
          first = t;
          hit = c;
        }
      }
      if (!hit) return [[bx, bz]];
      // step out to the side of it the line already favours
      let ox = ax + dx * first - hit.x;
      let oz = az + dz * first - hit.z;
      let o = Math.hypot(ox, oz);
      if (o < 0.05) {
        ox = -dz;
        oz = dx;
        o = Math.hypot(ox, oz);
      }
      const mx = hit.x + (ox / o) * (hit.r + 0.7);
      const mz = hit.z + (oz / o) * (hit.r + 0.7);
      return way(ax, az, mx, mz, depth + 1).concat(way(mx, mz, bx, bz, depth + 1));
    };
    function* go(points: [number, number][], dist = 1.1): Routine {
      for (const [x, z] of points) {
        for (const [wx, wz] of way(p.pos.x, p.pos.z, x, z)) yield* b.goTo(at(wx, wz), { dist: wx === x && wz === z ? dist : 0.9, timeout: 24 });
      }
    }
    /** Into the booth's shade, or the shadow at the foot of the nearest tall rock. */
    function* toShade(): Routine {
      const sun = self.sunV;
      const flat = Math.hypot(sun.x, sun.z) || 1;
      let spot: THREE.Vector3 | null = null;
      let rock: { x: number; z: number } | null = null;
      if (self.booth.roofShade >= 0.8 && Math.hypot(p.pos.x, p.pos.z) < 14) spot = V(0.3, 0, 0);
      else {
        let best = Infinity;
        for (const c of s.casters) {
          if (c.floating || c.open || c.h < 2.7) continue;
          const d = Math.hypot(c.x - p.pos.x, c.z - p.pos.z);
          if (d < best) {
            best = d;
            rock = c;
            spot = at(c.x - (sun.x / flat) * (c.r + 0.75), c.z - (sun.z / flat) * (c.r + 0.75));
          }
        }
      }
      if (!spot) return;
      yield* go([[spot.x, spot.z]], 0.4);
      // press in toward the rock if the shadow is shorter than reckoned
      for (let i = 0; i < 5 && self.shade < 0.5 && rock; i++) {
        b.steer(rock.x, rock.z, 0.6);
        yield 0.25;
        b.stop();
        yield 0.2;
      }
    }
    /** Cools off in the shade when hot. */
    function* cool(limit = 0.5): Routine {
      if (self.heat < limit || self.sunForce < 0.05) return;
      yield* toShade();
      if (self.shade < 0.5) b.note('found no shade to cool in');
      else yield* b.until(() => self.heat < 0.12, 10, 'the shade to cool him');
    }
    function* fetch(prop: Prop): Routine {
      yield* go([[prop.pos.x, prop.pos.z]], 1.6);
      yield* b.take(prop);
      yield* cool(0.45);
      yield* go([[0, 0]], REACH - 0.9);
      yield 0.15;
      yield* b.tap('action');
      yield 0.5;
    }

    if (this.from('climb')) {
      yield* b.until(() => this.phase === 'climb' && !p.locked, 150, 'the prayer to end');
      yield 0.5;
      // the shelf behind the rocks on the west brow
      yield* go([[-41, 3], [-36.5, -11]], 1.4);
      yield* b.goTo(s.scrolls[2], { dist: 0.5, timeout: 10 });
      yield 0.4;
      yield* go([[-22, -11], [-7, -1.5]]);
    }
    if (this.from('booth')) {
      yield* b.until(() => this.phase === 'booth', 20, 'the hilltop');
      let trips = 0;
      while (this.phase === 'booth' && trips++ < 24) {
        if (this.flying) {
          yield* b.until(() => !this.flying, 8, 'the cloth to land');
          continue;
        }
        const need = this.need;
        if (!need) break;
        let prop: Prop | null = null;
        let best = Infinity;
        for (const x of this.pieces) {
          if (x.data.piece !== need) continue;
          const d = x.pos.distanceTo(p.pos);
          if (d < best) {
            best = d;
            prop = x;
          }
        }
        if (!prop) {
          b.assist(`no ${need} left to fetch`);
          break;
        }
        yield* cool(0.5);
        yield* fetch(prop);
        // the scroll under the slab at the head of the watercourse, once the roof is begun
        if (this.booth.thatch === 1 && !g.scrolls.pieces[0].found) {
          yield* go([[-1.5, -11.5], [-5.2, -17.6]]);
          yield* b.goTo(s.scrolls[0], { dist: 0.6, timeout: 6 });
          yield 0.4;
          yield* go([[-5.2, -17.6], [-1.5, -11.5], [-1, -3]]);
        }
      }
      yield* b.until(() => this.phase === 'sit', 10, 'the booth to stand');
    }
    if (this.from('sit') && this.phase === 'sit') {
      // the tall rock on the east side, by its steps
      if (!g.scrolls.pieces[1].found) {
        yield* cool(0.4);
        yield* go([[12, -3.5], [19.6, -4.4]]);
        const y = hillY(25, -5);
        yield* b.goTo(V(22.7, y + 1.0, -4.6), { dist: 0.45, timeout: 6, y: true });
        yield* b.goTo(V(24.6, y + 2.1, -5), { dist: 0.45, timeout: 6, y: true });
        yield* b.goTo(V(26.6, y + 3.4, -5.3), { dist: 0.5, timeout: 6, y: true });
        yield 0.4;
        if (!g.scrolls.pieces[1].found) b.note('missed the scroll on the tall rock');
        yield* go([[19, -4.4], [8, -2]]);
      }
      yield* b.goTo(at(0.4, 1.9), { dist: 0.8, timeout: 20 });
      yield* b.goTo(at(0.2, 0.3), { dist: 0.6, timeout: 5, noAssist: true });
      for (let i = 0; i < 5 && !this.sat; i++) {
        yield* b.tap('action');
        yield 0.3;
      }
      if (!this.sat) {
        b.assist('could not sit down under the booth');
        this.sat = true;
      }
    }
    for (;;) {
      const phase: Phase = this.phase;
      if (phase === 'done') break;
      if (phase === 'rest') {
        b.stop();
        b.input.action = this.restAsk;
        yield 0.1;
        continue;
      }
      if (p.locked || g.hud.blocking || g.hud.inCinema) {
        b.stop();
        yield 0.1;
        continue;
      }
      if (phase === 'worm') {
        const w = this.worm;
        if (w.mode === 'gnaw' || w.mode === 'rise' || w.mode === 'flee') b.steer(w.pos.x, w.pos.z);
        else b.stop();
        yield;
        continue;
      }
      if (phase === 'wind') {
        if (this.holdSpot?.enabled?.()) {
          yield* b.goTo(at(-2.3, 0.2), { dist: 0.7, timeout: 6, noAssist: true });
          b.input.action = true;
          yield* b.until(() => this.phase !== 'wind' || p.locked || !this.holdSpot?.enabled?.(), 60, 'the booth to go');
          b.input.action = false;
        } else {
          // what shade is left: the foot of a rock
          yield* toShade();
          yield* b.until(() => p.locked || this.phase !== 'wind', 60, 'the heat to end it');
        }
        continue;
      }
      b.stop();
      yield 0.1;
    }
  }

  override dispose() {
    const g = this.g;
    this.sky.dispose();
    this.booth.dispose();
    this.gourd.dispose();
    this.city.dispose();
    this.painted.dispose();
    this.motes.dispose();
    this.streaks.dispose();
    this.weeds.dispose();
    this.loose.dispose();
    this.wormFig.dispose();
    g.engine.post.wobble = 0;
    g.promptOverride = null;
    for (const id of ['heat', 'sun']) g.hud.meter(id, null);
  }
}
