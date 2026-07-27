# Comment

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /comments/page | Public | `CommentPageQuerySchema` query | 200 `CommentPageResult` | 400 |
| GET | /comments/replyPage | Public | `ReplyPageQuerySchema` query | 200 `CommentPageResult` | 400 |
| GET | /comments | Public | - | 200 Comment list | - |
| POST | /comments | AuthGuard | `CreateCommentSchema` body | 201 `{ affectedRows, id }` | 401 |
| PUT | /comments/:id | AuthGuard | `UpdateCommentSchema` body | 200 `{ affectedRows }` | 401/403 |
| DELETE | /comments/:id | AuthGuard | - | 200 `{ affectedRows }` | 401 |
| POST | /comments/:id/like | AuthGuard | - | 200 `{ isLiked, likes }` | 401 |
| GET | /comments/liked | AuthGuard | - | 200 `number[]` | 401 |
| POST | /comments/:id/report | AuthGuard | `CreateReportSchema` body | 201 | 401 |
| GET | /comments/reports | AuthGuard + RolesGuard(ADMIN) | `?status&page&pageSize` query | 200 report list | 401/403 |
| PATCH | /comments/reports/:id | AuthGuard + RolesGuard(ADMIN) | `ResolveReportSchema` body | 200 | 401/403 |

## Service

Handles comment CRUD, pagination, threading, likes, reports, reply notifications, and @mentions.

| Method | Description |
|--------|-------------|
| list | Returns all comments (optionally filtered by postId), flat |
| getThread | Returns comment thread for a post, ordered by createdAt asc |
| create | Creates a comment, fires async reply notification and @mention notifications |
| update | Edits own comment within 5-minute window |
| delete | Deletes a comment by ID |
| page | Paginated top-level comments with nested replies (up to 5) |
| replyPage | Paginated replies for a specific parent comment |
| toggleLike | Toggles like on a comment via CommentLikeService |
| getLikedCommentIds | Returns list of comment IDs liked by the user |
| createReport | Reports a comment (cannot report own, cannot report twice) |
| listReports | Lists reports with pagination (admin) |
| resolveReport | Resolves a report; optionally deletes the reported comment |

## Repository: CommentRepository

| Method | SQL | Cache |
|--------|-----|-------|
| listComments | `SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC` (or all if no postId) | `comments:list:{postId}`, TTL 60s |
| findCommentById | `SELECT * FROM comments WHERE id = ? LIMIT 1` | None |
| getCommentThread | `SELECT * FROM comments WHERE post_id = ? AND status = 'NORMAL' ORDER BY created_at ASC` | `comments:thread:{postId}`, TTL 60s |
| createComment | `INSERT INTO comments (post_id, user_id, parent_id, content, status, created_at) VALUES (?, ?, ?, ?, 'NORMAL', ?)` | Invalidates list/thread caches |
| updateComment | `UPDATE comments SET content = ?, updated_at = ? WHERE id = ?` | Invalidates list/thread caches |
| deleteComment | `DELETE FROM comments WHERE id = ?` | Invalidates list/thread caches |

## Repository: CommentLikeRepository

| Method | SQL |
|--------|-----|
| findByUserAndComment | `SELECT * FROM comment_like WHERE user_id = ? AND comment_id = ? LIMIT 1` |
| insert | `INSERT INTO comment_like (user_id, comment_id, created_at) VALUES (?, ?, ?)` |
| delete | `DELETE FROM comment_like WHERE user_id = ? AND comment_id = ?` |
| findByUserId | `SELECT comment_id FROM comment_like WHERE user_id = ?` |
| batchUpdateCommentLikes | `UPDATE comments SET likes = ? WHERE id = ?` (per commentId) |
| batchIncrementCommentLikes | `UPDATE comments SET likes = MAX(0, likes + ?) WHERE id = ?` (per commentId) |
| getLikedCommentIds | `SELECT comment_id FROM comment_like WHERE user_id = ?` |
| getCommentLikeCount | `SELECT likes FROM comments WHERE id = ? LIMIT 1` |

## Repository: CommentReportRepository

| Method | SQL |
|--------|-----|
| findByReporterAndComment | `SELECT * FROM comment_reports WHERE reporter_id = ? AND comment_id = ? LIMIT 1` |
| create | `INSERT INTO comment_reports (comment_id, reporter_id, reason, description, created_at) VALUES (?, ?, ?, ?, ?)` |
| listReports | `SELECT cr.id, cr.comment_id, c.content AS comment_content, cr.reporter_id, u.username AS reporter_username, cr.reason, cr.description, cr.status, cr.created_at FROM comment_reports cr LEFT JOIN comments c ON cr.comment_id = c.id LEFT JOIN users u ON cr.reporter_id = u.id WHERE cr.status = ? ORDER BY cr.created_at DESC LIMIT ? OFFSET ?` |
| resolve | `UPDATE comment_reports SET status = ?, resolver_id = ?, resolved_at = ? WHERE id = ?` |

## Services (internal)

### CommentLikeService
Manages like toggle with Redis-backed caching for liked sets and counts. Supports batch lookups.

### CommentNotificationService
Creates `notifications` records for:
- **comment.reply** — when someone replies to a user's comment
- **comment.mention** — when a user is @mentioned in a comment

### CommentReportService
Validates business rules around reporting (no self-report, no duplicate report). Delegates to CommentReportRepository.

### CommentLikeSyncConsumer
Background queue consumer (`comment-like.sync`) that syncs in-memory/Redis like state to MySQL in batches. Processes dirty user sets and comment count deltas.

## Entities

- `comments` — id (bigint PK), post_id (FK post_core), user_id (FK users), parent_id (nullable, FK comments), content (text), likes (int), status (NORMAL/DELETED), created_at, updated_at
- `comment_like` — id (bigint PK), user_id (FK users), comment_id (FK comments), created_at; unique on (user_id, comment_id)
- `comment_reports` — id (bigint PK), comment_id (FK comments), reporter_id (FK users), reason (varchar 50), description (text), status (PENDING/RESOLVED/DISMISSED), created_at, resolved_at, resolver_id
- `post_comment_threads` — id (bigint PK), post_id (FK post_core), provider (internal/github-discussion/giscus/disqus), repo_owner, repo_name, discussion_category, discussion_category_id, issue_number, issue_node_id, external_thread_id, status, sync_status, last_error, created_at, updated_at, closed_at
