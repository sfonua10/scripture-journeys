// The people about the place in a short game (hosea.js, locust-years.js): who they are, where each is, what each is
// about (life.js: steps gone through over and over), and the small ones kept from sinking into the ground. They are
// the game's own: no one the text names.

/**
 * @param g the game (main.js)
 * @param life createLife(g)
 * @param people [{ name, dress?, at: [x, z], face: [x, z], day: [steps] }]
 * @param clothes the journey's clothes, by name
 */
export function createFolk(g, life, people, clothes) {
  const who = (name) => g.cast.get(name);
  // A child who kneels or sits is lifted by what the pose lowers a grown man and a child does not need (npc.js lowers
  // every figure by the same metres, whatever its height), so the small ones are not sunk in the ground.
  const SINK = { kneel: 0.46, sit: 0.76 };
  g.each(() => {
    for (const p of people) {
      const npc = who(p.name);
      const scale = npc?.man?.object.scale.x ?? 1;
      if (npc && scale < 0.99) npc.raise = (1 - scale) * (SINK.kneel * (npc.kneelK ?? 0) + SINK.sit * (npc.sitK ?? 0));
    }
  });
  return {
    people,
    /** Puts each where they are when it begins, dressed, and about what they do. */
    begin() {
      life.clear();
      for (const p of people) {
        const npc = who(p.name);
        if (p.dress) npc.w.dress(clothes[p.dress]);
        npc.place(p.at[0], p.at[1], Math.atan2(p.face[0] - p.at[0], p.face[1] - p.at[1])).face(...p.face);
        Object.assign(npc, { kneel: 0, sit: 0, bow: 0, aura: 0 });
        if (p.day?.length) life.live(npc, p.day);
      }
    },
    /** All leave off what they were about, and stand looking at a place (or go on with `day`, if it gives them one). */
    turn(to, day = null) {
      life.clear();
      for (const p of people) {
        const npc = who(p.name);
        const steps = day?.(p);
        if (steps?.length) life.live(npc, steps);
        else {
          Object.assign(npc, { kneel: 0, sit: 0 });
          npc.stop().face(...to);
        }
      }
    },
    /** Each goes back to what they were about. */
    resume() {
      life.clear();
      for (const p of people) if (p.day?.length) life.live(who(p.name), p.day);
    },
    stop() {
      life.clear();
    },
  };
}
