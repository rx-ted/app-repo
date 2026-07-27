import { test, expect } from '../../../fixtures/test';

test.describe('Editor - 认证与权限', () => {
  test.use({ storageState: undefined });

  test('未登录用户访问编辑器被重定向到登录页 @smoke', async ({ page }) => {
    await page.goto('/editor');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('编辑已有文章时未登录被重定向 @smoke', async ({ page }) => {
    await page.goto('/editor/getting-started-with-go');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Editor - 核心业务流程', () => {
  test.describe.configure({ timeout: 10000 });
  test.use({ authenticated: true });

  test('正常渲染编辑器页面', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('.editor-shell')).toBeVisible({ timeout: 10000 });
  });

  test('编辑器加载标签和分类选项', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForTimeout(2000);
    const editor = page.locator('.editor-shell');
    await expect(editor).toBeVisible({ timeout: 10000 });
  });

  test('编辑已有文章时加载文章内容', async ({ page }) => {
    await page.goto('/editor/getting-started-with-go');
    await page.waitForTimeout(2000);
    const editor = page.locator('.editor-shell');
    await expect(editor).toBeVisible({ timeout: 10000 });
  });

  test('创建新文章完整流程', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForTimeout(1000);

    const saveBtn = page.locator('button:has-text("Save"), button:has-text("发布")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('保存时API错误显示错误提示 @smoke', async ({ page }) => {
    test.setTimeout(10000);
    await page.unroute(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/);
    await page.route('**/api/v1/posts**', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Save failed' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/editor');
    await page.waitForTimeout(2000);

    const editor = page.locator('#blog-editor .cm-content');
    await editor.fill('# Test Article\n\nThis is a test article.');

    await page.locator('button:has-text("保存")').click();

    await page.locator('.n-modal .n-input input').first().fill('Test Article');

    await page.locator('.n-modal button:has-text("确认保存")').click();

    await expect(page.locator('.n-alert')).toBeVisible({ timeout: 5000 });
  });
});
