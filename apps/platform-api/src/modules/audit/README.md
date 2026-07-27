# Audit

## Controller

All endpoints guarded by `AuthGuard`, `RolesGuard`, `PermissionsGuard` with `ROLES.ADMIN` and `PERMISSIONS.AUDIT_ACCESS_ANY`.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /audit | Auth (Admin) | Query: `page`, `pageSize` | 200 `{ data: AuditEntity[], total: number }` | 401/403 |
| GET | /audit/:id | Auth (Admin) | Param: `id` (string) | 200 `AuditEntity` | 401/403 |
| POST | /audit | Auth (Admin) | Body: `{ actor_id, actor_role, action, target_type, target_id, status, message?, meta? }` | 201 `{ affectedRows, id? }` | 401/403 |
| PUT | /audit/:id | Auth (Admin) | Param: `id`, Body: `{ message?, meta? }` | 200 `{ affectedRows }` | 401/403 |
| DELETE | /audit/:id | Auth (Admin) | Param: `id` | 200 `{ affectedRows }` | 401/403 |

## Service

Provides audit logging capabilities. Maps entity status `FAILED` ↔ service status `FAILURE`.

| Method | Description |
|--------|-------------|
| `list(page?, pageSize?)` | Returns paginated audit logs sorted by `createdAt` DESC. Defaults: page=1, pageSize=20. |
| `getById(id)` | Returns a single audit log by numeric ID, or null. |
| `record(data)` | Inserts an audit log entry with a timestamp. Returns the created record. |
| `create(data)` | Alias for `record()`. |
| `update(id, data)` | Updates audit log fields by ID. |
| `delete(id)` | Deletes audit log by ID. |

## SQL (via Drizzle ORM on `audit_logs` table)

| Operation | SQL |
|-----------|-----|
| List (paginated) | `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?` |
| Get by ID | `SELECT * FROM audit_logs WHERE id = ? LIMIT 1` |
| Create | `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, status, message, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` |
| Update | `UPDATE audit_logs SET actor_id = ?, actor_role = ?, action = ?, target_type = ?, target_id = ?, status = ?, message = ?, meta = ? WHERE id = ?` |
| Delete | `DELETE FROM audit_logs WHERE id = ?` |
