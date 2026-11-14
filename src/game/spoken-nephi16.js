// What the people of "By Small Means" (1 Nephi 16:9–32) say in the story's own words: short, plain, and each one's own.
// These are NOT scripture. Each retells what a verse says that person said or did, or what the verse tells happened
// (`from`), and is shown under the speaker's name with "from 1 Nephi 16:18" small and grey under it, never with the
// gold reference a quoted verse has. The words of the Lord are never retold: they are the scripture's own (16:26).
//
// Who they are comes from the text. At the chapter's beginning Laman and Lemuel "did humble themselves before the
// Lord" (16:5), so in the valley and by the way they do not murmur. When the bow breaks they "were angry with me"
// (16:18) and "did begin to murmur exceedingly" (16:20). Their father also murmured (16:20): the account does not give
// his words, and the story gives him none; he is seen sitting apart, and the verse says it. It is Nephi who asks his
// father where to go (16:23), and their father who is "truly chastened" (16:25).
//
// A line marked `tone` gives a manner or a detail the verse does not: it is the story's, and may be struck without loss.
//
// NOT YET RECORDED: these lines are written up to be read over first.
import { SPEAKERS } from './scripture-nephi16.js';

const { nephi, lehi, sariah, laman, lemuel, sam } = SPEAKERS;
export const BOOK = '1 Nephi';

export const SPOKEN = {
  // ---- Act One: the valley of Lemuel (16:9–12) ----
  call: { who: lehi, from: '16:10', tone: true, text: 'Nephi! Come and see what lay at my door.' },
  voice: { who: lehi, from: '16:9', text: 'The Lord spoke to me in the night. Tomorrow we go on, into the wilderness.' },
  found: { who: lehi, from: '16:10', text: 'And this morning, at the door of my tent, I found this on the ground.' },
  brass: { who: nephi, from: '16:10', text: 'A ball of fine brass. I have never seen such work.' },
  points: { who: lehi, from: '16:10', text: 'One of its spindles points the way we are to go.' },
  gatherall: { who: lehi, from: '16:11', text: 'Gather all we can carry: our provisions, and seed of every kind.' },
  seed: { who: sariah, from: '16:11', tone: true, text: 'Here is the seed, my son. Seed of every kind.' },
  whatnext: { who: lemuel, from: '16:10', tone: true, text: 'A ball that knows the way. What next?' },
  across: { who: nephi, from: '16:12', text: 'It points across the river. Come!' },
  // ---- Act Two: by the way (16:13–17) ----
  green: { who: sam, from: '16:16', text: 'See how the ball keeps us where it is green.' },
  water: { who: lemuel, from: '16:14', tone: true, text: 'Where it is green there is water.' },
  game: { who: laman, from: '16:14–15', text: 'And where there is water there is game. Take your bows.' },
  there: { who: sam, from: '16:15', text: 'There, feeding by the trees. Go softly, Nephi.' },
  bestill: { who: sam, from: '16:15', tone: true, text: 'When one lifts its head, be still.' },
  food: { who: sam, from: '16:15', text: 'Food for our families!' },
  fineshot: { who: laman, from: '16:18', tone: true, text: 'A fine shot. That bow of steel is worth ten of mine.' },
  pointson: { who: nephi, from: '16:16–17', text: 'The ball points on. Let us go.' },
  // ---- Act Three: the bow of fine steel (16:17–22) ----
  rest: { who: lehi, from: '16:17', text: 'We will rest here a while. Go, my sons, and bring food for our families.' },
  weary: { who: sariah, from: '16:17', tone: true, text: 'We are weary, and there is little left to eat.' },
  soft: { who: laman, from: '16:21', text: 'My bow has gone soft. It throws like a child’s.' },
  minealso: { who: lemuel, from: '16:21', text: 'Mine also. The spring is gone out of it.' },
  yours: { who: sam, from: '16:21', tone: true, text: 'Then it rests on your bow, Nephi.' },
  broken: { who: nephi, from: '16:18', text: 'My bow! It is broken.' },
  angry: { who: laman, from: '16:18', text: 'Your bow was all we had! Now we have nothing!' },
  takemine: { who: lemuel, from: '16:21', text: 'Take mine, then. See what it is worth.' },
  yousee: { who: lemuel, from: '16:21', text: 'You see? No spring at all.' },
  nofood: { who: laman, from: '16:18–19', text: 'No food. We go back with empty hands.' },
  neverleft: { who: laman, from: '16:20', text: 'We should never have left Jerusalem. We will die out here.' },
  hungry: { who: lemuel, from: '16:20', text: 'Hungry, and tired, and now this.' },
  heart: { who: sam, from: '16:19', tone: true, text: 'Do not lose heart, Nephi.' },
  nothing: { who: sariah, from: '16:19', text: 'Nothing? … They are so tired, Nephi. And so hungry.' },
  harden: { who: nephi, from: '16:22', text: 'Brothers, do not harden your hearts again. The Lord has not brought us here to forget us.' },
  // ---- Act Four: out of wood a bow (16:23–29) ----
  make: { who: nephi, from: '16:23', text: 'I have no bow. Then I will make one.' },
  trees: { who: sam, from: '16:23', tone: true, text: 'There are trees up the wadi. Come, I will show you.' },
  dry: { who: nephi, from: '16:23', tone: true, text: 'Dry. It cracks.' },
  stiff: { who: nephi, from: '16:23', tone: true, text: 'Too stiff. It will not bend.' },
  springs: { who: nephi, from: '16:23', tone: true, text: 'This one bends, and springs back.' },
  stick: { who: nephi, from: '16:23', text: 'And a straight stick, for an arrow.' },
  stones: { who: nephi, from: '16:23', text: 'Stones, for my sling.' },
  onearrow: { who: laman, from: '16:23', tone: true, text: 'A bow out of a bough. And one arrow.' },
  itisabow: { who: sam, from: '16:23', tone: true, text: 'It is a bow, Laman.' },
  enough: { who: nephi, from: '16:23', text: 'A bow and an arrow, a sling and stones.' },
  askme: { who: lehi, from: '16:23–24', tone: true, text: 'You ask me, my son? After I have murmured?' },
  inquire: { who: lehi, from: '16:24', text: 'I will inquire of the Lord.' },
  bringball: { who: lehi, from: '16:26–27', text: 'The ball. Nephi, bring the ball!' },
  top: { who: lehi, from: '16:30', text: 'It gives the way: up, into the top of the mountain.' },
  // ---- Act Five: into the top of the mountain (16:30–32) ----
  asiheed: { who: nephi, from: '16:28', text: 'While I heed it, it points true.' },
  onearrowmine: { who: nephi, from: '16:30–31', text: 'Wild beasts. And I have one arrow.' },
  notall: { who: nephi, from: '16:31', tone: true, text: 'One. It will not feed us all.' },
  obtained: { who: nephi, from: '16:31', text: 'Food for our families.' },
  hehasfood: { who: sam, from: '16:32', text: 'He has food! Nephi has food!' },
  joy: { who: sariah, from: '16:32', text: 'Oh, my son. How great is our joy!' },
  withyou: { who: laman, from: '16:32', tone: true, text: 'A bow of wood, and one arrow. The Lord was with you.' },
  thanks: { who: lehi, from: '16:32', text: 'Let us give thanks to the Lord.' },
};
// (the name its recording is kept under: with its verse, so that it is asked for in the order of the account)
for (const [key, s] of Object.entries(SPOKEN)) s.voice = `${BOOK} ${s.from} said ${key}`;
