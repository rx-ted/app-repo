---
title: E2E testing workflow
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - testing
  - e2e
  - playwright
  - vitest
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./e2e-testing.zh.md)

# E2E testing workflow

**Project: TS + Playwright (frontend) / Vitest (backend)**

---

## 1. Architecture overview

This project has two kinds of E2E tests, all living under the `e2e/` directory:

```
e2e/
  vitest.config.ts          # backend E2E (shared by all backend modules)
  playwright.config.ts      # frontend E2E (web-blog)
  tests/
    <module>/                # organised by backend module, e.g. platform-api/
    web-blog/                # Playwright frontend tests
  mocks/
    data.ts                  # Playwright mock API data + route definitions
  fixtures/
    test.ts                  # Playwright custom fixture
  reporters/
    failed-reporter.mjs      # failed-test case info collection
  scripts/
    test-affected.mjs        # incremental testing
    test-failed.mjs          # rerun failed tests
  auth.setup.ts              # Playwright auth state setup
  test-users.json            # test user data
```

| Type | Tool | Target | Verification | Mocking |
|------|------|----------|----------|-----------|
| Frontend E2E | Playwright | web-blog pages | browser operations + DOM assertions | `page.route()` intercepts the API |
| Backend E2E | Vitest | backend controllers / handlers | call the handler directly + assert on the return | `vi.mock()` replaces service/repo |

---

## 2. Quick start

### Run all E2E

```bash
pnpm test:e2e
```

Runs the frontend and backend E2E in parallel, orchestrated by turbo.

### Run separately

```bash
# Frontend Playwright
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts

# Frontend Playwright (with browser UI)
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts --headed

# Frontend Playwright (UI mode debugging)
pnpm --filter @rx-ted/web-blog exec npx playwright test --config=../../e2e/playwright.config.ts --ui

# Backend Vitest (platform-api as an example)
pnpm --filter @rx-ted/platform-api exec vitest run --config ../../e2e/vitest.config.ts

# Backend Vitest (watch mode)
pnpm --filter @rx-ted/platform-api exec vitest --config ../../e2e/vitest.config.ts
```

### Smoke tests (only the cases tagged `@smoke`)

```bash
pnpm test:e2e:smoke
```

---

## 3. Frontend E2E (Playwright)

### Configuration

`e2e/playwright.config.ts`:

- `testDir: './tests'` — test file directory
- `testIgnore: ['**/platform-api/**']` — excludes the backend Vitest tests
- `webServer` — automatically starts web-blog's Vite dev server
- the `CI` environment variable controls whether authenticated setup runs (stores the auth cookie)

### Test environments

| Mode | baseURL | API source |
|------|---------|----------|
| CI | `http://localhost:5173` | all mocked via `page.route()` |
| dev/debugging | `http://localhost:5173` | real `localhost:3000` or mocks |

In CI all APIs are mocked, so no backend service is required.

### Mock API

All mock data and API route interception are defined centrally in `e2e/mocks/data.ts`:

```ts
import { setupApiMocks } from '../../mocks/data';

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page, false); // not logged in
});

test('visit the home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=Tech Blog')).toBeVisible();
});
```

`setupApiMocks(page, authenticated)` registers mock responses for all API routes automatically.

### Auth state

Playwright simulates login via the `storageState` mechanism:

```ts
// global auth-setup project (enabled in CI mode)
test.use({ storageState: '.auth/user.json' });
```

- CI: runs `auth.setup.ts` first to log in and save the cookie; later tests reuse it
- local: not authenticated by default; call `setupApiMocks(page, true)` manually or override with `page.route()` as needed

### Directory conventions

```
e2e/tests/web-blog/
  <page>/                     # organised by page/feature
  <page>.spec.ts              # or single-file
  home.spec.ts
  author.spec.ts
  static-pages.spec.ts
```

### Writing conventions

```ts
import { test, expect } from '../../fixtures/test';  // use the custom fixture
import { setupApiMocks } from '../../mocks/data';

test.describe('页面名 - 分类名', () => {
  test('测试描述 @smoke', async ({ page }) => {
    // 1. Arrange: setupApiMocks + mock overrides
    await setupApiMocks(page, true);

    // 2. Act: page operations
    await page.goto('/some-page');

    // 3. Assert: DOM assertions
    await expect(page.locator('...')).toBeVisible();
  });
});
```

Naming rules:
- file name: `<page>.spec.ts` (full suite), `<page>.smoke.spec.ts` (smoke only)
- `describe`: `Page name - category name` (e.g. `Home Page - Core business flow`)
- `it`: `test scenario description @tag`
- tags: `@smoke` marks the critical path (P0); CI can filter with `--grep @smoke`

---

## 4. Backend E2E (Vitest)

### Configuration

`e2e/vitest.config.ts`:

- `root: __dirname` — uses e2e/ as the root
- `include: ['tests/<module>/**/*.spec.ts']` — each backend module lives in its own subdirectory
- `setupFiles: ['tests/<module>/setup.ts']` — each module can configure its global mocks independently
- `resolve.alias` — configures an alias per backend module, e.g. `@platform-api` → `apps/platform-api/src`

### Adding a new backend module

1. Create a `<new-module>/` directory under `e2e/tests/`
2. Add the new module to `include` and `resolve.alias` in `e2e/vitest.config.ts`
3. Mock the global framework dependencies in `<new-module>/setup.ts`
4. Write test files `.e2e.spec.ts`

### How tests work

Backend E2E calls controller handlers directly, without starting an HTTP server:

```ts
import { AuthController } from 'your-module/auth/auth.controller';

const controller = new AuthController(mockService);
const result = await controller.login(body, mockCtx);
expect(result.accessToken).toBeDefined();
```

### Mocking

External dependencies are mocked globally in `setup.ts` via `vi.mock()`:

| Layer | Mocking |
|------|-----------|
| framework/ORM dependencies (DI, decorators, drizzle, etc.) | global mocks in `setup.ts` |
| intra-module dependencies (config, lib) | `setup.ts` or `vi.mock()` in the test file |
| service / repository | `vi.mock()` in the test file + construct a mock instance passed to the controller |
| external libraries such as `hono/cookie` | `vi.mock()` in the test file, or mock the context's `header` method |

```ts
// test file
import { vi } from 'vitest';
vi.mock('your-module/auth/auth.service', () => ({
  default: vi.fn(),
}));

import { AuthController } from 'your-module/auth/auth.controller';

function mockCtx() {
  return { req: { header: vi.fn() }, header: vi.fn(), json: vi.fn(), get: vi.fn() };
}
```

**Note**: `vi.mock()` is hoisted to the top of the file in Vitest and runs before imports. If a mock doesn't take effect, check whether the module path matches Vitest's resolution result.

### Directory conventions

```
e2e/tests/<module>/
  <module>.e2e.spec.ts        # one file per module
  setup.ts                    # global mocks and helpers
```

---

## 5. Three-environment strategy

| Environment | Purpose | Frontend (Playwright) | Backend (Vitest) | Data |
|------|------|-------------------|----------------|------|
| test | CI + local development | mock API (`page.route()`) | mock service/repo (`vi.mock()`) | irrelevant |
| staging | pre-release verification | real API server, only `@smoke` | not run for now | separate test database |
| prod | zero-risk release | release only when both test and staging pass | — | real user data |

CI flow:

```yaml
# current implementation (.github/workflows/ci.yml)
jobs:
  versify:
    - lint & format check
    - typecheck
    - unit test (pnpm test)
    - build

  e2e:
    - pnpm test:e2e  # all mocked, no external services
```

---

## 6. turbo.json configuration

```json
{
  "test:e2e": {
    "dependsOn": [],
    "outputs": ["test-results/**"],
    "inputs": ["e2e/**", "apps/web-blog/src/**"]
  }
}
```

- each backend module's `test:e2e` script points at the shared config via `--config ../../e2e/vitest.config.ts`
- `web-blog`'s `test:e2e` script points at the shared config via `--config=../../e2e/playwright.config.ts`
- all E2E tasks are independent of each other and run in parallel

---

## 7. Notes

| Topic | Description |
|------|------|
| the two E2E kinds don't interfere | Playwright excludes the `<module>/` directories via `testIgnore` |
| every test is independent | no dependency on the data or state of a previous test |
| Playwright mocks are centralised | add new API routes to `mocks/data.ts` instead of scattering them across test files |
| Vitest mocks are declared locally | service/repo mocks are declared in each test file; `setup.ts` only mocks global framework dependencies |
| alias resolution | every backend module needs an alias in `resolve.alias` of `vitest.config.ts` |
| Playwright web server | Vite starts automatically before tests and shuts down after them |
| incremental testing | `e2e/scripts/test-affected.mjs` runs only the affected test files |
| failed-test rerun | Playwright retries twice in CI; Vitest does not retry (default) |
