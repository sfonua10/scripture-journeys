// Rain over the hill country: the sky clouding over, and rain falling ("till he come and rain righteousness upon
// you", Hosea 10:12; "he will cause to come down for you the rain", Joel 2:23). The light on everything goes from the
// hour's own to an overcast one, as the tempest's does in the journey of Jonah (jonah.js, whose way of it this is);
// the rain is slanting strokes about the eye, as that journey's (sea.js). It is a gentle rain, in daylight: grey, not
// dark.
import * as THREE from 'three';

/** The overcast light: the sun's and the sky's on the land, the sky's own colours, the clouds'. */
const OVERCAST = {
  sun: [0.62, 0.64, 0.7],
  amb: [0.5, 0.54, 0.62],
  bounce: [0.08, 0.085, 0.09],
  fog: [0.4, 0.44, 0.5],
  zenith: [0.2, 0.23, 0.28],
  mid: [0.3, 0.33, 0.38],
  horizon: [0.42, 0.45, 0.5],
  glow: [0, 0, 0],
  bankLit: [0.44, 0.47, 0.52],
  cloud: [0.3, 0.32, 0.37],
  bankShade: [0.17, 0.19, 0.23],
  haze: 2.4,
  exposure: 1,
};

const rainVertex = /* glsl */ `
uniform float uTime;
uniform vec3 uEye;
uniform vec3 uFall;   // metres a second it goes: down, and with the wind
in float aEnd;
out float vEnd;
void main() {
  // (each stroke falls through a box about the eye, and comes in again at its top)
  vec3 box = vec3(30.0, 18.0, 30.0);
  vec3 p = position + uFall * uTime;
  p = mod(p - uEye + box * 0.5, box) - box * 0.5 + uEye;
  p -= normalize(uFall) * aEnd * 0.7;
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
  // (light added, and the frame's alpha left alone: halo.js)
  outC = vec4(uColor * uStrength * (1.0 - vEnd * 0.7), 0.0);
}
`;

/** @param g the game (main.js): its field, sky and scene */
export function createWeather(g) {
  const F = g.field.uniforms;
  const S = g.sky.uniforms;
  const K = g.sky.clouds;
  const LIGHTS = [[F, 'uSunColor', 'sun'], [F, 'uSkyColor', 'amb'], [F, 'uBounceColor', 'bounce'], [F, 'uFogColor', 'fog'], [F, 'uFogSunColor', 'fog'], [S, 'uZenith', 'zenith'], [S, 'uMid', 'mid'], [S, 'uHorizon', 'horizon'], [S, 'uGlow', 'glow'], [S, 'uBankLit', 'bankLit'], [S, 'uBankShade', 'bankShade'], [K.uniforms, 'uLit', 'bankLit'], [K.uniforms, 'uMid', 'cloud'], [K.uniforms, 'uShade', 'bankShade'], [K.uniforms, 'uUnder', 'bankShade'], [K.uniforms, 'uHaze', 'fog']];
  let clear = null;
  let cover = 0;
  let drawn = 0;

  // the rain
  const DROPS = 1100;
  const position = new Float32Array(DROPS * 6);
  const end = new Float32Array(DROPS * 2);
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < DROPS; i++) {
    const p = [random() * 30, random() * 18, random() * 30];
    position.set([...p, ...p], i * 6);
    end[i * 2 + 1] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const uniforms = { uTime: F.uTime, uEye: { value: new THREE.Vector3() }, uFall: { value: new THREE.Vector3(3, -17, 1.5) }, uStrength: { value: 0 }, uColor: { value: new THREE.Color(0.62, 0.68, 0.74) } };
  const rain = new THREE.LineSegments(
    geometry,
    new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: rainVertex, fragmentShader: rainFragment, uniforms, transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }),
  );
  rain.frustumCulled = false;
  rain.renderOrder = 9;
  rain.visible = false;
  g.scene.add(rain);
  g.each(() => {
    if (rain.visible) uniforms.uEye.value.copy(g.camera.position);
  });

  function apply(redraw) {
    if (!clear) return;
    LIGHTS.forEach(([u, name, key], i) => {
      const a = clear.colours[i];
      const b = OVERCAST[key];
      u[name].value.setRGB(a[0] + (b[0] - a[0]) * cover, a[1] + (b[1] - a[1]) * cover, a[2] + (b[2] - a[2]) * cover);
    });
    F.uFogDensity.value = clear.haze * (1 + (OVERCAST.haze - 1) * cover);
    g.sky.exposure = clear.exposure + (OVERCAST.exposure - clear.exposure) * cover;
    // (the clouds are painted again in the new light only now and then: it is a slow sum)
    if (redraw || Math.abs(cover - drawn) > 0.12) {
      K.drawAll();
      drawn = cover;
    }
  }

  return {
    /** The hour of the day (as g.setHour), under whatever cloud there is. */
    hour(h, soft = false) {
      g.setHour(h, soft);
      clear = { colours: LIGHTS.map(([u, name]) => u[name].value.toArray()), haze: F.uFogDensity.value, exposure: g.sky.exposure };
      apply(!soft && cover > 0);
    },
    /** How far the sky is clouded over, 0 to 1. */
    cloud(k, redraw = false) {
      cover = Math.min(1, Math.max(0, k));
      apply(redraw);
    },
    get cover() {
      return cover;
    },
    /** How hard it rains, 0 to 1. */
    rain(k) {
      uniforms.uStrength.value = 0.85 * k;
      rain.visible = k > 0.01;
    },
    /** Fair weather again (the hour's own light is set by the next hour()). */
    clear() {
      cover = 0;
      drawn = 0;
      uniforms.uStrength.value = 0;
      rain.visible = false;
    },
  };
}
