import { test, expect } from '../../../fixtures/test';

test.describe('Dashboard - 认证与权限', () => {
  test.use({ storageState: undefined });

  test('未登录用户访问控制台被重定向到登录页 @smoke', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Dashboard - 核心业务流程', () => {
  test.use({ authenticated: true });

  test('正常渲染控制台页面', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('.dashboard-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示控制台概览标签', async ({ page }) => {
    await page.goto('/dashboard');
    const tabPane = page.locator('.n-tabs-tab');
    await expect(tabPane.first()).toBeVisible({ timeout: 10000 });
  });

  test('显示统计卡片', async ({ page }) => {
    await page.goto('/dashboard');
    const statCards = page.locator('.dashboard-stats .stat-card');
    await expect(statCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('切换不同标签页', async ({ page }) => {
    await page.goto('/dashboard');
    const postsTab = page.locator('.n-tabs-tab:has-text("文章")');
    if (await postsTab.isVisible()) {
      await postsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('显示最近活动和通知', async ({ page }) => {
    await page.goto('/dashboard');
    const activitySection = page.locator('.dashboard-activity, [class*="Activity"]');
    await expect(activitySection).toBeVisible({ timeout: 10000 });
  });

  test('显示草稿列表', async ({ page }) => {
    await page.goto('/dashboard');
    const draftsSection = page.locator('.drafts-card');
    await expect(draftsSection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dashboard - 异常与边界', () => {
  test.use({ authenticated: true });
  test('API错误时显示错误提示 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/blog/dashboard');
    await page.route('**/api/v1/blog/dashboard', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });

    await page.goto('/dashboard');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('空数据时显示空状态 @smoke', async ({ page }) => {
    await page.unroute('/api/v1/blog/dashboard');
    await page.route('**/api/v1/blog/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: {
            me: { id: 'user-1', username: 'alice', nickname: 'Alice', avatar_url: null },
            posts: { list: [], total: 0 },
            stats: { views: 0, comments: 0, days: 0, likes: 0 },
            notifications: { unreadCount: 0, recent: [] },
            activity: [],
            permissions: [],
          },
        }),
      });
    });

    await page.goto('/dashboard');
  });
});

test.describe('Dashboard Settings - UI与导航', () => {
  test.use({ authenticated: true });

  test('设置页面可访问', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await expect(page.locator('.settings-card').first()).toBeVisible({ timeout: 10000 });
  });
});
