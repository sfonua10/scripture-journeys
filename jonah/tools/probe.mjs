// Samples an expression in the running game over time, for finding where something stalls.
//   node tools/probe.mjs --q "ch=3&nocard&bot&speed=3" --eval "(g) => g.player.pos.toArray()" --from 40000 --every 1000 --count 8 [--shot name]
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { SIZES, here, launch, open, sleep, target } from './lib.mjs';

const args = process.argv.slice(2);
const arg = (name, dflt) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : dflt);
const t = await target(args);
const browser = await launch();
const { page, errors, logs } = await open(browser, `${t.url}?mute&nosave&${arg('q', '')}`, SIZES[arg('size', 'desktop')]);
await page.waitForFunction(() => window.__jonah && window.__jonah.state !== 'boot' && window.__jonah.state !== 'loading', null, { timeout: 30000 });
await sleep(Number(arg('from', 2000)));
const fn = arg('eval', '(g) => g.state');
const shot = arg('shot', '');
if (shot) mkdirSync(resolve(here, 'shots'), { recursive: true });
for (let i = 0; i < Number(arg('count', 5)); i++) {
  console.log(JSON.stringify(await page.evaluate(`(${fn})(window.__jonah)`)));
  if (shot) await page.screenshot({ path: resolve(here, 'shots', `${shot}-${i}.png`) });
  await sleep(Number(arg('every', 1000)));
}
if (logs.length) console.log(logs.join('\n'));
if (errors.length) console.log('CONSOLE ERRORS:\n' + errors.join('\n'));
await browser.close();
t.close();
