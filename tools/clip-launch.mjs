// The launch film of "I Will Go and Do" (1 Nephi 3–4): what tools/clip.mjs takes, and in what order
// tools/clip-cut.mjs joins it. FRAMES=n in the environment takes only n frames of each, for a look.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const short = process.env.FRAMES ? Number(process.env.FRAMES) : 0;
const n = (frames) => short || frames;
const quiet = '#g-objective { display: none !important; }';

const END = /* html */ `
<div class="end">
  <div class="name">Scripture Journeys</div>
  <div class="rule"></div>
  <div class="journey">I Will Go and Do</div>
  <div class="ref">1 Nephi 3–4</div>
  <div class="free"><span>Free · Plays in your browser</span><i> · </i><span>No download · No ads · No sign-in</span></div>
  <div class="url">sfonua10.github.io/scripture-journeys</div>
</div>`;

// The last card as a picture, where there are the two of them: the game's title art, wide and tall (CLIP_ART names
// their folder), each with a mask beside it, solid where its letters are and clear elsewhere, so that the light
// that crosses it touches only the words. Where the words and the Play Now button lie in each is given below, in
// hundredths of the picture (the `tall` and `wide` CSS).
const ART = process.env.CLIP_ART ?? join(homedir(), 'Desktop', 'scripture-journeys-launch', 'art');
const data = (file, type) => `url(data:${type};base64,${readFileSync(join(ART, file)).toString('base64')})`;
const FILES = ['book-of-mormon-play.jpg', 'title-mask.png', 'book-of-mormon-play-tall.jpg', 'title-mask-tall.png'];
const PICTURE = FILES.every((f) => existsSync(join(ART, f)))
  ? /* html */ `
<div class="art" style="--art-wide: ${data(FILES[0], 'image/jpeg')}; --mask-wide: ${data(FILES[1], 'image/png')}; --art-tall: ${data(FILES[2], 'image/jpeg')}; --mask-tall: ${data(FILES[3], 'image/png')}">
  <div class="pic"><div class="zoom">
    <div class="bloom"></div><div class="shine"></div>
    <div class="btn"><i></i></div>
    <b class="star s1"></b><b class="star s2"></b><b class="star s3"></b>
  </div></div>
  <div class="more"><span class="free">Free · Plays in your browser</span><span class="url">sfonua10.github.io/scripture-journeys</span></div>
</div>`
  : null;
// what moves on it, frame by frame: it draws slowly nearer; a light crosses the words, with three sparks after it;
// then a glint crosses the button, which goes on glowing and fading
const PICTURE_EACH = `
  const o = document.getElementById('clip-over').style;
  const cl = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => x * x * (3 - 2 * x);
  const spark = (from) => Math.sin(Math.PI * cl((i - from) / 16)).toFixed(3);
  o.setProperty('--z', (1.03 + 0.05 * i / 114).toFixed(4));
  const s1 = cl((i - 18) / 42);
  o.setProperty('--e1', ease(s1).toFixed(4));
  o.setProperty('--a1', s1 > 0 && s1 < 1 ? '1' : '0');
  o.setProperty('--k1', spark(46));
  o.setProperty('--k2', spark(26));
  o.setProperty('--k3', spark(54));
  o.setProperty('--p2', (-25 + 150 * cl((i - 62) / 22)).toFixed(1) + '%');
  o.setProperty('--g', (i < 58 ? 0 : cl((i - 58) / 10) * (0.45 + 0.55 * (0.5 - 0.5 * Math.cos(((i - 68) / 30) * 2 * Math.PI)))).toFixed(3));
`;

export default {
  css: `
    #t-turn { display: none !important; }
    #clip-over { background: linear-gradient(rgba(14, 10, 6, 0.55), rgba(14, 10, 6, 0.82)); }
    #clip-over:has(.art) { background: #0e0a06; }
    #clip-over .art { position: absolute; inset: 0; overflow: hidden; }
    #clip-over .pic { position: absolute; overflow: hidden; }
    #clip-over .pic { inset: 0; }
    /* (how far across the light has come, and the same within the soft glow that goes with it) */
    #clip-over .zoom {
      position: absolute; inset: 0; background: var(--art) center / 100% 100%; transform: scale(var(--z, 1.03)); transform-origin: var(--towards);
      --p1: calc(var(--from) + var(--span) * var(--e1, 0)); --pb: calc((var(--p1) - var(--bl)) / var(--bw));
    }
    #clip-over .shine {
      position: absolute; inset: 0; opacity: var(--a1, 0); -webkit-mask: var(--mask) center / 100% 100% no-repeat; mask: var(--mask) center / 100% 100% no-repeat;
      background: linear-gradient(105deg, transparent calc(var(--p1) - 8%), rgba(255, 200, 96, 0.9) calc(var(--p1) - 3.5%), #fff calc(var(--p1) - 1%), #fff calc(var(--p1) + 1%), rgba(255, 200, 96, 0.9) calc(var(--p1) + 3.5%), transparent calc(var(--p1) + 8%));
    }
    #clip-over .bloom {
      position: absolute; opacity: calc(var(--a1, 0) * 0.5); mix-blend-mode: screen;
      -webkit-mask: radial-gradient(ellipse at center, #000 35%, transparent 72%); mask: radial-gradient(ellipse at center, #000 35%, transparent 72%);
      background: linear-gradient(105deg, transparent calc(var(--pb) - 22%), rgba(255, 244, 214, 0.75) var(--pb), transparent calc(var(--pb) + 22%));
    }
    #clip-over .btn {
      position: absolute; border-radius: 999px; overflow: hidden;
      box-shadow: 0 0 calc(var(--g, 0) * var(--u) * 1.5) calc(var(--g, 0) * var(--u) * 0.3) rgba(255, 214, 120, calc(var(--g, 0) * 0.9));
    }
    #clip-over .btn i { position: absolute; inset: 0; mix-blend-mode: screen; background: linear-gradient(105deg, transparent calc(var(--p2) - 16%), rgba(255, 250, 230, 0.8) var(--p2), transparent calc(var(--p2) + 16%)); }
    #clip-over .star {
      position: absolute; width: calc(var(--u) * 2.4); aspect-ratio: 1; opacity: var(--k, 0); transform: translate(-50%, -50%) scale(var(--k, 0)) rotate(12deg);
      background: linear-gradient(#fff, #fff) center / 100% 7% no-repeat, linear-gradient(#fff, #fff) center / 7% 100% no-repeat, radial-gradient(circle, #fff 0 14%, rgba(255, 236, 180, 0.5) 15% 26%, transparent 27%);
      -webkit-mask: radial-gradient(circle, #000 12%, transparent 68%); mask: radial-gradient(circle, #000 12%, transparent 68%);
    }
    #clip-over .s1 { --k: var(--k1); }
    #clip-over .s2 { --k: var(--k2); }
    #clip-over .s3 { --k: var(--k3); }
    #clip-over .more { position: absolute; display: flex; align-items: center; color: #f4ead6; white-space: nowrap; }
    #clip-over .more .url { margin: 0; padding: 8px 15px 9px; border: 1px solid rgba(227, 189, 109, 0.7); border-radius: 999px; background: rgba(24, 17, 10, 0.82); color: #fff; }
    #clip-over .end { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; padding: 0 24px; }
    #clip-over .name { font-size: 34px; line-height: 1.15; }
    #clip-over .rule { width: 56px; height: 1px; background: #e3bd6d; margin: 16px auto 14px; }
    #clip-over .journey { font-size: 20px; font-style: italic; }
    #clip-over .ref { margin-top: 4px; font-size: 14px; letter-spacing: 0.1em; color: #e3bd6d; font-variant: small-caps; }
    #clip-over .free { margin-top: 22px; font-size: 16px; line-height: 1.55; }
    #clip-over .free i { font-style: normal; }
    #clip-over .url { display: inline-block; margin-top: 22px; padding: 9px 16px 10px; border: 1px solid rgba(227, 189, 109, 0.7); border-radius: 6px; font-size: 16px; color: #fff; }
  `,
  // (upright it is a phone: the hints say tap, and the stick and the Run button are seen)
  tallQuery: 'touch=1',
  // on a phone held upright the bottom fifth and the top tenth lie under the app's own buttons: keep words clear of them
  tall: `
    #g-card, #g-low { bottom: 19vh !important; }
    #g-objective { top: 12vh !important; }
    #clip-cap { top: 11.5vh; }
    #clip-over .free span { display: block; }
    #clip-over .free i { display: none; }
    /* upright: the tall picture, its words across the top and its button low; the address just over the button */
    #clip-over .art { --art: var(--art-tall); --mask: var(--mask-tall); }
    #clip-over .pic { --u: 13px; --towards: 50% 40%; --from: -14%; --span: 128%; --bl: 3%; --bw: 0.94; }
    #clip-over .bloom { left: 3%; top: 5.5%; width: 94%; height: 22%; }
    #clip-over .btn { left: 13.5%; top: 76.9%; width: 73.3%; height: 8.8%; }
    #clip-over .s1 { left: 94%; top: 7.8%; }
    #clip-over .s2 { left: 12%; top: 18.4%; }
    #clip-over .s3 { left: 90.5%; top: 21.6%; }
    #clip-over .more { left: 50%; top: 71.4%; transform: translateX(-50%); font-size: 13.5px; }
    #clip-over .more .free { display: none; }
    #clip-over .more .url { padding: 7px 14px 8px; }
    #clip-over .more .url::before { content: 'Free · '; color: #e3bd6d; }
  `,
  wide: `
    #clip-cap { top: 6vh; }
    #clip-cap .t { font-size: 17px; }
    #clip-over .name { font-size: 54px; }
    #clip-over .journey { font-size: 28px; }
    #clip-over .ref { font-size: 17px; }
    #clip-over .free { font-size: 21px; }
    #clip-over .url { font-size: 22px; padding: 11px 22px 12px; }
    /* wide, the picture is the whole of it, and the address lies low at its left */
    #clip-over .art { --art: var(--art-wide); --mask: var(--mask-wide); }
    #clip-over .pic { --u: 24px; --towards: 38% 46%; --from: -10%; --span: 86%; --bl: 2%; --bw: 0.6; }
    #clip-over .bloom { left: 2%; top: 5%; width: 60%; height: 48%; }
    #clip-over .btn { left: 15%; top: 51.1%; width: 28.7%; height: 11.1%; }
    #clip-over .s1 { left: 57.6%; top: 11.5%; }
    #clip-over .s2 { left: 5.2%; top: 31%; }
    #clip-over .s3 { left: 53%; top: 39.5%; }
    #clip-over .more { left: 3.2%; bottom: 5%; gap: 14px; font-size: 19px; padding: 0 0 0 18px; border-radius: 999px; background: rgba(24, 17, 10, 0.78); }
    #clip-over .more .url { font-size: 19px; padding: 9px 18px 10px; background: rgba(24, 17, 10, 0.4); }
  `,
  // music that runs on over a cut: from the start of one segment to the start of another (or to the end)
  tracks: [
    { stem: 'drum', from: 'chase', to: 'angel', gain: 0.7 },
    { stem: 'theme', from: 'end', to: null, gain: 0.85 },
  ],
  // The moments that catch the eye, in the order the story tells them: his answer to his father, the land of
  // Jerusalem, Laban, the chase, the angel, the light by night; and the title art to end on.
  segments: [
    { name: 'do', beat: 'a1', query: 'autoread=4', until: `clip.said('said-commandment') >= 0 && !!document.querySelector('#g-card.on .answer')`, delay: 78, frames: n(126), speak: 2.6, caption: { text: 'Playing as Nephi' }, css: quiet },
    { name: 'land', beat: 'a1-land', query: 'autoread=0.3', until: `true`, delay: 96, frames: n(90), caption: { text: 'Walk 1 Nephi 3–4 with your family' }, css: quiet },
    { name: 'laban', beat: 'a2-laban', query: 'autoread=4.6', until: `clip.said('said-seize') >= 0`, frames: n(129), caption: null, css: quiet },
    { name: 'chase', beat: 'a2-laban', query: 'autoread=0.3', until: `clip.said('said-run') >= 0`, frames: n(126), caption: null },
    // (the angel is seen, standing in his light; what he says is a long reading, and is left for the game)
    { name: 'angel', beat: 'a2-rock', query: 'autoread=3', until: `clip.heard('angel') >= 0`, frames: n(90), caption: null, voice: 0, css: '#g-card { display: none !important; }' },
    { name: 'night', beat: 'a3', query: 'autoread=0.3', until: `clip.heard('spirit') >= 0`, delay: 60, frames: n(99), caption: { text: 'By night, a light goes before you' }, css: quiet },
    { name: 'end', beat: 'home', query: 'autoread=3.4', until: `clip.said('said-perished') >= 0`, delay: 100, frames: n(114), caption: null, overlay: PICTURE ?? END, overlayIn: PICTURE ? 10 : 18, each: PICTURE ? PICTURE_EACH : null, css: '#g-card, #g-low, #t-stick, #t-run { display: none !important; }' },
  ],
};
