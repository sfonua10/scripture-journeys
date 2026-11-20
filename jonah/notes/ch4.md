# Chapter 4, The Great Fish (Jonah 1:17–2:10): notes

Files: `src/levels/ch4_fish.ts` (the chapter and its bot), `src/levels/ch4_world.ts` (the three places and the
level's numbers), `src/levels/ch4_parts.ts` (the great fish, the lights, jellies, weeds, water sheets, flecks).
No engine file was changed.

## What the account says, and what is the game's own

The header of `ch4_fish.ts` sets it out. In short: 1:17 and 2:10 are shown as written (each in two parts, at the
moments they tell of); 2:1 is shown when he wakes; 2:2 to 2:9 are each a light to be found, in order, and the card
shows the whole verse with "Jonah" over it, because they are his words. On the way down, parts of 2:3, 2:5 and 2:6
are shown (the prayer looks back on the going down). Nothing is put in the mouth of the LORD and no line is
paraphrased. The shaft, the wells, the flotsam, the currents, the rising and falling water and the veils are ours.
The fish is not fought and does not hurt him.

## Phases (`?seek=`)

| seek | what |
| --- | --- |
| `sink` | cast into the deep; six shelves of rock, a well through each, weed standing and hanging |
| `fish` | the bottoms of the mountains; the great fish passes beyond the bars, turns, and swallows him |
| `belly` | he wakes on a piece of wreck; 2:1; the first light (2:2) and the carrying current to 2:3 |
| `stones` | flotsam against the current to 2:4 (scroll 2 up the spar) |
| `weeds` | three rows of hanging weed with one lit gap each, and cross-currents, to 2:5 |
| `tide` | the water rises and falls: over the sill at high water, up to the high light, 2:6 (scroll 3 on the wall shelf) |
| `turn` | the turning current: from rib to rib while it is fair, to 2:7 |
| `vow` | up the throat: 2:8, three ledges, 2:9 ("Salvation is of the LORD") |
| `shore` | 2:10: the fish comes up at the shore, he is cast out upon the dry land, and walks up from the sea |

## What the player does most of the time

- **The deep (about a minute and a half for a person)**: sinking, steering with the stick and stroking with Jump
  to hold a height (Dive goes down faster). Each room between two shelves has weed standing on its floor and, from
  the third room on, weed hanging from its roof: the way across to the next well is the band of open water
  between. A "Down" mark shows the next well. Caught in weed: held there, three strokes to shake free (two in
  Story); the chapter's challenge is never to be caught in the deep. There is no air to run out of.
- **Inside the fish (three to four minutes)**: swimming at the top of the water (he floats), climbing out on
  growths and flotsam, running jumps across flotsam, reading the water: a current that carries, one that opposes,
  cross-currents among hanging weed, a water level that rises and falls, a current that turns. Each light found
  shows its verse, wakes the lights of the next stretch, and parts the veil across the way.
- **The shore**: a staged moment, then a short walk up the beach.

## Where it dragged, and what changed

- The first build's camera looked straight down in the deep and was pushed into Jonah's back by the shelf above.
  It now looks along the room when there is a roof close over him and down the shaft when there is not.
- The rock shelves were flat tiled floors. They are plain rock with stones and hollows, and wares from the ship
  (1:5) lie on the first.
- In the belly a man sank to the bottom unless Jump was held, which made every crossing a chore. He now floats;
  Dive goes under.
- The flotsam was set closer than a running jump carries, so every jump overshot. It is now spaced for the jump
  (gaps of about 2.6 m), and any piece can be climbed from the water, so a fall costs a few seconds, not the
  stretch.
- Verses queued behind one another when lights were found quickly, and the story fell a minute behind. A new
  light's verse now takes the place of an older one still showing.
- The first lighting was neon: lamp light blew the growths out to flat magenta and the water was a bold net of
  cyan. Lamps are paler, weaker and higher; the water's lines are thinner and dimmer.
- The great fish seen head-on read as a helmet. Both of its scenes are now shot three-quarter on (from outside
  the bars as it comes; from along the beach as it rises), and staged shots open their field of view on a tall
  screen so that Jonah is not lost off the side.
- The throat was three flat purple steps. It has soft lips on each rise, lights in their faces, folds at the
  sides, and a ring of pale folds at the far end.
- The waiting at the rising and falling water (up to 18 s for the high water) is the slowest moment. The third
  scroll's shelf is put there, reachable only at high water, so the wait has a use.

## Known problems

- The turning current gives no warning but the flecks on the water and the sound; a person may be carried back
  once or twice before reading it. In Story the foul current is weak enough to swim against.
- Jellies under the water are drawn without the water's tint, so they can look as if they hang above it.
- The veils are plain upright sheets with streaks; they read as curtains but are the least finished thing here.
- The "Use" button shows on touch though this chapter has nothing to use.
- The bot crosses the deep at one steady height in each room; a person's path wanders more, and the hanging weed
  of rooms 3 to 5 has not been tried by a person. If the challenge proves too hard, lower the chance of hanging
  weed in `buildDeep` (0.62) or shorten `ROOMS[n].hang`.
- The gallery plate is taken inside the fish by switching place at the moment of completion; it has not been
  looked at.

## Decisions

- **A great fish, not a whale, and no monster.** Slate above, pearl beneath, lights along its flanks, a calm dark
  eye; it comes slowly. The words on the screen as it comes are 1:17's own: "Now the LORD had prepared a great
  fish to swallow up Jonah".
- **No drowning anywhere.** No air meter in either mode. The weeds hold and are shaken off.
- **The lights are found in order** (2:2 to 2:9); a veil keeps each stretch until its light is found, so a verse
  cannot be passed by.
- **Three days and three nights** are marked under the objective and by a quiet line as the lights are found
  (first day, first night, … third night), and the stretches are lit teal by day and magenta by night. Morning is
  the shore.
- **The bars of the earth (2:6)** are a ring of stone pillars round the floor of the shaft; the fish comes to
  the gap in them.
- **Scrolls**: Psalm 130:1 in the deep (a nook of warm lights in the second room, off the straight way),
  Psalm 42:7 up the fallen spar, Matthew 12:40 on the wall shelf at high water.
- **Three places in one physics world**, 500 m apart (the deep at x = 0, the belly at x = 500, the shore at
  x = −500); only the one in use is drawn.
- **Measured** (this Mac, shared, so only a rough guide): 55–107 draw calls, 14–87 thousand triangles (the
  shore's sea is the most), 60 fps on high at 1440×900 and on low at 390×844.
