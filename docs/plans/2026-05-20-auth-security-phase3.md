# Auth 安全重构 - Phase 3 实施计划

> **Status: SUPERSEDED** — 创建 `packages/auth` 共享包的计划已废弃。认证逻辑内联在 `platform-api` 中，`packages/auth` 从未被创建。`@rx-ted/packages-http-client` 也从未被创建，HTTP 客户端逻辑内联在各 app 中。web-admin 已从项目中移除。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建 `packages/auth` 共享包，将 web-admin / web-blog 从 localStorage 迁移到内存 token + refresh token 方案，清理后端 tokenVersion 降级逻辑。

**Architecture:** 新建 `packages/auth` 提供 TokenStorage（内存+BroadcastChannel多标签同步）、RefreshHandler（并发去重）、AuthProvider（适配 `@rx-ted/packages-http-client`）、createAuthStore（Pinia store 工厂）。web-blog 已有共享 HTTP 客户端，改用 AuthProvider + 内存 token；web-admin 从自定义 fetch 迁移到共享客户端 + createAuthStore。最后清理 AuthGuard 的 tokenVersion 降级分支。

**Tech Stack:** Vue 3 + Pinia + TypeScript + BroadcastChannel + @rx-ted/packages-http-client

---

## 文件变更清单

**新建 packages/auth：**
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/auth/tsup.config.ts`
- `packages/auth/src/index.ts`
- `packages/auth/src/types.ts`
- `packages/auth/src/tokenStorage.ts`
- `packages/auth/src/tokenStorage.spec.ts`
- `packages/auth/src/refreshHandler.ts`
- `packages/auth/src/refreshHandler.spec.ts`
- `packages/auth/src/authProvider.ts`
- `packages/auth/src/createAuthStore.ts`

**修改：**
- `turbo.json` — 添加 packages/auth 到 check inputs
- `apps/web-blog/package.json` — 添加 `@rx-ted/packages-auth` 依赖
- `apps/web-blog/src/stores/session.ts` — 使用 tokenStorage 替代 localStorage
- `apps/web-blog/src/http/index.ts` — 调用 setAuthProvider，移除自定义 401 拦截
- `apps/web-blog/src/router/index.ts` — 更新 store 导入
- `apps/web-admin/package.json` — 添加 `@rx-ted/packages-auth` + `@rx-ted/packages-http-client`
- `apps/web-admin/src/http/client.ts` — 重写为使用共享客户端
- `apps/web-admin/src/http/index.ts` — 新建，导出 client + setAuthProvider
- `apps/web-admin/src/stores/session.ts` — 重写为使用 createAuthStore
- `apps/web-admin/src/router/index.ts` — 更新 store 使用
- `apps/web-admin/src/pages/LoginPage.vue` — 更新 import
- `apps/platform-api/src/common/guards/auth.guard.ts` — 移除 tokenVersion 分支

**删除：**
- `apps/web-admin/src/utils/token.ts`
- `apps/web-admin/src/utils/token.spec.ts`

---

### Task 1: 创建 packages/auth 脚手架

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/tsup.config.ts`
- Create: `packages/auth/src/index.ts`

- [ ] **Step 1: 创建 package.json**（仿照 `packages/http-client/package.json` 结构）

```json
{
  "name": "@rx-ted/packages-auth",
  "version": "0.0.1",
  "type": "module",
  "description": "Auth client: in-memory token storage, refresh queue, Pinia store factory",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "author": "rx-ted",
  "license": "MIT",
  "publishConfig": { "access": "public" },
  "peerDependencies": {
    "pinia": "^3.0.4",
    "vue": "^3.5.34"
  },
  "devDependencies": {
    "pinia": "^3.0.4",
    "tsup": "^8.5.1",
    "typescript": "^5.9.2",
    "vitest": "^4.1.6",
    "vue": "^3.5.34"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "strict": true,
    "noImplicitAny": false,
    "useUnknownInCatchVariables": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 3: 创建 tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: false,
  bundle: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: 创建 src/index.ts**（占位，后续逐步扩展）

```typescript
export {};
```

- [ ] **Step 5: 更新 turbo.json**

在 `tasks.check.inputs` 数组中 `"packages/config/**"` 之后添加 `"packages/auth/**"`。

- [ ] **Step 6: 提交**

```bash
git add packages/auth/ turbo.json
git commit -m "feat(auth): scaffold packages/auth package"
```

---

### Task 2: types.ts

**Files:**
- Create: `packages/auth/src/types.ts`

- [ ] **Step 1: 写入类型定义**

```typescript
export interface AuthUser {
  userId: string;
  username: string;
  preferredLocale: string;
  roles: string[];
  permissions: string[];
  tokenVersion: number;
  lastLoginAt: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  expiresIn: string;
}

export interface LoginResponse extends TokenPair {
  sessionId: string;
  user: AuthUser;
}
```

- [ ] **Step 2: 更新 index.ts**

```typescript
export type { AuthUser, LoginParams, TokenPair, LoginResponse } from './types';
```

- [ ] **Step 3: 提交**

```bash
git add packages/auth/src/types.ts packages/auth/src/index.ts
git commit -m "feat(auth): add shared auth types"
```

---

### Task 3: TokenStorage

**Files:**
- Create: `packages/auth/src/tokenStorage.ts`
- Create: `packages/auth/src/tokenStorage.spec.ts`

- [ ] **Step 1: 写入 TokenStorage**

```typescript
const AUTH_CHANNEL = 'auth:token';

type Listener = (token: string | null) => void;

export class TokenStorage {
  private _token: string | null = null;
  private listeners = new Set<Listener>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(AUTH_CHANNEL);
        this.channel.onmessage = (event: MessageEvent) => {
          if (event.data?.type === 'token_updated') {
            this._token = event.data.token ?? null;
            this.notify();
          }
        };
      } catch { /* BroadcastChannel unavailable */ }
    }
  }

  get token(): string | null {
    return this._token;
  }

  set token(value: string | null) {
    this._token = value;
    this.channel?.postMessage({ type: 'token_updated', token: value });
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this._token);
  }

  destroy(): void {
    this.listeners.clear();
    this.channel?.close();
  }
}
```

- [ ] **Step 2: 写入单元测试**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenStorage } from './tokenStorage';

describe('TokenStorage', () => {
  let storage: TokenStorage;
  beforeEach(() => { storage = new TokenStorage(); });
  afterEach(() => { storage.destroy(); });

  it('starts null', () => expect(storage.token).toBeNull());
  it('stores and retrieves', () => { storage.token = 'x'; expect(storage.token).toBe('x'); });
  it('clears on null', () => { storage.token = 'x'; storage.token = null; expect(storage.token).toBeNull(); });
  it('notifies subscribers', () => {
    const fn = vi.fn();
    storage.subscribe(fn);
    storage.token = 't';
    expect(fn).toHaveBeenCalledWith('t');
  });
  it('allows unsubscribe', () => {
    const fn = vi.fn();
    const unsub = storage.subscribe(fn);
    unsub();
    storage.token = 't';
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 运行测试通过，更新 index.ts**

```typescript
export { TokenStorage } from './tokenStorage';
```

- [ ] **Step 4: 提交**

```bash
git add packages/auth/src/tokenStorage.ts packages/auth/src/tokenStorage.spec.ts packages/auth/src/index.ts
git commit -m "feat(auth): implement TokenStorage with BroadcastChannel sync"
```

---

### Task 4: RefreshHandler

**Files:**
- Create: `packages/auth/src/refreshHandler.ts`
- Create: `packages/auth/src/refreshHandler.spec.ts`

- [ ] **Step 1: 写入 RefreshHandler**

```typescript
export class RefreshHandler {
  private _refreshing: Promise<string | null> | null = null;

  get isRefreshing(): boolean {
    return this._refreshing !== null;
  }

  async refresh(fn: () => Promise<string | null>): Promise<string | null> {
    if (this._refreshing) return this._refreshing;
    this._refreshing = fn().finally(() => { this._refreshing = null; });
    return this._refreshing;
  }

  reset(): void { this._refreshing = null; }
}
```

- [ ] **Step 2: 写入单元测试**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshHandler } from './refreshHandler';

describe('RefreshHandler', () => {
  let h: RefreshHandler;
  beforeEach(() => { h = new RefreshHandler(); });

  it('calls fn', async () => {
    const fn = vi.fn().mockResolvedValue('t');
    expect(await h.refresh(fn)).toBe('t');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deduplicates concurrent calls', async () => {
    const fn = vi.fn().mockResolvedValue('t');
    const [a, b] = await Promise.all([h.refresh(fn), h.refresh(fn)]);
    expect(a).toBe('t');
    expect(b).toBe('t');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('returns null on failure', async () => {
    expect(await h.refresh(() => Promise.resolve(null))).toBeNull();
  });

  it('isRefreshing during refresh', () => {
    h.refresh(() => new Promise(() => {}));
    expect(h.isRefreshing).toBe(true);
    h.reset();
  });
});
```

- [ ] **Step 3: 运行测试通过，更新 index.ts**

```typescript
export { TokenStorage } from './tokenStorage';
export { RefreshHandler } from './refreshHandler';
```

- [ ] **Step 4: 提交**

```bash
git add packages/auth/src/refreshHandler.ts packages/auth/src/refreshHandler.spec.ts packages/auth/src/index.ts
git commit -m "feat(auth): implement RefreshHandler with concurrent dedup"
```

---

### Task 5: AuthProvider 工厂

**Files:**
- Create: `packages/auth/src/authProvider.ts`

- [ ] **Step 1: 写入 createAuthProvider**

```typescript
import type { TokenStorage } from './tokenStorage';
import type { RefreshHandler } from './refreshHandler';

export interface AuthProviderConfig {
  tokenStorage: TokenStorage;
  refreshHandler: RefreshHandler;
  baseUrl?: string;
  onAuthFailure?: () => void;
}

export function createAuthProvider(config: AuthProviderConfig) {
  const { tokenStorage, refreshHandler, baseUrl = '/api/v1', onAuthFailure } = config;

  async function doRefresh(): Promise<string | null> {
    try {
      const res = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const data = await res.json() as { accessToken: string };
      tokenStorage.token = data.accessToken;
      return data.accessToken;
    } catch {
      return null;
    }
  }

  return {
    getToken: () => tokenStorage.token,
    refreshToken: () => refreshHandler.refresh(doRefresh),
    onAuthFailure: () => {
      tokenStorage.token = null;
      onAuthFailure?.();
    },
  };
}
```

- [ ] **Step 2: 更新 index.ts**

```typescript
export { createAuthProvider } from './authProvider';
export type { AuthProviderConfig } from './authProvider';
```

- [ ] **Step 3: 提交**

```bash
git add packages/auth/src/authProvider.ts packages/auth/src/index.ts
git commit -m "feat(auth): implement AuthProvider factory for http-client integration"
```

---

### Task 6: createAuthStore (Pinia 工厂)

**Files:**
- Create: `packages/auth/src/createAuthStore.ts`

- [ ] **Step 1: 写入 createAuthStore**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { TokenStorage } from './tokenStorage';
import { RefreshHandler } from './refreshHandler';
import type { AuthUser, LoginParams, LoginResponse } from './types';

export const tokenStorage = new TokenStorage();
export const refreshHandler = new RefreshHandler();

const AUTH_API = '/api/v1/auth';

async function silentRefresh(): Promise<string | null> {
  try {
    const res = await fetch(`${AUTH_API}/refresh`, {
      method: 'POST', credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string };
    tokenStorage.token = data.accessToken;
    return data.accessToken;
  } catch { return null; }
}

export function createAuthStore(id: string) {
  return defineStore(id, () => {
    const user = ref<AuthUser | null>(null);
    const loading = ref(false);
    const isAuthenticated = computed(() => !!tokenStorage.token && !!user.value);

    tokenStorage.subscribe((t) => { if (!t) user.value = null; });

    async function login(params: LoginParams): Promise<LoginResponse> {
      loading.value = true;
      try {
        const res = await fetch(`${AUTH_API}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          credentials: 'include',
        });
        if (!res.ok) {
          const err = await res.json() as { message?: string };
          throw new Error(err.message ?? 'Login failed');
        }
        const data = await res.json() as LoginResponse;
        tokenStorage.token = data.accessToken;
        user.value = data.user;
        return data;
      } finally { loading.value = false; }
    }

    async function refreshToken(): Promise<string | null> {
      return refreshHandler.refresh(silentRefresh);
    }

    async function bootstrap(): Promise<void> {
      let token = tokenStorage.token;
      if (!token) {
        token = await refreshToken();
      }
      if (token) {
        try {
          const res = await fetch(`${AUTH_API}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            user.value = await res.json() as AuthUser;
            return;
          }
        } catch { /* fall through */ }
        tokenStorage.token = null;
      }
    }

    async function logout(): Promise<void> {
      try {
        await fetch(`${AUTH_API}/logout`, { method: 'POST', credentials: 'include' });
      } catch { /* best-effort */ }
      tokenStorage.token = null;
      user.value = null;
    }

    function clearSession(): void {
      tokenStorage.token = null;
      user.value = null;
    }

    return { user, loading, isAuthenticated, login, logout, refreshToken, bootstrap, clearSession };
  });
}
```

- [ ] **Step 2: 更新 index.ts**

```typescript
export { TokenStorage, tokenStorage } from './tokenStorage';
export { RefreshHandler, refreshHandler } from './refreshHandler';
export { createAuthProvider } from './authProvider';
export type { AuthProviderConfig } from './authProvider';
export { createAuthStore } from './createAuthStore';
export type { AuthUser, LoginParams, TokenPair, LoginResponse } from './types';
```

- [ ] **Step 3: 提交**

```bash
git add packages/auth/src/createAuthStore.ts packages/auth/src/index.ts
git commit -m "feat(auth): implement Pinia store factory with silent refresh"
```

---

### Task 7: web-blog session store 迁移

**Files:**
- Modify: `apps/web-blog/package.json`
- Modify: `apps/web-blog/src/stores/session.ts`

- [ ] **Step 1: 添加 @rx-ted/packages-auth 依赖**

在 `apps/web-blog/package.json` 的 dependencies 中添加：
```json
"@rx-ted/packages-auth": "workspace:^",
```

- [ ] **Step 2: 重写 stores/session.ts**

保留 web-blog 现有的全部业务方法（register、email code、SSO、profile），但将 token 存储从 localStorage 切换到 tokenStorage，并添加 refresh 能力。关键改动：

1. 顶部导入替换：
```typescript
import { tokenStorage, refreshHandler } from '@rx-ted/packages-auth';
import type { AuthUser } from '@rx-ted/packages-auth';
```

2. `token` ref 初始化从 `storage.get(STORAGE_KEYS.AUTH_TOKEN, '')` 改为 `tokenStorage.token`：
```typescript
const token = ref<string | null>(tokenStorage.token);
```

3. 添加 tokenStorage 订阅以支持多标签同步：
```typescript
onMounted(() => {
  unsubscribe = tokenStorage.subscribe((t) => { token.value = t; });
});
onUnmounted(() => unsubscribe?.());
```

4. 所有 `storage.set(STORAGE_KEYS.AUTH_TOKEN, value)` 替换为 `tokenStorage.token = value`

5. 所有 `storage.remove(STORAGE_KEYS.AUTH_TOKEN)` 替换为 `tokenStorage.token = null`

6. 修改 `clearSession`：添加 `tokenStorage.token = null`

7. bootstrap 中尝试 silent refresh 当 tokenStorage.token 为空时

具体 diff 参照现有 `stores/session.ts` 做上述替换。

- [ ] **Step 3: 提交**

```bash
git add apps/web-blog/package.json apps/web-blog/src/stores/session.ts
git commit -m "feat(web-blog): migrate session store to use tokenStorage from packages/auth"
```

---

### Task 8: web-blog HTTP 层接入 AuthProvider

**Files:**
- Modify: `apps/web-blog/src/http/index.ts`

- [ ] **Step 1: 重写 http/index.ts**

当前 `http/index.ts` 使用 `onRequest` 拦截器从 session store 获取 token，使用 `onError` 拦截器处理 401。将其替换为通过 `setAuthProvider` 使用共享客户端的内置 auth 系统：

```typescript
import { setAuthProvider } from '@rx-ted/packages-http-client';
import { tokenStorage, refreshHandler, createAuthProvider } from '@rx-ted/packages-auth';
import { createHttpClient, httpConfig } from './client';
import type { HttpRequestConfig, ApiResponse } from './types';

// Register auth provider BEFORE creating the client
setAuthProvider(createAuthProvider({
  tokenStorage,
  refreshHandler,
  baseUrl: httpConfig.baseURL,
  onAuthFailure: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
}));

export const http = createHttpClient(httpConfig, {
  cache: true,
  dedupe: true,
  trace: true,
  retry: { maxRetries: 1, baseDelay: 1000 },
});

export type { HttpRequestConfig, ApiResponse };
```

移除原有的 `onRequest` 和 `onError` 回调，因为这些功能已由共享客户端的 `AuthProvider` 自动处理。

- [ ] **Step 2: 提交**

```bash
git add apps/web-blog/src/http/index.ts
git commit -m "feat(web-blog): use shared AuthProvider instead of custom interceptor"
```

---

### Task 9: web-blog router 更新

**Files:**
- Modify: `apps/web-blog/src/router/index.ts`

- [ ] **Step 1: 更新 router/index.ts**

检查 router 中 session store 的使用方式。现有代码应该已经通过 `useSessionStore()` 获取 store，迁移后 token 变为 `string | null`（而不是 `string`），确保 `isAuthenticated` computed 属性正常工作。

如果 router 中有直接引用 `store.token` 的逻辑，确保兼容 `null`。通常改动很小或不需要改动。

- [ ] **Step 2: 提交**

```bash
git add apps/web-blog/src/router/index.ts
git commit -m "fix(web-blog): update router for nullable token"
```

---

### Task 10: web-admin 添加依赖

**Files:**
- Modify: `apps/web-admin/package.json`

- [ ] **Step 1: 添加依赖**

在 `apps/web-admin/package.json` 的 dependencies 中添加：
```json
"@rx-ted/packages-auth": "workspace:^",
"@rx-ted/packages-http-client": "workspace:^",
```

- [ ] **Step 2: 提交**

```bash
git add apps/web-admin/package.json
git commit -m "chore(web-admin): add packages-auth and packages-http-client deps"
```

---

### Task 11: web-admin HTTP 层迁移

**Files:**
- Modify: `apps/web-admin/src/http/client.ts`
- Create: `apps/web-admin/src/http/index.ts`
- Delete: `apps/web-admin/src/utils/token.ts`
- Delete: `apps/web-admin/src/utils/token.spec.ts`

- [ ] **Step 1: 重写 http/client.ts** 为使用 @rx-ted/packages-http-client

```typescript
import { createHttpClient } from '@rx-ted/packages-http-client';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const http = createHttpClient({
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
```

- [ ] **Step 2: 新建 http/index.ts**

```typescript
import { setAuthProvider } from '@rx-ted/packages-http-client';
import { tokenStorage, refreshHandler, createAuthProvider } from '@rx-ted/packages-auth';
import { http, BASE_URL } from './client';

setAuthProvider(createAuthProvider({
  tokenStorage,
  refreshHandler,
  baseUrl: BASE_URL,
  onAuthFailure: () => {
    window.location.href = '/login';
  },
}));

export { http };
```

- [ ] **Step 3: 移除 utils/token.ts 和 utils/token.spec.ts**

删除 `apps/web-admin/src/utils/token.ts` 和 `apps/web-admin/src/utils/token.spec.ts`。

- [ ] **Step 4: 提交**

```bash
git rm apps/web-admin/src/utils/token.ts apps/web-admin/src/utils/token.spec.ts
git add apps/web-admin/src/http/client.ts apps/web-admin/src/http/index.ts
git commit -m "feat(web-admin): migrate HTTP client to @rx-ted/packages-http-client with AuthProvider"
```

---

### Task 12: web-admin session store 迁移

**Files:**
- Modify: `apps/web-admin/src/stores/session.ts`

- [ ] **Step 1: 重写 stores/session.ts**

web-admin 的 session store 较简单（只有 login、logout、fetchMe、bootstrap），直接用 createAuthStore：

```typescript
import { createAuthStore } from '@rx-ted/packages-auth';

export const useSessionStore = createAuthStore('session');
```

- [ ] **Step 2: 提交**

```bash
git add apps/web-admin/src/stores/session.ts
git commit -m "feat(web-admin): migrate session store to createAuthStore"
```

---

### Task 13: web-admin router + LoginPage 适配

**Files:**
- Modify: `apps/web-admin/src/router/index.ts`
- Modify: `apps/web-admin/src/pages/LoginPage.vue`

- [ ] **Step 1: 更新 router/index.ts**

将 router guard 中的 `getToken()`（来自 `utils/token.ts`）改为使用 session store：

```typescript
import { useSessionStore } from '../stores/session';

router.beforeEach((to) => {
  const session = useSessionStore();
  if (to.name !== 'login' && !session.isAuthenticated) {
    return { name: 'login' };
  }
});
```

- [ ] **Step 2: 更新 LoginPage.vue**

确保 login page 中的 `session.login()` 调用与新 store 兼容。新的 `login()` 方法接收 `{ username, password }` 对象而非两个独立参数。更新调用方式：

```typescript
// 之前:
await session.login(username.value, password.value);
// 之后:
await session.login({ username: username.value, password: password.value });
```

- [ ] **Step 3: 提交**

```bash
git add apps/web-admin/src/router/index.ts apps/web-admin/src/pages/LoginPage.vue
git commit -m "fix(web-admin): update router and LoginPage for new session store API"
```

---

### Task 14: 后端清理 — 移除 tokenVersion 降级

**Files:**
- Modify: `apps/platform-api/src/common/guards/auth.guard.ts`

- [ ] **Step 1: 移除 tokenVersion backward compat 分支**

在 `auth.guard.ts` 中，将：
```typescript
    } else {
      // backward compat: old token without sessionId -> tokenVersion check
      if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
        throw new HTTPException(401, { message: 'Token has been invalidated' });
      }
    }
```
改为：
```typescript
    }
```

即删除整个 `else` 分支。所有客户端现在都使用 sessionId。

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/common/guards/auth.guard.ts
git commit -m "feat(platform-api): remove tokenVersion backward compat branch — all tokens now have sessionId"
```

---

### Task 15: 最终验证

- [ ] **Step 1: 安装依赖**

```bash
pnpm install
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @rx-ted/packages-auth typecheck
pnpm --filter @rx-ted/web-blog typecheck
pnpm --filter @rx-ted/web-admin typecheck
pnpm --filter @rx-ted/platform-api typecheck
```

- [ ] **Step 3: 运行测试**

```bash
pnpm --filter @rx-ted/packages-auth test
pnpm --filter @rx-ted/web-blog test
pnpm --filter @rx-ted/web-admin test
pnpm --filter @rx-ted/platform-api test
```
