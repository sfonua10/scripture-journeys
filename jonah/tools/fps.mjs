// Frame rate of each chapter at each picture setting, with the frame limit off, while the bot plays.
//   node tools/fps.mjs [chapters, e.g. 3 or 1,2,3] [--q low,medium,high] [--size phone] [--seconds 10] [--dist]
// Prints a table: average and worst frames per second over the sample, draw calls and triangles.
// Run it alone: other programs using the GPU lower every number.
import { SIZES, launch, open, sleep, target } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : dflt);
const list = (args[0] && !args[0].startsWith('--') ? args[0] : '1,2,3,4,5,6').split(',').map(Number);
const levels = arg('q', 'low,medium,high').split(',');
const sizeName = arg('size', 'desktop');
const size = SIZES[sizeName];
const seconds = Number(arg('seconds', 10));

const t = await target(args);
const browser = await launch({ vsync: false });
console.log(`size ${sizeName} (${size.width}x${size.height} @${size.dpr}x), ${seconds} s each, frame limit off`);
console.log('chapter  quality   avg fps  worst fps   calls   triangles');
for (const ch of list) {
  for (const q of levels) {
    const { page, context, errors } = await open(browser, `${t.url}?mute&nosave&bot&nocard&ch=${ch}&q=${q}${size.touch ? '&touch=1' : ''}`, size);
    await page.waitForFunction(() => window.__jonah && window.__jonah.state === 'play', null, { timeout: 30000 }).catch(() => {});
    await sleep(4000);
    const samples = [];
    let calls = 0;
    let tris = 0;
    for (let i = 0; i < seconds; i++) {
      await sleep(1000);
      const s = await page.evaluate(() => {
        const g = window.__jonah;
        return { fps: g.engine.fps, calls: g.engine.renderer.info.render.calls, tris: g.engine.renderer.info.render.triangles };
      });
      samples.push(s.fps);
      calls = Math.max(calls, s.calls);
      tris = Math.max(tris, s.tris);
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    console.log(`${String(ch).padEnd(8)} ${q.padEnd(9)} ${avg.toFixed(0).padStart(7)}  ${Math.min(...samples).toFixed(0).padStart(9)}  ${String(calls).padStart(6)}  ${String(tris).padStart(10)}${errors.length ? '   ERRORS: ' + errors.length : ''}`);
    await context.close();
  }
}
await browser.close();
t.close();
