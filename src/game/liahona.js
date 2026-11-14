// The ball. "… he beheld upon the ground a round ball of curious workmanship; and it was of fine brass. And within
// the ball were two spindles; and the one pointed the way whither we should go into the wilderness" (1 Nephi 16:10).
//
// In this journey nothing is marked on the land: no diamond over the place to go, no distance. He has the ball, at
// the corner of the picture, and one of its spindles points the way, turning as he turns. That is all the leading
// there is, as it was all they had.
//
// How it is read: the top of the ball is the way he looks. There is a mark at the top of its rim, and when the
// spindle stands under the mark the mark is lit: he is looking the way he should go. The spindle that points is an
// arrow, bright, with a head and no tail; the other is short and dark, and cannot be taken for it. One who goes on
// looking another way is told, under the ball, to turn till the spindle points up, and to which hand: at once the
// first few times, and after that only when he has been a while about it.
//
// "… the pointers which were in the ball … did work according to the faith and diligence and heed which we did give
// unto them" (16:28). Until that verse the spindle simply points. While the camp murmurs it does not (`dead`): the
// spindles hang loose. After the verse it works by heed (`heedful`): going the way it points keeps it true; going
// against it, or wandering wide of the way, and it falters, and at last points nowhere, until he stands and looks
// upon the ball again (Q, or a finger on it). Nothing is lost by it but the time.
//
// "And there was also written upon them a new writing, which was plain to be read … and it was written and changed
// from time to time" (16:29). What was written is not given, so none is made up: looked upon, the ball shows marks
// of light round its rim that are not letters of any tongue, and they are not the same marks twice.
import * as THREE from 'three';
import { pointAhead } from './guidance.js';
import { ball, limb, part, solidMaterial } from './solid.js';

const BRASS = [0.95, 0.7, 0.3];
const BRASS_DARK = [0.62, 0.42, 0.18];

const CSS = /* css */ `
#l-ball { position: fixed; right: calc(16px + env(safe-area-inset-right)); top: calc(52px + env(safe-area-inset-top)); width: 124px; z-index: 6;
  opacity: 0; transform: scale(0.8); transition: opacity 0.6s, transform 0.6s; pointer-events: none; text-align: center; }
#l-ball.on { opacity: 1; transform: none; pointer-events: auto; }
#l-ball svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.55)); }
#l-ball .tell { margin-top: 4px; padding: 4px 6px; border-radius: 4px; background: rgba(24, 18, 10, 0.62); color: #fff; font-size: 12px; letter-spacing: 0.06em; line-height: 1.3;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); opacity: 0; transition: opacity 0.4s; }
#l-ball .tell.on { opacity: 1; }
#l-ball .tell b { font-size: 17px; line-height: 0; margin: 0 3px; color: #ffe9ad; }
#l-ball .tell kbd { display: inline-block; padding: 0 5px; margin-right: 5px; border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 3px; font: inherit; font-size: 11px; }
#l-ball.new svg { animation: l-new 1.4s ease-out; }
@keyframes l-new { 0% { transform: scale(1.25); filter: drop-shadow(0 0 14px rgba(255, 214, 130, 0.95)); } 100% { transform: none; } }
.l-glow { transition: opacity 0.5s; }
.l-way { transition: opacity 0.5s; }
.l-ahead { transition: opacity 0.2s; }
body.l-on #g-objective { max-width: min(400px, calc(100vw - 150px)); }
#l-look { position: fixed; left: 50%; top: max(3vh, 12px); width: min(46vh, 62vw, 380px); transform: translateX(-50%) scale(0.92); z-index: 9;
  opacity: 0; transition: opacity 0.45s, transform 0.45s; pointer-events: none; }
#l-look.on { opacity: 1; transform: translateX(-50%); }
#l-look svg { display: block; width: 100%; height: auto; filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.6)); }
#l-look .hint { margin-top: 6px; text-align: center; color: #fff; font-size: 13px; letter-spacing: 0.06em; text-shadow: 0 1px 5px rgba(0, 0, 0, 0.9); }
.l-mark { stroke: #fff3cf; stroke-width: 1.3; stroke-linecap: round; fill: none; filter: drop-shadow(0 0 2px rgba(255, 226, 150, 0.95)); }
@media (max-width: 600px), (max-height: 500px) { #l-ball { width: 78px; } #l-ball .tell { font-size: 11px; margin-left: -28px; } }
@media (prefers-reduced-motion: reduce) { #l-ball.new svg { animation: none; } }
`;

/** The ball, drawn: brass, worked in rings, and its two spindles (each a group turned about the middle). */
function drawing(id, big) {
  const marks = big ? `<g class="l-writing" id="${id}-writing"></g>` : '';
  return `<svg viewBox="-60 -60 120 120" aria-hidden="true">
  <defs>
    <radialGradient id="${id}-brass" cx="38%" cy="32%" r="78%">
      <stop offset="0" stop-color="#ffe9ad"/><stop offset="0.35" stop-color="#e2ae52"/><stop offset="0.8" stop-color="#9a6a26"/><stop offset="1" stop-color="#5f3f17"/>
    </radialGradient>
    <radialGradient id="${id}-well" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#3a2a14"/><stop offset="1" stop-color="#1c1309"/>
    </radialGradient>
    <radialGradient id="${id}-round" cx="34%" cy="28%" r="80%">
      <stop offset="0" stop-color="rgba(255,255,255,0.28)"/><stop offset="0.3" stop-color="rgba(255,255,255,0)"/><stop offset="0.72" stop-color="rgba(40,22,4,0)"/><stop offset="1" stop-color="rgba(40,22,4,0.55)"/>
    </radialGradient>
    <radialGradient id="${id}-light" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="rgba(255,236,170,0.75)"/><stop offset="0.6" stop-color="rgba(255,214,120,0.18)"/><stop offset="1" stop-color="rgba(255,214,120,0)"/>
    </radialGradient>
  </defs>
  <circle class="l-glow" id="${id}-glow" r="59" fill="url(#${id}-light)"/>
  <circle r="50" fill="url(#${id}-brass)" stroke="#4a3112" stroke-width="1.2"/>
  <circle r="50" fill="url(#${id}-round)"/>
  <!-- curious workmanship: a band worked in studs and leaves round the opening -->
  <circle r="46.5" fill="none" stroke="#6b4a1c" stroke-width="0.7" opacity="0.8"/>
  <g>${Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const [x, y] = [Math.sin(a) * 43.2, -Math.cos(a) * 43.2];
    // (the top of the rim is kept for the mark)
    if (!i) return '';
    return i % 2
      ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#ffe9ad" stroke="#6b4a1c" stroke-width="0.5"/>`
      : `<path d="M0 -3.2 Q2.4 0 0 3.2 Q-2.4 0 0 -3.2 Z" fill="#b98232" stroke="#6b4a1c" stroke-width="0.5" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((a * 180) / Math.PI + 90).toFixed(0)})"/>`;
  }).join('')}</g>
  <circle r="39" fill="url(#${id}-well)" stroke="#c9953e" stroke-width="1.6"/>
  <circle r="37.4" fill="none" stroke="#000" stroke-width="1.6" opacity="0.35"/>
  <g fill="none" stroke="#c9953e" stroke-width="0.6" opacity="0.4">
    <circle r="20"/><path d="M-30 0 A30 30 0 0 1 0 -30"/><path d="M30 0 A30 30 0 0 1 0 30"/>
  </g>
  <!-- the mark at the top of the rim: the way he looks. It is lit when the spindle stands under it -->
  <path d="M0 -39.5 L5.2 -48.5 L-5.2 -48.5 Z" fill="#3a2a14" stroke="#c9953e" stroke-width="0.7"/>
  <g class="l-ahead" id="${id}-ahead" style="opacity: 0">
    <circle r="52.5" fill="none" stroke="#fff3cf" stroke-width="2.4"/>
    <circle cy="-44" r="13" fill="url(#${id}-light)"/>
    <path d="M-17 -34.6 A38.5 38.5 0 0 1 17 -34.6" fill="none" stroke="#ffe9ad" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M0 -39.5 L5.2 -48.5 L-5.2 -48.5 Z" fill="#fff3cf"/>
  </g>
  ${marks}
  <g id="${id}-second"><path d="M0 -21 L1.7 0 L0 8 L-1.7 0 Z" fill="#7a5a2c" stroke="#3a2a14" stroke-width="0.5"/></g>
  <g id="${id}-first" class="l-way"><path d="M0 -36 L7 -20 L2 -23 L2 1 L0 6 L-2 1 L-2 -23 L-7 -20 Z" fill="#fff0c2" stroke="#7a5a22" stroke-width="0.6"/></g>
  <circle r="3.2" fill="#e2ae52" stroke="#4a3112" stroke-width="0.7"/>
  <ellipse cx="-17" cy="-25" rx="13" ry="6" fill="rgba(255,255,255,0.22)" transform="rotate(-38 -17 -25)"/>
</svg>`;
}

/** Marks of light, not letters: short strokes set round the rim, different each time. */
function writing(seed) {
  let s = seed * 9301 + 49297;
  const random = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let out = '';
  for (let i = 0; i < 26; i++) {
    const a = ((i + 0.5) / 26) * Math.PI * 2;
    if (random() < 0.18) continue;
    // (each a few joined strokes in a small square, set upright on the rim)
    const pts = Array.from({ length: 3 + Math.floor(random() * 2) }, () => [(random() - 0.5) * 4.6, (random() - 0.5) * 5.4]);
    const d = pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    out += `<path class="l-mark" d="${d}" transform="rotate(${((a * 180) / Math.PI).toFixed(1)}) translate(0 -27.5)"/>`;
  }
  return out;
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** @param g the game (main.js) */
export function createLiahona(g) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const hud = document.createElement('div');
  hud.id = 'l-ball';
  hud.innerHTML = `${drawing('lb', false)}<div class="tell"></div>`;
  const big = document.createElement('div');
  big.id = 'l-look';
  big.innerHTML = `${drawing('lk', true)}<div class="hint"></div>`;
  document.body.append(hud, big);
  const $ = (id) => document.getElementById(id);
  const parts = { first: [$('lb-first'), $('lk-first')], second: [$('lb-second'), $('lk-second')], glow: [$('lb-glow'), $('lk-glow')], ahead: [$('lb-ahead'), $('lk-ahead')] };
  const tell = hud.querySelector('.tell');
  const hint = big.querySelector('.hint');
  const marks = $('lk-writing');

  // the ball itself, on the ground where it was found
  const material = solidMaterial(g.field, { glint: 0.55 });
  const found = new THREE.Mesh(
    part(
      ball(0.11, BRASS, 6, {}),
      limb(0.113, 0.113, 0.012, BRASS_DARK, 2, {}),
      limb(0.113, 0.113, 0.012, BRASS_DARK, 2, { turn: [Math.PI / 2, 0, 0] }),
      ball(0.018, BRASS_DARK, 2, { at: [0, 0.112, 0] }),
    ),
    material,
  );
  found.visible = false;
  found.frustumCulled = false;
  g.scene.add(found);

  const state = {
    on: false,
    /** Where it points: a place [x, z], a way [[x, z], ...] it leads along, or null. */
    to: null,
    /** The spindles hang loose (the camp murmurs). */
    dead: false,
    /** It works by heed (after 16:28): how much is given it now, 0 to 1, and whether it has stopped. */
    heedful: false,
    heed: 1,
    lost: false,
    /** He looks upon it now (the large view is up): by his own asking, or the story's. */
    looking: false,
    asked: false,
    lookedAt: 0,
    /** Whether marks of light are on it when it is looked upon. */
    written: false,
    /** The spindles: where each lies and how fast it turns (radians on the dial, 0 up, + clockwise). */
    a: 0,
    va: 0,
    b: 2.2,
    vb: 0,
    /** Which way the place lies from him, in the world; and how far. */
    bearing: 0,
    far: 0,
    /** The point it leads to now (for the autopilot, and for the story to ask how near he is). */
    at: null,
    off: 0,
    /** How nearly the spindle stands under the mark at the top of the rim (he looks the way it points), 0 to 1. */
    ahead: 0,
    /** Which hand he is told to turn to (-1 left, 1 right), or 0 when nothing is told him. */
    turn: 0,
  };
  let time = 0;
  // how long he has looked another way than it points; whether he is being told to turn; how often he has been
  let astray = 0;
  let telling = false;
  let taught = 0;
  let seed = 1;
  let wantLook = false;

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ' && !e.repeat) wantLook = true;
  });
  hud.addEventListener('pointerdown', (e) => {
    wantLook = true;
    e.stopPropagation();
  });

  function open(by) {
    state.looking = true;
    state.asked = by;
    state.lookedAt = time;
    marks.innerHTML = state.written ? writing(++seed) : '';
    hint.textContent = by ? (g.ui.touch ? 'Tap the ball to put it away' : 'Q to put it away') : '';
    big.classList.add('on');
  }
  function close() {
    // (one who stood to look is free to go on)
    if (state.looking && state.asked) g.player.face = null;
    state.looking = false;
    big.classList.remove('on');
  }

  function update(dt) {
    time += dt;
    if (!state.on) {
      wantLook = false;
      return;
    }
    // ---- where the way lies ----
    const { x, z } = g.player;
    let target = null;
    state.off = 0;
    if (state.to) {
      if (Array.isArray(state.to[0])) {
        const p = pointAhead(state.to, x, z, 16);
        target = [p.x, p.z];
        state.off = p.off;
      } else target = state.to;
    }
    state.at = target;
    if (target) {
      state.bearing = Math.atan2(target[0] - x, target[1] - z);
      state.far = Math.hypot(target[0] - x, target[1] - z);
    }
    // ---- heed ----
    if (state.heedful && target && !state.dead && !g.frozen) {
      const speed = g.player.speed;
      if (speed > 0.8) {
        const off = Math.abs(wrap(Math.atan2(g.player.vx, g.player.vz) - state.bearing));
        // (given by going as it points; lost by going against it, or wide of the way it leads along)
        const rate = state.off > 16 ? -0.22 : off < 0.7 ? 0.3 : off > 1.3 ? -0.26 : -0.04;
        state.heed = Math.min(1, Math.max(0, state.heed + rate * dt));
      }
      if (state.heed <= 0 && !state.lost) {
        state.lost = true;
        g.log('the ball has stopped: he gave it no heed');
      }
    }
    // ---- looking upon it ----
    const mayLook = !g.frozen && !state.dead;
    if (wantLook && state.looking && state.asked) close();
    else if ((wantLook || (g.auto && state.lost)) && mayLook && !state.looking) open(true);
    wantLook = false;
    if (state.looking && state.asked) {
      // (he stands to look; and what he gives it, it has again)
      g.player.face = g.player.yaw;
      state.heed = Math.min(1, state.heed + dt * 0.7);
      if (state.lost && state.heed > 0.6) {
        state.lost = false;
        g.music.chime();
        g.log('he looked upon the ball: it points again');
      }
      if (time - state.lookedAt > (state.heedful ? 3.2 : 2.6) || g.frozen) close();
    }
    // ---- the spindles ----
    const works = !!target && !state.dead && !state.lost;
    // the one that points the way: to where it lies, as the eye sees it (a needle on its pin: it swings a little past)
    const faint = state.heedful && works ? 1 - state.heed : 0;
    let wantA;
    if (works) wantA = -wrap(state.bearing - g.eye.yaw) + Math.sin(time * 5.3) * 0.5 * faint * faint + Math.sin(time * 2.1 + 1) * 0.35 * faint;
    else if (state.dead) wantA = Math.PI * 0.82 + Math.sin(time * 0.6) * 0.12;
    else wantA = state.a + Math.sin(time * 0.9) * 0.6;
    const pull = works ? 46 : state.dead ? 6 : 3;
    const drag = works ? 9 : 2.2;
    state.va += (wrap(wantA - state.a) * pull - state.va * drag) * dt;
    state.a += state.va * dt;
    // the other spindle: at rest across it (what it showed is not written), stirring a little; loose when the ball is dead
    const wantB = state.dead ? Math.PI * 1.22 + Math.sin(time * 0.5 + 2) * 0.1 : state.a + Math.PI * 0.62 + Math.sin(time * 0.33) * 0.08;
    state.vb += (wrap(wantB - state.b) * (state.dead ? 5 : 14) - state.vb * 5) * dt;
    state.b += state.vb * dt;
    const deg = (a) => ((a * 180) / Math.PI).toFixed(1);
    for (const e of parts.first) e.setAttribute('transform', `rotate(${deg(state.a)})`);
    for (const e of parts.second) e.setAttribute('transform', `rotate(${deg(state.b)})`);
    const glow = works ? (state.heedful ? 0.35 + 0.65 * state.heed : 1) : 0;
    for (const e of parts.glow) e.style.opacity = glow.toFixed(2);
    for (const e of parts.first) e.style.opacity = works ? '1' : '0.55';
    // ---- how he stands to it: the mark at the top of the rim is the way he looks ----
    // (all of it by the spindle as it is seen, so that the mark tells no more than the spindle does)
    const shown = wrap(state.a);
    const wide = Math.abs(shown);
    state.ahead = works ? Math.min(1, Math.max(0, 1 - (wide - 0.16) / 0.3)) : 0;
    for (const e of parts.ahead) e.style.opacity = state.ahead.toFixed(2);
    if (!works || g.frozen || state.looking || wide < 0.45) astray = 0;
    else if (wide > 0.8 || astray > 0) astray += dt;
    if (!astray) telling = false;
    else if (!telling && astray > (taught < 3 ? 1.6 : 6)) {
      telling = true;
      taught++;
    }
    state.turn = telling ? Math.sign(shown) || 1 : 0;
    // what is said under it: when he must look upon it; and how it is read, to one who looks another way
    const turn = `${state.turn < 0 ? '<b>‹</b>Turn left' : 'Turn right<b>›</b>'}<br>till it points up`;
    const say = state.looking ? '' : state.lost ? (g.ui.touch ? 'Tap the ball' : '<kbd>Q</kbd>Look upon the ball') : telling ? turn : '';
    if (tell.dataset.say !== say) {
      tell.dataset.say = say;
      if (say) tell.innerHTML = say;
      tell.classList.toggle('on', !!say);
    }
  }
  g.each(update);

  const api = {
    state,
    /** He has the ball (it is drawn at the corner of the picture), or has not. */
    show(on = true) {
      state.on = on;
      hud.classList.toggle('on', on);
      document.body.classList.toggle('l-on', on);
      if (!on) close();
    },
    /** Where it points: a place [x, z], a way [[x, z], ...] to lead along, or null. A new way is told by a chime. */
    point(to, { quiet = false } = {}) {
      state.to = to;
      if (to && state.on && !quiet) {
        g.music.chime();
        hud.classList.remove('new');
        void hud.offsetWidth;
        hud.classList.add('new');
      }
    },
    /** The spindles hang loose, and point nowhere (while they murmur); or work again. */
    dead(on = true) {
      state.dead = on;
    },
    /** It works according to the heed given it (16:28), or simply points. */
    heedful(on = true) {
      state.heedful = on;
      state.heed = 1;
      state.lost = false;
    },
    /** Whether marks of light are on it when it is looked upon (16:29). */
    written(on = true) {
      state.written = on;
    },
    /** The story shows it large (a card is read under it), and takes it away again. */
    open: () => open(false),
    close,
    /** Where it leads now, { x, z, r }, for the autopilot (director.js, lead); null if it points nowhere. */
    lead(r = 3) {
      return state.at && !state.dead ? { x: state.at[0], z: state.at[1], r, mark: false } : null;
    },
    /** The ball on the ground, where it was found (null takes it away). */
    lie(at) {
      found.visible = !!at;
      if (at) found.position.set(at[0], g.heightAt(at[0], at[1]) + 0.11, at[1]);
    },
    /** As a journey's scene begins: nothing of it left over from the last. */
    reset() {
      Object.assign(state, { to: null, dead: false, heedful: false, heed: 1, lost: false, written: false, at: null, ahead: 0, turn: 0 });
      astray = 0;
      telling = false;
      close();
      api.show(false);
      api.lie(null);
    },
  };
  return api;
}
