# Jonah: progress

> **Status: being built.** Nothing playable yet. The summary that belongs here (how to run it, what to check first)
> is written when the game plays end to end.

If you are picking this up: read `PLAN.md`, then this file from the top. The checklist in `PLAN.md` is the list of
work; this file says which of it is done and what was learned.

## Done

- Brief saved, plan written, project scaffolded (Vite + TypeScript + three 0.186.1 + Rapier 0.17.3).

## Next

- Core engine: renderer, loop, quality, physics, input, audio.

## Known bugs

- None yet.

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

## Fun notes, chapter by chapter

(Written as each chapter is played: what the player is doing most of the time, where it drags, what was changed.)
