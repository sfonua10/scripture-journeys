// The sea of the book of Jonah: "the LORD sent out a great wind into the sea, and there was a mighty tempest in the
// sea, so that the ship was like to be broken" (1:4); and the deep he was cast into, "the depth closed me round
// about, the weeds were wrapped about my head" (2:5); and the great fish (1:17).
//
// None of it is the land's: a journey that goes to sea hides the land (main.js, g.land) and the story draws these in
// its place. The sea is one sheet of water about the ship, raised into waves in its own shader and painted as the
// rest is: flat tones, a clean turn where a wave's face goes into its own shade, foam on the crests, and the sky
// held in it where it is seen low. It takes the field's light and haze, so the hour and the weather the story sets
// are the sea's too.
//
// The ship does not move: the sea does. It rolls about the ship's keel and rises and falls against her side, so the
// deck stays the level ground that is walked on, and what is seen from it is a ship rolling.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COMMON } from '../lib/index.js';

const seaVertex = /* glsl */ `
${COMMON}
uniform float uState;   // 0 a calm sea, 1 a mighty tempest
uniform vec4 uHull;     // the ship: her middle (x, z, in the sea's own frame), half her length, half her beam (0: no ship)
uniform vec2 uHullDir;  // the way she lies
uniform vec2 uDrift;    // how far the water has gone by her, metres
out vec3 vWorld;
out vec3 vNormal;
out vec2 vSea;     // where on the sea, in its own frame
out float vHigh;   // how high the water stands here, of how high it can
out float vHull;   // 1 at her side, 2 a ship's beam off, and so on

// one wave: the way it runs, its length, its height, how steep it is drawn
void wave(vec2 p, vec2 dir, float len, float high, float speed, inout float h, inout vec2 slope) {
  float k = TAU / len;
  float ph = dot(p, dir) * k - uTime * speed * k;
  // (crests sharper than troughs: a sine raised a little to a point)
  float s = sin(ph);
  float c = cos(ph);
  float y = s + 0.18 * cos(2.0 * ph);
  h += high * y;
  slope += dir * (high * k * (c - 0.36 * sin(2.0 * ph)));
}

void main() {
  vec2 p = position.xz + uDrift;
  float far = length(position.xz);
  // in a calm, a long low swell; in the tempest, seas as high as the ship's side and higher, from more than one way
  float st = uState;
  float h = 0.0;
  vec2 slope = vec2(0.0);
  float big = mix(0.1, 1.0, st);
  wave(p, normalize(vec2(0.9, 0.42)), mix(34.0, 46.0, st), 0.95 * big, mix(3.0, 8.5, st), h, slope);
  wave(p, normalize(vec2(0.55, -0.83)), mix(21.0, 27.0, st), 0.6 * big, mix(2.4, 7.0, st), h, slope);
  wave(p, normalize(vec2(-0.3, 0.95)), 13.0, 0.34 * big, mix(2.0, 5.6, st), h, slope);
  wave(p, normalize(vec2(0.98, -0.2)), 7.3, 0.17 * mix(0.25, 1.0, st), mix(1.6, 4.4, st), h, slope);
  wave(p, normalize(vec2(-0.7, -0.7)), 3.9, 0.07 * mix(0.3, 1.0, st), 3.0, h, slope);
  // (far off they are too small to draw truly: they die away into the haze)
  float ease = 1.0 / (1.0 + far * 0.004);
  // under the ship and against her side the water is held down: no sea comes up through her deck
  float hull = 9.0;
  if (uHull.z > 0.0) {
    vec2 o = position.xz - uHull.xy;
    hull = length(vec2(dot(o, uHullDir) / uHull.z, dot(o, vec2(-uHullDir.y, uHullDir.x)) / uHull.w));
    ease *= smoothstep(0.85, 2.3, hull);
  }
  h *= ease;
  slope *= ease;
  vHigh = h / max(2.0 * big, 0.2);
  vHull = hull;
  vSea = p;
  vec4 w = modelMatrix * vec4(position.x, h, position.z, 1.0);
  vWorld = w.xyz;
  vNormal = normalize(mat3(modelMatrix) * vec3(-slope.x, 1.0, -slope.y));
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const seaFragment = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 outC;
uniform vec3 uZenith, uMid, uHorizon;
uniform float uState;
uniform vec4 uHull;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vSea;
in float vHigh;
in float vHull;
void main() {
  vec3 V = normalize(uCamPos - vWorld);
  float dist = distance(uCamPos, vWorld);
  // the small water on the great: ripples the wind makes, finer than the waves that are built
  vec2 r1 = texture(tNoiseHi, vSea / 6.1 + uTime * vec2(0.03, 0.017)).rg - 0.5;
  vec2 r2 = texture(tNoiseHi, vSea.yx / 1.9 - uTime * vec2(0.05, 0.04)).ba - 0.5;
  vec2 rip = (r1 * 0.5 + r2 * 0.25) * mix(0.25, 0.75, uState) / (1.0 + dist * 0.02);
  vec3 N = normalize(vNormal + vec3(rip.x, 0.0, rip.y));
  // the body of the water, in two tones with a clean turn between: a face turned to the light, a face turned from it
  vec3 light = normalize(vec3(uSunDir.x, max(uSunDir.y, 0.35), uSunDir.z));
  float lit = smoothstep(-0.02, 0.1, dot(N, light) - light.y + 0.05 + rip.x * 0.2);
  vec3 calm = mix(vec3(0.02, 0.085, 0.13), vec3(0.05, 0.2, 0.25), lit);
  vec3 wild = mix(vec3(0.03, 0.06, 0.07), vec3(0.085, 0.15, 0.155), lit);
  vec3 body = mix(calm, wild, uState);
  // (green where the light comes through the top of a wave)
  body += vec3(0.0, 0.07, 0.055) * smoothstep(0.35, 0.95, vHigh) * mix(0.5, 1.0, uState);
  body *= uSkyColor * 1.25 + uSunColor * 0.42 * lit;
  // the sky held in it, where it is looked along
  vec3 R = reflect(-V, N);
  R.y = abs(R.y);
  float up = max(R.y, 0.0);
  // (the sky overhead, not the dust at the sky's foot: looked along, the sea is still the sea)
  vec3 sky = mix(uMid, uZenith, smoothstep(0.1, 0.8, up));
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 col = mix(body, sky, clamp(fres * mix(0.6, 0.4, uState), 0.0, 1.0));
  // the sun's path on a calm sea
  col += uSunColor * pow(max(dot(R, uSunDir), 0.0), 240.0) * 1.6 * (1.0 - uState);
  // foam: on the crests, in streaks down the backs of the waves, and where the sea works against the ship's side
  float n1 = texture(tNoiseHi, vSea / 8.3 + uTime * vec2(0.012, -0.02)).r;
  float n2 = texture(tNoiseHi, vSea / 2.7 - uTime * vec2(0.03, 0.011)).g;
  float streak = n1 * 0.62 + n2 * 0.38;
  float foam = smoothstep(0.52, 0.66, vHigh * 0.55 + streak * mix(0.42, 0.62, uState) - 0.1);
  foam = max(foam, smoothstep(0.66, 0.74, streak) * 0.55 * uState);
  if (uHull.z > 0.0) foam = max(foam, (1.0 - smoothstep(1.02, 1.5, vHull)) * smoothstep(0.92, 1.02, vHull) * smoothstep(0.3, 0.55, streak + 0.25 * uState));
  foam *= 1.0 / (1.0 + dist * 0.006);
  vec3 white = vec3(0.86, 0.9, 0.9) * (uSkyColor * 1.5 + uSunColor * 0.5);
  col = mix(col, white, clamp(foam, 0.0, 1.0));
  // Far off it goes into the sky's foot, with no edge between them; in the tempest that is not far. (Its own haze,
  // not the land's: the plain it is laid on is thick with dust, which the sea is not.)
  col = mix(col, uFogColor, 1.0 - exp(-dist * mix(0.0009, 0.0045, uState)));
  outC = vec4(col, 1.0);
}
`;

/** A round sheet of water, fine about its middle and coarse far off, out to where the haze has it. */
function sheet() {
  const SEG = 96;
  const rings = [0];
  for (let r = 0.6; r < 4200; r *= 1.075) rings.push(r);
  const pos = [];
  const index = [];
  for (let i = 0; i < rings.length; i++) {
    for (let k = 0; k < SEG; k++) {
      const a = (k / SEG) * Math.PI * 2;
      pos.push(Math.cos(a) * rings[i], 0, Math.sin(a) * rings[i]);
    }
  }
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let k = 0; k < SEG; k++) {
      const a = i * SEG + k;
      const b = i * SEG + ((k + 1) % SEG);
      const c = (i + 1) * SEG + k;
      const d = (i + 1) * SEG + ((k + 1) % SEG);
      // (wound so that the water's upper face is its front)
      index.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(index);
  return g;
}

// ---- rain: slanting strokes about the eye ----
const rainVertex = /* glsl */ `
uniform float uTime;
uniform vec3 uEye;
uniform vec3 uFall;   // metres a second it goes: down, and with the wind
in float aEnd;
out float vEnd;
void main() {
  // (each stroke falls through a box about the eye, and comes in again at its top)
  vec3 box = vec3(36.0, 22.0, 36.0);
  vec3 p = position + uFall * uTime;
  p = mod(p - uEye + box * 0.5, box) - box * 0.5 + uEye;
  p -= normalize(uFall) * aEnd * 0.9;
  vEnd = aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;
const rainFragment = /* glsl */ `
uniform float uStrength;
uniform vec3 uColor;
in float vEnd;
layout(location = 0) out vec4 outC;
void main() {
  outC = vec4(uColor * uStrength * (1.0 - vEnd * 0.7), 0.0);
}
`;

// ---- the deep: what is seen under the water, all round ----
const deepVertex = /* glsl */ `
out vec3 vDir;
void main() {
  vDir = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const deepFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uDepth;   // 0 just under the waves, 1 where no light comes
uniform float uDark;    // 1: no light at all (the belly of the fish)
uniform sampler2D tNoiseHi;
in vec3 vDir;
layout(location = 0) out vec4 outC;
void main() {
  vec3 d = normalize(vDir);
  // light above, failing as it goes down: green-blue under the waves, and under that only dark
  float up = d.y * 0.5 + 0.5;
  vec3 top = mix(vec3(0.1, 0.42, 0.44), vec3(0.012, 0.06, 0.09), uDepth);
  vec3 low = mix(vec3(0.01, 0.07, 0.11), vec3(0.002, 0.008, 0.016), uDepth);
  vec3 col = mix(low, top, smoothstep(0.25, 1.0, up));
  // the day coming down through the water in shafts that waver
  vec2 q = d.xz / max(d.y + 0.35, 0.2);
  float shafts = texture(tNoiseHi, q * 0.11 + uTime * vec2(0.006, 0.004)).r * texture(tNoiseHi, q * 0.27 - uTime * vec2(0.008, 0.003)).g;
  col += vec3(0.16, 0.3, 0.26) * smoothstep(0.16, 0.42, shafts) * smoothstep(0.45, 1.0, up) * (1.0 - uDepth);
  col *= 1.0 - uDark;
  outC = vec4(col, 0.25);
}
`;

// ---- weeds, and what drifts in the water ----
const weedVertex = /* glsl */ `
${COMMON}
in vec4 aWeed;   // where it is rooted (x, z, about the middle), how tall, its own number
uniform vec3 uMiddle;
uniform float uRise;    // how far the water has gone up past him, metres
out vec3 vWorld;
out float vAlong;
out float vTone;
void main() {
  float tall = aWeed.z;
  float t = position.y;   // 0 at its foot, 1 at its tip
  // (the deep goes up past him as he goes down: the weeds with it, coming round again from below)
  float span = 34.0;
  float foot = mod(aWeed.w * span - uRise, span) - span * 0.62;
  vec3 p = uMiddle + vec3(aWeed.x, foot + t * tall, aWeed.y);
  float sway = sin(uTime * 0.7 + aWeed.w * 40.0 + t * 3.0) * 0.5 + sin(uTime * 0.31 + aWeed.w * 17.0 + t * 5.3) * 0.3;
  p.x += sway * t * 0.9;
  p.z += cos(uTime * 0.53 + aWeed.w * 23.0 + t * 4.0) * t * 0.6;
  // a ribbon, turned to the eye
  vec3 toEye = normalize(uCamPos - p);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toEye));
  p += side * position.x * (0.2 + 0.16 * sin(t * 9.0 + aWeed.w * 30.0)) * (1.0 - t * 0.7);
  vWorld = p;
  vAlong = t;
  vTone = aWeed.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;
const weedFragment = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 outC;
uniform float uSeen;
in vec3 vWorld;
in float vAlong;
in float vTone;
void main() {
  vec3 col = mix(vec3(0.02, 0.07, 0.05), vec3(0.07, 0.2, 0.1), vAlong) * (0.7 + 0.6 * fract(vTone * 7.3));
  col *= (uSkyColor * 1.4 + uSunColor * 0.3) * uSeen;
  outC = vec4(applyFog(col, vWorld), 1.0);
}
`;

// ---- the great fish: a shape in the water ----
const fishVertex = /* glsl */ `
${COMMON}
uniform float uSwim;
out vec3 vWorld;
out vec3 vN;
out float vBelly;
void main() {
  vec3 p = position;
  // (it swims: its body goes from side to side, most at the tail)
  float along = clamp((6.0 - p.z) / 14.0, 0.0, 1.0);
  p.x += sin(uSwim - along * 3.2) * along * along * 2.4;
  vBelly = smoothstep(0.2, -1.2, position.y);
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
const fishFragment = /* glsl */ `
${COMMON}
layout(location = 0) out vec4 outC;
uniform float uSeen;
in vec3 vWorld;
in vec3 vN;
in float vBelly;
void main() {
  vec3 N = normalize(vN);
  // dark above and paler beneath, lit from above as all is in the sea, in two tones
  float lit = smoothstep(0.0, 0.2, N.y);
  vec3 col = mix(vec3(0.035, 0.055, 0.07), vec3(0.16, 0.2, 0.21), vBelly);
  col *= mix(0.55, 1.0, lit) * (uSkyColor * 1.5 + uSunColor * 0.4) * uSeen;
  outC = vec4(applyFog(col, vWorld), 0.15);
}
`;

/** The fish's body: turned about the line of its back, deep and broad, with its tail and fins; it faces +z. */
function fishShape() {
  const outline = [[0, -8.2], [0.5, -8], [1.1, -6.6], [1.9, -4], [3.0, 0], [3.5, 3], [3.3, 5.4], [2.4, 7.4], [1.0, 8.4], [0, 8.6]];
  const body = new THREE.LatheGeometry(outline.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  body.rotateX(Math.PI / 2);
  body.scale(0.8, 1, 1);
  const flat = (points, at, turn) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(shape);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(1, 1, 1)));
    return g;
  };
  // the tail (upright, as a fish's is), a fin on the back, one at each side
  const tail = flat([[0, 0], [-3.2, 3.6], [-2.2, 0], [-3.2, -3.6]], [0, 0, -7.4], [0, Math.PI / 2, 0]);
  const back = flat([[0, 0], [-2.6, 2.4], [-4.2, 0]], [0, 3.1, 2.2], [0, Math.PI / 2, 0]);
  const finL = flat([[0, 0], [3.4, -1.4], [1.2, -2.6]], [2.3, -1.2, 3.2], [0.5, 0, 0]);
  const finR = flat([[0, 0], [-3.4, -1.4], [-1.2, -2.6]], [-2.3, -1.2, 3.2], [0.5, 0, 0]);
  const parts = [body, tail, back, finL, finR].map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    return n;
  });
  const g = mergeGeometries(parts);
  g.computeVertexNormals();
  return g;
}

/**
 * @param scene where it is drawn
 * @param field the land's field: its uniforms are the light and the haze the sea takes
 * @param sky the sky (its colours are held in the water)
 */
export function createSea(scene, field, sky) {
  const s = sky.uniforms;
  const uniforms = {
    ...field.uniforms,
    uZenith: s.uZenith,
    uMid: s.uMid,
    uHorizon: s.uHorizon,
    uState: { value: 0 },
    uHull: { value: new THREE.Vector4(0, 0, 0, 0) },
    uHullDir: { value: new THREE.Vector2(1, 0) },
    uDrift: { value: new THREE.Vector2() },
  };
  const mesh = new THREE.Mesh(sheet(), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: seaVertex, fragmentShader: seaFragment, uniforms }));
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  // rain
  const DROPS = 900;
  const rainPos = new Float32Array(DROPS * 6);
  const rainEnd = new Float32Array(DROPS * 2);
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < DROPS; i++) {
    const p = [random() * 36, random() * 22, random() * 36];
    rainPos.set([...p, ...p], i * 6);
    rainEnd[i * 2 + 1] = 1;
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  rainGeometry.setAttribute('aEnd', new THREE.BufferAttribute(rainEnd, 1));
  const rainUniforms = { uTime: field.uniforms.uTime, uEye: { value: new THREE.Vector3() }, uFall: { value: new THREE.Vector3(7, -19, 3) }, uStrength: { value: 0 }, uColor: { value: new THREE.Color(0.5, 0.56, 0.6) } };
  const rain = new THREE.LineSegments(
    rainGeometry,
    new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: rainVertex, fragmentShader: rainFragment, uniforms: rainUniforms, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }),
  );
  rain.frustumCulled = false;
  rain.renderOrder = 9;
  rain.visible = false;
  scene.add(rain);

  // the deep
  const deepUniforms = { uTime: field.uniforms.uTime, uDepth: { value: 0 }, uDark: { value: 0 }, tNoiseHi: field.uniforms.tNoiseHi };
  const deep = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: deepVertex, fragmentShader: deepFragment, uniforms: deepUniforms, side: THREE.BackSide, depthWrite: false }));
  deep.frustumCulled = false;
  deep.renderOrder = -9;
  deep.visible = false;
  scene.add(deep);

  // weeds: ribbons rooted round about him, a few near enough to be wrapped about his head
  const WEEDS = 70;
  const ribbon = new THREE.PlaneGeometry(1, 1, 1, 10);
  ribbon.translate(0, 0.5, 0);
  const weedGeometry = new THREE.InstancedBufferGeometry();
  weedGeometry.setAttribute('position', ribbon.attributes.position);
  weedGeometry.setIndex(ribbon.index);
  const weedData = new Float32Array(WEEDS * 4);
  for (let i = 0; i < WEEDS; i++) {
    const a = random() * Math.PI * 2;
    const r = i < 8 ? 0.7 + random() * 0.9 : 2.5 + random() * 15;
    weedData.set([Math.cos(a) * r, Math.sin(a) * r, 5 + random() * 9, random()], i * 4);
  }
  weedGeometry.setAttribute('aWeed', new THREE.InstancedBufferAttribute(weedData, 4));
  weedGeometry.instanceCount = WEEDS;
  const weedUniforms = { ...field.uniforms, uMiddle: { value: new THREE.Vector3() }, uRise: { value: 0 }, uSeen: { value: 1 } };
  const weeds = new THREE.Mesh(weedGeometry, new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: weedVertex, fragmentShader: weedFragment, uniforms: weedUniforms, side: THREE.DoubleSide }));
  weeds.frustumCulled = false;
  weeds.visible = false;
  scene.add(weeds);

  // the great fish
  const fishUniforms = { ...field.uniforms, uSwim: { value: 0 }, uSeen: { value: 1 } };
  const fish = new THREE.Mesh(fishShape(), new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: fishVertex, fragmentShader: fishFragment, uniforms: fishUniforms, side: THREE.DoubleSide }));
  fish.frustumCulled = false;
  fish.visible = false;
  scene.add(fish);

  const axis = new THREE.Vector3(1, 0, 0);
  const sea = {
    mesh,
    /**
     * Lays the sea about (x, z), its water at `level`; with a ship lying there along (dx, dz), `half` her length and
     * `beam` half her breadth, which the waves are held down under.
     */
    place(x, z, level, ship = null) {
      mesh.position.set(x, level, z);
      sea.level = level;
      if (ship) {
        const d = Math.hypot(ship.dir[0], ship.dir[1]) || 1;
        axis.set(ship.dir[0] / d, 0, ship.dir[1] / d);
        uniforms.uHull.value.set(0, 0, ship.half, ship.beam);
        uniforms.uHullDir.value.set(axis.x, axis.z);
      } else uniforms.uHull.value.set(0, 0, 0, 0);
      mesh.quaternion.identity();
    },
    show(on = true) {
      mesh.visible = on;
    },
    /** How the sea is: 0 calm, 1 the tempest. */
    state(k) {
      uniforms.uState.value = k;
    },
    get wild() {
      return uniforms.uState.value;
    },
    /** The ship rolls `roll` radians about her keel and rides `heave` metres up: so the sea is turned and let down. */
    ride(roll, heave) {
      mesh.quaternion.setFromAxisAngle(axis, roll);
      mesh.position.y = sea.level - heave;
    },
    /** Rain, 0 to 1, slanting with the wind (x, z: the way it blows). */
    rain(k, wind = [7, 3]) {
      rainUniforms.uStrength.value = 0.5 * k;
      rainUniforms.uFall.value.set(wind[0], -19, wind[1]);
      rain.visible = k > 0.01;
    },
    /**
     * The deep, about (x, y, z): `depth` 0 just under the waves to 1 where no light comes; `dark` 1 for no light at
     * all; `rise` how far the water has gone up past him (the weeds go by with it); `weeds` whether there are any.
     */
    deep(on, { at = [0, 0, 0], depth = 0, dark = 0, rise = 0, weeds: grown = true } = {}) {
      deep.visible = on;
      weeds.visible = on && grown;
      if (!on) return;
      deepUniforms.uDepth.value = depth;
      deepUniforms.uDark.value = dark;
      weedUniforms.uMiddle.value.set(...at);
      weedUniforms.uRise.value = rise;
      weedUniforms.uSeen.value = (1 - 0.75 * depth) * (1 - dark);
    },
    /** The great fish at (x, y, z), heading `yaw` (0 along +z), `seen` 0 to 1; null to take it away. */
    fish(at, yaw = 0, seen = 1) {
      fish.visible = !!at;
      if (!at) return;
      fish.position.set(...at);
      fish.rotation.set(0, yaw, 0);
      fishUniforms.uSeen.value = seen;
    },
    /** Each frame: the water goes by the ship (`way`, m/s along her), and what is about the eye stays about it. */
    update(dt, camera, way = 0) {
      uniforms.uDrift.value.x += axis.x * way * dt;
      uniforms.uDrift.value.y += axis.z * way * dt;
      rainUniforms.uEye.value.copy(camera.position);
      deep.position.copy(camera.position);
      deep.scale.setScalar(camera.far * 0.4);
      fishUniforms.uSwim.value += dt * 2.2;
    },
  };
  return sea;
}
