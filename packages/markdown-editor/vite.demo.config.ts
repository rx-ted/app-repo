import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dev server (`pnpm demo`) and the production demo build (`pnpm build`, which
// emits dist/demo) both run from the monorepo, so the demo imports resolve to
// ../src via relative paths. The published package ships the prebuilt demo in
// dist/demo, so no vite tooling needs to be installed by consumers.
export default defineConfig({
  plugins: [vue()],
  base: './',
  root: resolve(__dirname, 'demo'),
  server: {
    port: 5179,
  },
  build: {
    outDir: resolve(__dirname, 'dist/demo'),
  },
});
