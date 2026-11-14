// Solid things made in code and painted as the people are: flat colour in two tones, with an inked line round every
// part (the frame's last pass draws the line round whatever writes one of the small alphas: wanderer.js). The lions
// of the den are made this way (lions.js); this is the same paint, for the things of the wilderness: the wild beasts,
// a bow and its arrow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { COMMON } from '../lib/index.js';

const vertex = /* glsl */ `
${COMMON}
in vec3 aColor;
in float aKind;   // which part it is (0 to 6): each kind writes its own ink, so a line is drawn where two kinds meet
out vec3 vWorld;
out vec3 vN;
out vec3 vColor;
out float vKind;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vColor = aColor;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const fragment = /* glsl */ `
${COMMON}
uniform float uGlint;  // light of its own, 0 to 1: brass that shines
layout(location = 0) out vec4 outC;
in vec3 vWorld;
in vec3 vN;
in vec3 vColor;
in float vKind;
void main() {
  vec3 N = normalize(vN);
  if (dot(N, uCamPos - vWorld) < 0.0) N = -N;
  // in the light or out of it, and nothing between
  float open = smoothstep(0.35, 0.6, openAt(vWorld.xz));
  float lit = smoothstep(0.0, 0.035, dot(N, uSunDir) + 0.06) * open;
  vec3 sun = uSunColor * 0.42 + uSkyColor * 0.3;
  float grey = dot(uSkyColor, vec3(0.333));
  vec3 sky = mix(uSkyColor, vec3(grey), 0.8) * 1.15 + 0.2;
  vec3 shade = vColor * vec3(0.6, 0.55, 0.62);
  vec3 col = mix(shade * sky, vColor * sun, lit);
  col += vColor * uGlint * (0.5 + 0.5 * max(0.0, N.y));
  float ink = vKind > 5.5 ? 0.12 : vKind > 4.5 ? 0.18 : vKind > 3.5 ? 0.21 : vKind > 2.5 ? 0.03 : vKind > 1.5 ? 0.09 : vKind > 0.5 ? 0.06 : 0.15;
  outC = vec4(applyFog(col, vWorld), ink);
}
`;

/** A piece of a part: a shape, put where it goes, in one paint. `kind` (0 to 6) is which ink it writes. */
export function piece(geometry, colour, kind, { at = [0, 0, 0], scale = [1, 1, 1], turn = [0, 0, 0] } = {}) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...turn)), new THREE.Vector3(...scale)));
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  const kinds = new Float32Array(n).fill(kind);
  for (let i = 0; i < n; i++) col.set(colour, i * 3);
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aKind', new THREE.BufferAttribute(kinds, 1));
  g.deleteAttribute('uv');
  return g;
}
export const ball = (r, colour, kind, where) => piece(new THREE.SphereGeometry(r, 12, 9), colour, kind, where);
export const limb = (top, bottom, length, colour, kind, where) => piece(new THREE.CylinderGeometry(top, bottom, length, 9, 1), colour, kind, where);
export const cone = (r, length, colour, kind, where) => piece(new THREE.ConeGeometry(r, length, 8), colour, kind, where);
/** Pieces joined into one part, about its own pivot. */
export function part(...pieces) {
  const g = mergeGeometries(pieces);
  g.computeBoundingSphere();
  return g;
}

/** The paint, lit as the meadow is (`field`: its uniforms). `glint`: how much it shines of itself. */
export function solidMaterial(field, { glint = 0 } = {}) {
  const uniforms = { ...field.uniforms, uGlint: { value: glint } };
  return new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: vertex, fragmentShader: fragment, uniforms, side: THREE.DoubleSide });
}
