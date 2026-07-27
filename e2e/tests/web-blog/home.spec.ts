import { test, expect } from '../../fixtures/test';

test.describe('Home Page - 核心业务流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('正常渲染整个首页', async ({ page }) => {
    await expect(page.locator('.home-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.section-title')).toContainText('最近发布');
    await expect(page.locator('.post-grid')).toBeVisible();
  });

  test('展示4个统计卡片并显示正确数据', async ({ page }) => {
    const statCards = page.locator('.nc-stat-value');
    await expect(statCards).toHaveCount(4);
    await expect(statCards.nth(0)).toContainText('42');
    await expect(statCards.nth(1)).toContainText('0');
    await expect(statCards.nth(2)).toContainText('12');
    await expect(statCards.nth(3)).toContainText('5');
  });

  test('展示推荐文章和最新文章', async ({ page }) => {
    const articleCards = page.locator('.article-card');
    const count = await articleCards.count();
    expect(count).toBeGreaterThan(0);

    const firstCard = articleCards.first();
    await expect(firstCard).toBeVisible();
  });

  test('未登录时显示游客提示', async ({ page }) => {
    await expect(page.locator('.guest-btn')).toBeVisible({ timeout: 10000 });
  });

  test('首页展示分页导航', async ({ page }) => {
    await expect(page.locator('.pagination-row')).toBeVisible({ timeout: 10000 });
  });

  test('点击文章卡片跳转到详情页', async ({ page }) => {
    const firstCard = page.locator('.article-card').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/posts\//);
  });

  test('点击标签跳转到标签过滤的文章列表', async ({ page }) => {
    const tagChip = page.locator('.tag-pill').first();
    if (await tagChip.isVisible()) {
      await tagChip.click();
      await expect(page).toHaveURL(/\/posts\?tag=/);
    }
  });
});

test.describe('Home Page - 异常与边界', () => {
  test('API错误时显示错误状态和重试按钮 @smoke', async ({ page }) => {
    await page.route('**/api/v1/blog/summary', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server Error' }),
      });
    });
    await page.goto('/');
    await expect(page.locator('.error-state')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error-state button')).toContainText('重试');
  });

  test('网络超时场景 - 显示加载状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/blog\/summary/);
    await page.route('**/api/v1/blog/summary', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/');
    await expect(page.locator('.loading-state')).toBeVisible({ timeout: 10000 });
  });

  test('API返回空数据时展示空状态 @smoke', async ({ page }) => {
    test.setTimeout(10000);
    await page.route('**/api/v1/blog/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: {
            hero: null,
            featured: [],
            latest: [],
            pinned: [],
            trendingTags: [],
          },
        }),
      });
    });
    await page.route('**/api/v1/posts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: { list: [], total: 0, page: 1, pageSize: 12 },
        }),
      });
    });
    await page.goto('/');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.empty-state')).toContainText('暂无内容');
  });
});

test.describe('Home Page - UI与导航', () => {
  test.describe.configure({ timeout: 10000 });
  test('导航按钮可见且功能正常', async ({ page }) => {
    await page.goto('/');
    const navbar = page.locator('.app-topbar');
    await expect(navbar).toBeVisible({ timeout: 10000 });
  });

  test('登录按钮导向登录页', async ({ page }) => {
    await page.goto('/');
    const guestBtn = page.locator('.guest-btn');
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
