import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { getWorkspaceAliases } from '../../vitest.workspace-aliases';
import devServer from '@hono/vite-dev-server';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envDir = resolve(__dirname, '../../');

export default defineConfig(({ mode }) => {
  const isDev = mode === 'dev';

  if (isDev) {
    const env = loadEnv(mode, envDir, '');
    Object.assign(process.env, env);
  }

  return {
    server: {
      port: 3000,
    },
    plugins: isDev
      ? [
          devServer({
            entry: 'src/index.ts',
            injectClientScript: true,
          }),
        ]
      : [],
    resolve: {
      alias: {
        ...(isDev ? getWorkspaceAliases() : {}),
        '@': resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['reflect-metadata'],
    },

    build: {
      ssr: 'src/index.ts',
      minify: 'esbuild',
      outDir: 'dist',
      ssrEmitAssets: false,
      sourcemap: false,
      rollupOptions: {
        external: [/^@rx-ted\//],
      },
    },
    ssr: {
      target: 'node',
      external: ['reflect-metadata'],
    },
    envDir,
    envPrefix: [],
  };
});
