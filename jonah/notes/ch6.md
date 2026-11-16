# Chapter 6, The Gourd (Jonah 4:1–11): notes

Files: `src/levels/ch6_plant.ts` (what happens), `src/levels/ch6_parts.ts` (the hill, the day, the booth, the gourd,
the worm, the far city). No engine file was changed.

## The text, and what is the game's own

Read first: all of Jonah 4. Who is there: Jonah, alone. Who speaks: Jonah (4:2–3, 4:8, 4:9) and the LORD (4:4, 4:9,
4:10–11). Every verse that holds the LORD's words is shown whole and blocking (4:4, 4:9, 4:10, 4:11); 4:1–3 are
shown whole as well. Narration is cut only at its own joints: 4:5 in two parts (went out and sat / made a booth and
sat under it), 4:6 in two (the gourd / exceeding glad), 4:7 in two (the worm / it withered), 4:8 in two (the wind /
he fainted and what he said). Nothing follows 4:11 but a prompt to rise.

The game's own, also written in the header of `ch6_plant.ts`:

- The account does not say where Jonah stood to pray. The game puts 4:1–4 on the road outside the gate, the city
  filling the view, then has him go to the hill (4:5).
- The booth is made of things gathered about the hill: two pairs of poles, two loads of branches, a cloth, two
  stones. The wind taking the cloth once is the game's.
- Heat and shade as a meter. The sun never does more than slow him; he faints only where 4:8 says he fainted.
- The worm can be chased. It cannot be caught, and the gourd withers whatever is done.
- The hours: the account gives "when the morning rose the next day", "when the sun did arise", and "in a night".
  The rest (a morning's building, an afternoon for the questions, evening while he sits) is the game's.

## Phases (`?seek=` names)

`prayer` → `climb` → `booth` → `sit` → `gourd` → `worm` → `wind` → `question` → `rest` → `done`

| phase | what | player |
| --- | --- | --- |
| prayer | 4:1–4 before the gate at dawn | reads |
| climb | 4:5a; up the west slope in the hill's own shade | walks about 50 m; one scroll off the path |
| booth | gather and raise: posts, roof, cloth, stones; the sun climbs | the chapter's main play, 1.5 to 3 minutes |
| sit | sit in the shadow; 4:5b | one tap |
| gourd | the day goes over, night, the gourd grows, 4:6, a glad day | watches (about 45 s) |
| worm | 4:7; drive it off, and again, and again | chases, 15 to 45 s |
| wind | 4:8; the booth is stripped, the heat only rises | holds the booth or seeks a rock, 20 to 50 s |
| question | 4:9, 4:10, 4:11 | reads |
| rest | he sits; evening and the city's lamps come on | rises when they choose |

## What the player is doing most of the time

Carrying something long or heavy across open sand with one eye on a heat meter and the other on where the shadows
are. Every piece lies about twenty to thirty metres from the hilltop in a different quarter, so each trip is a
choice of line: straight and hot, or bent by way of a rock's shadow or the trees in the watercourse. The booth
itself becomes the best shade on the hill as it goes up, which is the reward for each piece: branches give half
shade, the second load more, the cloth all of it.

## Where it dragged, and what was changed

- **Heat did not matter.** At the first rates the bot crossed the hill nine times and never passed 0.45 on the
  meter: shade was scenery. The rise in the open was raised by more than half (Normal 0.065 a second in full sun,
  Story 0.04), cooling kept quick (0.2 a second), so one round trip costs about half the meter and a few seconds in
  shade buys it back. Above 0.62 he slows, to a little over half speed at the top. It never fails him.
- **Rocks gave no shade by mid-morning.** A rock two metres high throws a shadow a head cannot get under once the
  sun is forty degrees up. The six rocks nearest the ways to the pieces were made about three metres tall.
- **The branches lay in the sun.** They now lie north-west of their trees, where the morning shadow falls, so
  taking them up is also a rest.
- **The climb is only a walk.** It is short (ten seconds) and has the first scroll on a shelf off the path; the
  heat meter does not show until the top, where he first comes out of the hill's shadow into the sun.
- **The east wind walked an idle player off the hill** (2.5 m/s whether or not he moved). Now a man standing is
  only edged along (0.3 m/s) and one walking is taken by it (up to 2.4 m/s), so standing in what shade is left is
  possible and running for a rock is a fight.
- **The worm.** A good chaser holds it to under half a second of gnawing a visit and the gourd lasts about forty
  seconds; a slow one loses it in fifteen. Either way it ends by 44 seconds. It breaks for a hole on the far side
  from Jonah, and if he heads it off it goes to ground where it is.
- **The last view was through the dead vine.** The camera for 4:11 now stands past the booth, on the brow.
- **Still thin:** the gourd scene and the questions are watched, not played (about a minute and a half in all, in
  three stretches). The wind's "hold the booth together" is a held button.

## Look

Bleached sand with smooth dune shading (the hill's own normals on a 2 m grid), faceted rocks, a day whose every
colour is keyed by the hour (`dayLook`), so the same hill is pale at dawn, hard at noon, red at sunset, blue by
night. The key light is the sun by day and the moon by night and dims to nothing as it changes over. The gourd is
two instanced meshes (stems and leaves) whose instances are born along the runners as it grows and sag, shrink and
brown as it withers. Nineveh is one merged mesh 235 m off with lamps and people as points and the cattle as one
instanced mesh. On the low setting, which has no shadow map, shade is painted on the ground as dark patches that
follow the sun.

Measured on high at 1440×900: 160 to 220 draw calls, about 50k triangles.

## Decisions

- **No fail states in either mode.** Story differs only in a slower heat and in the wind taking the cloth once
  only; in Normal an unweighted cloth goes again after twenty seconds.
- **The challenge** ("Raise the booth before the sun is high") is 170 seconds of the booth phase. The bot does it
  in about 95; a person who rests in shade and takes the scrolls on the way should find it close.
- **Shade is a ray**, from his head toward the sun, against the world and against unseen shade-only colliders
  (tree crowns, the booth's roof and cloth, the gourd). The booth's roof gives 0.5, 0.8 or 1 by what is on it.
- **Scrolls**: Psalm 145:8 on a shelf behind two rocks on the west brow; Psalm 121:5 ("thy shade upon thy right
  hand") under a slab at the head of the watercourse; Psalm 121:6 ("The sun shall not smite thee by day") on top
  of the stepped rock on the east side.
- **Jonah's reply ends at 4:9.** After 4:11 he sits, and the only words on screen are "Hold to rise".

## Known bugs

- The carried poles are held overhead like any other load; they do not rest on the shoulder.
- On the low setting the painted shadows are round patches, not the shapes of what casts them.
- A camera pushed in by a rock while carrying the cloth roll can fill the top of the view with the roll.
