// The people of a camp, living their own lives: each goes about what is his to do (sits before his tent, walks to the
// river, carries water), over and over, whether Nephi is by or not. They know when he is near: a head turns to him as
// he passes; one who is walking stops and faces him, says what he has to say, once, and goes on with his day. None of
// them walks through him. And he may speak to any of them himself (E, when he is by one: `offer`): the one spoken to
// leaves off, turns to him and answers, something else each time, and then goes on with what he was about.
//
// One who goes with Nephi (`with`: a brother who follows him, Zoram behind him) is moved by the story, not by this:
// his head turns to Nephi, he answers when he is spoken to, and (`every`) he says something of his own now and then
// as they go. One who has nothing to say (`greets`: the people of the city) is greeted, and answers it with his face:
// he stops, turns to Nephi a moment, and goes on.
//
// They are free until the story needs them. When something is to be played out (their father speaks, they are called
// to the journey), the story takes hold of those it needs (`hold`) and stands them where it will; and gives them back
// (`resume`) when it is done, and each goes back to what he was about.
//
// What each does is a list of steps, gone through in order and then again from the first:
//   { go: [[x, z], ...], pace }     walks the points
//   { stay: seconds, face, sit, kneel, look }   stays where he has come to: facing a point ([x, z], or a function
//                                   that gives one), sitting on the ground, on his knees, or looking about him
//   { take: 'waterjar', hold }      takes a thing up in both hands (props.carry; `hold` is how it is carried)
//   { put: 'waterjar', at, up }     sets it down (at [x, z], or before his feet)
//   { then(npc) }                   anything else, done at once
// Every wait is on the game's own clock and of a fixed length, so that a test stepped by hand sees the same day
// every time.
//
// Each is one of the cast (npc.js): this only tells him where to go and what to do, as the people of the city are
// told (town.js).

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** How near Nephi must be to one of them to speak to him, in metres. */
const REACH = 2.8;

/**
 * @param g the game (main.js): its player, its props, whether a card holds him still
 */
export function createLife(g) {
  /** npc → what he is about: { npc, steps, at, token, state, notice, ... } */
  const lives = new Map();
  const timers = [];
  let time = 0;
  // what has been said (each thing once), whether anyone is saying something now, and when the last was done
  const said = new Set();
  let speaking = false;
  let lastSpoke = -Infinity;
  let quiet = false;

  const me = () => [g.player.x, g.player.z];
  /** Waits `seconds` of the game's clock, for the one whose wait it is (who is let go of it if he is taken hold of). */
  const wait = (seconds, owner) => new Promise((done) => void timers.push({ at: time + seconds, done, owner }));
  /** Lets go of everything he waits on: his walk, his rests. What he was doing sees that it is no longer his to do. */
  function drop(l) {
    l.token++;
    for (let i = timers.length - 1; i >= 0; i--) if (timers[i].owner === l) timers.splice(i, 1)[0].done();
  }
  /** The same, and he stops where he is (one who goes with Nephi is the story's to stop, and is not stopped). */
  function cut(l) {
    const going = l.state === 'with';
    drop(l);
    if (!going) l.npc.stop();
  }
  const rise = (npc) => Object.assign(npc, { sit: 0, kneel: 0 });

  /** Where he should be for a step that is not a walk: where the walk before it ended. */
  function homeOf(steps, i) {
    for (let k = 1; k <= steps.length; k++) {
      const go = steps[(i - k + steps.length) % steps.length].go;
      if (go) return go[go.length - 1];
    }
    return null;
  }

  async function step(l, s, alive, resumed) {
    const { npc } = l;
    const walk = async (points, pace) => {
      // (one who sits gets up before he goes)
      if (npc.sit || npc.kneel) {
        rise(npc);
        await wait(0.9, l);
        if (!alive()) return;
      }
      npc.idle = null;
      npc.face(null);
      await npc.walk(points, pace);
    };
    if (s.go) {
      let points = s.go;
      if (resumed && points.length > 1) {
        // taken up again part way along: from the point nearest him, or the next if he is already past it
        const here = [npc.x, npc.z];
        let k = 0;
        for (let i = 1; i < points.length; i++) if (dist(points[i], here) < dist(points[k], here)) k = i;
        if (k + 1 < points.length && dist(here, points[k + 1]) < dist(points[k], points[k + 1])) k++;
        points = points.slice(k);
      }
      await walk(points, s.pace ?? 1.3);
      return;
    }
    // (taken up again somewhere else than where this is done: he goes back there first)
    if (resumed) {
      const home = homeOf(l.steps, l.at);
      if (home && dist(home, [npc.x, npc.z]) > 1.2) {
        await walk([home], 1.3);
        if (!alive()) return;
      }
    }
    if ('stay' in s) {
      const face = typeof s.face === 'function' ? s.face() : s.face;
      if (face) npc.face(...face);
      npc.idle = s.look ? 'look' : null;
      if (s.sit) npc.sit = 1;
      if (s.kneel) npc.kneel = 1;
      await wait(s.stay, l);
      if (!alive()) return;
      npc.idle = null;
      // (from his knees he gets up when he is done; one who sits, sits until he has somewhere to go)
      if (s.kneel) {
        npc.kneel = 0;
        await wait(0.9, l);
      }
    } else if (s.take) g.props.carry(s.take, npc, s.hold);
    else if (s.put) g.props.show(s.put, s.at ?? [npc.x + Math.sin(npc.yaw) * 0.5, npc.z + Math.cos(npc.yaw) * 0.5], { up: s.up ?? 0 });
    else s.then?.(npc);
  }

  /** Goes on with his day from the step he is at, until he is taken hold of. */
  async function run(l, resumed = false) {
    const token = ++l.token;
    const alive = () => l.token === token && lives.get(l.npc) === l;
    if (!l.steps.length) return;
    while (alive()) {
      await step(l, l.steps[l.at], alive, resumed);
      if (!alive()) return;
      resumed = false;
      l.at = (l.at + 1) % l.steps.length;
      // (a step that takes no time still gives the frame back: a day of such steps must not be gone through at once)
      await wait(0.05, l);
    }
  }

  /** What he has yet to say to Nephi, if anything: the name of a line, or null. */
  const pending = (l) => {
    if (quiet || !life.voice) return null;
    const key = l.notice?.say?.();
    return key && !said.has(key) ? key : null;
  };
  /** The same, if it is time for it (a thing may be kept for one who is still by after a while). */
  const line = (l) => (time < (l.notice?.from ?? 0) ? null : pending(l));
  /** Whether it can be said this moment: no one else is speaking, no card is up, the story has nothing of its own being said. */
  const maySpeak = () => !speaking && !g.frozen && (life.free?.() ?? true) && time - lastSpoke > 1.2;
  function speak(l, key) {
    said.add(key);
    speaking = l.talking = true;
    Promise.resolve(life.voice(key)).then(() => {
      speaking = l.talking = false;
      lastSpoke = l.spokeAt = time;
    });
  }
  /** He leaves off what he was doing and gives himself to Nephi, who is near. */
  function attend(l, here) {
    const { npc } = l;
    const n = l.notice;
    cut(l);
    l.state = 'attending';
    l.since = time;
    l.spokeAt = null;
    npc.idle = null;
    if (n.waits) rise(npc);
    // (one who comes to him: a few steps, and stops short of him)
    const d = dist(here, [npc.x, npc.z]);
    if (n.comes && d > 3) {
      const k = (d - 2.4) / d;
      npc.face(null);
      npc.walk([[npc.x + (here[0] - npc.x) * k, npc.z + (here[1] - npc.z) * k]], 1.7);
    }
  }
  /** And goes back to his day. */
  function leave(l) {
    l.state = 'living';
    // (he is not stopped again at once by one who walks beside him)
    l.cooled = time + 9;
    l.npc.stop().face(null);
    run(l, true);
  }

  /** What he answers when Nephi speaks to him: the names of a few lines, as things are now. */
  const answers = (l) => l.notice?.answers?.() ?? [];
  /** The next of what he answers: the first not yet heard, and when all have been, each again in its turn. */
  const next = (l, keys = answers(l)) => keys.find((k) => !said.has(k)) ?? keys[l.asked++ % keys.length];
  /**
   * Nephi speaks to him. He leaves off what he was doing and turns to him (one who sits, or is on his knees, answers
   * from where he is; one who goes with him, or stands looking after him, answers as he is), and says what he had yet
   * to say of himself, if he has not said it, else the next of his answers. One who has no words for him (`greets`)
   * stops and turns to him all the same, and a moment after goes on.
   */
  function address(l) {
    const keys = answers(l);
    if (speaking || (!keys.length && !l.notice?.greets)) return;
    const { npc } = l;
    const down = npc.sit > 0 || npc.kneel > 0;
    if (l.state === 'living' && (!down || !keys.length)) attend(l, me());
    // (spoken to again before he has gone back to his day: he stays for it)
    else if (l.state === 'attending') Object.assign(l, { since: time, spokeAt: null });
    npc.look = me();
    if (keys.length) speak(l, pending(l) ?? next(l, keys));
  }

  function aware(l) {
    const { npc } = l;
    if (!npc.visible || l.state === 'held') return;
    const here = me();
    const d = dist(here, [npc.x, npc.z]);
    if (l.state === 'with') {
      // (going with him: he looks to him when he is by; and now and then, as they go, says something of his own)
      npc.look = d < 9 ? here : null;
      const n = l.notice;
      if (n?.every && d < (n.near ?? 6) && time - (l.spokeAt ?? l.since) > n.every && maySpeak()) {
        const keys = answers(l);
        if (keys.length) speak(l, next(l, keys));
      }
      return;
    }
    if (l.state === 'watching') {
      // (he looks after him, wherever he goes; and says what he had to say to him, if he has not)
      npc.look = here;
      if (npc.mode === 'stand') npc.face(...here);
      const key = line(l);
      if (key && d < (l.notice?.near ?? 4.2) && maySpeak()) speak(l, key);
      return;
    }
    // a head turns to one who is near (what is behind him he does not turn to: npc.js)
    npc.look = d < 9 ? here : null;
    const n = l.notice;
    if (!n) return;
    const near = n.near ?? 4.2;
    const key = line(l);
    if (l.state === 'living') {
      const down = npc.sit > 0 || npc.kneel > 0;
      // (he stops for Nephi if he has something to say to him, or if he would else walk by him at arm's length)
      // (one who `passes` goes by him, as a stranger in a street does: he stops only when he is greeted)
      if (n.waits ? d < near : d < near && time >= (l.cooled ?? 0) && !down && (pending(l) || (!n.passes && npc.mode === 'walk' && d < 3))) attend(l, here);
      // (one who sits says it from where he sits, and does not get up for it)
      else if (down && key && d < near && maySpeak()) speak(l, key);
      return;
    }
    // Attending: turned to him, saying what there is to say when it is time for it. One who waits for him stays so
    // for as long as he is by. Anyone else goes back to his day when Nephi has gone on; or a moment after he has
    // said his say (or, having nothing to say, after a few moments); and in any case before long.
    if (npc.mode === 'stand') npc.face(...here);
    if (key && d < near + 1 && maySpeak()) speak(l, key);
    const stood = time - l.since;
    const done = !pending(l) && (l.spokeAt != null ? time - l.spokeAt > 2.5 : stood > (n.greets ? 2.6 : 4.5));
    const gone = n.waits ? d > near + 2.5 : !l.talking && (d > near + (n.comes ? 3 : 1.5) || done || stood > 16);
    if (gone) leave(l);
  }

  const each = (npcs, fn) => {
    for (const npc of npcs) {
      const l = lives.get(npc);
      if (l) fn(l);
    }
  };

  const life = {
    /** How a line is said (the story gives it: `(key) => promise`, done when it has been said). Until it is given, no one speaks. */
    voice: null,
    /** Asked before anyone speaks: false while the story has something of its own being said. */
    free: null,
    /**
     * Gives one of the cast his day: the steps he goes through, beginning at step `from`. `notice` is how he takes
     * Nephi's coming near (see `notice`).
     */
    live(npc, steps, { from = 0, notice = null } = {}) {
      const was = lives.get(npc);
      if (was) cut(was);
      const l = { npc, steps, at: from % Math.max(1, steps.length), token: 0, state: 'living', notice: null, cooled: 0, since: 0, talking: false, asked: 0 };
      lives.set(npc, l);
      npc.yields = g.player;
      if (notice) life.notice(npc, notice);
      run(l);
      return life;
    },
    /**
     * How he takes Nephi's coming near. `say()` gives the name of what he would say now (or nothing): it is said
     * once, when Nephi is within `near` metres (4.2), and not before `after` seconds from now. One who `waits` stops
     * and stands turned to him for as long as he is near, and says nothing. One who `comes` goes a few steps to him.
     * `answers()` gives the names of what he answers when Nephi speaks to him (`offer`), and `as` is who he is to
     * Nephi, for the prompt ("your mother", "Sam"); these two stay as they were when they are not given again.
     */
    notice(npc, { say = null, near = 4.2, after = 0, waits = false, comes = false, answers: given, as, greets = false, passes = false, label = null, every = 0 } = {}) {
      const l = lives.get(npc);
      if (l) {
        const was = l.notice;
        l.notice = { say, near, waits, comes, from: time + after, answers: given === undefined ? was?.answers : given, as: as ?? was?.as ?? 'him', greets, passes, label: label ?? was?.label ?? null, every };
      }
      return life;
    },
    /**
     * One who goes with Nephi: the story moves him (follow, lead, walk), and this only turns his head to him and
     * has him answer when he is spoken to (`notice`, as above: `answers`, `as`; and `every`, seconds between the
     * things he says of his own as they go, while Nephi is within `near`, 6 metres). Taken up from his day, he is
     * not stopped: what the story has him do next he does.
     */
    with(npc, notice = {}) {
      const was = lives.get(npc);
      if (was) drop(was);
      rise(npc);
      const l = { npc, steps: [], at: 0, token: 0, state: 'with', notice: null, cooled: 0, since: time, talking: false, asked: 0, spokeAt: null };
      lives.set(npc, l);
      Object.assign(npc, { idle: null, yields: null });
      life.notice(npc, { near: 6, ...notice });
      return life;
    },
    /**
     * Whom Nephi could speak to from where he stands, if anyone: the nearest of them within reach who is about his
     * own day and has something to answer. `{ label, act() }` for the director (c.also), or null: no one is near, or
     * someone is speaking, or the story has them.
     */
    offer() {
      if (!life.voice || quiet || speaking || g.frozen || !(life.free?.() ?? true)) return null;
      const here = me();
      let best = null;
      let least = REACH;
      for (const l of lives.values()) {
        if (!l.npc.visible || l.state === 'held' || (!answers(l).length && !(l.notice?.greets && l.state === 'living'))) continue;
        const d = dist(here, [l.npc.x, l.npc.z]);
        if (d < least) [best, least] = [l, d];
      }
      return best && { label: best.notice.label ?? `Speak with ${best.notice.as}`, act: () => address(best) };
    },
    /** The story takes hold of them: each leaves off what he was doing, gets up, and stands until he is told. */
    hold(...npcs) {
      each(npcs, (l) => {
        cut(l);
        l.state = 'held';
        rise(l.npc);
        Object.assign(l.npc, { idle: null, look: null });
      });
      return life;
    },
    /** And gives them back: each goes back to what he was about (only those it had hold of). */
    resume(...npcs) {
      each(npcs, (l) => {
        if (l.state !== 'held') return;
        l.npc.face(null);
        l.state = 'living';
        // (one who has something yet to say to Nephi, who is still by, turns to him and does not walk off)
        l.cooled = time;
        run(l, true);
      });
      return life;
    },
    /** They leave off what they were doing and stand looking after Nephi, wherever he goes. */
    watch(...npcs) {
      each(npcs, (l) => {
        if (l.state === 'watching') return;
        cut(l);
        l.state = 'watching';
        rise(l.npc);
        l.npc.idle = null;
      });
      return life;
    },
    /** They are no longer the camp's to move: the story has them from here (one who goes with Nephi). */
    end(...npcs) {
      each(npcs, (l) => {
        cut(l);
        lives.delete(l.npc);
        rise(l.npc);
        Object.assign(l.npc, { look: null, idle: null, yields: null });
      });
      return life;
    },
    /** No one says anything more (he has gone: what they would have said, they did not). */
    hush() {
      quiet = true;
    },
    /** Whether he is one of those living here, and what he is doing: 'living', 'attending', 'held', 'watching', 'with'. */
    state: (npc) => lives.get(npc)?.state ?? null,
    /** Everyone is let go: a new scene. */
    clear() {
      for (const l of [...lives.values()]) {
        cut(l);
        rise(l.npc);
        Object.assign(l.npc, { look: null, idle: null, yields: null });
      }
      lives.clear();
      said.clear();
      quiet = speaking = false;
      lastSpoke = -Infinity;
      life.voice = life.free = null;
    },
    update(dt) {
      time += dt;
      for (let i = timers.length - 1; i >= 0; i--) if (time >= timers[i].at) timers.splice(i, 1)[0].done();
      for (const l of lives.values()) aware(l);
    },
  };
  g.each((dt) => life.update(dt));
  return life;
}
