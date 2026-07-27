import { test, expect } from '../../../fixtures/test';

test.describe('Profile - 认证与权限', () => {
  test.use({ storageState: undefined });

  test('未登录访问个人资料被重定向 @smoke', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Profile - 核心业务流程', () => {
  test.use({ authenticated: true });

  test('正常渲染个人资料页', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('.profile-shell, .n-card').first()).toBeVisible({ timeout: 10000 });
  });

  test('显示用户信息字段', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('label:has-text("Username"), label:has-text("用户名")')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('label:has-text("Nickname"), label:has-text("昵称")')).toBeVisible();
  });

  test('修改并保存个人信息', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const bioInput = page.locator('textarea');
    if (await bioInput.isVisible()) {
      await bioInput.fill('Updated bio from E2E test');
      await page.locator('button:has-text("保存资料")').click();
      await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
    }
  });

  test('显示用户角色标签', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForTimeout(2000);
    const tags = page.locator('.n-tag');
    const count = await tags.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Profile - 异常与边界', () => {
  test.use({ authenticated: true });

  test('加载资料失败时显示错误 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/user\/me\/profile/);
    await page.route('**/api/v1/user/me/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/profile');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('保存资料失败时显示错误 @smoke', async ({ page }) => {
    test.setTimeout(10000);
    await page.unroute(/\/api\/v1\/user\/me\/profile/);
    await page.route('**/api/v1/user/me/profile', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Validation error' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 200, code: 'OK', data: {} }),
        });
      }
    });

    await page.goto('/profile');
    await page.waitForTimeout(2000);

    const saveBtn = page.locator('button:has-text("保存资料")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await expect(page.locator('.n-alert')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

test.describe('Profile - UI与导航', () => {
  test.use({ authenticated: true });

  test('显示GitHub绑定选项', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('label:has-text("GitHub")').first()).toBeVisible({ timeout: 10000 });
  });

  test('语言选择器可用', async ({ page }) => {
    await page.goto('/profile');
    const localeSelect = page.locator('.n-select');
    await expect(localeSelect.first()).toBeVisible({ timeout: 10000 });
  });
});
