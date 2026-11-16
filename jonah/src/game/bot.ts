// The automated player: it drives the same buttons a person does. Chapters script it with these routines to
// prove they can be finished (tools/playthrough.mjs). When it cannot do a thing in time it "assists" itself
// (teleports, or does the thing directly) and says so, and the tool reports every assist.
import * as THREE from 'three';
import type { BotInput } from '../core/input';
import type { Prop } from '../core/physics';
import type { Routine } from '../core/script';
import type { Game } from './game';

export class Bot {
  readonly input: BotInput = { moveX: 0, moveY: 0, jump: false, action: false, slide: false, world: true };
  assists: string[] = [];
  notes: string[] = [];

  constructor(private g: Game) {}

  note(msg: string) {
    this.notes.push(msg);
    console.log(`[bot] ${msg}`);
  }

  assist(msg: string) {
    this.assists.push(msg);
    console.warn(`[bot] ASSIST: ${msg}`);
  }

  stop() {
    this.input.moveX = this.input.moveY = 0;
    this.input.jump = this.input.action = this.input.slide = false;
  }

  /** Points the stick at a place in the player's space. */
  steer(x: number, z: number, speed = 1) {
    const p = this.g.player.pos;
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    this.input.moveX = (dx / d) * speed;
    this.input.moveY = (dz / d) * speed;
    return d;
  }

  *wait(seconds: number): Routine {
    yield seconds;
  }

  *until(cond: () => boolean, timeout = 30, what = 'a condition'): Routine {
    let t = 0;
    while (!cond()) {
      const dt: number = yield;
      t += dt ?? 0;
      if (t > timeout) {
        this.assist(`gave up waiting for ${what}`);
        return;
      }
    }
  }

  *tap(button: 'jump' | 'action' | 'slide', seconds = 0.06): Routine {
    this.input[button] = true;
    yield seconds;
    this.input[button] = false;
    yield 0.05;
  }

  *hold(button: 'jump' | 'action' | 'slide', until: number | (() => boolean), timeout = 12): Routine {
    this.input[button] = true;
    if (typeof until === 'number') yield until;
    else {
      let t = 0;
      while (!until() && t < timeout) {
        const dt: number = yield;
        t += dt ?? 0;
      }
    }
    this.input[button] = false;
    yield 0.05;
  }

  /**
   * Runs to a place. Jumps when it stops making headway (a step, a low wall) or when `jump` says so.
   * Gives up after `timeout` seconds and assists.
   */
  *goTo(target: THREE.Vector3Like, opts: { dist?: number; timeout?: number; jump?: () => boolean; slide?: () => boolean; speed?: number; y?: boolean; noAssist?: boolean; holdJump?: () => boolean; until?: () => boolean } = {}): Routine {
    const g = this.g;
    const dist = opts.dist ?? 0.6;
    const timeout = opts.timeout ?? 14;
    let t = 0;
    let stuck = 0;
    let jumpHold = 0;
    let lastX = g.player.pos.x;
    let lastZ = g.player.pos.z;
    for (;;) {
      const p = g.player.pos;
      const d = this.steer(target.x, target.z, opts.speed ?? 1);
      const dy = Math.abs(target.y - p.y);
      if (d < dist && (!opts.y || dy < 1.2)) break;
      if (opts.until?.()) break;
      const dt: number = (yield) ?? 0;
      t += dt;
      // headway
      const sp = dt > 0 ? Math.hypot(p.x - lastX, p.z - lastZ) / dt : 9;
      lastX = p.x;
      lastZ = p.z;
      if (g.player.state === 'ground' && sp < 1.2) stuck += dt;
      else stuck = Math.max(0, stuck - dt * 2);
      const wantJump = (opts.jump?.() ?? false) || stuck > 0.25;
      if (wantJump && jumpHold <= 0) {
        jumpHold = 0.34;
        stuck = 0;
      }
      if (g.player.state === 'hang') jumpHold = Math.max(jumpHold, 0.1);
      jumpHold -= dt;
      this.input.jump = jumpHold > 0 || (opts.holdJump?.() ?? false);
      this.input.slide = opts.slide?.() ?? false;
      if (t > timeout) {
        if (!opts.noAssist) {
          this.assist(`could not reach (${target.x.toFixed(1)}, ${target.y.toFixed(1)}, ${target.z.toFixed(1)}) from (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`);
          g.player.teleport(new THREE.Vector3(target.x, target.y + 0.1, target.z));
        }
        break;
      }
    }
    this.stop();
  }

  /** Turns to face a place (a nudge of the stick). */
  *face(target: THREE.Vector3Like): Routine {
    const g = this.g;
    for (let i = 0; i < 12; i++) {
      this.steer(target.x, target.z, 0.3);
      yield;
      const want = Math.atan2(target.x - g.player.pos.x, target.z - g.player.pos.z);
      let d = (want - g.player.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.25) break;
    }
    this.stop();
    yield 0.05;
  }

  /** Walks to a prop and takes it up. */
  *take(prop: Prop): Routine {
    const g = this.g;
    if (g.player.carried === prop) return;
    yield* this.goTo(prop.pos, { dist: 1.25 + Math.max(prop.size.x, prop.size.z) * 0.3, timeout: 10 });
    yield* this.face(prop.pos);
    for (let i = 0; i < 4 && g.player.carried !== prop; i++) {
      yield* this.tap('action');
      yield 0.15;
      if (g.player.carried !== prop) {
        this.steer(prop.pos.x, prop.pos.z, 0.6);
        yield 0.2;
        this.stop();
      }
    }
    if (g.player.carried !== prop) {
      this.assist(`could not take up a ${prop.kind}`);
      if (g.player.carried) g.player.release(g.player.carried);
      g.player.pickUp(prop);
    }
    yield 0.25;
  }

  /** Sets the carried prop down (a tap). */
  *setDown(): Routine {
    yield* this.tap('action', 0.08);
    yield 0.2;
  }

  /** Throws the carried prop (hold, then let go). */
  *throw(power = 1): Routine {
    yield* this.hold('action', 0.24 + power * 0.6);
    yield 0.2;
  }

  /** Uses whatever is in reach, holding as long as it takes. */
  *use(timeout = 8): Routine {
    const g = this.g;
    let t = 0;
    this.input.action = true;
    yield 0.1;
    while (g.player.focus?.kind === 'use' && t < timeout) {
      const dt: number = (yield) ?? 0;
      t += dt;
    }
    this.input.action = false;
    yield 0.1;
  }
}
