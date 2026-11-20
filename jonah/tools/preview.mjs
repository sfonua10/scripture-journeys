// Serves the built game (dist/) the way Patch's game host serves it, to open in a browser.
//   npm run build && node tools/preview.mjs        (PORT=9000 to choose the port; default 8080)
import { serveDist } from './lib.mjs';

const { url } = await serveDist(Number(process.env.PORT) || 8080);
console.log(url);
