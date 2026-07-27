import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';

const __dirname = dirname(fileURLToPath(import.meta.url));

const aliases = { ...getWorkspaceAliases(), '@': resolve(__dirname, 'src') };

export default [
  {
    resolve: { alias: aliases },
    test: {
      name: 'unit',
      globals: true,
      environment: 'node',
      include: ['src/**/*.{test,spec}.ts', 'scripts/**/*.spec.ts'],
      exclude: [],
      coverage: {
        thresholds: {
          statements: 45,
          branches: 35,
          functions: 35,
          lines: 45,
        },
      },
    },
  },
];
