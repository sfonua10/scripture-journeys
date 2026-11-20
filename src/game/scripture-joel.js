// Joel 1:4, 2:12–17 and 2:21–26, verse by verse, in the King James Version as published (Project Gutenberg eBook #10,
// The King James Version of the Bible, public domain). Generated from that text, not typed by hand: tools/verses.mjs
// prints them from it, and with --check says whether this table is still as the text has it.
//   node tools/verses.mjs pg10.txt "Joel" 1:4 2:12 2:13 2:14 2:15 2:16 2:17 2:21 2:22 2:23 2:24 2:25 2:26
// Cards in the game quote these exactly.
import { scripture } from './scripture.js';

export const VERSES = {
  '1:4': "That which the palmerworm hath left hath the locust eaten; and that which the locust hath left hath the cankerworm eaten; and that which the cankerworm hath left hath the caterpiller eaten.",
  '2:12': "Therefore also now, saith the LORD, turn ye even to me with all your heart, and with fasting, and with weeping, and with mourning:",
  '2:13': "And rend your heart, and not your garments, and turn unto the LORD your God: for he is gracious and merciful, slow to anger, and of great kindness, and repenteth him of the evil.",
  '2:14': "Who knoweth if he will return and repent, and leave a blessing behind him; even a meat offering and a drink offering unto the LORD your God?",
  '2:15': "Blow the trumpet in Zion, sanctify a fast, call a solemn assembly:",
  '2:16': "Gather the people, sanctify the congregation, assemble the elders, gather the children, and those that suck the breasts: let the bridegroom go forth of his chamber, and the bride out of her closet.",
  '2:17': "Let the priests, the ministers of the LORD, weep between the porch and the altar, and let them say, Spare thy people, O LORD, and give not thine heritage to reproach, that the heathen should rule over them: wherefore should they say among the people, Where is their God?",
  '2:21': "Fear not, O land; be glad and rejoice: for the LORD will do great things.",
  '2:22': "Be not afraid, ye beasts of the field: for the pastures of the wilderness do spring, for the tree beareth her fruit, the fig tree and the vine do yield their strength.",
  '2:23': "Be glad then, ye children of Zion, and rejoice in the LORD your God: for he hath given you the former rain moderately, and he will cause to come down for you the rain, the former rain, and the latter rain in the first month.",
  '2:24': "And the floors shall be full of wheat, and the vats shall overflow with wine and oil.",
  '2:25': "And I will restore to you the years that the locust hath eaten, the cankerworm, and the caterpiller, and the palmerworm, my great army which I sent among you.",
  '2:26': "And ye shall eat in plenty, and be satisfied, and praise the name of the LORD your God, that hath dealt wondrously with you: and my people shall never be ashamed.",
};

export const joel = scripture('Joel', VERSES);
