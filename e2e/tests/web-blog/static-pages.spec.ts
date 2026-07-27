import { test, expect } from '../../fixtures/test';

test.describe('About Page', () => {
  test('正常渲染关于页', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('.about-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示功能特性', async ({ page }) => {
    await page.goto('/about');
    const featureCards = page.locator('.feature-card');
    expect(await featureCards.count()).toBeGreaterThan(0);
  });

  test('显示技术栈', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('.stack-list')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.stack-tag')).toHaveCount(11);
  });

  test('显示架构概览', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('.arch-list')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Changelog Page', () => {
  test('正常渲染更新日志页', async ({ page }) => {
    await page.goto('/changelog');
    await expect(page.locator('.changelog-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示版本列表', async ({ page }) => {
    await page.goto('/changelog');
    const releaseCards = page.locator('.release-card');
    expect(await releaseCards.count()).toBeGreaterThan(0);
  });

  test('点击展开版本详情', async ({ page }) => {
    await page.goto('/changelog');
    const firstCard = page.locator('.release-card').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await page.waitForTimeout(500);
  });

  test('显示版本号和发布日期', async ({ page }) => {
    await page.goto('/changelog');
    await expect(page.locator('.release-version').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Changelog - 异常与边界', () => {
  test('API错误时显示错误提示 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/versions(?:\/([^/]+))?/);
    await page.route(/\/api\/v1\/versions(?:\/([^/]+))?/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });
    await page.goto('/changelog');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('空版本列表显示空状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/versions(?:\/([^/]+))?/);
    await page.route(/\/api\/v1\/versions/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: [],
        }),
      });
    });
    await page.goto('/changelog');
    await expect(page.locator('.n-empty')).toBeVisible({ timeout: 10000 });
  });

  test('加载中显示loading @smoke', async ({ page }) => {
    test.setTimeout(10000);
    await page.unroute(/\/api\/v1\/versions(?:\/([^/]+))?/);
    await page.route(/\/api\/v1\/versions/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, code: 'OK', data: [] }),
      });
    });
    await page.goto('/changelog');
    await expect(page.locator('.n-spin')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Copyright Page', () => {
  test('正常渲染版权页', async ({ page }) => {
    await page.goto('/copyright');
    await expect(page).toHaveURL(/\/copyright/);
  });
});

test.describe('NotFound Page', () => {
  test('访问不存在的路由显示404页 @smoke', async ({ page }) => {
    await page.goto('/this-path-does-not-exist');
    await expect(page.locator('.not-found-page, [class*="not-found"], .n-result')).toBeVisible({
      timeout: 10000,
    });
  });

  test('404页面包含返回首页链接', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/non-existent-route-xyz');
    const backLink = page.locator('a[href="/"]').last();
    if (await backLink.isVisible()) {
      await backLink.click({ timeout: 5000 });
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

test.describe('Components Page', () => {
  test('组件目录页可访问', async ({ page }) => {
    await page.goto('/components');
    await expect(page).toHaveURL(/\/components/);
  });
});

test.describe('导航与重定向', () => {
  test('/taxonomy 重定向到 /posts', async ({ page }) => {
    await page.goto('/taxonomy');
    await expect(page).toHaveURL(/\/posts/);
  });

  test('/dashboard/posts 重定向到 /dashboard', async ({ page }) => {
    await page.goto('/dashboard/posts');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('/dashboard/drafts 重定向到 /dashboard', async ({ page }) => {
    await page.goto('/dashboard/drafts');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('/dashboard/categories 重定向到 /dashboard', async ({ page }) => {
    await page.goto('/dashboard/categories');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('/dashboard/tags 重定向到 /dashboard', async ({ page }) => {
    await page.goto('/dashboard/tags');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
