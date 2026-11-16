# Jonah: plan

The brief is `GAME_BRIEF.md`. This is how it gets built. `PROGRESS.md` says how far it has got.

## Where it lives

- Folder `jonah/` of the `scripture-journeys` repository, on branch `jonah-game`. It is a project of its own (its own
  `package.json`, its own `dist/`) and shares no code with the painted walking journeys beside it.
- `npm install`, `npm run dev` (http://127.0.0.1:5390), `npm run build` → static `dist/`.

## What the account says (Jonah 1–4, KJV), and what is the game's own

Kept to: who goes, who stays, who speaks.

| Chapter | The account | The game's own (nothing in it goes against the account) |
| --- | --- | --- |
| 1 The Call | The word of the LORD comes to Jonah (1:1–2). He rises to flee to Tarshish and goes down to Joppa (1:3). | The rooftops, the wind against him, that he runs. The town is not named. |
| 2 Joppa | He finds a ship going to Tarshish, pays the fare, goes down into it (1:3). | That he earns the fare loading cargo and haggles. The shipmaster's few words. |
| 3 The Storm | Great wind, mighty tempest (1:4). Mariners afraid, cry every man to his god, cast forth the wares (1:5). Jonah asleep below (1:5). The shipmaster wakes him (1:6). Lots, the lot falls on Jonah (1:7). Questions and his answer (1:8–9). "Take me up, and cast me forth" (1:12). The men row hard and cannot (1:13). They cry to the LORD (1:14), cast him forth, and the sea ceases (1:15). They fear the LORD (1:16). | That Jonah, once woken, works beside the mariners (ropes, bailing, holding men back from the sea). Nobody dies: a man swept off is hauled back by a line. |
| 4 The Great Fish | The LORD had prepared a great fish; three days and three nights (1:17). The prayer (2:1–9). The fish vomits out Jonah upon the dry land (2:10). | What the inside looks like; the currents, the flotsam, the lights. The prayer's own images (the deep, the weeds, the bottoms of the mountains) are the sinking. |
| 5 Nineveh | The word comes the second time (3:1–2). Jonah goes; a city of three days' journey (3:3). A day's journey in, he cries "Yet forty days, and Nineveh shall be overthrown" (3:4). The people believe God, fast, put on sackcloth (3:5). Word comes to the king: he rises from his throne, lays his robe from him, covers himself with sackcloth, sits in ashes (3:6). The decree (3:7–9). God sees their works (3:10). | That Jonah cries it district by district and from high places; that the player sees the king. The word *comes* to the king (3:6): Jonah never speaks to him in the game. |
| 6 The Plant | Jonah displeased, his prayer (4:1–3). "Doest thou well to be angry?" (4:4). He goes out, sits on the east side, makes a booth (4:5). The gourd (4:6). The worm, the gourd withers (4:7). The vehement east wind, the sun, he faints (4:8). The question about the gourd (4:9). The closing question (4:10–11). | That the booth is gathered from scattered pieces; that the worm is chased. |

Rules for words:
- Scripture is the King James Version, copied by a program (`tools/verses.mjs`) from Project Gutenberg eBook #10, not typed. `tools/verses.mjs --check` proves every verse card against that text.
- The voice of the LORD is never retold or shortened: it is the verse, shown as a verse.
- Spoken lines that are not scripture are few, short and plain (a shipmaster naming a fare). No doctrine is added.

## Architecture

```
src/
  main.ts            boot: reads the address (?ch= ?q= ?bot= …), makes the Game
  core/
    engine.ts        renderer, loop (fixed 60 Hz physics, free render), resize, the post pass
    quality.ts       low / medium / high: what each turns on, and the auto-pick
    physics.ts       Rapier world, static colliders, props (crate, barrel, basket, jar, net), ray casts
    input.ts         one set of actions from keyboard, mouse, touch and controller; a bot can inject
    audio.ts         Web Audio: buses, synthesised effects, weather beds, a small generative score
    post.ts          one render target → grade, vignette, bloom (medium/high only)
    save.ts          localStorage: chapter reached, stars, best times, scrolls, settings
    script.ts        generator coroutines for staging (wait, until, tween)
    util.ts          maths, random, easing
  gfx/
    build.ts         LevelBuilder: boxes, wedges, cylinders → merged flat-shaded meshes + colliders
    textures.ts      canvas textures: planks, plaster, stone, cloth, sand
    ocean.ts         Gerstner ocean shader + the same waves on the CPU (so a ship can float on them)
    sky.ts           gradient dome, sun/moon, cloud layer, stars
    particles.ts     GPU point/streak systems: rain, spray, dust, bubbles, embers, wind streaks
    character.ts     a low-poly robed figure built in code, animated in code (run, jump, hang, climb, carry, swim, sit …)
    props.ts         meshes for the physics toys and set dressing
  player/
    controller.ts    the player's body: run, jump (coyote, buffer, variable height), air control, ledge grab,
                     wall climb, slide, swim, carry/throw, riding moving ground
    camera.ts        third-person follow camera: spring, collision, shake, chapter rails
  game/
    game.ts          the state machine: title → card → chapter → result → … → ending
    chapter.ts       the Chapter interface and the context a chapter is given
    scrolls.ts       the hidden scroll pieces
    scripture.ts     every verse the game shows (generated)
    bot.ts           the automated player used by tools/playthrough.mjs
  levels/
    ch1_call.ts  ch2_harbor.ts  ch3_storm.ts  ch4_fish.ts  ch5_nineveh.ts  ch6_plant.ts
  ui/
    hud.ts           objective, prompt, meters, verse cards, toasts
    menus.ts         title, chapters, settings, pause, result, gallery, ending
    touch.ts         virtual joystick and buttons
    style.css
tools/
  lib.mjs            starts a server and a headless Chromium on this machine's GPU
  shots.mjs          screenshots at phone (390×844, touch) and desktop (1440×900)
  playthrough.mjs    the bot plays every chapter to its end
  fps.mjs            frame rate per chapter per quality
  verses.mjs         copies verses from the published text; --check proves them
  preview.mjs        serves dist/ with Patch's game-host headers
```

Decisions that shape the code:

- **Fixed-step physics, free rendering.** Rapier steps at 60 Hz with an accumulator; prop meshes are interpolated.
- **The storm is simulated in the ship's own frame.** The ship's pose (heave, pitch, roll) is sampled from the same
  Gerstner waves the ocean shader draws. Rapier's gravity is turned by the inverse of that pose every step, plus the
  deck's acceleration, so crates and barrels truly slide when the deck tilts, while the character controller stands on
  ground that is, to it, still. The ship group is then drawn at the wave pose. Cargo that clears the rail is handed to
  the sea (it bobs, falls astern and sinks).
- **Levels are built from code by one builder** that makes geometry and colliders together, so what you see is what
  you stand on. Static geometry is merged per material: a chapter is a few dozen draw calls.
- **One action map.** Gameplay reads actions (`move`, `look`, `jump`, `action`, `slide`, `pause`), never devices.
  Mobile: joystick under the left thumb; Jump and Action (and Slide where a chapter uses it) under the right.
  Context decides what Action does (pick up, set down, throw, tie, bail, cry out), so one button is enough.
- **Carry:** Action picks up. Tap sets down gently in front (for stacking); hold and release throws.
- **Swim:** stick steers, Jump is a stroke upward, the body sinks slowly: one thumb and one button.
- **No fail in Story.** Meters cannot reach the end, falls put you back where you stood. Normal has gentle fail states
  that return to the last checkpoint, never the chapter start.
- **Esc is not relied on** (Patch keeps it): P, Enter-on-pause-button, controller Start, and losing focus all pause.
- **Everything is made in code.** No model, texture or sound files. Fonts are the system's serif and sans stacks.
- **Patch's toolbox was searched first** (CLAUDE.md). Its `ocean` block is an FFT ocean that owns the frame and ships
  textures; the brief wants everything in code and a ship floating on the same waves on the CPU, so the ocean here is
  written fresh (Gerstner). Nothing was taken from the library.

## Art style

Stylised low-poly, flat-shaded, with vertex colours and small canvas textures for grain (planks, plaster, weave).
Shapes are chunky and a little crooked; nothing is a perfect box. Light does the work: one key light with soft
shadows, a hemisphere fill, coloured fog, and a grade per chapter. People are robed figures with head-cloths and
beards, faces left plain.

| Chapter | Mood | Palette |
| --- | --- | --- |
| 1 The Call | warm morning town, long shadows, wind-blown dust | honey plaster, terracotta, olive, sky blue |
| 2 Joppa | late afternoon harbour, glitter on water | sand, weathered wood, turquoise, sail white, orange sun |
| 3 The Storm | night, rain, lightning; lantern gold against gray-green | slate, sea green, bone white foam, lantern amber |
| 4 The Great Fish | deep blue to black, then teal and magenta bioluminescence | indigo, teal, magenta, pearl |
| 5 Nineveh | dusty gold, blue glazed brick, banners; sackcloth gray spreading | ochre, lapis, crimson → ash |
| 6 The Plant | pale dawn, green of the gourd, then white heat | bleached sand, leaf green, bone, hard blue |

## Checklist

### Core engine
- [x] Project scaffold: Vite + TypeScript + three + Rapier, `npm run build` → `dist/`
- [ ] Renderer, loop, resize, quality levels (shadows, pixel ratio, particles, draw distance) with auto-pick
- [ ] Post pass: grade, vignette, bloom; off on low
- [ ] Rapier world, static colliders, physics props with interpolation
- [ ] Input: keyboard + mouse, touch joystick + buttons, controller; bot injection
- [ ] Audio engine: effects, weather beds, score; starts on first gesture
- [ ] LevelBuilder, textures, props, sky, particles
- [ ] Character model + animation set
- [ ] Player controller: run, jump (coyote/buffer/variable), air control, ledge grab, climb, slide, swim, carry/throw
- [ ] Camera: follow, collision, shake, rails
- [ ] HUD, verse cards, scrolls, save
- [ ] Test tools: shots, fps, playthrough bot, verse check
- [ ] A test yard (`?ch=0`) where every move and toy can be tried

### Chapter 3: The Storm (first, the showpiece)
- [ ] Ocean shader + CPU waves; ship that floats on them
- [ ] Ship model: hull, deck, hold, mast, sail, rigging, rails, lanterns
- [ ] Ship-frame physics: cargo slides with the tilt; overboard hand-off
- [ ] Rain, spray, wind, lightning + thunder, lantern light
- [ ] Opening: asleep in the sides of the ship; the shipmaster (1:6)
- [ ] Job: cast the wares overboard (1:5)
- [ ] Job: tie down loose ropes
- [ ] Job: bail the hold
- [ ] Job: hold the mariners back from the sea; great waves
- [ ] Ship damage meter; Story/Normal behaviour
- [ ] The lots (1:7), the questions and answer (1:8–12)
- [ ] The rowing that cannot win (1:13)
- [ ] Cast forth; the sea ceases (1:14–16)
- [ ] 3 scrolls, challenge ("no man swept from the deck"), stars, timer
- [ ] Bot plays it through; phone and desktop screenshots judged; frame rate measured

### Chapter 1: The Call
- [ ] Town on a hill: rooftops, alleys, awnings, walls, market
- [ ] The call (1:1–2); the east road left behind
- [ ] Teach: run, jump gaps, ledge climb; then slide under awnings; then wall climb
- [ ] Headwind and gusts (the twist: time jumps between gusts)
- [ ] Set piece: the long slide down to the coast with Joppa and the sea opening below
- [ ] 3 scrolls, challenge, bot, screenshots

### Chapter 2: Joppa Harbor
- [ ] Harbour: quay, warehouse, moored boats, the ship of Tarshish
- [ ] Carry and stack onto the cart; the cart's ride tests the stack
- [ ] Second load with awkward shapes (the twist)
- [ ] Haggle with the shipmaster (timing)
- [ ] Hidden ways over boats and roofs
- [ ] Pay the fare, go down into the ship; the ship sails (set piece)
- [ ] 3 scrolls, challenge, bot, screenshots

### Chapter 4: The Great Fish
- [ ] The sinking: rocks, weeds, faint lights, the prayer's verses at depth
- [ ] The fish comes (set piece) and swallows
- [ ] Inside: currents, flotsam stepping stones, glowing creatures
- [ ] The prayer puzzle: each verse found lights more of the way
- [ ] The launch onto dry land (set piece)
- [ ] 3 scrolls, challenge, bot, screenshots

### Chapter 5: Nineveh
- [ ] The second call (3:1–2)
- [ ] City: gate, three districts, high places, palace
- [ ] Crowd (instanced); the cry; the word spreading person to person; sackcloth
- [ ] High places carry the voice further (the twist: walled courts)
- [ ] The king rises, lays his robe from him, sits in ashes; the decree (3:6–9)
- [ ] The city seen turning from above (set piece)
- [ ] 3 scrolls, challenge, bot, screenshots

### Chapter 6: The Plant and the East Wind
- [ ] The hill east of the city; Jonah's prayer and the first question (4:1–4)
- [ ] Gather and raise the booth (4:5)
- [ ] The gourd grows (set piece) (4:6)
- [ ] The worm, which always gets away (4:7)
- [ ] The east wind and the sun; shade that fails (4:8)
- [ ] The closing question; sit as long as you like (4:9–11)
- [ ] 3 scrolls, challenge, bot, screenshots

### Menus, polish, ending
- [ ] Title screen over a live scene
- [ ] Chapter cards with the scripture reference
- [ ] Chapter select with stars, best times, scrolls
- [ ] Pause, settings (quality, difficulty, sound, timer, camera)
- [ ] Result screen; bonuses (gallery plate per chapter, costume for all 18 scrolls)
- [ ] Ending screen
- [ ] Controller works on every screen
- [ ] Full playthrough by the bot, phone and desktop
- [ ] No console errors; frame rate on low measured for every chapter
- [ ] Production build checked from `dist/` under Patch's headers
