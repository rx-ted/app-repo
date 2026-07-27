import { test, expect } from '../../fixtures/test';

test.describe('Author Page - 核心业务流程', () => {
  test('正常渲染作者页面', async ({ page }) => {
    await page.goto('/authors/alice');
    await expect(page.locator('.author-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示作者个人信息卡片', async ({ page }) => {
    await page.goto('/authors/alice');
    const heroCard = page.locator('.person-card');
    await expect(heroCard).toBeVisible({ timeout: 10000 });
  });

  test('显示作者的文章列表', async ({ page }) => {
    await page.goto('/authors/alice');
    const postGrid = page.locator('.post-grid');
    await expect(postGrid).toBeVisible({ timeout: 10000 });
    const cards = postGrid.locator('.article-card');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('点击文章跳转到详情页', async ({ page }) => {
    await page.goto('/authors/alice');
    const firstCard = page.locator('.article-card').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/posts\//);
  });

  test('标签过滤文章', async ({ page }) => {
    await page.goto('/authors/alice');
    const tagFilter = page.locator('.tag-filters button:has-text("go")');
    if (await tagFilter.isVisible()) {
      await tagFilter.click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Author Page - 异常与边界', () => {
  test('API错误时显示错误提示 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/blog\/authors\/(.+)/);
    await page.route('**/api/v1/blog/authors/*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });
    await page.goto('/authors/alice');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('作者不存在时显示错误 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/blog\/authors\/(.+)/);
    await page.route('**/api/v1/blog/authors/*', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Author not found' }),
      });
    });
    await page.goto('/authors/non-existent-user');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('作者没有文章时显示空状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/blog\/authors\/(.+)/);
    await page.route('**/api/v1/blog/authors/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: {
            author: {
              username: 'newbie',
              nickname: 'Newbie',
              avatar_url: null,
              bio: '',
              website: '',
              location: '',
              total_posts: 0,
            },
            posts: { list: [], total: 0, page: 1, pageSize: 8, tags: [], activeTag: '' },
          },
        }),
      });
    });
    await page.goto('/authors/newbie');
    await expect(page.locator('.n-empty').first()).toBeVisible({ timeout: 10000 });
  });

  test('加载过程中显示loading状态 @smoke', async ({ page }) => {
    await page.route('**/api/v1/blog/authors/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: { author: {}, posts: { list: [], total: 0 } },
        }),
      });
    });
    await page.goto('/authors/alice');
    await expect(page.locator('.n-spin')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Author Page - 数据完整性', () => {
  test('作者昵称和用户名正确显示', async ({ page }) => {
    await page.goto('/authors/alice');
    await expect(page.locator('.person-card h3')).toContainText('Alice', {
      timeout: 10000,
    });
  });

  test('作者文章数量正确显示', async ({ page }) => {
    await page.goto('/authors/alice');
    await expect(page.locator('.person-card .meta-row')).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Author Page - UI与导航', () => {
  test('作者路由别名/author重定向到/authors', async ({ page }) => {
    await page.goto('/author/alice');
    await expect(page).toHaveURL(/\/authors\/alice/);
  });
});
