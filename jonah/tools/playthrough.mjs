// The bot plays chapters to their end, to prove they can be finished.
//   node tools/playthrough.mjs [chapters, e.g. 3 or 1,2,3] [--size phone] [--speed 2] [--diff story] [--dist] [--shots]
// For each chapter: finished or not, the time on the clock, stars, the bot's assists (things it could not do by
// playing and did by cheating), and any console errors. Exits 1 if anything is unfinished or errored.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIZES, here, launch, open, sleep, target } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : dflt);
const list = (args[0] && !args[0].startsWith('--') ? args[0] : '1,2,3,4,5,6').split(',').map(Number);
const size = SIZES[arg('size', 'desktop')];
const speed = arg('speed', '1');
const diff = arg('diff', 'normal');
const timeout = Number(arg('timeout', 600)) * 1000;
const shots = args.includes('--shots');
const verbose = args.includes('--verbose');

const t = await target(args);
const browser = await launch();
mkdirSync(resolve(here, 'shots'), { recursive: true });
let failed = false;
for (const ch of list) {
  const { page, context, errors, logs } = await open(browser, `${t.url}?mute&nosave&bot&ch=${ch}&speed=${speed}&diff=${diff}&q=${arg('q', 'auto')}${size.touch ? '&touch=1' : ''}`, size);
  const t0 = Date.now();
  let done = false;
  let n = 0;
  while (Date.now() - t0 < timeout) {
    await sleep(1000);
    done = await page.evaluate((c) => window.__jonah?.report.done.includes(c), ch).catch(() => false);
    if (shots && ++n % 8 === 0) await page.screenshot({ path: resolve(here, 'shots', `play-${ch}-${String(n / 8).padStart(2, '0')}.png`) });
    if (done) break;
  }
  const r = await page.evaluate(() => {
    const g = window.__jonah;
    const res = g.report.result;
    return { clock: g.clock, stars: res?.stars, scrolls: res?.scrolls, challenge: res?.challenge, assists: g.report.assists.concat(g.bot?.assists ?? []), errors: g.report.errors, fps: Math.round(g.engine.fps), state: g.state, pos: g.player ? [g.player.pos.x, g.player.pos.y, g.player.pos.z].map((v) => +v.toFixed(1)) : null };
  });
  if (shots) await page.screenshot({ path: resolve(here, 'shots', `play-${ch}-end.png`) });
  const bad = !done || errors.length || r.errors.length;
  failed ||= !!bad;
  console.log(`chapter ${ch}: ${done ? 'FINISHED' : 'NOT FINISHED'} in ${((Date.now() - t0) / 1000).toFixed(0)} s (clock ${r.clock?.toFixed(1)} s) · stars ${r.stars ?? '-'} · scrolls ${r.scrolls ?? '-'} · challenge ${r.challenge ?? '-'} · assists ${r.assists.length} · ${r.fps} fps${done ? '' : ` · state ${r.state} at ${JSON.stringify(r.pos)}`}`);
  for (const a of r.assists) console.log(`   assist: ${a}`);
  if (verbose || !done || ch === 9) for (const l of logs) console.log(`   ${l}`);
  for (const e of [...errors, ...r.errors]) console.log(`   ERROR: ${e}`);
  await context.close();
}
await browser.close();
t.close();
process.exit(failed ? 1 : 0);
