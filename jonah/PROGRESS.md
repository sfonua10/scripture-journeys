# Jonah: progress

> **Status: being built.** The core engine and Chapter 3 (The Storm) play from start to end. Chapters 1, 2, 4, 5
> and 6 are being written; the title scene, ending and final passes come after. The summary that belongs here (how to
> run it, what to check first) is written when the game plays end to end.

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
`?fps`, `?touch=1`, `?mute`, `?nosave`.

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

- Chapters 1, 2, 4, 5, 6 (each in its own `src/levels/chN_*.ts`; notes for each go in `notes/chN.md` first).
- The scene behind the title (registry 0), ending, gallery plates, the costume for all 18 scrolls.
- `tools/fps.mjs`, `tools/preview.mjs`, `?patch-test=1`, the production build checked from `dist/`.
- Full bot playthrough of all six at both sizes; frame rate on low for every chapter.

## Known bugs

- Chapter 3: the bot sometimes needs one or two "assists" (it is set down where it was going) among the sliding cargo
  in the hold; a person is not affected. It sometimes misses one of the three scrolls for want of time.
- Chapter 3: the ship-damage meter is gentle for the bot (it ends near 0.2); it has not been tuned against a person,
  who is two or three times slower. If Normal feels toothless, raise the rates in `Storm.update` (search `0.0026`).
- Chapter 3: bailing has no bucket in the hand; the calm sea's foam ring under the hull is a little bright.
- Frame rate has only been measured in passing (60 fps on high at 1440×900 and at 390×844 touch on this Mac).

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
