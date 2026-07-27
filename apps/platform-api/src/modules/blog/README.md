# Blog

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /blog/dashboard | AuthGuard | - | 200 BlogDashboardResponseSchema | 401 |
| GET | /blog/summary | Public | - | 200 BlogHomeResponseSchema | - |
| GET | /blog/me | AuthGuard | - | 200 BlogDashboardResponseSchema | 401 |
| GET | /blog/by-username/:username | Public | `username` path param | 200 BlogAuthorResponseSchema | 404 |
| GET | /blog/authors/:username | Public | `username` path param | 200 BlogAuthorResponseSchema | 404 |

## Service

Provides blog homepage aggregation, user dashboard, author profile, and search functionality.

### Methods

#### getSummary / getHome
Returns blog homepage data: hero stats, featured posts, latest posts, pinned posts, trending tags. Cached under `blog:home` with 60s TTL.

#### search
Returns paginated search results with keyword matching against title. Cached per query under `blog:search:{keyword}:{page}:{pageSize}` with 60s TTL.

#### getMine / getDashboard
Returns dashboard for the authenticated user: profile, roles, permissions, posts list, aggregated stats, notifications, and recent activity feed. Cached under `blog:dashboard:{userId}` with 60s TTL.

#### getByUsername / getAuthor
Returns author profile and paginated posts. Cached under `blog:author:{username}:{page}` with 120s TTL.

| Method | SQL |
|--------|-----|
| getHome | `SELECT count(*) FROM post_core WHERE status = 'published'` |
| getHome | `SELECT count(*) FROM post_tags` |
| getHome | `SELECT count(*) FROM post_categories` |
| getHome | `SELECT * FROM post_core LEFT JOIN users ON post_core.user_id = users.id LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.status = 'published' AND post_core.featured_weight > 0 ORDER BY post_core.featured_weight DESC LIMIT 10` |
| getHome | `SELECT * FROM post_core LEFT JOIN users ON post_core.user_id = users.id LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.status = 'published' ORDER BY post_core.created_at DESC LIMIT 10` |
| getHome | `SELECT * FROM post_core LEFT JOIN users ON post_core.user_id = users.id LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.status = 'published' AND post_core.is_pinned = true ORDER BY post_core.created_at DESC LIMIT 5` |
| getHome | `SELECT COALESCE(SUM(post_stats.view_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.status = 'published'` |
| getHome | `SELECT COALESCE(SUM(post_stats.like_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.status = 'published'` |
| getHome | `SELECT COALESCE(SUM(post_stats.comment_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.status = 'published'` |
| getHome | `SELECT name, usage_count FROM post_tags ORDER BY usage_count DESC LIMIT 10` |
| search | `SELECT * FROM post_core LEFT JOIN users ON post_core.user_id = users.id LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.status = 'published' AND post_core.title LIKE ? ORDER BY post_core.created_at DESC LIMIT ? OFFSET ?` |
| search | `SELECT count(*) FROM post_core WHERE post_core.status = 'published' AND post_core.title LIKE ?` |
| getDashboard | `SELECT * FROM users WHERE users.id = ? LIMIT 1` |
| getDashboard | `SELECT * FROM user_profiles WHERE user_profiles.user_id = ? LIMIT 1` |
| getDashboard | `SELECT roles.name FROM user_role_mappings INNER JOIN roles ON user_role_mappings.role_id = roles.id WHERE user_role_mappings.user_id = ?` |
| getDashboard | `SELECT permissions.resource, permissions.action FROM user_permission_mappings INNER JOIN permissions ON user_permission_mappings.permission_id = permissions.id WHERE user_permission_mappings.user_id = ?` |
| getDashboard | `SELECT * FROM post_core LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.user_id = ? ORDER BY post_core.created_at DESC` |
| getDashboard | `SELECT COALESCE(SUM(post_stats.view_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.user_id = ?` |
| getDashboard | `SELECT COALESCE(SUM(post_stats.like_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.user_id = ?` |
| getDashboard | `SELECT COALESCE(SUM(post_stats.comment_count), 0) FROM post_stats INNER JOIN post_core ON post_core.id = post_stats.post_id WHERE post_core.user_id = ?` |
| getDashboard | `SELECT count(*) FROM notifications WHERE notifications.user_id = ? AND notifications.is_read = false` |
| getDashboard | `SELECT * FROM notifications WHERE notifications.user_id = ? ORDER BY notifications.created_at DESC LIMIT 5` |
| getDashboard | `SELECT id, title, slug, updated_at FROM post_core WHERE post_core.user_id = ? ORDER BY post_core.updated_at DESC LIMIT 10` |
| getAuthor | `SELECT * FROM users WHERE users.username = ? LIMIT 1` |
| getAuthor | `SELECT * FROM user_profiles WHERE user_profiles.user_id = ? LIMIT 1` |
| getAuthor | `SELECT * FROM post_core LEFT JOIN post_stats ON post_core.id = post_stats.post_id WHERE post_core.user_id = ? ORDER BY post_core.created_at DESC LIMIT ? OFFSET ?` |
| getAuthor | `SELECT count(*) FROM post_core WHERE post_core.user_id = ?` |
| getAuthor | `SELECT post_tags.name FROM post_tags INNER JOIN post_tag_mappings ON post_tags.id = post_tag_mappings.tag_id INNER JOIN post_core ON post_core.id = post_tag_mappings.post_id WHERE post_core.user_id = ? GROUP BY post_tags.name` |
| enrichPosts | `SELECT post_id, name FROM post_tag_mappings INNER JOIN post_tags ON post_tag_mappings.tag_id = post_tags.id WHERE post_tag_mappings.post_id IN (?)` |
| enrichPosts | `SELECT post_id, name FROM post_category_mappings INNER JOIN post_categories ON post_category_mappings.category_id = post_categories.id WHERE post_category_mappings.post_id IN (?)` |

## Entities

- `post_core` — core post table (referenced via schema import)
- `post_stats` — post statistics (view/like/comment counts)
- `users` — user accounts
- `user_profiles` — extended user profile info
- `post_tags` / `post_tag_mappings` — tag taxonomy (M:N)
- `post_categories` / `post_category_mappings` — category taxonomy (M:N)
- `user_role_mappings` / `roles` — role assignments
- `user_permission_mappings` / `permissions` — permission assignments
- `notifications` — user notifications
