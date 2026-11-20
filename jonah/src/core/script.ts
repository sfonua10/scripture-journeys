// Staging written as generators, run on the game's own clock, so a scene pauses when the game pauses and is
// dropped cleanly when its chapter ends.
//
//   scripts.run(function* () {
//     yield 1.5;                       // wait seconds
//     yield () => player.pos.x > 10;   // wait until true
//     yield* tween(0.6, (t) => door.rotation.y = t);
//   });

export type Step = number | (() => boolean) | undefined;
export type Routine = Generator<Step, void, number>;

interface Running {
  gen: Routine;
  wait: number;
  until: (() => boolean) | null;
  done: boolean;
}

export class Scripts {
  private list: Running[] = [];

  run(make: () => Routine): { stop(): void; readonly done: boolean } {
    const r: Running = { gen: make(), wait: 0, until: null, done: false };
    this.list.push(r);
    this.advance(r, 0);
    return {
      stop: () => {
        r.done = true;
      },
      get done() {
        return r.done;
      },
    };
  }

  private advance(r: Running, dt: number) {
    // A routine may yield several zero-length steps in one frame.
    for (let guard = 0; guard < 64 && !r.done; guard++) {
      if (r.until) {
        if (!r.until()) return;
        r.until = null;
      }
      if (r.wait > 0) {
        r.wait -= dt;
        dt = 0;
        if (r.wait > 0) return;
      }
      const res = r.gen.next(dt);
      dt = 0;
      if (res.done) {
        r.done = true;
        return;
      }
      const v = res.value;
      if (typeof v === 'number') r.wait = v;
      else if (typeof v === 'function') r.until = v;
      else return; // a bare yield: one frame
    }
  }

  update(dt: number) {
    for (const r of this.list) if (!r.done) this.advance(r, dt);
    if (this.list.length > 32) this.list = this.list.filter((r) => !r.done);
  }

  clear() {
    for (const r of this.list) r.done = true;
    this.list = [];
  }
}

/** Runs `fn(t)` with t from 0 to 1 over `seconds`, eased. Use with `yield*`. */
export function* tween(seconds: number, fn: (t: number) => void, easing: (t: number) => number = (t) => t): Routine {
  let t = 0;
  fn(easing(0));
  while (t < seconds) {
    const dt: number = yield;
    t += dt ?? 0;
    fn(easing(Math.min(1, t / seconds)));
  }
}

/** Waits until `cond()` or until `seconds` have passed, whichever is first. */
export function* waitFor(cond: () => boolean, seconds = Infinity): Routine {
  let t = 0;
  while (!cond() && t < seconds) {
    const dt: number = yield;
    t += dt ?? 0;
  }
}
