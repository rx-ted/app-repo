# Search

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/search` | - | `q`, `type` (comma-separated: posts/tags/categories/author), `limit`, `offset` (query) | 200 `SearchResponseDto` | - |

## Service

`SearchService` performs full-text search across posts, tags, categories, and authors. Results are cached for 60 seconds. `search()` accepts a query string and filters by type(s). Post search matches against `title` and `content_md` via `LIKE`, returns excerpts with context around the match. Tag/category search matches by name. Author search matches by username and includes the author's post count.

## Repository

No dedicated repository — uses `DbService` directly in the service layer.

| Method | SQL |
|--------|-----|
| search (posts) | `SELECT count(*) FROM post_core LEFT JOIN post_content ON ... WHERE status = 'published' AND (title LIKE ? OR content_md LIKE ?)`; `SELECT ... FROM post_core LEFT JOIN users ON ... LEFT JOIN post_content ON ... LEFT JOIN post_stats ON ... WHERE status = 'published' AND (title LIKE ? OR content_md LIKE ?) ORDER BY created_at DESC LIMIT ? OFFSET ?`; then `SELECT post_id, name FROM post_tag_mappings INNER JOIN post_tags ON ... WHERE post_id IN (...)` and `SELECT post_id, name FROM post_category_mappings INNER JOIN post_categories ON ... WHERE post_id IN (...)` |
| search (tags) | `SELECT count(*) FROM post_tags WHERE name LIKE ?`; `SELECT * FROM post_tags WHERE name LIKE ? ORDER BY usage_count DESC LIMIT ? OFFSET ?` |
| search (categories) | `SELECT count(*) FROM post_categories WHERE name LIKE ?`; `SELECT * FROM post_categories WHERE name LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?` |
| search (author) | `SELECT count(*) FROM users WHERE username LIKE ?`; `SELECT ... FROM users LEFT JOIN user_profiles ON ... WHERE username LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?`; for each author: `SELECT count(*) FROM post_core WHERE user_id = ?` |
