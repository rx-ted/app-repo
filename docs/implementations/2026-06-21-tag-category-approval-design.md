# Tag/Category Approval Workflow

> **Status: NOT IMPLEMENTED** — 审批工作流尚未实现。

## Problem

Non-admin users need to suggest creating tags and categories, but only designated
admins should be able to create them. The system needs an approval workflow that:
1. Lets non-admins request tag/category creation
2. Shows them who to contact for approval
3. Lets admins approve/reject requests, which auto-creates the entity on approval
4. Lets admins create directly without approval

## Design

### Approach

Extend the existing `permission_requests` table with `entity_type` and
`entity_data` columns. Reuse the existing permission-request approve/reject flow.
When an approval happens, the permission-request service auto-creates the target
entity (tag or category).

### Database: permission_requests table

| Column       | Type          | Description                                               |
|-------------|---------------|-----------------------------------------------------------|
| `entity_type` | `varchar(50)` | `'tag'` or `'category'`. Nullable (null = legacy permission request) |
| `entity_data` | `text`        | JSON payload with creation data, e.g. `{"name":"React","slug":"react"}` |

Drizzle schema additions to `permissionRequests` table definition:

```ts
entityType: varchar('entity_type', { length: 50 }),
entityData: text('entity_data'),
```

`PermissionRequestEntity` interface and Zod schema get corresponding
`entity_type: string | null` and `entity_data: string | null` fields.

### New Permissions

Add to `constants/roles.ts`:

```ts
TAGS_APPROVE: 'tags:approve',
CATEGORY_APPROVE: 'category:approve',
```

Users with `tags:approve` are tag approval admins. Users with
`category:approve` are category approval admins. These permissions should
be assigned to the admin role in DB seed data.

### Permission-Request Module Changes

**Create (`POST /permission-request`):**
- `CreatePermissionRequestSchema` adds optional `entity_type` and `entity_data` fields.
- Service create method persists these to DB.

**Approve (`POST /permission-request/:id/approve`):**
- Inject `TagsService` and `CategoryService`.
- Guard: only approve `PENDING` requests; reject if already
  `APPROVED`/`REJECTED`.
- Record `decided_by` with the current admin's user ID.
- `entity_type === 'tag'` → call `TagsService.create(JSON.parse(entity_data))`.
- `entity_type === 'category'` → call `CategoryService.create(JSON.parse(entity_data))`.
- No `entity_type` → legacy permission request, no entity creation.

**Reject (`POST /permission-request/:id/reject`):**
- Guard: only reject `PENDING` requests.
- Record `decided_by`.

**Bug fixes included:**
- `listMine()` adds `WHERE userId = ?` filter (currently returns all rows).
- `permission_code` in entity mapped from `permissionId` via join (currently
  hardcoded to `''`).

### Tags / Category Controller Changes

Remove class-level `@Roles(ROLES.ADMIN)` + `@Permissions(PERMISSIONS.TAGS_ACCESS_ANY)`
from `POST` methods; apply them only to `PUT`/`DELETE`. `GET` stays `@Public()`.

**`POST /tags` logic:**
```
if (current user has tags:approve permission) {
  // Admin — create directly
  tagsService.create(data)
} else {
  // Non-admin — return 403 with admin contact info
  403 {
    message: "需要管理员审批",
    admins: [
      {
        userId: "xxx",
        username: "admin",
        nickname: "管理员",
        email: "admin@example.com"
      }
    ]
  }
}
```

**`POST /categories` logic:**
Same pattern, using `category:approve` permission.

**Admin contact lookup:**
Query users who have `tags:approve` / `category:approve` via
`user_role_mappings` → `role_permission_mappings` → `permissions` join.
Return basic profile info (nickname, email, avatar).

### User Flow

```
Non-admin                        System                          Admin
    |                               |                               |
    |-- POST /tags ---------------->|                               |
    |<-- 403 + admins[] ------------|                               |
    |                               |                               |
    |-- POST /permission-request -->|                               |
    |   { entity_type:'tag',        |                               |
    |     entity_data:{name,slug} } |                               |
    |<-- permission_request_id -----|                               |
    |                               |                               |
    |                               |-- GET /permission-request -->|
    |                               |<-- [pending requests...] ----|
    |                               |                               |
    |                               |<-- POST :id/approve ---------|
    |                               |-- tag created automatically  |
    |                               |-- status -> APPROVED --------|
```

### Files Changed

| File | Change |
|------|--------|
| `apps/platform-api/src/constants/roles.ts` | Add `TAGS_APPROVE`, `CATEGORY_APPROVE` |
| `apps/platform-api/src/modules/permission-request/entities/permission-request.entity.ts` | Add `entity_type`, `entity_data` to drizzle schema, Zod schema, interface |
| `apps/platform-api/src/modules/permission-request/dtos/permission-request.schema.ts` | Add `entity_type`, `entity_data` to CreateSchema |
| `apps/platform-api/src/modules/permission-request/permission-request.service.ts` | Inject TagsService/CategoryService; approve() creates entity; reject() guards state; fix listMine() filter; fix permission_code mapping |
| `apps/platform-api/src/modules/permission-request/mappers/permission-request.mapper.ts` | Map `entity_type`, `entity_data` |
| `apps/platform-api/src/modules/tags/tags.controller.ts` | Class guards → per-method guards; POST returns 403 + admins for non-admin |
| `apps/platform-api/src/modules/category/category.controller.ts` | Same as tags |
| `apps/platform-api/src/modules/tags/tags.service.ts` | No change (already has create) |
| `apps/platform-api/src/modules/category/category.service.ts` | No change (already has create) |

### TODO

- **Two-admin mutual approval**: Current design lets a single admin create
  directly without oversight. Future enhancement: require two admins — one
  submits, another approves — so no single admin can create tags/categories
  unilaterally.
- **Notification**: When permission request is approved/rejected, notify the
  requester (email or in-app).

### Testing

- Tag creation by admin → created directly, no permission request created.
- Tag creation by non-admin → 403 with admin contact info.
- Permission-request creation with entity_type='tag' → stored correctly.
- Permission-request approve with entity_type='tag' → tag auto-created.
- Permission-request approve without entity_type → no entity created (legacy).
- Permission-request approve of already-approved request → rejected.
- Permission-request reject → status set to REJECTED, no entity created.
- `listMine()` only returns current user's requests.
- Permission-request approval records `decided_by`.
