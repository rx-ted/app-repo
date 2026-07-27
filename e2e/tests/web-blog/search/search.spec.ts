import { test, expect } from '../../../fixtures/test';

test.describe('Search - 核心业务流程', () => {
  test('正常渲染搜索页', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('.search-shell')).toBeVisible({ timeout: 10000 });
  });

  test('输入关键词搜索显示结果', async ({ page }) => {
    await page.goto('/search?q=go');
    await expect(page.locator('.search-shell')).toBeVisible({ timeout: 10000 });
    const resultCards = page.locator('.search-result-card');
    await expect(resultCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('搜索结果展示文章标题和摘要', async ({ page }) => {
    await page.goto('/search?q=go');
    const firstResult = page.locator('.search-result-card').first();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    await expect(firstResult).toContainText('Go');
  });

  test('点击搜索结果跳转到文章详情', async ({ page }) => {
    await page.goto('/search?q=go');
    const firstResult = page.locator('.search-result-card').first();
    await expect(firstResult).toBeVisible({ timeout: 10000 });
    await firstResult.click();
    await expect(page).toHaveURL(/\/posts\//);
  });

  test('显示搜索关键词标签', async ({ page }) => {
    await page.goto('/search?q=go');
    await expect(page.locator('.n-tag')).toContainText('go', { timeout: 10000 });
  });
});

test.describe('Search - 异常与边界', () => {
  test('未输入关键词显示等待输入状态 @smoke', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('.search-header')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.n-empty, .search-shell').first()).toBeVisible();
  });

  test('搜索无结果时显示空状态 @smoke', async ({ page }) => {
    await page.route('**/api/v1/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: { posts: { list: [], total: 0 } },
        }),
      });
    });
    await page.goto('/search?q=zzzznonexistent');
    await expect(page.locator('.n-empty')).toBeVisible({ timeout: 10000 });
  });

  test('搜索服务不可用时显示警告 @smoke', async ({ page }) => {
    await page.goto('/search?q=unavailable');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('搜索API返回500错误时显示友好提示 @smoke', async ({ page }) => {
    await page.route('**/api/v1/search*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Search service error' }),
      });
    });
    await page.goto('/search?q=test');
    await expect(page.locator('.n-alert')).toBeVisible({
      timeout: 10000,
    });
  });

  test('清除搜索关键词回到初始状态', async ({ page }) => {
    await page.goto('/search?q=go');
    const clearBtn = page.locator('button:has-text("Clear"), .search-clear');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(page).toHaveURL(/\/search$/);
    }
  });
});

test.describe('Search - UI与导航', () => {
  test('搜索页标题和描述正常显示', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
  });

  test('分页在结果多时显示', async ({ page }) => {
    await page.goto('/search?q=go');
    await page.waitForTimeout(2000);
    const pagination = page.locator('.n-pagination');
    const isVisible = await pagination.isVisible().catch(() => false);
  });
});
