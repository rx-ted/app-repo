# Post

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/posts` | Public | `page`, `pageSize`, `keyword`, `tag`, `category`, `author` (query) | 200 `{ list: PostListEntity[], total: number }` | - |
| GET | `/posts/:slug` | Public | `slug` (path) | 200 `PostEntity` | - |
| GET | `/posts/:slug/adjacent` | Public | `slug` (path) | 200 `{ prev: { slug, title } \| null, next: { slug, title } \| null }` | - |
| POST | `/posts` | Admin + `POST_ACCESS_ANY` | `CreatePostSchema` (body) | 201 `{ slug: string }` | 401/403 |
| PUT | `/posts/:slug` | Admin + `POST_ACCESS_ANY` | `slug` (path), `UpdatePostSchema` (body) | 200 `{ affectedRows: number }` | 401/403/404 |

## Service

`PostService` manages blog post CRUD operations. `list()` returns paginated published posts with optional keyword/tag/category/author filters. `getBySlug()` fetches a single post with full content by slug. `getAdjacent()` returns the previous and next published posts by ID ordering. `create()` generates a unique slug from the title, inserts the post core record and content, and returns the slug. `updateBySlug()` updates post fields and content, returning affected rows.

## Repository (MySQL via Drizzle ORM)

| Method | SQL |
|--------|-----|
| list | `SELECT count(*) FROM post_core WHERE status = 'published' [AND title LIKE ?] [AND tag/category/author subqueries]; SELECT ... FROM post_core LEFT JOIN users ON ... LEFT JOIN post_content ON ... LEFT JOIN post_stats ON ... WHERE status = 'published' [...] ORDER BY created_at DESC LIMIT ? OFFSET ?` |
| findBySlug | `SELECT ... FROM post_core LEFT JOIN users ON ... LEFT JOIN post_content ON ... LEFT JOIN post_stats ON ... WHERE slug = ? LIMIT 1` |
| findById | `SELECT ... FROM post_core LEFT JOIN users ON ... LEFT JOIN post_content ON ... LEFT JOIN post_stats ON ... WHERE id = ? LIMIT 1` |
| findAdjacent | `SELECT slug, title FROM post_core WHERE status = 'published' AND id < ? ORDER BY id DESC LIMIT 1` (prev); `SELECT slug, title FROM post_core WHERE status = 'published' AND id > ? ORDER BY id ASC LIMIT 1` (next) |
| create | `INSERT INTO post_core (user_id, slug, title, cover_image, is_pinned, featured_weight, status, visibility, allow_comment, created_at, updated_at, published_at, created_by, updated_by) VALUES (...); INSERT INTO post_content (post_id, content_md) VALUES (?, ?)` |
| update | `UPDATE post_core SET title = ?, updated_at = ?, ... WHERE slug = ?; UPDATE post_content SET content_md = ? WHERE post_id = ?` (or `INSERT INTO post_content ...` if not exists) |
