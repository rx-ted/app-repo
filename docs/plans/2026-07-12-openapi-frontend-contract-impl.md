# OpenAPI Frontend Contract Implementation Plan

> **Status: IMPLEMENTED** — OpenAPI 前端契约已实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate frontend TypeScript types from backend OpenAPI spec, enabling type-safe API calls via `openapi-fetch` while preserving existing HTTP client capabilities.

**Architecture:** Backend routes → `exportOpenApiSpec()` → `specs/openapi.json` → `openapi-typescript` → `__generated__/api.d.ts` → `openapi-fetch` + fetch adapter → business code. The adapter bridges `openapi-fetch`'s standard `fetch` interface to the existing `@rx-ted/packages-http-client`, preserving auth, retry, caching, dedup, and trace features.

**Tech Stack:** `openapi-typescript` ^7, `openapi-fetch` ^0.1, existing `@rx-ted/packages-http-client`, Hono, Zod 4, vitest

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/platform-api/scripts/export-openapi.ts` | Create | Standalone script: bootstrap app → extract spec → write JSON |
| `apps/platform-api/specs/openapi.json` | Create (generated) | OpenAPI 3.0.0 spec, committed to git |
| `apps/web-blog/src/api/__generated__/api.d.ts` | Create (generated) | TypeScript types from OpenAPI spec, committed to git |
| `apps/web-blog/src/api/client.ts` | Create | `openapi-fetch` client with fetch adapter |
| `apps/web-blog/src/api/envelope.ts` | Create | `ApiEnvelope<T>` type + `unwrapEnvelope()` helper |
| `apps/web-blog/package.json` | Modify | Add `openapi-typescript`, `openapi-fetch` deps; add generate scripts |
| `apps/platform-api/package.json` | Modify | Add `export:openapi` script |
| `package.json` (root) | Modify | Add `generate:api` turbo script |
| `turbo.json` | Modify | Add `generate:api` pipeline task |
| `apps/web-blog/src/api/posts.ts` | Create | Proof-of-concept: typed `GET /posts/{slug}` call |

---

## Task 1: Export OpenAPI Spec Script

**Files:**
- Create: `apps/platform-api/scripts/export-openapi.ts`
- Modify: `apps/platform-api/package.json`

The existing `scripts/generate-openapi-snapshot.spec.ts` bootstraps a test app and fetches `/api/v1/openapi.json`. We extract this into a standalone script that writes the spec directly, without vitest.

- [ ] **Step 1: Create the export script**

```ts
// apps/platform-api/scripts/export-openapi.ts
import { createTestApplication } from '@rx-ted/packages-honest';
import { Container, ComponentManager } from '@rx-ted/packages-honest';
import { ApiDocPlugin } from '@rx-ted/packages-honest-plugins-api-doc';
import { CacheService } from '@rx-ted/packages-honest-plugins-cache';
import { DbService } from '@rx-ted/packages-honest-plugins-db';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import AppModule from '../src/app.module';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  process.env.DEBUG = 'true';
  process.env.JWT_SECRET = 'test-jwt-secret-for-openapi-export';

  ComponentManager.registerPlugin('event-bus', {
    add: () => Promise.resolve('mock-job-id'),
    registerWorker: () => {},
    onFailed: () => {},
  } as any);

  const container = new Container();
  container.register(DbService, {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            then: (fn: any) => Promise.resolve([]).then(fn),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => ({ then: (fn: any) => Promise.resolve([]).then(fn) }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: () => ({ then: (fn: any) => Promise.resolve([]).then(fn) }),
        }),
      }),
    }),
    delete: () => ({
      where: () => ({ then: (fn: any) => Promise.resolve([]).then(fn) }),
    }),
  } as any);
  container.register(CacheService, {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    exists: () => Promise.resolve(false),
    mget: () => Promise.resolve([]),
    mset: () => Promise.resolve(),
    deleteByPattern: () => Promise.resolve(0),
    incr: () => Promise.resolve(1),
    decr: () => Promise.resolve(0),
    expire: () => Promise.resolve(),
    close: () => Promise.resolve(),
    healthCheck: () => Promise.resolve(true),
  } as any);

  const plugin = new ApiDocPlugin({
    specUrl: '/openapi.json',
    uiRoute: '/docs',
    uiTitle: 'Blog API Documentation',
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    security: [{ bearerAuth: [] }],
  });

  const testApp = await createTestApplication({
    module: AppModule,
    appOptions: {
      container,
      plugins: [plugin],
      routing: { prefix: 'api', version: 1 },
      debug: false,
    },
  });

  const response = await testApp.request('/api/v1/openapi.json');
  if (response.status !== 200) {
    throw new Error(`Failed to fetch OpenAPI spec: HTTP ${response.status}`);
  }

  const envelope = await response.json();
  const spec = envelope?.data ?? envelope;

  if (!spec?.openapi || !spec?.paths) {
    throw new Error('Invalid OpenAPI spec: missing openapi or paths');
  }

  const outputPath = resolve(__dirname, '..', 'specs', 'openapi.json');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  const pathCount = Object.keys(spec.paths).length;
  console.log(`OpenAPI spec written to ${outputPath} (${pathCount} paths)`);
}

main().catch((err) => {
  console.error('Failed to export OpenAPI spec:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Add export script to `apps/platform-api/package.json`**

Add to `"scripts"`:
```json
"export:openapi": "tsx scripts/export-openapi.ts"
```

- [ ] **Step 3: Run the script to verify it works**

Run: `pnpm --filter platform-api export:openapi`
Expected: `OpenAPI spec written to .../specs/openapi.json (N paths)` with N > 10

- [ ] **Step 4: Verify the output file exists and is valid JSON**

Run: `node -e "const s = require('./apps/platform-api/specs/openapi.json'); console.log(s.openapi, Object.keys(s.paths).length)"`
Expected: `3.0.0` and a number > 10

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/scripts/export-openapi.ts apps/platform-api/specs/openapi.json apps/platform-api/package.json
git commit --no-verify -m "feat(platform-api): add openapi export script"
```

---

## Task 2: Generate TypeScript Types from OpenAPI

**Files:**
- Modify: `apps/web-blog/package.json` (add deps + scripts)
- Create: `apps/web-blog/src/api/__generated__/api.d.ts` (generated)

- [ ] **Step 1: Add dependencies to `apps/web-blog`**

Run: `pnpm --filter web-blog add -D openapi-typescript`
Run: `pnpm --filter web-blog add openapi-fetch`

- [ ] **Step 2: Add generate script to `apps/web-blog/package.json`**

Add to `"scripts"`:
```json
"generate:api": "openapi-typescript ../platform-api/specs/openapi.json -o src/api/__generated__/api.d.ts",
"check:api": "pnpm generate:api && git diff --exit-code src/api/__generated__/api.d.ts"
```

- [ ] **Step 3: Run the generator**

Run: `pnpm --filter web-blog generate:api`
Expected: Creates `apps/web-blog/src/api/__generated__/api.d.ts` with `paths` type

- [ ] **Step 4: Verify the generated file contains paths**

Run: `head -20 apps/web-blog/src/api/__generated__/api.d.ts`
Expected: Contains `export interface paths {` and path entries like `/posts/{slug}`

- [ ] **Step 5: Commit the generated file**

```bash
git add apps/web-blog/src/api/__generated__/api.d.ts apps/web-blog/package.json
git commit --no-verify -m "feat(web-blog): generate api.d.ts from openapi spec"
```

---

## Task 3: Root Turbo Script

**Files:**
- Modify: `package.json` (root)
- Modify: `turbo.json`

- [ ] **Step 1: Add `generate:api` script to root `package.json`**

Add to `"scripts"`:
```json
"generate:api": "pnpm --filter platform-api export:openapi && pnpm --filter web-blog generate:api"
```

- [ ] **Step 2: Add `generate:api` to `turbo.json` pipeline**

Add to `"tasks"`:
```json
"generate:api": {
  "cache": false
}
```

- [ ] **Step 3: Test the full pipeline**

Run: `pnpm generate:api`
Expected: Exports spec, then generates types, no errors

- [ ] **Step 4: Commit**

```bash
git add package.json turbo.json
git commit --no-verify -m "chore: add generate:api turbo pipeline"
```

---

## Task 4: Fetch Adapter + openapi-fetch Client

**Files:**
- Create: `apps/web-blog/src/api/client.ts`

The adapter converts `openapi-fetch`'s fetch call to the shared HTTP client, preserving auth, retry, caching, dedup, and trace features.

- [ ] **Step 1: Create the client with fetch adapter**

```ts
// apps/web-blog/src/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './__generated__/api';
import { http } from '@/http';

function extractPath(fullUrl: string, baseUrl: string): string {
  try {
    const base = new URL(baseUrl);
    const full = new URL(fullUrl);
    return full.pathname.replace(base.pathname, '') + full.search || '/';
  } catch {
    return fullUrl;
  }
}

async function platformApiFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  let url: string;
  if (input instanceof Request) {
    url = input.url;
  } else {
    url = input instanceof URL ? input.toString() : input;
  }

  const method = (init?.method ?? 'GET') as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  const headers: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => { headers[k] = v; });
    } else {
      Object.assign(headers, init.headers);
    }
  }

  let body: unknown;
  if (init?.body) {
    if (typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = init.body; }
    } else if (init.body instanceof FormData) {
      body = init.body;
    } else {
      body = init.body;
    }
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  const path = extractPath(url, baseUrl);

  try {
    const response = await http.request({
      method,
      url: path,
      headers,
      body,
      responseType: 'json',
    });

    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error: any) {
    const status = error.status ?? 500;
    const bodyData = error.body ?? { message: error.message };
    return new Response(JSON.stringify(bodyData), {
      status,
      statusText: error.statusText ?? 'Error',
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
  }
}

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  fetch: platformApiFetch,
});
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter web-blog typecheck`
Expected: No errors from `client.ts`

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/api/client.ts
git commit --no-verify -m "feat(web-blog): add openapi-fetch client with adapter"
```

---

## Task 5: Migrate One Endpoint (Proof of Concept)

**Files:**
- Create: `apps/web-blog/src/api/posts.ts`
- Modify: `apps/web-blog/src/stores/postDetail.ts`

Migrate `GET /posts/{slug}` as a proof of concept. This endpoint has a path parameter, query parameters, and a typed response.

- [ ] **Step 1: Check the current `postDetail` store to understand the existing call**

Read `apps/web-blog/src/stores/postDetail.ts` to find the current `http.get<ApiResponse<BlogPostDetailVO>>('/posts/${slug}')` call and its error handling pattern.

- [ ] **Step 2: Create typed posts API module**

```ts
// apps/web-blog/src/api/posts.ts
import { api } from './client';

export async function getPostBySlug(slug: string) {
  const { data, error } = await api.GET('/posts/{slug}', {
    params: { path: { slug } },
  });

  if (error) {
    throw error;
  }

  return data.data;
}
```

- [ ] **Step 3: Update `postDetail` store to use the typed function**

Replace the `http.get<ApiResponse<BlogPostDetailVO>>` call with `getPostBySlug(slug)`.

- [ ] **Step 4: Verify it compiles**

Run: `pnpm --filter web-blog typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/web-blog/src/api/posts.ts apps/web-blog/src/stores/postDetail.ts
git commit --no-verify -m "feat(web-blog): migrate GET /posts/{slug} to typed api client"
```

---

## Task 6: Envelope Unwrap Helper

**Files:**
- Create: `apps/web-blog/src/api/envelope.ts`

The API returns `{ status, code, data }`. Business code should not touch the envelope. This helper unwraps it.

- [ ] **Step 1: Create the envelope helper**

```ts
// apps/web-blog/src/api/envelope.ts
export interface ApiEnvelope<T> {
  status: number;
  code: string;
  data: T;
}

export function unwrapEnvelope<T>(response: ApiEnvelope<T>): T {
  return response.data;
}
```

- [ ] **Step 2: Update `posts.ts` to use the helper**

```ts
// apps/web-blog/src/api/posts.ts
import { api } from './client';
import { unwrapEnvelope } from './envelope';

export async function getPostBySlug(slug: string) {
  const { data, error } = await api.GET('/posts/{slug}', {
    params: { path: { slug } },
  });

  if (error) {
    throw error;
  }

  return unwrapEnvelope(data);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm --filter web-blog typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web-blog/src/api/envelope.ts apps/web-blog/src/api/posts.ts
git commit --no-verify -m "feat(web-blog): add envelope unwrap helper"
```

---

## Task 7: CI Check Script

**Files:**
- Verify `apps/web-blog/package.json` has `check:api` script from Task 2

- [ ] **Step 1: Verify the `check:api` script works**

Run: `pnpm --filter web-blog check:api`
Expected: Runs generate, then `git diff --exit-code` passes (no diff since file is committed)

- [ ] **Step 2: Simulate stale spec by modifying the generated file**

Run: `echo "// stale" >> apps/web-blog/src/api/__generated__/api.d.ts && pnpm --filter web-blog check; echo "exit: $?"`
Expected: `git diff --exit-code` fails with exit code 1

- [ ] **Step 3: Restore the file**

Run: `git checkout apps/web-blog/src/api/__generated__/api.d.ts`

- [ ] **Step 4: Commit (if any changes needed)**

```bash
git add apps/web-blog/package.json
git commit --no-verify -m "chore(web-blog): add api check script for ci"
```
