import { defineConfig } from 'vitest/config';
import { getWorkspaceAliases } from '../../../vitest.workspace-aliases.ts';

export default defineConfig({
  resolve: {
    alias: getWorkspaceAliases(),
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**'],
  },
});
