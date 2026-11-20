// What a short game draws over the picture (fallow.js, swarm.js): at the top right, how long is left and a line or
// two of how it goes; and over the middle, a word now and then (the clouds are gathering; ten seconds). In the
// game's own words, never the scripture's. Times are the story's clock, which a test steps.

const CSS = /* css */ `
.m-hud { position: fixed; top: calc(14px + env(safe-area-inset-top, 0px)); right: calc(16px + env(safe-area-inset-right, 0px)); z-index: 5; pointer-events: none;
  display: flex; flex-direction: column; align-items: flex-end; gap: 7px; color: var(--ink, #f4ead6); opacity: 0; transition: opacity 0.4s;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); }
.m-hud.on { opacity: 1; }
.m-hud .row { display: flex; align-items: center; gap: 10px; padding: 5px 13px 5px 12px; border-radius: 999px; background: rgba(24, 18, 12, 0.6); font-size: 14px; letter-spacing: 0.05em; }
.m-hud .row b { color: var(--gold, #e3bd6d); font-size: 18px; font-variant-numeric: tabular-nums; }
.m-hud .row b.pop { animation: m-got 0.5s ease-out; }
.m-hud .row.off { display: none; }
.m-hud .clock b { min-width: 3.1em; text-align: right; font-size: 20px; }
.m-hud .clock.low b { color: #f2a24e; }
.m-hud .clock.last { animation: m-beat 1s ease-in-out infinite; }
.m-hud .clock.last b { color: #ff8a5c; }
.m-hud .clock span { opacity: 0.85; }
.m-warn { position: fixed; left: 50%; top: calc(12vh + env(safe-area-inset-top, 0px)); transform: translate(-50%, -8px); z-index: 6; pointer-events: none; opacity: 0;
  transition: opacity 0.4s, transform 0.4s; padding: 8px 20px; border-radius: 999px; background: rgba(24, 18, 12, 0.72); border: 1px solid var(--line, rgba(227, 189, 109, 0.35));
  color: var(--ink, #f4ead6); font-size: 18px; letter-spacing: 0.04em; white-space: nowrap; text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7); }
.m-warn.on { opacity: 1; transform: translate(-50%, 0); }
.m-warn b { color: var(--gold, #e3bd6d); }
@keyframes m-got { 0% { transform: scale(1.5); } 100% { transform: scale(1); } }
@keyframes m-beat { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@media (max-width: 600px) { .m-hud .row { font-size: 13px; } .m-warn { font-size: 15px; max-width: 92vw; white-space: normal; text-align: center; } }
`;

export const mmss = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

let styled = false;

/** @param rows the names of its lines under the clock, in order: each is set with set(name, html) */
export function createMiniHud(rows) {
  if (!styled) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    styled = true;
  }
  const hud = document.createElement('div');
  hud.className = 'm-hud';
  hud.innerHTML = `<div class="row clock"><span></span><b></b></div>${rows.map((name) => `<div class="row off" data-row="${name}"></div>`).join('')}`;
  const warning = document.createElement('div');
  warning.className = 'm-warn';
  document.body.append(hud, warning);
  const clockRow = hud.querySelector('.clock');
  const clockLabel = clockRow.querySelector('span');
  const clockText = clockRow.querySelector('b');
  const row = Object.fromEntries(rows.map((name) => [name, hud.querySelector(`[data-row="${name}"]`)]));
  const shown = { clock: '', label: '' };
  for (const name of rows) shown[name] = '';
  let sayUntil = 0;
  return {
    show(on) {
      hud.classList.toggle('on', !!on);
    },
    /** How long is left, seconds, with a word before it ("Rain in"); null takes the clock away. */
    clock(left, label = '') {
      clockRow.classList.toggle('off', left == null);
      if (left == null) return;
      const text = mmss(Math.ceil(left));
      if (shown.clock !== text) {
        clockText.textContent = text;
        clockRow.classList.toggle('low', left <= 30);
        clockRow.classList.toggle('last', left <= 10 && left > 0);
        shown.clock = text;
      }
      if (shown.label !== label) {
        clockLabel.textContent = label;
        shown.label = label;
      }
    },
    /** A line under the clock (null takes it away). `pop`: its number is seen to change. */
    set(name, html, pop = false) {
      if (shown[name] === html) return;
      const el = row[name];
      el.classList.toggle('off', html == null);
      if (html != null) el.innerHTML = html;
      if (pop && shown[name]) {
        const b = el.querySelector('b');
        b?.classList.remove('pop');
        void b?.offsetWidth;
        b?.classList.add('pop');
      }
      shown[name] = html;
    },
    /** A word over the middle of the picture until `now + seconds` of the story's clock (null hides it). */
    say(html, now = 0, seconds = 3) {
      if (html) warning.innerHTML = html;
      warning.classList.toggle('on', !!html);
      sayUntil = html ? now + seconds : 0;
    },
    /** Each frame, with the story's clock: takes the word away when it has been read. */
    tick(now) {
      if (sayUntil && now > sayUntil) {
        warning.classList.remove('on');
        sayUntil = 0;
      }
    },
    hide() {
      hud.classList.remove('on');
      warning.classList.remove('on');
      sayUntil = 0;
    },
  };
}
