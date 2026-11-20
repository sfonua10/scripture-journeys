// A plot of ground on the hill, that a story may work: break it up, sow it, see it grow, reap it, or see it eaten and
// restored (fallow.js: Hosea 10:12; swarm.js: Joel 1:4 and 2:25). It is made of the meadow's own grass (src/lib): what
// grows where, how dry and how tall, is the meadow's map, a texel a metre; how short each blade has been cut is the
// meadow's memory, eight texels a metre. A plot is a rectangle of the map's texels, each one a cell of it, and this
// writes both: a cell's look (straw or green, thin or thick, low or tall), and how high its blades stand.
//
// The plot must lie in the part of the meadow that remembers (the square round where the walk starts: field.state).
// The map is put back as it was by restore(), and the page plays one journey, so nothing here outlasts it.

/** A look for a cell: [dry, growth, wet], each 0 to 1 (lib/index.js, `paint`): wet ground grows its grass taller. */
export const LOOKS = {
  /** Fallow: thin, dry scrub. */
  fallow: [1, 0.24, 0],
  /** Bare earth (nothing is drawn where the map says nothing grows: a very little is left, so its tiles are kept). */
  bare: [1, 0.012, 0],
  /** Young corn, green and thick. */
  green: [0.12, 1, 1],
  /** Ripe corn. */
  ripe: [1, 1, 1],
  /** Corn as it stands in a plot: ripe, with a little green in it yet, so it is told from the hill's dry grass. */
  corn: [0.62, 1, 1],
};

/**
 * @param g the game (main.js): its field
 * @param plot { x0, z0, nx, nz }: the corner of the plot in the world (whole metres), and how many cells along x and z
 */
export function createCrop(g, { x0, z0, nx, nz }) {
  const field = g.field;
  const U = field.uniforms;
  const map = U.tMap.value;
  const data = map.image.data;
  const res = U.uHeightRes.value;
  const texel = 1 / U.uExtentInv.value / res;
  const I0 = Math.round((x0 - U.uExtentMin.value.x) / texel);
  const J0 = Math.round((z0 - U.uExtentMin.value.y) / texel);
  const cells = nx * nz;
  const at = (k) => (I0 + (k % nx) + (J0 + Math.floor(k / nx)) * res) * 4;
  // (the map as it was, to put back)
  const saved = new Uint8Array(cells * 4);
  for (let k = 0; k < cells; k++) saved.set(data.subarray(at(k), at(k) + 4), k * 4);
  const state = field.state;
  const per = Math.round(texel / state.cell);
  const S0 = Math.round((x0 - state.minX) / state.cell);
  const T0 = Math.round((z0 - state.minZ) / state.cell);
  let dirtyMap = false;
  const byte = (v) => Math.round(255 * Math.min(1, Math.max(0, v)));
  /** A number from 0 to 1 that is always the same for the same cell (and `salt`). */
  const chance = (k, salt = 0) => {
    let h = Math.imul(k + 1, 374761393) ^ Math.imul(salt + 7, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  return {
    nx,
    nz,
    cells,
    x0,
    z0,
    x1: x0 + nx * texel,
    z1: z0 + nz * texel,
    size: texel,
    chance,
    /** Whether (x, z) is on the plot (`margin` metres outside it still counts, or inside it does not, if negative). */
    inside: (x, z, margin = 0) => x > x0 - margin && x < x0 + nx * texel + margin && z > z0 - margin && z < z0 + nz * texel + margin,
    /** The cell (x, z) is in, or -1. */
    cellAt(x, z) {
      const i = Math.floor((x - x0) / texel);
      const j = Math.floor((z - z0) / texel);
      return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : i + j * nx;
    },
    /** The middle of a cell: [x, z]. */
    centre: (k) => [x0 + ((k % nx) + 0.5) * texel, z0 + (Math.floor(k / nx) + 0.5) * texel],
    /** Every cell whose middle is within `r` of the line from a to b. */
    along(ax, az, bx, bz, r, each) {
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - x0) / texel));
      const i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx) + r - x0) / texel));
      const j0 = Math.max(0, Math.floor((Math.min(az, bz) - r - z0) / texel));
      const j1 = Math.min(nz - 1, Math.floor((Math.max(az, bz) + r - z0) / texel));
      const ex = bx - ax;
      const ez = bz - az;
      const ee = ex * ex + ez * ez || 1e-9;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const cx = x0 + (i + 0.5) * texel;
          const cz = z0 + (j + 0.5) * texel;
          const t = Math.min(1, Math.max(0, ((cx - ax) * ex + (cz - az) * ez) / ee));
          if (Math.hypot(cx - ax - ex * t, cz - az - ez * t) <= r) each(i + j * nx);
        }
      }
    },
    /** A cell's look (LOOKS, or [dry, growth, wet]); `vary`: how much its thickness differs from its neighbours'. Sent by show(). */
    look(k, [dry, growth, wet], vary = 0) {
      const o = at(k);
      data[o] = byte(dry);
      data[o + 1] = Math.max(3, byte(growth * (1 + vary * (chance(k, 1) - 0.5) * 2)));
      data[o + 2] = byte(wet);
      data[o + 3] = 0;
      dirtyMap = true;
    },
    /** Sends the looks that were set to the graphics card (the whole map: a few times a run, not every frame). */
    show() {
      if (dirtyMap) map.needsUpdate = true;
      dirtyMap = false;
    },
    /** How high a cell's blades stand, metres (null: as high as they grow). */
    stand(k, metres) {
      const i = S0 + (k % nx) * per;
      const j = T0 + Math.floor(k / nx) * per;
      const to = metres == null ? 255 : Math.max(1, Math.min(254, Math.round(metres * 255)));
      const d = state.data;
      for (let b = 0; b < per; b++) for (let a = 0; a < per; a++) d[(i + a + (j + b) * state.N) * 4 + 2] = to;
      state.dirty.add(i, j, i + per - 1, j + per - 1);
    },
    /** How high they stand in the middle of a cell, metres (1: uncut). */
    standing: (k) => state.data[(S0 + (k % nx) * per + (per >> 1) + (T0 + Math.floor(k / nx) * per + (per >> 1)) * state.N) * 4 + 2] / 255,
    /** A way trodden round the plot, `wide` metres, so that it is seen where the plot ends and the hill begins. */
    border(wide = 1.3) {
      const off = wide / 2 + 0.1;
      const [a, b, c, d] = [x0 - off, z0 - off, x0 + nx * texel + off, z0 + nz * texel + off];
      for (const [ax, az, bx, bz] of [[a, b, c, b], [c, b, c, d], [c, d, a, d], [a, d, a, b]]) state.cutLine(ax, az, bx, bz, wide, 0.035);
      state.cutEvents.length = 0;
    },
    /** The map as it was before the plot was laid out, and the grass as it grew. */
    restore() {
      for (let k = 0; k < cells; k++) data.set(saved.subarray(k * 4, k * 4 + 4), at(k));
      map.needsUpdate = true;
      dirtyMap = false;
      field.reset();
    },
  };
}
