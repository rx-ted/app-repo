import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.resolve(dirname, '.auth/user.json');
const usersFile = path.resolve(dirname, './test-users.json');

type TestUser = {
  username: string;
  password: string;
  email: string;
};

function loadTestUser(): TestUser {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  } catch {
    return { username: 'alice', password: 'password123', email: 'alice@example.com' };
  }
}

setup('authenticate with test user', async ({ page }) => {
  const user = loadTestUser();
  const fsDir = path.dirname(authFile);
  if (!fs.existsSync(fsDir)) {
    fs.mkdirSync(fsDir, { recursive: true });
  }

  await page.goto('/login');
  await page.locator('.n-tabs-tab[data-name="password"]').click();
  await page.waitForTimeout(500);

  await page.locator('input[placeholder*="username" i]').fill(user.username);
  await page.locator('input[placeholder*="password" i]').fill(user.password);
  await page.locator('button.n-button--primary-type').click();

  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
