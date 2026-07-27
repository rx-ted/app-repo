# Notification

## Controller

Protected by `AuthGuard` (authenticated user required).

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/notification/me` | Authenticated | — | 200 `NotificationResponseDto[]` | 401 |
| GET | `/notification/me/summary` | Authenticated | — | 200 `NotificationSummaryResponseDto` | 401 |
| POST | `/notification/read-all` | Authenticated | — | 200 `{ affectedRows: number }` | 401 |
| POST | `/notification/:id/read` | Authenticated | `params: { id: string }` | 200 `{ affectedRows: number }` | 401 |

## Service

| Method | Description | Caching |
|--------|-------------|---------|
| `listMine()` | Fetches all notifications ordered by `created_at` descending. Maps DB rows to response DTOs. | Cache key `notifications:list`, TTL 60s |
| `getSummary()` | Counts unread notifications (`is_read = false`) and fetches the 5 most recent notifications. Returns `{ unreadCount, recent[] }`. | Cache key `notifications:summary`, TTL 60s |
| `markAllRead()` | Sets `is_read = true` and `read_at = NOW()` for all unread notifications. Invalidates list and summary caches. | Cache invalidated |
| `markRead(id)` | Sets `is_read = true` and `read_at = NOW()` for a specific notification by id. Invalidates list and summary caches. | Cache invalidated |

### SQL Queries

| Query | SQL |
|-------|-----|
| List all notifications | `SELECT * FROM notifications ORDER BY created_at DESC` |
| Count unread notifications | `SELECT count(*) FROM notifications WHERE is_read = false` |
| Fetch recent 5 notifications | `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5` |
| Mark all as read | `UPDATE notifications SET is_read = true, read_at = NOW() WHERE is_read = false` |
| Mark one as read | `UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = ?` |

### DB Schema — `notifications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigint` | PK, auto-increment |
| `user_id` | `char(36)` | FK → users.id, not null, on delete cascade |
| `channel` | `enum('internal','email')` | Default `internal` |
| `type` | `varchar(50)` | |
| `locale` | `enum('zh-CN','en')` | Default `zh-CN` |
| `title` | `varchar(255)` | |
| `content` | `varchar(255)` | |
| `payload_json` | `json` | |
| `is_read` | `boolean` | Default `false` |
| `read_at` | `datetime` | |
| `delivered_at` | `datetime` | |
| `created_at` | `datetime` | not null |

Indexes: `idx_user` (user_id, is_read), `idx_channel_created` (channel, created_at).

## Repository

No dedicated repository layer. All queries are executed inline in the service via Drizzle ORM.
