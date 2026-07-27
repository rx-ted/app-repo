# Tags

## Controller

Base path: `/tags`. Public endpoints require no auth; mutating endpoints require `AuthGuard`, `RolesGuard`, `PermissionsGuard` with `ADMIN` role and `TAGS_ACCESS_ANY` permission.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /tags | Public | `?page` `?pageSize` | 200 `{ data: TagEntity[], total: number }` | - |
| GET | /tags/:id | Public | `:id` (string) | 200 `TagEntity` | 404 |
| POST | /tags | Admin | `{ name: string, slug?: string }` | 201 `{ affectedRows: number, id?: string }` | 401/403 |
| PUT | /tags/:id | Admin | `:id`, `{ name?: string, slug?: string }` | 200 `{ affectedRows: number }` | 401/403/404 |
| DELETE | /tags/:id | Admin | `:id` (string) | 200 `{ affectedRows: number }` | 401/403/404 |

## Service

CRUD wrapper around `TagsRepository`. Maps database rows to `TagResponseDto` via `TagMapper.toResponse()`.

- **findAll()** — Returns all tags with computed `usageCount` from `post_tag_mappings` join, along with total count
- **findById(id)** — Returns single tag or null
- **create(data)** — Creates tag with `name` and optional `slug`; returns mapped response
- **update(id, data)** — Partial update of `name` and/or `slug`; returns updated tag or null
- **delete(id)** — Deletes tag by id; returns boolean

## Repository

Table: `post_tags`

| Method | SQL |
|--------|-----|
| list | `SELECT pt.id, pt.name, pt.slug, COUNT(ptm.tag_id) AS usage_count, pt.created_at, pt.updated_at FROM post_tags pt LEFT JOIN post_tag_mappings ptm ON pt.id = ptm.tag_id GROUP BY pt.id ORDER BY pt.updated_at DESC` (cached at `tags:list`) |
| findById | `SELECT * FROM post_tags WHERE id = ? LIMIT 1` (cached at `tags:{id}`) |
| create | `INSERT INTO post_tags (name, slug, created_at, updated_at) VALUES (?, ?, ?, ?)` then `SELECT * FROM post_tags WHERE id = ? LIMIT 1` — invalidates `tags:list` cache |
| update | `UPDATE post_tags SET name = ?, slug = ?, updated_at = ? WHERE id = ?` — invalidates `tags:list` and `tags:{id}` caches, returns re-fetched entity |
| delete | `DELETE FROM post_tags WHERE id = ?` — invalidates `tags:list` and `tags:{id}` caches, returns boolean |

## Entities

`post_tags` — `id` (bigint PK autoincrement), `name` (varchar 50, unique), `slug` (varchar 100, unique), `usage_count` (int, default 0), `created_at`, `updated_at`

## DTOs

- **CreateTagRequestDto** — `{ name: string; slug?: string }`
- **UpdateTagRequestDto** — `{ name?: string; slug?: string }`
- **TagResponseDto** — `{ id: string; name: string; slug: string; postCount?: number; createdAt?: string; updatedAt?: string }`

## Schemas (Zod Validation)

- **CreateTagSchema** — `name` (1-50 chars), `slug` (max 100, optional)
- **UpdateTagSchema** — `name` (1-50, optional), `slug` (max 100, optional)
- **TagsListQuerySchema** — `page` (coerced int, min 1, default 1), `pageSize` (coerced int, 1-100, default 10)
