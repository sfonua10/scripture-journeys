// Quoting scripture: every quote is taken from the generated table, never typed. A part of a verse is cut out of
// the verse by its first and last words, and the cut fails loudly if those words are not in the text.
import { JONAH, OTHER } from './scripture';

export interface Quote {
  text: string;
  /** How it is cited on the card: "Jonah 1:4". */
  ref: string;
}

/** A whole verse. '1:4' is Jonah 1:4; 'Psalm 139:7' is from another book. */
export function cite(ref: string): Quote {
  if (/^\d+:\d+$/.test(ref)) {
    const text = JONAH[ref];
    if (!text) throw new Error(`no such verse: Jonah ${ref}`);
    return { text, ref: `Jonah ${ref}` };
  }
  const text = OTHER[ref];
  if (!text) throw new Error(`no such verse: ${ref}`);
  return { text, ref };
}

/** Several verses run together (same book and chapter): '2:3', '2:4' → "Jonah 2:3–4". */
export function citeRange(first: string, last: string): Quote {
  const a = cite(first);
  const m1 = first.match(/^(.*?)(\d+):(\d+)$/)!;
  const m2 = last.match(/^(.*?)(\d+):(\d+)$/)!;
  const parts: string[] = [];
  for (let v = Number(m1[3]); v <= Number(m2[3]); v++) parts.push(cite(`${m1[1]}${m1[2]}:${v}`).text);
  return { text: parts.join(' '), ref: `${a.ref}–${m2[3]}` };
}

/**
 * Part of a verse, from the words `from` through the words `to` (both kept). Either may be left out to run from
 * the verse's start or to its end.
 */
export function part(ref: string, from?: string, to?: string): Quote {
  const q = cite(ref);
  let start = 0;
  let end = q.text.length;
  if (from) {
    start = q.text.indexOf(from);
    if (start < 0) throw new Error(`"${from}" is not in ${q.ref}`);
  }
  if (to) {
    const i = q.text.indexOf(to, start);
    if (i < 0) throw new Error(`"${to}" is not in ${q.ref}`);
    end = i + to.length;
  }
  let text = q.text.slice(start, end).trim();
  // a cut that begins mid-sentence starts with a capital, as a quotation does
  if (start > 0) text = text.charAt(0).toUpperCase() + text.slice(1);
  // and one that stops at a comma or colon ends cleanly
  text = text.replace(/[,;:]$/, '');
  return { text, ref: q.ref };
}
