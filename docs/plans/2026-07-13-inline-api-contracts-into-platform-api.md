# Inline API Contracts into Platform API

> **Status: IMPLEMENTED** — API contracts 已内联到 platform-api 的 dtos/ 中。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all Zod schemas from `packages/api-contracts/src/` into the corresponding `apps/platform-api/src/modules/*/dtos/` files, then remove the `@rx-ted/api-contracts` dependency from platform-api.

**Architecture:** Each api-contracts source file becomes the content of the corresponding module's `*.schema.ts` file. The `*.request.dto.ts` and `*.response.dto.ts` files re-export from the local `*.schema.ts` instead of from `@rx-ted/api-contracts`. For modules with split contract files (auth has 3, blog/search/notification have 2 each), merge into a single `*.schema.ts`. The `@rx-ted/api-contracts` package remains for `web-blog` which still depends on it.

**Tech Stack:** Zod v4, TypeScript, pnpm workspaces

---

## File Mapping

| api-contracts file(s) | Target module | Target schema file |
|---|---|---|
| `auth.ts` | auth | `auth.schema.ts` |
| `auth-email.ts` | auth | `auth-email.schema.ts` |
| `auth-response.ts` | auth | `auth-response.schema.ts` (NEW) |
| `user.ts` | user | `user.schema.ts` |
| `post.ts` | post | `post.schema.ts` |
| `post-stats.ts` | post-stats | `post-stats.schema.ts` |
| `comment.ts` | comment | `comment.schema.ts` |
| `tags.ts` | tags | `tags.schema.ts` |
| `category.ts` | category | `category.schema.ts` |
| `announcement.ts` | announcement | `announcement.schema.ts` |
| `friend-link.ts` | friend-link | `friend-link.schema.ts` |
| `role.ts` | role | `role.schema.ts` |
| `permission.ts` | permission | `permission.schema.ts` |
| `permission-request.ts` | permission-request | `permission-request.schema.ts` |
| `admin-permission.ts` | admin-permission | `admin-permission.schema.ts` |
| `blog-request.ts` | blog | `blog-request.schema.ts` (NEW) |
| `blog-response.ts` | blog | `blog-response.schema.ts` (NEW) |
| `search-request.ts` | search | `search-request.schema.ts` (NEW) |
| `search-response.ts` | search | `search-response.schema.ts` (NEW) |
| `notification.ts` | notification | `notification.schema.ts` |
| `notification-response.ts` | notification | `notification-response.schema.ts` (NEW) |
| `audit.ts` | audit | `audit.schema.ts` |
| `author-stats.ts` | author-stats | `author-stats.schema.ts` |

---

## Task 1: Inline simple single-file modules (auth, user, post, tags, category, announcement, friend-link, role, permission, admin-permission, comment, post-stats, audit, author-stats)

For each module, the `.schema.ts` file gets the full schema content from the api-contracts source. The `.request.dto.ts` and `.response.dto.ts` files change their imports from `@rx-ted/api-contracts/<module>` to `./<module>.schema.js`.

**Files to modify (14 schema files → replace content):**
- `apps/platform-api/src/modules/auth/dtos/auth.schema.ts`
- `apps/platform-api/src/modules/auth/dtos/auth-email.schema.ts`
- `apps/platform-api/src/modules/user/dtos/user.schema.ts`
- `apps/platform-api/src/modules/post/dtos/post.schema.ts`
- `apps/platform-api/src/modules/tags/dtos/tags.schema.ts`
- `apps/platform-api/src/modules/category/dtos/category.schema.ts`
- `apps/platform-api/src/modules/announcement/dtos/announcement.schema.ts`
- `apps/platform-api/src/modules/friend-link/dtos/friend-link.schema.ts`
- `apps/platform-api/src/modules/role/dtos/role.schema.ts`
- `apps/platform-api/src/modules/permission/dtos/permission.schema.ts`
- `apps/platform-api/src/modules/permission-request/dtos/permission-request.schema.ts`
- `apps/platform-api/src/modules/admin-permission/dtos/admin-permission.schema.ts`
- `apps/platform-api/src/modules/comment/dtos/comment.schema.ts`
- `apps/platform-api/src/modules/post-stats/dtos/post-stats.schema.ts`
- `apps/platform-api/src/modules/audit/dtos/audit.schema.ts`
- `apps/platform-api/src/modules/author-stats/dtos/author-stats.schema.ts`

**Files to modify (request/response dto files → change imports):**
- All `*.request.dto.ts` files: change `from '@rx-ted/api-contracts/...'` → `from './<module>.schema.js'`
- All `*.response.dto.ts` files: change `from '@rx-ted/api-contracts/...'` → `from './<module>.schema.js'`
- `apps/platform-api/src/modules/auth/auth.do.ts`: change import from `@rx-ted/api-contracts/auth-response` → `./dtos/auth-response.schema.js`

### Steps

- [ ] **Step 1: Inline auth schemas**

Write `apps/platform-api/src/modules/auth/dtos/auth.schema.ts` with content from `packages/api-contracts/src/auth.ts`:

```ts
import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const PasswordRegister = z.object({
  login_type: z.literal('password'),
  username: z.string().min(3).max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.email().optional(),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const EmailRegister = z.object({
  login_type: z.literal('email'),
  email: z.email(),
  code: z.string().length(6),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const GoogleRegister = z.object({
  login_type: z.literal('google'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const GithubRegister = z.object({
  login_type: z.literal('github'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

const WechatRegister = z.object({
  login_type: z.literal('wechat'),
  code: z.string().min(1),
  username: z.string().min(3).max(50).optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
  nickname: z.string().max(100).optional(),
  avatar_url: z.string().max(1024).optional(),
  bio: z.string().optional(),
  location: z.string().max(100).optional(),
});

export const RegisterSchema = z.discriminatedUnion('login_type', [
  PasswordRegister,
  EmailRegister,
  GoogleRegister,
  GithubRegister,
  WechatRegister,
]);

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
```

Write `apps/platform-api/src/modules/auth/dtos/auth-email.schema.ts` with content from `packages/api-contracts/src/auth-email.ts`:

```ts
import { z } from 'zod';

export const SendEmailCodeSchema = z.object({
  email: z.email(),
  purpose: z.enum(['login', 'register', 'reset']),
  locale: z.enum(['zh-CN', 'en']).optional().default('zh-CN'),
});

export const EmailLoginSchema = z.object({
  email: z.email(),
  code: z.string().length(6),
});

export const EmailResetPasswordSchema = z.object({
  email: z.email(),
  code: z.string().length(6),
  password: z.string().min(6),
});

export type SendEmailCodeInput = z.infer<typeof SendEmailCodeSchema>;
export type EmailLoginInput = z.infer<typeof EmailLoginSchema>;
export type EmailResetPasswordInput = z.infer<typeof EmailResetPasswordSchema>;
```

Create `apps/platform-api/src/modules/auth/dtos/auth-response.schema.ts` with content from `packages/api-contracts/src/auth-response.ts`:

```ts
import { z } from 'zod';

export const UserProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  tokenVersion: z.number(),
  lastLoginAt: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  gender: z.enum(['Male', 'Female', 'Unknown']).nullable(),
  birthday: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserSelfResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable(),
});

export const UserProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  github_connected: z.boolean(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export const UserPublicProfileResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  github_connected: z.boolean(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updated_at: z.string().nullable(),
  created_at: z.string(),
});

export const UserAdminResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  preferred_locale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable(),
  login_type: z.literal('password'),
});

export type UserSelfResponse = z.infer<typeof UserSelfResponseSchema>;
export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
export type UserPublicProfileResponse = z.infer<typeof UserPublicProfileResponseSchema>;
export type UserAdminResponse = z.infer<typeof UserAdminResponseSchema>;
```

- [ ] **Step 2: Inline user, post, post-stats, tags, category schemas**

Write each `.schema.ts` with the exact content from the corresponding api-contracts source file. The content is identical to what was shown in the api-contracts source (see the contract files above — `user.ts`, `post.ts`, `post-stats.ts`, `tags.ts`, `category.ts`).

- [ ] **Step 3: Inline announcement, friend-link, role, permission, permission-request, admin-permission schemas**

Write each `.schema.ts` with the exact content from the corresponding api-contracts source file.

- [ ] **Step 4: Inline comment schema**

Write `apps/platform-api/src/modules/comment/dtos/comment.schema.ts` with the full content from `packages/api-contracts/src/comment.ts` (includes the `CommentVO` interface and recursive `CommentSchema`).

- [ ] **Step 5: Inline audit, author-stats schemas**

Write each `.schema.ts` with the exact content from the corresponding api-contracts source file.

- [ ] **Step 6: Create notification-response.schema.ts**

Create `apps/platform-api/src/modules/notification/dtos/notification-response.schema.ts` with content from `packages/api-contracts/src/notification-response.ts`:

```ts
import { z } from 'zod';

export const NotificationResponseSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.string(),
});

export const NotificationSummaryResponseSchema = z.object({
  unreadCount: z.number(),
  recent: z.array(NotificationResponseSchema),
});

export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;
export type NotificationSummaryResponse = z.infer<typeof NotificationSummaryResponseSchema>;
export type NotificationResponseDto = NotificationResponse;
export type NotificationSummaryResponseDto = NotificationSummaryResponse;
```

Write `apps/platform-api/src/modules/notification/dtos/notification.schema.ts` with content from `packages/api-contracts/src/notification.ts`:

```ts
import { z } from 'zod';

export const NotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const MarkReadParamsSchema = z.object({
  id: z.string(),
});

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
```

- [ ] **Step 7: Create blog-request.schema.ts and blog-response.schema.ts**

Create `apps/platform-api/src/modules/blog/dtos/blog-request.schema.ts` with content from `packages/api-contracts/src/blog-request.ts`.

Create `apps/platform-api/src/modules/blog/dtos/blog-response.schema.ts` with content from `packages/api-contracts/src/blog-response.ts`.

- [ ] **Step 8: Create search-request.schema.ts and search-response.schema.ts**

Create `apps/platform-api/src/modules/search/dtos/search-request.schema.ts` with content from `packages/api-contracts/src/search-request.ts`.

Create `apps/platform-api/src/modules/search/dtos/search-response.schema.ts` with content from `packages/api-contracts/src/search-response.ts`.

- [ ] **Step 9: Update all request.dto.ts files to import from local schema files**

For each `*.request.dto.ts`, replace `from '@rx-ted/api-contracts/...'` with `from './<module>.schema'`. The specific mappings:

| File | Old import source | New import source |
|---|---|---|
| `permission/dtos/permission.request.dto.ts` | `@rx-ted/api-contracts/permission` | `./permission.schema` |
| `announcement/dtos/announcement.request.dto.ts` | `@rx-ted/api-contracts/announcement` | `./announcement.schema` |
| `audit/dtos/audit.request.dto.ts` | `@rx-ted/api-contracts/audit` | `./audit.schema` |
| `author-stats/dtos/author-stats.request.dto.ts` | `@rx-ted/api-contracts/author-stats` | `./author-stats.schema` |
| `blog/dtos/blog.request.dto.ts` | `@rx-ted/api-contracts/blog-request` | `./blog-request.schema` |
| `category/dtos/category.request.dto.ts` | `@rx-ted/api-contracts/category` | `./category.schema` |
| `comment/dtos/comment.request.dto.ts` | `@rx-ted/api-contracts/comment` | `./comment.schema` |
| `friend-link/dtos/friend-link.request.dto.ts` | `@rx-ted/api-contracts/friend-link` | `./friend-link.schema` |
| `notification/dtos/notification.request.dto.ts` | `@rx-ted/api-contracts/notification` | `./notification.schema` |
| `permission-request/dtos/permission-request.request.dto.ts` | `@rx-ted/api-contracts/permission-request` | `./permission-request.schema` |
| `post-stats/dtos/post-stats.request.dto.ts` | `@rx-ted/api-contracts/post-stats` | `./post-stats.schema` |
| `role/dtos/role.request.dto.ts` | `@rx-ted/api-contracts/role` | `./role.schema` |
| `search/dtos/search.request.dto.ts` | `@rx-ted/api-contracts/search-request` | `./search-request.schema` |
| `tags/dtos/tags.request.dto.ts` | `@rx-ted/api-contracts/tags` | `./tags.schema` |

- [ ] **Step 10: Update all response.dto.ts files to import from local schema files**

| File | Old import source | New import source |
|---|---|---|
| `permission/dtos/permission.response.dto.ts` | `@rx-ted/api-contracts/permission` | `./permission.schema` |
| `announcement/dtos/announcement.response.dto.ts` | `@rx-ted/api-contracts/announcement` | `./announcement.schema` |
| `audit/dtos/audit.response.dto.ts` | `@rx-ted/api-contracts/audit` | `./audit.schema` |
| `author-stats/dtos/author-stats.response.dto.ts` | `@rx-ted/api-contracts/author-stats` | `./author-stats.schema` |
| `blog/dtos/blog.response.dto.ts` | `@rx-ted/api-contracts/blog-response` | `./blog-response.schema` |
| `category/dtos/category.response.dto.ts` | `@rx-ted/api-contracts/category` | `./category.schema` |
| `comment/dtos/comment.response.dto.ts` | `@rx-ted/api-contracts/comment` | `./comment.schema` |
| `friend-link/dtos/friend-link.response.dto.ts` | `@rx-ted/api-contracts/friend-link` | `./friend-link.schema` |
| `notification/dtos/notification.response.dto.ts` | `@rx-ted/api-contracts/notification-response` | `./notification-response.schema` |
| `permission-request/dtos/permission-request.response.dto.ts` | `@rx-ted/api-contracts/permission-request` | `./permission-request.schema` |
| `post-stats/dtos/post-stats.response.dto.ts` | `@rx-ted/api-contracts/post-stats` | `./post-stats.schema` |
| `role/dtos/role.response.dto.ts` | `@rx-ted/api-contracts/role` | `./role.schema` |
| `search/dtos/search.response.dto.ts` | `@rx-ted/api-contracts/search-response` | `./search-response.schema` |
| `tags/dtos/tags.response.dto.ts` | `@rx-ted/api-contracts/tags` | `./tags.schema` |

- [ ] **Step 11: Update auth.do.ts**

Change `apps/platform-api/src/modules/auth/auth.do.ts` line 1:
```ts
// FROM:
export { UserProfileSchema, type UserProfile } from '@rx-ted/api-contracts/auth-response';
// TO:
export { UserProfileSchema, type UserProfile } from './dtos/auth-response.schema';
```

- [ ] **Step 12: Remove @rx-ted/api-contracts from platform-api package.json**

Remove `"@rx-ted/api-contracts": "workspace:^",` from `apps/platform-api/package.json` dependencies.

- [ ] **Step 13: Run pnpm install to update lockfile**

```bash
pnpm install
```

- [ ] **Step 14: Run typecheck for platform-api**

```bash
pnpm --filter @rx-ted/platform-api typecheck
```

Fix any type errors.

- [ ] **Step 15: Run typecheck for web-blog**

```bash
pnpm --filter @rx-ted/web-blog typecheck
```

Ensure web-blog still works (it still imports from `@rx-ted/api-contracts`).

- [ ] **Step 16: Run tests**

```bash
pnpm --filter @rx-ted/platform-api test
```

- [ ] **Step 17: Commit**

```bash
git add apps/platform-api/
git commit -m "refactor(platform-api): inline api-contracts schemas into module dtos"
```
