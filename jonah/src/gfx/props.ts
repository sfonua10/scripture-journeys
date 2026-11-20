// The physics toys: crates, barrels, baskets, jars, sacks, nets, planks. Each is a small merged mesh and a body.
import * as THREE from 'three';
import { Physics, Prop } from '../core/physics';
import { Rng, TAU } from '../core/util';
import { buildMesh, solid } from './build';

const rng = new Rng(4242);

function shadows<T extends THREE.Object3D>(g: T): T {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });
  return g;
}

/** A lathe turned from a profile, flat-shaded in one colour. */
function turned(profile: [number, number][], color: THREE.ColorRepresentation, seg = 8): THREE.Mesh {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    seg,
  );
  return new THREE.Mesh(g, solid(color));
}

export function crateMesh(size = 0.8, tone = 0): THREE.Group {
  const s = size;
  const woods = [0xb98a55, 0xa9794a, 0xc49a62, 0x9c7044];
  const wood = woods[tone % woods.length];
  const dark = 0x6b4a2c;
  return shadows(
    buildMesh((b) => {
      b.box(0, 0, 0, s * 0.94, s * 0.94, s * 0.94, wood, { mat: 'wood', jitter: 0.06, shade: 0.1 });
      const e = s * 0.09;
      const h = s / 2 - e / 2;
      // the frame: twelve edge battens
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          b.box(sx * h, sy * h, 0, e, e, s, dark, { mat: 'wood', jitter: 0.08, shade: 0 });
          b.box(0, sy * h, sx * h, s, e, e, dark, { mat: 'wood', jitter: 0.08, shade: 0 });
          b.box(sx * h, 0, sy * h, e, s, e, dark, { mat: 'wood', jitter: 0.08, shade: 0 });
        }
      // a brace across two faces
      const d = s * 1.08;
      b.box(0, 0, s * 0.475, d, e * 0.8, e * 0.5, dark, { mat: 'wood', rot: new THREE.Euler(0, 0, Math.PI / 4), shade: 0 });
      b.box(0, 0, -s * 0.475, d, e * 0.8, e * 0.5, dark, { mat: 'wood', rot: new THREE.Euler(0, 0, -Math.PI / 4), shade: 0 });
    }, 11 + tone),
  );
}

export function barrelMesh(r = 0.36, hgt = 0.9): THREE.Group {
  const g = new THREE.Group();
  const body = turned(
    [
      [0.001, -hgt / 2],
      [r * 0.82, -hgt / 2],
      [r * 0.97, -hgt * 0.22],
      [r, 0],
      [r * 0.97, hgt * 0.22],
      [r * 0.82, hgt / 2],
      [r * 0.74, hgt / 2 - 0.035],
      [0.001, hgt / 2 - 0.035],
    ],
    0x9a6a3c,
    10,
  );
  g.add(body);
  for (const y of [-hgt * 0.3, hgt * 0.3]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.955, r * 0.955, 0.06, 10, 1, true), solid(0x4a3a30));
    band.position.y = y;
    band.scale.setScalar(1.02);
    g.add(band);
  }
  return shadows(g);
}

export function basketMesh(r = 0.34, hgt = 0.46): THREE.Group {
  const g = new THREE.Group();
  const body = turned(
    [
      [0.001, -hgt / 2],
      [r * 0.72, -hgt / 2],
      [r * 0.95, 0],
      [r, hgt / 2],
      [r * 0.9, hgt / 2],
      [r * 0.84, hgt / 2 - 0.05],
      [0.001, hgt / 2 - 0.09],
    ],
    0xc9a560,
    9,
  );
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.96, 0.03, 4, 9), solid(0x9a7a3c));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = hgt / 2;
  g.add(rim);
  // what is in it: figs, grain, cloth
  const fill = new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 7, 3, 0, TAU, 0, Math.PI / 2), solid(rng.pick([0x7a3a5a, 0xd8c070, 0x9a4a2a, 0x6a8a4a])));
  fill.position.y = hgt / 2 - 0.1;
  fill.scale.y = 0.45;
  g.add(fill);
  return shadows(g);
}

export function jarMesh(r = 0.26, hgt = 0.78): THREE.Group {
  const g = new THREE.Group();
  const h2 = hgt / 2;
  const clay = rng.pick([0xb5653a, 0xc27848, 0xa85a36]);
  g.add(
    turned(
      [
        [0.001, -h2],
        [r * 0.38, -h2],
        [r * 0.8, -h2 * 0.45],
        [r, h2 * 0.1],
        [r * 0.8, h2 * 0.55],
        [r * 0.4, h2 * 0.78],
        [r * 0.44, h2],
        [r * 0.34, h2],
        [r * 0.3, h2 * 0.8],
        [0.001, h2 * 0.74],
      ],
      clay,
      9,
    ),
  );
  for (const side of [1, -1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.34, 0.028, 4, 6, Math.PI), solid(clay));
    handle.position.set(side * r * 0.62, h2 * 0.55, 0);
    handle.rotation.z = side * -1.2;
    g.add(handle);
  }
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.0, r * 0.99, 0.05, 9, 1, true), solid(0x3a2a20));
  band.position.y = h2 * 0.1;
  band.scale.setScalar(1.015);
  g.add(band);
  return shadows(g);
}

export function sackMesh(size = 0.6): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(size / 2, 1);
  const p = geo.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = y < 0 ? 1.12 : 0.86;
    p.setXYZ(i, p.getX(i) * k * (1 + (rng.next() - 0.5) * 0.1), y * 0.8, p.getZ(i) * k * (1 + (rng.next() - 0.5) * 0.1));
  }
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, solid(0xbfae86)));
  const tie = new THREE.Mesh(new THREE.ConeGeometry(size * 0.16, size * 0.22, 5), solid(0xa8966e));
  tie.position.y = size * 0.42;
  tie.rotation.x = Math.PI;
  g.add(tie);
  return shadows(g);
}

export function netMesh(size = 0.6): THREE.Group {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(size / 2, 1), solid(0x6f7f6a));
  core.scale.set(1.1, 0.72, 1);
  g.add(core);
  // floats and cords
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(size * 0.1, 0), solid(i % 2 ? 0xc9a560 : 0x8a5a3a));
    const a = (i / 5) * TAU;
    f.position.set(Math.cos(a) * size * 0.46, size * 0.12 * Math.sin(a * 2), Math.sin(a) * size * 0.42);
    g.add(f);
  }
  const cord = new THREE.Mesh(new THREE.TorusGeometry(size * 0.46, 0.022, 4, 10), solid(0x4a5a48));
  cord.rotation.x = Math.PI / 2;
  g.add(cord);
  const cord2 = cord.clone();
  cord2.rotation.set(0.5, 0, 1.2);
  g.add(cord2);
  return shadows(g);
}

export function plankMesh(len = 2, w = 0.3, t = 0.08): THREE.Group {
  return shadows(
    buildMesh((b) => {
      b.box(0, 0, 0, w, t, len, 0xa9814e, { mat: 'wood', jitter: 0.1 });
    }),
  );
}

/** Adds physics toys to a chapter. Meshes are parented to `parent` (the level's group, or a ship). */
export class Toys {
  constructor(private physics: Physics, private parent: THREE.Object3D) {}

  private add<T extends THREE.Object3D>(mesh: T): T {
    this.parent.add(mesh);
    return mesh;
  }

  crate(x: number, y: number, z: number, size = 0.8, yaw = 0): Prop {
    const mesh = this.add(crateMesh(size, Math.floor(rng.next() * 4)));
    return this.physics.addProp('crate', mesh, 'box', new THREE.Vector3(size, size, size), { x, y, z }, { density: 0.42, friction: 0.85, yaw, surface: 'wood' });
  }

  barrel(x: number, y: number, z: number, r = 0.36, hgt = 0.9): Prop {
    const mesh = this.add(barrelMesh(r, hgt));
    return this.physics.addProp('barrel', mesh, 'cylinder', new THREE.Vector3(r * 2, hgt, r * 2), { x, y, z }, { density: 0.5, friction: 0.7, surface: 'wood' });
  }

  basket(x: number, y: number, z: number, r = 0.34, hgt = 0.46): Prop {
    const mesh = this.add(basketMesh(r, hgt));
    return this.physics.addProp('basket', mesh, 'cylinder', new THREE.Vector3(r * 2, hgt, r * 2), { x, y, z }, { density: 0.3, friction: 0.9, surface: 'cloth' });
  }

  jar(x: number, y: number, z: number, r = 0.26, hgt = 0.78): Prop {
    const mesh = this.add(jarMesh(r, hgt));
    return this.physics.addProp('jar', mesh, 'cylinder', new THREE.Vector3(r * 2, hgt, r * 2), { x, y, z }, { density: 0.55, friction: 0.75, surface: 'stone' });
  }

  sack(x: number, y: number, z: number, size = 0.6): Prop {
    const mesh = this.add(sackMesh(size));
    return this.physics.addProp('sack', mesh, 'box', new THREE.Vector3(size * 0.95, size * 0.72, size * 0.95), { x, y, z }, { density: 0.45, friction: 1, restitution: 0, surface: 'cloth', damping: 0.4 });
  }

  net(x: number, y: number, z: number, size = 0.6): Prop {
    const mesh = this.add(netMesh(size));
    return this.physics.addProp('net', mesh, 'box', new THREE.Vector3(size, size * 0.66, size * 0.95), { x, y, z }, { density: 0.25, friction: 1, restitution: 0, surface: 'cloth', damping: 0.5 });
  }

  plank(x: number, y: number, z: number, len = 2, yaw = 0): Prop {
    const mesh = this.add(plankMesh(len));
    return this.physics.addProp('plank', mesh, 'box', new THREE.Vector3(0.3, 0.08, len), { x, y, z }, { density: 0.5, friction: 0.9, yaw, surface: 'wood' });
  }

  /** Any mesh as a box-shaped toy. */
  custom(kind: Prop['kind'], mesh: THREE.Object3D, size: THREE.Vector3, x: number, y: number, z: number, opts: { density?: number; yaw?: number; shape?: 'box' | 'cylinder' } = {}): Prop {
    this.add(shadows(mesh));
    return this.physics.addProp(kind, mesh, opts.shape ?? 'box', size, { x, y, z }, { density: opts.density ?? 0.4, yaw: opts.yaw, surface: 'wood' });
  }
}
