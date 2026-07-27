# User

## Controller

Two controller classes under different base paths:

### UserController — `/user` (requires `AuthGuard`)

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /user/me | Authenticated | - | 200 `UserProfileEntitySchema` | 401 |
| GET | /user/me/profile | Authenticated | - | 200 `UserProfileEntitySchema` | 401 |
| PUT | /user/me/profile | Authenticated | `UpdateProfileSchema` body | 200 `{ affectedRows: number }` | 401 |
| GET | /user/public/:username | Public | `:username` | 200 `UserPublicProfileEntitySchema` | 404 |
| GET | /user/:id/brief | Public | `:id` (string) | 200 (user brief for comment cards) | 404 |

### AdminUserController — `/admin/user` (requires `AuthGuard`, `RolesGuard`, `PermissionsGuard` with `ADMIN` role and `USERS_ACCESS_ANY`)

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /admin/user | Admin | `?page` `?pageSize` | 200 `{ data: UserEntitySchema[], total: number }` | 401/403 |

## Service

- **getSelfProfile(userId)** — Returns basic profile (id, username, preferred_locale, status, timestamps). Always returns `NORMAL` status and `null` for `last_login_at`
- **getProfile(userId)** — Returns full profile with nickname, avatar, bio, website, location, github_connected flag
- **updateProfile(userId, input)** — Partial update of profile fields; returns `{ id }`
- **getPublicProfile(username)** — Returns public-facing profile (no email/password) by username
- **getBrief(userId, currentUserId)** — Returns brief card data for comment author display (displayName, avatar, level, follower/following/like counts hardcoded to 0, `isFollowed` hardcoded to false)
- **list(page, pageSize)** — Admin paginated user list with email, status, login_type, timestamps

## Repository

Table: `users`, `user_profiles`

| Method | SQL |
|--------|-----|
| findById | `SELECT * FROM users WHERE id = ? LIMIT 1` (cached at `user:id:{id}`) |
| findByUsername | `SELECT * FROM users WHERE username = ? LIMIT 1` (cached at `user:username:{username}`) |
| getProfile | `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.id = ? LIMIT 1` (cached at `user:profile:{userId}`) |
| getPublicProfile | `SELECT * FROM users LEFT JOIN user_profiles ON users.id = user_profiles.user_id WHERE users.username = ? LIMIT 1` (cached at `user:public:{username}`) |
| updateProfile | `UPDATE user_profiles SET nickname = ?, avatar_url = ?, bio = ?, website = ?, location = ?, updated_at = ? WHERE user_id = ?` — invalidates `user:profile:{userId}` and `user:public:{username}` caches |
| list | `SELECT COUNT(*) FROM users` + `SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?` (cached at `user:list:{page}:{pageSize}`) |

## Entities

### `users`
`id` (char 36 PK), `username` (varchar 20, unique), `login_type` (enum: password/google/github/wechat/email), `password_hash` (varchar 255), `email` (varchar 255, unique), `preferred_locale` (enum: zh-CN/en), `status` (enum: NORMAL/MUTED/BANNED/DELETED), `token_version` (int), `created_at`, `updated_at`, `last_login_at`

### `user_auth`
`id` (int PK autoincrement), `user_id` (char 36 FK → users), `type` (enum: password/email/phone), `identifier` (varchar 255), `credential` (varchar 255). Unique index on `(type, identifier)`.

### `user_profiles`
`user_id` (char 36 PK FK → users), `nickname` (varchar 100), `avatar_url` (varchar 1024), `gender` (enum: Male/Female/Unknown), `birthday` (date), `bio` (text), `website` (varchar 255), `location` (varchar 100), `updated_at`

### `user_oauth`
`id` (int PK), `user_id` (char 36 FK → users), `provider` (enum: gitHub/google/wechat), `provider_user_id`, `access_token`, `refresh_token`, `expires_at`, `created_at`. Unique indexes on `(provider, provider_user_id)` and `(user_id, provider)`.

## DTOs

- **UpdateProfileRequestDto** — `{ nickname?, avatar_url?, bio?, website?, location?, preferred_locale? }`
- **UserSelfResponseDto** — id, username, preferred_locale, status, created_at, updated_at, last_login_at
- **UserProfileResponseDto** — id, username, github_connected, preferred_locale, nickname, avatar_url, bio, website, location, updated_at
- **UserPublicProfileResponseDto** — extends profile response with created_at
- **UserAdminResponseDto** — id, username, email, preferred_locale, status, created_at, updated_at, last_login_at, login_type

## Schemas (Zod Validation)

- **UpdateProfileSchema** — `nickname` (1-50), `avatar_url` (url), `bio` (max 500), `website` (url), `location` (max 100), `preferred_locale` (zh-CN/en)
- **UserListQuerySchema** — `page` (coerced int, min 1, default 1), `pageSize` (coerced int, 1-100, default 100)
- **PublicProfileParamsSchema** — `username` (1-50 chars)
