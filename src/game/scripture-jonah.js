// The book of Jonah, verse by verse, in the King James Version as published (Project Gutenberg eBook #10, The King
// James Version of the Bible, public domain). Generated from that text, not typed by hand: tools/verses.mjs prints
// them from it, and with --check says whether this table is still as the text has it.
//
// Two misprints of that edition are put right, as every printed King James Version has them (and --check will name
// these two, and only these two, as differing from the text):
//   1:10  "said unto him. Why hast thou done this?"  →  "said unto him, Why hast thou done this?"
//   1:15  "So they look up Jonah"                    →  "So they took up Jonah"
// Cards in the game quote these exactly.
import { scripture } from './scripture.js';

export const VERSES = {
  '1:1': "Now the word of the LORD came unto Jonah the son of Amittai, saying,",
  '1:2': "Arise, go to Nineveh, that great city, and cry against it; for their wickedness is come up before me.",
  '1:3': "But Jonah rose up to flee unto Tarshish from the presence of the LORD, and went down to Joppa; and he found a ship going to Tarshish: so he paid the fare thereof, and went down into it, to go with them unto Tarshish from the presence of the LORD.",
  '1:4': "But the LORD sent out a great wind into the sea, and there was a mighty tempest in the sea, so that the ship was like to be broken.",
  '1:5': "Then the mariners were afraid, and cried every man unto his god, and cast forth the wares that were in the ship into the sea, to lighten it of them. But Jonah was gone down into the sides of the ship; and he lay, and was fast asleep.",
  '1:6': "So the shipmaster came to him, and said unto him, What meanest thou, O sleeper? arise, call upon thy God, if so be that God will think upon us, that we perish not.",
  '1:7': "And they said every one to his fellow, Come, and let us cast lots, that we may know for whose cause this evil is upon us. So they cast lots, and the lot fell upon Jonah.",
  '1:8': "Then said they unto him, Tell us, we pray thee, for whose cause this evil is upon us; What is thine occupation? and whence comest thou? what is thy country? and of what people art thou?",
  '1:9': "And he said unto them, I am an Hebrew; and I fear the LORD, the God of heaven, which hath made the sea and the dry land.",
  '1:10': "Then were the men exceedingly afraid, and said unto him, Why hast thou done this? For the men knew that he fled from the presence of the LORD, because he had told them.",
  '1:11': "Then said they unto him, What shall we do unto thee, that the sea may be calm unto us? for the sea wrought, and was tempestuous.",
  '1:12': "And he said unto them, Take me up, and cast me forth into the sea; so shall the sea be calm unto you: for I know that for my sake this great tempest is upon you.",
  '1:13': "Nevertheless the men rowed hard to bring it to the land; but they could not: for the sea wrought, and was tempestuous against them.",
  '1:14': "Wherefore they cried unto the LORD, and said, We beseech thee, O LORD, we beseech thee, let us not perish for this man’s life, and lay not upon us innocent blood: for thou, O LORD, hast done as it pleased thee.",
  '1:15': "So they took up Jonah, and cast him forth into the sea: and the sea ceased from her raging.",
  '1:16': "Then the men feared the LORD exceedingly, and offered a sacrifice unto the LORD, and made vows.",
  '1:17': "Now the LORD had prepared a great fish to swallow up Jonah. And Jonah was in the belly of the fish three days and three nights.",
  '2:1': "Then Jonah prayed unto the LORD his God out of the fish’s belly,",
  '2:2': "And said, I cried by reason of mine affliction unto the LORD, and he heard me; out of the belly of hell cried I, and thou heardest my voice.",
  '2:3': "For thou hadst cast me into the deep, in the midst of the seas; and the floods compassed me about: all thy billows and thy waves passed over me.",
  '2:4': "Then I said, I am cast out of thy sight; yet I will look again toward thy holy temple.",
  '2:5': "The waters compassed me about, even to the soul: the depth closed me round about, the weeds were wrapped about my head.",
  '2:6': "I went down to the bottoms of the mountains; the earth with her bars was about me for ever: yet hast thou brought up my life from corruption, O LORD my God.",
  '2:7': "When my soul fainted within me I remembered the LORD: and my prayer came in unto thee, into thine holy temple.",
  '2:8': "They that observe lying vanities forsake their own mercy.",
  '2:9': "But I will sacrifice unto thee with the voice of thanksgiving; I will pay that that I have vowed. Salvation is of the LORD.",
  '2:10': "And the LORD spake unto the fish, and it vomited out Jonah upon the dry land.",
  '3:1': "And the word of the LORD came unto Jonah the second time, saying,",
  '3:2': "Arise, go unto Nineveh, that great city, and preach unto it the preaching that I bid thee.",
  '3:3': "So Jonah arose, and went unto Nineveh, according to the word of the LORD. Now Nineveh was an exceeding great city of three days’ journey.",
  '3:4': "And Jonah began to enter into the city a day’s journey, and he cried, and said, Yet forty days, and Nineveh shall be overthrown.",
  '3:5': "So the people of Nineveh believed God, and proclaimed a fast, and put on sackcloth, from the greatest of them even to the least of them.",
  '3:6': "For word came unto the king of Nineveh, and he arose from his throne, and he laid his robe from him, and covered him with sackcloth, and sat in ashes.",
  '3:7': "And he caused it to be proclaimed and published through Nineveh by the decree of the king and his nobles, saying, Let neither man nor beast, herd nor flock, taste any thing: let them not feed, nor drink water:",
  '3:8': "But let man and beast be covered with sackcloth, and cry mightily unto God: yea, let them turn every one from his evil way, and from the violence that is in their hands.",
  '3:9': "Who can tell if God will turn and repent, and turn away from his fierce anger, that we perish not?",
  '3:10': "And God saw their works, that they turned from their evil way; and God repented of the evil, that he had said that he would do unto them; and he did it not.",
  '4:1': "But it displeased Jonah exceedingly, and he was very angry.",
  '4:2': "And he prayed unto the LORD, and said, I pray thee, O LORD, was not this my saying, when I was yet in my country? Therefore I fled before unto Tarshish: for I knew that thou art a gracious God, and merciful, slow to anger, and of great kindness, and repentest thee of the evil.",
  '4:3': "Therefore now, O LORD, take, I beseech thee, my life from me; for it is better for me to die than to live.",
  '4:4': "Then said the LORD, Doest thou well to be angry?",
  '4:5': "So Jonah went out of the city, and sat on the east side of the city, and there made him a booth, and sat under it in the shadow, till he might see what would become of the city.",
  '4:6': "And the LORD God prepared a gourd, and made it to come up over Jonah, that it might be a shadow over his head, to deliver him from his grief. So Jonah was exceeding glad of the gourd.",
  '4:7': "But God prepared a worm when the morning rose the next day, and it smote the gourd that it withered.",
  '4:8': "And it came to pass, when the sun did arise, that God prepared a vehement east wind; and the sun beat upon the head of Jonah, that he fainted, and wished in himself to die, and said, It is better for me to die than to live.",
  '4:9': "And God said to Jonah, Doest thou well to be angry for the gourd? And he said, I do well to be angry, even unto death.",
  '4:10': "Then said the LORD, Thou hast had pity on the gourd, for the which thou hast not laboured, neither madest it grow; which came up in a night, and perished in a night:",
  '4:11': "And should not I spare Nineveh, that great city, wherein are more than sixscore thousand persons that cannot discern between their right hand and their left hand; and also much cattle?",
};

export const jonah = scripture('Jonah', VERSES);

/**
 * Who speaks, as the cards name them: what is said is shown under the speaker's name, in place of the verse's own
 * "And he said unto them". These names are the only words on those cards that are not the verse's (tools/excerpts.mjs
 * lists, for each, the words the name stands in place of).
 */
export const SPEAKERS = {
  lord: 'The LORD',
  shipmaster: 'The shipmaster',
  mariners: 'The mariners',
  jonah: 'Jonah',
  king: 'The king of Nineveh',
};
const { lord, shipmaster, mariners, king } = SPEAKERS;

/** The verses that are, whole, what one of them says: shown whole, under the name. */
export const SAID = {
  '1:2': lord,
  '2:4': SPEAKERS.jonah,
  '2:7': SPEAKERS.jonah,
  '2:9': SPEAKERS.jonah,
  '3:2': lord,
  '3:8': king,
  '3:9': king,
  '4:11': lord,
};

/**
 * Parts of verses, where the story shows less than the whole: the verse's own words, in order, with "…" where words
 * are left out. One with `who` is what that one says, shown under their name: the words that only tell who speaks
 * are left off, and no "…" marks it, since the name does. tools/excerpts.mjs checks every one against the verse.
 */
export const EXCERPTS = {
  // he flees (1:3), a part at a time, as he does it
  '1:3-a': { verse: '1:3', text: 'But Jonah rose up to flee unto Tarshish from the presence of the LORD, and went down to Joppa …' },
  '1:3-b': { verse: '1:3', text: '… and he found a ship going to Tarshish …' },
  '1:3-c': { verse: '1:3', text: '… so he paid the fare thereof …' },
  '1:3-d': { verse: '1:3', text: '… and went down into it, to go with them unto Tarshish from the presence of the LORD.' },
  // the tempest (1:5–6)
  '1:5-a': { verse: '1:5', text: 'Then the mariners were afraid, and cried every man unto his god …' },
  '1:5-b': { verse: '1:5', text: '… and cast forth the wares that were in the ship into the sea, to lighten it of them. …' },
  '1:5-c': { verse: '1:5', text: '… But Jonah was gone down into the sides of the ship; and he lay, and was fast asleep.' },
  '1:6-said': { verse: '1:6', who: shipmaster, text: 'What meanest thou, O sleeper? arise, call upon thy God, if so be that God will think upon us, that we perish not.' },
  // the lots, and what they ask him (1:7–12)
  '1:7-said': { verse: '1:7', who: mariners, text: 'Come, and let us cast lots, that we may know for whose cause this evil is upon us.' },
  '1:7-b': { verse: '1:7', text: '… So they cast lots, and the lot fell upon Jonah.' },
  '1:8-said': { verse: '1:8', who: mariners, text: 'Tell us, we pray thee, for whose cause this evil is upon us; What is thine occupation? and whence comest thou? what is thy country? and of what people art thou?' },
  '1:9-said': { verse: '1:9', who: SPEAKERS.jonah, text: 'I am an Hebrew; and I fear the LORD, the God of heaven, which hath made the sea and the dry land.' },
  '1:10-said': { verse: '1:10', who: mariners, text: 'Why hast thou done this?' },
  '1:11-said': { verse: '1:11', who: mariners, text: 'What shall we do unto thee, that the sea may be calm unto us?' },
  '1:12-said': { verse: '1:12', who: SPEAKERS.jonah, text: 'Take me up, and cast me forth into the sea; so shall the sea be calm unto you: for I know that for my sake this great tempest is upon you.' },
  // they row, and cannot (1:13); they cry unto the LORD (1:14); the sea ceases (1:15)
  '1:13-a': { verse: '1:13', text: 'Nevertheless the men rowed hard to bring it to the land …' },
  '1:13-b': { verse: '1:13', text: '… but they could not: for the sea wrought, and was tempestuous against them.' },
  '1:14-said': { verse: '1:14', who: mariners, text: 'We beseech thee, O LORD, we beseech thee, let us not perish for this man’s life, and lay not upon us innocent blood: for thou, O LORD, hast done as it pleased thee.' },
  '1:15-a': { verse: '1:15', text: 'So they took up Jonah, and cast him forth into the sea …' },
  '1:15-b': { verse: '1:15', text: '… and the sea ceased from her raging.' },
  // the great fish (1:17), and his prayer out of it (2:2)
  '1:17-a': { verse: '1:17', text: 'Now the LORD had prepared a great fish to swallow up Jonah. …' },
  '1:17-b': { verse: '1:17', text: '… And Jonah was in the belly of the fish three days and three nights.' },
  '2:2-said': { verse: '2:2', who: SPEAKERS.jonah, text: 'I cried by reason of mine affliction unto the LORD, and he heard me; out of the belly of hell cried I, and thou heardest my voice.' },
  // Nineveh (3:3–7)
  '3:3-a': { verse: '3:3', text: 'So Jonah arose, and went unto Nineveh, according to the word of the LORD. …' },
  '3:3-b': { verse: '3:3', text: '… Now Nineveh was an exceeding great city of three days’ journey.' },
  '3:4-a': { verse: '3:4', text: 'And Jonah began to enter into the city a day’s journey, and he cried …' },
  '3:4-said': { verse: '3:4', who: SPEAKERS.jonah, text: 'Yet forty days, and Nineveh shall be overthrown.' },
  // what the people did (3:5), a part at a time, as each place hears him
  '3:5-a': { verse: '3:5', text: 'So the people of Nineveh believed God …' },
  '3:5-b': { verse: '3:5', text: '… and proclaimed a fast …' },
  '3:5-c': { verse: '3:5', text: '… and put on sackcloth …' },
  '3:5-d': { verse: '3:5', text: '… from the greatest of them even to the least of them.' },
  '3:6-a': { verse: '3:6', text: 'For word came unto the king of Nineveh, and he arose from his throne …' },
  '3:6-b': { verse: '3:6', text: '… and he laid his robe from him, and covered him with sackcloth, and sat in ashes.' },
  '3:7-a': { verse: '3:7', text: 'And he caused it to be proclaimed and published through Nineveh by the decree of the king and his nobles …' },
  // the booth and the gourd (4:2–10)
  '4:2-said': { verse: '4:2', who: SPEAKERS.jonah, text: 'I pray thee, O LORD, was not this my saying, when I was yet in my country? Therefore I fled before unto Tarshish: for I knew that thou art a gracious God, and merciful, slow to anger, and of great kindness, and repentest thee of the evil.' },
  '4:4-said': { verse: '4:4', who: lord, text: 'Doest thou well to be angry?' },
  '4:5-a': { verse: '4:5', text: 'So Jonah went out of the city, and sat on the east side of the city …' },
  '4:5-b': { verse: '4:5', text: '… and there made him a booth …' },
  '4:5-c': { verse: '4:5', text: '… and sat under it in the shadow, till he might see what would become of the city.' },
  '4:6-a': { verse: '4:6', text: 'And the LORD God prepared a gourd, and made it to come up over Jonah, that it might be a shadow over his head, to deliver him from his grief. …' },
  '4:6-b': { verse: '4:6', text: '… So Jonah was exceeding glad of the gourd.' },
  '4:8-a': { verse: '4:8', text: 'And it came to pass, when the sun did arise, that God prepared a vehement east wind; and the sun beat upon the head of Jonah, that he fainted …' },
  '4:9-said': { verse: '4:9', who: lord, text: 'Doest thou well to be angry for the gourd?' },
  '4:9-answer': { verse: '4:9', who: SPEAKERS.jonah, text: 'I do well to be angry, even unto death.' },
  '4:10-said': { verse: '4:10', who: lord, text: 'Thou hast had pity on the gourd, for the which thou hast not laboured, neither madest it grow; which came up in a night, and perished in a night:' },
};
for (const [key, e] of Object.entries(EXCERPTS)) e.voice = `Jonah ${key} cut`;

/**
 * Verses with a word left out, to be filled in from three (shortened with "…" where they are long). The right answer
 * is the word that was there; tools/excerpts.mjs checks that, put back, it is the verse's own words. The verse is
 * then read whole: or, where the verse begins by telling who speaks, the part of it that is said (`said`).
 */
export const BLANKS = {
  presence: { verse: '1:3', text: 'But Jonah rose up to flee unto Tarshish from the _____ of the LORD, and went down to Joppa …', answers: ['presence', 'people', 'anger'], right: 0 },
  sea: { verse: '1:9', who: SPEAKERS.jonah, said: '1:9-said', text: 'I am an Hebrew; and I fear the LORD, the God of heaven, which hath made the _____ and the dry land.', answers: ['ship', 'sea', 'storm'], right: 1 },
  temple: { verse: '2:4', who: SPEAKERS.jonah, text: 'Then I said, I am cast out of thy sight; yet I will look again toward thy holy _____.', answers: ['city', 'mountain', 'temple'], right: 2 },
  believed: { verse: '3:5', text: 'So the people of Nineveh _____ God, and proclaimed a fast, and put on sackcloth …', answers: ['believed', 'mocked', 'fled'], right: 0 },
  anger: { verse: '4:2', who: SPEAKERS.jonah, said: '4:2-said', text: '… for I knew that thou art a gracious God, and merciful, slow to _____, and of great kindness …', answers: ['hear', 'anger', 'speak'], right: 1 },
};
