import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWorkspaceAliases } from '../vitest.workspace-aliases';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const aliases = getWorkspaceAliases();
const srcDir = path.resolve(__dirname, '../apps/platform-api/src');

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: [
      ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement })),
      { find: '@platform-api', replacement: srcDir },
      { find: '@/', replacement: srcDir + '/' },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/platform-api/**/*.spec.ts', 'tests/packages/config/**/*.test.ts'],
    setupFiles: ['tests/platform-api/setup.ts'],
  },
});
