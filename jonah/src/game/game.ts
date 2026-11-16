// The game: owns the engine and every service, loads chapters, keeps time and score, and runs the menus.
import * as THREE from 'three';
import { AudioEngine } from '../core/audio';
import { Engine } from '../core/engine';
import { Input, type UiEvent } from '../core/input';
import { Physics, initPhysics, type Prop } from '../core/physics';
import { defaultGrade } from '../core/post';
import { isTouchDevice, type Quality } from '../core/quality';
import { Save } from '../core/save';
import { Scripts, type Routine } from '../core/script';
import { clamp01, disposeTree } from '../core/util';
import { LOOKS } from '../gfx/character';
import { Bursts } from '../gfx/particles';
import { Toys } from '../gfx/props';
import type { LightRig } from '../gfx/sky';
import { CameraRig } from '../player/camera';
import { Player } from '../player/controller';
import { Hud } from '../ui/hud';
import { Menus, type MenuHost, type ResultData } from '../ui/menus';
import { TouchControls } from '../ui/touch';
import { Bot } from './bot';
import type { Chapter, ChapterCtor } from './chapter';
import { CHAPTERS, chapterMeta } from './chapters';
import { Scrolls } from './scrolls';

export type GameState = 'boot' | 'title' | 'loading' | 'card' | 'play' | 'result' | 'ending';

const _v = new THREE.Vector3();

export class Game implements MenuHost {
  readonly engine: Engine;
  readonly input: Input;
  readonly audio = new AudioEngine();
  readonly save = new Save();
  readonly hud: Hud;
  readonly menus: Menus;
  readonly touch: TouchControls;
  readonly scripts = new Scripts();
  readonly cam: CameraRig;
  readonly params = new URLSearchParams(location.search);

  // ---- per chapter
  physics!: Physics;
  player!: Player;
  /** Everything a chapter adds to the scene goes under here, and is thrown away with it. */
  root = new THREE.Group();
  fx!: Bursts;
  toys!: Toys;
  scrolls = new Scrolls();
  /** The chapter's lights, if it wants the shadow box kept round the player. */
  lights: LightRig | null = null;
  chapter: Chapter | null = null;
  current = 0;
  state: GameState = 'boot';
  /** Seconds played this chapter (the speedrun clock). */
  clock = 0;
  /** No fail states. */
  story = false;
  bot: Bot | null = null;
  /** A prompt a chapter shows by its own hand (a staged moment where the player is not free to walk). */
  promptOverride: import('../player/controller').Focus | null = null;
  /** For the playthrough tool and the browser console. */
  readonly report = { done: [] as number[], errors: [] as string[], assists: [] as string[], result: null as ResultData | null };

  private hasPlayer = false;
  private registry: Record<number, ChapterCtor>;
  private clockRunning = false;
  private found: [boolean, boolean, boolean] = [false, false, false];
  private wantPlate = 0;
  private fpsShown: boolean;
  private completing = false;
  private patchTest: boolean;
  private testPos: THREE.Vector3 | null = null;

  constructor(canvas: HTMLCanvasElement, registry: Record<number, ChapterCtor>) {
    this.registry = registry;
    const st = this.save.data.settings;
    const q = this.params.get('q');
    if (q === 'low' || q === 'medium' || q === 'high' || q === 'auto') st.quality = q;
    const diff = this.params.get('diff');
    if (diff === 'story' || diff === 'normal') st.difficulty = diff;
    this.patchTest = this.params.has('patch-test');
    this.engine = new Engine(canvas, st.quality);
    this.input = new Input(canvas);
    this.hud = new Hud(document.getElementById('hud')!);
    this.menus = new Menus(this);
    this.touch = new TouchControls(this.input, canvas);
    this.cam = new CameraRig(this.engine.camera, () => (this.hasPlayer ? this.physics : null));
    this.fpsShown = this.params.has('fps');
    this.engine.scene.add(this.root);

    this.input.onGesture = () => this.audio.unlock();
    this.input.onDevice = (d) => {
      this.hud.device = d;
      this.touch.show(d === 'touch');
    };
    this.input.onUi = (e) => this.ui(e);
    this.hud.onPause = () => this.pause();
    if (isTouchDevice()) {
      this.hud.device = 'touch';
      this.input.device = 'touch';
      this.touch.show(true);
    }
    this.applySettings();

    this.engine.onFrame = (dt) => this.frame(dt);
    this.engine.onFixed = (dt) => this.fixed(dt);
    this.engine.onUpdate = (dt) => this.update(dt);
    this.engine.onQuality = (ql) => this.qualityChanged(ql);

    addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    addEventListener('error', (e) => this.report.errors.push(String(e.message)));
    addEventListener('unhandledrejection', (e) => this.report.errors.push(String(e.reason)));

    const speed = Number(this.params.get('speed'));
    if (speed > 0) this.engine.timeScale = speed;
  }

  // ---- settings ------------------------------------------------------------------------------------------------

  applySettings() {
    const st = this.save.data.settings;
    this.story = st.difficulty === 'story';
    this.engine.setQuality(st.quality);
    this.audio.setVolumes(st.master, st.music, st.sfx);
    this.input.sensitivity = st.sensitivity;
    this.input.invertY = st.invertY;
    this.cam.shakeEnabled = st.shake;
    if (!st.timer) this.hud.setTimer(null);
    if (this.hasPlayer) this.applyCostume();
  }

  private applyCostume() {
    const st = this.save.data.settings;
    const wearSackcloth = st.costume === 'sackcloth' && this.save.totalScrolls() >= 18;
    if (wearSackcloth) this.player.figure.setRobe(LOOKS.jonahSackcloth.robe);
    else if (!this.player.figure.root.userData.sackcloth) this.player.figure.setRobe(LOOKS.jonah.robe);
  }

  sound(kind: 'move' | 'ok' | 'back') {
    this.audio.ui(kind);
  }

  private qualityChanged(q: Quality) {
    if (this.fx) this.fx.density = q.particles;
    this.chapter?.onQuality(q);
    this.setBlobs();
  }

  /** Soft dark spots under figures stand in for shadows when shadows are off. */
  private setBlobs() {
    const show = !this.engine.quality.shadows;
    this.root.traverse((o) => {
      if (o.userData.isBlob) o.visible = show;
    });
    if (this.hasPlayer) this.player.figure.blob.visible = show;
  }

  // ---- starting up ---------------------------------------------------------------------------------------------

  async boot() {
    await initPhysics();
    this.engine.start();
    const ch = Number(this.params.get('ch'));
    document.getElementById('boot')?.classList.add('gone');
    setTimeout(() => document.getElementById('boot')?.remove(), 900);
    if (this.params.has('bot')) {
      this.bot = new Bot(this);
      this.hud.auto = true;
    }
    if (this.patchTest) {
      this.startChapter(1);
      return;
    }
    if (this.params.has('ending')) this.ending();
    else if (this.params.has('ch') && this.registry[ch]) this.startChapter(ch);
    else this.toTitle();
  }

  toTitle() {
    this.engine.paused = false;
    this.audio.duck(false);
    this.unload();
    this.state = 'title';
    this.current = 0;
    this.hud.hide(true);
    this.touch.show(false);
    const Title = this.registry[0];
    if (Title) this.load(0, Title);
    this.audio.play('title');
    this.hud.fade(1, 0);
    this.hud.fade(0, 1.2);
    this.menus.show('title');
  }

  private unload() {
    this.scripts.clear();
    this.promptOverride = null;
    this.hud.reset();
    this.input.bot = null;
    this.chapter?.dispose();
    this.chapter = null;
    if (this.hasPlayer) {
      this.player.dispose();
      this.hasPlayer = false;
    }
    this.scrolls.dispose();
    this.scrolls = new Scrolls();
    this.lights?.dispose();
    this.lights = null;
    this.engine.scene.remove(this.root);
    disposeTree(this.root);
    if (this.fx) this.fx.dispose();
    this.root = new THREE.Group();
    this.engine.scene.add(this.root);
    if (this.physics) this.physics.dispose();
    this.engine.scene.fog = null;
    this.engine.scene.background = null;
    this.engine.post.grade = defaultGrade();
    this.engine.post.wobble = 0;
    this.cam.frame = null;
    this.cam.hint = null;
    this.cam.setShot(null, 0);
    this.cam.auto = true;
    this.cam.dist = 7.6;
    this.cam.pitch = 0.34;
    this.cam.height = 1.45;
    this.cam.minPitch = -0.35;
    this.cam.maxPitch = 1.25;
    this.cam.frameTilt = 0.3;
    this.audio.quiet();
    this.touch.setSlide(false);
    this.touch.setJump('Jump');
  }

  private load(n: number, Ctor: ChapterCtor) {
    this.physics = new Physics();
    this.fx = new Bursts(this.engine.quality.level === 'low' ? 320 : 800);
    this.fx.density = this.engine.quality.particles;
    this.root.add(this.fx.object);
    this.toys = new Toys(this.physics, this.root);
    this.physics.onKnock = (prop, speed) => this.knock(prop, speed);
    this.scrolls.onFound = (index, quote, at) => {
      this.found[index] = true;
      const rec = this.save.record(this.current);
      rec.scrolls[index] = true;
      this.save.write();
      this.hud.setScrolls(this.found);
      this.hud.scroll(quote, this.found.filter(Boolean).length);
      this.audio.chime();
      this.fx.emit(at, { count: 26, color: 0xffe2a0, color2: 0xfff6dc, speed: 3, life: 1, gravity: -1.5, size: 0.22, additive: true, drag: 2 });
    };
    this.chapter = new Ctor(this);
    this.chapter.build();
    this.setBlobs();
    // Compile every shader now, so the first frame of play does not hitch.
    this.engine.renderer.compile(this.engine.scene, this.engine.camera);
  }

  startChapter(n: number) {
    const Ctor = this.registry[n];
    if (!Ctor) return;
    this.menus.close();
    this.engine.paused = false;
    this.audio.duck(false);
    this.state = 'loading';
    this.completing = false;
    this.hud.fade(1, this.state === 'loading' && this.current === 0 ? 0.5 : 0.35);
    const go = () => {
      this.unload();
      this.current = n;
      this.clock = 0;
      this.clockRunning = false;
      const rec = n > 0 ? this.save.record(n) : null;
      this.found = [false, false, false];
      this.hud.setScrolls(this.found);
      this.hud.hide(false);
      this.hud.showChrome(n > 0);
      if (isTouchDevice() || this.input.device === 'touch') this.touch.show(true);
      this.load(n, Ctor);
      void rec;
      if (n > 0 && n <= 6) {
        this.save.data.chapter = Math.max(1, Math.min(n, 6));
        this.save.write();
      }
      const meta = chapterMeta(n);
      const begin = () => {
        this.state = 'play';
        this.clockRunning = true;
        this.input.eatAll();
        this.hud.fade(0, 0.9);
        this.chapter?.start();
        if (this.bot && this.chapter) {
          const bot = this.bot;
          this.input.bot = bot.input;
          const ch = this.chapter;
          this.scripts.run(() => ch.bot(bot));
        }
        if (this.patchTest) console.log('pass chapter-loads');
      };
      if (meta && !this.params.has('nocard') && !this.patchTest) {
        this.state = 'card';
        this.audio.play(null);
        this.menus.card(meta, begin, !!this.bot);
        this.hud.fade(0, 0.01);
      } else begin();
    };
    setTimeout(go, 380);
  }

  restart() {
    this.startChapter(this.current);
  }

  /** Makes the player. A chapter calls this from build(). */
  spawnPlayer(pos: THREE.Vector3Like, yaw = 0, parent: THREE.Object3D = this.root): Player {
    const p = new Player(this.physics, this.input, parent, LOOKS.jonah);
    this.player = p;
    this.hasPlayer = true;
    p.teleport(pos, yaw);
    this.applyCostume();
    const a = this.audio;
    p.onStep = (surface, speed) => {
      a.stepSound(surface, 0.6 + speed * 0.5);
      if (surface === 'sand' || surface === 'stone') this.puff(p, 2, 0.5);
    };
    p.onJump = () => a.jump();
    p.onLand = (impact, surface) => {
      a.land(impact, surface);
      this.puff(p, 4 + Math.min(10, impact * 0.5), 1);
      if (impact > 16) this.cam.shake(clamp01((impact - 14) / 26) * 0.5);
    };
    p.onGrab = () => a.grab();
    p.onMantle = () => a.whoosh(0.5);
    p.onSlide = () => {
      a.slide();
      this.puff(p, 8, 1.4);
    };
    p.onStroke = () => {
      a.bubble();
      a.whoosh(0.4);
    };
    p.onPick = () => a.pick();
    p.onThrow = (_prop, power) => a.whoosh(0.6 + power * 0.6);
    p.onSetDown = (prop) => a.thud(0.4, prop.surface);
    this.cam.snap(p, yaw + Math.PI);
    return p;
  }

  private puff(p: Player, count: number, scale: number) {
    p.figure.root.getWorldPosition(_v);
    _v.y += 0.08;
    this.fx.emit(_v, { count, color: 0xd9c9a8, color2: 0xf0e6d0, speed: 1.1 * scale, spread: 1, dir: new THREE.Vector3(0, 1, 0), life: 0.5, gravity: -0.4, size: 0.3 * scale, drag: 3, opacity: 0.35, grow: 2.2, radius: 0.15 });
  }

  private knock(prop: Prop, speed: number) {
    this.audio.thud(clamp01(speed / 9) + 0.15, prop.surface);
  }

  // ---- finishing -----------------------------------------------------------------------------------------------

  /** The chapter is told to its end. `challenge` is whether its third-star task was done. */
  complete(challenge: boolean) {
    if (this.completing || this.state !== 'play') return;
    this.completing = true;
    this.clockRunning = false;
    const n = this.current;
    const meta = chapterMeta(n);
    const rec = this.save.record(n);
    const hadAll = rec.scrolls.every(Boolean) && !!this.save.data.gallery[n];
    const hadCostume = this.save.totalScrolls() >= 18;
    rec.finished = true;
    rec.challenge ||= challenge;
    const newBest = rec.bestTime === null || this.clock < rec.bestTime;
    const best = rec.bestTime;
    if (newBest) rec.bestTime = this.clock;
    this.save.data.unlocked = Math.max(this.save.data.unlocked, Math.min(6, n + 1));
    this.save.data.chapter = n >= 6 ? 7 : n + 1;
    const allScrolls = rec.scrolls.every(Boolean);
    const plateWon = allScrolls && !hadAll;
    if (plateWon) {
      const shot = this.chapter?.plate();
      if (shot) this.cam.setShot(shot, 0);
      this.wantPlate = 2;
    }
    this.save.write();
    const data: ResultData = {
      meta,
      time: this.clock,
      best,
      newBest,
      scrolls: rec.scrolls.filter(Boolean).length,
      challenge: rec.challenge,
      stars: this.save.stars(n),
      last: n >= CHAPTERS.length,
      plateWon,
      costumeWon: !hadCostume && this.save.totalScrolls() >= 18,
    };
    this.report.result = data;
    this.report.done.push(n);
    if (this.bot) this.report.assists.push(...this.bot.assists.splice(0));
    const show = () => {
      this.state = 'result';
      this.audio.good();
      this.menus.result(data, (what) => {
        if (what === 'again') this.startChapter(n);
        else if (what === 'chapters') {
          this.toTitle();
          this.menus.show('chapters');
        } else if (n >= CHAPTERS.length) this.ending();
        else this.startChapter(n + 1);
      });
    };
    setTimeout(show, plateWon ? 500 : 60);
  }

  private ending() {
    this.unload();
    this.state = 'ending';
    this.current = 0;
    this.hud.hide(true);
    this.touch.show(false);
    const Title = this.registry[0];
    if (Title) this.load(0, Title);
    this.audio.play('calm');
    this.menus.show('ending');
  }

  /** Saves a small picture of the present view as the chapter's gallery plate. */
  private capturePlate() {
    try {
      const src = this.engine.canvas;
      const c = document.createElement('canvas');
      c.width = 480;
      c.height = 300;
      const g = c.getContext('2d')!;
      const scale = Math.max(c.width / src.width, c.height / src.height);
      const w = src.width * scale;
      const hgt = src.height * scale;
      g.drawImage(src, (c.width - w) / 2, (c.height - hgt) / 2, w, hgt);
      // an old plate: warm, darkened at the edges
      g.globalCompositeOperation = 'soft-light';
      g.fillStyle = 'rgba(220,170,90,0.35)';
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
      const v = g.createRadialGradient(240, 150, 110, 240, 150, 300);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(20,10,0,0.6)');
      g.fillStyle = v;
      g.fillRect(0, 0, c.width, c.height);
      this.save.data.gallery[this.current] = c.toDataURL('image/jpeg', 0.7);
      this.save.write();
    } catch {
      /* a picture is a nicety */
    }
  }

  // ---- pausing and input ---------------------------------------------------------------------------------------

  pause() {
    if (this.state !== 'play' || this.engine.paused || this.bot || this.patchTest) return;
    this.engine.paused = true;
    this.audio.duck(true);
    this.touch.release();
    this.input.releaseAll();
    this.menus.show('pause');
  }

  resume() {
    if (!this.engine.paused) return;
    this.menus.close();
    this.engine.paused = false;
    this.audio.duck(false);
    this.input.eatAll();
  }

  private ui(e: UiEvent) {
    if (this.menus.active) {
      this.menus.ui(e);
      return;
    }
    if (e === 'pause') this.pause();
    else if (e === 'confirm') this.hud.confirm();
  }

  // ---- the loop ------------------------------------------------------------------------------------------------

  private frame(dt: number) {
    this.input.blocked = this.menus.active || this.hud.blocking || this.state !== 'play';
    this.input.poll(dt);
    this.audio.update(dt);
    this.hud.update(dt, this.engine.camera);
    if (this.fpsShown) this.hud.showFps(`${this.engine.fps.toFixed(0)} fps · ${this.engine.frameMs.toFixed(1)} ms · ${this.engine.quality.level} · ${this.engine.renderer.info.render.calls} calls · ${(this.engine.renderer.info.render.triangles / 1000).toFixed(0)}k tris`);
    if (this.wantPlate > 0 && --this.wantPlate === 0) {
      // the frame just drawn is still in the canvas at this point of the next frame's start
      this.engine.post.render(this.engine.scene, this.engine.camera, this.engine.realTime);
      this.capturePlate();
    }
    // The title has no player but its sea still rolls.
    if (this.state === 'title' || this.state === 'ending') this.chapter?.update(dt);
  }

  private fixed(dt: number) {
    if (this.state !== 'play' && this.state !== 'result') return;
    this.input.step(dt);
    this.chapter?.fixedUpdate(dt);
    if (this.hasPlayer) this.player.fixedUpdate(dt);
    this.physics.step();
    this.chapter?.afterStep(dt);
  }

  private update(dt: number) {
    if (this.state !== 'play' && this.state !== 'result') return;
    if (this.clockRunning && !this.hud.inCinema) this.clock += dt;
    this.scripts.update(dt);
    this.chapter?.update(dt);
    this.physics.interpolate(this.engine.alpha);
    if (this.hasPlayer) {
      const p = this.player;
      p.update(dt, this.engine.alpha);
      this.cam.update(dt, p, this.input);
      // pushed right up against him by a wall, the camera looks through him rather than at the inside of his head
      p.figure.body.visible = this.cam.inShot || this.cam.distance > 1.05;
      p.figure.root.getWorldPosition(_v);
      this.lights?.follow(_v);
      _v.y += 1;
      this.scrolls.update(dt, _v);
      const focus = this.promptOverride ?? (p.locked ? null : p.focus);
      this.hud.prompt(focus);
      this.touch.setAction(focus?.prompt ?? null, focus?.progress ?? 0);
      if (this.patchTest) {
        if (!this.testPos) this.testPos = p.pos.clone();
        else if (this.testPos.distanceTo(p.pos) > 2) {
          console.log('pass player-moves');
          this.testPos.set(1e9, 0, 0);
        }
      }
    }
    this.fx.update(dt, this.engine.canvas.clientHeight);
    if (this.save.data.settings.timer && this.current > 0) this.hud.setTimer(this.clock);
  }

  // ---- helpers for chapters ------------------------------------------------------------------------------------

  /** Runs a staged routine on the game clock. */
  run(make: () => Routine) {
    return this.scripts.run(make);
  }

  get quality(): Quality {
    return this.engine.quality;
  }
}
