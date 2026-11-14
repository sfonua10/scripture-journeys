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

// The last card as a picture, where there is one: the game's title art (CLIP_ART names its folder), with
// title-mask.png beside it, solid where its letters are and clear elsewhere, so that the light that crosses it touches only the words.
// Where its parts lie is given in hundredths of the picture: the words, and the Play Now button.
const ART = process.env.CLIP_ART ?? join(homedir(), 'Desktop', 'scripture-journeys-launch', 'art');
const data = (file, type) => `data:${type};base64,${readFileSync(join(ART, file)).toString('base64')}`;
const PICTURE = existsSync(join(ART, 'book-of-mormon-play.jpg')) && existsSync(join(ART, 'title-mask.png'))
  ? /* html */ `
<div class="art" style="--art: url(${data('book-of-mormon-play.jpg', 'image/jpeg')}); --mask: url(${data('title-mask.png', 'image/png')})">
  <div class="bg"></div>
  <div class="pic"><div class="zoom">
    <div class="bloom"></div><div class="shine"></div>
    <div class="btn"><i></i></div>
    <b class="star" style="left: 57.6%; top: 11.5%; --k: var(--k1)"></b><b class="star" style="left: 5.2%; top: 31%; --k: var(--k2)"></b><b class="star" style="left: 53%; top: 39.5%; --k: var(--k3)"></b>
  </div></div>
  <div class="more"><span>Free · Plays in your browser</span><span class="url">sfonua10.github.io/scripture-journeys</span></div>
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
  const p1 = -10 + 86 * ease(s1);
  o.setProperty('--p1', p1.toFixed(2) + '%');
  o.setProperty('--pb', ((p1 - 2) / 0.6).toFixed(2) + '%');
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
    #clip-over .zoom { position: absolute; inset: 0; background: var(--art) center / 100% 100%; transform: scale(var(--z, 1.03)); transform-origin: 38% 46%; }
    #clip-over .shine {
      position: absolute; inset: 0; opacity: var(--a1, 0); -webkit-mask: var(--mask) center / 100% 100% no-repeat; mask: var(--mask) center / 100% 100% no-repeat;
      background: linear-gradient(105deg, transparent calc(var(--p1) - 8%), rgba(255, 200, 96, 0.9) calc(var(--p1) - 3.5%), #fff calc(var(--p1) - 1%), #fff calc(var(--p1) + 1%), rgba(255, 200, 96, 0.9) calc(var(--p1) + 3.5%), transparent calc(var(--p1) + 8%));
    }
    #clip-over .bloom {
      position: absolute; left: 2%; top: 5%; width: 60%; height: 48%; opacity: calc(var(--a1, 0) * 0.5); mix-blend-mode: screen;
      -webkit-mask: radial-gradient(ellipse at center, #000 35%, transparent 72%); mask: radial-gradient(ellipse at center, #000 35%, transparent 72%);
      background: linear-gradient(105deg, transparent calc(var(--pb) - 22%), rgba(255, 244, 214, 0.75) var(--pb), transparent calc(var(--pb) + 22%));
    }
    #clip-over .btn {
      position: absolute; left: 15%; top: 51.1%; width: 28.7%; height: 11.1%; border-radius: 999px; overflow: hidden;
      box-shadow: 0 0 calc(var(--g, 0) * var(--u) * 1.5) calc(var(--g, 0) * var(--u) * 0.3) rgba(255, 214, 120, calc(var(--g, 0) * 0.9));
    }
    #clip-over .btn i { position: absolute; inset: 0; mix-blend-mode: screen; background: linear-gradient(105deg, transparent calc(var(--p2) - 16%), rgba(255, 250, 230, 0.8) var(--p2), transparent calc(var(--p2) + 16%)); }
    #clip-over .star {
      position: absolute; width: calc(var(--u) * 2.4); aspect-ratio: 1; opacity: var(--k, 0); transform: translate(-50%, -50%) scale(var(--k, 0)) rotate(12deg);
      background: linear-gradient(#fff, #fff) center / 100% 7% no-repeat, linear-gradient(#fff, #fff) center / 7% 100% no-repeat, radial-gradient(circle, #fff 0 14%, rgba(255, 236, 180, 0.5) 15% 26%, transparent 27%);
      -webkit-mask: radial-gradient(circle, #000 12%, transparent 68%); mask: radial-gradient(circle, #000 12%, transparent 68%);
    }
    #clip-over .more { position: absolute; display: flex; align-items: center; color: #f4ead6; white-space: nowrap; }
    #clip-over .more .url { padding: 8px 15px 9px; border: 1px solid rgba(227, 189, 109, 0.7); border-radius: 999px; background: rgba(24, 17, 10, 0.82); color: #fff; }
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
    /* upright, the picture lies across the middle, on a blurred spread of the man in it, with the address under it */
    #clip-over .bg { position: absolute; inset: -8%; background: var(--art) 80% 50% / auto 100%; filter: blur(16px) brightness(0.62); }
    #clip-over .pic { left: 0; width: 100%; aspect-ratio: 1672 / 941; top: 27%; --u: 9px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45); }
    #clip-over .more { left: 0; right: 0; top: calc(27% + 100vw * 941 / 1672 + 26px); flex-direction: column; gap: 14px; font-size: 16px; }
    #clip-over .more .url { font-size: 15px; }
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
    #clip-over .bg { display: none; }
    #clip-over .pic { inset: 0; --u: 24px; }
    #clip-over .more { left: 3.2%; bottom: 5%; gap: 14px; font-size: 19px; padding: 0 0 0 18px; border-radius: 999px; background: rgba(24, 17, 10, 0.78); }
    #clip-over .more .url { font-size: 19px; padding: 9px 18px 10px; background: rgba(24, 17, 10, 0.4); }
  `,
  // music that runs on over a cut: from the start of one segment to the start of another (or to the end)
  tracks: [
    { stem: 'drum', from: 'chase', to: 'hard', gain: 0.7 },
    { stem: 'theme', from: 'home', to: null, gain: 0.85 },
  ],
  segments: [
    { name: 'laban', beat: 'a2-laban', query: 'autoread=4.6', until: `clip.said('said-seize') >= 0`, frames: n(129), caption: { text: 'Playing as Nephi' }, css: quiet },
    { name: 'chase', beat: 'a2-laban', query: 'autoread=0.3', until: `clip.said('said-run') >= 0`, frames: n(100), caption: null },
    { name: 'hard', beat: 'a1', query: 'autoread=3.8', until: `clip.said('said-hard') >= 0`, frames: n(108), caption: { text: 'Walk 1 Nephi 3–4 with your family' }, css: quiet },
    { name: 'do', beat: 'a1', query: 'autoread=4', until: `clip.said('said-commandment') >= 0 && !!document.querySelector('#g-card.on .answer')`, delay: 78, frames: n(126), speak: 2.6, caption: null, css: quiet },
    { name: 'night', beat: 'a3', query: 'autoread=0.3', until: `clip.heard('spirit') >= 0`, delay: 60, frames: n(96), caption: { text: 'By night, a light goes before you' }, css: quiet },
    { name: 'angel', beat: 'a2-rock', query: 'autoread=0.3', until: `clip.heard('angel') >= 0`, frames: n(64), caption: null },
    { name: 'home', beat: 'home', query: 'autoread=3.4', until: `clip.said('said-perished') >= 0`, frames: n(100), caption: null },
    { name: 'end', beat: 'home', query: 'autoread=3.4', until: `clip.said('said-perished') >= 0`, delay: 100, frames: n(114), caption: null, overlay: PICTURE ?? END, overlayIn: PICTURE ? 10 : 18, each: PICTURE ? PICTURE_EACH : null, css: '#g-card, #g-low, #t-stick, #t-run { display: none !important; }' },
  ],
};
