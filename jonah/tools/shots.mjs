// Screenshots of the game for judging by eye.
//   node tools/shots.mjs --q "ch=9&nocard" --name yard [--size phone] [--wait 2500] [--keys "KeyW:800,Space:100"] [--eval "js"] [--dist]
// --keys holds keys in turn (code:milliseconds); --eval runs script in the page before the picture; several
// --at times (ms after load) take several pictures.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIZES, here, launch, open, sleep, target } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : dflt);
const query = arg('q', '');
const name = arg('name', 'shot');
const size = SIZES[arg('size', 'desktop')];
const wait = Number(arg('wait', 2500));
const keys = arg('keys', '');
const js = arg('eval', '');
const at = arg('at', '');

const t = await target(args);
const browser = await launch();
const { page, errors, logs } = await open(browser, `${t.url}?mute&nosave&${query}`, size);
mkdirSync(resolve(here, 'shots'), { recursive: true });
await page.waitForFunction(() => window.__jonah && window.__jonah.state !== 'boot' && window.__jonah.state !== 'loading', null, { timeout: 30000 });
if (at) {
  let last = 0;
  for (const ms of at.split(',').map(Number)) {
    await sleep(ms - last);
    last = ms;
    await page.screenshot({ path: resolve(here, 'shots', `${name}-${ms}.png`) });
  }
} else {
  await sleep(wait);
  for (const step of keys ? keys.split(',') : []) {
    const [code, ms] = step.split(':');
    if (code === 'wait') await sleep(Number(ms));
    else {
      for (const k of code.split('+')) await page.keyboard.down(k);
      await sleep(Number(ms));
      for (const k of code.split('+')) await page.keyboard.up(k);
    }
  }
  if (js) console.log('eval:', JSON.stringify(await page.evaluate(js)));
  if (keys || js) await sleep(300);
  await page.screenshot({ path: resolve(here, 'shots', `${name}.png`) });
}
const state = await page.evaluate(() => {
  const g = window.__jonah;
  return { state: g.state, fps: Math.round(g.engine.fps), quality: g.engine.quality.level, calls: g.engine.renderer.info.render.calls, tris: g.engine.renderer.info.render.triangles, errors: g.report.errors };
});
console.log(JSON.stringify(state));
if (logs.length) console.log(logs.join('\n'));
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
t.close();
process.exit(errors.length ? 1 : 0);
