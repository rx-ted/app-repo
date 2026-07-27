import { test, expect } from '../../../fixtures/test';

test.use({ storageState: undefined });

test.describe('Register Page - 核心业务流程', () => {
  test.describe.configure({ timeout: 10000 });
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('正常渲染注册页面', async ({ page }) => {
    await expect(page.locator('.auth-page')).toBeVisible({ timeout: 10000 });
  });

  test('密码注册流程', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="6-50"]').fill('newuser');
    await page.locator('input[type="password"]').first().fill('SecurePass123!');
    await page.locator('input[type="password"]').last().fill('SecurePass123!');
    await page.locator('button:has-text("Register")').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('邮箱验证码注册流程', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="email"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="email" i]').fill('newuser@example.com');
    await page.locator('button:has-text("Send Code")').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="code" i]').fill('123456');
    await page.locator('input[placeholder*="username" i]').fill('newuser');
    await page.locator('button:has-text("Register")').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});

test.describe('Register Page - 异常与边界', () => {
  test('密码不匹配时显示错误提示 @smoke', async ({ page }) => {
    await page.goto('/register');
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);
    await page.locator('input[type="password"]').first().fill('Password1');
    await page.locator('input[type="password"]').last().fill('Password2');
    await page.locator('button:has-text("Register")').click();
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('注册失败时显示服务端错误 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/auth/register');
    await page.route(/\/api\/v1\/auth\/register/, async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Username already taken',
        }),
      });
    });
    await page.goto('/register');
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="6-50"]').fill('existing_user');
    await page.locator('input[type="password"]').first().fill('SecurePass123!');
    await page.locator('input[type="password"]').last().fill('SecurePass123!');
    await page.locator('button:has-text("Register")').click();
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('发送验证码时邮箱无效返回错误 @smoke', async ({ page }) => {
    await page.goto('/register');
    await page.locator('.n-tabs-tab:has-text("Email")').click();
    await page.waitForTimeout(500);
    await page.locator('input[placeholder*="email" i]').fill('invalid@test.com');
    await page.locator('button:has-text("Send Code")').click();
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Register Page - UI与导航', () => {
  test('显示返回首页链接', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('显示已有账号登录链接', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });
});
