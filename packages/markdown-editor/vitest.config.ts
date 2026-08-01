import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      ...getWorkspaceAliases(),
    },
  },
  test: {
    environment: 'node',
    exclude: ['node_modules'],
  },
});
