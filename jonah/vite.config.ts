import { defineConfig } from 'vite';

// JONAH_PORT lets several checkouts (git worktrees) each run their own dev server.
const port = Number(process.env.JONAH_PORT) || 5390;

export default defineConfig({
  base: './',
  cacheDir: '.cache/vite',
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three', '@dimforge/rapier3d-compat'] },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4000,
  },
  server: { host: '127.0.0.1', port, strictPort: true },
});
