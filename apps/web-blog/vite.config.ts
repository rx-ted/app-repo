import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: Number(process.env.PLAYWRIGHT_PORT) || 8080,
    strictPort: !!process.env.PLAYWRIGHT_PORT,
    proxy: {
      '/api/v1': {
        target: process.env.VITE_DEV_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  plugins: [vue(), vueDevTools()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *; @use "@/styles/mixins.scss" as *;`,
      },
    },
  },
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      ...getWorkspaceAliases(),
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (
            id.includes('node_modules/vue') ||
            id.includes('node_modules/pinia') ||
            id.includes('node_modules/vue-router')
          )
            return 'vendor-vue';
          if (id.includes('node_modules/naive-ui')) return 'vendor-ui';
          if (
            id.includes('node_modules/markdown-it') ||
            id.includes('node_modules/highlight.js') ||
            id.includes('node_modules/dompurify')
          )
            return 'vendor-markdown';
        },
      },
    },
  },
});
