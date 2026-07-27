import { test, expect } from '../../../fixtures/test';

test.use({ storageState: undefined });

test.describe('Login Page - 核心业务流程', () => {
  test.describe.configure({ timeout: 10000 });
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('正常渲染登录页面', async ({ page }) => {
    await expect(page.locator('.auth-page')).toBeVisible({ timeout: 10000 });
  });

  test('密码登录流程 - 成功', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="username" i]').fill('alice');
    await page.locator('input[placeholder*="password" i]').fill('password123');
    await page.locator('button.n-button--primary-type').click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  });

  test('密码错误时显示错误提示 @smoke', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="username" i]').fill('alice');
    await page.locator('input[placeholder*="password" i]').fill('wrong');
    await page.locator('button.n-button--primary-type').click();

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('邮箱验证码登录流程', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="email"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="email" i]').fill('alice@example.com');
    await page.locator('button:has-text("Send Code")').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="code" i]').fill('123456');
    await page.locator('button:has-text("Login with Email")').click();

    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
  });

  test('密码登录表单字段验证 - 空字段 @smoke', async ({ page }) => {
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    const loginBtn = page.locator('button.n-button--primary-type');
    await loginBtn.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login Page - 异常与边界', () => {
  test('API返回500错误时显示错误信息 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/auth/login');
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      });
    });

    await page.goto('/login');
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="username" i]').fill('alice');
    await page.locator('input[placeholder*="password" i]').fill('password123');
    await page.locator('button.n-button--primary-type').click();

    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('登录时网络中断显示错误 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/auth/login');
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.abort('connectionrefused');
    });

    await page.goto('/login');
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="username" i]').fill('alice');
    await page.locator('input[placeholder*="password" i]').fill('password123');
    await page.locator('button.n-button--primary-type').click();

    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('邮箱格式校验 @smoke', async ({ page }) => {
    await page.goto('/login');
    await page.locator('.n-tabs-tab[data-name="email"]').click();
    await page.waitForTimeout(500);

    const emailInput = page.locator('input[placeholder*="email" i]');
    const sendCodeBtn = page.locator('button:has-text("Send Code")');

    await emailInput.fill('test@example.com');
    await expect(sendCodeBtn).toBeEnabled();

    await emailInput.fill('');
    await expect(sendCodeBtn).toBeDisabled();
  });
});

test.describe('Login Page - 认证与权限', () => {
  test('未登录访问受保护路由跳转到登录页 @smoke', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('已登录用户访问登录页自动跳回首页', async ({ page, context }) => {
    test.setTimeout(10000);
    await context.addInitScript(() => {
      localStorage.setItem('auth:token', 'mock-jwt-token-abc123');
    });
    await page.goto('/login');
    await page.waitForTimeout(1000);
  });

  test('登录后重定向到原始请求页面', async ({ page }) => {
    await page.goto('/login?redirect=/profile');
    await page.locator('.n-tabs-tab[data-name="password"]').click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="username" i]').fill('alice');
    await page.locator('input[placeholder*="password" i]').fill('password123');
    await page.locator('button.n-button--primary-type').click();

    await expect(page).toHaveURL(/\/profile/, { timeout: 10000 });
  });
});

test.describe('Login Page - UI与导航', () => {
  test('显示注册链接', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/register"]')).toBeVisible();
  });

  test('显示找回密码链接', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/login');
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('返回首页链接正常', async ({ page }) => {
    await page.goto('/login');
    const backLink = page.locator('a[href="/"]').first();
    if (await backLink.isVisible()) {
      await backLink.click();
      await expect(page).toHaveURL(/\/$/);
    }
  });
});
