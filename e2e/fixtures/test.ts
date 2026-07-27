import { test as base } from '@playwright/test';
import { setupApiMocks } from '../mocks/data';

export type MockFixtures = {
  authenticated: boolean;
};

export const test = base.extend<MockFixtures>({
  authenticated: [false, { option: true }],

  page: async ({ page, authenticated }, use) => {
    await setupApiMocks(page, authenticated);
    await use(page);
  },
});

export { expect } from '@playwright/test';
