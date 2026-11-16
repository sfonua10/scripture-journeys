// The three hidden scroll pieces of a chapter. Each shows a verse when found.
import * as THREE from 'three';
import { solid } from '../gfx/build';
import { dotTexture } from '../gfx/textures';
import { cite, type Quote } from './verses';

interface Piece {
  index: number;
  group: THREE.Group;
  glow: THREE.Sprite;
  quote: Quote;
  base: THREE.Vector3;
  found: boolean;
  parent: THREE.Object3D;
  t: number;
  /** Shrinking away after being found. */
  leaving: number;
}

const _w = new THREE.Vector3();
const _p = new THREE.Vector3();

function scrollMesh(): THREE.Group {
  const g = new THREE.Group();
  const paper = solid(0xf0e2bc, { emissive: 0x6a5a30, emissiveIntensity: 0.5 });
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.5, 8), paper);
  roll.rotation.z = Math.PI / 2;
  g.add(roll);
  // the loose end of the sheet
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.012), paper);
  sheet.position.set(0, -0.15, 0.07);
  sheet.rotation.x = 0.35;
  g.add(sheet);
  const wood = solid(0x7a4a2a);
  for (const s of [1, -1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 6), wood);
    knob.rotation.z = Math.PI / 2;
    knob.position.x = s * 0.3;
    g.add(knob);
  }
  const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.05, 8), solid(0x9a3a2a));
  tie.rotation.z = Math.PI / 2;
  g.add(tie);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
  });
  return g;
}

export class Scrolls {
  readonly pieces: Piece[] = [];
  /** Called when a piece is picked up: (index, verse). */
  onFound: (index: number, quote: Quote, at: THREE.Vector3) => void = () => {};

  /** Places piece `index` (0..2) at `pos` in `parent`'s space, showing verse `ref`. */
  add(index: number, pos: THREE.Vector3Like, ref: string, parent: THREE.Object3D, alreadyFound = false) {
    const group = scrollMesh();
    group.position.set(pos.x, pos.y, pos.z);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: alreadyFound ? 0x9fb4c0 : 0xffd98a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(1.7);
    group.add(glow);
    if (alreadyFound) group.scale.setScalar(0.8);
    parent.add(group);
    this.pieces.push({ index, group, glow, quote: cite(ref), base: new THREE.Vector3(pos.x, pos.y, pos.z), found: false, parent, t: index * 1.7, leaving: 0 });
  }

  get foundCount() {
    return this.pieces.filter((p) => p.found).length;
  }

  /** `playerWorld` is the player's chest in world space. */
  update(dt: number, playerWorld: THREE.Vector3) {
    for (const p of this.pieces) {
      p.t += dt;
      if (p.found) {
        if (p.leaving > 0) {
          p.leaving -= dt * 2.2;
          const k = Math.max(0, p.leaving);
          p.group.scale.setScalar(k * 1.3);
          p.group.position.y += dt * 2.4;
          p.group.rotation.y += dt * 14;
          if (k <= 0) p.group.visible = false;
        }
        continue;
      }
      p.group.position.y = p.base.y + Math.sin(p.t * 1.8) * 0.1;
      p.group.rotation.y += dt * 1.1;
      p.group.rotation.z = Math.sin(p.t * 1.1) * 0.15;
      (p.glow.material as THREE.SpriteMaterial).opacity = 0.42 + Math.sin(p.t * 3) * 0.14;
      p.group.getWorldPosition(_w);
      if (_w.distanceToSquared(playerWorld) < 1.25 * 1.25) {
        p.found = true;
        p.leaving = 1;
        this.onFound(p.index, p.quote, _p.copy(_w));
      }
    }
  }

  dispose() {
    for (const p of this.pieces) {
      p.parent.remove(p.group);
      (p.glow.material as THREE.Material).dispose();
    }
    this.pieces.length = 0;
  }
}
