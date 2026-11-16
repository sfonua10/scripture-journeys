import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three', '@dimforge/rapier3d-compat'] },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4000,
  },
  server: { host: '127.0.0.1', port: 5390, strictPort: true },
});
