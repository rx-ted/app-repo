import { test, expect } from '../../../fixtures/test';

test.use({ storageState: undefined });

test.describe('Forgot Password Page - 核心业务流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('正常渲染找回密码页面', async ({ page }) => {
    await expect(page.locator('.forgot-shell')).toBeVisible({ timeout: 10000 });
  });

  test('发送验证码流程', async ({ page }) => {
    await page.locator('input[placeholder*="email" i]').fill('user@example.com');
    await page.locator('button:has-text("Send Code")').click();
    await page.waitForTimeout(500);
    await expect(page.locator('.notice')).toBeVisible({
      timeout: 10000,
    });
  });

  test('重置密码完整流程', async ({ page }) => {
    await page.locator('input[placeholder*="email" i]').fill('user@example.com');
    await page.locator('input').nth(1).fill('123456');
    await page.locator('input[placeholder*="password" i]').first().fill('NewPass123!');
    await page.locator('input[placeholder*="password" i]').last().fill('NewPass123!');
    await page
      .locator('button')
      .filter({ hasText: /Reset Password|submit|重设密码/i })
      .click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Forgot Password Page - 异常与边界', () => {
  test('密码不匹配时显示错误 @smoke', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[placeholder*="email" i]').fill('user@example.com');
    await page.locator('input').nth(1).fill('123456');
    await page.locator('input[placeholder*="password" i]').first().fill('Pass1');
    await page.locator('input[placeholder*="password" i]').last().fill('Pass2');
    await page
      .locator('button')
      .filter({ hasText: /Reset Password|submit|重设密码/i })
      .click();
    await expect(page.locator('.notice')).toBeVisible({ timeout: 5000 });
  });

  test('发送验证码失败时显示错误 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/auth/email/send-code');
    await page.route('**/api/v1/auth/email/send-code', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 429,
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests',
        }),
      });
    });
    await page.goto('/forgot-password');
    await page.locator('input[placeholder*="email" i]').fill('user@example.com');
    await page.locator('button:has-text("Send Code")').click();
    await expect(page.locator('.notice')).toBeVisible({ timeout: 10000 });
  });

  test('不输入邮箱时发送验证码按钮禁用 @smoke', async ({ page }) => {
    await page.goto('/forgot-password');
    const sendCodeBtn = page.locator('button:has-text("Send Code")');
    await expect(sendCodeBtn).toBeDisabled();
  });
});

test.describe('Forgot Password Page - UI与导航', () => {
  test('返回登录链接', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('返回首页链接', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('a[href="/"]').first()).toBeVisible();
  });
});
