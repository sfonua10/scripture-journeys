// The launch film of "I Will Go and Do" (1 Nephi 3–4): what tools/clip.mjs takes, and in what order
// tools/clip-cut.mjs joins it. FRAMES=n in the environment takes only n frames of each, for a look.
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

export default {
  css: `
    #t-turn { display: none !important; }
    #clip-over { background: linear-gradient(rgba(14, 10, 6, 0.55), rgba(14, 10, 6, 0.82)); }
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
  `,
  wide: `
    #clip-cap { top: 6vh; }
    #clip-cap .t { font-size: 17px; }
    #clip-over .name { font-size: 54px; }
    #clip-over .journey { font-size: 28px; }
    #clip-over .ref { font-size: 17px; }
    #clip-over .free { font-size: 21px; }
    #clip-over .url { font-size: 22px; padding: 11px 22px 12px; }
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
    { name: 'end', beat: 'home', query: 'autoread=3.4', until: `clip.said('said-perished') >= 0`, delay: 100, frames: n(114), caption: null, overlay: END, css: '#g-card, #g-low, #t-stick, #t-run { display: none !important; }' },
  ],
};
