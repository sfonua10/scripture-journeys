# Chapter 5: Nineveh (Jonah 3:1–10)

Files: `src/levels/ch5_nineveh.ts` (the city, the story, the bot), `src/levels/ch5_crowd.ts` (the people).

## What the text says, and what is the game's own

Written out in the header comment of `ch5_nineveh.ts`. In short: Jonah goes alone and cries only the words of 3:4
(`part('3:4', 'Yet forty days')`), nothing more. Nobody answers him. He never comes before the king: word *comes* to
the king (3:6), and the player sees it as a staged picture in which Jonah has no part. The decree (3:7–9) is cried by
two of the king's nobles and its words are the verses. 3:1–2 and 3:10 are shown only as the verses.

The game's own: crying it quarter by quarter and from high places; walls and the din of the market keeping the word
out; gates to open; the runner on the palace stair, the heap of ashes in the king's court, the heralds on the wall.

## Phases (`?seek=`)

| seek | what happens |
| --- | --- |
| `call` | Outside the great gate: 3:1–2, then 3:3 as he walks in; a look over the city as he passes the gate. |
| `gate` | The lesson. Cry in the square and watch the word pass from one to another. Then a wall keeps it from the garden next door: find a high place (the roof with the outer stair). |
| `market` | The test. The din swallows a cry at street level (it carries 4.6 m, not 8) and the knots of people at the stalls stand apart. The granary and its ladder are the high place. The khan is a walled court with a barred gate. |
| `temple` | The twist. Two walled courts with barred gates, and the temple tower: three flights up to the highest place in the city. |
| `king` | Starts when he cries from the top of the tower. The word crosses the whole city (3:5), word comes to the king (3:6), the decree (3:7–9), 3:10 over the city in sackcloth. |
| `done` | Result screen. |

## What the player does most of the time

Walks into a crowd, cries out (one button), and watches the grey run out through the people from where he stands:
they stop, turn to him, and then kneel or bow in sackcloth, each telling those within arm's reach. Then looks for who
is left (the count is on screen by quarter) and works out how to reach them: closer, higher, or through a gate.

- One cry at street level reaches 8 m (4.6 m in the market). From any height above 2.4 m it reaches 13 m plus 1.3 m
  for each metre of height, and goes over walls. The tower's top reaches 27 m.
- The word passes on from each soul to those within 3.3 m (2.45 m in the market), but never through a wall unless
  a gate between the two spaces stands open.
- High places: the roof by the square (outer stair), the dyer's roof and the granary in the market, the three stages
  of the tower. (The khan can also be got into from the dyer's roof: the bot once did it by accident. Its bar lifts
  from inside too.)
- Scroll pieces: across the gap between two roofs by the gate (Jeremiah 18:7); on the khan's sleeping floor, up by the
  bales (Jeremiah 18:8); on the west side of the tower's second stage (Matthew 12:41).
- Challenge: every soul in the three quarters has heard, by his own crying and their telling, when he cries from the
  tower. What the tower's cry itself reaches counts (3.6 s are allowed for it to pass along).
- There is no way to fail in either difficulty. Story gives a longer reach (×1.2 on the ground) and marks someone who
  has yet to hear once 60% of a quarter has; Normal marks them only when four or fewer are left in the quarter.

The bot plays it in about 175 s of game time taking the shortest way; a person should take 5 to 7 minutes.

## Where it dragged, and what was changed

- **The first cry did too little to look at.** The ring on the ground now shows how far the cry carried, the people
  turn to face him before they kneel, and cloth rustles as the wave passes. From a height the ring is drawn on the
  ground below, so the player sees why height matters.
- **Crying beside a jar picked up the jar.** Action takes up a toy when one is in reach, so toys near the stalls made
  the bot (and would make a person) juggle baskets instead of crying. The toys were moved clear of where people stand.
- **The khan was an empty yard**: it has rugs, a tent, packs, a fire and jars now, and people on the sleeping floor.
- **Two stalls faced the wall and two had their customers behind them.** Turned round.
- **The climb of the tower** is three flights with nothing to do but walk: the third scroll piece was put on the way
  round the second stage, the priests stand on the first, and the camera draws back as he climbs so the city opens up.
- **The last few who had not heard** were a hunt with no clue; they are marked now (see above).
- **The "Cry out" bubble** sat over Jonah all the time on a phone. It is put away after three cries; the touch button
  still says "Cry out". (This needed the one engine change: `Focus.quiet`.)
- **The stairs were ramps.** They have treads now (the walking surface is still the slope).
- **On a phone the staged pictures missed their subject** (they were composed wide). The chapter's `shot()` moves the
  camera back along its line and widens the lens on a tall screen.

Still thin: the cry is a single press with a cooldown; there is no rhythm or aim to it. The gates are a hold. The
market's din is only a shorter reach; it has no source the player could deal with (drummers to pass, say).

## Decisions

- **Jonah does not enter the palace** and nothing is said to the king by him. The palace is behind a wall with shut
  doors; the player sees it only in the staged pictures.
- **The king is two figures**: one robed and crowned on the throne, one in sackcloth. At "laid his robe from him" the
  first is hidden, the second shown in his place, and the robe (a separate heap) and the crown fall away from him.
  The figure has no way to take off its mantle.
- **The whole city turns whatever the player did.** The close runs a wave from the tower over everyone who has not
  heard, and over the far city (cones in the streets beyond the walls): 3:5 says from the greatest to the least. The
  challenge is judged before that wave.
- **The people are three instanced meshes** (robe, head, head-cloth), not `Figure`s: 269 on high and medium ×0.8,
  133 on low. Kneeling and bowing are a squash and a lean of the robe with the head set on the leaned neck.
- **Pass reach grows as the crowd thins** (low quality) so the wave still runs with half the people.
- **No beasts in the streets**, though 3:7–8 names herd and flock: a blocky ox reads badly at this size. The verse
  carries it.
- **Engine changes** (both additive): `Focus.quiet?: boolean` in `src/player/controller.ts`, and `Hud.prompt` in
  `src/ui/hud.ts` hides the bubble for a quiet prompt.

## Numbers

High, 1440×900: 250–345 draw calls, 122–152k triangles (with the shadow pass). Low: about 150 calls, 61k triangles.
No console errors.

## Known bugs

- On the stairs his feet sink up to a tread's height into the steps (the collider is the slope under the treads).
- People do not collide; they step aside from him, and a walker can pass through a stall post.
- A person standing on a stall's table under its awning can be wedged for a moment (the bot once was).
- The wave of light at the close is drawn over everything (no depth test), so it shows through the tower.
