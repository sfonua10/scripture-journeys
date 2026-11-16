# Chapter 1 — The Call (Jonah 1:1–3)

Files: `src/levels/ch1_call.ts` (the chapter), `src/levels/ch1_town.ts` (the pieces a hill town is built from).

## What the text gives, and what is the game's own

- 1:1 and 1:2 are shown whole, as verse cards, at the start. 1:2 is the only speech in the chapter and is never
  retold in other words. 1:3 is cut in two with `part()`: "But Jonah rose up … from the presence of the LORD" as he
  turns west, and "And went down to Joppa" at the end. The ship and the fare are left to Chapter 2.
- Jonah goes alone. Nobody speaks to him, answers him or follows him. The five people in the market are passers-by
  (they turn their heads as he runs past, nothing more).
- The game's own: the town (unnamed), the rooftops, the market, the wind against him, the slide, that he runs.
  The east road (toward Nineveh) is seen in the first shot, with the sun over it, and is left behind.
- Scroll pieces: Proverbs 16:9, Psalm 139:7, Jeremiah 23:24. **Not** 2 Kings 14:25: the entry under that name in
  `src/game/scripture.ts` holds the words of 2 Samuel 14:25 (about Absalom). The Gutenberg text heads 2 Samuel
  "…Otherwise Called, The Second Book of the Kings", which is probably how `tools/verses.mjs` took the wrong book.
  It should be put right in the tool before any chapter shows that verse.

## Phases (`?ch=1&seek=<name>`)

| seek     | where                        | what is taught or tested                                              |
| -------- | ---------------------------- | --------------------------------------------------------------------- |
| `call`   | his roof at sunrise          | the two verses; he turns his back on the east                         |
| `roofs`  | six roofs                    | run, jump a gap, catch a ledge, jump-and-catch; scroll 1 on a side roof |
| `market` | the lane below               | a landing awning, slide under a low awning, slide under a loaded cart; scroll 2 on a balcony by way of crates and a springy awning |
| `climb`  | the vine wall at the lane's end | climb                                                              |
| `wind`   | ten roofs to the town wall   | all of it together, with gusts: a beam, two pergolas, a tower climb, the long leap; scroll 3 in a sunk court |
| `slide`  | off the wall onto a hay cart, then the hill | the long slide: steer round stones, three ledges throw him, three field walls to jump |
| `road`   | the plain                    | the last words of the verse; Joppa, its gate, masts, the sea          |

## What the player does most of the time

Runs west and jumps. About a third of the chapter is plain run-and-jump over gaps of 1.8 to 3.3 m; the rest is one
new thing at a time (ledge, slide, climb), then the wind turns the gaps into a matter of timing: a gust lasts 1.7 s
in every 6.4, is announced 0.9 s ahead by its sound and by streaks in the air, and a jump taken in one falls short
into the alley (a ladder stands in every alley; Normal counts it against the third star). Standing behind anything
chest-high, or sliding, the wind passes over. In Story the gusts only slow him and nothing is counted.

## Where it is weak (judged harshly)

- **Length.** The bot's clock is about 1:28 with all three scroll pieces. A person reading the verses, learning the
  moves and waiting on lulls should take three to five minutes; a second play will be nearer two. That is short of
  the 4–7 asked for. The wind roofs are the place to add (a second beam, a stretch where the only cover moves).
- **The wind asks for waiting.** The safe way through is to stand still for a lull five times. Sliding under the
  pergolas is the only place where skill beats patience. It needs one more thing that lets a good player keep
  moving through a gust.
- **The slide is a ride, not a test.** Nothing on the slope can be failed: a stone turns him aside, a wall stops
  him until he jumps. It looks its best of anything in the chapter and it is over in 18 seconds.
- **The roofs are bare.** Jars, pots, a booth, washing, doves: still mostly flat plaster. The side houses hide the
  view to north and south, so the town is felt as a street of roofs rather than a town seen from above.
- **The sea is hidden until the wall.** From the tower there is a glimpse; the whole coast opens only at the town
  wall. That works as a reveal but the first two-thirds have nothing of the sea in them.
- **Joppa is far-off blocks.** Walls, windows, domes, awnings, masts. Enough for a last shot at a distance; it
  would not bear a closer camera.

## What was changed along the way

- A gust first shoved him back on his feet as well, and an idle player on the first windy roof was thrown back down
  into the market. Now, on his feet, he is shoved but stops at an edge; only in the air is he carried.
- The sun was low all chapter and left the west slope dark. It now climbs from 12° to 38° as he goes west.
- The slope was one colour with barrels for stones: now boulders, edge stones and scrub (which also show speed),
  olives, rock ledges, field walls.
- The last shot looked over a heap of blank boxes from a height that lost Jonah. Now it begins behind him on the
  road and rises until the masts and the sea show beyond the roofs.
- People in the market cost about thirty draws each: they cast no shadows (a blob serves) and are not drawn from
  more than 52 m off.

## Measured (desktop 1440×900, high)

- Draw calls: roofs ~350, market 300–410, wind 160–400, slide ~100. Triangles 35k–110k.
- No console errors in any run.

## The bot

`node tools/playthrough.mjs 1 --speed 2` and `… --size phone --diff story`: FINISHED, 3 stars, 3 scroll pieces,
0 assists, both. It plays as a person would: jumps at edges, catches ledges, slides under the awning and the cart,
climbs the crates to the springy awning, waits out gusts leaning into the wind, climbs out by a ladder if it falls
into an alley, steers round the stones and jumps the walls.

## Decisions

- The town is not named; no scroll names it either.
- No pursuer, no voice but the verse. The objective reads "Go down to Joppa" (the verse's own words).
- Heights are written from the hilltop (0) and lifted 84 m, because the engine's sea lies at world height 0.
- The far sea is the engine's `Ocean` with `CALM_WAVES`, centred out to sea by handing it a stand-in camera.
- The player gained one field, `slideHold` (see below); the hops on the slope and the springy awnings are done by
  the chapter setting his upward speed.

## Engine changes

- `src/player/controller.ts`: `slideHold` (default 0, so nothing else changes). While above 0 the player is kept
  sliding at about that speed, steers a little more, is pressed to the ground harder so he follows a slope, and
  stands only to jump. Used for the hill.

## Known problems

- The camera passes under the cart with him and, for a moment, looks out between its shafts.
- Running the bot at `--speed 2` the scroll banners queue and show late; at normal speed they do not.
- Baskets and jars show the "Take up" prompt (they are the engine's toys); carrying one is harmless but pointless.
- From the lane there is a ladder back to the roofs; from the windy roofs there is no way back east.
