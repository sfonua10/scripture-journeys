// "Blow the trumpet in Zion, sanctify a fast, call a solemn assembly: Gather the people" (Joel 2:15–16): the play of
// the journey of Joel 2 (joel.js), a short game against the setting of the sun.
//
// You have a ram's horn. Blown (E, a click, a tap on the prompt), it sounds through the streets, and a ring of light
// goes out over the ground as far as it is heard. Whoever is waiting within it, and in sight of you (not behind a
// house), falls in behind you and goes where you go; lead them into the square inside the gate, and they kneel there
// with the rest of the assembly. Until it is heard, each goes about his own evening (life.js: the elders talk at a
// corner, a woman carries water, the children chase one another), and leaves it off to come. The elders walk
// slowly: run on too far ahead and one of them is left behind, and stands and waits until he hears the horn again.
// The bridegroom and the bride hear it only at their own doors ("let the bridegroom go forth of his chamber, and the
// bride out of her closet").
//
// The sun goes down as you play, from the afternoon to its setting (TUNING.clock seconds), and how long is left is
// shown, with a word as the last minute, the last half minute and the last ten seconds begin. When it is down, or
// when all are come, the assembly begins with whoever is there. Everything that moves runs on the story's clock
// (c.time), which a test steps, so the autopilot (g.auto) can play it through: it goes for the nearest of those who
// wait along the streets, blows when they would hear, and brings them home.
import * as THREE from 'three';
import { reachArm } from '../figure/hold.js';
import { createHalo } from './halo.js';
import { limb, part, solidMaterial } from './solid.js';

/** What can be tuned after it is played. */
export const TUNING = {
  /** Seconds from the first step to sundown. */
  clock: 150,
  /** The hour at the start (the afternoon), and at sundown (sky.js: the sun stays at the sunset's height from 20.4). */
  hours: [15.6, 20.4],
  /** Seconds left at which a word is said that the sun is going down. */
  warn: [60, 30, 10],
  /** How far the horn is heard, metres. */
  hear: 14,
  /** How near to the door of the bridegroom's chamber, or the bride's closet, it must be blown. */
  door: 6,
  /** One who has fallen this far behind stops, and waits to hear the horn again. */
  leave: 32,
  /** Seconds between blasts. */
  cooldown: 1.5,
  /** How fast each kind of person can go, m/s (the elders slowest: you outrun them at a run, 5.3, and at a sprint, 7). */
  speeds: { elder: 2.5, adult: 5.6, child: 6.2, groom: 5.6, bride: 5.6 },
};

const HORN = [0.86, 0.78, 0.6];
const HORN_DARK = [0.46, 0.36, 0.24];
const UP = new THREE.Vector3(0, 1, 0);

/** Where each kind of person walks in the line behind you: the children nearest, the elders last. */
const RANK = { child: 0, adult: 1, groom: 1, bride: 1, elder: 2 };

/** A ram's horn: a run of short lengths through points [y, z], from the mouthpiece to the bell, widening. */
function hornShape() {
  const points = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    points.push([0.46 * Math.sin(k * 1.25) / Math.sin(1.25), 0.16 * (1 - Math.cos(k * 1.6)) / (1 - Math.cos(1.6))]);
  }
  const out = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const [y0, z0] = points[i];
    const [y1, z1] = points[i + 1];
    const len = Math.hypot(y1 - y0, z1 - z0);
    const r0 = 0.012 + 0.036 * (i / 8) ** 1.6;
    const r1 = 0.012 + 0.036 * ((i + 1) / 8) ** 1.6;
    out.push(limb(r1, r0, len * 1.05, i === 0 ? HORN_DARK : HORN, i === 0 ? 4 : 3, { at: [0, (y0 + y1) / 2, (z0 + z1) / 2], turn: [Math.atan2(z1 - z0, y1 - y0), 0, 0] }));
  }
  // (a band of darker horn where the hand holds it)
  out.push(limb(0.03, 0.028, 0.05, HORN_DARK, 4, { at: [0, points[4][0], points[4][1]], turn: [Math.atan2(points[5][1] - points[3][1], points[5][0] - points[3][0]), 0, 0] }));
  return part(...out);
}

const ringVertex = /* glsl */ `
uniform vec3 uCentre;
uniform vec2 uSlope;
uniform float uMax;
out vec2 vUv;
void main() {
  vUv = position.xy;
  vec2 d = position.xy * uMax;
  // (laid on the ground, which rises along the street: uSlope is how much, per metre of x and of z)
  vec3 w = vec3(uCentre.x + d.x, uCentre.y + dot(uSlope, d) + 0.3, uCentre.z + d.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;
const ringFragment = /* glsl */ `
uniform vec3 uColor;
uniform float uR;
uniform float uStrength;
in vec2 vUv;
layout(location = 0) out vec4 outC;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float w = 0.03 + 0.05 * uR;
  float d = (r - uR) / w;
  float band = exp(-d * d);
  float within = r < uR ? 0.1 * (r / max(uR, 0.001)) : 0.0;
  // (light added to the ground, and the frame's alpha left alone, so the ink lines and the paint are as they were)
  outC = vec4(uColor * (band + within) * uStrength, 0.0);
}
`;

const CSS = /* css */ `
#j-hud { position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); right: calc(16px + env(safe-area-inset-right, 0px)); z-index: 5; pointer-events: none;
  display: flex; flex-direction: column; align-items: flex-end; gap: 7px; color: var(--ink, #f4ead6); opacity: 0; transition: opacity 0.4s;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); }
#j-hud.on { opacity: 1; }
#j-hud .row { display: flex; align-items: center; gap: 10px; padding: 5px 13px 5px 10px; border-radius: 999px; background: rgba(24, 18, 12, 0.6); font-size: 14px; letter-spacing: 0.05em; }
#j-hud .row b { color: var(--gold, #e3bd6d); font-size: 18px; }
#j-hud .row b.pop { animation: j-got 0.5s ease-out; }
#j-hud .with { font-size: 13px; letter-spacing: 0.06em; opacity: 0; transition: opacity 0.3s; padding-right: 6px; }
#j-hud .with.on { opacity: 0.9; }
#j-hud .clock b { min-width: 3.1em; text-align: right; font-size: 20px; font-variant-numeric: tabular-nums; }
#j-hud .clock.low b { color: #f2a24e; }
#j-hud .clock.last { animation: j-beat 1s ease-in-out infinite; }
#j-hud .clock.last b { color: #ff8a5c; }
#j-hud .sun { position: relative; width: 40px; height: 20px; overflow: hidden; border-bottom: 1px solid rgba(227, 189, 109, 0.7); }
#j-hud .sun i { position: absolute; width: 13px; height: 13px; margin: -6.5px 0 0 -6.5px; border-radius: 50%; background: radial-gradient(circle, #fff1c4 0%, #f2b04e 70%);
  box-shadow: 0 0 10px rgba(255, 190, 90, 0.85); }
#j-warn { position: fixed; left: 50%; top: calc(12vh + env(safe-area-inset-top, 0px)); transform: translate(-50%, -8px); z-index: 6; pointer-events: none; opacity: 0;
  transition: opacity 0.4s, transform 0.4s; padding: 8px 20px; border-radius: 999px; background: rgba(24, 18, 12, 0.72); border: 1px solid var(--line, rgba(227, 189, 109, 0.35));
  color: var(--ink, #f4ead6); font-size: 18px; letter-spacing: 0.04em; white-space: nowrap; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); }
#j-warn.on { opacity: 1; transform: translate(-50%, 0); }
#j-warn b { color: var(--gold, #e3bd6d); }
@keyframes j-got { 0% { transform: scale(1.5); } 100% { transform: scale(1); } }
@keyframes j-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@media (max-width: 600px) { #j-hud .row { font-size: 13px; } #j-warn { font-size: 15px; } }
`;

/**
 * @param g the game (main.js)
 * @param way how the streets go, for the autopilot: `route(fromX, fromZ, toX, toZ)` gives the next [x, z] to make for
 *   along them
 */
export function createGather(g, { route, life = null }) {
  const scene = g.scene;
  const hornMaterial = solidMaterial(g.field, { glint: 0.08 });

  // ---- the horn in his right hand ----
  const horn = new THREE.Mesh(hornShape(), hornMaterial);
  horn.frustumCulled = false;
  horn.visible = false;
  scene.add(horn);
  // (a light at its bell while it sounds)
  const bellGlow = createHalo(scene, { color: [1.9, 1.45, 0.7], width: 1.6, height: 1.6, rays: 0.6 });

  // ---- the ring its sound makes, over the ground ----
  const ringUniforms = {
    uCentre: { value: new THREE.Vector3() },
    uSlope: { value: new THREE.Vector2() },
    uMax: { value: TUNING.hear },
    uR: { value: 0 },
    uStrength: { value: 0 },
    uColor: { value: new THREE.Color(1.5, 1.1, 0.5) },
  };
  const ring = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: ringVertex,
      fragmentShader: ringFragment,
      uniforms: ringUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      // (the square is laid flat by the vertex shader, which turns its face away from an eye above it)
      side: THREE.DoubleSide,
      // (as halo.js: light added, alpha left alone)
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
    }),
  );
  ring.frustumCulled = false;
  ring.renderOrder = 10;
  ring.visible = false;
  scene.add(ring);

  // ---- what is drawn over the picture ----
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const hud = document.createElement('div');
  hud.id = 'j-hud';
  hud.innerHTML = `<div class="row clock"><div class="sun"><i></i></div><b>2:30</b></div><div class="row"><span><b class="count">0</b> of <span class="all">12</span> gathered</span></div><div class="with"></div>`;
  const warning = document.createElement('div');
  warning.id = 'j-warn';
  document.body.append(hud, warning);
  const clockRow = hud.querySelector('.clock');
  const clockText = hud.querySelector('.clock b');
  const gatheredText = hud.querySelector('.count');
  const allText = hud.querySelector('.row .all');
  const withText = hud.querySelector('.with');
  const sunDot = hud.querySelector('.sun i');
  /** A word over the middle of the picture, for a few seconds of the story's clock (`html`: its words; null hides it). */
  function say(html, seconds = 3) {
    if (html) warning.innerHTML = html;
    warning.classList.toggle('on', !!html);
    s.sayUntil = html ? s.last + seconds : 0;
  }
  const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

  // ---- what stops the sound: the houses (the city's solid boxes, as (u, v) rectangles, those taller than a man) ----
  // (u, v) from (x, z): the valley's frame (world.js), in which the city's boxes stand square
  const toUV = (x, z) => [x * 0.6 + z * 0.8, -x * 0.8 + z * 0.6];
  const walls = g.city.solids
    .filter(({ at, half }) => {
      const ground = g.heightAt(at[0], at[2]);
      // (as high as a man, from the ground up: not a step, nor a beam or an arch overhead)
      return at[1] + half[1] - ground > 1.6 && at[1] - half[1] - ground < 1.2 && half[0] > 0.1 && half[2] > 0.1;
    })
    .map(({ at, half }) => {
      const [u, v] = toUV(at[0], at[2]);
      return [u - half[0], u + half[0], v - half[2], v + half[2]];
    });
  /** Whether nothing stands between two places on the ground. */
  function clear(ax, az, bx, bz) {
    const [u0, v0] = toUV(ax, az);
    const [u1, v1] = toUV(bx, bz);
    const du = u1 - u0;
    const dv = v1 - v0;
    for (const [a, b, c, d] of walls) {
      // (the segment against the rectangle, by its slabs: Liang–Barsky)
      let t0 = 0.02;
      let t1 = 0.98;
      let ok = true;
      for (const [p, q] of [[-du, u0 - a], [du, b - u0], [-dv, v0 - c], [dv, d - v0]]) {
        if (Math.abs(p) < 1e-9) {
          if (q < 0) ok = false;
        } else {
          const r = q / p;
          if (p < 0) t0 = Math.max(t0, r);
          else t1 = Math.min(t1, r);
        }
        if (!ok || t0 > t1) break;
      }
      if (ok && t0 <= t1) return false;
    }
    return true;
  }

  // ---- the state of one run ----
  const s = {
    live: false,
    people: [],
    seats: {},
    inSquare: () => false,
    home: [0, 0],
    began: 0,
    last: 0,
    lastBlast: -99,
    blowK: 0,
    gathered: 0,
    c: null,
    shown: { gathered: -1, with: -1, sun: -1, clock: '' },
    warned: 0,
    tick: 0,
    sayUntil: 0,
    prompting: false,
    autoBlast: 0,
  };
  // (Space jumps; the horn is blown with E, Enter, a click or a tap, so a jump does not sound it)
  let lastKey = '';
  addEventListener('keydown', (e) => {
    if (!e.repeat) lastKey = e.code;
  });
  addEventListener('pointerdown', () => (lastKey = 'pointer'));

  // Every frame, whether a run is on or not (the assembly after it, too):
  //  - a child who kneels or sits is lifted by what the pose lowers a grown man and a child does not need (npc.js
  //    lowers every figure by the same metres, whatever its height), so the small ones are not sunk in the ground;
  //  - one who comes between the eye and him, close by it, is not drawn while they are there (a line of people
  //    walks behind him, where the eye is).
  const SINK = { kneel: 0.46, sit: 0.76 };
  g.each(() => {
    const eye = g.camera.position;
    for (const p of s.people) {
      const npc = p.npc;
      if (p.scale < 0.99) npc.raise = (1 - p.scale) * (SINK.kneel * (npc.kneelK ?? 0) + SINK.sit * (npc.sitK ?? 0));
      const near = s.live && (p.hidden || npc.w.group.visible) && Math.hypot(npc.x - eye.x, npc.z - eye.z) < 1.9 && eye.y < g.heightAt(npc.x, npc.z) + 2.3 * p.scale;
      if (near !== !!p.hidden) {
        p.hidden = near;
        npc.w.group.visible = !near;
      }
    }
  });

  const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const fromMe = (p) => dist(p.x ?? p[0], p.z ?? p[1], g.player.x, g.player.z);

  // ---- his arm, and the horn in his hand: called each frame once his clip is set (main.js, g.player.pose) ----
  const head = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const mouth = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  const borne = new THREE.Quaternion();
  const raised = new THREE.Quaternion();
  function pose(bones, object, yaw) {
    if (!s.live) return;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const k = s.blowK;
    // the hand to his mouth (a little before it), the elbow out and down
    if (k > 0.01 && bones.Head) {
      bones.Head.getWorldPosition(head);
      mouth.set(head.x + fx * 0.2, head.y - 0.02, head.z + fz * 0.2);
      bend.set(fz * 0.6, -1, -fx * 0.6);
      reachArm(bones, 'r', mouth, bend, k);
    }
    bones.hand_r?.getWorldPosition(hand);
    // the horn: hanging from his hand as he goes, its bell down; raised, its bell forward and up
    X.set(fz, 0, -fx);
    Y.set(fx * 0.25, -0.95, fz * 0.25).normalize();
    Z.crossVectors(X, Y).normalize();
    borne.setFromRotationMatrix(basis.makeBasis(X, Y, Z));
    Y.set(fx * 0.85, 0.5, fz * 0.85).normalize();
    Z.crossVectors(X, Y).normalize();
    raised.setFromRotationMatrix(basis.makeBasis(X, Y, Z));
    horn.quaternion.copy(borne).slerp(raised, k);
    // (held near its middle: the mouthpiece is back towards his lips)
    Y.set(0, 1, 0).applyQuaternion(horn.quaternion);
    horn.position.copy(hand).addScaledVector(Y, -0.16 * k - 0.05);
    horn.visible = g.player.visible !== false;
  }

  /** Puts everyone where they are when it begins, each about his own evening, and the sun where it is. */
  function begin({ people, seats, inSquare, home }) {
    life?.clear();
    s.people = people.map((p) => {
      const npc = g.cast.get(p.name);
      npc.place(p.at[0], p.at[1], Math.atan2(p.face[0] - p.at[0], p.face[1] - p.at[1])).face(...p.face);
      Object.assign(npc, { kneel: 0, sit: 0, bow: 0, aura: 0 });
      // (a light over each who waits: soft, and seen over the houses)
      p.light ??= createHalo(scene, { color: [1.5, 1.25, 0.8], width: 1.0, height: 1.0, rays: 0 });
      p.light.mesh.material.depthTest = false;
      const scale = npc.man.object.scale.x;
      return { ...p, npc, scale, state: 'waiting', called: 0, rank: RANK[p.kind] ?? 1, hear: p.kind === 'groom' || p.kind === 'bride' ? TUNING.door : TUNING.hear, flash: 0 };
    });
    // (what each is about, until the horn is heard: life.js)
    if (life) for (const p of s.people) if (p.day?.length) life.live(p.npc, p.day);
    s.seats = { child: [...seats.child], adult: [...seats.adult], elder: [...seats.elder] };
    s.inSquare = inSquare;
    s.home = home;
    s.gathered = 0;
    s.lastBlast = -99;
    s.blowK = 0;
    s.shown = { gathered: -1, with: -1, sun: -1, clock: '' };
    s.warned = 0;
    s.tick = 0;
    s.last = 0;
    say(null);
    clockRow.classList.remove('low', 'last');
    allText.textContent = String(s.people.length);
    g.setHour(TUNING.hours[0]);
    g.player.pose = pose;
    s.live = true;
    hud.classList.add('on');
    hud.style.display = '';
    draw(0, TUNING.clock);
  }

  /** The horn is blown where he stands: who hears it, and is in sight, comes. */
  function blast(t) {
    s.lastBlast = t;
    const [x, z] = [g.player.x, g.player.z];
    const answered = [];
    for (const p of s.people) {
      if (p.state !== 'waiting') continue;
      if (fromMe(p.npc) > p.hear || !clear(x, z, p.npc.x, p.npc.z)) continue;
      p.state = 'following';
      p.called = t;
      p.flash = 1;
      answered.push(p);
      // (each leaves off what he was about, and sets down what he carries)
      if (p.day) life?.end(p.npc);
      if (p.carries && g.props.carrying(p.carries)) g.props.show(p.carries, [p.npc.x + Math.sin(p.npc.yaw) * 0.6, p.npc.z + Math.cos(p.npc.yaw) * 0.6]);
    }
    if (answered.length) {
      line();
      for (const p of answered) Object.assign(p.npc, { maxSpeed: TUNING.speeds[p.kind] ?? 5.6 });
      g.log(`the trumpet: ${answered.map((p) => p.kind).join(', ')} came`);
    }
    g.music.horn?.(answered.length);
    // the ring, laid on the ground as it slopes there
    const e = 6;
    const y = g.heightAt(x, z);
    ringUniforms.uCentre.value.set(x, y, z);
    ringUniforms.uSlope.value.set((g.heightAt(x + e, z) - g.heightAt(x - e, z)) / (2 * e), (g.heightAt(x, z + e) - g.heightAt(x, z - e)) / (2 * e));
    ring.visible = true;
  }

  /** Those who follow, in their order behind him: the children nearest, then the rest, the elders last. */
  function line() {
    const following = s.people.filter((p) => p.state === 'following').sort((a, b) => a.rank - b.rank || a.called - b.called);
    const home = s.inSquare(g.player.x, g.player.z);
    following.forEach((p, i) => {
      const gap = home ? 2 + 0.3 * i : Math.min(14.5, 2.4 + 1.1 * i);
      const side = (i % 2 ? 1 : -1) * (0.6 + 0.3 * (i % 3));
      if (p.npc.mode !== 'follow' || Math.abs(p.npc.followGap - gap) > 0.05) p.npc.follow(g.player, gap, side, { whole: true });
      p.npc.maxSpeed = TUNING.speeds[p.kind] ?? 5.6;
    });
  }

  /** Into the square: to a place in the rows, where they kneel (the children sit). */
  function seat(p) {
    p.state = 'gathered';
    s.gathered++;
    const rows = s.seats[p.kind === 'child' ? 'child' : p.kind === 'elder' ? 'elder' : 'adult'];
    // (more of one kind than there are places in its row: by the middle of the square)
    const spot = rows.shift() ?? { at: [s.home[0] + 0.7 * s.gathered, s.home[1]], facing: [s.home[0] + 20, s.home[1]] };
    p.spot = spot;
    const [fx, fz] = spot.facing;
    p.npc.walk([spot.at], p.kind === 'elder' ? 1.3 : 1.8).then(() => {
      if (p.state !== 'gathered') return;
      p.npc.face(fx, fz);
      if (p.kind === 'child') p.npc.sit = 1;
      else p.npc.kneel = 1;
    });
    g.music.pluck();
    line();
  }

  /** The HUD: how long until sundown, how many are gathered, how many are with him. */
  function draw(k, left) {
    const clock = mmss(Math.ceil(left));
    if (s.shown.clock !== clock) {
      clockText.textContent = clock;
      clockRow.classList.toggle('low', left <= 30);
      clockRow.classList.toggle('last', left <= 10 && left > 0);
      s.shown.clock = clock;
    }
    if (s.shown.gathered !== s.gathered) {
      gatheredText.textContent = String(s.gathered);
      if (s.shown.gathered >= 0) {
        gatheredText.classList.remove('pop');
        void gatheredText.offsetWidth;
        gatheredText.classList.add('pop');
      }
      s.shown.gathered = s.gathered;
    }
    const n = s.people.filter((p) => p.state === 'following').length;
    if (s.shown.with !== n) {
      withText.textContent = n === 1 ? '1 with you' : `${n} with you`;
      withText.classList.toggle('on', n > 0);
      s.shown.with = n;
    }
    const step = Math.round(k * 60);
    if (s.shown.sun !== step) {
      // (along an arc, from high on the left to the line on the right)
      const a = k * Math.PI * 0.5;
      sunDot.style.left = `${8 + 30 * Math.sin(a)}px`;
      sunDot.style.top = `${6 + 16 * (1 - Math.cos(a))}px`;
      s.shown.sun = step;
    }
  }

  /** One frame of play. Resolves true when the sun is down, or all are come. */
  function frame(c, t) {
    const dt = Math.min(0.1, Math.max(0, t - s.last));
    s.last = t;
    const k = Math.min(1, t / TUNING.clock);
    const left = Math.max(0, TUNING.clock - t);
    g.setHour(TUNING.hours[0] + (TUNING.hours[1] - TUNING.hours[0]) * k, true);
    // the word that the sun is going down: a minute left, half a minute, ten seconds; and each of the last ten counted
    const due = TUNING.warn.filter((w) => left <= w).length;
    if (due > s.warned) {
      s.warned = due;
      const w = TUNING.warn[due - 1];
      say(w >= 60 ? `The sun is going down: <b>${w === 60 ? 'one minute' : mmss(w)}</b> left` : w > 10 ? `<b>${w} seconds</b> of daylight left` : '<b>Ten seconds!</b> Bring them in', w > 10 ? 3.2 : 2.6);
      g.music.thud?.(0.7);
    }
    if (left <= 10 && left > 0 && Math.ceil(left) !== s.tick) {
      s.tick = Math.ceil(left);
      g.music.thud?.(0.3);
    }
    if (s.sayUntil && t > s.sayUntil) say(null);
    let since = t - s.lastBlast;
    const ready = since >= TUNING.cooldown;
    // the prompt, while the horn may be blown
    const prompt = ready && !g.frozen;
    if (prompt !== s.prompting) {
      c.prompt(prompt ? 'Sound the trumpet' : null);
      s.prompting = prompt;
    }
    if (ready && c.pressed && lastKey !== 'Space') blast(t);
    if (ready && g.auto && s.autoBlast) blast(t);
    s.autoBlast = 0;
    since = t - s.lastBlast;
    // the horn at his lips while it sounds; the ring going out, and fading
    s.blowK = since < 1.6 ? Math.min(1, since / 0.15, (1.6 - since) / 0.3) : 0;
    if (ring.visible) {
      const r = Math.min(1, since / 0.9);
      ringUniforms.uR.value = 1 - (1 - r) ** 2;
      ringUniforms.uStrength.value = Math.max(0, 1 - since / 1.3);
      if (since > 1.3) ring.visible = false;
    }
    if (s.blowK > 0.3) {
      horn.updateMatrixWorld();
      const bell = new THREE.Vector3(0, 0.46, 0.16).applyMatrix4(horn.matrixWorld);
      bellGlow.update(t * 6);
      bellGlow.set(bell.x, bell.y, bell.z, 0.35 * s.blowK * (0.8 + 0.2 * Math.sin(t * 30)));
    } else bellGlow.set(0, 0, 0, 0);
    // those who wait, those who follow, those left behind, those come home
    const home = s.inSquare(g.player.x, g.player.z);
    let regap = home !== s.wasHome;
    s.wasHome = home;
    for (const p of s.people) {
      const npc = p.npc;
      if (p.state === 'following') {
        if (s.inSquare(npc.x, npc.z)) seat(p);
        else if (fromMe(npc) > TUNING.leave) {
          p.state = 'waiting';
          npc.stop();
          npc.face(g.player.x, g.player.z);
          g.log(`left behind: ${p.kind}`);
          regap = true;
        }
      }
      // the light over one who waits; bright as they answer, and gone
      p.flash = Math.max(0, p.flash - dt * 1.4);
      const over = 1.95 * p.scale + 0.55;
      const waits = p.state === 'waiting' ? 0.22 + 0.06 * Math.sin(t * 2.4 + p.at[0]) : 0;
      const shine = Math.max(waits, p.flash * 0.9);
      if (npc.far) p.light.set(0, 0, 0, 0);
      else p.light.set(npc.x, g.heightAt(npc.x, npc.z) + over, npc.z, shine);
    }
    if (regap) line();
    // the autopilot
    if (g.auto) steer(c);
    draw(k, left);
    return k >= 1 || s.people.every((p) => p.state === 'gathered');
  }

  /** The autopilot (a test's): the nearest of those who wait, along the streets; home when it is time. */
  function steer(c) {
    const me = [g.player.x, g.player.z];
    const t = s.last;
    const following = s.people.filter((p) => p.state === 'following');
    const waiting = s.people.filter((p) => p.state === 'waiting');
    // (blow when any who wait would hear it, and see him)
    if (waiting.some((p) => fromMe(p.npc) < p.hear - 1.5 && clear(me[0], me[1], p.npc.x, p.npc.z))) s.autoBlast = 1;
    const late = TUNING.clock - t < 35;
    let goal = null;
    if (following.length && (following.length >= 5 || !waiting.length || late)) goal = s.home;
    else {
      const options = waiting.map((p) => [p.npc.x, p.npc.z]);
      options.sort((a, b) => fromMe(a) - fromMe(b));
      goal = options[0] ?? s.home;
    }
    // wait for the hindmost to come up, when he is a long way back
    const hindmost = Math.max(0, ...following.map((p) => fromMe(p.npc)));
    if (hindmost > 16 || (goal === s.home && fromMe(s.home) < 2.5)) return c.lead(null);
    const [x, z] = route(me[0], me[1], goal[0], goal[1]);
    c.lead({ x, z, r: 1.6, mark: false });
  }

  return {
    TUNING,
    begin,
    /** Plays one run, to sundown or till all are come. Resolves with what was done. */
    async run(c) {
      s.c = c;
      const began = c.time;
      s.last = 0;
      s.prompting = false;
      await c.until(() => frame(c, c.time - began));
      const time = c.time - began;
      const all = s.people.every((p) => p.state === 'gathered');
      say(all ? `All the people are gathered, with <b>${mmss(TUNING.clock - time)}</b> of daylight to spare` : 'The sun has set', 4);
      if (!all) g.music.thud?.(0.9);
      c.prompt(null);
      c.lead(null);
      s.prompting = false;
      // (whoever still follows stands where they are; the rest leave off what they were doing)
      for (const p of s.people) if (p.state === 'following') p.npc.stop().face(g.player.x, g.player.z);
      life?.clear();
      const out = {
        gathered: s.gathered,
        of: s.people.length,
        time,
        /** Seconds of daylight that were left. */
        spare: Math.max(0, TUNING.clock - time),
        all,
        /** Who came, and where in the rows: [{ npc, kind, spot: { at, facing } }]. */
        seated: s.people.filter((p) => p.state === 'gathered').map((p) => ({ npc: p.npc, kind: p.kind, spot: p.spot })),
      };
      g.log(`gathered ${out.gathered} of ${out.of} in ${time.toFixed(0)} s`);
      return out;
    },
    /** Takes it all away: the horn from his hand, the lights, what is drawn over the picture. */
    stop() {
      s.live = false;
      g.player.pose = null;
      horn.visible = false;
      ring.visible = false;
      bellGlow.set(0, 0, 0, 0);
      life?.clear();
      say(null);
      for (const p of s.people) {
        p.light?.set(0, 0, 0, 0);
        // (one not drawn for being in the eye's way is drawn again)
        if (p.hidden) p.npc.w.group.visible = true;
        p.hidden = false;
      }
      hud.classList.remove('on');
    },
  };
}
