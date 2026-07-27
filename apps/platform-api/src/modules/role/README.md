# Role

## Controller

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | `/role` | Admin + `ROLE_ACCESS_ANY` | `page`, `pageSize` (query) | 200 `{ data: RoleEntity[], total: number }` | 401/403 |
| GET | `/role/:id` | Admin + `ROLE_ACCESS_ANY` | `id` (path) | 200 `RoleEntity` | 401/403/404 |
| POST | `/role` | Admin + `ROLE_ACCESS_ANY` | `CreateRoleSchema` (body) | 201 `{ affectedRows: number, id?: string }` | 401/403 |
| PUT | `/role/:id` | Admin + `ROLE_ACCESS_ANY` | `id` (path), `UpdateRoleSchema` (body) | 200 `{ affectedRows: number }` | 401/403/404 |
| DELETE | `/role/:id` | Admin + `ROLE_ACCESS_ANY` | `id` (path) | 200 `{ affectedRows: number }` | 401/403/404 |

## Service

`RoleService` manages roles (RBAC). `list()` returns all roles ordered by creation date. `getById()` and `getByName()` look up a single role. `create()` inserts a new role and returns it. `update()` modifies role name/description. `delete()` removes a role by ID.

## Repository

No dedicated repository — uses `DbService` directly in the service layer.

| Method | SQL |
|--------|-----|
| list | `SELECT * FROM roles ORDER BY created_at DESC` |
| getById | `SELECT * FROM roles WHERE id = ? LIMIT 1` |
| getByName | `SELECT * FROM roles WHERE name = ? LIMIT 1` |
| create | `INSERT INTO roles (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)` |
| update | `UPDATE roles SET name = ?, description = ?, updated_at = ? WHERE id = ?` |
| delete | `DELETE FROM roles WHERE id = ?` |
