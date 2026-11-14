// A bow, and the drawing of it. "And it came to pass that we did take our bows and our arrows, and go forth into the
// wilderness to slay food for our families" (1 Nephi 16:14).
//
// He holds to draw (E, the mouse's button, a finger on the prompt), looks along the arrow, and lets go to loose it.
// The mark in the middle of the picture is where he aims; the ring round it is how wide of it the arrow may fly. The
// ring closes as he holds steady at full draw, and opens again if he holds too long and his arm tires. An arrow let go
// before it is half drawn is only let down. The arrow is a real thing in the air: it takes time to arrive, and falls
// as it goes; he is an archer, and holds over for the fall himself, as far as the bow can throw.
//
// Three kinds of bow (KINDS), which are the account's own:
//   steel  "my bow, which was made of fine steel" (16:18): throws far and flat, and flies true
//   wood   "I, Nephi, did make out of wood a bow, and out of a straight stick, an arrow" (16:23): throws a short way
//          in a high arc, and not so true; it must be brought near, and he has the one arrow
//   limp   "their bows having lost their springs" (16:21): the arrow falls a few steps off
// And the steel bow can break as it is drawn (16:18): the story says when (`breaks`).
//
// What is shown of the hunt is an arrow in flight and a beast that falls (beasts.js).
import * as THREE from 'three';
import { reachArm } from '../figure/hold.js';
import { cone, limb, part, solidMaterial } from './solid.js';

const STEEL = [0.62, 0.66, 0.72];
const STEEL_DARK = [0.36, 0.39, 0.45];
const WOOD = [0.5, 0.34, 0.2];
const WOOD_PALE = [0.72, 0.58, 0.4];
const OLD = [0.34, 0.25, 0.17];
const HIDE = [0.3, 0.2, 0.13];
const GUT = [0.86, 0.8, 0.66];
const SHAFT = [0.74, 0.62, 0.42];
const FLINT = [0.3, 0.3, 0.33];
const FEATHER = [0.9, 0.88, 0.82];

const G = 9.8;
export const KINDS = {
  steel: { speed: 62, scatter: 0.0045, range: 46, draw: 0.75, flex: 0.2, look: 'steel' },
  wood: { speed: 20.5, scatter: 0.024, range: 26, draw: 1.05, flex: 0.3, look: 'wood' },
  limp: { speed: 7.5, scatter: 0.07, range: 5, draw: 0.6, flex: 0.05, look: 'old' },
};

/** How far the string stands from the grip, and how much further it is drawn. */
const BRACE = 0.16;
const PULL = 0.5;
const ARROW = 0.8;

/** A limb of a bow as a run of short lengths through points [y, z] (in the bow's own plane), thinning to its tip. */
function run(points, thick, thin, colour, kind) {
  const out = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [y0, z0] = points[i];
    const [y1, z1] = points[i + 1];
    const len = Math.hypot(y1 - y0, z1 - z0);
    const r0 = thick + (thin - thick) * (i / (points.length - 1));
    const r1 = thick + (thin - thick) * ((i + 1) / (points.length - 1));
    out.push(limb(r1, r0, len * 1.04, colour, kind, { at: [0, (y0 + y1) / 2, (z0 + z1) / 2], turn: [Math.atan2(z1 - z0, y1 - y0), 0, 0] }));
  }
  return out;
}

/** The shapes of a bow of one look: its grip, and each limb in two lengths (the upper can part where they join). */
function bowShapes(look) {
  const steel = look === 'steel';
  // (a steel bow is slight, and bends back on itself at its tips; one cut from a bough is thick, and not quite even)
  const upper = steel ? [[0.05, 0], [0.24, -0.03], [0.42, -0.095], [0.56, -0.165], [0.615, -0.15]] : [[0.05, 0], [0.26, -0.022], [0.46, -0.088], [0.62, -0.175]];
  const lower = steel ? upper.map(([y, z]) => [-y, z]) : [[-0.05, 0], [-0.25, -0.03], [-0.44, -0.1], [-0.59, -0.175]];
  const [thick, thin] = steel ? [0.019, 0.01] : [0.027, 0.014];
  const colour = steel ? STEEL : look === 'old' ? OLD : WOOD;
  const kind = steel ? 3 : 5;
  const cut = 2;
  const U = run(upper, thick, thin, colour, kind);
  const L = run(lower, thick, thin, colour, kind);
  const grip = part(
    limb(thick * 1.25, thick * 1.25, 0.15, steel ? STEEL_DARK : HIDE, 2, {}),
    // (bands of the other colour at each end of the grip)
    limb(thick * 1.45, thick * 1.45, 0.016, steel ? [0.86, 0.7, 0.36] : WOOD_PALE, 4, { at: [0, 0.075, 0] }),
    limb(thick * 1.45, thick * 1.45, 0.016, steel ? [0.86, 0.7, 0.36] : WOOD_PALE, 4, { at: [0, -0.075, 0] }),
  );
  return {
    grip,
    upperA: part(...U.slice(0, cut)),
    upperB: part(...U.slice(cut)),
    lower: part(...L),
    // where the string is tied at each tip, and where the upper limb parts
    top: upper[upper.length - (steel ? 2 : 1)],
    foot: lower[lower.length - (steel ? 2 : 1)],
    join: upper[cut],
  };
}

/** An arrow, its nock at the middle and its head along +z. */
function arrowShape() {
  return part(
    limb(0.009, 0.009, ARROW, SHAFT, 5, { at: [0, 0, ARROW / 2], turn: [Math.PI / 2, 0, 0] }),
    cone(0.017, 0.07, FLINT, 2, { at: [0, 0, ARROW + 0.03], turn: [Math.PI / 2, 0, 0] }),
    // three feathers
    ...[0, 2.1, 4.2].map((a) => limb(0.001, 0.001, 0.12, FEATHER, 4, { at: [Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0.09], turn: [Math.PI / 2, 0, 0], scale: [1 + 16 * Math.abs(Math.cos(a)), 1, 1 + 16 * Math.abs(Math.sin(a))] })),
  );
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const UP = new THREE.Vector3(0, 1, 0);
const CANT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -0.18);

const CSS = /* css */ `
#b-aim { position: fixed; left: 50%; top: 50%; width: 0; height: 0; z-index: 5; pointer-events: none; opacity: 0; transition: opacity 0.2s; }
#b-aim.on { opacity: 1; }
#b-aim .dot { position: absolute; left: -2px; top: -2px; width: 4px; height: 4px; border-radius: 50%; background: #fff; box-shadow: 0 0 3px rgba(0, 0, 0, 0.9); }
#b-aim .ring { position: absolute; left: 0; top: 0; width: 40px; height: 40px; margin: -20px 0 0 -20px; border-radius: 50%; box-sizing: border-box;
  border: 1.5px solid rgba(255, 255, 255, 0.9); box-shadow: 0 0 3px rgba(0, 0, 0, 0.7), inset 0 0 3px rgba(0, 0, 0, 0.5); }
#b-aim.far .ring { border-style: dashed; border-color: rgba(255, 255, 255, 0.5); }
#b-aim.true .ring { border-color: var(--gold, #e3bd6d); }
#b-aim .say { position: absolute; left: 0; top: 34px; transform: translateX(-50%); white-space: nowrap; color: #fff; font-size: 13px; letter-spacing: 0.08em;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.8); }
#b-arrows { position: fixed; right: calc(22px + env(safe-area-inset-right)); bottom: calc(104px + env(safe-area-inset-bottom)); z-index: 5; pointer-events: none;
  color: #fff; font-size: 14px; letter-spacing: 0.08em; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); opacity: 0; transition: opacity 0.3s; text-align: right; }
#b-arrows.on { opacity: 0.92; }
#b-arrows b { color: var(--gold, #e3bd6d); font-size: 17px; }
`;

/**
 * @param g the game (main.js)
 * @param beasts createBeasts(): what an arrow can strike
 */
export function createBow(g, beasts) {
  const material = solidMaterial(g.field);
  const scene = g.scene;
  const mesh = (geometry) => {
    const m = new THREE.Mesh(geometry, material);
    m.frustumCulled = false;
    return m;
  };
  // ---- the bows, one of each look, each a group about its grip: +y up the bow, +z to the mark ----
  const made = {};
  for (const look of ['steel', 'wood', 'old']) {
    const S = bowShapes(look);
    const group = new THREE.Group();
    const upper = new THREE.Group();
    const lower = new THREE.Group();
    const upperA = mesh(S.upperA);
    const upperB = mesh(S.upperB);
    upper.add(upperA, upperB);
    lower.add(mesh(S.lower));
    const strings = [0, 1].map(() => mesh(part(limb(0.0045, 0.0045, 1, GUT, 4, {}))));
    group.add(mesh(S.grip), upper, lower, ...strings);
    group.visible = false;
    scene.add(group);
    made[look] = { group, upper, lower, upperA, upperB, strings, S, shard: null };
  }
  const arrowGeometry = arrowShape();
  /** The arrow on the string; the one in the air; and the one that stands where it fell. */
  const nocked = mesh(arrowGeometry);
  const flying = mesh(arrowGeometry);
  const stuck = mesh(arrowGeometry);
  for (const a of [nocked, flying, stuck]) {
    a.visible = false;
    scene.add(a);
  }

  // ---- what is drawn over the picture: the mark he aims by, and how many arrows he has ----
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const aim = document.createElement('div');
  aim.id = 'b-aim';
  aim.innerHTML = '<div class="ring"></div><div class="dot"></div><div class="say"></div>';
  const [ring, , say] = aim.children;
  const count = document.createElement('div');
  count.id = 'b-arrows';
  document.body.append(aim, count);

  const state = {
    /** Which bow is in his hand (a key of KINDS), or null. */
    kind: null,
    /** Whether he may draw it now, and the story's script (for its prompt, and whether E is held). */
    live: false,
    c: null,
    /** How many arrows he has (Infinity: a quiver full, not counted). */
    arrows: Infinity,
    /** How far it is drawn, 0 to 1; how far he has come up into his aim, 0 to 1; how steady he holds, 0 to 1. */
    draw: 0,
    up: 0,
    steady: 0,
    held: 0,
    wasHeld: false,
    /** The story has said this draw breaks the bow. */
    breaks: false,
    broken: false,
    /** What has happened, for the story to take up: counted, and the last of each. */
    shots: 0,
    struck: null,
    missed: null,
    /** An arrow that stands where it fell, to be taken up again: [x, z], or null. */
    lies: null,
    /** The words by the mark ("Too far"), or ''. */
    word: '',
  };
  let time = 0;
  let last = { yaw: 0, pitch: 0 };
  const swayed = { x: 0, y: 0 };
  // (an arrow in the air)
  const flight = { on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), age: 0 };
  // (a length of steel that flew off when it broke)
  const shard = { on: false, mesh: null, p: new THREE.Vector3(), v: new THREE.Vector3(), spin: 0 };

  const dir = new THREE.Vector3();
  const from = new THREE.Vector3();
  const mark = new THREE.Vector3();
  const heart = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const aimed = new THREE.Quaternion();
  const borne = new THREE.Quaternion();
  const nockAt = new THREE.Vector3();
  const gripAt = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const shoulder = new THREE.Vector3();

  const kind = () => KINDS[state.kind];
  const model = () => (state.kind ? made[kind().look] : null);

  /**
   * What lies under the mark: the first of the ground or a beast along the eye's line. Gives the point (in `mark`),
   * and the beast if it is one.
   */
  function sight() {
    g.camera.getWorldDirection(dir);
    from.copy(g.camera.position);
    let best = 150;
    let beast = null;
    // (a beast near the line, and before him)
    for (const b of beasts.beasts) {
      if (b.mode !== 'graze' && b.mode !== 'flee') continue;
      beasts.heart(b, heart);
      const along = tmp.subVectors(heart, from).dot(dir);
      if (along < 3 || along > best) continue;
      const off = tmp2.copy(from).addScaledVector(dir, along).distanceTo(heart);
      if (off < 0.95) {
        best = along;
        beast = b;
      }
    }
    // (the ground)
    let hit = 150;
    for (let t = 2; t < Math.min(best, 150); t += t < 40 ? 0.5 : 1.5) {
      const x = from.x + dir.x * t;
      const z = from.z + dir.z * t;
      if (from.y + dir.y * t < g.heightAt(x, z)) {
        hit = t;
        break;
      }
    }
    if (hit < best) {
      best = hit;
      beast = null;
    }
    mark.copy(from).addScaledVector(dir, best);
    return beast;
  }

  /** The speed an arrow leaves the string with, to fall on `to` from `at`: the low arc, or the bow's longest throw if it is beyond it. */
  function launch(at, to, speed, out) {
    const dx = to.x - at.x;
    const dz = to.z - at.z;
    const d = Math.hypot(dx, dz) || 0.001;
    const dy = to.y - at.y;
    const v2 = speed * speed;
    const under = v2 * v2 - G * (G * d * d + 2 * dy * v2);
    const angle = under >= 0 ? Math.atan2(v2 - Math.sqrt(under), G * d) : 0.72;
    const flat = Math.cos(angle) * speed;
    return out.set((dx / d) * flat, Math.sin(angle) * speed, (dz / d) * flat);
  }

  function loose() {
    const k = kind();
    const beast = sight();
    // (from the string, by his cheek)
    flight.p.copy(nockAt);
    const power = 0.55 + 0.45 * state.draw;
    launch(flight.p, mark, k.speed * power, flight.v);
    // wide of the mark by as much as the ring shows
    const wide = spread();
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * wide * flight.v.length();
    X.crossVectors(flight.v, UP).normalize();
    Y.crossVectors(X, flight.v).normalize();
    flight.v.addScaledVector(X, Math.cos(a) * r).addScaledVector(Y, Math.sin(a) * r);
    flight.on = true;
    flight.age = 0;
    flying.visible = true;
    if (state.arrows !== Infinity) state.arrows--;
    state.shots++;
    state.draw = 0;
    state.steady = 0;
    state.held = 0;
    g.music.twang(state.kind === 'limp' ? 0.35 : 1);
    g.log(`loosed (${state.kind}) at ${beast ? 'a beast' : 'the ground'} ${flight.p.distanceTo(mark).toFixed(0)} m off`);
  }

  /** How wide of the mark the arrow may fly now, radians. */
  function spread() {
    const k = kind();
    return k.scatter * (1 + 2.4 * (1 - state.steady)) * (0.6 + 0.4 / Math.max(0.3, state.draw));
  }

  /** The bow breaks in his hands: the upper limb parts and flies off, and the string goes slack. */
  function snap() {
    const m = model();
    state.broken = true;
    state.draw = 0;
    state.breaks = false;
    m.upperB.getWorldPosition(shard.p);
    m.upperB.getWorldQuaternion(aimed);
    m.upper.remove(m.upperB);
    scene.add(m.upperB);
    m.upperB.position.copy(shard.p);
    m.upperB.quaternion.copy(aimed);
    shard.mesh = m.upperB;
    g.camera.getWorldDirection(dir);
    shard.v.set(dir.x * 2.2 - dir.z * 1.4, 4.2, dir.z * 2.2 + dir.x * 1.4);
    shard.on = true;
    shard.spin = 9;
    for (const s of m.strings) s.visible = false;
    nocked.visible = false;
    g.music.snap();
    g.log('the bow broke');
  }

  /** Puts a length of string between two points of the bow's own frame. */
  function stretch(string, a, b) {
    tmp.subVectors(b, a);
    const len = tmp.length();
    string.position.copy(a).addScaledVector(tmp, 0.5);
    string.scale.set(1, len, 1);
    string.quaternion.setFromUnitVectors(UP, tmp.divideScalar(len || 1));
  }
  const tipA = new THREE.Vector3();
  const tipB = new THREE.Vector3();
  const nockLocal = new THREE.Vector3();

  /** His arms, and the bow in them: called once his clip is set (main.js, g.player.pose). */
  function pose(bones, object, yaw, dt) {
    const m = model();
    if (!m) return;
    const k = kind();
    const up = state.up;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    // which way he aims: along the eye, a little above it for the arrow's fall
    g.camera.getWorldDirection(dir);
    // the bow arm: straight out from its shoulder along the aim
    if (up > 0.01 && bones.upperarm_l) {
      bones.upperarm_l.getWorldPosition(shoulder);
      tmp.copy(shoulder).addScaledVector(dir, 3);
      reachArm(bones, 'l', tmp, tmp2.set(0, -1, 0), up);
    }
    bones.hand_l?.getWorldPosition(hand);
    // the bow as he bears it (along his side, its upper tip forward and up) and as he aims it (upright, to the mark,
    // canted a little as an archer holds it)
    X.set(fz, 0, -fx);
    Y.set(fx * 0.8, 0.6, fz * 0.8).normalize();
    Z.crossVectors(X, Y).normalize();
    borne.setFromRotationMatrix(basis.makeBasis(X, Y, Z));
    Z.copy(dir);
    X.crossVectors(UP, Z).normalize();
    Y.crossVectors(Z, X).normalize();
    aimed.setFromRotationMatrix(basis.makeBasis(X, Y, Z)).multiply(CANT);
    m.group.quaternion.copy(borne).slerp(aimed, up);
    // (the grip a little beyond the wrist, in the palm)
    m.group.position.copy(hand).addScaledVector(dir, 0.06 * up);
    m.group.updateMatrixWorld(true);
    gripAt.copy(m.group.position);
    // the limbs bend back as it is drawn; the string from tip to nock to tip
    const bend = k.flex * state.draw;
    m.upper.rotation.x = -bend;
    m.lower.rotation.x = bend;
    const [ty, tz] = m.S.top;
    const [by, bz] = m.S.foot;
    tipA.set(0, ty * Math.cos(bend) + tz * Math.sin(bend), -ty * Math.sin(bend) + tz * Math.cos(bend));
    tipB.set(0, by * Math.cos(bend) - bz * Math.sin(bend), by * Math.sin(bend) + bz * Math.cos(bend));
    const brace = (tipA.z + tipB.z) / 2;
    nockLocal.set(0, 0.01, brace - PULL * state.draw * up);
    if (!state.broken) {
      stretch(m.strings[0], tipA, nockLocal);
      stretch(m.strings[1], tipB, nockLocal);
    }
    nockAt.copy(nockLocal).applyMatrix4(m.group.matrixWorld);
    // the string hand: to the nock, its elbow out behind him and level
    if (up > 0.01 && !state.broken) {
      const s = Math.sign((shoulder.x - object.position.x) * fz - (shoulder.z - object.position.z) * fx) || 1;
      tmp2.set(-dir.x * 0.5 - fz * s * 0.6, -0.35, -dir.z * 0.5 + fx * s * 0.6);
      reachArm(bones, 'r', nockAt, tmp2, up);
    }
    // the arrow on the string
    const has = state.arrows > 0 && !state.broken && !flight.on;
    nocked.visible = has && up > 0.25 && g.player.visible !== false;
    if (nocked.visible) {
      nocked.position.copy(nockAt);
      nocked.quaternion.copy(m.group.quaternion);
    }
  }

  function update(dt) {
    time += dt;
    const m = model();
    const c = state.c;
    const k = kind();
    // ---- the drawing of it ----
    const can = !!m && state.live && !!c && !g.frozen && state.arrows > 0 && !state.broken && !flight.on;
    let holding = can && c.holding;
    let beast = null;
    if (can) beast = sight();
    const reach = can ? gripAt.distanceTo(mark) : 0;
    const far = can && reach > k.range;
    // (the autopilot lets the string down, and does not loose, when what it drew at has run out of its throw)
    let letDown = false;
    if (can && g.auto) {
      // the autopilot: draws when a beast is within the bow's throw, turns the eye to it, and lets go when it is steady
      const near = nearest(k.range * 0.86);
      letDown = !near && !state.breaks && !state.any;
      // (or, where the story only wants it drawn: draws it, and lets go)
      if (state.breaks || state.any) holding = !(state.draw >= 1 && state.steady > 0.9);
      else holding = !!near && !(state.draw >= 1 && state.steady > 0.9 && beast);
      if (near) turnTo(near, dt, 9);
    } else if (can && state.up > 0.5 && (g.ui.touch || state.assist)) {
      // (a little help for a thumb: the eye is drawn to a beast that is near the mark)
      const near = nearest(k.range * 1.3, 0.1);
      if (near) turnTo(near, dt, 1.6);
    }
    if (holding) {
      state.draw = Math.min(1, state.draw + dt / k.draw);
      state.held += dt;
      // steadier the longer he holds at full draw; less so as the eye moves; and his arm tires
      const turned = Math.abs(wrap(g.eye.yaw - last.yaw)) + Math.abs(g.eye.pitch - last.pitch);
      const tired = Math.max(0, state.held - k.draw - 4.5);
      const want = state.draw >= 1 ? Math.max(0.25, 1 - tired * 0.35) : 0;
      state.steady += (want - state.steady) * Math.min(1, dt * (want > state.steady ? 1.5 : 3));
      state.steady = Math.max(0, state.steady - turned * 5);
      // (the story's breaking of it: as it comes to full draw)
      if (state.breaks && state.draw >= 1) snap();
    } else if (state.wasHeld && m && !state.broken) {
      if (state.draw >= 0.5 && can && !letDown) loose();
      else state.draw = 0;
      state.held = 0;
      state.steady = 0;
    } else {
      state.draw = Math.max(0, state.draw - dt * 3);
      state.held = 0;
    }
    state.wasHeld = holding;
    last = { yaw: g.eye.yaw, pitch: g.eye.pitch };
    // up into his aim while he draws, and for a moment after he looses; down again after
    const aiming = holding || state.draw > 0.02;
    state.up += ((aiming ? 1 : 0) - state.up) * Math.min(1, dt * (aiming ? 9 : 3.5));
    if (state.up < 0.01) state.up = 0;
    // he stands to it, his bow shoulder to the mark; the eye comes in over his other shoulder
    if (m) {
      g.player.face = aiming ? g.eye.yaw - 0.72 : null;
      g.eye.aim(state.up > 0.01 ? state.up : 0);
    }
    // (his arm tires: the mark wanders)
    const tire = holding ? Math.min(1, Math.max(0, state.held - k.draw - 4.5) / 3) : 0;
    const sx = Math.sin(time * 2.3) * 0.006 * tire;
    const sy = Math.sin(time * 1.7 + 1) * 0.005 * tire;
    if (tire > 0 || swayed.x || swayed.y) {
      g.eye.turn(g.eye.yaw + sx - swayed.x, g.eye.pitch + sy - swayed.y);
      swayed.x = sx;
      swayed.y = sy;
    }
    // ---- the mark, and the prompt ----
    const show = can && state.up > 0.3;
    aim.classList.toggle('on', show);
    if (show) {
      const px = Math.max(5, (Math.tan(spread()) / Math.tan((g.camera.fov * Math.PI) / 360)) * (window.innerHeight / 2));
      ring.style.width = ring.style.height = `${(px * 2).toFixed(0)}px`;
      ring.style.margin = `${(-px).toFixed(0)}px 0 0 ${(-px).toFixed(0)}px`;
      aim.classList.toggle('far', far);
      aim.classList.toggle('true', !far && !!beast && state.steady > 0.8);
      const word = far ? 'Too far' : state.draw >= 1 && beast && state.steady > 0.8 ? 'Let go' : '';
      if (word !== state.word) say.textContent = state.word = word;
    }
    if (c && state.live && m) {
      if (can) c.prompt(state.breaks || state.kind !== 'limp' ? 'Draw your bow' : 'Draw the bow', state.draw);
      else if (!g.frozen) c.prompt(null);
    }
    const counted = !!m && state.arrows !== Infinity && state.live;
    count.classList.toggle('on', counted);
    if (counted) {
      const text = state.arrows > 0 ? `<b>${state.arrows}</b> arrow${state.arrows === 1 ? '' : 's'}` : 'No arrow';
      if (count.innerHTML !== text) count.innerHTML = text;
    }
    // ---- an arrow in the air ----
    if (flight.on) fly(dt);
    if (shard.on) {
      shard.v.y -= G * dt;
      shard.p.addScaledVector(shard.v, dt);
      const floor = g.heightAt(shard.p.x, shard.p.z) + 0.02;
      shard.mesh.rotateX(shard.spin * dt);
      if (shard.p.y < floor) {
        shard.p.y = floor;
        shard.on = false;
        shard.mesh.rotation.set(Math.PI / 2, 0, 1.1);
      }
      shard.mesh.position.copy(shard.p);
    }
  }

  /** The one of them nearest him within `far` metres (and, with `cone`, within that angle of the eye's line), or null. */
  function nearest(far, within = null) {
    let best = null;
    let bestD = far;
    if (within != null) g.camera.getWorldDirection(dir);
    for (const b of beasts.alive()) {
      beasts.heart(b, heart);
      const d = Math.hypot(heart.x - g.player.x, heart.z - g.player.z);
      if (d > bestD) continue;
      if (within != null && tmp.subVectors(heart, g.camera.position).normalize().angleTo(dir) > within) continue;
      best = b;
      bestD = d;
    }
    return best;
  }
  /** Turns the eye towards a beast, at `rate`. */
  function turnTo(b, dt, rate) {
    beasts.heart(b, heart);
    g.camera.getWorldDirection(dir);
    tmp.subVectors(heart, g.camera.position);
    const yaw = wrap(Math.atan2(tmp.x, tmp.z) - Math.atan2(dir.x, dir.z));
    const rise = Math.atan2(tmp.y, Math.hypot(tmp.x, tmp.z)) - Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    const step = Math.min(1, dt * rate);
    g.eye.turn(g.eye.yaw + yaw * step, g.eye.pitch - rise * step);
  }

  function fly(dt) {
    const steps = 4;
    const h = dt / steps;
    for (let i = 0; i < steps && flight.on; i++) {
      from.copy(flight.p);
      flight.v.y -= G * h;
      flight.p.addScaledVector(flight.v, h);
      flight.age += h;
      // (its head is ahead of where it is counted from)
      tmp.copy(flight.v).normalize();
      tmp2.copy(flight.p).addScaledVector(tmp, ARROW);
      for (const b of beasts.alive()) {
        beasts.heart(b, heart);
        // (how near the head passes the beast's middle in this step)
        const seg = X.subVectors(tmp2, from);
        const t = THREE.MathUtils.clamp(Y.subVectors(heart, from).dot(seg) / seg.lengthSq(), 0, 1);
        if (Y.copy(from).addScaledVector(seg, t).distanceTo(heart) < beasts.reach) {
          flight.on = false;
          flying.visible = false;
          beasts.strike(b, g.player);
          state.struck = b;
          g.music.thud(0.8);
          g.log('an arrow struck');
          return;
        }
      }
      const floor = g.heightAt(tmp2.x, tmp2.z);
      if (tmp2.y < floor || flight.age > 8) {
        // it stands in the ground where it fell
        flight.on = false;
        flying.visible = false;
        stuck.position.copy(flight.p);
        stuck.position.y = Math.max(flight.p.y, g.heightAt(flight.p.x, flight.p.z) + 0.1);
        stuck.quaternion.setFromUnitVectors(Z.set(0, 0, 1), tmp);
        stuck.visible = true;
        state.lies = [tmp2.x, tmp2.z];
        state.missed = [tmp2.x, tmp2.z];
        g.music.thud(0.3);
        // (one that falls among them, and they are gone)
        const among = beasts.alive().some((b) => Math.hypot(b.x - tmp2.x, b.z - tmp2.z) < 7);
        if (among) beasts.startle(g.player);
        g.log(`an arrow fell${among ? ' among them' : ''}`);
        return;
      }
    }
    flying.position.copy(flight.p);
    flying.quaternion.setFromUnitVectors(Z.set(0, 0, 1), tmp.copy(flight.v).normalize());
  }

  g.each(update);

  return {
    state,
    KINDS,
    /**
     * Puts a bow in his hand (`kind`: 'steel', 'wood', 'limp'), whole and unstrung of any arrow in the air; null
     * takes it from him. `arrows`: how many he has (Infinity: a quiver, not counted).
     */
    take(kindName, { arrows = Infinity } = {}) {
      for (const m of Object.values(made)) m.group.visible = false;
      Object.assign(state, { kind: kindName, arrows, draw: 0, up: 0, steady: 0, held: 0, wasHeld: false, breaks: false, broken: false, struck: null, missed: null, lies: null, live: false });
      flight.on = false;
      flying.visible = stuck.visible = nocked.visible = false;
      g.eye.aim(0);
      g.player.face = null;
      aim.classList.remove('on');
      count.classList.remove('on');
      const m = model();
      if (m) {
        // (made whole again, if it was the one that broke)
        if (m.upperB.parent !== m.upper) {
          m.upper.add(m.upperB);
          m.upperB.position.set(0, 0, 0);
          m.upperB.rotation.set(0, 0, 0);
        }
        shard.on = false;
        for (const s of m.strings) s.visible = true;
        m.group.visible = true;
        g.player.pose = pose;
      } else g.player.pose = null;
    },
    /** He may draw it (the story's script `c` gives the prompt, and says whether E is held), or may not. */
    ready(c, on = true, { any = false } = {}) {
      state.c = c;
      state.live = on;
      // (`any`: the autopilot draws and looses though there is nothing to loose at)
      state.any = any;
      if (!on) {
        state.draw = 0;
        aim.classList.remove('on');
        count.classList.remove('on');
        c?.prompt(null);
      }
    },
    /** The next full draw breaks it (16:18). */
    willBreak() {
      state.breaks = true;
    },
    /** The arrow that stood where it fell is in his hand again. */
    gather() {
      if (!state.lies) return;
      state.lies = null;
      stuck.visible = false;
      if (state.arrows !== Infinity) state.arrows++;
    },
    /** The beast last struck, once (then null); and where the last arrow fell wide, once. */
    takeStruck() {
      const b = state.struck;
      state.struck = null;
      // (his arrow is in it: it comes back to him with the beast)
      if (b && state.arrows !== Infinity) state.arrows++;
      return b;
    },
    takeMissed() {
      const p = state.missed;
      state.missed = null;
      return p;
    },
    get flying() {
      return flight.on;
    },
    /** The broken bow, as it is in his hand: still drawn there (take(null) puts it away). */
    get broken() {
      return state.broken;
    },
  };
}
