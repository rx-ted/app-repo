import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  root: resolve(__dirname, 'demo'),
  server: {
    port: 5179,
  },
  resolve: {
    alias: {
      '@rx-ted/packages-markdown-editor': resolve(__dirname, 'src/index.ts'),
    },
  },
});
