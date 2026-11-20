// Hosea 6:1–3, 10:12 and 14:4–7, verse by verse, in the King James Version as published (Project Gutenberg eBook #10,
// The King James Version of the Bible, public domain). Generated from that text, not typed by hand: tools/verses.mjs
// prints them from it, and with --check says whether this table is still as the text has it.
//   node tools/verses.mjs pg10.txt "Hosea" 6:1 6:2 6:3 10:12 14:4 14:5 14:6 14:7
// Cards in the game quote these exactly.
import { scripture } from './scripture.js';

export const VERSES = {
  '6:1': "Come, and let us return unto the LORD: for he hath torn, and he will heal us; he hath smitten, and he will bind us up.",
  '6:2': "After two days will he revive us: in the third day he will raise us up, and we shall live in his sight.",
  '6:3': "Then shall we know, if we follow on to know the LORD: his going forth is prepared as the morning; and he shall come unto us as the rain, as the latter and former rain unto the earth.",
  '10:12': "Sow to yourselves in righteousness, reap in mercy; break up your fallow ground: for it is time to seek the LORD, till he come and rain righteousness upon you.",
  '14:4': "I will heal their backsliding, I will love them freely: for mine anger is turned away from him.",
  '14:5': "I will be as the dew unto Israel: he shall grow as the lily, and cast forth his roots as Lebanon.",
  '14:6': "His branches shall spread, and his beauty shall be as the olive tree, and his smell as Lebanon.",
  '14:7': "They that dwell under his shadow shall return; they shall revive as the corn, and grow as the vine: the scent thereof shall be as the wine of Lebanon.",
};

export const hosea = scripture('Hosea', VERSES);
