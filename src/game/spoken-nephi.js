// What the people of the first journey say in the story's own words: short, plain, and each one's own. These are NOT
// scripture. Each retells what a verse says that person said or did (`from`), and is shown under the speaker's name
// with "from 1 Nephi 3:22" small and grey under it, never with the gold reference a quoted verse has. The words of the
// Lord, of the Spirit and of the angel are never retold: they are always the scripture's own (scripture.js).
//
// Who they are comes from the text. Nephi goes and does, and does not murmur (3:6–7). Laman and Lemuel murmur: "it is
// a hard thing" (3:5), "How is it possible …?" (3:31). Sam believed Nephi's words (2:17). Laban is angry, and lusts
// after their property (3:13, 3:25). Zoram trembles, and then takes courage (4:30, 4:35). Their mother had supposed
// them perished (5:2); their father knew the Lord would deliver them (5:5).
//
// A line marked `tone` gives a manner the verse does not: it is the story's, and may be struck without loss.
import { SPEAKERS } from './scripture.js';

const { nephi, lehi, sariah, laman, lemuel, sam, laban, zoram, asLaban } = SPEAKERS;
export const BOOK = '1 Nephi';

export const SPOKEN = {
  // ---- the valley of Lemuel (3:2–9) ----
  dream: { who: lehi, from: '3:2', text: 'Nephi, my son. I have dreamed a dream. The Lord has commanded that you and your brothers return to Jerusalem.' },
  plates: { who: lehi, from: '3:3–4', text: 'Laban has the record of our people, on plates of brass. Go to his house and bring them here.' },
  hard: { who: laman, from: '3:5', text: 'Back to Jerusalem? It is a hard thing he asks of us.' },
  commandment: { who: lehi, from: '3:5', text: 'It is not I who ask it. It is a commandment of the Lord.' },
  blessed: { who: lehi, from: '3:6–8', text: 'I know the Lord has blessed you. Go, my son.' },
  tents: { who: nephi, from: '3:9', text: 'Brothers, let us take our tents and go.' },
  allthatway: { who: lemuel, from: '3:5', tone: true, text: 'All that way, for a record?' },
  withyou: { who: sam, from: '2:17', tone: true, text: 'I am with you, Nephi.' },
  // ---- the land of Jerusalem, and the gate (3:10–21) ----
  lots: { who: nephi, from: '3:10–11', text: 'There is Jerusalem. Let us cast lots for who will go in to Laban.' },
  lot: { who: laman, from: '3:11', tone: true, text: 'The lot is mine. Of course it is.' },
  wait: { who: laman, from: '3:11', text: 'Wait here. I will speak with him.' },
  robber: { who: laman, from: '3:13–14', text: 'He called me a robber! He said he would kill me!' },
  finished: { who: lemuel, from: '3:14', text: 'Then it is finished. Let us go back to our father.' },
  gold: { who: nephi, from: '3:16', text: 'Our father left gold and silver at our house. Let us gather it, and buy the plates.' },
  tryit: { who: laman, from: '3:21', text: 'Very well. We will try it.' },
  // ---- their gold and their silver (3:22–4:4) ----
  gather: { who: nephi, from: '3:22', text: 'Gather it all: the gold, the silver, and our precious things.' },
  givelaban: { who: laman, from: '3:24', tone: true, text: 'All this, and we give it to Laban?' },
  upagain: { who: nephi, from: '3:23–24', text: 'For the plates, yes. Now, up again to the house of Laban.' },
  nearly: { who: laman, from: '3:13', tone: true, text: 'He nearly killed me the first time.' },
  offer: { who: nephi, from: '3:24', text: 'Laban, give us the plates of brass, and all of this is yours.' },
  seize: { who: laban, from: '3:25', text: 'All of this… Servants! Take it. Kill them.' },
  run: { who: sam, from: '3:26', text: 'Run!' },
  leaveit: { who: laman, from: '3:26', text: 'Leave it! Leave it all!' },
  gone: { who: lemuel, from: '3:26', text: 'Gone. Our gold, our silver, all of it.' },
  yourdoing: { who: laman, from: '3:28', text: 'This is your doing, Nephi. Yours and our father’s.' },
  howcan: { who: laman, from: '3:31', text: 'How can the Lord deliver Laban into our hands?' },
  fifty: { who: lemuel, from: '3:31', text: 'He commands fifty men. He could kill fifty. Why not us?' },
  moses: { who: nephi, from: '4:2–3', text: 'Remember Moses. The sea divided, and our fathers walked through on dry ground. An angel has spoken to you. How can you doubt?' },
  follow: { who: laman, from: '4:4', text: '…We will follow.' },
  // ---- by night (4:5–38) ----
  hide: { who: nephi, from: '4:5', text: 'Hide here, outside the walls. I will go in alone.' },
  fallen: { who: nephi, from: '4:7–8', text: 'A man, fallen in the street. Drunk with wine… It is Laban.' },
  treasury: { who: asLaban, from: '4:20', text: 'Come. Go with me into the treasury.' },
  master: { who: zoram, from: '4:21', text: 'Yes, master.' },
  elders: { who: zoram, from: '4:22', text: 'You were out late among the elders tonight, master.' },
  iwas: { who: asLaban, from: '4:23', text: 'I was.' },
  carry: { who: asLaban, from: '4:24', text: 'I am to carry these plates to my elder brethren, outside the walls.' },
  followme: { who: asLaban, from: '4:25', text: 'Follow me.' },
  itislaban: { who: laman, from: '4:28', text: 'It is Laban! He has killed Nephi. Run!' },
  itisi: { who: nephi, from: '4:29', text: 'Brothers! It is I, Nephi!' },
  notmaster: { who: zoram, from: '4:30', text: 'You are not my master…' },
  spare: { who: nephi, from: '4:32–33', text: 'Do not fear. As the Lord lives, and as I live, hear us and we will spare your life. Come with us, and you shall be a free man like us.' },
  oath: { who: zoram, from: '4:35', text: 'I will go with you. I give you my oath.' },
  // ---- the tent of their father (5:2–10) ----
  perished: { who: sariah, from: '5:2', text: 'My sons! I thought you had perished in the wilderness.' },
  knew: { who: lehi, from: '5:5', text: 'I knew the Lord would deliver my sons.' },
  brass: { who: nephi, from: '5:10', text: 'Father. The plates of brass.' },
};
// (the name its recording is kept under: with its verse, so that it is asked for in the order of the account)
for (const [key, s] of Object.entries(SPOKEN)) s.voice = `${BOOK} ${s.from} said ${key}`;
