import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      ...getWorkspaceAliases(),
      'cloudflare:workers': resolve(__dirname, '__mocks__/cloudflare-workers.ts'),
      '@': resolve(__dirname, 'src'),
    },
  },
});
