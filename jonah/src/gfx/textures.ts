// Small canvas textures, near white, that multiply the vertex colours: grain, not pictures.
import * as THREE from 'three';
import { Rng, fbm2 } from '../core/util';

export type MatKey = 'plain' | 'wood' | 'plaster' | 'stone' | 'cloth' | 'sand' | 'brick' | 'weave';

const cache = new Map<string, THREE.Texture>();

function make(name: string, size: number, draw: (g: CanvasRenderingContext2D, s: number, rng: Rng) => void): THREE.Texture {
  const hit = cache.get(name);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  draw(g, size, new Rng(name.length * 7919 + 17));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(name, t);
  return t;
}

/** Soft blotches of tileable noise laid over the whole canvas. */
function blotch(g: CanvasRenderingContext2D, s: number, strength: number, scale: number, seed: number) {
  const img = g.getImageData(0, 0, s, s);
  const d = img.data;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      // Blend four shifted samples so the edges meet.
      const u = x / s;
      const v = y / s;
      const n =
        fbm2((u + seed) * scale, v * scale) * (1 - u) * (1 - v) +
        fbm2((u - 1 + seed) * scale, v * scale) * u * (1 - v) +
        fbm2((u + seed) * scale, (v - 1) * scale) * (1 - u) * v +
        fbm2((u - 1 + seed) * scale, (v - 1) * scale) * u * v;
      const k = 1 + n * strength;
      const i = (y * s + x) * 4;
      d[i] = Math.min(255, d[i] * k);
      d[i + 1] = Math.min(255, d[i + 1] * k);
      d[i + 2] = Math.min(255, d[i + 2] * k);
    }
  }
  g.putImageData(img, 0, 0);
}

export function texture(key: MatKey): THREE.Texture | null {
  switch (key) {
    case 'plain':
      return null;
    case 'wood':
      return make('wood', 256, (g, s, rng) => {
        g.fillStyle = '#e9e4dc';
        g.fillRect(0, 0, s, s);
        const planks = 4;
        const ph = s / planks;
        for (let p = 0; p < planks; p++) {
          const shade = 222 + rng.int(-14, 14);
          g.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
          g.fillRect(0, p * ph, s, ph);
          // grain
          for (let i = 0; i < 26; i++) {
            const y = p * ph + rng.range(3, ph - 3);
            g.strokeStyle = `rgba(90,70,50,${rng.range(0.04, 0.13)})`;
            g.lineWidth = rng.range(0.6, 1.6);
            g.beginPath();
            g.moveTo(0, y);
            const wob = rng.range(-2, 2);
            g.bezierCurveTo(s * 0.3, y + wob, s * 0.7, y - wob, s, y);
            g.stroke();
          }
          // the gap between planks
          g.fillStyle = 'rgba(40,28,18,0.55)';
          g.fillRect(0, p * ph, s, 2.5);
          g.fillStyle = 'rgba(255,255,255,0.25)';
          g.fillRect(0, p * ph + 2.5, s, 1.2);
          // a butt joint and two pegs
          const jx = rng.range(0.15, 0.85) * s;
          g.fillStyle = 'rgba(40,28,18,0.45)';
          g.fillRect(jx, p * ph, 2, ph);
          g.fillStyle = 'rgba(40,28,18,0.4)';
          for (const dx of [-7, 7]) {
            g.beginPath();
            g.arc(jx + dx, p * ph + ph * 0.3, 1.8, 0, 7);
            g.arc(jx + dx, p * ph + ph * 0.72, 1.8, 0, 7);
            g.fill();
          }
        }
        blotch(g, s, 0.1, 3, 0.3);
      });
    case 'plaster':
      return make('plaster', 256, (g, s, rng) => {
        g.fillStyle = '#f1efea';
        g.fillRect(0, 0, s, s);
        blotch(g, s, 0.16, 3, 0.7);
        // trowel marks and small cracks
        for (let i = 0; i < 40; i++) {
          g.strokeStyle = `rgba(80,60,40,${rng.range(0.03, 0.09)})`;
          g.lineWidth = rng.range(0.5, 1.4);
          const x = rng.range(0, s);
          const y = rng.range(0, s);
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + rng.range(-26, 26), y + rng.range(-10, 10));
          g.stroke();
        }
        for (let i = 0; i < 260; i++) {
          g.fillStyle = `rgba(70,50,30,${rng.range(0.03, 0.1)})`;
          g.fillRect(rng.range(0, s), rng.range(0, s), rng.range(1, 2.4), rng.range(1, 2.4));
        }
      });
    case 'stone':
      return make('stone', 256, (g, s, rng) => {
        g.fillStyle = '#d9d6d0';
        g.fillRect(0, 0, s, s);
        const rows = 4;
        const rh = s / rows;
        for (let r = 0; r < rows; r++) {
          let x = r % 2 ? -rng.range(20, 50) : 0;
          while (x < s) {
            const w = rng.range(48, 96);
            const shade = 214 + rng.int(-22, 18);
            g.fillStyle = `rgb(${shade},${shade - 2},${shade - 7})`;
            g.fillRect(x + 1.5, r * rh + 1.5, w - 3, rh - 3);
            // wrap the last block round to the left edge
            if (x + w > s) g.fillRect(x - s + 1.5, r * rh + 1.5, w - 3, rh - 3);
            x += w;
          }
        }
        g.globalCompositeOperation = 'multiply';
        g.fillStyle = 'rgba(120,110,100,0.0)';
        g.fillRect(0, 0, s, s);
        g.globalCompositeOperation = 'source-over';
        blotch(g, s, 0.14, 5, 0.1);
        // mortar
        g.strokeStyle = 'rgba(60,50,40,0.35)';
        g.lineWidth = 2;
        for (let r = 0; r <= rows; r++) {
          g.beginPath();
          g.moveTo(0, r * rh);
          g.lineTo(s, r * rh);
          g.stroke();
        }
      });
    case 'brick':
      return make('brick', 256, (g, s, rng) => {
        g.fillStyle = '#cfc8be';
        g.fillRect(0, 0, s, s);
        const rows = 8;
        const rh = s / rows;
        const bw = s / 4;
        for (let r = 0; r < rows; r++) {
          for (let b = -1; b < 5; b++) {
            const x = b * bw + (r % 2 ? bw / 2 : 0);
            const shade = 226 + rng.int(-20, 16);
            g.fillStyle = `rgb(${shade},${shade - 3},${shade - 9})`;
            g.fillRect(x + 1.5, r * rh + 1.5, bw - 3, rh - 3);
          }
        }
        blotch(g, s, 0.1, 4, 0.5);
      });
    case 'cloth':
      return make('cloth', 128, (g, s, rng) => {
        g.fillStyle = '#f2f0ec';
        g.fillRect(0, 0, s, s);
        for (let i = 0; i < s; i += 2) {
          g.fillStyle = `rgba(60,50,40,${rng.range(0.03, 0.08)})`;
          g.fillRect(i, 0, 1, s);
          g.fillStyle = `rgba(60,50,40,${rng.range(0.02, 0.06)})`;
          g.fillRect(0, i, s, 1);
        }
        blotch(g, s, 0.07, 3, 0.2);
      });
    case 'weave':
      return make('weave', 128, (g, s) => {
        g.fillStyle = '#ebe6dc';
        g.fillRect(0, 0, s, s);
        const n = 8;
        const c = s / n;
        for (let y = 0; y < n; y++) {
          for (let x = 0; x < n; x++) {
            const over = (x + y) % 2 === 0;
            g.fillStyle = over ? '#f6f2ea' : '#d6cfc2';
            if (over) g.fillRect(x * c + 1, y * c + 3, c - 2, c - 6);
            else g.fillRect(x * c + 3, y * c + 1, c - 6, c - 2);
          }
        }
        g.fillStyle = 'rgba(50,40,30,0.18)';
        for (let i = 0; i <= n; i++) {
          g.fillRect(i * c - 0.5, 0, 1, s);
          g.fillRect(0, i * c - 0.5, s, 1);
        }
      });
    case 'sand':
      return make('sand', 256, (g, s, rng) => {
        g.fillStyle = '#f3f0e8';
        g.fillRect(0, 0, s, s);
        blotch(g, s, 0.1, 4, 0.9);
        for (let i = 0; i < 1400; i++) {
          g.fillStyle = rng.chance(0.5) ? `rgba(70,55,35,${rng.range(0.04, 0.12)})` : `rgba(255,255,255,${rng.range(0.1, 0.3)})`;
          g.fillRect(rng.range(0, s), rng.range(0, s), 1.3, 1.3);
        }
      });
  }
}

/** How many world units one repeat of each texture covers. */
export const TEX_SCALE: Record<MatKey, number> = { plain: 1, wood: 2.4, plaster: 5, stone: 3.2, cloth: 1.6, sand: 6, brick: 3, weave: 0.8 };

/** A round soft dot, for particles and glows. */
export function dotTexture(): THREE.Texture {
  const hit = cache.get('dot');
  if (hit) return hit;
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  cache.set('dot', t);
  return t;
}

/** Tileable cloud noise, for the sky's cloud layer (sampled twice, scrolled). */
export function cloudTexture(): THREE.Texture {
  const hit = cache.get('cloud');
  if (hit) return hit;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const img = g.createImageData(s, s);
  const vals = new Float32Array(s * s);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const u = x / s;
      const v = y / s;
      const f = (a: number, b: number) => fbm2(a * 5 + 3.1, b * 5 + 1.7, 5);
      const n = f(u, v) * (1 - u) * (1 - v) + f(u - 1, v) * u * (1 - v) + f(u, v - 1) * (1 - u) * v + f(u - 1, v - 1) * u * v;
      vals[y * s + x] = n;
      if (n < lo) lo = n;
      if (n > hi) hi = n;
    }
  }
  // stretched to the full range, so "cover" in the sky shader means what it says
  for (let i = 0; i < vals.length; i++) {
    const k = ((vals[i] - lo) / (hi - lo)) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = k;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set('cloud', t);
  return t;
}
