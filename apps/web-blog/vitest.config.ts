import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
      ...getWorkspaceAliases(),
    },
  },
  test: {
    exclude: ['e2e/**', '**/node_modules/**'],
    coverage: {
      thresholds: {
        statements: 45,
        branches: 35,
        functions: 35,
        lines: 45,
      },
    },
  },
});
