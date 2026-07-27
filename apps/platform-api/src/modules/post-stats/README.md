# Post Stats

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/post-stats/:postId` | - | `postId` (path) | 200 `PostStatsEntity` | - |
| POST | `/post-stats/:postId/views` | - | `postId` (path) | 200 `{ affectedRows: number }` | - |
| POST | `/post-stats/refresh` | - | - | 200 `{ affectedRows: number }` | - |

## Service

`PostStatsService` manages post view/like/comment statistics. `getByPostId()` retrieves stats for a post, returning zeroed defaults if no row exists. `recordView()` increments the `view_count` by 1 (creating the stats row if absent). `refreshAll()` iterates all posts and ensures each has a `post_stats` row via upsert.

## Repository

No dedicated repository — uses `DbService` directly in the service layer.

| Method | SQL |
|--------|-----|
| getByPostId | `SELECT * FROM post_stats WHERE post_id = ? LIMIT 1` |
| recordView | `SELECT * FROM post_stats WHERE post_id = ? LIMIT 1`; if exists: `UPDATE post_stats SET view_count = view_count + 1 WHERE post_id = ?`; if not: `INSERT INTO post_stats (post_id, view_count, like_count, comment_count) VALUES (?, 1, 0, 0)` |
| refreshAll | `SELECT id FROM post_core`; for each: `INSERT INTO post_stats (post_id, view_count, like_count, comment_count) VALUES (?, 0, 0, 0) ON DUPLICATE KEY UPDATE view_count = view_count, like_count = like_count, comment_count = comment_count` |
