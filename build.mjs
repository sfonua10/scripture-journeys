// Builds the block's demo into dist/ (index.html at the top) with the files it loads and their licences:
// `npm install`, then `npm run build`.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME, hasPage, pageOf, STORIES } from './src/game/stories.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
execSync(`node "${path.join(here, 'node_modules/vite/bin/vite.js')}" build --config vite.config.mjs`, { cwd: here, stdio: 'inherit' });

const put = (from, to) => fs.cpSync(path.join(here, from), path.join(dist, to), { recursive: true });
put('LICENSE', 'LICENSE.txt');
put('LICENCE-NOTES.md', 'LICENCE-NOTES.md');

// The recordings that are here, so the demo asks for no others: the footsteps always, and the five ambiences
// only where someone has put them back (MISSING_ASSETS.md).
const audio = path.join(dist, 'audio');
fs.mkdirSync(audio, { recursive: true });
const sounds = fs.readdirSync(audio).filter((f) => f.endsWith('.ogg')).map((f) => f.slice(0, -4)).sort();
fs.writeFileSync(path.join(audio, 'manifest.json'), `${JSON.stringify(sounds)}\n`);
// The readings of the scripture (tools/narrate.mjs): their list is always there, empty where none has been made,
// so the game asks for it and is never told there is no such file.
const readings = path.join(audio, 'narration', 'manifest.json');
if (!fs.existsSync(readings)) {
  fs.mkdirSync(path.dirname(readings), { recursive: true });
  fs.writeFileSync(readings, '{}\n');
}
console.log(`readings: ${Object.keys(JSON.parse(fs.readFileSync(readings, 'utf8'))).length}`);
console.log(`sounds: ${sounds.join(', ') || 'none'}`);

// A page of its own for every journey that is listed (stories.js, pageOf): but-if-not/index.html. Where a link to it
// is posted, what is shown is read from the page without running it, so each has the journey's own name, what it is
// about and its own picture (public/og/<page>.jpg or .png; the game's own, og.jpg, until there is one). Whoever opens
// it is sent straight into the journey, past the list: gone on with from where they left it, if they had begun.
{
  const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const site = /<link rel="canonical" href="([^"]+)"/.exec(index)?.[1];
  if (!site) throw new Error('index.html has no canonical address to make the journeys\' pages from.');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /** How wide and high a picture is, read from its own first bytes (a JPEG's frame, a PNG's header). */
  const size = (file) => {
    const b = fs.readFileSync(file);
    if (b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
    for (let i = 2; i + 9 < b.length; ) {
      if (b[i] !== 0xff) return null;
      const mark = b[i + 1];
      if (mark >= 0xc0 && mark <= 0xcf && mark !== 0xc4 && mark !== 0xc8 && mark !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  };
  const made = [];
  for (const s of STORIES.filter(hasPage)) {
    const page = pageOf(s);
    const to = path.join(dist, page);
    if (fs.existsSync(to)) throw new Error(`A journey's page would be written over something else in dist: ${page}/`);
    const own = ['jpg', 'png'].map((ext) => `og/${page}.${ext}`).find((f) => fs.existsSync(path.join(dist, f)));
    const picture = own ?? 'og.jpg';
    const [wide, high] = size(path.join(dist, picture)) ?? [];
    const name = `${s.title} · ${s.ref}`;
    const about = `${s.blurb} A free painted walking game through the scriptures, in your browser. No download, no ads, no sign-in.`;
    const shown = own && s.shown ? `${s.title} (${s.ref}). ${s.shown}` : `${s.title} (${s.ref}), a journey in ${GAME.name}.`;
    const play = `../?story=${encodeURIComponent(s.id)}&go=continue`;
    fs.mkdirSync(to);
    fs.writeFileSync(
      path.join(to, 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${esc(name)} · ${esc(GAME.name)}</title>
    <meta name="description" content="${esc(about)}" />
    <link rel="canonical" href="${esc(site)}${page}/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${esc(GAME.name)}" />
    <meta property="og:title" content="${esc(name)}" />
    <meta property="og:description" content="${esc(about)}" />
    <meta property="og:url" content="${esc(site)}${page}/" />
    <meta property="og:image" content="${esc(site)}${picture}" />${wide ? `\n    <meta property="og:image:width" content="${wide}" />\n    <meta property="og:image:height" content="${high}" />` : ''}
    <meta property="og:image:alt" content="${esc(shown)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${esc(site)}${picture}" />
    <link rel="icon" type="image/png" sizes="32x32" href="../icon-32.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="../icon-192.png" />
    <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
    <style>
      html { background: #17120c; color: #f4ead6; font: 18px/1.5 Georgia, 'Times New Roman', serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; text-align: center; }
      a { color: #e3bd6d; }
    </style>
    <script>
      // straight into the journey, with whatever the address was marked with (where the link was posted) kept
      {
        const to = new URL(${JSON.stringify(play)}, location.href);
        for (const [k, v] of new URLSearchParams(location.search)) if (!to.searchParams.has(k)) to.searchParams.set(k, v);
        location.replace(to);
      }
    </script>
  </head>
  <body>
    <p><a href="${esc(play)}">Play ${esc(s.title)} (${esc(s.ref)})</a></p>
  </body>
</html>
`,
    );
    made.push(`${page}/ (${own ?? 'og.jpg: no picture of its own yet'})`);
  }
  console.log(`pages: ${made.join(', ')}`);
}

let bytes = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else bytes += fs.statSync(p).size;
  }
};
walk(dist);
console.log(`dist: ${(bytes / 1048576).toFixed(1)} MB`);
