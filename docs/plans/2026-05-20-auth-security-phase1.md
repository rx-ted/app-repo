# Auth 安全重构 - Phase 1 实施计划

> **Status: IMPLEMENTED** — Session 管理和 Refresh Token Rotation 已在 platform-api 中实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后端新增 Session 管理 + Refresh Token Rotation + AuthGuard Session 校验，保持向后兼容

**Architecture:** 在现有 `localStorage + 7 天 JWT` 基础上并行引入三层凭证体系（access_token + refresh_token + session_id）。后端先完成，前端不需要改。过渡期 AuthGuard 同时支持旧 tokenVersion 和新 session 两种模式。

**Tech Stack:** Hono + jsonwebtoken + Drizzle ORM + MySQL + Redis（CacheDriver）

---

## 文件变更清单

**新建：**
- `apps/platform-api/src/modules/auth/entities/session.entity.ts` — SessionRecord 类型
- `apps/platform-api/src/modules/auth/repositories/session.repository.ts` — Session Redis CRUD
- `apps/platform-api/src/modules/auth/entities/sessions.entity.ts` — Drizzle sessions 表定义

**修改：**
- `apps/platform-api/src/modules/auth/entities/auth.entity.ts` — 新增 JwtPayload 类型
- `apps/platform-api/src/modules/auth/dtos/auth.schema.ts` — 新增 RefreshSchema
- `apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts` — 新增 RefreshResponseDto
- `apps/platform-api/src/modules/auth/mappers/auth.mapper.ts` — 新增 refresh 响应映射
- `apps/platform-api/src/modules/auth/auth.service.ts` — 重构 login，新增 refresh/rotate
- `apps/platform-api/src/modules/auth/auth.controller.ts` — 新增 POST /auth/refresh
- `apps/platform-api/src/modules/auth/repositories/auth.repository.ts` — 修改 logout（同步清除 sessions）
- `apps/platform-api/src/common/guards/auth.guard.ts` — 新增 session 校验逻辑
- `apps/platform-api/src/modules/auth/auth.module.ts` — 注册 SessionRepository
- `apps/platform-api/src/schema/index.ts` — 导出 sessions 表

---

### Task 1: 新增 SessionRecord 类型和 JwtPayload 类型

**Files:**
- Create: `apps/platform-api/src/modules/auth/entities/session.entity.ts`
- Modify: `apps/platform-api/src/modules/auth/entities/auth.entity.ts`

- [ ] **Step 1: 创建 SessionRecord 类型**

`apps/platform-api/src/modules/auth/entities/session.entity.ts`:
```ts
export interface SessionRecord {
  id: string;
  userId: string;
  username: string;
  deviceId: string | null;
  ip: string | null;
  userAgent: string | null;
  refreshTokenHash: string;
  createdAt: string;
  lastActiveAt: string;
}
```

- [ ] **Step 2: 在 auth.entity.ts 中新增 JwtPayload 类型**

`apps/platform-api/src/modules/auth/entities/auth.entity.ts`:
```ts
export interface JwtPayload {
  username: string;
  sessionId?: string;
  tokenVersion?: number;
}
```
（追加到文件末尾，不要删除现有接口）

---

### Task 2: 创建 sessions 数据库表

**Files:**
- Create: `apps/platform-api/src/modules/auth/entities/sessions.entity.ts`
- Modify: `apps/platform-api/src/schema/index.ts`

- [ ] **Step 1: 创建 Drizzle sessions 表定义**

`apps/platform-api/src/modules/auth/entities/sessions.entity.ts`:
```ts
import { mysqlTable, varchar, char, datetime, int, index } from '@rx-ted/packages-honest';

export const sessions = mysqlTable('sessions', {
  id: char('id', { length: 36 }).primaryKey(),
  userId: char('user_id', { length: 36 }).notNull(),
  deviceId: varchar('device_id', { length: 64 }),
  ip: varchar('ip', { length: 45 }),
  userAgent: varchar('user_agent', { length: 255 }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull(),
  createdAt: datetime('created_at').notNull(),
  lastActiveAt: datetime('last_active_at').notNull(),
  revokedAt: datetime('revoked_at'),
}, (table) => ({
  idxUserId: index('idx_user_id').on(table.userId),
}));
```

- [ ] **Step 2: 在 schema/index.ts 中导出 sessions 表**

`apps/platform-api/src/schema/index.ts` 末尾追加：
```ts
export { sessions } from '../modules/auth/entities/sessions.entity';
```

- [ ] **Step 3: 生成数据库迁移**

Run:
```bash
pnpm --filter @rx-ted/platform-api db:generate
```
Expected: Drizzle 生成迁移文件到指定目录，包含 CREATE TABLE sessions

- [ ] **Step 4: 提交 Task 1-2**

```bash
git add apps/platform-api/src/modules/auth/entities/session.entity.ts
git add apps/platform-api/src/modules/auth/entities/sessions.entity.ts
git add apps/platform-api/src/modules/auth/entities/auth.entity.ts
git add apps/platform-api/src/schema/index.ts
git commit -m "feat(auth): add session entity types and sessions db table"
```

---

### Task 3: 创建 SessionRepository

**Files:**
- Create: `apps/platform-api/src/modules/auth/repositories/session.repository.ts`

- [ ] **Step 1: 创建 SessionRepository**

`apps/platform-api/src/modules/auth/repositories/session.repository.ts`:
```ts
import { Service, CacheService } from '@rx-ted/packages-honest';
import type { SessionRecord } from '../entities/session.entity';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days

@Service()
class SessionRepository {
  constructor(private cache: CacheService) {}

  async create(session: SessionRecord): Promise<void> {
    await this.cache.set(`session:${session.id}`, session, SESSION_TTL);
  }

  async findById(id: string): Promise<SessionRecord | null> {
    return this.cache.get<SessionRecord>(`session:${id}`);
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key);
  }

  /** 通过 refresh token hash 查找 sessionId */
  async getRefreshTokenHash(hashKey: string): Promise<string | null> {
    return this.cache.get<string>(hashKey);
  }

  /** 设置 refresh token hash -> sessionId 映射 */
  async setRefreshTokenHash(hashKey: string, sessionId: string): Promise<void> {
    await this.cache.set(hashKey, sessionId, SESSION_TTL);
  }

  async addToUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    ids.push(sessionId);
    await this.cache.set(key, ids, SESSION_TTL);
  }

  async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    const key = `user:sessions:${userId}`;
    const ids = (await this.cache.get<string[]>(key)) ?? [];
    await this.cache.set(key, ids.filter((id) => id !== sessionId), SESSION_TTL);
  }

  async getUserSessionIds(userId: string): Promise<string[]> {
    return (await this.cache.get<string[]>(`user:sessions:${userId}`)) ?? [];
  }

  async revokeUserSessions(userId: string): Promise<void> {
    const ids = await this.getUserSessionIds(userId);
    for (const id of ids) {
      await this.cache.delete(`session:${id}`);
    }
    await this.cache.delete(`user:sessions:${userId}`);
  }
}

export { SessionRepository };
```

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/modules/auth/repositories/session.repository.ts
git commit -m "feat(auth): add SessionRepository for Redis session CRUD"
```

---

### Task 4: 添加 Refresh Token 工具函数

**Files:**
- Modify: `apps/platform-api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: 在 auth.service.ts 中添加 refresh token 辅助函数**

在 `auth.service.ts` 中新增（在 `verifyPassword` 之后）：
```ts
import { createHash } from 'node:crypto';

function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(64).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
```

注意仅在 `randomBytes` 的 import 中不需要额外导入（文件顶部已有 `randomBytes` from `node:crypto`）。需要新增 `createHash` 导入——修改文件顶部的 import：
```ts
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
```

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): add refresh token generate and hash utilities"
```

---

### Task 5: 重构 AuthService（核心）

**Files:**
- Modify: `apps/platform-api/src/modules/auth/auth.service.ts`

- [ ] **Step 1: 修改 login 方法，创建 session 并返回双层 token**

将 login 方法替换为：
```ts
async login(username: string, password: string, ip?: string, userAgent?: string) {
  const user = await this.authRepo.getSessionUserByUsername(username);
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }
  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new HTTPException(401, { message: 'Invalid credentials' });
  }

  const sessionId = crypto.randomUUID();
  const RefreshToken = generateRefreshToken();
  const now = new Date().toISOString();

  const session: SessionRecord = {
    id: sessionId,
    userId: user.userId,
    username: user.username,
    deviceId: null,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    refreshTokenHash: RefreshToken.hash,
    createdAt: now,
    lastActiveAt: now,
  };

  await this.sessionRepo.create(session);
  await this.sessionRepo.addToUserSessions(user.userId, sessionId);
  await this.sessionRepo.setRefreshTokenHash(`session:hash:${RefreshToken.hash}`, sessionId);

  const jwtSecret: string = requireConfig('JWT_SECRET');
  const accessToken = jwt.sign(
    { username: user.username, sessionId, tokenVersion: user.tokenVersion },
    jwtSecret,
    { expiresIn: '15m' },
  );

  const sessionEntity = toSession(user);
  return {
    accessToken,
    refreshToken: RefreshToken.raw,
    expiresIn: '15m',
    sessionId,
    user: sessionEntity,
  };
}
```

需要在 class 顶部注入 `SessionRepository`：

```ts
constructor(
  private authRepo: AuthRepository,
  private sessionRepo: SessionRepository,
) {}
```

需要添加 import：
```ts
import type { SessionRecord } from './entities/session.entity';
import { SessionRepository } from './repositories/session.repository';
```

- [ ] **Step 2: 新增 refresh 方法**

```ts
async refresh(rawRefreshToken: string, ip?: string, userAgent?: string) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const hashKey = `session:hash:${tokenHash}`;
  const sessionId = await this.sessionRepo.getRefreshTokenHash(hashKey);

  if (!sessionId) {
    throw new HTTPException(401, { message: 'Invalid or expired refresh token' });
  }

  const session = await this.sessionRepo.findById(sessionId);
  if (!session) {
    throw new HTTPException(401, { message: 'Session expired' });
  }

  // 旋转 refresh token
  const newRefresh = generateRefreshToken();
  const now = new Date().toISOString();

  // 删除旧 hash key（旧 refresh token 立即失效）
  await this.sessionRepo.delete(hashKey);

  session.refreshTokenHash = newRefresh.hash;
  session.lastActiveAt = now;
  if (ip) session.ip = ip;
  if (userAgent) session.userAgent = userAgent;
  await this.sessionRepo.create(session);

  // 设置新 hash key 映射
  await this.sessionRepo.setRefreshTokenHash(
    `session:hash:${newRefresh.hash}`,
    session.id,
  );

  const jwtSecret: string = requireConfig('JWT_SECRET');
  const accessToken = jwt.sign(
    { username: session.username, sessionId: session.id },
    jwtSecret,
    { expiresIn: '15m' },
  );

  return {
    accessToken,
    refreshToken: newRefresh.raw,
    expiresIn: '15m',
  };
}
```

（不需要额外的 SessionRepository 方法，Task 3 中已包含 `getRefreshTokenHash`、`setRefreshTokenHash`、`delete`）

- [ ] **Step 3: 修改 logout 方法，清除 session**

将 logout 方法替换为：
```ts
async logout(username: string, sessionId?: string) {
  if (sessionId) {
    await this.sessionRepo.delete(sessionId);
  }
  await this.authRepo.invalidateSession(username);
  return AuthMapper.toLogoutResponse(1);
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/platform-api/src/modules/auth/auth.service.ts
git add apps/platform-api/src/modules/auth/repositories/session.repository.ts
git commit -m "feat(auth): implement login with session, refresh token rotation"
```

---

### Task 6: 修改登录 Controller 支持 Cookie

**Files:**
- Modify: `apps/platform-api/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: 修改 login 响应，设置 refresh_token Cookie**

修改 login 方法：
```ts
import { setCookie } from 'hono/cookie';

@Public()
@Post('login', {
  apiDoc: {
    summary: '登录',
    tags: ['Auth'],
    request: { body: LoginSchema },
    responses: {
      200: {
        description: '登录成功',
        schema: z.object({
          accessToken: z.string(),
          expiresIn: z.string(),
          sessionId: z.string(),
          user: z.any(),
        }),
      },
    },
  },
})
async login(@Body() body: unknown, @Ctx() c: Context) {
  const validated = LoginSchema.parse(body);
  const result = await this.authService.login(
    validated.username,
    validated.password,
    c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip'),
    c.req.header('user-agent'),
  );

  setCookie(c, 'refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });

  return {
    accessToken: result.accessToken,
    expiresIn: result.expiresIn,
    sessionId: result.sessionId,
    user: result.user,
  };
}
```

- [ ] **Step 2: 新增 refresh 端点**

```ts
@Public()
@Post('refresh', {
  apiDoc: {
    summary: '刷新 access token',
    tags: ['Auth'],
    responses: {
      200: {
        description: '刷新成功',
        schema: z.object({
          accessToken: z.string(),
          expiresIn: z.string(),
        }),
      },
    },
  },
})
async refresh(@Ctx() c: Context) {
  const refreshToken = c.req.header('Cookie')
    ?.split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('refresh_token='))
    ?.split('=')[1];

  if (!refreshToken) {
    throw new HTTPException(401, { message: 'Missing refresh token' });
  }

  const result = await this.authService.refresh(
    refreshToken,
    c.req.header('x-forwarded-for') ?? c.req.header('cf-connecting-ip'),
    c.req.header('user-agent'),
  );

  setCookie(c, 'refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60,
  });

  return {
    accessToken: result.accessToken,
    expiresIn: result.expiresIn,
  };
}
```

- [ ] **Step 3: 修改 logout 传递 sessionId**

修改 logout 方法从 cookie 或 user 中获取 session_id：
```ts
@Public()
@Post('logout', {
  apiDoc: {
    summary: '登出',
    tags: ['Auth'],
    responses: {
      200: {
        description: '登出成功',
        schema: z.object({ affectedRows: z.number() }),
      },
    },
  },
})
async logout(@Ctx() c: Context) {
  const user = c.get('user') as AuthEntity | undefined;
  const refreshToken = c.req.header('Cookie')
    ?.split(';')
    .map(s => s.trim())
    .find(s => s.startsWith('refresh_token='))
    ?.split('=')[1];

  let sessionId: string | undefined;
  if (refreshToken) {
    const tokenHash = hashRefreshToken(refreshToken);
    sessionId = await this.sessionRepo.getRefreshTokenHash(`session:hash:${tokenHash}`);
  }

  const result = await this.authService.logout(user?.username ?? '', sessionId);

  setCookie(c, 'refresh_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/api/v1/auth',
    maxAge: 0,
  });

  return result;
}
```

需要添加 import：
```ts
import { setCookie } from 'hono/cookie';
import { SessionRepository } from './repositories/session.repository';
import { hashRefreshToken } from './auth.service';
```

注意：需要将 `hashRefreshToken` 暴露为 export。

- [ ] **Step 4: 更新 controller import 暴露 hashRefreshToken**

在 `auth.service.ts` 中将 `hashRefreshToken` 改为 export：
```ts
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
```

- [ ] **Step 5: 提交**

```bash
git add apps/platform-api/src/modules/auth/auth.controller.ts
git add apps/platform-api/src/modules/auth/auth.service.ts
git commit -m "feat(auth): add refresh endpoint, set refresh_token cookie"
```

---

### Task 7: 修改 AuthGuard 支持 Session 校验

**Files:**
- Modify: `apps/platform-api/src/common/guards/auth.guard.ts`

- [ ] **Step 1: 重构 AuthGuard，优先使用 session 校验，降级到 tokenVersion**

`apps/platform-api/src/common/guards/auth.guard.ts`:
```ts
import jwt from 'jsonwebtoken';
import { Service } from '@rx-ted/packages-honest';
import type { IGuard } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { requireConfig } from '../../lib/config';
import { AuthRepository } from '../../modules/auth/repositories/auth.repository';
import { SessionRepository } from '../../modules/auth/repositories/session.repository';
import { isPublicHandler } from './is-public.util';

@Service()
export class AuthGuard implements IGuard {
  constructor(
    private authRepo: AuthRepository,
    private sessionRepo: SessionRepository,
  ) {}

  async canActivate(c: Context): Promise<boolean> {
    if (isPublicHandler(c)) return true;

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    if (!token) {
      throw new HTTPException(401, { message: 'Token is empty' });
    }

    let payload: { username: string; sessionId?: string; tokenVersion?: number };
    try {
      payload = jwt.verify(token, requireConfig('JWT_SECRET')) as {
        username: string;
        sessionId?: string;
        tokenVersion?: number;
      };
    } catch {
      throw new HTTPException(401, { message: 'Invalid or expired token' });
    }

    const user = await this.authRepo.getSessionUserByUsername(payload.username);
    if (!user) {
      throw new HTTPException(401, { message: 'User not found' });
    }

    // 如果有 sessionId，执行 session 校验
    if (payload.sessionId) {
      const session = await this.sessionRepo.findById(payload.sessionId);
      if (!session) {
        throw new HTTPException(401, { message: 'Session has been revoked' });
      }
      // 可选：更新 lastActiveAt
      // session.lastActiveAt = new Date().toISOString();
      // await this.sessionRepo.create(session);
    } else {
      // 向后兼容：旧 token 没有 sessionId，退化为 tokenVersion 校验
      if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
        throw new HTTPException(401, { message: 'Token has been invalidated' });
      }
    }

    c.set('user', user);
    return true;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/common/guards/auth.guard.ts
git commit -m "feat(auth): add session validation to AuthGuard with backward compat"
```

---

### Task 8: 更新 AuthModule 注册新依赖

**Files:**
- Modify: `apps/platform-api/src/modules/auth/auth.module.ts`

- [ ] **Step 1: 注册 SessionRepository**

`apps/platform-api/src/modules/auth/auth.module.ts`:
```ts
import { Module } from '@rx-ted/packages-honest';
import AuthController from './auth.controller';
import AuthService from './auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { SessionRepository } from './repositories/session.repository';

@Module({
  controllers: [AuthController],
  services: [AuthService, AuthRepository, SessionRepository],
})
class AuthModule {}

export default AuthModule;
```

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/modules/auth/auth.module.ts
git commit -m "feat(auth): register SessionRepository in AuthModule"
```

---

### Task 9: 更新 Response DTO 和 Mapper

**Files:**
- Modify: `apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts`
- Modify: `apps/platform-api/src/modules/auth/mappers/auth.mapper.ts`

- [ ] **Step 1: 新增 LoginResponseDto 和 RefreshResponseDto**

`apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts`:
```ts
export interface LoginResponseDto {
  accessToken: string;
  expiresIn: string;
  sessionId: string;
  user: AuthUserDto;
}

export interface RefreshResponseDto {
  accessToken: string;
  expiresIn: string;
}
```

（追加到文件末尾）

- [ ] **Step 2: 提交**

```bash
git add apps/platform-api/src/modules/auth/dtos/auth.response.dto.ts
git commit -m "feat(auth): add login/refresh response dto types"
```

---

### Task 10: 运行 DB 迁移

- [ ] **Step 1: 执行迁移**

```bash
pnpm --filter @rx-ted/platform-api db:migrate
```
Expected: 在 MySQL 创建 `sessions` 表

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @rx-ted/platform-api typecheck
```
Expected: 无类型错误

- [ ] **Step 3: 运行 test**

```bash
pnpm --filter @rx-ted/platform-api test
```
Expected: 通过（当前无测试）

---

## 验证方法

1. **启动 dev server**：
   ```bash
   pnpm --filter @rx-ted/platform-api dev
   ```

2. **登录**：
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"..."}' \
     -v
   ```
   预期：返回 `accessToken`、`sessionId`、`user`，并设置 `refresh_token` HttpOnly Cookie

3. **用 accessToken 请求受保护端点**：
   ```bash
   curl http://localhost:3000/api/v1/auth/me \
     -H 'Authorization: Bearer <accessToken>'
   ```
   预期：正常返回用户信息

4. **刷新 token**：
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/refresh \
     -H 'Cookie: refresh_token=<token>'
   ```
   预期：返回新的 accessToken，并设置新 refresh_token Cookie

5. **旧 token 兼容性验证**：
   使用未含 sessionId 的旧 JWT 请求
   预期：AuthGuard 降级为 tokenVersion 校验（若需验证可退出登录后使用旧 token）
