# Announcement

## Controller

Controllers are guarded by `AuthGuard`, `RolesGuard`, `PermissionsGuard` with `ROLES.ADMIN` and `PERMISSIONS.ANNOUNCEMENT_ACCESS_ANY` at class level. Methods marked `@Public()` bypass auth.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /announcement/active | Public | - | 200 `ActiveAnnouncementsResponseDto` (`{ top, footer, meta }`) | - |
| GET | /announcement | Public | Query: `page`, `pageSize` | 200 `{ data: AnnouncementEntity[], total: number }` | - |
| GET | /announcement/:id | Public | Param: `id` (string) | 200 `AnnouncementEntity` | - |
| POST | /announcement | Auth (Admin) | Body: `{ title, content, slot, audiences, original?, translated? }` | 201 `{ affectedRows, id? }` | 401/403 |
| PUT | /announcement/:id | Auth (Admin) | Param: `id`, Body: `{ title?, content?, slot?, audiences?, original?, translated? }` | 200 `{ affectedRows }` | 401/403 |
| DELETE | /announcement/:id | Auth (Admin) | Param: `id` | 200 `{ affectedRows }` | 401/403 |

## Service

Manages announcements with caching. Active announcements are cached under key `announcements:active`. Invalidates cache on create/update/delete.

| Method | Description |
|--------|-------------|
| `listActive()` | Returns enabled announcements within the active window (`activeFrom <= now`, `activeUntil >= now \|\| null`), sorted by priority DESC. Also fetches latest frontend version. Cached. |
| `listAll()` | Returns all announcements sorted by `createdAt` DESC. |
| `getById(id)` | Returns a single announcement by numeric ID, or null if not found. |
| `create(data)` | Inserts a new announcement with defaults (enabled=true, priority=0, dismissible=true). Invalidates cache. |
| `update(id, data)` | Updates announcement fields (slot, payloadJson, translatedPayloadJson). Invalidates cache. |
| `delete(id)` | Deletes announcement by ID. Invalidates cache. |

## SQL (via Drizzle ORM on `announcements` table)

| Operation | SQL |
|-----------|-----|
| List active | `SELECT * FROM announcements WHERE enabled = 1 AND active_from <= ? AND (active_until IS NULL OR active_until >= ?) ORDER BY priority DESC` |
| List all | `SELECT * FROM announcements ORDER BY created_at DESC` |
| Get by ID | `SELECT * FROM announcements WHERE id = ? LIMIT 1` |
| Create | `INSERT INTO announcements (slot, payload_json, translated_payload_json, enabled, priority, dismissible, active_from, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` |
| Update | `UPDATE announcements SET updated_at = ?, slot = ?, payload_json = ?, translated_payload_json = ? WHERE id = ?` |
| Delete | `DELETE FROM announcements WHERE id = ?` |
| Get latest version | `SELECT * FROM versions ORDER BY created_at DESC LIMIT 1` |
