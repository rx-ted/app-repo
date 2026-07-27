import { test, expect } from '../../fixtures/test';

test.describe('Archive Page', () => {
  test('正常渲染归档页', async ({ page }) => {
    await page.goto('/archive');
    await expect(page.locator('.archive-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示页面标题和文章总数', async ({ page }) => {
    await page.goto('/archive');
    await expect(page.locator('.page-title')).toHaveText('归档');
    await expect(page.locator('.page-subtitle')).toContainText('篇文章');
  });

  test('显示时间线组件', async ({ page }) => {
    await page.goto('/archive');
    await expect(page.locator('.at-body')).toBeVisible({ timeout: 10000 });
  });

  test('点击文章跳转到详情页', async ({ page }) => {
    await page.goto('/archive');
    const firstRow = page.locator('.at-row').first();
    await firstRow.waitFor({ timeout: 10000 });
    await firstRow.click();
    await expect(page).toHaveURL(/\/posts\//);
  });
});

test.describe('Calendar Page', () => {
  test('正常渲染日历页', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('.calendar-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示日历组件', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('.calendar-widget')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Friends Page', () => {
  test('正常渲染友链页', async ({ page }) => {
    await page.goto('/friends');
    await expect(page.locator('.friends-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示友链列表', async ({ page }) => {
    await page.goto('/friends');
    const cards = page.locator('.link-card');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('友链卡片显示名称', async ({ page }) => {
    await page.goto('/friends');
    await expect(page.locator('.card-name').first()).toBeVisible({ timeout: 10000 });
  });

  test('友链为空时显示空状态 @smoke', async ({ page }) => {
    await page.route('/api/v1/friend-links', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 200, code: 'OK', data: [] }),
      });
    });
    await page.goto('/friends');
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Guestbook Page', () => {
  test('正常渲染留言页', async ({ page }) => {
    await page.goto('/guestbook');
    await expect(page.locator('.guestbook-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示留言表单', async ({ page }) => {
    await page.goto('/guestbook');
    await expect(page.locator('.guestbook-form')).toBeVisible({ timeout: 10000 });
  });

  test('显示留言列表', async ({ page }) => {
    await page.goto('/guestbook');
    await expect(page.locator('.messages-list')).toBeVisible({ timeout: 10000 });
    expect(await page.locator('.message-item').count()).toBeGreaterThan(0);
  });
});

test.describe('Guestbook - 匿名留言', () => {
  test('正常提交留言并清空表单', async ({ page }) => {
    await page.goto('/guestbook');
    await expect(page.locator('.guestbook-form')).toBeVisible({ timeout: 10000 });

    await page.locator('.form-input').nth(0).fill('Test User');
    await page.locator('.form-input').nth(1).fill('test@example.com');
    await page.locator('.form-textarea').fill('This is a test guestbook message.');

    await page.locator('.submit-btn').click();

    await expect(page.locator('.form-textarea')).toHaveValue('');
    await expect(page.locator('.submit-error')).not.toBeVisible();
  });

  test('内容为空时提交按钮禁用', async ({ page }) => {
    await page.goto('/guestbook');
    const btn = page.locator('.submit-btn');
    await expect(btn).toBeDisabled();
  });

  test('邮箱格式错误时提交按钮禁用', async ({ page }) => {
    await page.goto('/guestbook');
    await page.locator('.form-input').nth(0).fill('Test User');
    await page.locator('.form-input').nth(1).fill('not-an-email');
    await page.locator('.form-textarea').fill('Some content');
    await expect(page.locator('.submit-btn')).toBeDisabled();
  });
});

test.describe('Guestbook - 已登录用户留言', () => {
  test.use({ authenticated: true });

  test('显示已登录用户信息且无名称/邮箱输入框', async ({ page }) => {
    await page.goto('/guestbook');
    await expect(page.locator('.guestbook-page')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.auth-info')).toBeVisible();
    await expect(page.locator('.auth-info')).toContainText('Alice');
    await expect(page.locator('.form-row')).not.toBeVisible();
  });

  test('正常提交留言并清空表单 @auth', async ({ page }) => {
    await page.goto('/guestbook');
    await page.locator('.form-textarea').fill('Authenticated test message.');
    await page.locator('.submit-btn').click();
    await expect(page.locator('.form-textarea')).toHaveValue('');
    await expect(page.locator('.submit-error')).not.toBeVisible();
  });

  test('API错误时显示错误提示 @auth', async ({ page }) => {
    await page.route('/api/v1/comments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ status: 500, code: 'INTERNAL_ERROR', message: 'Server error' }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/guestbook');
    await page.locator('.form-textarea').fill('This should fail.');
    await page.locator('.submit-btn').click();
    await expect(page.locator('.submit-error')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Tags Page', () => {
  test('正常渲染标签页', async ({ page }) => {
    await page.goto('/tags');
    await expect(page.locator('.tags-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示标签列表', async ({ page }) => {
    await page.goto('/tags');
    await page.waitForResponse(/\/api\/v1\/tags/, { timeout: 5000 }).catch(() => {});
    const rows = page.locator('.tag-row');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('点击标签跳转到标签详情', async ({ page }) => {
    await page.goto('/tags');
    const tagList = page.locator('.tag-list');
    await tagList.waitFor({ timeout: 10000 });
    const firstRow = page.locator('.tag-row').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await expect(page).toHaveURL(/\/tags\//);
    }
  });
});

test.describe('Tag Detail Page', () => {
  test('正常渲染标签详情页', async ({ page }) => {
    await page.goto('/tags/go');
    await expect(page.locator('.tag-detail-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示标签名称', async ({ page }) => {
    await page.goto('/tags/go');
    await expect(page.locator('.page-title')).toContainText('go');
  });

  test('显示文章时间线', async ({ page }) => {
    await page.goto('/tags/go');
    await expect(page.locator('.timeline')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Categories Page', () => {
  test('正常渲染分类页', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.locator('.categories-page')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Category Detail Page', () => {
  test('正常渲染分类详情页', async ({ page }) => {
    await page.goto('/categories/Development');
    await expect(page.locator('.category-detail-page')).toBeVisible({ timeout: 10000 });
  });

  test('显示分类名称', async ({ page }) => {
    await page.goto('/categories/Development');
    await expect(page.locator('.page-title')).toContainText('Development');
  });

  test('显示文章时间线', async ({ page }) => {
    await page.goto('/categories/Development');
    await expect(page.locator('.timeline')).toBeVisible({ timeout: 10000 });
  });
});
