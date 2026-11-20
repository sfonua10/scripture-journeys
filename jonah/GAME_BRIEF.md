# Jonah: game brief

## Goal

Build a high-quality 3D browser game about the story of Jonah. It should feel like a polished indie game, not a tech demo. Think "small, finished, beautiful" over "big and rough." The bar: someone plays it and says "wait, this runs in a browser?"

## Tech

- three.js for rendering. Rapier (@dimforge/rapier3d-compat) for physics.
- Vite + TypeScript. `npm run build` must produce a static `dist/` folder that runs from any web host.
- No outside art or sound files. Make all models, textures, and sounds in code (procedural geometry, canvas/data textures, custom shaders, Web Audio synthesis).
- Must run well on phones AND desktop:
  - Touch controls (virtual joystick + buttons) on mobile; keyboard/mouse on desktop.
  - Target 60 fps on a mid-range phone. Add a quality setting (low/medium/high) that changes shadows, pixel ratio, particle counts, and draw distance. Auto-pick a level based on the device.
- Keep the code in clear modules (scenes, player, physics, audio, ui, levels).

## Gameplay: make it FUN, not just pretty

The player must always be DOING something, not just walking between cutscenes.

- Movement that feels good: run, jump, climb ledges, grab, swim. Tune it until it feels great. Coyote time, jump buffering, a little air control.
- Physics toys everywhere (Rapier): barrels, crates, baskets, and nets can be picked up, thrown, stacked, and knocked over. Playing with physics should be fun all by itself.
- Each chapter adds one new main action, then teaches it, tests it, and adds a twist.
- Big moments: every chapter has at least one "wow" set piece.
- Things to find: 3 hidden scroll pieces per chapter, each showing a verse. Finding all of them unlocks a bonus (a concept-art gallery, a costume, a secret area).
- Replay: a star rating per chapter (finished / all scrolls / challenge done), a speedrun timer, and one challenge per chapter (e.g. "survive the storm without losing a sailor").
- Two difficulty modes: "Story" (easy, good for kids, no fail states) and "Normal."
- Mobile: every action must work with one thumb on the joystick and one on a button.

## Story and levels (Jonah 1–4)

1. **The Call** (main action: run and climb). The call comes. Jonah runs the other way. A rooftop chase out of town to Joppa: jump gaps, slide under awnings, climb walls. A strong wind pushes against him the whole way, a sign he is running from God.
2. **Joppa Harbor** (main action: carry and stack). Earn the fare by loading cargo onto the ship. A physics stacking game: stack crates on a cart without them falling. Haggle with the shipmaster (simple timing game). Hidden paths over the docks and boats.
3. **The Storm** (main action: survive the chaos). THE SHOWPIECE. Spend the most polish here. The deck really tilts with the waves (Rapier). Crates and barrels slide. Jobs to keep the ship alive, shown on a "ship damage" meter: throw cargo overboard, tie down loose ropes, bail water from the hold, keep sailors from being swept off. Lightning flashes show the way in the dark. Then the sailors cast lots (a short, tense minigame), it falls on Jonah, and he asks to be thrown into the sea.
4. **The Great Fish** (main action: swim). First a falling and sinking sequence through dark water: dodge rocks and seaweed, swim toward faint light. Then inside the fish: a strange, glowing place with currents that push you, floating junk you can use as stepping stones, and glowing creatures. Jonah's prayer (Jonah 2) is the puzzle: each verse you find lights up more of the way. At the end, the fish leaves Jonah on dry land (a big, fun "launch" moment).
5. **Nineveh** (main action: spread the message). A huge city, "three days' journey." Deliver the warning across the districts. Each person who hears it tells others, and you SEE it spread through the crowd like a wave as the city turns to sackcloth. Climb to high places to reach more people. Finish by reaching the king on his throne.
6. **The Plant and the East Wind** (main action: shelter). Build Jonah's booth from scattered pieces. The plant grows over you and gives shade. Chase the worm (it always gets away). Then the hot east wind: find shade and survive the heat. Ends quietly with God's closing question, with no fail state, so the player can just sit and think.

Write all scripture text in the KJV (public domain). Keep it reverent and true to the text. Short dialogue. No made-up doctrine.

## Look and feel

- A strong, consistent art style: stylized low-poly with rich lighting, fog, and color grading. Each chapter has its own color mood (warm town, gray-green storm, deep blue/teal fish, dusty gold Nineveh).
- Real weather and water: animated ocean shader with waves the ship actually floats on.
- Good game feel: camera shake, smooth camera, footstep sounds, hit feedback, easing on UI.
- Clean title screen, chapter cards with the scripture reference, pause menu, settings, and an ending screen.
- Procedural audio: wind, rain, waves, creaking wood, thunder, a simple ambient score per chapter.

## Done means

- All 6 chapters playable from start to finish with no blocking bugs.
- No console errors. Steady frame rate on the "low" setting.
- Works with touch on a phone-sized screen and with keyboard/mouse on desktop.
- Save progress (current chapter) in localStorage.
