import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(configDir, '..');

const port = Number(process.env.PLAYWRIGHT_PORT) || 5173;
const BASE_URL = `http://localhost:${port}`;
const withAuth = process.env.CI || process.env.E2E_AUTH === '1';

const projects = [];

if (withAuth) {
  projects.push({
    name: 'auth-setup',
    testDir: '.',
    testMatch: 'auth.setup.ts',
  });
}

projects.push({
  name: 'chromium',
  dependencies: withAuth ? ['auth-setup'] : [],
  use: {
    ...devices['Desktop Chrome'],
    ...(withAuth ? { storageState: '.auth/user.json' } : {}),
  },
});

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/platform-api/**', '**/packages/**'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,
  reporter: process.env.CI ? 'github' : [['list'], ['./reporters/failed-reporter.mjs']],
  timeout: 20000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects,

  webServer: {
    command: `http_proxy="" https_proxy="" all_proxy="" PLAYWRIGHT_PORT=${port} pnpm --filter @rx-ted/web-blog dev`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 10000,
    cwd: rootDir,
  },
});
