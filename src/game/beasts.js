// The wild beasts of the wilderness: "And it came to pass that I did slay wild beasts, insomuch that I did obtain
// food for our families" (1 Nephi 16:31). The text does not say what beasts. They are drawn as the wild goats of
// that country are: sandy, with long horns swept back. Made in code, of a few solid parts on pivots, and painted as
// the people are (solid.js).
//
// They graze in a small herd, heads down, wandering a little. Every few seconds one of them (one at a time: the herd
// keeps a watch) lifts its head and looks about. One who moves in its sight while it looks alarms the herd; so does
// one who runs near them, or comes too close. Alarmed enough, they are gone to another feeding ground. So they are
// come up with as a hunter does it: go while their heads are down; be still while one looks.
//
// What is shown of the hunt: an arrow that strikes one, and the beast lying where it fell. Nothing more.
import * as THREE from 'three';
import { ball, cone, limb, part, piece, solidMaterial } from './solid.js';

const HIDE = [0.66, 0.5, 0.33];
const PALE = [0.86, 0.78, 0.62];
const DARK = [0.26, 0.18, 0.13];
const HORN = [0.34, 0.28, 0.22];

function shapes() {
  const trunk = new THREE.LatheGeometry(
    [[0, -0.52], [0.1, -0.5], [0.2, -0.36], [0.23, -0.1], [0.22, 0.14], [0.24, 0.34], [0.2, 0.47], [0.09, 0.54], [0, 0.55]].map(([r, y]) => new THREE.Vector2(r, y)),
    12,
  );
  const body = part(
    piece(trunk, HIDE, 0, { turn: [Math.PI / 2, 0, 0], scale: [0.82, 1.06, 1] }),
    // (the pale of its belly, and a dark stripe along its back)
    ball(0.18, PALE, 4, { at: [0, -0.13, 0.02], scale: [0.86, 0.6, 2.3] }),
    ball(0.07, DARK, 2, { at: [0, 0.225, -0.05], scale: [0.5, 0.4, 5.6] }),
    // (a short tail, up)
    cone(0.035, 0.16, DARK, 2, { at: [0, 0.16, -0.58], turn: [-0.9, 0, 0] }),
  );
  // the neck and head, about where the neck leaves the shoulders, the neck along +z: turned up to look, down to graze
  const head = part(
    limb(0.075, 0.115, 0.42, HIDE, 6, { at: [0, 0, 0.2], turn: [Math.PI / 2, 0, 0] }),
    ball(0.1, HIDE, 6, { at: [0, 0.01, 0.44], scale: [0.86, 0.95, 1.25] }),
    ball(0.062, PALE, 4, { at: [0, -0.02, 0.585], scale: [0.85, 0.82, 1.4] }),
    ball(0.024, DARK, 3, { at: [0, -0.015, 0.672], scale: [1.3, 0.9, 0.7] }),
    ball(0.018, DARK, 1, { at: [0.068, 0.05, 0.5] }),
    ball(0.018, DARK, 1, { at: [-0.068, 0.05, 0.5] }),
    // ears, out to the sides
    cone(0.03, 0.11, HIDE, 6, { at: [0.115, 0.07, 0.4], turn: [0, 0, -1.25] }),
    cone(0.03, 0.11, HIDE, 6, { at: [-0.115, 0.07, 0.4], turn: [0, 0, 1.25] }),
    // a beard under the chin
    cone(0.026, 0.11, DARK, 2, { at: [0, -0.13, 0.52], turn: [Math.PI, 0, 0] }),
    // the horns: long, swept up and back, in two lengths each
    ...[1, -1].flatMap((s) => [
      limb(0.022, 0.034, 0.3, HORN, 5, { at: [0.045 * s, 0.22, 0.36], turn: [-0.55, 0, -0.12 * s] }),
      limb(0.008, 0.022, 0.3, HORN, 5, { at: [0.075 * s, 0.4, 0.16], turn: [-1.25, 0, -0.14 * s] }),
    ]),
  );
  const leg = (thick) => part(limb(thick, 0.032, 0.56, HIDE, 5, { at: [0, -0.28, 0] }), ball(0.04, DARK, 2, { at: [0, -0.57, 0.01], scale: [1, 0.7, 1.2] }));
  return { body, head, foreleg: leg(0.058), hindleg: leg(0.07) };
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const ease = (from, to, dt, rate) => from + (to - from) * Math.min(1, dt * rate);
const STAND = 0.7;

/** How near (metres) a beast that looks sees one who moves; how near one who runs is heard; and what is too near. */
const SEES = 46;
const HEARS = 34;
const NEAR = 6.5;

/**
 * @param scene where they are
 * @param field the meadow: its uniforms are the light they stand in
 * @param heightAt the ground's height at (x, z)
 * @param options.count how many there can be at once (5)
 */
export function createBeasts(scene, field, heightAt, { count = 5 } = {}) {
  const material = solidMaterial(field);
  const S = shapes();
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const mesh = (geometry) => new THREE.Mesh(geometry, material);
  const at = (o, x, y, z) => {
    o.position.set(x, y, z);
    return o;
  };
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const beasts = Array.from({ length: count }, (_, i) => {
    const root = new THREE.Group();
    const body = mesh(S.body);
    const head = at(mesh(S.head), 0, 0.12, 0.42);
    const legs = [[0.11, 0.33, S.foreleg], [-0.11, 0.33, S.foreleg], [0.11, -0.36, S.hindleg], [-0.11, -0.36, S.hindleg]].map(([x, z, shape]) => at(mesh(shape), x, -0.1, z));
    body.add(head, ...legs);
    root.add(body);
    root.scale.setScalar(0.92 + (i % 3) * 0.08);
    root.visible = false;
    group.add(root);
    return {
      root, body, head, legs,
      i, x: 0, z: 0, yaw: 0, speed: 0,
      /**
       * 'graze' (head down, wandering), 'flee' (running to `to`), 'down' (struck: lying where it fell), 'borne'
       * (carried on a man's shoulders: `bearer()` says where he is), or 'gone'.
       */
      mode: 'gone',
      /** The middle of where it feeds; where it is walking to; when it next moves on, lifts its head, and puts it down. */
      home: [0, 0], to: null, moveAt: 0, lookAt: 0, lookTill: 0,
      /** How far its head is up, 0 to 1; how far it has fallen, 0 to 1. */
      up: 0, fallen: 0, side: i % 2 ? 1 : -1,
      stride: i * 1.7, t: i * 2.3,
    };
  });

  /** How alarmed the herd is, 0 to 1; where it will go if it flees; what is told when it does. */
  let alarm = 0;
  let refuges = [];
  let refuge = 0;
  let onFlee = null;
  /** Whether a head is up, and near enough to see the hunter. */
  let watching = false;
  let time = 0;
  let roam = 7;
  /** When the next of them will lift its head to look. */
  let nextLook = 0;

  const alive = () => beasts.filter((b) => b.mode === 'graze' || b.mode === 'flee');

  /** Stands the herd about a place: each at its own spot, grazing. */
  function settle([x, z], n = count, spread = roam) {
    alarm = 0;
    beasts.forEach((b, i) => {
      if (i >= n) {
        b.mode = 'gone';
        b.root.visible = false;
        return;
      }
      const a = (i / n) * Math.PI * 2 + random() * 0.8;
      const d = spread * (0.35 + 0.6 * random());
      Object.assign(b, { x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, yaw: random() * 6.28, speed: 0, mode: 'graze', home: [x, z], to: null, moveAt: time + 1 + random() * 5, lookTill: 0, up: 0, fallen: 0, bearer: null });
      b.root.visible = true;
    });
    nextLook = time + 3;
  }

  /** The herd is gone to its next feeding ground: those that live run there. */
  function flee(from = null) {
    const left = alive();
    if (!left.length) return;
    alarm = 0;
    let to = null;
    if (refuges.length) {
      // (the next of its grounds that is not where the hunter is)
      for (let k = 0; k < refuges.length; k++) {
        refuge = (refuge + 1) % refuges.length;
        const [rx, rz] = refuges[refuge];
        if (!from || Math.hypot(rx - from.x, rz - from.z) > 26) {
          to = refuges[refuge];
          break;
        }
      }
    }
    if (!to) {
      const b = left[0];
      const a = from ? Math.atan2(b.x - from.x, b.z - from.z) : random() * 6.28;
      to = [b.x + Math.sin(a) * 60, b.z + Math.cos(a) * 60];
    }
    left.forEach((b, k) => {
      const a = (k / left.length) * Math.PI * 2;
      const d = roam * (0.4 + 0.5 * random());
      Object.assign(b, { mode: 'flee', home: to, to: [to[0] + Math.sin(a) * d, to[1] + Math.cos(a) * d], lookTill: 0 });
    });
    onFlee?.(to);
  }

  return {
    count,
    beasts,
    show(on = true) {
      group.visible = on;
    },
    /** No beasts anywhere. */
    clear() {
      for (const b of beasts) {
        b.mode = 'gone';
        b.root.visible = false;
      }
      alarm = 0;
      watching = false;
      refuges = [];
      onFlee = null;
    },
    /**
     * A herd of `n` grazing about a place. `to`: the grounds it flees to, in turn, [[x, z], ...] (none: it runs off
     * from the hunter a little way). `fled(to)` is told each time it goes.
     */
    herd(place, { n = count, to = [], fled = null, spread = 7 } = {}) {
      roam = spread;
      refuges = to;
      refuge = -1;
      onFlee = fled;
      settle(place, n, spread);
      group.visible = true;
    },
    /** Those that can still be hunted. */
    alive,
    get alarm() {
      return alarm;
    },
    get watching() {
      return watching;
    },
    /** Something startles them (an arrow that falls among them): they are gone. */
    startle(from) {
      flee(from);
    },
    /** One is struck: it falls where it stands. The others are gone. */
    strike(b, from) {
      Object.assign(b, { mode: 'down', speed: 0, to: null });
      flee(from);
    },
    /** One that lay where it fell is taken up. */
    take(b) {
      b.mode = 'gone';
      b.root.visible = false;
    },
    /**
     * One that lay where it fell is borne on a man's shoulders: `bearer()` gives { x, y, z, yaw } of where he stands
     * (y: his feet). `slot`: 0 for the first he bears, 1 for a second, laid by it.
     */
    bear(b, bearer, slot = 0) {
      Object.assign(b, { mode: 'borne', bearer, slot, speed: 0, to: null });
      b.root.visible = true;
      group.visible = true;
    },
    /** One is laid down at a place (set down from a man's shoulders), lying as it fell. */
    lay(b, x, z, yaw = 0) {
      Object.assign(b, { mode: 'down', x, z, yaw, speed: 0, to: null, fallen: 1, bearer: null });
      b.root.visible = true;
      group.visible = true;
    },
    /** Those that lie where they fell. */
    fallen: () => beasts.filter((b) => b.mode === 'down'),
    /** Whether any is running to another ground. */
    get fleeing() {
      return beasts.some((b) => b.mode === 'flee');
    },
    /** The middle of those that can still be hunted: [x, z], or null. */
    middle() {
      const left = alive();
      if (!left.length) return null;
      return [left.reduce((s, b) => s + b.x, 0) / left.length, left.reduce((s, b) => s + b.z, 0) / left.length];
    },
    /** The middle of a beast, for an arrow to strike: [x, y, z], and how near is a hit. */
    heart(b, out) {
      return out.set(b.x, heightAt(b.x, b.z) + STAND * b.root.scale.y, b.z);
    },
    reach: 0.62,
    /**
     * Moves them on by dt. `hunter`: { x, z, speed } of the one who hunts them, or null; `calm`: they take no alarm
     * (a scene that is only looked at).
     */
    update(dt, hunter = null, calm = false) {
      if (!group.visible) return;
      time += dt;
      watching = false;
      let rise = 0;
      // the herd's watch: one of those that graze lifts its head, when none is looking and it is time
      const grazing = beasts.filter((b) => b.mode === 'graze');
      if (grazing.length && time > nextLook && !grazing.some((b) => time < b.lookTill)) {
        const b = grazing[Math.floor(random() * grazing.length)];
        b.lookTill = time + 1.8 + random() * 1.2;
        nextLook = b.lookTill + 3.4 + random() * 2.6;
      }
      for (const b of beasts) {
        if (b.mode === 'gone') continue;
        b.t += dt;
        if (b.mode === 'borne') {
          // across his shoulders: the first lies behind his neck with its legs hanging down before his shoulders
          // (where his hands hold them); a second lies behind it the other way about, its legs down his back
          const at = b.bearer();
          const fx = Math.sin(at.yaw);
          const fz = Math.cos(at.yaw);
          const back = b.slot ? -0.44 : -0.13;
          b.x = at.x + fx * back;
          b.z = at.z + fz * back;
          b.root.position.set(b.x, at.y + (b.slot ? 1.57 : 1.63), b.z);
          b.root.rotation.set(0, at.yaw + (b.slot ? -1 : 1) * (Math.PI / 2), -1.1, 'YXZ');
          b.body.position.y = 0;
          // (the legs hang: limp, and swinging a little as he goes)
          b.legs.forEach((leg, n) => {
            leg.rotation.x = (n < 2 ? -0.12 : 0.12) + 0.05 * Math.sin(b.t * 5 + n);
            leg.rotation.z = 0.86 + 0.04 * Math.sin(b.t * 4.3 + n * 2);
          });
          b.head.rotation.set(1.25, 0, 0, 'YXZ');
          continue;
        }
        const far = hunter ? Math.hypot(hunter.x - b.x, hunter.z - b.z) : Infinity;
        let want = 0;
        let head = 0;
        if (b.mode === 'graze') {
          // (its turn to keep the watch: its head is up, and it looks about)
          const looking = time < b.lookTill;
          head = looking ? 1 : 0;
          // wanders a little, when it is not looking
          if (!looking && !b.to && time > b.moveAt) {
            const a = random() * 6.28;
            const d = roam * Math.sqrt(random());
            b.to = [b.home[0] + Math.sin(a) * d, b.home[1] + Math.cos(a) * d];
          }
          if (b.to && !looking) {
            const dx = b.to[0] - b.x;
            const dz = b.to[1] - b.z;
            if (Math.hypot(dx, dz) < 0.5) {
              b.to = null;
              b.moveAt = time + 2 + random() * 6;
            } else {
              const turn = wrap(Math.atan2(dx, dz) - b.yaw);
              b.yaw += Math.sign(turn) * Math.min(Math.abs(turn), dt * 1.5);
              want = 0.55 * Math.max(0.2, Math.cos(Math.min(Math.PI / 2, Math.abs(turn))));
            }
          }
          if (hunter && !calm) {
            const moving = hunter.speed > 0.5;
            if (looking && far < SEES) {
              watching = true;
              // seen moving: the nearer and the faster, the sooner they are gone
              if (moving) rise = Math.max(rise, (0.55 + 0.9 * (1 - far / SEES)) * Math.min(1.6, hunter.speed / 3.4));
            }
            if (hunter.speed > 4.9 && far < HEARS) rise = Math.max(rise, 0.5 + 0.9 * (1 - far / HEARS));
            if (far < NEAR) rise = Math.max(rise, moving ? 1.6 : 0.5);
          }
          // (it turns its head to the one it sees)
          b.look = ease(b.look ?? 0, looking && far < SEES + 14 ? THREE.MathUtils.clamp(wrap(Math.atan2(hunter.x - b.x, hunter.z - b.z) - b.yaw), -1.3, 1.3) : 0, dt, 3);
        } else if (b.mode === 'flee') {
          head = 0.75;
          const dx = b.to[0] - b.x;
          const dz = b.to[1] - b.z;
          const d = Math.hypot(dx, dz);
          if (d < 1.2) {
            Object.assign(b, { mode: 'graze', to: null, moveAt: time + 3 + random() * 4 });
            nextLook = Math.max(nextLook, time + 2.5);
          } else {
            const turn = wrap(Math.atan2(dx, dz) - b.yaw);
            b.yaw += Math.sign(turn) * Math.min(Math.abs(turn), dt * 5);
            want = Math.min(8.6, 2.5 + d) * Math.max(0.3, Math.cos(Math.min(Math.PI / 2, Math.abs(turn))));
          }
          b.look = ease(b.look ?? 0, 0, dt, 4);
        }
        b.speed = ease(b.speed, want, dt, b.mode === 'flee' ? 5 : 2.5);
        b.x += Math.sin(b.yaw) * b.speed * dt;
        b.z += Math.cos(b.yaw) * b.speed * dt;
        b.stride += b.speed * dt * (b.speed > 3 ? 1.9 : 4.2);
        b.up = ease(b.up, head, dt, head > b.up ? 7 : 3);
        b.fallen = ease(b.fallen, b.mode === 'down' ? 1 : 0, dt, 3.2);
        const k = b.fallen * b.fallen * (3 - 2 * b.fallen);
        const y = heightAt(b.x, b.z);
        // (it stands as the ground lies under it, fore and aft)
        const fx = Math.sin(b.yaw);
        const fz = Math.cos(b.yaw);
        const tilt = Math.atan2(heightAt(b.x + fx * 0.5, b.z + fz * 0.5) - heightAt(b.x - fx * 0.5, b.z - fz * 0.5), 1);
        b.root.position.set(b.x, y, b.z);
        b.root.rotation.set(-tilt * (1 - k), b.yaw, b.side * 1.45 * k, 'YXZ');
        const swing = Math.min(1, b.speed / 0.5) * (1 - k);
        const run = b.speed > 3;
        b.body.position.y = STAND * (1 - 0.78 * k) + (run ? Math.abs(Math.sin(b.stride)) * 0.1 : Math.abs(Math.sin(b.stride)) * 0.012) * swing;
        const phases = run ? [0, 0.5, Math.PI, Math.PI + 0.5] : [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5];
        b.legs.forEach((leg, n) => {
          leg.rotation.z = 0;
          leg.rotation.x = Math.sin(b.stride + phases[n]) * (run ? 0.85 : 0.4) * swing + (n < 2 ? 0.5 : -0.4) * k;
        });
        // the head: down to graze (and nodding as it crops), up to look, level as it runs; turned to what it sees
        const crop = 0.05 * Math.sin(b.t * 3.1) * (1 - b.up);
        b.head.rotation.set(1.08 - 1.95 * b.up + crop + 0.5 * k, (b.look ?? 0) * b.up, 0, 'YXZ');
      }
      if (rise > 0) alarm = Math.min(1, alarm + rise * dt);
      else alarm = Math.max(0, alarm - 0.14 * dt);
      if (alarm >= 1) flee(hunter);
    },
  };
}
