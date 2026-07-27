# Shared API Contracts (Zod Package) Implementation Plan

> **Status: NOT IMPLEMENTED** — `packages/api-contracts` 从未被创建。API 契约已内联在 platform-api 的 dtos/ 中。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate type drift between backend and frontend by extracting all API request/response Zod schemas into a shared `packages/api-contracts` package, making the frontend use `z.infer<typeof Schema>` instead of manually maintained mirror types.

**Architecture:** Create `@rx-ted/api-contracts` as a thin package containing only Zod schemas and their inferred types. Backend imports schemas directly for validation. Frontend imports schemas and derives types via `z.infer`. The existing backend `dtos/*.schema.ts` files become re-export shims for backward compatibility. Response TS interfaces in the backend are replaced with `z.infer<typeof Schema>`.

**Tech Stack:** Zod 4, TypeScript 6, tsup, vitest

---

## Scope

### What moves to `packages/api-contracts`:
- **19 schema files** from `apps/platform-api/src/modules/*/dtos/*.schema.ts`
- **6 response Zod schemas** from `blog.response.dto.ts`, `search.response.dto.ts`, `notification.response.dto.ts`, `auth.do.ts`
- **2 response Zod schemas** from `comment.request.dto.ts` (re-exports only)

### What gets deleted from frontend:
- `apps/web-blog/src/types/blog.ts` (150 lines → replaced by blog schemas)
- `apps/web-blog/src/types/community.ts` (88 lines → replaced by auth + comment schemas)
- `apps/web-blog/src/types/commentThread.ts` (35 lines → stays, no backend equivalent)
- `apps/web-blog/src/types/announcement.ts` (51 lines → stays, pure UI type, no backend equivalent)

### What stays in backend (re-export shims):
- All `dtos/*.schema.ts` files become 1-line re-exports from `@rx-ted/api-contracts`
- All `dtos/*.request.dto.ts` / `dtos/*.response.dto.ts` TS interfaces are deleted, replaced by `z.infer` exports from the shared package

---

## File Structure

```
packages/api-contracts/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── src/
│   ├── index.ts                    # Barrel re-export of all modules
│   ├── auth.ts                     # LoginSchema, RegisterSchema, etc.
│   ├── auth-email.ts               # SendEmailCodeSchema, EmailLoginSchema, etc.
│   ├── auth-response.ts            # UserProfileSchema (moved from auth.do.ts)
│   ├── blog-request.ts             # BlogSearchQuerySchema, BlogAuthorQuerySchema
│   ├── blog-response.ts            # BlogPostItemSchema, BlogHomeResponseSchema, etc.
│   ├── post.ts                     # CreatePostSchema, UpdatePostSchema, PostListQuerySchema
│   ├── comment.ts                  # CreateCommentSchema, CommentPageQuerySchema, etc.
│   ├── tags.ts                     # CreateTagSchema, TagsListQuerySchema
│   ├── category.ts                 # CreateCategorySchema, UpdateCategorySchema
│   ├── announcement.ts             # CreateAnnouncementSchema, AnnouncementListQuerySchema
│   ├── role.ts                     # CreateRoleSchema, RoleListQuerySchema
│   ├── user.ts                     # UpdateProfileSchema, UserListQuerySchema
│   ├── permission.ts               # CreatePermissionSchema, PermissionListQuerySchema
│   ├── permission-request.ts       # CreatePermissionRequestSchema, etc.
│   ├── search-request.ts           # SearchQuerySchema
│   ├── search-response.ts          # SearchResponseDtoSchema, SearchPostItemSchema, etc.
│   ├── notification.ts             # NotificationListQuerySchema
│   ├── notification-response.ts    # NotificationResponseSchema, NotificationSummaryResponseSchema
│   ├── audit.ts                    # AuditListQuerySchema
│   ├── admin-permission.ts         # GrantPermissionsSchema, RevokePermissionsSchema
│   ├── author-stats.ts             # AuthorStatsQuerySchema
│   ├── post-stats.ts               # PostStatsParamsSchema
│   └── friend-link.ts              # CreateFriendLinkSchema, UpdateFriendLinkSchema
```

---

## Task 1: Scaffold `packages/api-contracts`

**Files:**
- Create: `packages/api-contracts/package.json`
- Create: `packages/api-contracts/tsconfig.json`
- Create: `packages/api-contracts/tsup.config.ts`
- Create: `packages/api-contracts/src/index.ts`
- Modify: `pnpm-workspace.yaml` (add `"packages/api-contracts"`)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@rx-ted/api-contracts",
  "version": "0.1.0",
  "type": "module",
  "description": "Shared Zod schemas for API request/response contracts.",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "author": "rx-ted",
  "license": "MIT",
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": false,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "ignoreDeprecations": "6.0"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  skipNodeModulesExternal: true,
});
```

- [ ] **Step 4: Create empty barrel src/index.ts**

```ts
export {};
```

- [ ] **Step 5: Register in pnpm-workspace.yaml**

Add `"packages/api-contracts"` to the `packages:` list.

- [ ] **Step 6: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 7: Verify build**

```bash
pnpm --filter @rx-ted/api-contracts build
```

Expected: Clean build, `dist/index.js` and `dist/index.d.ts` created.

- [ ] **Step 8: Commit**

```bash
git add packages/api-contracts/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(api-contracts): scaffold shared Zod contracts package"
```

---

## Task 2: Move Auth + User Schemas

**Files:**
- Create: `packages/api-contracts/src/auth.ts`
- Create: `packages/api-contracts/src/auth-email.ts`
- Create: `packages/api-contracts/src/auth-response.ts`
- Create: `packages/api-contracts/src/user.ts`
- Modify: `apps/platform-api/src/modules/auth/dtos/auth.schema.ts` (re-export shim)
- Modify: `apps/platform-api/src/modules/auth/dtos/auth-email.schema.ts` (re-export shim)
- Modify: `apps/platform-api/src/modules/auth/auth.do.ts` (re-export shim)
- Modify: `apps/platform-api/src/modules/user/dtos/user.schema.ts` (re-export shim)

- [ ] **Step 1: Create `packages/api-contracts/src/auth.ts`**

Copy exact content from `apps/platform-api/src/modules/auth/dtos/auth.schema.ts` (lines 1-73), but:
- Remove the `z.infer` type exports (they'll be re-exported from the barrel)
- Keep `import { z } from 'zod';`

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

- [ ] **Step 2: Create `packages/api-contracts/src/auth-email.ts`**

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

- [ ] **Step 3: Create `packages/api-contracts/src/auth-response.ts`**

Move `UserProfileSchema` from `auth.do.ts`. Hardcode `LOCALE` values instead of importing the constant.

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

- [ ] **Step 4: Create `packages/api-contracts/src/user.ts`**

```ts
import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional(),
  location: z.string().max(100).optional(),
  gender: z.enum(['Male', 'Female', 'Unknown']).optional(),
  birthday: z.string().optional(),
  preferred_locale: z.enum(['zh-CN', 'en']).optional(),
});

export const UpdateEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
});

export const PublicProfileParamsSchema = z.object({
  username: z.string().min(1).max(50),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type PublicProfileParams = z.infer<typeof PublicProfileParamsSchema>;
```

- [ ] **Step 5: Convert backend re-export shims**

Replace `apps/platform-api/src/modules/auth/dtos/auth.schema.ts` with:

```ts
export {
  LoginSchema,
  RegisterSchema,
  type LoginInput,
  type RegisterInput,
} from '@rx-ted/api-contracts/auth';
```

Replace `apps/platform-api/src/modules/auth/dtos/auth-email.schema.ts` with:

```ts
export {
  SendEmailCodeSchema,
  EmailLoginSchema,
  EmailResetPasswordSchema,
  type SendEmailCodeInput,
  type EmailLoginInput,
  type EmailResetPasswordInput,
} from '@rx-ted/api-contracts/auth-email';
```

Replace `apps/platform-api/src/modules/auth/auth.do.ts` with:

```ts
export { UserProfileSchema, type UserProfile } from '@rx-ted/api-contracts/auth-response';

import { LOCALE } from '@/constants';

export interface UserProfileInput {
  userId: string;
  username: string;
  email: string | null;
  preferredLocale: 'zh-CN' | 'en';
  status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
  tokenVersion: number;
  lastLoginAt: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  gender: 'Male' | 'Female' | 'Unknown' | null;
  birthday: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
}

export function toUserProfile(input: UserProfileInput) {
  return {
    id: input.userId,
    username: input.username,
    email: input.email,
    preferredLocale: input.preferredLocale ?? LOCALE.DEFAULT,
    status: input.status,
    tokenVersion: input.tokenVersion,
    lastLoginAt: input.lastLoginAt,
    nickname: input.nickname ?? input.username,
    avatarUrl: input.avatarUrl ?? null,
    gender: input.gender ?? null,
    birthday: input.birthday ?? null,
    bio: input.bio ?? null,
    website: input.website ?? null,
    location: input.location ?? null,
  };
}
```

Replace `apps/platform-api/src/modules/user/dtos/user.schema.ts` with:

```ts
export {
  UpdateProfileSchema,
  UpdateEmailSchema,
  UserListQuerySchema,
  PublicProfileParamsSchema,
  type UpdateProfileInput,
  type UpdateEmailInput,
  type UserListQuery,
  type PublicProfileParams,
} from '@rx-ted/api-contracts/user';
```

- [ ] **Step 6: Update barrel index**

Update `packages/api-contracts/src/index.ts`:

```ts
export * from './auth.js';
export * from './auth-email.js';
export * from './auth-response.js';
export * from './user.js';
```

- [ ] **Step 7: Build and typecheck**

```bash
pnpm --filter @rx-ted/api-contracts build
pnpm --filter @rx-ted/platform-api typecheck
```

Expected: Both pass clean.

- [ ] **Step 8: Commit**

```bash
git add packages/api-contracts/ apps/platform-api/src/modules/auth/ apps/platform-api/src/modules/user/
git commit -m "feat(api-contracts): add auth, user, and auth-response schemas"
```

---

## Task 3: Move Post + Comment Schemas

**Files:**
- Create: `packages/api-contracts/src/post.ts`
- Create: `packages/api-contracts/src/comment.ts`
- Modify: `apps/platform-api/src/modules/post/dtos/post.schema.ts` (re-export shim)
- Modify: `apps/platform-api/src/modules/comment/dtos/comment.schema.ts` (re-export shim)
- Modify: `apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts` (re-export shim)

- [ ] **Step 1: Create `packages/api-contracts/src/post.ts`**

```ts
import { z } from 'zod';

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  cover_image: z.string().optional().nullable(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  content_md: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
});

export const UpdatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  cover_image: z.string().optional().nullable(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  content_md: z.string().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
});

export const PostListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type PostListQuery = z.infer<typeof PostListQuerySchema>;
```

- [ ] **Step 2: Create `packages/api-contracts/src/comment.ts`**

```ts
import { z } from 'zod';

export const CreateCommentSchema = z
  .object({
    postId: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'postId must be a valid positive number',
      })
      .optional(),
    tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
    parentId: z.string().nullable().optional(),
    content: z.string().min(1, '评论内容不能为空'),
    guestName: z.string().min(1).max(100).optional(),
    guestEmail: z.string().email().optional(),
    guestWebsite: z.string().url().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.tag === 'post' && !data.postId) return false;
      return true;
    },
    { message: 'postId is required when tag is post', path: ['postId'] },
  )
  .refine(
    (data) => {
      if (data.guestName && !data.guestEmail) return false;
      return true;
    },
    { message: 'guestEmail is required when guestName is provided', path: ['guestEmail'] },
  );

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

export const CommentPageQuerySchema = z
  .object({
    tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
    postId: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'postId must be a valid positive number',
      })
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    sort: z.enum(['newest', 'hottest']).default('newest'),
  })
  .refine(
    (data) => {
      if (data.tag === 'post' && !data.postId) return false;
      return true;
    },
    { message: 'postId is required when tag is post', path: ['postId'] },
  );

export const ReplyPageQuerySchema = z.object({
  parentId: z.coerce.number().int().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const CreateReportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
  description: z.string().max(500).optional(),
});

export const ResolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  action: z.enum(['delete_comment']).optional(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type CommentPageQuery = z.infer<typeof CommentPageQuerySchema>;
export type ReplyPageQuery = z.infer<typeof ReplyPageQuerySchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;
```

Also add comment response schemas (from `apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts`):

```ts
// Append to packages/api-contracts/src/comment.ts:

export const AuthorBriefSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  level: z.number(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  joinDate: z.string(),
  followerCount: z.number(),
  followingCount: z.number(),
  likeReceivedCount: z.number(),
  isFollowed: z.boolean(),
});

// Recursive schema for CommentVO
export const CommentSchema: z.ZodType<CommentVO> = z.lazy(() =>
  z.object({
    id: z.number(),
    postId: z.number().nullable(),
    tag: z.enum(['post', 'guestbook', 'friends', 'about']),
    parentId: z.number().nullable(),
    content: z.string(),
    likes: z.number(),
    status: z.enum(['NORMAL', 'DELETED']),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    author: AuthorBriefSchema,
    isLiked: z.boolean(),
    replyCount: z.number(),
    replies: z
      .object({
        total: z.number(),
        list: z.array(CommentSchema),
      })
      .optional(),
  }),
);

export const CommentPageResultSchema = z.object({
  data: z.array(CommentSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const LikeToggleResultSchema = z.object({
  isLiked: z.boolean(),
  likes: z.number(),
});

export const CommentReportSchema = z.object({
  id: z.number(),
  commentId: z.number(),
  commentContent: z.string(),
  reporter: z.object({ id: z.string(), username: z.string() }),
  reason: z.string(),
  description: z.string().nullable(),
  status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']),
  createdAt: z.string(),
});

export const CommentReportPageResultSchema = z.object({
  data: z.array(CommentReportSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type AuthorBrief = z.infer<typeof AuthorBriefSchema>;
export type CommentVO = z.infer<typeof CommentSchema>;
export type CommentPageResult = z.infer<typeof CommentPageResultSchema>;
export type LikeToggleResult = z.infer<typeof LikeToggleResultSchema>;
export type CommentReport = z.infer<typeof CommentReportSchema>;
export type CommentReportPageResult = z.infer<typeof CommentReportPageResultSchema>;
```

- [ ] **Step 3: Convert backend re-export shims**

Replace `apps/platform-api/src/modules/post/dtos/post.schema.ts` with:

```ts
export {
  CreatePostSchema,
  UpdatePostSchema,
  PostListQuerySchema,
  type CreatePostInput,
  type UpdatePostInput,
  type PostListQuery,
} from '@rx-ted/api-contracts/post';
```

Replace `apps/platform-api/src/modules/comment/dtos/comment.schema.ts` with:

```ts
export {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentPageQuerySchema,
  ReplyPageQuerySchema,
  CreateReportSchema,
  ResolveReportSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type CommentPageQuery,
  type ReplyPageQuery,
  type CreateReportInput,
  type ResolveReportInput,
} from '@rx-ted/api-contracts/comment';
```

Replace `apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts` with:

```ts
export {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentPageQuerySchema,
  ReplyPageQuerySchema,
  CreateReportSchema,
  ResolveReportSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type CommentPageQuery,
  type ReplyPageQuery,
  type CreateReportInput,
  type ResolveReportInput,
} from '@rx-ted/api-contracts/comment';
```

Replace `apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts` with:

```ts
export {
  AuthorBriefSchema,
  CommentSchema,
  CommentPageResultSchema,
  LikeToggleResultSchema,
  CommentReportSchema,
  CommentReportPageResultSchema,
  type AuthorBrief,
  type CommentVO,
  type CommentPageResult,
  type LikeToggleResult,
  type CommentReport,
  type CommentReportPageResult,
} from '@rx-ted/api-contracts/comment';
```

- [ ] **Step 4: Update barrel index**

Update `packages/api-contracts/src/index.ts`:

```ts
export * from './auth.js';
export * from './auth-email.js';
export * from './auth-response.js';
export * from './user.js';
export * from './post.js';
export * from './comment.js';
```

- [ ] **Step 5: Build and typecheck**

```bash
pnpm --filter @rx-ted/api-contracts build
pnpm --filter @rx-ted/platform-api typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/api-contracts/src/ apps/platform-api/src/modules/post/ apps/platform-api/src/modules/comment/
git commit -m "feat(api-contracts): add post and comment schemas"
```

---

## Task 4: Move Tags + Category + Announcement + FriendLink + Role Schemas

**Files:**
- Create: `packages/api-contracts/src/tags.ts`
- Create: `packages/api-contracts/src/category.ts`
- Create: `packages/api-contracts/src/announcement.ts`
- Create: `packages/api-contracts/src/friend-link.ts`
- Create: `packages/api-contracts/src/role.ts`
- Modify: 5 backend re-export shims

- [ ] **Step 1: Create `packages/api-contracts/src/tags.ts`**

```ts
import { z } from 'zod';

export const CreateTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().max(100).optional(),
});

export const UpdateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().max(100).optional(),
});

export const TagsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const TagResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number().optional(),
  createdBy: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateTagInput = z.infer<typeof UpdateTagSchema>;
export type TagsListQuery = z.infer<typeof TagsListQuerySchema>;
export type TagResponse = z.infer<typeof TagResponseSchema>;
```

- [ ] **Step 2: Create `packages/api-contracts/src/category.ts`**

```ts
import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(100).optional(),
  description: z.string().optional(),
});

export const CategoryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  postCount: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;
```

- [ ] **Step 3: Create `packages/api-contracts/src/announcement.ts`**

```ts
import { z } from 'zod';

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  slot: z.enum(['top', 'footer']),
  audiences: z.array(z.string()).default([]),
  original: z.record(z.string(), z.unknown()).optional(),
  translated: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  slot: z.enum(['top', 'footer']).optional(),
  audiences: z.array(z.string()).optional(),
  original: z.record(z.string(), z.unknown()).optional(),
  translated: z.record(z.string(), z.unknown()).optional(),
});

export const AnnouncementListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const AnnouncementResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  slot: z.enum(['top', 'footer']),
  audiences: z.array(z.string()),
  original: z.record(z.string(), z.unknown()).nullable(),
  translated: z.record(z.string(), z.unknown()).nullable(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ActiveAnnouncementsResponseSchema = z.object({
  top: z.array(AnnouncementResponseSchema),
  footer: z.array(AnnouncementResponseSchema),
  meta: z.object({
    frontend_version: z.string(),
    backend_version: z.string(),
    rotation_interval_ms: z.number(),
    generated_at: z.string(),
  }),
});

export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
export type AnnouncementListQuery = z.infer<typeof AnnouncementListQuerySchema>;
export type AnnouncementResponse = z.infer<typeof AnnouncementResponseSchema>;
export type ActiveAnnouncementsResponse = z.infer<typeof ActiveAnnouncementsResponseSchema>;
```

- [ ] **Step 4: Create `packages/api-contracts/src/friend-link.ts`**

```ts
import { z } from 'zod';

export const CreateFriendLinkSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  logo: z.string().url().max(500).optional(),
  description: z.string().max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateFriendLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(500).optional(),
  logo: z.string().url().max(500).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const FriendLinkResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
  logo: z.string().nullable(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateFriendLinkInput = z.infer<typeof CreateFriendLinkSchema>;
export type UpdateFriendLinkInput = z.infer<typeof UpdateFriendLinkSchema>;
export type FriendLinkResponse = z.infer<typeof FriendLinkResponseSchema>;
```

- [ ] **Step 5: Create `packages/api-contracts/src/role.ts`**

```ts
import { z } from 'zod';

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

export const RoleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const RoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type RoleListQuery = z.infer<typeof RoleListQuerySchema>;
export type RoleResponse = z.infer<typeof RoleResponseSchema>;
```

- [ ] **Step 6: Convert backend re-export shims**

Replace each backend `dtos/*.schema.ts` with a 1-line re-export from `@rx-ted/api-contracts/<module>`. Example for tags:

`apps/platform-api/src/modules/tags/dtos/tags.schema.ts` →

```ts
export {
  CreateTagSchema,
  UpdateTagSchema,
  TagsListQuerySchema,
  type CreateTagInput,
  type UpdateTagInput,
  type TagsListQuery,
} from '@rx-ted/api-contracts/tags';
```

Same pattern for: category.schema.ts, announcement.schema.ts, friend-link.schema.ts, role.schema.ts.

Also replace the request/response DTO files in each module (category.request.dto.ts, category.response.dto.ts, etc.) to re-export from `@rx-ted/api-contracts`.

- [ ] **Step 7: Update barrel index**

```ts
export * from './auth.js';
export * from './auth-email.js';
export * from './auth-response.js';
export * from './user.js';
export * from './post.js';
export * from './comment.js';
export * from './tags.js';
export * from './category.js';
export * from './announcement.js';
export * from './friend-link.js';
export * from './role.js';
```

- [ ] **Step 8: Build and typecheck**

```bash
pnpm --filter @rx-ted/api-contracts build
pnpm --filter @rx-ted/platform-api typecheck
```

- [ ] **Step 9: Commit**

```bash
git add packages/api-contracts/src/ apps/platform-api/src/modules/{tags,category,announcement,friend-link,role}/
git commit -m "feat(api-contracts): add tags, category, announcement, friend-link, role schemas"
```

---

## Task 5: Move Blog + Search + Notification + Remaining Schemas

**Files:**
- Create: `packages/api-contracts/src/blog-request.ts`
- Create: `packages/api-contracts/src/blog-response.ts`
- Create: `packages/api-contracts/src/search-request.ts`
- Create: `packages/api-contracts/src/search-response.ts`
- Create: `packages/api-contracts/src/notification.ts`
- Create: `packages/api-contracts/src/notification-response.ts`
- Create: `packages/api-contracts/src/permission.ts`
- Create: `packages/api-contracts/src/permission-request.ts`
- Create: `packages/api-contracts/src/admin-permission.ts`
- Create: `packages/api-contracts/src/audit.ts`
- Create: `packages/api-contracts/src/author-stats.ts`
- Create: `packages/api-contracts/src/post-stats.ts`
- Modify: All remaining backend re-export shims

- [ ] **Step 1: Create `packages/api-contracts/src/blog-request.ts`**

```ts
import { z } from 'zod';

export const BlogSearchQuerySchema = z.object({
  keyword: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  excludeSlugs: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  author: z.string().optional(),
});

export const BlogAuthorQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  tag: z.string().optional(),
});

export type BlogSearchQuery = z.infer<typeof BlogSearchQuerySchema>;
export type BlogAuthorQuery = z.infer<typeof BlogAuthorQuerySchema>;
```

- [ ] **Step 2: Create `packages/api-contracts/src/blog-response.ts`**

Move all Zod schemas from `apps/platform-api/src/modules/blog/dtos/blog.response.dto.ts`. Remove the duplicate TS interfaces (they become `z.infer` exports).

```ts
import { z } from 'zod';

export const BlogPostItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  cover_image: z.string().nullable(),
  is_pinned: z.boolean(),
  featured_weight: z.number(),
  status: z.string(),
  author_name: z.string().nullable(),
  author_username: z.string().nullable(),
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  reading_time: z.number(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
});

export const BlogActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['post.updated', 'notification']),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  created_at: z.string(),
});

export const TrendingTagSchema = z.object({
  name: z.string(),
  postCount: z.number(),
});

export const BlogHomeResponseSchema = z.object({
  hero: z.object({
    title: z.string(),
    description: z.string(),
    stats: z.object({
      posts: z.number(),
      tags: z.number(),
      categories: z.number(),
      totalViews: z.number(),
      totalLikes: z.number(),
      totalComments: z.number(),
      runtime: z.string(),
    }),
  }),
  featured: z.array(BlogPostItemSchema),
  latest: z.array(BlogPostItemSchema),
  pinned: z.array(BlogPostItemSchema),
  trendingTags: z.array(TrendingTagSchema),
});

export const BlogDashboardResponseSchema = z.object({
  me: z.object({
    id: z.string(),
    username: z.string(),
    roles: z.array(z.string()),
    created_at: z.string(),
    last_login_at: z.string().nullable(),
    nickname: z.string().nullable(),
    avatar_url: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
  }),
  posts: z.object({
    list: z.array(BlogPostItemSchema),
    total: z.number(),
  }),
  stats: z.object({
    days: z.number(),
    views: z.number(),
    likes: z.number(),
    comments: z.number(),
  }),
  notifications: z.object({
    unreadCount: z.number(),
    recent: z.array(
      z.object({
        id: z.number(),
        type: z.string(),
        content: z.string(),
        is_read: z.boolean(),
        created_at: z.string(),
      }),
    ),
  }),
  activity: z.array(BlogActivityItemSchema),
  permissions: z.array(z.string()),
});

export const BlogAuthorResponseSchema = z.object({
  author: z.object({
    id: z.string(),
    username: z.string(),
    created_at: z.string(),
    last_login_at: z.string().nullable(),
    nickname: z.string().nullable(),
    avatar_url: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
    location: z.string().nullable(),
  }),
  posts: z.object({
    list: z.array(BlogPostItemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    tags: z.array(z.string()),
    activeTag: z.string().nullable(),
  }),
});

export type BlogPostItem = z.infer<typeof BlogPostItemSchema>;
export type BlogActivityItem = z.infer<typeof BlogActivityItemSchema>;
export type TrendingTag = z.infer<typeof TrendingTagSchema>;
export type BlogHomeResponse = z.infer<typeof BlogHomeResponseSchema>;
export type BlogDashboardResponse = z.infer<typeof BlogDashboardResponseSchema>;
export type BlogAuthorResponse = z.infer<typeof BlogAuthorResponseSchema>;

export const BlogPostDetailSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  content_md: z.string().optional(),
  content_html: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
  author_username: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  tag_ids: z.array(z.number()).optional(),
  categories: z.array(z.string()).optional(),
  category_ids: z.array(z.number()).optional(),
  cover_image: z.string().nullable().optional(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  reading_time: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BlogPostDetail = z.infer<typeof BlogPostDetailSchema>;
```

- [ ] **Step 3: Create `packages/api-contracts/src/search-request.ts`**

```ts
import { z } from 'zod';

export const SearchQuerySchema = z.object({
  q: z.string().default(''),
  type: z.string().default('posts'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;
```

- [ ] **Step 4: Create `packages/api-contracts/src/search-response.ts`**

Move all Zod schemas and remove duplicate TS interfaces from `apps/platform-api/src/modules/search/dtos/search.response.dto.ts`.

```ts
import { z } from 'zod';

export const SearchPostItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  cover_image: z.string().nullable(),
  is_pinned: z.boolean(),
  featured_weight: z.number(),
  author_name: z.string().nullable(),
  author_username: z.string().nullable(),
  tags: z.array(z.string()),
  categories: z.array(z.string()),
  reading_time: z.number(),
  view_count: z.number(),
  like_count: z.number(),
  comment_count: z.number(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
});

export const SearchTagItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  post_count: z.number(),
});

export const SearchCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  post_count: z.number(),
});

export const SearchAuthorItemSchema = z.object({
  id: z.string(),
  username: z.string(),
  nickname: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  post_count: z.number(),
});

export const SearchResponseDtoSchema = z.object({
  posts: z.object({ list: z.array(SearchPostItemSchema), total: z.number() }),
  tags: z.object({ list: z.array(SearchTagItemSchema), total: z.number() }),
  categories: z.object({ list: z.array(SearchCategoryItemSchema), total: z.number() }),
  author: z.object({ list: z.array(SearchAuthorItemSchema), total: z.number() }),
});

export type SearchPostItem = z.infer<typeof SearchPostItemSchema>;
export type SearchTagItem = z.infer<typeof SearchTagItemSchema>;
export type SearchCategoryItem = z.infer<typeof SearchCategoryItemSchema>;
export type SearchAuthorItem = z.infer<typeof SearchAuthorItemSchema>;
export type SearchResponseDto = z.infer<typeof SearchResponseDtoSchema>;
```

- [ ] **Step 5: Create remaining small schema files**

`packages/api-contracts/src/notification.ts`:
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

`packages/api-contracts/src/notification-response.ts`:
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
```

`packages/api-contracts/src/permission.ts`:
```ts
import { z } from 'zod';

export const CreatePermissionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const DeletePermissionSchema = z.object({
  permission_id: z.number().int(),
  target_user_id: z.string().optional(),
});

export const PermissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreatePermissionInput = z.infer<typeof CreatePermissionSchema>;
export type DeletePermissionInput = z.infer<typeof DeletePermissionSchema>;
export type PermissionListQuery = z.infer<typeof PermissionListQuerySchema>;
```

`packages/api-contracts/src/permission-request.ts`:
```ts
import { z } from 'zod';

export const CreatePermissionRequestSchema = z.object({
  permission_ids: z.array(z.number().int()).min(1, 'At least one permission is required'),
  reason: z.string().optional(),
});

export const ApproveRejectSchema = z.object({
  reason: z.string().optional(),
});

export const PermissionRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreatePermissionRequestInput = z.infer<typeof CreatePermissionRequestSchema>;
export type ApproveRejectInput = z.infer<typeof ApproveRejectSchema>;
export type PermissionRequestListQuery = z.infer<typeof PermissionRequestListQuerySchema>;
```

`packages/api-contracts/src/admin-permission.ts`:
```ts
import { z } from 'zod';

export const GrantPermissionsSchema = z.object({
  userId: z.string().length(36),
  permissionIds: z.array(z.number().int()).min(1),
});

export const RevokePermissionsSchema = z.object({
  userId: z.string().length(36),
  permissionIds: z.array(z.number().int()).min(1),
});

export type GrantPermissionsInput = z.infer<typeof GrantPermissionsSchema>;
export type RevokePermissionsInput = z.infer<typeof RevokePermissionsSchema>;
```

`packages/api-contracts/src/audit.ts`:
```ts
import { z } from 'zod';

export const AuditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type AuditListQuery = z.infer<typeof AuditListQuerySchema>;
```

`packages/api-contracts/src/author-stats.ts`:
```ts
import { z } from 'zod';

export const AuthorStatsQuerySchema = z.object({
  userId: z.string(),
});

export type AuthorStatsQuery = z.infer<typeof AuthorStatsQuerySchema>;
```

`packages/api-contracts/src/post-stats.ts`:
```ts
import { z } from 'zod';

export const PostStatsParamsSchema = z.object({
  postId: z.string(),
});

export type PostStatsParams = z.infer<typeof PostStatsParamsSchema>;
```

- [ ] **Step 6: Convert all remaining backend re-export shims**

Replace each backend `dtos/*.schema.ts` and `dtos/*.request.dto.ts` / `dtos/*.response.dto.ts` with re-exports from `@rx-ted/api-contracts/<module>`.

For `apps/platform-api/src/modules/blog/dtos/blog.schema.ts`:
```ts
export { BlogSearchQuerySchema, BlogAuthorQuerySchema, type BlogSearchQuery, type BlogAuthorQuery } from '@rx-ted/api-contracts/blog-request';
```

For `apps/platform-api/src/modules/blog/dtos/blog.response.dto.ts` — keep the Zod schemas as re-exports, delete the TS interfaces:
```ts
export {
  BlogPostItemSchema,
  BlogActivityItemSchema,
  TrendingTagSchema,
  BlogHomeResponseSchema,
  BlogDashboardResponseSchema,
  BlogAuthorResponseSchema,
  BlogPostDetailSchema,
  type BlogPostItem,
  type BlogActivityItem,
  type TrendingTag,
  type BlogHomeResponse,
  type BlogDashboardResponse,
  type BlogAuthorResponse,
  type BlogPostDetail,
} from '@rx-ted/api-contracts/blog-response';
```

Same pattern for search, notification, permission, permission-request, admin-permission, audit, author-stats, post-stats modules.

- [ ] **Step 7: Update barrel index**

```ts
export * from './auth.js';
export * from './auth-email.js';
export * from './auth-response.js';
export * from './user.js';
export * from './post.js';
export * from './comment.js';
export * from './tags.js';
export * from './category.js';
export * from './announcement.js';
export * from './friend-link.js';
export * from './role.js';
export * from './blog-request.js';
export * from './blog-response.js';
export * from './search-request.js';
export * from './search-response.js';
export * from './notification.js';
export * from './notification-response.js';
export * from './permission.js';
export * from './permission-request.js';
export * from './admin-permission.js';
export * from './audit.js';
export * from './author-stats.js';
export * from './post-stats.js';
```

- [ ] **Step 8: Build and full typecheck**

```bash
pnpm --filter @rx-ted/api-contracts build
pnpm --filter @rx-ted/platform-api typecheck
```

- [ ] **Step 9: Commit**

```bash
git add packages/api-contracts/ apps/platform-api/src/modules/
git commit -m "feat(api-contracts): add all remaining module schemas, complete backend migration"
```

---

## Task 6: Migrate Frontend Types

**Files:**
- Modify: All `apps/web-blog/src/**/*.{ts,vue}` files that import from `@/types/blog` or `@/types/community`
- Delete: `apps/web-blog/src/types/blog.ts` (after migration)
- Delete: `apps/web-blog/src/types/community.ts` (after migration)
- Modify: `apps/web-blog/package.json` (add `@rx-ted/api-contracts` dependency)

- [ ] **Step 1: Add dependency to web-blog**

In `apps/web-blog/package.json`, add to `"dependencies"`:

```json
"@rx-ted/api-contracts": "workspace:^"
```

Then run `pnpm install`.

- [ ] **Step 2: Migrate `apps/web-blog/src/types/blog.ts`**

Replace the entire file with re-exports from the shared package. This preserves all existing import paths (`@/types/blog`) while the actual source of truth becomes `@rx-ted/api-contracts`:

```ts
export {
  type BlogPostItem as BlogPostCardVO,
  type TrendingTag as TrendingTagItem,
  type BlogHomeResponse as BlogHomeVO,
  type BlogPostDetail as BlogPostDetailVO,
  type BlogAuthorResponse as BlogAuthorVO,
  type BlogDashboardResponse as BlogDashboardVO,
  type BlogActivityItem as DashboardActivityVO,
} from '@rx-ted/api-contracts/blog-response';

// BlogPostPageVO and DashboardNotificationVO don't have exact backend equivalents,
// so define them here using the shared types.
import type { BlogPostItem } from '@rx-ted/api-contracts/blog-response';

export type BlogPostPageVO = {
  list: BlogPostItem[];
  total: number;
};

export type DashboardNotificationVO = {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};
```

- [ ] **Step 3: Migrate `apps/web-blog/src/types/community.ts`**

Replace with re-exports from the shared package:

```ts
export {
  type UserProfile as UserProfileVO,
  type CommentVO,
  type AuthorBrief as AuthorBriefVO,
  type CommentPageResult,
  type LikeToggleResult,
} from '@rx-ted/api-contracts/comment';

// CommentSort is a pure frontend type, keep it here.
export type CommentSort = 'newest' | 'hottest';

// CommentNode is a recursive type with children, define using CommentVO.
import type { CommentVO } from '@rx-ted/api-contracts/comment';

export interface CommentNode extends CommentVO {
  children: CommentNode[];
}

// TaxonomyItemVO has no backend response schema, keep it here.
export type TaxonomyItemVO = {
  id: number;
  name: string;
};

// NotificationVO is a pure frontend type for the notification detail view.
export type NotificationVO = {
  id: number;
  channel: 'internal' | 'email';
  type: string;
  locale: 'zh-CN' | 'en';
  title?: string | null;
  content: string;
  payload?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
};
```

- [ ] **Step 4: Verify all imports still resolve**

```bash
pnpm --filter @rx-ted/web-blog typecheck
```

Expected: Clean. All existing `import type { BlogPostCardVO } from '@/types/blog'` still work because the barrel re-exports preserve the names.

- [ ] **Step 5: Run tests**

```bash
pnpm --filter @rx-ted/web-blog test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web-blog/package.json apps/web-blog/src/types/ pnpm-lock.yaml
git commit -m "feat(web-blog): migrate frontend types to shared api-contracts"
```

---

## Task 7: Cleanup Dead Interfaces in Backend

**Files:**
- Delete: `apps/platform-api/src/modules/post/dtos/post.request.dto.ts` (dead TS interfaces)
- Delete: `apps/platform-api/src/modules/post/dtos/post.response.dto.ts` (dead TS interfaces)
- Delete: `apps/platform-api/src/modules/auth/dtos/auth.request.dto.ts` (dead TS interfaces)
- Delete: `apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts` (dead TS interfaces)
- Delete: `apps/platform-api/src/modules/tags/dtos/tags.request.dto.ts` (dead TS interfaces)
- Delete: `apps/platform-api/src/modules/tags/dtos/tags.response.dto.ts` (dead TS interfaces)
- Delete: All other `*.request.dto.ts` and `*.response.dto.ts` files that are now pure TS interface duplicates

- [ ] **Step 1: Find all files to delete**

```bash
grep -rl "export interface" apps/platform-api/src/modules/*/dtos/*.request.dto.ts apps/platform-api/src/modules/*/dtos/*.response.dto.ts
```

These are the files containing only TS interface definitions that are now superseded by `z.infer` exports from `@rx-ted/api-contracts`.

- [ ] **Step 2: Verify no imports reference the deleted files**

```bash
grep -r "\.request\.dto'" apps/platform-api/src/modules/ | grep -v "node_modules"
grep -r "\.response\.dto'" apps/platform-api/src/modules/ | grep -v "node_modules"
```

Ensure all imports either point to the `.schema.ts` re-export shims or to `@rx-ted/api-contracts` directly.

- [ ] **Step 3: Update any remaining imports**

If any file imports from `*.request.dto` or `*.response.dto`, update the import to use the `.schema.ts` re-export or `@rx-ted/api-contracts` directly.

- [ ] **Step 4: Delete the dead files**

```bash
rm apps/platform-api/src/modules/post/dtos/post.request.dto.ts
rm apps/platform-api/src/modules/post/dtos/post.response.dto.ts
rm apps/platform-api/src/modules/auth/dtos/auth.request.dto.ts
rm apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts
rm apps/platform-api/src/modules/tags/dtos/tags.request.dto.ts
rm apps/platform-api/src/modules/tags/dtos/tags.response.dto.ts
rm apps/platform-api/src/modules/category/dtos/category.request.dto.ts
rm apps/platform-api/src/modules/category/dtos/category.response.dto.ts
rm apps/platform-api/src/modules/announcement/dtos/announcement.request.dto.ts
rm apps/platform-api/src/modules/announcement/dtos/announcement.response.dto.ts
rm apps/platform-api/src/modules/role/dtos/role.request.dto.ts
rm apps/platform-api/src/modules/role/dtos/role.response.dto.ts
rm apps/platform-api/src/modules/user/dtos/user.request.dto.ts
rm apps/platform-api/src/modules/user/dtos/user.response.dto.ts
rm apps/platform-api/src/modules/friend-link/dtos/friend-link.request.dto.ts
rm apps/platform-api/src/modules/friend-link/dtos/friend-link.response.dto.ts
rm apps/platform-api/src/modules/blog/dtos/blog.request.dto.ts
rm apps/platform-api/src/modules/search/dtos/search.request.dto.ts
rm apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts
rm apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts
```

- [ ] **Step 5: Full typecheck + tests**

```bash
pnpm --filter @rx-ted/api-contracts build
pnpm --filter @rx-ted/platform-api typecheck
pnpm --filter @rx-ted/platform-api test
pnpm --filter @rx-ted/web-blog typecheck
pnpm --filter @rx-ted/web-blog test
```

- [ ] **Step 6: Commit**

```bash
git add -A apps/platform-api/src/modules/
git commit -m "chore(api-contracts): remove dead TS interface files from backend"
```

---

## Task 8: Final Verification + Changeset

**Files:**
- Create: `.changeset/<name>.md`

- [ ] **Step 1: Full monorepo typecheck**

```bash
pnpm typecheck
```

Expected: Clean across all packages.

- [ ] **Step 2: Full monorepo test**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 3: Full lint**

```bash
pnpm lint
```

Expected: Clean.

- [ ] **Step 4: Create changeset**

```bash
pnpm changeset
```

Select:
- `@rx-ted/api-contracts` — minor (new package)
- `@rx-ted/platform-api` — patch (re-export shims)
- `@rx-ted/web-blog` — patch (type imports)

Message: "Shared API contracts: extract Zod schemas to @rx-ted/api-contracts for type-safe frontend-backend contract sharing"

- [ ] **Step 5: Commit**

```bash
git add .changeset/
git commit -m "chore: add changeset for api-contracts"
```

---

## Verification Checklist

After all tasks are complete:
1. `pnpm typecheck` — clean
2. `pnpm test` — all pass
3. `pnpm lint` — clean
4. `pnpm --filter @rx-ted/api-contracts build` — produces dist/
5. Frontend `@/types/blog` imports still work (barrel re-exports preserve names)
6. Backend controllers still import from `@/modules/*/dtos/*.schema` (re-export shims)
7. No TS interface duplicates remain in backend DTOs
