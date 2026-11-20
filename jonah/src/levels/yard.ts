// The test yard (?ch=9): every move and every toy in one place, for tuning the feel. Not part of the story.
import * as THREE from 'three';
import { Chapter } from '../game/chapter';
import { LevelBuilder } from '../gfx/build';
import { Sky, makeLights } from '../gfx/sky';
import { Motes } from '../gfx/particles';
import { Figure, mariner, LOOKS } from '../gfx/character';
import type { Bot } from '../game/bot';
import type { Routine } from '../core/script';

export class Yard extends Chapter {
  private sky!: Sky;
  private motes!: Motes;
  private lift!: { body: import('@dimforge/rapier3d-compat').RigidBody; mesh: THREE.Object3D; t: number };
  private figures: Figure[] = [];

  build() {
    const g = this.g;
    const b = new LevelBuilder(g.physics, 5);
    const sand = 0xd9c08a;
    const plaster = 0xe9d6ae;
    const stone = 0xbfae90;
    // ground
    // (with a pit left for the pool)
    b.block(-13, -1, 0, 54, 1, 80, sand, { mat: 'sand', jitter: 0, shade: 0 });
    b.block(29, -1, 0, 22, 1, 80, sand, { mat: 'sand', jitter: 0, shade: 0 });
    b.block(16, -1, -18, 4, 1, 44, sand, { mat: 'sand', jitter: 0, shade: 0 });
    b.block(16, -1, 26, 4, 1, 28, sand, { mat: 'sand', jitter: 0, shade: 0 });
    b.block(16, -4, 8, 4, 0.5, 8, 0x8a7a5a, { mat: 'stone' });
    // steps and ledges of rising height
    b.block(-6, 0, -6, 3, 0.4, 3, stone, { mat: 'stone' });
    b.block(-6, 0, -10, 3, 1.0, 3, stone, { mat: 'stone' });
    b.block(-6, 0, -14, 3, 1.9, 3, plaster, { mat: 'plaster' });
    b.block(-6, 0, -18, 3, 3.4, 3, plaster, { mat: 'plaster' });
    b.block(-1, 0, -18, 3, 3.4, 3, plaster, { mat: 'plaster' });
    // a gap to jump: two roofs
    b.block(6, 0, -8, 4, 2.2, 4, plaster, { mat: 'plaster' });
    b.block(6, 0, -15.5, 4, 2.2, 4, plaster, { mat: 'plaster' });
    b.ramp(6, 0, -4.5, 2, 2.2, 3, stone, { mat: 'stone', rotY: Math.PI });
    // a wall to climb, with its vines drawn as a darker panel
    b.block(13, 0, -8, 4, 5, 1, plaster, { mat: 'plaster', noLedge: false });
    b.box(13, 2.5, -7.46, 2.4, 5, 0.08, 0x5f7f3a, { collide: false, mat: 'weave' });
    g.spawnPlayer({ x: 0, y: 0.1, z: 4 }, Math.PI);
    g.player.climbZones.push({ origin: new THREE.Vector3(13, 0, -7.5), normal: new THREE.Vector3(0, 0, 1), halfWidth: 1.1, yMin: 0, yMax: 5 });
    // an awning to slide under
    b.block(-12, 0, 2, 0.3, 1.2, 0.3, 0x7a5a3a, { mat: 'wood' });
    b.block(-12, 0, 6, 0.3, 1.2, 0.3, 0x7a5a3a, { mat: 'wood' });
    b.box(-12, 1.15, 4, 3, 0.12, 4.6, 0xb8452f, { mat: 'cloth' });
    // a pool
    b.block(16, -0.5, 8, 4, 0.05, 8, 0x3a9ab0, { collide: false, jitter: 0, shade: 0 });
    this.root().add(b.finish());

    // toys
    for (let i = 0; i < 4; i++) g.toys.crate(-2 + i * 1.1, 0.5, 0, 0.8);
    g.toys.crate(-1.4, 1.4, 0);
    g.toys.barrel(3.5, 0.5, 1);
    g.toys.basket(4.6, 0.3, 1.2);
    g.toys.jar(5.4, 0.45, 0.4);
    g.toys.sack(3.2, 0.4, 2.4);
    g.toys.net(4.6, 0.4, 2.6);
    g.toys.plank(6, 0.2, 2, 2.2);

    // a platform that moves
    const body = g.physics.kinematic({ x: -14, y: 0.3, z: -6 });
    const lb = new LevelBuilder(g.physics, 9, body);
    lb.box(0, 0, 0, 3, 0.3, 3, 0x9a7a4a, { mat: 'wood' });
    const mesh = lb.finish();
    this.root().add(mesh);
    this.lift = { body, mesh, t: 0 };

    // a few people, to look at the poses
    const poses = ['idle', 'talk', 'sit', 'kneel', 'pray', 'work', 'bail', 'pull', 'bow', 'cling', 'cry', 'lie'] as const;
    poses.forEach((pose, i) => {
      const f = new Figure(i === 0 ? LOOKS.shipmaster : mariner(i));
      f.root.position.set(-10 + i * 1.8, 0, 9);
      f.root.rotation.y = Math.PI;
      f.pose = pose;
      f.blob.userData.isBlob = true;
      this.root().add(f.root);
      this.figures.push(f);
    });

    g.scrolls.add(0, { x: 6, y: 3.4, z: -15.5 }, 'Psalm 139:7', this.root());
    g.player.interactables.push({ pos: new THREE.Vector3(0, 0, 8), radius: 1.6, prompt: 'Hold to work', hold: 1.5, onUse: () => g.hud.toast('Done') });

    this.sky = new Sky({ top: 0x3f7fc0, horizon: 0xf4dcae, bottom: 0xc9b488, sunDir: new THREE.Vector3(0.5, 0.6, 0.4), sunColor: 0xfff0c8, sunSize: 0.035, sunGlow: 1, cloudCover: 0.38, cloudLit: 0xfff6e6, cloudDark: 0xc9b8a4, cloudSpeed: 1, stars: 0 });
    this.root().add(this.sky.mesh);
    g.lights = makeLights(g.engine.scene, { sunDir: new THREE.Vector3(0.5, 0.6, 0.4), sunColor: 0xffe6b8, sunIntensity: 2.6, skyColor: 0xbfd8ff, groundColor: 0xb08a5a, hemiIntensity: 1.1, shadowSize: g.quality.shadowSize });
    g.engine.setView(260, 40, 200, 0xf0d9b0);
    this.motes = new Motes(Math.round(160 * g.quality.particles), { color: 0xfff2d0, size: 0.07, opacity: 0.5 });
    this.root().add(this.motes.object);
    g.audio.bed('wind', 0.25);
  }

  private root() {
    return this.g.root;
  }

  start() {
    this.g.hud.objective('The test yard', 'Run, jump, climb, slide, carry, throw');
    this.g.touch.setSlide(true);
    this.g.audio.play('harbor');
  }

  /** Tries every move once and says what happened. */
  override *bot(b: Bot): Routine {
    const g = this.g;
    const p = g.player;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const check = (name: string, ok: boolean, extra = '') => b.note(`${ok ? 'ok  ' : 'FAIL'} ${name} ${extra}`);
    yield 0.5;
    // carry and stack
    const crates = g.physics.props.filter((c) => c.kind === 'crate');
    const a = crates[3];
    yield* b.take(a);
    check('take up', p.carried === a);
    yield* b.goTo(V(crates[2].pos.x, 0, crates[2].pos.z + 1.45), { dist: 0.25 });
    yield* b.face(crates[2].pos);
    yield* b.setDown();
    yield 1;
    check('stack', a.pos.y > 1.0 && Math.abs(a.pos.x - crates[2].pos.x) < 0.5, `y=${a.pos.y.toFixed(2)}`);
    // throw
    const bar = g.physics.props.find((c) => c.kind === 'barrel')!;
    yield* b.take(bar);
    yield* b.face(V(p.pos.x + 5, 0, p.pos.z + 5));
    const from = bar.pos.clone();
    yield* b.throw(1);
    yield 1.2;
    check('throw', bar.pos.distanceTo(from) > 4, `d=${bar.pos.distanceTo(from).toFixed(1)}`);
    // steps and ledges
    yield* b.goTo(V(-6, 0, -3), { dist: 0.4 });
    yield* b.goTo(V(-6, 0.4, -6), { dist: 0.5 });
    check('step up 0.4', p.pos.y > 0.3, `y=${p.pos.y.toFixed(2)}`);
    yield* b.goTo(V(-6, 1, -10), { dist: 0.6, timeout: 6 });
    check('jump up 1.0', p.pos.y > 0.9, `y=${p.pos.y.toFixed(2)}`);
    yield* b.goTo(V(-6, 1.9, -14), { dist: 0.7, timeout: 6 });
    check('ledge 1.9', p.pos.y > 1.8, `y=${p.pos.y.toFixed(2)}`);
    yield* b.goTo(V(-6, 3.4, -18), { dist: 0.7, timeout: 6 });
    check('ledge 3.4', p.pos.y > 3.3, `y=${p.pos.y.toFixed(2)}`);
    // a 2 m gap between two blocks at the same height
    yield* b.goTo(V(-1, 3.4, -18), { dist: 0.7, timeout: 6, jump: () => p.pos.x > -4.9 && p.grounded });
    check('gap 2 m', p.pos.y > 3.3 && p.pos.x > -2.6, `x=${p.pos.x.toFixed(2)} y=${p.pos.y.toFixed(2)}`);
    // the roofs: up the ramp, over a 3.5 m gap, to the scroll
    yield* b.goTo(V(6, 0, -2), { dist: 0.5, timeout: 12 });
    yield* b.goTo(V(6, 2.2, -8), { dist: 0.6, timeout: 6 });
    check('ramp', p.pos.y > 2.1, `y=${p.pos.y.toFixed(2)}`);
    yield* b.goTo(V(6, 2.2, -15.5), { dist: 0.8, timeout: 6, jump: () => p.pos.z < -9.5 && p.grounded });
    check('gap 3.5 m', p.pos.y > 2.1 && p.pos.z < -13.4, `z=${p.pos.z.toFixed(2)} y=${p.pos.y.toFixed(2)}`);
    yield 0.5;
    check('scroll', g.scrolls.foundCount === 1);
    // the wall
    yield* b.goTo(V(13, 0, -5), { dist: 0.5, timeout: 12 });
    yield* b.goTo(V(13, 5, -8), { dist: 0.6, timeout: 9, noAssist: true });
    check('climb 5 m', p.pos.y > 4.9, `y=${p.pos.y.toFixed(2)} state=${p.state}`);
    // slide under the awning
    yield* b.goTo(V(-12, 0, -3), { dist: 0.5, timeout: 14 });
    yield* b.goTo(V(-12, 0, 9), { dist: 0.6, timeout: 6, slide: () => p.pos.z > -0.2 && p.pos.z < 0.6, noAssist: true });
    check('slide', p.pos.z > 8, `z=${p.pos.z.toFixed(2)} state=${p.state}`);
    // the pool
    yield* b.goTo(V(16, -2, 8), { dist: 0.6, timeout: 14 });
    yield 0.6;
    check('swim', p.state === 'swim' || g.player.water !== null, `state=${p.state}`);
    yield* b.goTo(V(11, 0, 8), { dist: 0.8, timeout: 8, holdJump: () => p.state === 'swim', noAssist: true });
    check('out of the pool', p.state !== 'swim', `state=${p.state} y=${p.pos.y.toFixed(2)}`);
    b.note(`assists: ${b.assists.length}`);
    g.report.assists.push(...b.assists);
    g.report.done.push(9);
  }

  override fixedUpdate(dt: number) {
    this.lift.t += dt;
    const x = -14 + Math.sin(this.lift.t * 0.6) * 4;
    const y = 0.3 + (Math.sin(this.lift.t * 0.4) * 0.5 + 0.5) * 2.2;
    this.lift.body.setNextKinematicTranslation({ x, y, z: -6 });
  }

  override update(dt: number) {
    const g = this.g;
    const t = this.lift.body.translation();
    this.lift.mesh.position.set(t.x, t.y, t.z);
    this.sky.update(g.engine.time);
    this.motes.update(g.engine.time, g.engine.camera, g.engine.canvas.clientHeight);
    for (const f of this.figures) f.update(dt);
    // water in the pool
    const p = g.player.pos;
    const inPool = Math.abs(p.x - 16) < 2 && Math.abs(p.z - 8) < 4 && p.y < 0.2;
    g.player.water = inPool ? { surfaceY: -0.45 } : null;
  }
}
