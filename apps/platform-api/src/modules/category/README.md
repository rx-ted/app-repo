# Category

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /categories | Public | - | 200 CategoryEntitySchema[] | - |
| POST | /categories | AuthGuard + RolesGuard(ADMIN) + PermissionsGuard(CATEGORY_ACCESS_ANY) | `CreateCategorySchema` body | 201 `{ affectedRows, id }` | 401/403 |

## Service

Manages CRUD operations for post categories with mapper-based response transformation.

| Method | Description |
|--------|-------------|
| list | Returns all categories ordered by updatedAt desc |
| findById | Returns a single category by ID, or null |
| findBySlug | Returns a single category by slug, or null |
| create | Creates a new category with auto-generated slug fallback |

## Repository

| Method | SQL | Cache |
|--------|-----|-------|
| listCategories | `SELECT pc.id, pc.name, pc.slug, pc.description, count(pcm.category_id) AS post_count, pc.created_at, pc.updated_at FROM post_categories pc LEFT JOIN post_category_mappings pcm ON pc.id = pcm.category_id GROUP BY pc.id ORDER BY pc.updated_at DESC` | `categories:list`, TTL = user session |
| findCategoryById | `SELECT * FROM post_categories WHERE id = ? LIMIT 1` | `categories:{id}`, TTL = user session |
| findCategoryBySlug | `SELECT * FROM post_categories WHERE slug = ? LIMIT 1` | `categories:slug:{slug}`, TTL = user session |
| createCategory | `INSERT INTO post_categories (name, slug, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)` | Invalidates `categories:list` |
| updateCategory | `UPDATE post_categories SET name = ?, slug = ?, description = ?, updated_at = ? WHERE id = ?` | Invalidates `categories:list`, `categories:{id}` |
| deleteCategory | `DELETE FROM post_categories WHERE id = ?` | Invalidates `categories:list`, `categories:{id}` |

## Entities

- `post_categories` — id (bigint PK), name (varchar 50), slug (varchar 100, unique), description (varchar 500), post_count (int), created_at, updated_at

## DTOs

- `CreateCategorySchema` — name (required), slug (optional), description (optional)
- `UpdateCategorySchema` — name (optional), slug (optional), description (optional)
- `CategoryEntitySchema` — id, name, slug, description, postCount, createdAt, updatedAt
