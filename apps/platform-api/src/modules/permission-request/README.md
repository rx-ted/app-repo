# Permission Request

## Controller

Authenticated with `ROLES.ADMIN` and `PERMISSIONS.PERMISSION_REQUEST_ACCESS_ANY`.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/permission-request` | Admin + PermissionRequestAccessAny | `query: { page?, pageSize? }` | 200 `{ data: PermissionRequestEntity[], total: number }` | 401/403 |
| GET | `/permission-request/me` | Admin + PermissionRequestAccessAny | — | 200 `PermissionRequestEntity[]` | 401/403 |
| POST | `/permission-request` | Admin + PermissionRequestAccessAny | `body: { permission_code?, target_user_id?, path?, scope?, expires_at?, reason? }` | 201 `{ affectedRows: number, id?: string }` | 401/403 |
| POST | `/permission-request/:id/approve` | Admin + PermissionRequestAccessAny | `params: { id }`, `body: { reason? }` | 200 `PermissionRequestEntity` | 401/403/404 |
| POST | `/permission-request/:id/reject` | Admin + PermissionRequestAccessAny | `params: { id }`, `body: { reason? }` | 200 `PermissionRequestEntity` | 401/403/404 |
| PUT | `/permission-request/:id` | Admin + PermissionRequestAccessAny | `params: { id }`, `body: { permission_code?, target_user_id?, path?, scope?, expires_at?, reason? }` | 200 `{ affectedRows: number }` | 401/403 |
| DELETE | `/permission-request/:id` | Admin + PermissionRequestAccessAny | `params: { id }` | 200 `{ affectedRows: number }` | 401/403 |

## Service

| Method | Description |
|--------|-------------|
| `list()` | Fetches all permission requests ordered by `created_at` descending. |
| `listMine()` | Fetches all permission requests ordered by `created_at` descending (no user filter — currently identical to `list()`). |
| `create(data)` | Inserts a new permission request with status `PENDING`. Returns the created row after re-querying. |
| `approve(id, data)` | Sets `status = 'APPROVED'`, `decided_at = NOW()`, `decision_reason = reason`. Returns updated row or null. |
| `reject(id, data)` | Sets `status = 'REJECTED'`, `decided_at = NOW()`, `decision_reason = reason`. Returns updated row or null. |
| `update(id, data)` | Dynamically builds update object from provided fields (user_id, request_type, path, scope, reason, expires_at). Returns updated row or null. |
| `delete(id)` | Deletes a permission request by id. Returns `{ affectedRows }`. |

### SQL Queries

| Query | SQL |
|-------|-----|
| List all requests | `SELECT * FROM permission_requests ORDER BY created_at DESC` |
| Insert request | `INSERT INTO permission_requests (user_id, request_type, path, scope, expires_at, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())` |
| Get by id | `SELECT * FROM permission_requests WHERE id = ? LIMIT 1` |
| Approve | `UPDATE permission_requests SET status = 'APPROVED', decided_at = NOW(), decision_reason = ? WHERE id = ?` |
| Reject | `UPDATE permission_requests SET status = 'REJECTED', decided_at = NOW(), decision_reason = ? WHERE id = ?` |
| Update fields | `UPDATE permission_requests SET {dynamic fields}, updated_at = NOW() WHERE id = ?` |
| Delete | `DELETE FROM permission_requests WHERE id = ?` |

### DB Schema — `permission_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` | PK, auto-increment |
| `user_id` | `char(36)` | FK → users.id, not null, on delete cascade |
| `request_type` | `enum('PERMISSION','ACCESS')` | Default `PERMISSION` |
| `permission_id` | `int` | FK → permissions.id, nullable |
| `target_user_id` | `char(36)` | FK → users.id, on delete set null |
| `path` | `varchar(255)` | |
| `scope` | `varchar(50)` | |
| `expires_at` | `datetime` | |
| `reason` | `varchar(255)` | |
| `status` | `enum('PENDING','APPROVED','REJECTED')` | Default `PENDING` |
| `decision_reason` | `varchar(255)` | |
| `decided_by` | `char(36)` | |
| `decided_at` | `datetime` | |
| `created_at` | `datetime` | not null |
| `updated_at` | `datetime` | not null |

Indexes: `idx_permission_id`, `idx_status`, `idx_decided_by`, `idx_request_type`, `idx_target_user`, `idx_expires_at`.

## Repository

No dedicated repository layer. All queries are executed inline in the service via Drizzle ORM.
