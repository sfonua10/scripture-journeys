# Jonah

A 3D game of the book of Jonah for the browser, in six chapters: The Call, Joppa Harbor, The Storm, The Great Fish,
Nineveh, and The Plant and the East Wind. It plays on phones (one thumb on a joystick, one on a button) and on a
desktop with keyboard and mouse or a controller.

The words of scripture are from the King James Version, copied by a program from the published text and never
typed. What the account says and what is the game's own is set out at the top of `PLAN.md` and at the head of each
chapter's file in `src/levels/`.

Everything is made in code: there are no model, texture or sound files.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5390
npm run build      # static files in dist/
```

## Play

| | Keyboard and mouse | Touch | Controller |
| --- | --- | --- | --- |
| Move | W A S D or arrows | left joystick | left stick |
| Look | mouse (drag, or click to lock) | drag the picture | right stick |
| Jump, swim up | Space | Jump | A |
| Act (take up, set down, hold, cry out) | E, F or Enter | the Action button | X or B |
| Slide | Shift or C | Slide | Y |
| Pause | P or Tab | the pause button | Start |

Story difficulty has no way to fail. Each chapter hides three scroll pieces and has one challenge for its third star.

## Test it

```
node tools/playthrough.mjs            # a bot plays all six chapters to the end
node tools/playthrough.mjs 3 --size phone --diff story --shots
node tools/shots.mjs --q "ch=3&nocard&seek=wares" --name look
node tools/fps.mjs 3                  # frame rate at low, medium and high
node tools/verses.mjs --check         # every verse against the published text
npm run build && node tools/preview.mjs   # the build, served as Patch's game host serves it
```

`PLAN.md` is the design and the checklist. `PROGRESS.md` says what is done, what is known to be wrong, and why
things were decided as they were.
