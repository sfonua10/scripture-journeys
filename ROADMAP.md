# The board: Book of Mormon journeys, one a week

What comes after *I Will Go and Do* (1 Nephi 3–4). One journey a week, in this order. The order is by how much play
each one has in it, not by where it falls in the book; move them as you like.

Each journey should bring **one new way to play** that the account itself asks for, and should not be a re-skin of the
one before it. The Old Testament journeys (Daniel 3, Daniel 6, Jonah) stay unlisted until they are reworked; they
are not the pattern.

| Week | Journey | Chapters | What you do that is new | Status |
| ---- | ------- | -------- | ----------------------- | ------ |
| 1 | **By Small Means** — the broken bow and the ball | 1 Nephi 16 | Follow the Liahona instead of a marker; draw and loose a bow; stalk; make a bow; climb by heed | **Built, in play-testing** (`?story=by-small-means`) |
| 2 | **Whither Shall I Go** — building the ship | 1 Nephi 17–18 | Find ore, make bellows and tools, raise a ship timber by timber; then the storm, and the compass that stops | Next |
| 3 | **Ammon at the waters of Sebus** | Alma 17 | Gather a scattered flock (herding), stand at the water, serve the king | |
| 4 | **Sixteen small stones** — the brother of Jared | Ether 2–3, 6 | Build barges, ask how to light them, go up the mount, carry light across the deep | |
| 5 | **The iron rod** — Lehi's dream | 1 Nephi 8 | Hold to a rod through a mist of darkness: a journey played half by feel | |
| 6 | **Their burdens made light** — Alma's people | Mosiah 24 | Carry burdens that grow lighter; pray in the heart; slip away while the guards sleep | |

## Week by week

### Week 1 — By Small Means (1 Nephi 16:9–32) · in play-testing

Built on branch `liahona`. Five acts: the ball at the tent door; the more fertile parts; the bow of fine steel; out of
wood a bow; into the top of the mountain.

- [x] Wilderness land (`land: 'wild'`): green way by the Red Sea, a camp, a mountain with a trail
- [x] The Liahona (`liahona.js`): no markers; the spindle leads; dead while they murmur; works by heed after 16:28
- [x] Bow (`bow.js`), wild beasts (`beasts.js`), the hunt (`hunt.js`)
- [x] Scripture table checked against the published text (`node tools/excerpts.mjs`)
- [x] Plays to its end on the autopilot (`node tools/story.mjs --query "story=by-small-means"`)
- [ ] **Read over the spoken lines** (`src/game/spoken-nephi16.js`) — nothing is recorded until they are approved
- [x] The mountain: ways that part at the trail's turns (`WILD.spurs`), so that the ball is what finds the way
- [x] Checked headless on a phone held upright (the ball, the task, the bow's prompt, "Be still")
- [x] README section; `tools/journeys.mjs` knows of it
- [ ] Play it by hand on a laptop and on a phone; tune the hunt and the climb to taste
- [ ] Record the voices (`node tools/narrate.mjs --story by-small-means`)
- [ ] Portrait for its card
- [ ] Release: take `wip: true` off its entry in `src/game/stories.js`

### Week 2 — Building the ship (1 Nephi 17–18)

"Whither shall I go that I may find ore to molten, that I may make tools?" (17:9). The account is a list of things made:
bellows of skins, fire struck from two stones, tools from ore, timbers "of curious workmanship". A journey of making,
then of the sea.

- New play: prospecting (the Lord shows where the ore is), a bellows worked in rhythm, timbers raised into a hull that
  grows as you work, brothers who will not help until 17:48–55, then they do.
- At sea (18): the brothers bind Nephi; the compass "did cease to work" (18:12); the storm; it works again (18:21).
  The Liahona built this week carries straight over.
- Reuse: the ball, the camp, the family. New: a shore (Bountiful), a ship that can be walked on.

### Week 3 — Ammon at the waters of Sebus (Alma 17)

- New play: herding. A flock that scatters and must be brought round ("they did rush forth with much swiftness and did
  head the flocks", 17:32). The beasts of this week become sheep.
- What is shown: the flock gathered and the servants' astonishment. The fight at the water is told, not played.

### Week 4 — The brother of Jared (Ether 2–3, 6)

- New play: three problems in the barges (air, steering, light) and a question the Lord turns back: "What will ye that I
  should do that ye may have light in your vessels?" (2:23). Molten out of a rock sixteen small stones; carry them up
  the mount Shelem.
- Then the deep: a dark vessel lit only by the stones.

### Week 5 — Lehi's dream (1 Nephi 8)

- New play: the rod. In the mist the picture goes nearly dark and the way is kept by holding on; let go and you are
  lost in it. The fruit, and turning to look for the family.
- The most unlike the others. Needs its own land.

### Week 6 — Alma's people in bondage (Mosiah 24)

- New play: a burden that is truly heavy and then is not ("I will also ease the burdens which are put upon your
  shoulders", 24:14); praying in the heart when praying aloud is forbidden; the morning the guards sleep.

## Not yet

Good accounts, but hard to make into play that a family would want, or needing more than a week:

- **Abinadi** (Mosiah 11–17) — nearly all speech, and its end.
- **Nephi and Lehi in the prison** (Helaman 5) — one room; wonderful to see, little to do.
- **Samuel on the wall** (Helaman 13–16) — a sermon; the arrows that miss are the only play.

## For every journey

1. Design the play first: what does the hand do that it has not done before?
2. Write the spoken lines; have them read over before anything is recorded.
3. Scripture word for word at the turns of the account, checked by `tools/excerpts.mjs`.
4. Autopilot to the end (`tools/story.mjs`), stills (`tools/look.mjs`), a phone held upright (`tools/touch.mjs`).
5. Record, release, and put the next teaser after it.
