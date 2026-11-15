# Scripture Journeys

**Play it: <https://sfonua10.github.io/scripture-journeys/>**

Painted walking games through the scriptures, one journey at a time. The first screen asks for a book of scripture (the Book of Mormon, the Old Testament), then lists that book's journeys, with the next one shown as coming.

Adding a journey: write its story beside `src/game/story.js`, give it an entry in `src/game/stories.js` with its `work` (the book it belongs to), its `scripture` (the verses its cards quote) and `released: true`. A journey may bring its own land (`land`: the hill country round Jerusalem, or `'plain'`, the river plain of Babylon, in `src/valley/world.js`), its own city (`look`), people and clothes, as the Daniel journeys do (`src/game/daniel.js`, `src/game/lions-den.js`, `src/game/babylon.js`), and sets and small things of its own (`props`), as the Jonah journey does (`src/game/jonah.js`, `src/game/nineveh.js`). Each journey keeps its own place in the browser.

A journey still being made is marked `wip: true` in `src/game/stories.js` (the 1 Nephi 16 journey and Jonah are, for now). It is left off the list, and reached only with `?all` in the address (every journey listed) or by name (`?story=jonah`). While only one journey is open, someone new goes straight into it; once they have a place kept or have finished it, the list offers to go on, start over or play again. Take `wip` off a journey to open it. A journey that may be tried before it is finished is marked `beta: true` instead (the two Daniel journeys are): it is listed with the rest, with "Beta" on its card, but it is not counted as one to choose from, so someone new still goes straight into the first journey.

Every journey that is listed has a page of its own, named from its title (`but-if-not/`, `pageOf` in `src/game/stories.js`), which `build.mjs` writes. Where a link to it is posted it shows that journey's name, what it is about and its own picture, and whoever opens it goes straight into the journey, past the list. A journey's picture is `public/og/<page>.jpg` (or `.png`), 1200 × 675 like the game's own (`public/og.jpg`), which stands in for it until there is one; `npm run build` says which picture each page has. The end of a journey shares the address of its own page.

(The game was first called Book of Mormon Journeys, when the Book of Mormon was all it held. The old web address and the old repository name redirect to the new ones.)

## Book of Mormon, Journey 1: I Will Go and Do

A short painted walking game through **1 Nephi 3–4**: Nephi and his brothers go back to Jerusalem for the plates of brass. It begins and ends at the tent of their father in the valley of Lemuel, which is a place of its own, out of sight of Jerusalem; the rest is in the land of Jerusalem. You walk where they walked and read what they said, in the scripture's own words, at the moment each thing happens. The aim is to help families understand the account and see how the Lord prepared a way.

> "I will go and do the things which the Lord hath commanded, for I know that the Lord giveth no commandments unto the children of men, save he shall prepare a way for them that they may accomplish the thing which he commandeth them." (1 Nephi 3:7)

## Book of Mormon, Journey 2: By Small Means (being made)

**1 Nephi 16:9–32**: the ball found at the tent door, the bow of fine steel that broke, a bow made out of wood, and food from the top of the mountain. You are Nephi. It is not yet on the list of journeys: it opens with `?story=by-small-means` (or `?all`), its lines are not yet read over, and nothing in it is recorded.

> "And thus we see that by small means the Lord can bring about great things." (1 Nephi 16:29)

It is not played as the first journey is. **There is no way-marker in it.** The family has the ball, and so have you: it sits at the top right of the picture, and one of its spindles points the way to go (tap it, or Q, to look upon it). The only thing ever marked on the land is your own arrow where it fell. And most of it is done, not read:

- **The bow** (`src/game/bow.js`) is drawn by holding (E, or a finger on the prompt) and loosed by letting go. The arrow truly flies and falls; the ring on the picture is how wide it may go, and it draws in as you hold steady. A bow of steel throws far and true, a bow of wood a short way, and a bow that has lost its spring hardly at all.
- **The wild beasts** (`src/game/beasts.js`, `src/game/hunt.js`) keep a watch: every few seconds one lifts its head. Move while it looks ("Be still") and they take alarm, and are gone to other ground, where they must be come up with again.
- **The ball** (`src/game/liahona.js`) leads while they are faithful, hangs loose while they murmur, and after 16:28 works by the heed you give it: go as it points and it stays true; go your own way and it stops, until you look upon it again. It is read by its top: the bright spindle is an arrow, the mark at the top of the rim is the way you are looking, and the ball is ringed with light when the spindle stands under the mark. Look another way and you are told under it which hand to turn to.

| Act | Verses | What you do |
|---|---|---|
| One: A Round Ball of Curious Workmanship | 16:9–12 | In the valley of Lemuel your father calls you to his tent door. Take up the ball; fill in "within the ball were two ___". Gather the provisions and the seed, and follow the spindle across the river. |
| Two: The More Fertile Parts | 16:13–17 | Follow the ball along the green way by the Red Sea. Come up softly with the beasts feeding there, draw your bow of steel and loose; take up what you have slain and bear it back to your brethren. |
| Three: My Bow, Which Was Made of Fine Steel | 16:17–22 | From the camp, go where the ball points and hunt again. At its first full draw your bow breaks. Try your brother's bow, which has lost its spring. Return to the tents with nothing, at evening; the ball's spindles hang loose. Your father sits apart (16:20, the verse's words and none of his). Speak to your brethren. |
| Four: Out of Wood a Bow | 16:23–29 | In the morning, go with Sam to the edge of the wood. Bend three young boughs to find one that springs; take a straight stick and stones. By the fire, shape the bow (three things done by holding); fill in "I, Nephi, did make out of ___ a bow". Ask your father whither you shall go. He inquires of the Lord (16:24–26, the voice of the Lord in the verse's words only). Look upon the ball: it is written upon, and it works again; fill in "faith and diligence and ___". |
| Five: Into the Top of the Mountain | 16:30–32 | Go up the mountain as the ball directs. Where the trail turns, another way goes on and is lost; nothing says which is which but the ball. On the top, with a bow of wood and one arrow, come near enough to two beasts, taking up your arrow between. Bear them home on your shoulders. At the fire they come round you; kneel with them and give thanks. Fill in "by ___ means the Lord can bring about great things". |

Four times a verse is shown with a word left out; a wrong answer costs nothing. What happens is fixed, as it is written: the steel bow breaks whatever you aim at, a herd that flees is found again, an arrow that misses is taken up again. There is no score and no other ending. What its people say in the story's own words is in `src/game/spoken-nephi16.js`, each line with the verse it retells; those marked `tone` add a manner or a detail the verse does not have, and may be struck.

What is shown, and what is not:

- Of the hunt: an arrow in the air, and a beast lying where it fell. Nothing more.
- What was written on the ball (16:26–27, 29) is not given in the account, and none is made up: it is shown as marks of light that are no letters.
- The voice of the Lord (16:25–26) is never retold: it is the verse.
- Their father's murmuring (16:20) is the verse's words; the story gives him none. He is seen sitting apart, and afterwards kneeling (16:24–25).

**Not in the text, and the game's own** (nothing in it goes against the account):

- That the beasts keep a watch, and must be come up with softly. The account says only that they slew food "with our bows and our arrows and our stones and our slings" (16:15).
- That Nephi tries his brother's bow. The account says their bows "having lost their springs" (16:21).
- That the ball's spindles hang loose while they murmur. The account says that the pointers "did work according to the faith and diligence and heed which we did give unto them" (16:28); the story shows that from the evening of the broken bow.
- That Sam shows him the wood, and that he tries three boughs. The account says "I, Nephi, did make out of wood a bow, and out of a straight stick, an arrow" (16:23).
- That there were two beasts. The account says "wild beasts" (16:31) and "the beasts which I had slain" (16:32).
- The ways that part on the mountain. The account says he went "according to the directions which were given upon the ball" (16:30).
- That they kneel about the fire. The account says "they did humble themselves before the Lord, and did give thanks unto him" (16:32).

### The wilderness, and how sure we are of it

A land of its own (`land: 'wild'`: `WILD` in `src/game/places.js`, `src/valley/world.js`): the valley of Lemuel as in the first journey, a green way, a camp of tents, a wood, and a mountain with a trail.

- **From the text**: that they went "south-southeast" four days and pitched their tents at a place they called Shazer (16:13); that they kept "in the most fertile parts of the wilderness, which were in the borders near the Red Sea" (16:14); that they pitched their tents again "that we might again rest ourselves and obtain food for our families" (16:17); that there was a mountain, and beasts in the top of it (16:30–31).
- **Not known**: where any of it was; what the mountain was; what the wild beasts were. They are drawn as the wild goats of that country, on a mountain of its kind.
- **A guess**: how the ball looked beyond "a round ball of curious workmanship; and it was of fine brass. And within the ball were two spindles" (16:10).

## Old Testament, Journey 1: But If Not

**Daniel 3**, in the King James Version: Shadrach, Meshach and Abed-nego before the image of gold, before the king, and in the burning fiery furnace. You are one of the three. It follows that week's *Come, Follow Me* ("I can trust in the Lord when my faith is tried"), and its end asks what the lesson asks.

> "If it be so, our God whom we serve is able to deliver us from the burning fiery furnace, and he will deliver us out of thine hand, O king. But if not, be it known unto thee, O king, that we will not serve thy gods, nor worship the golden image which thou hast set up." (Daniel 3:17–18)

It is played more than it is read. What is said (the herald's command, the king's words, the three's answer) is a card, read before the story goes on; what is only done is a line low on the screen, read while you walk; a list said over again is cut short with "…" (the cut verses are in `src/game/scripture-daniel.js` and `tools/excerpts.mjs` checks each is the verse's own words in order). There are about 22 stops.

A card of what someone says has their name over it, and under the name only what they said: "NEBUCHADNEZZAR · Is it true, O Shadrach, Meshach, and Abednego …" where the verse reads "Nebuchadnezzar spake and said unto them, Is it true …". The five names (The herald, Certain Chaldeans, Nebuchadnezzar, Shadrach, Meshach, and Abednego, The king's counsellors) are the only words on those cards that are not the verse's; the reference stays, and `tools/excerpts.mjs` lists for each card the words its name stands in place of. The first journey's cards are shown this way too (see "The story").

| Act | Verses | What you do |
|---|---|---|
| One: The Image of Gold | 3:1–13 | Walk out of Babylon by the Ishtar Gate, between the walls of lions, to the plain of Dura, where the image stands and the multitude is gathered. The herald cries. The music of 3:5 enters an instrument at a time, in the verse's order, and all the people fall down. You are asked, with no haste to answer, what you will do: stand, as the three did, or fall down and worship, and then it begins again (the question and its two answers are not scripture, and are shown in italics without a reference). Then you see the three standing among them all. Two Chaldeans go to the king and accuse them. |
| Two: Before the King | 3:13–18 | The mighty men take you to the king's seat. As he names the furnace you see it. Answer him: fill in "But if ___". |
| Three: In the Midst of the Fire | 3:19–30 | The furnace is heated seven times more; you are bound and led to it, and on the way remember that "our God whom we serve is ___ to deliver us". In the fire the fourth comes to walk with you; then, as the king saw it, count them. Come forth, and go among the princes and counsellors as the four things they saw (3:27) are told. The king blesses God. |

Four times a verse is shown with a word left out, to be filled in from three, and is then read whole; a wrong answer costs nothing. The fourth in the fire is shown as the king saw him, "like the Son of God" (3:25): a figure in white, in light, who says and does nothing the text does not, and is not seen once they have come forth. The men slain by the flame (3:22) are read of in the dark, not shown. There is no score and no other ending. It is read aloud (35 recordings, made by `node tools/narrate.mjs --story fiery-furnace`): what is told by the narrator, and the king, the three (who answer as one, in one voice), the herald, the Chaldeans and the king's counsellors each in a voice of their own (the `cast` in `tools/narrate.mjs`).

### Babylon, and how sure we are of it

Babylon has its own land (`world.js`, `'plain'`): a level river plain, the Euphrates going by the city, canals with fields of barley, stubble and fallow along them, date palms, and air thick with dust, no hills and no mountains. Its city (`src/game/babylon.js`) and its people (`daniel.js`) are drawn from what is known of Babylon about 600 BC:

- **Well attested** (the excavations, the museums' reconstructions): a city of brick, the colour of the brick, with glazed brick only on its great works; the Ishtar Gate faced with blue glaze, bulls and dragons walking on it in rows, never mixed in one row; the Processional Way paved with pale limestone edged with red stone, between walls of glazed lions; the king's house with yellow columns and palmettes on blue; the temple tower in stages with a blue shrine; the king as the stelae show him, in a tall conical crown with ribbons hanging behind, a long fringed robe, with a staff as tall as himself.
- **Probable, or a guess**: stepped battlements (no wall top survives to show them); houses blind to the street; men's dress of a tunic to the feet, a mantle and a cap over hair to the shoulders (Herodotus, writing later); soldiers in scale coats and pointed helmets (almost no Babylonian soldier is pictured); the furnace as a brick kiln with a door in its side and an opening at its top; the instruments of 3:5 (the Church's footnotes give "triangular stringed instrument" and "bagpipe"; others say a drum); the colours of everyone's clothes.
- **Not to scale**: the city is a small one, and its temple tower smaller than the real one (91 m square at its base).
- **Not known**: where the plain of Dura was; what the image of gold was an image of. It is given the verse's measure, 60 by 6 cubits (27.4 m by 2.74 m), as a robed figure with a tall cap and no face on a tall base, as the Church's illustrated story has "a giant, golden statue".

Not in the text, shown because a scene needs it: the king's seat on a dais under a canopy; the furnace's ramp; the people's staffs, helmets and colours; the fourth walking beside you (3:25 says "walking"); remembering 3:17 on the way to the furnace, and the still chord that follows; the four things of 3:27 told as you go among the officials.

## Old Testament, Journey 2: As He Did Aforetime

**Daniel 6**, in the King James Version: the writing that is signed, Daniel at his open windows, the den of lions, and the morning. You are Daniel. It follows the same week's *Come, Follow Me* (Daniel 1–7: "I can trust in the Lord when my faith is tried"; and for children, "Heavenly Father wants me to pray often" and "Jesus will help me do what is right even when it's hard"), and its end asks what the lesson asks.

> "Now when Daniel knew that the writing was signed, he went into his house; and his windows being open in his chamber toward Jerusalem, he kneeled upon his knees three times a day, and prayed, and gave thanks before his God, as he did aforetime." (Daniel 6:10)

It is told as the Daniel 3 journey is: what is said is a card under the speaker's name (Darius, The presidents and princes, Daniel), what is only done is a line read while you walk, a cut verse is marked with "…", and `tools/excerpts.mjs` checks every one against its verse. It takes about 12–15 minutes.

| Act | Verses | What you do |
|---|---|---|
| One: An Excellent Spirit | 6:1–9 | Walk out by the Ishtar Gate, between the walls of lions, to the king's seat. Hear the accounts of four of the princes, in what order you will (6:2), while the other two presidents keep behind you and watch; what they sought and did not find (6:4) is told a part at a time. Then, from a little way off, they go to the king, and he signs the writing. Fill in "the law of the Medes and Persians, which ___ not". |
| Two: Three Times a Day | 6:10–15 | You are asked, with no haste to answer, what you will do now that the writing is signed: go into your house and pray, as before, or not; choose not to, and what Daniel did is read again (the question and its two answers are not scripture, and are shown in italics without a reference). Go into your house. Kneel at the open window three times, in the morning, at noon and at evening, the sun crossing the sky between. At the third, the men assemble at the door and the windows and find you praying: there is one thing to do, and it is to keep praying. Fill in "and prayed, and gave ___ before his God". Then, before the king, the sun goes down as he labours to deliver you. |
| Three: The Den of Lions | 6:16–18 | The king's men bring you to the den. From its floor you look up to its mouth as the king speaks, and the stone is laid upon it and the light goes. In the dark the lions prowl, their eyes shining. Then there is light, and one in white standing in it, and every lion's mouth is shut. Walk among the lions: each one you come to lies down. The king's sleepless night is read as you rest among them. |
| Four: The Living God | 6:19–28 | Very early in the morning the stone is drawn off and the king cries down to you. Answer him: fill in "hath shut the lions' ___". You are taken up: fill in "because he ___ in his God". Go with the king to his seat, where he sends his writing to all people. |

Four times a verse is shown with a word left out, as in the Daniel 3 journey; a wrong answer costs nothing. There is no score and no other ending. It is read aloud (45 recordings, made by `node tools/narrate.mjs --story lions-den`): what is told by the narrator, and Daniel, Darius, and the presidents and princes each in a voice of their own.

What is shown, and what is not:

- Daniel is cast into the den between one picture and the next, and taken up out of it the same way.
- Of his night there the chapter tells only what he says in the morning: "My God hath sent his angel, and hath shut the lions' mouths, that they have not hurt me" (6:22). That is what is shown: a figure in white, in light, who says nothing and is called nothing but what the verse calls him; the lions' mouths shut. The lions lying down as you go among them is the game's picture of "they have not hurt me", not the text's words.
- What was done to those who accused him, "them, their children, and their wives" (6:24), is read whole, in the dark, and not seen, as the men slain by the flame are in the Daniel 3 journey.
- The lions (`src/game/lions.js`) are made in code, of a few solid parts, and painted as the people are. They walk, look, open and shut their mouths, and lie down. Nothing shows a lion harming anyone.

**The end of it** asks one question, about prayer. (Four things told of Daniel set beside four told of Jesus Christ, each the verse's own words, are kept in `src/game/scripture-daniel.js` as `PAIRS`, and `tools/excerpts.mjs` still checks them against their verses; the end screen showed them once, and no longer does.)

### Babylon in the days of Darius, and how sure we are of it

The same city and plain (`BABYLON_DARIUS` in `src/game/babylon.js`: the same walls, gate and king's seat, so the Daniel 3 journey is not changed by it), with Daniel's house and the den where the image and the furnace stood a lifetime before.

- **Not known**: where Daniel's house stood, where the den was, or where the king sat; who "Darius the Median" (5:31) was, outside the book of Daniel; how his court was dressed. They are given Babylon's long fringed tunics and mantles, the king a robe of blue and a mantle of crimson.
- **A guess**: the den as a walled and roofed place of brick entered from above by one mouth, with a ramp up to its roof. The text has him "cast into" it, a stone "laid upon the mouth" of it, Daniel "taken up out of" it, and "the bottom of the den" (6:16–17, 6:23–24), and that is all that is known of it. Kings of Assyria and Babylon did keep lions.
- **A guess**: Daniel's house as one room with three open windows in one wall (6:10 says "his chamber", which the Aramaic has as an upper room). The windows look the way the sun goes down in this land, past the walls of Babylon.
- **Reckoned**: that Daniel is an old man. He was brought to Babylon as a youth (1:1–6), and Babylon fell some seventy years later; so his hair and beard are white.
- **Not in the text, shown because a scene needs it**: hearing the princes' accounts (6:2 says only that they gave them); the men coming to the door and windows (6:11 says they "assembled, and found Daniel praying"); the light in the chamber as he prays; the king and his lords standing at the den's mouth; the multitude before the king's seat when he writes "unto all people" (6:25).

The morning's light is the evening's turned about (`src/valley/sky.js`): this land had only afternoons and nights before.

## Old Testament, Journey 3: Should Not I Spare Nineveh?

**Jonah 1–4**, the whole book, in the King James Version: the word that comes and the ship at Joppa, the tempest, the deep and the fish's belly, Nineveh, and the booth and the gourd. You are Jonah.

> "And should not I spare Nineveh, that great city, wherein are more than sixscore thousand persons that cannot discern between their right hand and their left hand; and also much cattle?" (Jonah 4:11)

It is told as the Daniel journeys are (a card under the speaker's name for what is said, a line for what is done, "…" where a verse is cut, `tools/excerpts.mjs` checking every one), but there is more in it to do than to read: the Daniel 6 journey was found to be a walk, a reading and a scene, and this one was made so that each act has its own play.

| Act | Verses | What you do |
|---|---|---|
| One: Arise, Go | 1:1–3 | The word comes. The way to Nineveh is marked, and you may take it or turn from it: whichever you do, what Jonah did is read (1:3), and the story goes down to Joppa. Find the ship on the quay, pay the fare, and go down into her. Fill in "to flee unto Tarshish from the ___ of the LORD". |
| Two: The Storm | 1:4–16 | The tempest, and the mariners casting forth the wares, seen while he sleeps below. The shipmaster wakes you. The deck rolls and carries you down it: take up what is left of the wares and cast it into the sea. Draw your lot with the mariners; answer them (fill in "which hath made the ___ and the dry land"). Take an oar and pull: the land comes no nearer. Go to the ship's side. The sea ceases from her raging. |
| Three: Out of the Belly | 1:17–2:10 | You go down through the deep, the weeds about you (2:3, 2:5), and the great fish comes. Then it is dark. Three days and three nights: each day there is a light somewhere about you, and you turn and look for it ("yet I will look again toward thy holy temple", 2:4, which you fill in); while you look toward it, part of the prayer is read. |
| Four: That Great City | 3 | On the dry land the word comes the second time, and the way is marked as it was before. Enter Nineveh and cry against it in three places, deeper into the city each time as the day goes on; each place does a part of 3:5 (they believe; they proclaim a fast and put on sackcloth; from the greatest to the least). Go to the king's seat: he rises from his throne, lays his robe from him, and sits in ashes. Fill in "the people of Nineveh ___ God". |
| Five: The Gourd | 4 | Fill in "slow to ___". Go out of the city to its east side; bring four boughs and make a booth, and sit in its shadow. The gourd comes up over you; the worm; the east wind and the sun. Then you are asked to look upon the city, and as you do the LORD's question is read. |

The book ends on that question, with no answer of Jonah's, and so does the journey: the end screen has the question for its name, and asks the family why it is hard to be glad when someone else is forgiven. Five times a verse is shown with a word left out; a wrong answer costs nothing. There is no score and no other ending. It has no recorded reading yet (`node tools/narrate.mjs --story jonah --dry` lists what there is to record), and no portrait for its card: the first letter of his name stands in its place until `face` in `src/game/stories.js` is given a `src`.

What you do that the text does not say Jonah did (said plainly, because the cards beside it are scripture):

- **You help to cast the wares into the sea.** 1:5 says the mariners did, while he was asleep below; that is shown first, as it is written, and what you cast is "what is left".
- **You take an oar.** 1:13 says "the men rowed hard to bring it to the land; but they could not".
- **You carry the boughs of the booth**, four of them, one at a time. 4:5 says "and there made him a booth".
- **You may take the marked way to Nineveh in act one.** Jonah did not, and the story does not pretend you did: 1:3 is read, and you are at Joppa.

What is shown, and what is not:

- He is cast into the sea between one picture and the next.
- "A great fish" (1:17) is all the text says of it, and it is drawn so: a great dark shape, with a tail and fins, that passes before him all its length and then comes for him out of the dark. He is swallowed between one picture and the next. The fish's belly is shown dark and nothing more; the light he turns toward is the game's picture of "I will look again toward thy holy temple", not something the text says he saw.
- "And it vomited out Jonah upon the dry land" (2:10) is read, and not seen: the next picture is the shore.
- The sackcloth is on the people only: "man and beast" (3:8) is read, and no beast is shown.
- The worm (4:7) is read; what is seen is the gourd withered in the morning.

### Nineveh, the ship and the sea, and how sure we are of them

Nineveh (`NINEVEH` in `src/game/nineveh.js`) stands where Babylon stands in the Daniel journeys, on the same river plain: Nineveh was on the Tigris as Babylon was on the Euphrates. The ship, the quay at Joppa and the shore are sets of the story's own, built on the level ground before the gate and shown with the land hidden (`g.set` and `g.land` in `src/valley/main.js`); the sea is `src/game/sea.js`.

- **Not known**: what Nineveh looked like in Jonah's day (about 760 BC, in the reign of Jeroboam the second, 2 Kings 14:25: a lifetime before Sennacherib made it his capital and built what has been dug up). It is given a wall of mud brick with stepped tops, great stone figures at its gate and slabs of stone at the foot of the king's house (as Assyrian gates and palaces had, a century later), a temple tower in stages, and houses blind to the street.
- **Not known**: where the king sat. His seat is set before his house, on the street, under a canopy, so that he can be seen to rise from it.
- **Not known**: where Jonah was when the word came, and what Joppa looked like. Act one opens on the open plain, with the city hidden; Joppa is a paved quay and a street's worth of houses.
- **A guess**: the ship as a round-built Phoenician merchantman of some twenty metres, one mast, a furled sail, a hatch, benches and oars. "A ship going to Tarshish" (1:3), "the sides of the ship" (1:5) and that they rowed (1:13) are what the text gives.
- **Not known**: what plant the gourd was. The Hebrew word is found nowhere else; it is drawn as a gourd vine, with broad leaves and long-necked fruit.
- **Reckoned**: that the booth was of boughs and dry leaves on four posts, as booths were (Nehemiah 8:15); that the rise he sits on is east of the city (4:5), which in this land is before its gate.
- **Geography, bent**: in this land the city's gate is on its east side, so he comes to Nineveh from the east. He would have come from the west.
- **Not in the text, shown because a scene needs it**: the people of Joppa on the quay; the mariners coming together at the mast for the lots; the three places in the city; the king's nobles beside him; the heat at the picture's edges as the sun beats on his head.

Two misprints in Project Gutenberg's text of Jonah are put right in `src/game/scripture-jonah.js`, and the file says so at its head: 1:10 has "said unto him. Why hast thou done this?" (a full stop for a comma), and 1:15 has "So they look up Jonah" (for "took up"). `tools/verses.mjs --check` reports exactly those two differences.

It is a remix of Patch's [Painted valley](https://patch.gg/blendi/painted-valley), a three.js scene painted like an animated film's backgrounds. The painting, grass, sky, figure and walk come from Painted valley. This game adds the hill country, the city, the story and the night.

## The story

| Act | Verses | When | What you do |
|---|---|---|---|
| One: Up to Jerusalem | 3:1–21 | Afternoon | In the valley of Lemuel, go to your father at his tent. He tells you what the Lord has commanded; Laman, from their tents, says it is a hard thing, and your father answers him. Answer your father: fill in "I will go and ___" (3:7). Call your brothers to the journey and go down the valley, Lemuel murmuring as you go. Then, in the land of Jerusalem, cast lots with your brothers (the lot falls upon Laman) and walk to the gate. You wait without it as Laman goes in; Laban's words to him are heard (3:13), and he runs out. You answer your brothers (3:15). |
| Two: Our Gold and Our Silver | 3:22–4:4 | Golden hour | Go into Lehi's house by its door and gather the gold, the silver and the precious things, in any order: a list at the top left ticks each off, and Laman, Lemuel and you carry them out. Carry them to Laban. Before you flee you are asked for a word of a verse Nephi has said; remember it and you are strengthened for the first moments of the chase. Flee his servants: what you carry slows you, and they gain on you until you leave the property behind (3:26). If they overtake you the chase begins again. Hide in the rock. The angel speaks (3:29). You answer your brothers again (4:1). |
| Three: Led by the Spirit | 4:5–38 | Night | No marker and no objective. Stand still and a soft light gathers in the air the way you should go, with a soft tone (4:6). Take a wrong turning and there is no light until you stand still again. Find Laban, drunken in the street. You may obey at once, or shrink as Nephi did (4:10): step back or wait, and the Spirit speaks again (4:11, 4:12–13). Then speak to Zoram in the voice of Laban, go with him into the treasury, and choose how you answer him three times. Go back to your brothers outside the walls, hold Zoram, and make the oath. |
| The tent of their father | 5:2–10, 3:7 | Evening | The return to the valley of Lemuel: their mother, their father, the plates laid before him; and the end screen, with a question to talk about. |

### Who tells it, and what is scripture

It is told by those who were there, not by a narrator. Most of what is said is **in the story's own words, and is not scripture**: short, plain lines (`src/game/spoken-nephi.js`), each retelling what a verse says that person said or did, each in the speaker's own voice. "LAMAN · Back to Jerusalem? It is a hard thing he asks of us." retells 3:5, "thy brothers murmur, saying it is a hard thing which I have required of them". Who they are comes from the text: Nephi goes and does and does not murmur (3:6–7); Laman and Lemuel murmur (3:5, 3:31); Sam believed Nephi's words (2:17); Laban is angry and lusts after their property (3:13, 3:25); Zoram trembles and then takes courage (4:30, 4:35). Face to face these lines are cards; on the walks they are lines low on the screen, said while you keep walking.

So that no one takes them for scripture, they are marked: no reference in gold, but "from 1 Nephi 3:5" small and grey under each, so that a family can find the verse. Five of them give a manner the verse does not ("The lot is mine. Of course it is."; Sam's "I am with you, Nephi.", the text having no words of his here): they are marked `tone` in the file, and may be struck without loss.

**The scripture itself is kept word for word**, with its reference in gold, where the account turns on it: Nephi's sayings (3:7, 3:15, 4:1), what Laban says to Laman (3:13), the angel (3:29), all of Nephi before Laban in the street (4:6, 4:9–19: the Spirit's words to him, and his own account of what he thought and did), and their mother's witness (5:8). The words of the Lord, of the Spirit and of the angel are never retold. These are quoted from `src/game/scripture.js`. What someone says in them is a card under their name, with the words that only tell who speaks left off: "NEPHI · I will go and do the things which the Lord hath commanded …" where the verse reads "And it came to pass that I, Nephi, said unto my father: I will go and do …". On those cards the name is the only word that is not the verse's, and `tools/excerpts.mjs` lists for each the words its name stands in place of. Under the angel's name more is left off than who speaks: "an angel of the Lord came and stood before them" (3:29) is seen, not read.

The three questions about Zoram and what follows a wrong answer are in italics, as thoughts: the right answer is what the verse says Nephi did, and he then says it; a wrong answer makes Zoram hesitate, and the question is asked again.

Four times a verse is shown with a word left out, to be filled in from three: as Nephi answers his father (3:7), before each try at the chase (3:16, 3:15 or 3:7, a different one each try), as he speaks to his brothers at the rock (4:1), and at 4:6. The card is the verse's own words with its reference, and the right answer is the word that was there. A wrong answer costs nothing: what was said is then read whole, whichever was chosen, and the story goes on.

### The valley of Lemuel, and how sure we are of it

"And it came to pass that when he had traveled three days in the wilderness, he pitched his tent in a valley by the side of a river of water" (2:6). The journey used to begin among the brothers' tents in sight of Jerusalem, as if their father's tent were there. It is not: the valley is now a place of its own (`LEMUEL` in `src/game/places.js`, its ground in `src/valley/world.js`, its tents in `src/game/city.js`), in the hollow behind the hill the brothers come up to Jerusalem by, and nothing of Jerusalem is seen from it. Between the valley and the land of Jerusalem the picture goes dark: the many days of the way are not walked.

- **From the text**: a valley, with a river of water in it (2:6, 2:8); a tent, in which their father dwelt (2:15); an altar of stones (2:7); that the family is there, their mother among them (5:1).
- **Not known**: where the valley was. It is drawn as this land is drawn (dry grass, bare ridges to either side), which is the hill country's paint and not Arabia's; its river does not run to a sea that is seen.
- **A guess**: four tents of goat hair, their father's the largest and open towards the river; jars and a woven cloth before it; the altar as unhewn stones laid in courses, by the water; that his brothers stand by their own tents while their father speaks ("thy brothers murmur", 3:5).
- **Not in the text, shown because a scene needs it**: that Nephi goes to his brothers and then down the valley, for "I, Nephi, and my brethren took our journey in the wilderness" (3:9); that on the way up to the gate Laman goes before, Lemuel with him and Sam beside Nephi, for "the lot fell upon Laman" (3:11), where on the last going up they come after him, for "they did follow me" (4:4); that the plates lie on the cloth before the tent at the end.
- **No tents near Jerusalem**: the brothers took their tents with them (3:9), but none is shown pitched in the land of Jerusalem. There they are on their way up to the city, and stop on the path, in sight of it, to consult and cast lots (3:10–11).

What happens is fixed; how you do it is yours. There is no score, no meter and no other ending.

By day there are a few people in the streets of Jerusalem, who say nothing. By night there are none. Laban is dressed as a captain who "can command fifty" (3:31), in a coat of bronze scales, which is the armour Nephi puts on (4:19).

There is very little music, and all of it is made in code (`src/game/music.js`): the tone of the Spirit's leading, a frame drum in the chase, one chord for the angel, only Laban's breathing in the street, and a single lyre tune at the tent of their father. The beating at the rock (3:28) is neither shown nor told: the screen dims, and what the angel asks ("Why do ye smite your younger brother with a rod?") says what it was. Laban's death (4:18) is not shown: the screen goes dark, and the card quotes only "Therefore I did obey the voice of the Spirit, …".

The game takes about 15–20 minutes. The act you reached is kept in the browser, so you can stop and continue later.

## Running it

```sh
npm install
npm run dev        # http://127.0.0.1:5384
npm run build      # a static site in dist/, to host anywhere
npm run serve      # serves dist/ on 5383
```

Controls: W A S D to walk, Shift to run, the mouse to look (click to capture it), E or Enter to act and to go on from a card, Esc to pause. When a card asks a question, W A S D or the arrows choose an answer and E takes it (or press 1, 2 or 3); on a phone, tap one. A gamepad works too, for walking.

On a phone or a tablet it is played by touch (`src/game/touch.js`): a thumb on the left of the screen is a stick to walk by, a finger dragged on the right looks round, a tap goes on from a card or acts, an answer is tapped to take it, and the button at the lower right runs. It is painted at low quality there unless the address says otherwise. `?touch` tries the same controls with a mouse.

Useful URL options:
- `?quality=low|medium|high` (medium by default)
- `?fps` writes the frame rate, the longest frame and the frame's triangles at the top of the page; `?trim=450` draws no tree further than that many metres from the middle of the land, and `?far=200` none further than that from the eye. These are a trial, for finding what a phone is slow at: off unless asked for.
- `?names=0` leaves off the names written small over those the text names (`src/game/names.js`)
- `?beat=a2` starts at a beat. The beats are `a1`, `a1-land`, `a1-gate`, `a2`, `a2-laban`, `a2-rock`, `a3`, `a3-laban`, `a3-treasury`, `a3-walls` and `home`. (With `?story=fiery-furnace`: `a1`, `a1-dura`, `a2`, `a3`, `a3-fire`, `a3-forth`. With `?story=lions-den`: `a1`, `a1-accounts`, `a2`, `a2-king`, `a3`, `a3-den`, `a4`, `a4-up`.)
- `?auto` lets the game play itself. With `&hold` it is overtaken once in the chase before it leaves the property, and with `&wrong` it answers Zoram wrongly once each time and fills in every left-out word wrongly, so a test covers those ways too.
- `?count=log` writes what would be counted to the console in place of counting it (see "What is counted").

## What is counted

To know whether the game is played, and where it is left off, a little is counted, with [Umami](https://umami.is): no cookies, nothing kept in the browser, and nothing that says who is playing.

- Umami's script (in `index.html`) counts each visit: the page, the site that linked to it, the country, and the kind of device.
- `src/game/tally.js` counts a journey as it is played: `start` (which journey, begun or gone on with, by touch or keys), each act as it is reached (`act-two`, `act-three`, …), `left` (the beat it was left at, and after how many minutes) if the page is closed before the end, `end` (and how many minutes it took), and `again`. In Umami these are filed under the journey's name as a page (`/scripture-journeys/fiery-furnace`), so one journey's can be told from another's.
- Where plays are counted, the end of a journey asks, under the ways on, "Did your family enjoy this journey?", answered with a tap (`enjoyed`: yes, somewhat or no).
- A parent may write a note there, and leave an email to hear of new journeys. That goes to a Google Form, not to Umami (which is told only that a note was sent), and the box is shown only once the form is named in `GAME.notes` in `src/game/stories.js`.

Nothing is counted on your own machine or by the tests (the script counts only on the address named in its `data-domains`, which must be changed if the game moves), nor where the browser asks not to be tracked. To leave your own plays on the live game out, run `localStorage.setItem('umami.disabled', 1)` once in that browser's console.

To see which place a link was posted brings players, give each its own: `…/scripture-journeys/?utm_source=facebook`, `?utm_source=reddit`, `?utm_source=x` (add `&story=fiery-furnace` to open on that journey's book). Umami lists these as sources, and `start` carries the same word as `from`.

## Checking it

```sh
npm run build
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node tools/story.mjs            # plays the whole story headless; fails unless it reaches the end
node tools/story.mjs --query "hold&wrong"                                            # the same, overtaken once and answering wrongly once
node tools/story.mjs --beat a3 --snap "4:6,4:9" --quality medium --out shots/story   # stills when those cards are up
node tools/look.mjs city:120,0,0,4,50 --out shots/work                               # a still from any place (u, v, turn, pitch, fov)
node tools/touch.mjs                                                                 # the touch controls, on a phone-sized touch page
node tools/narration-check.mjs                                                       # the reading aloud, with a stand-in recording
node tools/narrate.mjs --cast                                                        # who reads what in the first journey: each speaker's voice
node tools/fps.mjs --query "quality=medium&beat=a2-laban"                            # frame rate
node tools/story.mjs --query "story=fiery-furnace"                                   # the Daniel journey, to its end
node tools/story.mjs --query "story=fiery-furnace&bow&wrong"                         # falling down once, every word filled in wrongly
node tools/story.mjs --query "story=lions-den"                                       # the Daniel 6 journey, to its end
node tools/story.mjs --query "story=lions-den&wrong"                                 # choosing not to pray once, every word filled in wrongly
node tools/story.mjs --query "story=jonah"                                           # the Jonah journey, to its end
node tools/story.mjs --query "story=jonah&wrong"                                     # taking the way to Nineveh in act one, every word filled in wrongly
node tools/story.mjs --query "story=by-small-means"                                  # the 1 Nephi 16 journey, to its end (it hunts, and makes its bow, by itself)
node tools/journeys.mjs                                                              # the list of journeys, what is kept, and the end screens
node tools/excerpts.mjs                                                              # every shortened verse is the verse's own words
node tools/verses.mjs pg10.txt "The Book of Daniel" --check src/game/scripture-daniel.js VERSES   # the verses are as the King James text has them
node tools/verses.mjs pg10.txt "Jonah" --check src/game/scripture-jonah.js VERSES                 # Jonah likewise: it reports the two misprints put right (1:10, 1:15), and no others
node tools/same.mjs shots/before shots/after                                         # two folders of stills, pixel by pixel
node tools/count-check.mjs                                                           # what is counted, and that a test's play is not
```

`tools/same.mjs` is how a change to one journey is shown to leave another as it was: take stills of it with `tools/look.mjs` before the change and after, and compare.

On an Apple M4 at 1080p the game runs at about 56–68 fps at medium with the cast on screen, and about 52 fps at high.

## What is where

- `src/game/places.js`: where everything is (the valley of Lemuel, where the brothers come up into the land of Jerusalem, the city and gate, Lehi's house, the rock) and the paths between them.
- `src/game/city.js`: the walls and gate, the flat-roofed houses, Laban's house and court, the treasury and Lehi's house; and the camp in the valley of Lemuel (its tents and the altar of stones), a set shown only there. The same boxes are the colliders.
- `src/game/story.js`: the beats, and who wears what. `src/game/scripture.js`: 1 Nephi 3–5 verse by verse, who speaks, the parts of verses that are quoted, and the verses with a word left out. `src/game/spoken-nephi.js`: what its people say in the story's own words, each with the verse it retells.
- `src/game/small-means.js`, `src/game/scripture-nephi16.js`, `src/game/spoken-nephi16.js`: the 1 Nephi 16 journey's beats, its camp and small things; 1 Nephi 16:9–32 verse by verse, the shortened verses and those with a word left out; what its people say in the story's own words.
- `src/game/liahona.js`, `src/game/bow.js`, `src/game/beasts.js`, `src/game/hunt.js`, `src/game/solid.js`: the ball and its spindles; the bow, its arrow and its flight; the wild beasts; the hunt; and the paint for solid things made in code.
- `src/game/director.js`: runs the beats (cards, places to reach, things to act on), saves checkpoints, and drives the autopilot.
- `src/game/npc.js`: the brothers, Laban, his servants, Zoram and the angel. They are clones of the one figure that walk paths, follow Nephi's trail, or go before him along a way at his pace, waiting if he falls behind.
- `src/game/guidance.js`: the leading light for the night act.
- `src/game/town.js`: the people in the streets by day.
- `src/game/music.js`: the story's music, made in code and played through the valley's sounds.
- `src/game/narration.js`: the scripture read aloud, from recordings in `public/audio/narration/` made by `tools/narrate.mjs` (ElevenLabs; the key is in `.env` and stays on your machine). A card with a recording goes on by itself when it has been read; the button at the top right, or M, turns the reading off. In the first journey everyone speaks in a voice of their own (Nephi, Lehi, Sariah, Laman, Lemuel, Sam, Laban, Zoram, the angel: the `cast` in `tools/narrate.mjs`), both in what is quoted and in what is said in the story's own words; Nephi's voice also reads his own account (4:6, 4:9–19), and when he speaks "in the voice of Laban" (4:20) it is Laban's voice that is heard. The narrator reads only what the Spirit says. `node tools/narrate.mjs --tidy` puts away the recordings a journey no longer reads (into `shots/narration/unused/`, which is not published). `node tools/narrate.mjs --cast` lists who reads what, with a link to hear each voice, and `--audition` makes one short card in each.
- `src/game/touch.js`: the touch controls, for phones and tablets.
- `src/game/tally.js`: what leaves the page: the counts of how a journey is played, and a parent's note at its end.
- `src/game/daniel.js`, `src/game/scripture-daniel.js`: the Daniel journey's beats, people and clothes; Daniel 3 verse by verse, the shortened verses and those with a word left out.
- `src/game/babylon.js`, `src/game/glaze.js`: Babylon and the plain of Dura; the glazed brick's figures (bull, dragon, lion, rosette, palmette), drawn in code.
- `src/game/lions-den.js`, `src/game/lions.js`, `src/game/telling.js`: the Daniel 6 journey's beats, people and clothes; the lions of the den, made in code; and how a story shows its scripture (a card, a line, a verse with a word left out).
- `src/game/jonah.js`, `src/game/scripture-jonah.js`: the Jonah journey's beats, people and clothes, and its weather; Jonah verse by verse, the shortened verses and those with a word left out.
- `src/game/nineveh.js`: Nineveh; and the journey's sets (the ship, her oars, the quay at Joppa, the shore, the booth, the gourd) and small things (the wares, the boughs, the king's robe, the ashes).
- `src/game/sea.js`: the sea, calm and in the tempest; the rain; the deep, its weeds, and the great fish.
- `tools/verses.mjs`: prints verses for `scripture-daniel.js` from the King James text as published (Project Gutenberg #10), and checks the table against it.
- `src/game/crowd.js`: the multitude, painted, which falls down when the music sounds.
- `src/game/heat.js`: the furnace's heat at the picture's edges.
- `src/game/ui.js`: the cards (a small panel low on the page that the picture shows through: who speaks and where the words are from in one line over them, and a small round button for the way on; how far it is seen through is `--see` on `#g-card`), what to do at the top left (said once in full under "New task", a line and a checklist when the thing has parts, and then drawn in to a small pill with a few words of it, which says it in full again when it is pressed, or with T; the few words are the second thing given to `c.objective`, and where none is given the line itself is cut short), the prompt and the line of scripture low on the screen (the prompt above the line, so that no two lie in the one place), the way-marker (a gold diamond with how far it is, which says "Go here" when the thing to do is new, and at the picture's edge points to where the place is), fades, and the title and end screens.
- `src/valley/`, `src/lib/`, `src/figure/`: Painted valley's painting, recoloured for dry hills and given a night (`sky.js`). `world.js` has the two lands; `sky.js`, `clouds.js`, `trees.js` (olives, or date palms), `water.js` (the river) and the shared colours (`uLand` in `src/lib/glsl.js`) follow whichever the page is laid out on.

## Credits and licences

See `LICENCE-NOTES.md` and `public/CREDITS.md`. In short:
- The code is MIT, from Patch and this game.
- The figure, textures and footsteps are CC0.
- The scripture text is public domain (the Book of Mormon, Project Gutenberg #17; the King James Bible, Project Gutenberg #10).
- Painted valley's five ambience recordings are not included, because their licence doesn't allow passing them on. Wind and crickets are made in code instead.
- The music is made in code and its tunes were written for this game, so there is nothing to license.

This is an independent project. It is not an official product of The Church of Jesus Christ of Latter-day Saints.
