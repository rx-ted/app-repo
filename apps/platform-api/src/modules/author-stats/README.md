# Author Stats

## Controller

No auth guards applied.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /author-stats/:identifier | Public | Param: `identifier` (string) | 200 `AuthorStatsEntity` | - |

## Service

Computes and caches author statistics (post count, view count, like count, comment count, tags, categories). Results cached for 120 seconds under key `author-stats:{userId}`.

| Method | Description |
|--------|-------------|
| `getStats(identifier)` | Delegates to `getByUserId`. |
| `getByUserId(userId)` | Returns cached author stats. If no stats row exists, returns defaults (all zeros). Computes real-time post count from `post_core`. Fetches all tag and category usage across the author's posts. |
| `refreshAll()` | Aggregates post counts per user from `post_core`, upserts into `author_stats` (insert or update on duplicate key). Invalidates cache for each user. |

## SQL (via Drizzle ORM)

| Operation | SQL |
|-----------|-----|
| Get stats row | `SELECT * FROM author_stats WHERE user_id = ? LIMIT 1` |
| Count posts | `SELECT COUNT(*) as total FROM post_core WHERE user_id = ?` |
| Get author post IDs | `SELECT id FROM post_core WHERE user_id = ?` |
| Get author tags | `SELECT t.id, t.name, t.slug, t.usage_count FROM post_tags t INNER JOIN post_tag_mappings ptm ON t.id = ptm.tag_id WHERE ptm.post_id IN (?) GROUP BY t.id` |
| Get author categories | `SELECT c.id, c.name, c.slug, c.post_count FROM post_categories c INNER JOIN post_category_mappings pcm ON c.id = pcm.category_id WHERE pcm.post_id IN (?) GROUP BY c.id` |
| Aggregate post counts | `SELECT user_id, COUNT(*) as count FROM post_core GROUP BY user_id` |
| Upsert stats | `INSERT INTO author_stats (user_id, view_count, like_count, comment_count) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE view_count = view_count, like_count = like_count, comment_count = comment_count` |
