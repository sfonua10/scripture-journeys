// The hunt: coming up with the beasts (beasts.js) and loosing at them (bow.js). "… slaying food by the way, with our
// bows and our arrows and our stones and our slings" (1 Nephi 16:15).
//
// Near the herd he goes softly of himself (no faster than a careful walk). The herd keeps a watch: every few seconds
// one lifts its head. While a head is up, the picture says so ("Be still"), and whoever moves in its sight alarms
// them; a bar fills as they take alarm, and when it is full they are gone to another feeding ground, and he must come
// up with them again. So: go while their heads are down; be still while one looks; and when near enough, draw.
//
// An arrow that falls wide stands where it fell. One who has no other must go and take it up again (it is marked,
// the one thing in this journey that is: a man can see his own arrow in the grass).
import { KINDS } from './bow.js';

const CSS = /* css */ `
#h-watch { position: fixed; left: 50%; top: 21%; transform: translateX(-50%); z-index: 5; pointer-events: none; text-align: center;
  opacity: 0; transition: opacity 0.25s; color: #fff; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.8); }
#h-watch.on { opacity: 1; }
#h-watch .say { font-size: 19px; letter-spacing: 0.14em; text-transform: uppercase; min-height: 1.3em; }
#h-watch .say.still { color: var(--gold, #e3bd6d); }
#h-watch .bar { width: 120px; height: 4px; margin: 6px auto 0; border-radius: 2px; background: rgba(0, 0, 0, 0.45); overflow: hidden; opacity: 0; transition: opacity 0.3s; }
#h-watch .bar.on { opacity: 1; }
#h-watch .bar i { display: block; height: 100%; width: 0; background: #e8a04a; }
@media (max-height: 500px) { #h-watch { top: 15%; } #h-watch .say { font-size: 16px; } }
`;

/**
 * @param g the game (main.js)
 * @param beasts createBeasts()
 * @param bow createBow()
 * @param ball createLiahona(): it points to where they feed
 */
export function createHunt(g, beasts, bow, ball) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const watch = document.createElement('div');
  watch.id = 'h-watch';
  watch.innerHTML = '<div class="say"></div><div class="bar"><i></i></div>';
  document.body.append(watch);
  const [say, bar] = watch.children;
  /** Whether he hunts them now (they take alarm), or they are only seen. */
  let active = false;
  let word = '';

  g.each((dt) => {
    beasts.update(dt, active ? { x: g.player.x, z: g.player.z, speed: g.player.speed } : null, !active);
    const on = active && !g.frozen;
    const still = on && beasts.watching;
    const fled = on && beasts.fleeing;
    const next = still ? 'Be still' : fled ? 'They are gone' : '';
    watch.classList.toggle('on', on && (!!next || beasts.alarm > 0.03));
    if (next !== word) {
      // (the last word stays as it fades, so the panel does not jump)
      if (next) say.textContent = next;
      word = next;
    }
    say.classList.toggle('still', still);
    bar.classList.toggle('on', on && beasts.alarm > 0.03);
    bar.firstChild.style.width = `${Math.round(beasts.alarm * 100)}%`;
  });

  const nearest = () => {
    let best = null;
    let d = Infinity;
    for (const b of beasts.alive()) {
      const far = Math.hypot(b.x - g.player.x, b.z - g.player.z);
      if (far < d) {
        d = far;
        best = b;
      }
    }
    return { beast: best, far: d };
  };

  return {
    /**
     * He hunts until `need` beasts are struck (or `unless()` says to give it up). Resolves with those struck. The herd
     * is the one already set feeding (beasts.herd), and the bow the one in his hand (bow.take).
     * `softly`: how near them he begins to go softly, and `cap` how fast that is; `point`: the ball points to them;
     * `struck(b, n)`: told as each falls.
     */
    async run(c, { need = 1, softly = 62, cap = 2.5, point = true, unless = null, struck = null } = {}) {
      active = true;
      bow.ready(c, true);
      const fell = [];
      let pointAt = 0;
      const range = () => KINDS[bow.state.kind]?.range ?? 30;
      await c.until(() => {
        const { beast, far } = nearest();
        g.burden(far < softly ? cap : null);
        // the arrow that fell wide: taken up again by walking to it
        const lies = bow.state.lies;
        if (lies && Math.hypot(g.player.x - lies[0], g.player.z - lies[1]) < 2.1) {
          bow.gather();
          g.music.pluck();
        }
        const b = bow.takeStruck();
        if (b) {
          fell.push(b);
          struck?.(b, fell.length);
        }
        if (fell.length >= need) return true;
        if (point && c.time > pointAt) {
          const mid = beasts.middle();
          if (mid) ball.point(mid, { quiet: true });
          pointAt = c.time + 0.5;
        }
        // what is marked, and where the autopilot goes: to his arrow if he has none; else (the autopilot only) up to
        // the nearest of them while no head is up, as near as the bow needs
        const fetch = bow.state.arrows === 0 && bow.state.lies ? { x: bow.state.lies[0], z: bow.state.lies[1], r: 1.6, mark: true } : null;
        if (fetch) c.lead(fetch);
        else if (g.auto && beast && !beasts.watching && bow.state.draw <= 0 && !bow.flying) c.lead({ x: beast.x, z: beast.z, r: (range() * 0.66) / 0.6, mark: false });
        else c.lead(null);
        return !!unless?.();
      });
      active = false;
      g.burden(null);
      bow.ready(c, false);
      c.lead(null);
      return fell;
    },
    /** No hunt (as a scene begins). */
    stop() {
      active = false;
      watch.classList.remove('on');
    },
  };
}
