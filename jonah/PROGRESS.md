# Jonah: progress

> **Status: five of six chapters play end to end.** Chapters 1, 3, 4, 5 and 6, the title scene and the ending are
> done and the bot finishes each at desktop (Normal) and phone (Story) size with no assists. Chapter 2 (Joppa
> Harbor) is still being written in its own worktree. The final summary (how to run it, what to check first) is
> written here when all six play.

If you are picking this up: read `PLAN.md`, then this file from the top. The checklist in `PLAN.md` is the list of
work; this file says which of it is done and what was learned.

## How to run it now

```
cd jonah
npm install
npm run dev                      # http://127.0.0.1:5390  (JONAH_PORT=5391 npm run dev for a second checkout)
node tools/playthrough.mjs 3     # the bot plays chapter 3; add --size phone, --diff story, --shots, --verbose
node tools/shots.mjs --q "ch=3&nocard&seek=wares" --name look     # a screenshot to shots/look.png
node tools/probe.mjs --q "ch=3&nocard&bot" --eval "(g) => g.player.pos.toArray()" --from 20000 --count 5
```

Address parameters: `?ch=N` (1–6, 9 = test yard), `?q=low|medium|high`, `?bot`, `?speed=2`, `?nocard`,
`?diff=story|normal`, `?seek=<phase>` (chapter 3: asleep, wake, wares, jobs, chaos, lots, words, rowing, cast, calm),
`?fps`, `?touch=1`, `?mute`, `?nosave`, `?ending`. Each chapter's `?seek=` names are in `notes/chN.md`.

## Done

- Brief saved, plan written, project scaffolded (Vite + TypeScript + three 0.186.1 + Rapier 0.17.3).
- **Core engine**: renderer and loop (fixed 60 Hz physics, interpolated drawing), three quality levels with auto-pick,
  post pass (grade, vignette, bloom), Rapier world and props, one action map over keyboard/mouse, touch and
  controller, procedural audio (effects, weather beds, a small score), level builder, textures, sky, particles, the
  robed figure and its animation, the player controller (run, jump with coyote time and buffering, air control,
  ledges, climbing, sliding, swimming, carry/set down/throw), follow camera with collision and staged shots, HUD,
  verse cards, scrolls, save, menus, touch controls.
- **Test yard** (`?ch=9`): the bot tries every move and toy; all pass with no help.
- **Chapter 3, The Storm**, from "fast asleep" in the sides of the ship to "the sea ceased from her raging":
  a Gerstner sea drawn by a shader and sampled on the CPU, the ship floating on it, the deck as the physics world
  with gravity leaning as she rolls (cargo slides, and goes overboard), rain, lightning, lanterns, six mariners and
  the shipmaster, the jobs and the ship-damage meter, great waves, the lots, the questions, the rowing, the casting
  forth, the calm. The bot finishes it at desktop and phone size, Story and Normal, with the challenge.

## Next

- Chapter 2 (Joppa Harbor): merge when its worktree is done; then rename its title to the brief's.
- Full bot playthrough of all six at both sizes; frame rate on low, medium and high for every chapter
  (`node tools/fps.mjs`, with the machine to itself).
- `npm run build`, the `--dist` runs, `pch check dist`, `?patch-test=1`.
- Polish passes (see each chapter's "still thin" below).

## Known bugs

Each chapter's own list is in `notes/chN.md`. The ones that matter most:

- No person has played any chapter; every timing (gusts, heat, damage, currents) has been tuned against the bot,
  which is quicker and steadier than a person. The bot's clocks: 1:28, 2:21 (Storm), 2:35, 3:00, 3:12.
- Chapter 1 is likely short (three to five minutes for a person).
- Chapter 3: the bot sometimes needs one or two "assists" among the sliding cargo in the hold; the damage meter is
  gentle for the bot (ends near 0.2). If Normal feels toothless, raise the rates in `Storm.update` (search `0.0026`).
- Chapter 4: jellies under the water are drawn without the water's tint; the veils across the way are plain sheets;
  the "Use" button shows on touch though nothing is used.
- Chapter 5: feet sink into stairs by a tread (the collider is the slope); the people do not collide; the closing
  wave of light shows through the tower.
- Chapter 6: on low the painted shade is round patches; the cloth roll can fill the view when a rock pushes the
  camera in.
- Frame rate has only been read in passing (60 fps on this Mac at both sizes on high).

## Decisions

- **A project of its own, in `jonah/`, on branch `jonah-game`.** The repository around it is JavaScript with asset
  files and a different kind of game; the brief asks for TypeScript and everything made in code. Nothing is shared.
  The uncommitted change to `src/game/stories.js` and the new picture in `public/og/` that were in the working folder
  when this began are not this work's and are left uncommitted.
- **three 0.186.1 and Rapier 0.17.3**, the versions Patch's guide says its blocks have been run on together.
- **Patch's library searched before building** (the standing instruction). Its ocean block was not used: see PLAN.md.
- **Nobody dies in the storm.** The brief's example challenge is "without losing a sailor"; the account has the men
  praying "let us not perish" and all of them alive to make vows. A man swept from the deck is hauled back on a line;
  the challenge is that no man is swept off at all.
- **The lot always falls on Jonah, the rowing never reaches land, the worm always gets away.** What happens is as it
  is written; the play is in how you get there.
- **Jonah does not row and does not leap.** The men row (1:13); the men take him up and cast him forth (1:15).
- **The colour grade works in display space.** Done in linear light, contrast crushed every dark scene to black on
  medium and high while low (no post pass) looked right.
- **three's light units**: a light of intensity 1 gives albedo/π. Daylight wants a sun near 2.6 and a hemisphere near
  1.1; the storm's night wants a hemisphere of 2.3 to be readable.
- **The lanterns lend their light.** A ship has six lanterns but only as many real lights as the quality allows; they
  move to the lanterns nearest whoever the camera follows.
- **A man with his hands on held work is braced**: the leaning deck does not walk him away from the rope, the bucket
  or the mariner he is holding. Without this the deck pushed the player out of reach in the seconds before a wave.
- **No painted eyes on the bow.** They read as a face from the wrong culture and added nothing.
- **The verse tool proves each book by a witness verse.** Project Gutenberg's KJV prints "The Second Book of the
  Kings" as a by-name under 2 Samuel, and 2 Kings 14:25 had been copied from 2 Samuel 14:25. No chapter had shown it.
  The tool now takes the last heading of that name and checks a known verse of every book it reads.
- **The chapters after the Storm were written side by side** in separate git worktrees, each owning one level file,
  then merged: there was one night.

## Fun notes, chapter by chapter

(What the player is doing most of the time, where it drags, what was changed.)

### 3 The Storm

- **Most of the time**: running the length of a heaving deck between jobs that all want doing at once: carrying
  cargo to the rail and pitching it over, holding a rope until it is made fast, going below to bail, climbing to lash
  the yard, and dropping everything to hold a mariner fast when a great wave is called.
- **Where it dragged**: the first version had the jobs one after another, which was a checklist. They now overlap from
  the second phase on, so there is always a choice. Walking the hold was dark and the camera sat inside Jonah's head;
  the hold is now lit by its own lanterns and the camera hides him when it is pushed that close. Being slid away from
  a man you were holding felt unfair, so holding braces you.
- **The rowing** is the one stretch with little to do by design (the men row, not Jonah): two great waves were put
  into it so the player still has men to hold, and the "toward the land" meter that never fills says what the verse
  says.
- **Still thin**: bailing is hold-a-button. A rhythm (dip, lift, throw) would be better.

### 1 The Call

- **Most of the time**: running west over roofs and jumping: gaps, ledges, a slide under awnings and a cart, a vine
  wall, then the wind roofs where a gust (announced by sound and streaks) makes a jump fall short.
- **Where it drags**: the wind rewards standing still for a lull; only sliding under the pergolas lets a good
  player keep moving. The hill slide is the best-looking stretch and cannot be failed. The roofs are bare.
- **Changed**: a gust no longer shoves a standing man off a roof (only in the air is he carried); the sun climbs as
  he goes west so the west slope is not dark.

### 4 The Great Fish

- **Most of the time**: in the deep, steering down a shaft of rock rooms and keeping out of the weed; in the belly,
  floating and climbing across flotsam while reading the currents, each light found showing a verse of Jonah 2.
- **Where it dragged**: sinking to the bottom unless Jump was held (he now floats); flotsam set closer than a
  jump carries (respaced); neon lighting (toned down); waiting for the high water (the third scroll is put there).
- **Still thin**: the veils; the turning current is signalled only by flecks on the water.

### 5 Nineveh

- **Most of the time**: walking into a crowd, crying out, watching the word run through the people as they kneel in
  sackcloth, then working out how to reach the rest: closer, higher, or through a barred gate.
- **Where it dragged**: the first cry showed too little (a ring now shows its reach, people turn before they
  kneel); the last few unheard were a hunt (they are marked); the tower climb was a walk (a scroll and the priests
  are on it).
- **Still thin**: the cry is one press with a cooldown; the gates are a hold.

### 6 The Plant and the East Wind

- **Most of the time**: carrying poles, branches and cloth across open sand to the hilltop, choosing a line through
  the shade with one eye on the heat; then the gourd, the worm that always gets away, the east wind, and the
  questions.
- **Where it dragged**: the heat did not matter (raised, so shade is a real choice); the wind walked an idle player
  off the hill (a man standing is now only edged along); the last view was through the dead vine (moved to the
  brow, closing on the city, the people and the cattle).
- **Still thin**: the gourd scene and the questions are watched (about a minute and a half); holding the booth in the
  wind is a held button.

