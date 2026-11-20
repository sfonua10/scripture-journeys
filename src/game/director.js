// Runs the story. Each beat of story.js is an async script that waits on the world: for a card to be read, for
// Nephi to reach a place, for him to act on something, for a few seconds to pass. The waits are checked once a
// frame from the game's loop, so the story and the painting keep the same clock (and a test can step both).
//
// The beat reached is kept in the browser (stories.js, keeper), so a family can stop and come back to the same act.
// With ?auto the director plays itself: it walks Nephi to each place, reads each card and acts, for tests.

/**
 * @param beats [{ id, act, label, setup(g), run(c, g) }] in order
 * @param ui createUI()
 * @param g the game: player, standAt, setHour, cast, ... (see main.js)
 * @param options.auto play itself
 * @param options.keep the story's keeper (stories.js): where the beat reached is kept, and that it was finished
 * @param options.on told as the story goes: `on('beat', beat)` as each beat begins, `on('end', beat)` at its end
 */
export function createDirector(beats, ui, g, { auto = false, autoRead = 0.15, keep = null, on = null } = {}) {
  let time = 0;
  const waits = [];
  let pressed = false;
  /** The key last pressed, for a card that asks for a choice; taken up by whoever reads it. */
  let key = null;
  let current = null;
  /** Where the story wants Nephi to go: { x, z, r } or null. The autopilot walks there. */
  let goal = null;
  let interactable = null;
  let frozen = 0;
  let ended = false;
  /** A card is asking for one of its answers: a tap that is not on an answer takes none. */
  let asking = false;
  /** A line (c.line) is up at the top: a card that comes takes it away, so the two are not read at once. */
  let lineUp = false;
  /**
   * Something else he may do where he stands, when the story asks nothing of him there (c.also): asked each frame,
   * it gives `{ label, act() }` or nothing. `offer` is what it gave this frame; `own` that the story's own prompt is
   * up this frame, which comes before it; `offered` that its prompt is the one showing.
   */
  let also = null;
  let offer = null;
  let own = false;
  let offered = false;
  const clearLine = () => {
    if (!lineUp) return;
    lineUp = false;
    ui.toast('', '', 0);
  };

  const confirmKeys = new Set(['KeyE', 'Enter', 'Space', 'NumpadEnter']);
  /** E (or the mouse's button, or a finger on the prompt) is down now: for what must be held, not only pressed. */
  let held = false;
  addEventListener('keydown', (e) => {
    if (confirmKeys.has(e.code)) held = true;
    if (e.repeat) return;
    if (confirmKeys.has(e.code)) pressed = true;
    key = e.code;
  });
  addEventListener('keyup', (e) => {
    if (confirmKeys.has(e.code)) held = false;
  });
  addEventListener('blur', () => (held = false));
  g.canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && document.pointerLockElement === g.canvas) pressed = held = true;
  });
  addEventListener('mouseup', (e) => {
    if (e.button === 0) held = false;
  });

  const until = (test) =>
    new Promise((done) => {
      waits.push({ test, done });
    });
  const near = (x, z, r) => Math.hypot(g.player.x - x, g.player.z - z) < r;

  /** What a beat's script can do. */
  const c = {
    get time() {
      return time;
    },
    wait: (seconds) => {
      const t = time + seconds;
      return until(() => time >= t);
    },
    until,
    /**
     * A card, read before the story goes on. Nephi stands still while it is up. `voice` names its recording where
     * it is not the whole of the verses its reference names (a verse cut short: scripture-daniel.js, EXCERPTS).
     */
    async card(text, ref = '', { voice: named = null, ...options } = {}) {
      frozen++;
      pressed = false;
      clearLine();
      ui.card.show({ text, ref, ...options });
      // read aloud, where there is a recording of it (narration.js): the card then goes on by itself a moment
      // after the reading ends, and a press still goes on at once
      const voice = (named ?? ref) ? g.narration?.say(named ?? ref) : null;
      let readAt = null;
      const shown = time;
      await until(() => {
        if (voice?.ended) readAt ??= time;
        return time - shown > (auto ? autoRead : 0.45) && (pressed || auto || (readAt != null && time - readAt > 0.8));
      });
      pressed = false;
      if (voice) g.narration.stop();
      ui.card.hide();
      frozen--;
      await c.wait(0.25);
    },
    /** A verse or a run of them, from scripture.js, as a card. */
    async verse(first, last = first, options = {}) {
      await c.card(g.verses(first, last), g.reference(first, last), options);
    },
    thought: (text, options = {}) => c.card(text, '', { kind: 'thought', ...options }),
    toast: (text, ref, seconds) => {
      if (ref) g.narration?.say(ref);
      ui.toast(text, ref, seconds);
    },
    /**
     * A line of scripture shown at the top while the walk goes on, for a verse that tells what is happening: it
     * stays as long as it takes to read (or to be read aloud). Resolves when it has been, so that what comes next
     * does not cut it short; nothing need wait on it.
     */
    line(text, ref, { voice: named = null, who = '', from = '', least = 6 } = {}) {
      const words = text.split(/\s+/).length;
      const seconds = Math.max(least, words * 0.42);
      const voice = (named ?? ref) ? g.narration?.say(named ?? ref) : null;
      ui.toast(text, ref, seconds + 1, { who, from });
      lineUp = true;
      const shown = time;
      return until(() => (voice ? voice.ended || time - shown > seconds * 2.2 : time - shown > seconds) || auto);
    },
    /**
     * What one of them says, in the story's own words and not the scripture's: a card under their name, read before
     * the story goes on, with where it is from (`from`: "1 Nephi 3:22") small under it in place of a reference.
     */
    said: (who, text, { voice = null, from = '' } = {}) => c.card(text, '', { who, from, kind: 'said', voice }),
    /** The same said as they go: a line low on the screen under their name, which stops no one. Resolves when it has been said. */
    aside: (who, text, { voice = null, from = '' } = {}) => c.line(text, '', { who, from, voice, least: 2.4 }),
    /**
     * The line saying what to do (null to take it away), and under it a list of [{ label, done }] if there is one.
     * With a few words of it second ("Gate of Jerusalem"), those are what the pill it is drawn in to says (ui.js):
     * (text, list), (text, short) or (text, short, list).
     */
    objective: (text, a, b) => ui.objective(text, a, b),
    /**
     * Waits for Nephi to come within r of (x, z). `via` is the way there, a few points (through the gate, along the
     * streets): the marker shows the next of them, and the autopilot walks them. `mark: false` for no marker.
     * A point of the way is [x, z], which he must come to (a gate, a door, a street's corner), or [x, z, r] with r of
     * 10 or more for one in open country, which only shows the way: it is behind him as soon as he is nearer the
     * next than it is, however wide of it he went, so the marker is never left at his back.
     * `unless` is asked each frame: when it says so the wait is given up. Resolves true if he got there.
     */
    async reach(x, z, r = 4, { via = [], mark = true, unless = null } = {}) {
      const stops = [...via.map(([px, pz, pr = 3.5]) => ({ x: px, z: pz, r: pr, open: pr >= 10 })), { x, z, r }];
      const passed = (a, b) => a.open && Math.hypot(g.player.x - b.x, g.player.z - b.z) < Math.hypot(a.x - b.x, a.z - b.z);
      let k = 0;
      let there = false;
      await until(() => {
        // (skip on to the furthest stop he is already near)
        for (let j = stops.length - 1; j > k; j--) if (near(stops[j].x, stops[j].z, stops[j].r)) k = j;
        while (k < stops.length - 1 && (near(stops[k].x, stops[k].z, stops[k].r) || passed(stops[k], stops[k + 1]))) k++;
        goal = { ...stops[k], mark };
        there = near(x, z, r);
        return there || !!unless?.();
      });
      goal = null;
      return there;
    },
    /**
     * Waits for Nephi to act (E) within r of (x, z), showing the prompt while he is near. `unless` is asked each
     * frame: when it says so the wait is given up. Resolves true if he acted.
     * In place of (x, z) it may be given someone who moves ({ x, z }, one of the cast): `act(lehi, r, label)`. The
     * place is then wherever he is, asked each frame, and the marker and the autopilot go where he goes.
     */
    async act(...args) {
      const on = typeof args[0] === 'object' ? args.shift() : null;
      const fixed = on ? null : args.splice(0, 2);
      const [r, label, { mark = true, unless = null } = {}] = args;
      pressed = false;
      let acted = false;
      await until(() => {
        const [x, z] = on ? [on.x, on.z] : fixed;
        goal = { x, z, r: r * 0.7, mark };
        interactable = { x, z, r, label };
        const close = near(x, z, r) && !frozen;
        // (away from it, the prompt is left to whatever else there is to do where he stands: `also`)
        if (close) own = true;
        if (close || !offer) ui.prompt(close ? label : null);
        if (close && (pressed || auto)) return (acted = true);
        if (!close) pressed = false;
        return !!unless?.();
      });
      pressed = false;
      ui.prompt(null);
      interactable = null;
      goal = null;
      return acted;
    },
    /**
     * A prompt for something he can do wherever he stands (null to take it away); `pressed` says if he has. With
     * `hold` (0 to 1) it is something to be held down, and shows how far it has come; `holding` says if it is held.
     */
    prompt: (label, hold = null) => ui.prompt(label, hold),
    get pressed() {
      return pressed && !frozen;
    },
    get holding() {
      return (held || auto) && !frozen;
    },
    /**
     * A card that asks, with a few answers under it: W, A, S and D (or the arrows) go between them, E takes one; or 1, 2.
     * Resolves with the number of the answer taken. The autopilot takes `auto`. What is asked is a thought, in
     * italic; with `ref` it is the scripture's own words (a verse with a word left out), and is shown as scripture.
     */
    async choice(text, answers, { auto: autoPick = 0, who = '', ref = '', keep = false } = {}) {
      frozen++;
      asking = true;
      pressed = false;
      key = null;
      clearLine();
      let at = 0;
      let picked = -1;
      const show = () => ui.card.show({ text, who, ref, kind: ref ? 'scripture' : 'thought', answers, at, hint: ui.touch ? '' : 'Arrow keys to choose · E to answer', onPick: (i) => (picked = i) });
      show();
      const shown = time;
      await until(() => {
        const k = key;
        key = null;
        if (auto) return time - shown > autoRead && ((at = autoPick), true);
        if (picked >= 0) return ((at = picked), true);
        if (time - shown < 0.45) return false;
        const digit = /^(Digit|Numpad)([1-9])$/.exec(k ?? '');
        if (digit && Number(digit[2]) <= answers.length) return ((at = Number(digit[2]) - 1), true);
        // (down or right to the next, up or left to the one before: the answers may lie in a row or one under another)
        const step = ['KeyS', 'ArrowDown', 'KeyD', 'ArrowRight'].includes(k) ? 1 : ['KeyW', 'ArrowUp', 'KeyA', 'ArrowLeft'].includes(k) ? -1 : 0;
        if (step) {
          at = (at + step + answers.length) % answers.length;
          show();
        }
        // (a click takes the answer that is lit, as E does)
        return pressed;
      });
      pressed = false;
      asking = false;
      // (with `keep` the card stays up, for what is shown next in its place: the verse with its word filled in)
      if (!keep) {
        ui.card.hide();
        frozen--;
        await c.wait(0.25);
      } else frozen--;
      return at;
    },
    /** To black (1) or back (0), over some seconds, and waits for it. */
    async fade(to, seconds = 1) {
      ui.fade(to, seconds);
      await c.wait(seconds + 0.05);
    },
    async chapter(act, name, sub, seconds = 3.2) {
      ui.chapter(act, name, sub);
      await c.wait(seconds);
      ui.chapter(null);
      await c.wait(1);
    },
    /** Holds Nephi still (for a scene that plays out in front of him) while the promise runs. */
    async hold(promise) {
      frozen++;
      try {
        return await promise;
      } finally {
        frozen--;
      }
    },
    freeze(on) {
      frozen += on ? 1 : -1;
    },
    /**
     * Something else he may do where he stands, besides what the story waits on: `ask()` is asked each frame, and
     * gives `{ label, act() }` (the prompt, and what E then does) or nothing. One of the camp to speak to (life.js).
     * What the story itself asks of him at that place comes first. The autopilot does none of it.
     */
    also(ask) {
      also = ask;
    },
    /** Where the autopilot should walk while nothing is waited on (the Spirit's leading, in act three). */
    lead(point) {
      goal = point;
    },
  };

  async function play(from) {
    const start = Math.max(0, beats.findIndex((b) => b.id === from));
    for (let i = start; i < beats.length; i++) {
      current = beats[i];
      // the first beat sets the world up; so does each that opens a new scene, after the dark between them
      if (i === start || current.scene) current.setup?.(g);
      // (a line said as they went belongs to the scene it was said in: it does not follow them into the next)
      if (current.scene) {
        lineUp = false;
        ui.toast('', '', 0);
      }
      // (a beat that does not open its own scene from the dark is shown at once)
      if (i === start && !current.scene) ui.fade(0, 1);
      keep?.keep(current.id, current.label);
      g.log(`beat ${current.id}`);
      on?.('beat', current);
      await current.run(c, g);
    }
    ended = true;
    keep?.keep(null);
    if (keep) keep.done = true;
    on?.('end', current);
    g.log('the end');
  }

  return {
    c,
    get beat() {
      return current?.id ?? null;
    },
    get ended() {
      return ended;
    },
    get frozen() {
      return frozen > 0;
    },
    get goal() {
      return goal;
    },
    get interactable() {
      return interactable;
    },
    auto,
    /** The beat a family could come back to, with its act's name, or null. */
    saved() {
      const beat = beats.find((b) => b.id === keep?.place?.id);
      return beat ? { id: beat.id, label: beat.label } : null;
    },
    forget() {
      keep?.keep(null);
    },
    play,
    /** As E: from the touch controls' act button. */
    press() {
      pressed = true;
    },
    /** A finger down on the prompt, or lifted from it: as E held, and let go. */
    hold(on) {
      held = !!on;
    },
    /** A tap on the screen: goes on from a card and acts, as a click does, but answers nothing. */
    tap() {
      if (!asking) pressed = true;
    },
    update(dt) {
      time += dt;
      const acted = pressed;
      offer = (!frozen && !auto && also?.()) || null;
      own = false;
      // (a wait that is met may start another, which is checked next frame)
      for (let i = waits.length - 1; i >= 0; i--) {
        if (waits[i].test()) {
          const { done } = waits[i];
          waits.splice(i, 1);
          done();
        }
      }
      // what else there is to do here, where the story's own prompt is not up
      if (offer && !own && !frozen) {
        ui.prompt(offer.label);
        offered = true;
        if (acted) offer.act();
      } else if (offered) {
        if (!own) ui.prompt(null);
        offered = false;
      }
      pressed = false;
      key = null;
    },
  };
}
