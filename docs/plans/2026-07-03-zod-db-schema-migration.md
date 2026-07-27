# Zod DB Schema Migration Implementation Plan

> **Status: IMPLEMENTED** — Zod DB Schema bridge 已在 `packages/honest-plugins/db` 中实现（`zdb()` + `toTableDefinition()`）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace portable DSL (`table()` + `t.*` + `compileSchema()`) with Zod-based table definitions using `zdb()` and `toTableDefinition()`.

**Architecture:** Zod becomes the single source of truth for both table structure and runtime validation. A thin `zdb()` bridge attaches database column metadata to Zod types via Symbol. `toTableDefinition()` extracts this metadata and feeds it into the existing `compileMysql`/`compileD1` compilers — unchanged.

**Tech Stack:** Zod (extends), drizzle-orm (execution layer), Valibot (pre-query validation), mysql2sqlite (MySQL→D1 migration)

---

### Task 1: Core Bridge — `zdb()` + `toTableDefinition()`

**Files:**
- Create: `packages/honest-plugins/db/src/schema-builder/zod-bridge.ts`
- Modify: `packages/honest-plugins/db/src/schema-builder/index.ts` (add auto-detection in `compileSchema`)
- Modify: `packages/honest-plugins/db/src/index.ts` (export new symbols)

**Step 1: Create `zod-bridge.ts`**

```typescript
import { z } from 'zod';
import type { ColumnDefinition, ReferenceDef } from './types';

const DB_COL = Symbol('zod:db-col');

export interface ZodDbMeta {
  type: 'varchar' | 'char' | 'text' | 'bigint' | 'integer' | 'boolean'
      | 'timestamp' | 'date' | 'enum' | 'json' | 'decimal';
  dbName?: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  notNull?: boolean;
  unique?: boolean;
  default?: unknown;
  length?: number;
  values?: string[];
  precision?: number;
  scale?: number;
  references?: ReferenceDef;
}

export function zdb<T extends z.ZodTypeAny>(zod: T, meta: ZodDbMeta): T {
  Object.defineProperty(zod, DB_COL, {
    value: meta,
    writable: true,
    configurable: true,
  });
  return zod;
}

export function getZodDbMeta(zod: z.ZodTypeAny): ZodDbMeta | undefined {
  return (zod as any)[DB_COL];
}

export function isZodObject(schema: unknown): schema is z.ZodObject<any> {
  return typeof schema === 'object' && schema !== null && 'shape' in schema;
}

export function toColumnDefinition(jsName: string, zod: z.ZodTypeAny): ColumnDefinition {
  const meta = getZodDbMeta(zod);
  if (!meta) {
    if (zod instanceof z.ZodDefault) {
      return toColumnDefinition(jsName, zod._def.innerType);
    }
    if (zod instanceof z.ZodNullable) {
      return toColumnDefinition(jsName, zod._def.innerType);
    }
    if (zod instanceof z.ZodOptional) {
      return toColumnDefinition(jsName, zod._def.innerType);
    }
    throw new Error(
      `Column "${jsName}" has no db metadata. Use zdb() to attach metadata.`,
    );
  }
  return {
    name: meta.dbName ?? jsName,
    type: meta.type,
    primaryKey: meta.primaryKey,
    autoIncrement: meta.autoIncrement,
    notNull: meta.notNull,
    unique: meta.unique,
    default: meta.default,
    length: meta.length,
    values: meta.values,
    precision: meta.precision,
    scale: meta.scale,
    references: meta.references,
  };
}

export function toTableDefinition<T extends z.ZodRawShape>(
  name: string,
  schema: z.ZodObject<T>,
): { name: string; columns: Record<string, ColumnDefinition> } {
  const columns: Record<string, ColumnDefinition> = {};
  for (const [key, zod] of Object.entries(schema.shape)) {
    columns[key] = toColumnDefinition(key, zod);
  }
  return { name, columns };
}
```

**Step 2: Update `schema-builder/index.ts` — add auto-detection in `compileSchema`**

```typescript
// Add imports
import { isZodObject, toTableDefinition } from './zod-bridge';

// Modify compileSchema function
export function compileSchema<T extends Record<string, any>>(
  dialect: Dialect,
  schema: T,
): CompiledTables<T> {
  const compiler = dialect === 'mysql' ? compileMysql : compileD1;
  const result: any = {};
  for (const [name, def] of Object.entries(schema)) {
    const tableDef = isZodObject(def) ? toTableDefinition(name, def) : def;
    result[name] = compiler(tableDef);
  }
  return result as CompiledTables<T>;
}
```

**Step 3: Update `packages/honest-plugins/db/src/index.ts` — export bridge**

```typescript
// Add to existing schema-builder exports
export { zdb, getZodDbMeta, isZodObject, toTableDefinition, toColumnDefinition } from './schema-builder/zod-bridge';
export type { ZodDbMeta } from './schema-builder/zod-bridge';
```

- [ ] **Step 1: Create `zod-bridge.ts` with the code above**
- [ ] **Step 2: Update `schema-builder/index.ts` compileSchema auto-detection**
- [ ] **Step 3: Update `packages/honest-plugins/db/src/index.ts` barrel exports**
- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit` in `packages/honest-plugins/db`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add packages/honest-plugins/db/src/schema-builder/zod-bridge.ts \
       packages/honest-plugins/db/src/schema-builder/index.ts \
       packages/honest-plugins/db/src/index.ts
git commit -m "feat(db): add zdb() and toTableDefinition() for Zod-based table schemas"
```

---

### Task 2: Rewrite User Entity (Reference Pattern)

**Files:**
- Rewrite: `apps/platform-api/src/modules/user/entities/user.entity.ts`

Replace portable DSL + compileSchema + redundant Zod interfaces with zdb()-based single source of truth.

**Before:** 142 lines — portable DSL table defs + compileSchema + 3 Zod schemas + 3 TS interfaces
**After:** ~120 lines — `zdb()` table schema (single) + inferred types

```typescript
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { env } from '@rx-ted/packages-config';

// ==================== Table Schemas (Zod + db metadata) ====================

export const UsersSchema = z.object({
  id: zdb(z.string().length(36), { type: 'char', length: 36, primaryKey: true }),
  username: zdb(z.string().min(3).max(20), { type: 'varchar', length: 20, notNull: true, unique: true }),
  loginType: zdb(
    z.enum(['password', 'google', 'github', 'wechat', 'email']),
    { type: 'enum', values: ['password', 'google', 'github', 'wechat', 'email'], dbName: 'login_type', notNull: true, default: 'password' },
  ),
  passwordHash: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255, dbName: 'password_hash' }),
  email: zdb(z.string().email().nullable(), { type: 'varchar', length: 255, unique: true }),
  preferredLocale: zdb(
    z.enum(['zh-CN', 'en']),
    { type: 'enum', values: ['zh-CN', 'en'], dbName: 'preferred_locale', notNull: true, default: 'zh-CN' },
  ),
  status: zdb(
    z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
    { type: 'enum', values: ['NORMAL', 'MUTED', 'BANNED', 'DELETED'], default: 'NORMAL' },
  ),
  tokenVersion: zdb(z.number().int(), { type: 'integer', dbName: 'token_version', default: 0 }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  lastLoginAt: zdb(z.date().nullable(), { type: 'timestamp', dbName: 'last_login_at' }),
});

export type User = z.infer<typeof UsersSchema>;

export const UserAuthSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, notNull: true, dbName: 'user_id',
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  type: zdb(
    z.enum(['password', 'email', 'phone']),
    { type: 'enum', values: ['password', 'email', 'phone'], notNull: true },
  ),
  identifier: zdb(z.string().max(255), { type: 'varchar', length: 255, notNull: true }),
  credential: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
});

export type UserAuth = z.infer<typeof UserAuthSchema>;

export const UserProfilesSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, dbName: 'user_id', primaryKey: true,
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  nickname: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  avatarUrl: zdb(z.string().max(1024).nullable(), { type: 'varchar', length: 1024, dbName: 'avatar_url' }),
  gender: zdb(
    z.enum(['Male', 'Female', 'Unknown']).nullable(),
    { type: 'enum', values: ['Male', 'Female', 'Unknown'], default: 'Unknown' },
  ),
  birthday: zdb(z.string().nullable(), { type: 'date' }),
  bio: zdb(z.string().nullable(), { type: 'text' }),
  website: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  location: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export type UserProfile = z.infer<typeof UserProfilesSchema>;

export const UserOauthSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, notNull: true, dbName: 'user_id',
    references: { table: 'users', column: 'id', onDelete: 'cascade' },
  }),
  provider: zdb(
    z.enum(['gitHub', 'google', 'wechat']),
    { type: 'enum', values: ['gitHub', 'google', 'wechat'], notNull: true },
  ),
  providerUserId: zdb(z.string().max(255), { type: 'varchar', length: 255, dbName: 'provider_user_id', notNull: true }),
  accessToken: zdb(z.string().nullable(), { type: 'text', dbName: 'access_token' }),
  refreshToken: zdb(z.string().nullable(), { type: 'text', dbName: 'refresh_token' }),
  expiresAt: zdb(z.date().nullable(), { type: 'timestamp', dbName: 'expires_at' }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});

export type UserOauth = z.infer<typeof UserOauthSchema>;

// ==================== Compiled Drizzle Tables ====================

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const _compiled = compileSchema(dialect, {
  users: UsersSchema,
  userAuth: UserAuthSchema,
  userProfiles: UserProfilesSchema,
  userOauth: UserOauthSchema,
});
export const users = _compiled.users;
export const userAuth = _compiled.userAuth;
export const userProfiles = _compiled.userProfiles;
export const userOauth = _compiled.userOauth;

// ==================== View Schemas (for API responses, not DB) ====================

export const UserEntitySchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  status: z.enum(['NORMAL', 'MUTED', 'BANNED', 'DELETED']),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable(),
});

export const UserProfileEntitySchema = z.object({
  id: z.string(),
  username: z.string(),
  githubConnected: z.boolean(),
  preferredLocale: z.enum(['zh-CN', 'en']),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export const UserPublicProfileEntitySchema = UserProfileEntitySchema.extend({
  createdAt: z.string(),
});
```

- [ ] **Step 1: Rewrite `user.entity.ts` with the code above**
- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (in apps/platform-api)

- [ ] **Step 3: Check that existing imports of `UserEntity`, `UserEntitySchema` etc. still resolve**

The view schemas (`UserEntitySchema`, `UserProfileEntitySchema`, `UserPublicProfileEntitySchema`) and drizzle tables (`users`, `userAuth`, `userProfiles`, `userOauth`) are exported with the same names. Importers work unchanged.

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/user/entities/user.entity.ts
git commit -m "feat(platform-api): convert user entity to Zod-based schema"
```

---

### Task 3: Rewrite Role Entity

**Files:**
- Rewrite: `apps/platform-api/src/modules/role/entities/role.entity.ts`

```typescript
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { env } from '@rx-ted/packages-config';

export const RolesSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().max(20), { type: 'varchar', length: 20, notNull: true, unique: true }),
  description: zdb(z.string().max(100).nullable(), { type: 'varchar', length: 100 }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export type Role = z.infer<typeof RolesSchema>;

export const UserRoleMappingsSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, notNull: true, dbName: 'user_id',
    references: { table: 'users', column: 'id' },
  }),
  roleId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'role_id',
    references: { table: 'roles', column: 'id' },
  }),
});

export type UserRoleMapping = z.infer<typeof UserRoleMappingsSchema>;

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const _compiled = compileSchema(dialect, {
  roles: RolesSchema,
  userRoleMappings: UserRoleMappingsSchema,
});
export const roles = _compiled.roles;
export const userRoleMappings = _compiled.userRoleMappings;
```

- [ ] **Step 1: Rewrite `role.entity.ts`**
- [ ] **Step 2: Typecheck**
- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/role/entities/role.entity.ts
git commit -m "feat(platform-api): convert role entity to Zod-based schema"
```

---

### Task 4: Rewrite Permission Entity

**Files:**
- Rewrite: `apps/platform-api/src/modules/permission/entities/permission.entity.ts`

```typescript
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { env } from '@rx-ted/packages-config';

export const PermissionsSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  resource: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  action: zdb(z.string().max(50), { type: 'varchar', length: 50, notNull: true }),
  scope: zdb(z.string().max(20), { type: 'varchar', length: 20, notNull: true }),
  name: zdb(z.string().max(150), { type: 'varchar', length: 150, notNull: true, unique: true }),
  description: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255 }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export type Permission = z.infer<typeof PermissionsSchema>;

export const RolePermissionMappingsSchema = z.object({
  roleId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'role_id',
    references: { table: 'roles', column: 'id' },
  }),
  permissionId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'permission_id',
    references: { table: 'permissions', column: 'id' },
  }),
});

export type RolePermissionMapping = z.infer<typeof RolePermissionMappingsSchema>;

export const UserPermissionMappingsSchema = z.object({
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, notNull: true, dbName: 'user_id',
    references: { table: 'users', column: 'id' },
  }),
  permissionId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'permission_id',
    references: { table: 'permissions', column: 'id' },
  }),
});

export type UserPermissionMapping = z.infer<typeof UserPermissionMappingsSchema>;

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const _compiled = compileSchema(dialect, {
  permissions: PermissionsSchema,
  rolePermissionMappings: RolePermissionMappingsSchema,
  userPermissionMappings: UserPermissionMappingsSchema,
});
export const permissions = _compiled.permissions;
export const rolePermissionMappings = _compiled.rolePermissionMappings;
export const userPermissionMappings = _compiled.userPermissionMappings;
```

- [ ] **Step 1: Rewrite `permission.entity.ts`**
- [ ] **Step 2: Typecheck**
- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/permission/entities/permission.entity.ts
git commit -m "feat(platform-api): convert permission entity to Zod-based schema"
```

---

### Task 5: Rewrite Post Entity

**Files:**
- Rewrite: `apps/platform-api/src/modules/post/entities/post.entity.ts`

This is the largest entity file. Convert all 6 tables: `postCore`, `postContent`, `postRevisions`, `postStats`, `postTagMappings`, `postCategoryMappings`.

Key points:
- `postCore.id` is `bigint` in DB
- Foreign keys reference `users.id` (UUID char(36))
- `contentMd` is `longtext` → mapped to `text` type

```typescript
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { env } from '@rx-ted/packages-config';

export const PostCoreSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  userId: zdb(z.string().length(36), {
    type: 'char', length: 36, notNull: true, dbName: 'user_id',
    references: { table: 'users', column: 'id' },
  }),
  slug: zdb(z.string().max(200), { type: 'varchar', length: 200, notNull: true, unique: true }),
  title: zdb(z.string().max(200), { type: 'varchar', length: 200, notNull: true }),
  isPinned: zdb(z.boolean(), { type: 'boolean', dbName: 'is_pinned', default: false }),
  featuredWeight: zdb(z.number().int(), { type: 'integer', dbName: 'featured_weight', default: 0 }),
  status: zdb(
    z.enum(['draft', 'published', 'archived']),
    { type: 'enum', values: ['draft', 'published', 'archived'], default: 'draft' },
  ),
  visibility: zdb(
    z.enum(['public', 'private', 'password']),
    { type: 'enum', values: ['public', 'private', 'password'], default: 'public' },
  ),
  passwordHash: zdb(z.string().max(255).nullable(), { type: 'varchar', length: 255, dbName: 'password_hash' }),
  allowComment: zdb(z.boolean(), { type: 'boolean', dbName: 'allow_comment', default: true }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
  publishedAt: zdb(z.date().nullable(), { type: 'timestamp', dbName: 'published_at' }),
  createdBy: zdb(z.string().length(36).nullable(), { type: 'char', length: 36, dbName: 'created_by' }),
  updatedBy: zdb(z.string().length(36).nullable(), { type: 'char', length: 36, dbName: 'updated_by' }),
});

export type PostCore = z.infer<typeof PostCoreSchema>;

export const PostContentSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint', notNull: true, dbName: 'post_id',
    references: { table: 'post_core', column: 'id', onDelete: 'cascade' },
  }),
  contentMd: zdb(z.string().nullable(), { type: 'text', dbName: 'content_md' }),
});

export type PostContent = z.infer<typeof PostContentSchema>;

export const PostRevisionsSchema = z.object({
  id: zdb(z.number().int(), { type: 'bigint', primaryKey: true, autoIncrement: true }),
  postId: zdb(z.number().int(), {
    type: 'bigint', notNull: true, dbName: 'post_id',
    references: { table: 'post_core', column: 'id', onDelete: 'cascade' },
  }),
  contentMd: zdb(z.string(), { type: 'text', dbName: 'content_md', notNull: true }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
});

export type PostRevision = z.infer<typeof PostRevisionsSchema>;

export const PostStatsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint', primaryKey: true, dbName: 'post_id',
    references: { table: 'post_core', column: 'id', onDelete: 'cascade' },
  }),
  viewCount: zdb(z.number().int(), { type: 'integer', dbName: 'view_count', default: 0 }),
  likeCount: zdb(z.number().int(), { type: 'integer', dbName: 'like_count', default: 0 }),
  commentCount: zdb(z.number().int(), { type: 'integer', dbName: 'comment_count', default: 0 }),
});

export type PostStat = z.infer<typeof PostStatsSchema>;

export const PostTagMappingsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint', notNull: true, dbName: 'post_id',
    references: { table: 'post_core', column: 'id', onDelete: 'cascade' },
  }),
  tagId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'tag_id',
    references: { table: 'post_tags', column: 'id', onDelete: 'cascade' },
  }),
});

export type PostTagMapping = z.infer<typeof PostTagMappingsSchema>;

export const PostCategoryMappingsSchema = z.object({
  postId: zdb(z.number().int(), {
    type: 'bigint', notNull: true, dbName: 'post_id',
    references: { table: 'post_core', column: 'id', onDelete: 'cascade' },
  }),
  categoryId: zdb(z.number().int(), {
    type: 'integer', notNull: true, dbName: 'category_id',
    references: { table: 'post_categories', column: 'id', onDelete: 'cascade' },
  }),
});

export type PostCategoryMapping = z.infer<typeof PostCategoryMappingsSchema>;

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const _compiled = compileSchema(dialect, {
  postCore: PostCoreSchema,
  postContent: PostContentSchema,
  postRevisions: PostRevisionsSchema,
  postStats: PostStatsSchema,
  postTagMappings: PostTagMappingsSchema,
  postCategoryMappings: PostCategoryMappingsSchema,
});
export const postCore = _compiled.postCore;
export const postContent = _compiled.postContent;
export const postRevisions = _compiled.postRevisions;
export const postStats = _compiled.postStats;
export const postTagMappings = _compiled.postTagMappings;
export const postCategoryMappings = _compiled.postCategoryMappings;
```

- [ ] **Step 1: Rewrite `post.entity.ts`**
- [ ] **Step 2: Typecheck**
- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/post/entities/post.entity.ts
git commit -m "feat(platform-api): convert post entity to Zod-based schema"
```

---

### Task 6: Rewrite Small Entities (batch)

**Files:**
- Rewrite: `apps/platform-api/src/modules/tags/entities/tags.entity.ts`
- Rewrite: `apps/platform-api/src/modules/category/entities/category.entity.ts`
- Rewrite: `apps/platform-api/src/modules/comment/entities/comment.entity.ts`
- Rewrite: `apps/platform-api/src/modules/notification/entities/notification.entity.ts`
- Rewrite: `apps/platform-api/src/modules/audit/entities/audit.entity.ts`
- Rewrite: `apps/platform-api/src/modules/announcement/entities/announcement.entity.ts`
- Rewrite: `apps/platform-api/src/modules/author-stats/entities/author-stats.entity.ts`
- Rewrite: `apps/platform-api/src/modules/friend-link/entities/friend-link.entity.ts`
- Rewrite: `apps/platform-api/src/modules/version/entities/version.entity.ts`
- Rewrite: `apps/platform-api/src/modules/version/entities/module-version.entity.ts`
- Rewrite: `apps/platform-api/src/modules/version/entities/changelog.entity.ts`
- Rewrite: `apps/platform-api/src/modules/version/entities/commit-record.entity.ts`
- Rewrite: `apps/platform-api/src/modules/version/entities/release.entity.ts`
- Rewrite: `apps/platform-api/src/modules/album/entities/album.entity.ts`
- Rewrite: `apps/platform-api/src/modules/post-stats/entities/post-stats.entity.ts`
- Rewrite: `apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts`
- Rewrite: `apps/platform-api/src/modules/blog/entities/blog.entity.ts`
- Rewrite: `apps/platform-api/src/modules/auth/entities/auth.entity.ts`
- Rewrite: `apps/platform-api/src/modules/auth/entities/session.entity.ts`
- Rewrite: `apps/platform-api/src/modules/auth/entities/sessions.entity.ts`
- Rewrite: `apps/platform-api/src/modules/search/entities/search.entity.ts`
- Rewrite: `apps/platform-api/src/modules/metrics/entities/metrics.entity.ts`

**Pattern for each small entity (replace portable DSL + compileSchema + redundant interfaces with Zod):**

```typescript
import { z } from 'zod';
import { zdb, compileSchema } from '@rx-ted/packages-honest-plugins-db';
import { env } from '@rx-ted/packages-config';

export const TableNameSchema = z.object({
  id: zdb(z.number().int(), { type: 'integer', primaryKey: true, autoIncrement: true }),
  name: zdb(z.string().max(100), { type: 'varchar', length: 100, notNull: true }),
  createdAt: zdb(z.date(), { type: 'timestamp', dbName: 'created_at', notNull: true }),
  updatedAt: zdb(z.date(), { type: 'timestamp', dbName: 'updated_at', notNull: true }),
});

export type TableName = z.infer<typeof TableNameSchema>;

const dialect = env.PLATFORM === 'cloudflare' ? 'd1' : 'mysql';
const _compiled = compileSchema(dialect, { tableName: TableNameSchema });
export const tableName = _compiled.tableName;
```

Where each entity keeps its specific column definitions matching the current portable DSL. The key changes:
1. Remove `import { t, table } from '...'` → use `zdb(z.xxx(), {...})`
2. Remove separate Zod entity schemas if identical to table schema (keep if they differ)
3. Keep existing drizzle table export names for backward compatibility

- [ ] **Step 1: Rewrite all 22 small entity files following the pattern above**
- [ ] **Step 2: Typecheck across entire monorepo**
- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/tags/entities/tags.entity.ts \
       apps/platform-api/src/modules/category/entities/category.entity.ts \
       apps/platform-api/src/modules/comment/entities/comment.entity.ts \
       apps/platform-api/src/modules/notification/entities/notification.entity.ts \
       apps/platform-api/src/modules/audit/entities/audit.entity.ts \
       apps/platform-api/src/modules/announcement/entities/announcement.entity.ts \
       apps/platform-api/src/modules/author-stats/entities/author-stats.entity.ts \
       apps/platform-api/src/modules/friend-link/entities/friend-link.entity.ts \
       apps/platform-api/src/modules/version/entities/version.entity.ts \
       apps/platform-api/src/modules/version/entities/module-version.entity.ts \
       apps/platform-api/src/modules/version/entities/changelog.entity.ts \
       apps/platform-api/src/modules/version/entities/commit-record.entity.ts \
       apps/platform-api/src/modules/version/entities/release.entity.ts \
       apps/platform-api/src/modules/album/entities/album.entity.ts \
       apps/platform-api/src/modules/post-stats/entities/post-stats.entity.ts \
       apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts \
       apps/platform-api/src/modules/blog/entities/blog.entity.ts \
       apps/platform-api/src/modules/auth/entities/auth.entity.ts \
       apps/platform-api/src/modules/auth/entities/session.entity.ts \
       apps/platform-api/src/modules/auth/entities/sessions.entity.ts \
       apps/platform-api/src/modules/search/entities/search.entity.ts \
       apps/platform-api/src/modules/metrics/entities/metrics.entity.ts
git commit -m "feat(platform-api): convert remaining entities to Zod-based schemas"
```

---

### Task 7: Rewrite Seed System

**Files:**
- Modify: `apps/platform-api/drizzle/seed.ts`
- Modify: `apps/platform-api/drizzle/seed-d1.ts`
- Modify: `apps/platform-api/drizzle/generate-seed.ts`

Rewrite `drizzle/seed.ts` with the new `.values()` API pattern. Clean seed data: keep permissions & roles, single admin user `rxted000`, no posts/comments/notifications.

The seed system is rewritten to:
1. Clean data: keep permissions + roles, single admin user `rxted000`, no posts/comments/notifications
2. Use the new Zod-based entity schemas for type-safe row insertion
3. Keep existing upsert logic for MySQL (`onDuplicateKeyUpdate`) and D1 (`onConflictDoUpdate`)
4. Remove all post/comment/notification seed data

The `runSeed(db, mode)` signature stays the same. The PERMS array and existing upsert helper from the current seed.ts are retained but the user/admin data is cleaned.

Key data changes:
- Single admin user: username=`rxted000`, password=`rxted000`, gets ALL permissions
- No regular user
- No posts, comments, notifications, versions seeded
- Permissions and roles kept as-is

```typescript
// Seed user section becomes:
const ADMIN_ID = '00000000000000000000000000000001';

const { hashPassword } = await import('./seed-password');
const adminHash = await hashPassword('rxted000');

await upsertRow(db, schema.users, {
  id: ADMIN_ID, username: 'rxted000', loginType: 'password',
  passwordHash: adminHash, email: 'admin@example.com',
  status: 'NORMAL', tokenVersion: 0,
  createdAt: now, updatedAt: now, lastLoginAt: now,
}, mode);

// Bind admin role
const [adminRole] = await db.select().from(schema.roles).where(eq(schema.roles.name, 'admin')).limit(1);
const allPerms = await db.select().from(schema.permissions);
for (const p of allPerms) {
  await upsertRow(db, schema.rolePermissionMappings, { roleId: adminRole.id, permissionId: p.id }, mode);
}
await upsertRow(db, schema.userRoleMappings, { userId: ADMIN_ID, roleId: adminRole.id }, mode);
```

Imports needed:
```typescript
import { eq } from '@rx-ted/packages-honest-plugins-db';
```

The actual implementation should reuse the existing upsert logic from the current seed.ts.

- [ ] **Step 1: Rewrite `seed.ts` with new API and clean data**
- [ ] **Step 2: Verify typecheck**
- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/drizzle/seed.ts
git commit -m "refactor(platform-api): rewrite seed system with clean data"
```

---

### Task 8: Add Valibot Pre-query Validation

**Files:**
- Create: `apps/platform-api/src/lib/query-validator.ts`

Add a thin Valibot validation layer for query parameters (WHERE clauses, pagination, sorting) that Repository methods use before constructing drizzle queries.

```typescript
// src/lib/query-validator.ts
import * as v from 'valibot';

export const PaginationSchema = v.object({
  page: v.pipe(v.number(), v.integer(), v.minValue(1)),
  pageSize: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
});

export const OrderSchema = v.pipe(v.string(), v.picklist(['asc', 'desc']));

export function validateQuery<T>(schema: v.GenericSchema<T>, input: unknown): T {
  return v.parse(schema, input);
}
```

Also add `valibot` to `apps/platform-api/package.json` dependencies.

- [ ] **Step 1: Add valibot dependency**

Run: `bun add valibot` in `apps/platform-api`

- [ ] **Step 2: Create `query-validator.ts`**
- [ ] **Step 3: Verify typecheck**
- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/lib/query-validator.ts apps/platform-api/package.json
git commit -m "feat(platform-api): add Valibot query validation helper"
```

---

### Task 9: Final Typecheck & Test

- [ ] **Step 1: Full monorepo typecheck**

```bash
cd /Users/ben/projects/app && npx tsc --noEmit 2>&1 | head -50
```

- [ ] **Step 2: Run existing tests**

```bash
cd /Users/ben/projects/app/apps/platform-api && bun run test 2>&1 | tail -20
```

- [ ] **Step 3: Fix any regressions**
