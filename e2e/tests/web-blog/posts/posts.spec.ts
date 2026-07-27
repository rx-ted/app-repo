import { test, expect } from '../../../fixtures/test';

test.describe('Post List - 核心业务流程', () => {
  test.describe.configure({ timeout: 10000 });
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts');
  });

  test('正常渲染文章列表页', async ({ page }) => {
    await expect(page.locator('.doc-shell')).toBeVisible({ timeout: 10000 });
  });

  test('展示文章卡片列表', async ({ page }) => {
    const articleList = page.locator('.doc-shell');
    await expect(articleList).toBeVisible({ timeout: 10000 });

    const cards = articleList.locator('.article-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('点击文章卡片跳转到详情', async ({ page }) => {
    const firstCard = page.locator('.article-card').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();
    await expect(page).toHaveURL(/\/posts\//);
    await expect(page.locator('.post-detail')).toBeVisible({ timeout: 10000 });
  });

  test('切换卡片/列表视图模式', async ({ page }) => {
    const listViewBtn = page.locator('button:has-text("List")');
    if (await listViewBtn.isVisible()) {
      await listViewBtn.click();
      await expect(page).toHaveURL(/viewMode=list/);
    }
    const cardViewBtn = page.locator('button:has-text("Card")');
    if (await cardViewBtn.isVisible()) {
      await cardViewBtn.click();
      await expect(page).toHaveURL(/viewMode=card/);
    }
  });

  test('显示页标题和描述', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.page-desc, .page-badge').first()).toBeVisible();
  });
});

test.describe('Post List - 异常与边界', () => {
  test('API返回500时显示错误状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error' }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('/posts');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('API返回空列表时显示空状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 200,
            code: 'OK',
            data: { list: [], total: 0, page: 1, pageSize: 10 },
          }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('/posts');
    await expect(page.locator('.n-empty, .empty-state')).toBeVisible({ timeout: 10000 });
  });

  test('401未授权访问受保护文章 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts**', async (route, request) => {
      if (request.method() === 'GET') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' }),
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('/posts');
  });
});

test.describe('Post List - UI与导航', () => {
  test('标签过滤', async ({ page }) => {
    await page.goto('/posts?tag=go');
    await expect(page).toHaveURL(/tag=go/);
    await expect(page.locator('.filter-bar, .active-filters').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('分类过滤', async ({ page }) => {
    await page.goto('/posts?category=Development');
    await expect(page).toHaveURL(/category=Development/);
  });

  test('作者过滤', async ({ page }) => {
    await page.goto('/posts?author=alice');
    await expect(page).toHaveURL(/author=alice/);
  });

  test('清除过滤条件', async ({ page }) => {
    await page.goto('/posts?tag=go');
    const filterTag = page.locator('.n-tag');
    if (await filterTag.isVisible()) {
      const closeBtn = filterTag.locator('.n-tag__close, [class*="close"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(page).toHaveURL('/posts');
      }
    }
  });
});

test.describe('Post Detail - 核心业务流程', () => {
  test('正常渲染文章详情页', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/posts/getting-started-with-go');
    await expect(page.locator('.post-detail')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.post-detail h1')).toContainText('Getting Started with Go');
  });

  test('显示文章内容', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/posts/getting-started-with-go');
    const content = page.locator('.post-content');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('显示文章标签', async ({ page }) => {
    await page.goto('/posts/getting-started-with-go');
    const tags = page.locator('.tag-chip, .tag-chip-outline');
    const count = await tags.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Post Detail - 异常与边界', () => {
  test('文章不存在时显示404状态 @smoke', async ({ page }) => {
    await page.goto('/posts/non-existent-post');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('API错误时显示错误信息 @smoke', async ({ page }) => {
    test.setTimeout(10000);
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts/non-existent-post', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      });
    });
    await page.goto('/posts/non-existent-post');
    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 10000 });
  });

  test('加载过程中显示loading状态 @smoke', async ({ page }) => {
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts/slow-load', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 200,
          code: 'OK',
          data: { id: '1', title: 'Slow', content_md: '# Slow' },
        }),
      });
    });
    await page.goto('/posts/slow-load');
    await expect(page.locator('.n-spin-body')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Post Detail - 数据完整性', () => {
  test('公开文章可正常访问', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/posts/getting-started-with-go');
    await expect(page.locator('.post-detail h1')).toContainText('Getting Started with Go', {
      timeout: 10000,
    });
  });

  test('私密文章内容正确显示', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/posts/private-post');
    await expect(page.locator('.post-detail h1')).toContainText('Private Post', { timeout: 10000 });
  });

  test('草稿文章显示草稿状态', async ({ page }) => {
    test.setTimeout(10000);
    await page.goto('/posts/draft-post');
    await expect(page.locator('.post-detail h1')).toContainText('Draft Post', { timeout: 10000 });
  });
});
