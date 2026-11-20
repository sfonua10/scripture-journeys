// "That which the palmerworm hath left hath the locust eaten; and that which the locust hath left hath the cankerworm
// eaten; and that which the cankerworm hath left hath the caterpiller eaten" (Joel 1:4); "And I will restore to you
// the years that the locust hath eaten" (2:25): the play of the journey of Joel 1 and 2 (locust-years.js), a short
// game you cannot win by yourself.
//
// A plot of ripe corn stands on the hill. Four swarms come upon it, one after another, each greater than the last
// (the four of 1:4, by their names). A swarm settles and eats the corn down where it is, then moves to where corn
// still stands. Run at one and it rises and flies off a little way; press (E, a click, a tap on the prompt) to shout
// and wave, which drives off every swarm near you. You keep what you can: by the fourth swarm it is more than one
// can keep. When they are gone, what is left is counted; and then the rain comes and all of it is restored, which
// is none of your doing (restore()).
//
// The corn is the meadow's own grass (crop.js). Everything that moves runs on the story's clock (c.time), which a
// test steps, so the autopilot (g.auto) can play it through: it runs at the nearest swarm that is eating.
import * as THREE from 'three';
import { reachArm } from '../figure/hold.js';
import { createCrop, LOOKS } from './crop.js';
import { createMiniHud } from './minihud.js';
import { createWeather } from './weather.js';

/** What can be tuned after it is played. */
export const TUNING = {
  /** The plot: its corner in the world, and how many metres along x and z. */
  plot: { x0: -18, z0: -36, nx: 24, nz: 16 },
  /**
   * The four swarms: how many clouds of them, how many seconds a cloud takes to eat the ground it has settled on,
   * and how fast it flies to the next, m/s.
   */
  waves: [
    { name: 'The palmerworm', n: 2, site: 5, speed: 5 },
    { name: 'The locust', n: 3, site: 4.5, speed: 5.5 },
    { name: 'The cankerworm', n: 4, site: 4, speed: 6 },
    { name: 'The caterpiller', n: 5, site: 3.5, speed: 6.5 },
  ],
  /** Seconds each swarm stays. */
  stay: 20,
  /** Seconds between one swarm's going and the next one's coming. */
  lull: 3,
  /** How far round its middle a cloud eats, metres. */
  eats: 2.1,
  /** How near you must run to a cloud for it to rise, and how near it must be to be driven off by a shout, metres. */
  near: 2.8,
  shout: 6,
  /** Seconds between shouts. */
  cooldown: 3,
  /** How far a cloud flies when it is driven off, metres, and how long before it settles again, seconds. */
  flight: 8,
  away: 0.6,
  /** The hours of the day: as the swarms come, and at the end. */
  hours: [13.5, 16.5],
};

const CLOUDS = 5;
const EACH = 210;

const swarmVertex = /* glsl */ `
uniform vec4 uSwarm[${CLOUDS}];   // where each cloud's middle is, and how many of it are there (0 to 1)
uniform vec2 uShape[${CLOUDS}];   // how far it is spread, and how high it flies
uniform float uTime;
uniform float uPixels;
in float aWho;
in vec3 aSeed;
out float vShow;
void main() {
  int w = int(aWho + 0.5);
  vec4 sw = uSwarm[w];
  vec2 shape = uShape[w];
  float t = uTime;
  // each goes round the middle its own way, and up and down
  float a = t * (1.1 + aSeed.x * 2.4) + aSeed.y * 43.0;
  float r = shape.x * (0.2 + 0.8 * sqrt(aSeed.z));
  vec3 p = sw.xyz + vec3(cos(a) * r, 0.0, sin(a * 0.83 + aSeed.x * 9.0) * r);
  p.y += 0.12 + shape.y * (0.25 + aSeed.y) * (0.75 + 0.25 * sin(t * 3.3 + aSeed.z * 31.0));
  vShow = step(aSeed.y, sw.w);
  vec4 v = viewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * v;
  float flutter = 0.75 + 0.25 * sin(t * 37.0 + aSeed.x * 60.0);
  gl_PointSize = vShow * max(2.0, 0.095 * flutter * projectionMatrix[1][1] * uPixels * 0.5 / max(0.1, -v.z));
}
`;
const swarmFragment = /* glsl */ `
uniform vec3 uSunColor;
uniform vec3 uSkyColor;
in float vShow;
layout(location = 0) out vec4 outC;
void main() {
  if (vShow < 0.5 || length(gl_PointCoord - 0.5) > 0.5) discard;
  // (dark, and it writes a figure's ink, so each is a dark fleck against the corn and the sky: solid.js)
  outC = vec4(vec3(0.12, 0.1, 0.05) * (uSunColor * 0.42 + uSkyColor * 0.3), 0.15);
}
`;

const ease = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** @param g the game (main.js) */
export function createSwarm(g) {
  const crop = createCrop(g, TUNING.plot);
  const weather = createWeather(g);
  const hud = createMiniHud(['wave', 'kept']);
  const F = g.field.uniforms;

  // ---- the clouds of them ----
  const geometry = new THREE.BufferGeometry();
  const who = new Float32Array(CLOUDS * EACH);
  const seeds = new Float32Array(CLOUDS * EACH * 3);
  let seed = 5;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < CLOUDS * EACH; i++) {
    who[i] = Math.floor(i / EACH);
    seeds.set([random(), random(), random()], i * 3);
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CLOUDS * EACH * 3), 3));
  geometry.setAttribute('aWho', new THREE.BufferAttribute(who, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
  const uniforms = {
    uSwarm: { value: Array.from({ length: CLOUDS }, () => new THREE.Vector4()) },
    uShape: { value: Array.from({ length: CLOUDS }, () => new THREE.Vector2(1, 1)) },
    uTime: F.uTime,
    uPixels: { value: 720 },
    uSunColor: F.uSunColor,
    uSkyColor: F.uSkyColor,
  };
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: swarmVertex, fragmentShader: swarmFragment, uniforms }));
  points.frustumCulled = false;
  points.visible = false;
  g.scene.add(points);
  g.each(() => {
    if (points.visible) uniforms.uPixels.value = g.canvas.height;
  });

  // ---- the state of one run ----
  const s = {
    live: false,
    health: new Float32Array(crop.cells),
    level: new Uint8Array(crop.cells),
    clouds: Array.from({ length: CLOUDS }, (_, i) => ({ i, mode: 'gone', x: 0, z: 0, to: null, there: 0, since: 0, until: 0, spread: 1, lift: 1 })),
    wave: -1,
    last: 0,
    shouted: -9,
    armsK: 0,
    tick: 0,
    prompting: false,
    scared: 0,
  };
  let lastKey = '';
  addEventListener('keydown', (e) => {
    if (!e.repeat) lastKey = e.code;
  });
  addEventListener('pointerdown', () => (lastKey = 'pointer'));

  const LEVELS = 5;
  /** A cell's corn as high as its health has it. */
  function show(cell) {
    const level = Math.ceil(clamp01(s.health[cell]) * LEVELS);
    if (level === s.level[cell]) return;
    s.level[cell] = level;
    crop.stand(cell, level === LEVELS ? null : 0.035 + 0.16 * level);
  }
  const standing = () => {
    let n = 0;
    for (let k = 0; k < crop.cells; k++) if (s.health[k] > 0.4) n++;
    return n;
  };

  // ---- both arms up as he shouts: called each frame once his clip is set (main.js, g.player.pose) ----
  const T = new THREE.Vector3();
  const bend = new THREE.Vector3();
  function pose(bones, object, yaw) {
    if (!s.live || s.armsK < 0.02) return;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const y = g.heightAt(g.player.x, g.player.z);
    const wave = Math.sin(s.last * 16) * 0.16;
    for (const [side, k] of [['r', 1], ['l', -1]]) {
      T.set(g.player.x + fx * 0.25 + fz * (0.42 + wave * k) * k, y + 2.05, g.player.z + fz * 0.25 - fx * (0.42 + wave * k) * k);
      bend.set(fz * k, -0.4, -fx * k);
      reachArm(bones, side, T, bend, s.armsK);
    }
  }

  /** Lays the plot out in ripe corn, with the afternoon's sun. */
  function begin() {
    for (let k = 0; k < crop.cells; k++) {
      crop.look(k, LOOKS.corn, 0.1);
      crop.stand(k, null);
    }
    crop.show();
    crop.border();
    s.health.fill(1);
    s.level.fill(LEVELS);
    for (const cloud of s.clouds) Object.assign(cloud, { mode: 'gone', there: 0 });
    Object.assign(s, { live: true, wave: -1, last: 0, shouted: -9, armsK: 0, tick: 0, prompting: false, scared: 0 });
    points.visible = true;
    weather.clear();
    weather.hour(TUNING.hours[0]);
    g.player.pose = pose;
    hud.show(true);
    hud.say(null);
    hud.clock(null);
    hud.set('wave', null);
    hud.set('kept', `Corn standing <b>100%</b>`);
    place();
  }

  /** Where corn still stands, for a cloud at (x, z) to go to: the best of a few places taken at random. */
  function pick(x, z) {
    let best = null;
    let score = -Infinity;
    for (let i = 0; i < 14; i++) {
      const cell = Math.floor(random() * crop.cells);
      if (s.health[cell] <= 0.4) continue;
      const [cx, cz] = crop.centre(cell);
      // (near itself, away from him, and not where another cloud already is)
      let v = -0.05 * Math.hypot(cx - x, cz - z) + 0.03 * Math.min(14, Math.hypot(cx - g.player.x, cz - g.player.z)) + random() * 0.4;
      for (const other of s.clouds) if (other.mode !== 'gone' && other.to && Math.hypot(other.to[0] - cx, other.to[1] - cz) < TUNING.eats * 1.6) v -= 1;
      if (v > score) {
        score = v;
        best = [cx, cz];
      }
    }
    return best;
  }

  /** The clouds where the graphics card draws them. */
  function place() {
    for (const cloud of s.clouds) {
      const y = g.heightAt(cloud.x, cloud.z);
      uniforms.uSwarm.value[cloud.i].set(cloud.x, y, cloud.z, cloud.there);
      uniforms.uShape.value[cloud.i].set(cloud.spread, cloud.lift);
    }
  }

  /** A swarm comes: its clouds rise over the hill's edge and make for the corn. */
  function arrive(w, t) {
    const wave = TUNING.waves[w];
    s.wave = w;
    s.clouds.forEach((cloud, i) => {
      if (i >= wave.n) return void Object.assign(cloud, { mode: 'gone', there: 0 });
      // (out of the north, 2:20: beyond the plot's far side from the city, spread along it)
      const x = crop.x0 + ((i + 0.5) / wave.n) * (crop.x1 - crop.x0);
      Object.assign(cloud, { mode: 'fly', x: x - 4, z: crop.z0 - 13 - 3 * i, to: pick(x, crop.z0 + 4) ?? [x, crop.z0 + 4], there: 0, since: t, spread: 1.6, lift: 2.2 });
    });
    hud.say(`<b>${wave.name}</b> is come`, t, 3);
    g.music.thud?.(0.8);
    g.log(`wave ${w + 1}: ${wave.name}`);
  }

  /** A cloud is driven off: it rises, and flies from him a little way. */
  function scare(cloud, t) {
    const dx = cloud.x - g.player.x;
    const dz = cloud.z - g.player.z;
    const d = Math.hypot(dx, dz) || 1;
    // (away from him, and turned a little to one side or the other, so it does not always go the same way)
    const turn = (random() - 0.5) * 1.4;
    const ux = (dx / d) * Math.cos(turn) - (dz / d) * Math.sin(turn);
    const uz = (dx / d) * Math.sin(turn) + (dz / d) * Math.cos(turn);
    Object.assign(cloud, { mode: 'flee', to: [cloud.x + ux * TUNING.flight, cloud.z + uz * TUNING.flight], since: t });
    s.scared++;
  }

  /** One frame of a cloud. */
  function fly(cloud, t, dt) {
    const wave = TUNING.waves[Math.max(0, s.wave)];
    const near = Math.hypot(cloud.x - g.player.x, cloud.z - g.player.z);
    const go = (speed) => {
      const dx = cloud.to[0] - cloud.x;
      const dz = cloud.to[1] - cloud.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.4) return true;
      const step = Math.min(d, speed * dt);
      cloud.x += (dx / d) * step;
      cloud.z += (dz / d) * step;
      return false;
    };
    const shape = (spread, lift) => {
      cloud.spread += (spread - cloud.spread) * Math.min(1, dt * 3);
      cloud.lift += (lift - cloud.lift) * Math.min(1, dt * 3);
    };
    if (cloud.mode === 'gone') return;
    if (cloud.mode === 'leave') {
      cloud.there = Math.max(0, cloud.there - dt * 0.5);
      shape(4, 5);
      go(7);
      if (cloud.there <= 0) cloud.mode = 'gone';
      return;
    }
    cloud.there = Math.min(1, cloud.there + dt * 0.7);
    if (cloud.mode === 'fly') {
      shape(1.5, 1.8);
      if (!cloud.to || go(wave.speed)) {
        cloud.mode = 'eat';
        cloud.since = t;
      }
      if (near < TUNING.near && crop.inside(cloud.x, cloud.z, 4)) scare(cloud, t);
    } else if (cloud.mode === 'eat') {
      shape(TUNING.eats * 0.95, 0.55);
      let any = false;
      crop.along(cloud.x, cloud.z, cloud.x, cloud.z, TUNING.eats, (cell) => {
        if (s.health[cell] <= 0) return;
        const [cx, cz] = crop.centre(cell);
        // (soonest at its middle)
        s.health[cell] -= (dt / wave.site) * (1.5 - 0.7 * (Math.hypot(cx - cloud.x, cz - cloud.z) / TUNING.eats));
        if (s.health[cell] > 0.05) any = true;
        show(cell);
      });
      if (near < TUNING.near) scare(cloud, t);
      else if (!any) {
        cloud.to = pick(cloud.x, cloud.z);
        cloud.mode = cloud.to ? 'fly' : 'eat';
      }
    } else if (cloud.mode === 'flee') {
      shape(2.4, 2.6);
      if (go(8.5) || t - cloud.since > 2.5) {
        cloud.mode = 'wait';
        cloud.until = t + TUNING.away;
      }
    } else if (cloud.mode === 'wait') {
      shape(2.2, 2.2);
      if (t >= cloud.until) {
        cloud.to = pick(cloud.x, cloud.z);
        cloud.mode = cloud.to ? 'fly' : 'wait';
        cloud.until = t + 1;
      }
    }
  }

  /** One frame of play. Resolves true when the fourth swarm is gone. */
  function frame(c, t) {
    const dt = Math.min(0.1, Math.max(0, t - s.last));
    s.last = t;
    const round = TUNING.stay + TUNING.lull;
    const w = Math.floor(t / round);
    const into = t - w * round;
    const total = TUNING.waves.length * round;
    weather.hour(TUNING.hours[0] + (TUNING.hours[1] - TUNING.hours[0]) * Math.min(1, t / total), true);
    if (w < TUNING.waves.length && w !== s.wave && into > 0.4) arrive(w, t);
    // the swarm's time is up: it rises, and goes on over the hill
    if (s.wave >= 0 && w === s.wave && into > TUNING.stay) {
      for (const cloud of s.clouds) {
        if (cloud.mode === 'gone' || cloud.mode === 'leave') continue;
        Object.assign(cloud, { mode: 'leave', to: [cloud.x + 30, cloud.z + 46] });
      }
    }
    const left = Math.max(0, TUNING.stay - into);
    if (s.wave === w && left <= 5 && left > 0 && Math.ceil(left) !== s.tick) {
      s.tick = Math.ceil(left);
      g.music.thud?.(0.25);
    }
    hud.tick(t);
    // the shout
    const ready = t - s.shouted >= TUNING.cooldown && !g.frozen;
    if (ready !== s.prompting) {
      c.prompt(ready ? 'Drive them off' : null);
      s.prompting = ready;
    }
    const auto = g.auto && s.clouds.some((cloud) => (cloud.mode === 'eat' || cloud.mode === 'fly') && Math.hypot(cloud.x - g.player.x, cloud.z - g.player.z) < TUNING.shout - 1.5 && crop.inside(cloud.x, cloud.z, 2));
    if (ready && ((c.pressed && lastKey !== 'Space') || auto)) {
      s.shouted = t;
      let n = 0;
      for (const cloud of s.clouds) {
        if ((cloud.mode === 'eat' || cloud.mode === 'fly') && Math.hypot(cloud.x - g.player.x, cloud.z - g.player.z) < TUNING.shout) {
          scare(cloud, t);
          n++;
        }
      }
      g.music.thud?.(n ? 0.6 : 0.3);
      if (n) g.music.pluck?.();
    }
    s.armsK = clamp01(1 - (t - s.shouted) / 0.7) ** 0.5;
    for (const cloud of s.clouds) fly(cloud, t, dt);
    place();
    // the autopilot: at the nearest cloud that is eating (or on its way to)
    if (g.auto) {
      const targets = s.clouds.filter((cloud) => cloud.mode === 'eat' || cloud.mode === 'fly');
      targets.sort((a, b) => (a.mode === 'eat' ? 0 : 6) + Math.hypot(a.x - g.player.x, a.z - g.player.z) - (b.mode === 'eat' ? 0 : 6) - Math.hypot(b.x - g.player.x, b.z - g.player.z));
      const to = targets[0];
      c.lead(to ? { x: to.x, z: to.z, r: 1.2, mark: false } : null);
    }
    hud.clock(s.wave === w && into <= TUNING.stay ? left : null, 'Swarm passes in');
    hud.set('wave', s.wave >= 0 ? `${TUNING.waves[s.wave].name} · <b>${s.wave + 1}</b> of ${TUNING.waves.length}` : null);
    hud.set('kept', `Corn standing <b>${Math.round((100 * standing()) / crop.cells)}%</b>`, true);
    return t >= total - TUNING.lull + 2.5;
  }

  const ramp = (c, seconds, fn) => {
    const began = c.time;
    return c.until(() => {
      const k = Math.min(1, (c.time - began) / seconds);
      fn(k);
      return k >= 1;
    });
  };

  return {
    TUNING,
    crop,
    begin,
    /** Plays the four swarms. Resolves with what is left. */
    async run(c) {
      const began = c.time;
      s.last = 0;
      await c.until(() => frame(c, c.time - began));
      c.prompt(null);
      c.lead(null);
      s.prompting = false;
      s.armsK = 0;
      for (const cloud of s.clouds) Object.assign(cloud, { mode: 'gone', there: 0 });
      place();
      hud.clock(null);
      hud.set('wave', null);
      const kept = standing();
      g.log(`kept ${kept} of ${crop.cells} cells; drove them off ${s.scared} times`);
      return { cells: crop.cells, kept, scared: s.scared };
    },
    /**
     * The rain, and what was eaten restored: it clouds over and rains; the corn comes up green over all the plot;
     * the sun comes out, and it ripens. None of it waits on him.
     */
    async restore(c) {
      hud.set('kept', null);
      await ramp(c, 2.6, (k) => {
        weather.cloud(ease(k));
        weather.rain(ease(k));
      });
      await c.wait(2);
      const from = Float32Array.from({ length: crop.cells }, (_, k) => crop.standing(k));
      for (let k = 0; k < crop.cells; k++) crop.look(k, LOOKS.green, 0.1);
      crop.show();
      g.music.chime?.();
      await ramp(c, 6, (k) => {
        for (let cell = 0; cell < crop.cells; cell++) {
          if (from[cell] > 0.98) continue;
          crop.stand(cell, from[cell] + (0.98 - from[cell]) * ease(clamp01(k * 1.5 - 0.5 * crop.chance(cell, 9))));
        }
      });
      for (let k = 0; k < crop.cells; k++) crop.stand(k, null);
      s.health.fill(1);
      s.level.fill(LEVELS);
      let step = -1;
      const hour = TUNING.hours[1];
      await ramp(c, 5, (k) => {
        weather.rain(1 - ease(k));
        weather.cloud(1 - ease(k));
        weather.hour(hour + 1.6 * ease(k), true);
        const now = Math.floor(k * 4);
        if (now !== step) {
          step = now;
          const dry = LOOKS.green[0] + (LOOKS.corn[0] - LOOKS.green[0]) * (now / 4);
          for (let cell = 0; cell < crop.cells; cell++) crop.look(cell, [dry, 1, 1], 0.1);
          crop.show();
        }
      });
      weather.clear();
      weather.hour(hour + 1.6);
    },
    /** The eye's place for the end: over the plot from its south-west corner, towards the city. */
    watch: () => ({ from: [crop.x0 - 5, crop.z0 - 6, 4.2], to: [(crop.x0 + crop.x1) / 2 + 2, (crop.z0 + crop.z1) / 2 + 2, 0.4] }),
    /** Takes away what is drawn over the picture (the plot stays as it is). */
    rest() {
      s.live = false;
      g.player.pose = null;
      hud.hide();
    },
    /** Takes it all away, and puts the hill back as it was. */
    stop() {
      s.live = false;
      g.player.pose = null;
      points.visible = false;
      weather.clear();
      crop.restore();
      hud.hide();
    },
  };
}
