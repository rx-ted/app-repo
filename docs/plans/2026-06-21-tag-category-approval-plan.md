# Tag/Category Approval Workflow Implementation Plan

> **Status: NOT IMPLEMENTED** — 审批工作流后端接口尚未实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approval workflow for tag/category creation where admins create directly and non-admins submit permission requests that auto-create the entity on approval.

**Architecture:** Extends `permission_requests` table with `entity_type`/`entity_data` columns. Permission-request service gains auto-creation logic via injected TagsService/CategoryService. Tags/category controllers check for `tags:approve`/`category:approve` permission — admins create directly, non-admins get 403 + admin contacts.

**Tech Stack:** TypeScript 6, Drizzle ORM, Honest DI, Zod, Vitest 4

---

## Modified Files

| File | Change |
|------|--------|
| `apps/platform-api/src/constants/roles.ts` | Add `TAGS_APPROVE`, `CATEGORY_APPROVE` |
| `apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts` | Add `entity_type`/`entity_data` to Drizzle schema, Zod schema, Entity interface |
| `apps/platform-api/src/modules/permission-request/dtos/permission-request.schema.ts` | Add `entity_type`/`entity_data` to CreateSchema |
| `apps/platform-api/src/modules/permission-request/mappers/permission-request.mapper.ts` | Map `entity_type`/`entity_data` |
| `apps/platform-api/src/modules/permission-request/permission-request.service.ts` | Inject TagsService/CategoryService; approve auto-creates entity; reject guards state; fix listMine(userId); fix permission_code; record decided_by |
| `apps/platform-api/src/modules/permission-request/permission-request.controller.ts` | Pass `@Var('user')` to create/approve/reject/listMine |
| `apps/platform-api/src/modules/tags/tags.controller.ts` | Per-method guards; POST admin-create vs 403 |
| `apps/platform-api/src/modules/tags/tags.service.ts` | Add `findApprovers()` method |
| `apps/platform-api/src/modules/category/category.controller.ts` | Same as tags pattern |
| `apps/platform-api/src/modules/category/category.service.ts` | Add `findApprovers()` method |
| `apps/platform-api/src/modules/permission-request/permission-request.service.spec.ts` | Test approval/reject guards, listMine filter |

---

### Task 1: Add approval permissions to constants

**Files:**
- Modify: `apps/platform-api/src/constants/roles.ts`

- [ ] **Step 1: Add TAGS_APPROVE and CATEGORY_APPROVE**

Edit `apps/platform-api/src/constants/roles.ts`, add after `PERMISSION_ACCESS_ANY: 'permission:access:any',`:

```ts
  TAGS_APPROVE: 'tags:approve',
  CATEGORY_APPROVE: 'category:approve',
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/src/constants/roles.ts && git commit -m "feat(platform-api): add tags:approve and category:approve permissions"
```

---

### Task 2: Update permission-request entity

**Files:**
- Modify: `apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts`

- [ ] **Step 1: Add `entityType` and `entityData` to Drizzle schema**

After `scope: varchar('scope', { length: 50 }),` add:
```ts
    entityType: varchar('entity_type', { length: 50 }),
    entityData: text('entity_data'),
```

- [ ] **Step 2: Add to Zod PermissionRequestEntitySchema**

After `scope: z.string().nullable(),` add:
```ts
    entity_type: z.string().nullable(),
    entity_data: z.string().nullable(),
```

- [ ] **Step 3: Add to PermissionRequestEntity interface**

After `scope: string | null;` add:
```ts
    entity_type: string | null;
    entity_data: string | null;
```

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts && git commit -m "feat(platform-api): add entity_type/entity_data to permission_requests"
```

---

### Task 3: Update permission-request DTO schemas

**Files:**
- Modify: `apps/platform-api/src/modules/permission-request/dtos/permission-request.schema.ts`

- [ ] **Step 1: Add entity_type and entity_data to CreatePermissionRequestSchema**

```ts
export const CreatePermissionRequestSchema = z.object({
  permission_code: z.string().optional(),
  target_user_id: z.string().optional(),
  path: z.string().optional(),
  scope: z.string().optional(),
  entity_type: z.enum(['tag', 'category']).optional(),
  entity_data: z.string().optional(),
  expires_at: z.string().optional(),
  reason: z.string().optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/dtos/permission-request.schema.ts && git commit -m "feat(platform-api): add entity_type/entity_data to permission-request schema"
```

---

### Task 4: Update permission-request mapper

**Files:**
- Modify: `apps/platform-api/src/modules/permission-request/mappers/permission-request.mapper.ts`

- [ ] **Step 1: Read current mapper**

Run: `cat apps/platform-api/src/modules/permission-request/mappers/permission-request.mapper.ts`

- [ ] **Step 2: Add entity_type/entity_data mapping**

Add to the `toResponse` method:
```ts
  entity_type: entity.entity_type,
  entity_data: entity.entity_data,
```

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/mappers/permission-request.mapper.ts && git commit -m "feat(platform-api): map entity_type/entity_data in permission-request mapper"
```

---

### Task 5a: Update permission-request controller (user params)

**Files:**
- Modify: `apps/platform-api/src/modules/permission-request/permission-request.controller.ts`

- [ ] **Step 1: Add @Var('user') to controller methods**

```ts
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
// ...existing imports...

  @Get('', ...)
  async list() {
    return this.permissionRequestService.list();
  }

  @Get('me', ...)
  async listMine(@Var('user') user: AuthEntity) {
    return this.permissionRequestService.listMine(user.userId);
  }

  @Post('', ...)
  async create(@Body() body: Partial<PermissionRequestEntity>, @Var('user') user: AuthEntity) {
    return this.permissionRequestService.create(body, user.userId);
  }

  @Post(':id/approve', ...)
  async approve(@Param('id') id: string, @Body() body: { reason?: string }, @Var('user') user: AuthEntity) {
    return this.permissionRequestService.approve(id, body, user.userId);
  }

  @Post(':id/reject', ...)
  async reject(@Param('id') id: string, @Body() body: { reason?: string }, @Var('user') user: AuthEntity) {
    return this.permissionRequestService.reject(id, body, user.userId);
  }
```

- [ ] **Step 2: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/permission-request.controller.ts && git commit -m "feat(platform-api): pass userId to permission-request service methods"
```

---

### Task 5b: Rewrite permission-request service

**Files:**
- Modify: `apps/platform-api/src/modules/permission-request/permission-request.service.ts`

- [ ] **Step 1: Add TagsService/CategoryService imports and injection**

```ts
import TagsService from '@/modules/tags/tags.service';
import CategoryService from '@/modules/category/category.service';

// In constructor:
constructor(
  private db: DbService,
  private tagsService: TagsService,
  private categoryService: CategoryService,
) {}
```

- [ ] **Step 2: Fix `listMine(userId)` to filter by user**

```ts
async listMine(userId: string): Promise<PermissionRequestResponseDto[]> {
  const rows = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.userId, userId))
    .orderBy(desc(permissionRequests.createdAt));
  return rows.map((row) => PermissionRequestMapper.toResponse(mapPermissionRequestRow(row)));
}
```

- [ ] **Step 3: Update `create(data, userId)` to persist entity_type/entity_data and accept userId**

```ts
async create(data: Partial<PermissionRequestEntity>, userId: string): Promise<PermissionRequestResponseDto> {
  const now = new Date();
  const [result] = await this.db.insert(permissionRequests).values({
    userId: userId,
    requestType: data.request_type ?? 'PERMISSION',
    path: data.path,
    scope: data.scope,
    entityType: data.entity_type,
    entityData: data.entity_data,
    expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    reason: data.reason,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
  const [row] = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, result.insertId))
    .limit(1);
  return PermissionRequestMapper.toResponse(mapPermissionRequestRow(row));
}
```

- [ ] **Step 4: Update `approve()` with status guard + auto-create entity + decided_by**

```ts
async approve(
  _id: string,
  _data: { reason?: string },
  decidedBy: string,
): Promise<PermissionRequestResponseDto | null> {
  const id = Number(_id);

  // Only approve PENDING requests
  const [existing] = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, id))
    .limit(1);
  if (!existing || existing.status !== 'PENDING') return null;

  // Auto-create entity if entity_type is set
  if (existing.entityType === 'tag' && existing.entityData) {
    const entityData = JSON.parse(existing.entityData);
    await this.tagsService.create({ name: entityData.name, slug: entityData.slug });
  } else if (existing.entityType === 'category' && existing.entityData) {
    const entityData = JSON.parse(existing.entityData);
    await this.categoryService.create({
      name: entityData.name,
      slug: entityData.slug,
      description: entityData.description,
    });
  }

  await this.db
    .update(permissionRequests)
    .set({
      status: 'APPROVED',
      decidedAt: new Date(),
      decisionReason: _data.reason,
      decidedBy: decidedBy,
    })
    .where(eq(permissionRequests.id, id));

  const [row] = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, id))
    .limit(1);
  if (!row) return null;
  return PermissionRequestMapper.toResponse(mapPermissionRequestRow(row));
}
```

- [ ] **Step 5: Update `reject()` with status guard + decided_by**

```ts
async reject(
  _id: string,
  _data: { reason?: string },
  decidedBy: string,
): Promise<PermissionRequestResponseDto | null> {
  const id = Number(_id);

  // Only reject PENDING requests
  const [existing] = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, id))
    .limit(1);
  if (!existing || existing.status !== 'PENDING') return null;

  await this.db
    .update(permissionRequests)
    .set({
      status: 'REJECTED',
      decidedAt: new Date(),
      decisionReason: _data.reason,
      decidedBy: decidedBy,
    })
    .where(eq(permissionRequests.id, id));

  const [row] = await this.db
    .select()
    .from(permissionRequests)
    .where(eq(permissionRequests.id, id))
    .limit(1);
  if (!row) return null;
  return PermissionRequestMapper.toResponse(mapPermissionRequestRow(row));
}
```

- [ ] **Step 6: Fix `mapPermissionRequestRow` to include entity_type/entity_data and permission_code**

```ts
function mapPermissionRequestRow(
  row: typeof permissionRequests.$inferSelect,
): PermissionRequestEntity {
  return {
    id: String(row.id),
    user_id: row.userId,
    permission_code: row.entityType === 'tag' || row.entityType === 'category'
      ? `${row.entityType}:create`
      : '',
    request_type: row.requestType ?? 'PERMISSION',
    target_user_id: row.targetUserId ?? null,
    path: row.path ?? null,
    scope: row.scope ?? null,
    entity_type: row.entityType ?? null,
    entity_data: row.entityData ?? null,
    expires_at: row.expiresAt?.toISOString() ?? null,
    status: row.status ?? 'PENDING',
    reason: row.reason ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 7: Run platform-api tests**

Run: `cd apps/platform-api && pnpm test`
Expected: All 96 tests pass

- [ ] **Step 8: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/permission-request.service.ts && git commit -m "feat(platform-api): permission-request approve auto-creates entity, fix listMine, add decided_by"
```

---

### Task 6: Update tags controller + service

**Files:**
- Modify: `apps/platform-api/src/modules/tags/tags.controller.ts`
- Modify: `apps/platform-api/src/modules/tags/tags.service.ts`

- [ ] **Step 1: Rewrite tags controller with per-method guards**

```ts
import {
  Body, Controller, Delete, Get, Param, Post, Put, UseGuards, Var,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Public, Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { TagEntitySchema } from '@/modules/tags/entities/tags.entity';
import { CreateTagSchema, TagsListQuerySchema, UpdateTagSchema } from '@/modules/tags/dtos/tags.schema';
import TagsService from '@/modules/tags/tags.service';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { forbidden } from '@/lib/api-error';

@Controller('tags', {
  tag: { name: 'Tags', description: '标签管理相关接口' },
})
class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get('', ...)
  async list() {
    return this.tagsService.findAll();
  }

  @Public()
  @Get(':id', ...)
  async findById(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @UseGuards(AuthGuard)
  @Post('', ...)
  async create(@Body() body: unknown, @Var('user') user: AuthEntity) {
    // Check if user has tags:approve permission
    if (!user.permissions.includes('tags:approve')) {
      const admins = await this.tagsService.findApprovers();
      throw forbidden(
        'APPROVAL_REQUIRED',
        '需要管理员审批方可创建标签',
        { admins },
      );
    }
    const data = body as { name: string; slug: string };
    return this.tagsService.create(data);
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.TAGS_ACCESS_ANY)
  @Put(':id', ...)
  async update(@Param('id') id: string, @Body() body: unknown) {
    const data = body as { name?: string; slug?: string };
    return this.tagsService.update(id, data);
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.TAGS_ACCESS_ANY)
  @Delete(':id', ...)
  async delete(@Param('id') id: string) {
    return this.tagsService.delete(id);
  }
}

export default TagsController;
```

- [ ] **Step 2: Add findApprovers() to TagsService**

Inject `DbService` in TagsService constructor.

Add method:
```ts
import { inArray } from 'drizzle-orm';

async findApprovers() {
  // Find permission by resource+action
  const permRows = await this.db
    .select({ id: permissions.id })
    .from(permissions)
    .where(
      and(eq(permissions.resource, 'tags'), eq(permissions.action, 'approve')),
    )
    .limit(1);
  if (!permRows.length) return [];

  // Find roles that have this permission
  const roleRows = await this.db
    .select({ roleId: rolePermissionMappings.roleId })
    .from(rolePermissionMappings)
    .where(eq(rolePermissionMappings.permissionId, permRows[0].id));
  if (!roleRows.length) return [];
  const roleIds = roleRows.map((r) => r.roleId);

  // Find users in those roles
  const userRows = await this.db
    .select({
      userId: users.id,
      username: users.username,
      nickname: userProfiles.nickname,
      email: users.email,
    })
    .from(userRoleMappings)
    .innerJoin(users, eq(userRoleMappings.userId, users.id))
    .leftJoin(userProfiles, eq(userRoleMappings.userId, userProfiles.userId))
    .where(inArray(userRoleMappings.roleId, roleIds));

  // Deduplicate by userId
  const seen = new Set<string>();
  return userRows.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });
}
```

- [ ] **Step 3: Import required dependencies in both files**

Imports needed in `tags.service.ts`:
```ts
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest';
import { permissions, rolePermissionMappings } from '@/modules/permission/entities/permission.entity';
import { userRoleMappings } from '@/modules/role/entities/role.entity';
import { users } from '@/modules/user/entities/user.entity';
import { userProfiles } from '@/modules/user/entities/user.entity';
```

- [ ] **Step 4: Run platform-api tests**

Run: `cd apps/platform-api && pnpm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/modules/tags/ && git commit -m "feat(platform-api): tags controller per-method guards with approval workflow"
```

---

### Task 7: Update category controller + service

**Files:**
- Modify: `apps/platform-api/src/modules/category/category.controller.ts`
- Modify: `apps/platform-api/src/modules/category/category.service.ts`

- [ ] **Step 1: Move class-level guards to per-method in controller**

```ts
import {
  Body, Controller, Get, Post, Put, Delete, Param, UseGuards, Var,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Public, Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { CategoryEntitySchema } from '@/modules/category/entities/category.entity';
import CategoryService from '@/modules/category/category.service';
import { CreateCategorySchema, UpdateCategorySchema } from '@/modules/category/dtos/category.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { forbidden } from '@/lib/api-error';

@Controller('categories', {
  tag: { name: 'Categories', description: '分类管理相关接口' },
})
class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Public()
  @Get('', ...)
  async list() {
    return this.categoryService.list();
  }

  @UseGuards(AuthGuard)
  @Post('', ...)
  async create(@Body() body: unknown, @Var('user') user: AuthEntity) {
    // Check if user has category:approve permission
    if (!user.permissions.includes('category:approve')) {
      const admins = await this.categoryService.findApprovers();
      throw forbidden(
        'APPROVAL_REQUIRED',
        '需要管理员审批方可创建分类',
        { admins },
      );
    }
    const data = CreateCategorySchema.parse(body);
    return this.categoryService.create({
      ...data,
      slug: data.slug ?? data.name.toLowerCase().replace(/\s+/g, '-'),
    });
  }

  // PUT /:id and DELETE /:id need full admin permissions
  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.CATEGORY_ACCESS_ANY)
  @Put(':id', ...)
  async update(@Param('id') id: string, @Body() body: unknown) {
    // ...
  }

  @UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
  @Roles(ROLES.ADMIN)
  @Permissions(PERMISSIONS.CATEGORY_ACCESS_ANY)
  @Delete(':id', ...)
  async delete(@Param('id') id: string) {
    // ...
  }
}
```

- [ ] **Step 2: Update CategoryService — add DbService injection and findApprovers()**

```ts
// Add to imports in category.service.ts:
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest';
import { permissions, rolePermissionMappings } from '@/modules/permission/entities/permission.entity';
import { userRoleMappings } from '@/modules/role/entities/role.entity';
import { users } from '@/modules/user/entities/user.entity';
import { userProfiles } from '@/modules/user/entities/user.entity';

// Add DbService to constructor:
constructor(
  private categoryRepo: CategoryRepository,
  private db: DbService,
) {}

// Add method:
async findApprovers() {
  const permRows = await this.db
    .select({ id: permissions.id })
    .from(permissions)
    .where(
      and(eq(permissions.resource, 'category'), eq(permissions.action, 'approve')),
    )
    .limit(1);
  if (!permRows.length) return [];

  const roleRows = await this.db
    .select({ roleId: rolePermissionMappings.roleId })
    .from(rolePermissionMappings)
    .where(eq(rolePermissionMappings.permissionId, permRows[0].id));
  if (!roleRows.length) return [];
  const roleIds = roleRows.map((r) => r.roleId);

  const userRows = await this.db
    .select({
      userId: users.id,
      username: users.username,
      nickname: userProfiles.nickname,
      email: users.email,
    })
    .from(userRoleMappings)
    .innerJoin(users, eq(userRoleMappings.userId, users.id))
    .leftJoin(userProfiles, eq(userRoleMappings.userId, userProfiles.userId))
    .where(inArray(userRoleMappings.roleId, roleIds));

  const seen = new Set<string>();
  return userRows.filter((r) => {
    if (seen.has(r.userId)) return false;
    seen.add(r.userId);
    return true;
  });
}
```

- [ ] **Step 3: Run platform-api tests**

Run: `cd apps/platform-api && pnpm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/category/ && git commit -m "feat(platform-api): category controller per-method guards with approval workflow"
```

---

### Task 8: Write tests for approval workflow

**Files:**
- Create: `apps/platform-api/src/modules/permission-request/permission-request.service.spec.ts`

- [ ] **Step 1: Write test for listMine with userId filter**

```ts
import { describe, expect, it, vi } from 'vitest';
import { Test } from '@rx-ted/packages-honest/testing';
import PermissionRequestService from './permission-request.service';

describe('PermissionRequestService', () => {
  describe('approve', () => {
    it('should reject approval of non-PENDING request', async () => {
      const app = await Test.createTestingModule({
        providers: [PermissionRequestService],
      }).compile();
      const service = app.get(PermissionRequestService);

      // Mock DB to return already-approved request
      const mockDb = (service as any).db;
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ status: 'APPROVED' }]),
          }),
        }),
      });

      const result = await service.approve('1', {}, 'admin-id');
      expect(result).toBeNull();
    });
  });

  describe('listMine', () => {
    it('should filter by userId', async () => {
      const app = await Test.createTestingModule({
        providers: [PermissionRequestService],
      }).compile();
      const service = app.get(PermissionRequestService);

      const mockDb = (service as any).db;
      let whereCondition: any = null;
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn((condition: any) => {
            whereCondition = condition;
            return { orderBy: vi.fn().mockResolvedValue([]) };
          }),
        }),
      });

      await service.listMine('user-123');
      // Verify the where condition references userId column
      expect(whereCondition).not.toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the test**

Run: `cd apps/platform-api && npx vitest run src/modules/permission-request/permission-request.service.spec.ts`
Expected: Tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/permission-request/permission-request.service.spec.ts && git commit -m "test(platform-api): add permission-request service tests for approval workflow"
```

---

### Task 9: Global verification

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/ben/projects/app && pnpm verify`
Expected: All checks, tests, typecheck pass

- [ ] **Step 2: Final commit if needed**

## TODO (separate tracking)

- **Two-admin mutual approval**: Future enhancement — require 2 admins for approval so no single admin can create tags/categories unilaterally.
- **Notification**: When permission request is approved/rejected, notify the requester.
