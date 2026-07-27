# Permission

## Controller

Authenticated with `ROLES.ADMIN` and `PERMISSIONS.PERMISSION_ACCESS_ANY`.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/permission` | Admin + PermissionAccessAny | `query: { page?, pageSize? }` | 200 `{ data: PermissionEntity[], total: number }` | 401/403 |
| POST | `/permission` | Admin + PermissionAccessAny | `body: { name, code, description? }` | 201 `{ affectedRows: number, id?: string }` | 401/403 |
| DELETE | `/permission` | Admin + PermissionAccessAny | `body: { permission_id: number, target_user_id? }` | 200 `{ affectedRows: number }` | 401/403 |

## Service

| Method | Description | Caching |
|--------|-------------|---------|
| `list()` | Selects all permissions. Maps rows to response DTOs with `code` derived as `resource:action`. | Cache key `permissions:list`, TTL via `CACHE.USER_SESSION_TTL` |
| `upsert(data)` | Inserts a new permission row. Splits `code` into `resource` and `action` columns. Sets `scope` to empty string. Invalidates list cache. | Cache invalidated |
| `remove(data)` | Deletes a permission by `id`. Invalidates list cache. | Cache invalidated |

### SQL Queries

| Query | SQL |
|-------|-----|
| List all permissions | `SELECT * FROM permissions` |
| Insert permission | `INSERT INTO permissions (resource, action, scope, name, created_at, updated_at) VALUES (?, ?, '', ?, NOW(), NOW())` |
| Delete permission | `DELETE FROM permissions WHERE id = ?` |

### DB Schema — `permissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `int` | PK, auto-increment |
| `resource` | `varchar(100)` | not null |
| `action` | `varchar(50)` | not null |
| `scope` | `varchar(20)` | not null |
| `effect` | `enum('ALLOW','DENY')` | Default `ALLOW` |
| `name` | `varchar(100)` | |
| `created_at` | `datetime` | not null |
| `updated_at` | `datetime` | not null |

Unique index: `uk_perm` on (resource, action, scope).

### Related Tables

- `user_permission_mappings` — composite PK (user_id, permission_id), FK → users.id and permissions.id with cascade delete.
- `role_permission_mappings` — composite PK (role_id, permission_id), FK → roles.id and permissions.id with cascade delete.

## Repository

No dedicated repository layer. All queries are executed inline in the service via Drizzle ORM.
