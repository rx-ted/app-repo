# Auth

## Controllers

### AuthController (`/auth`)
Class-level guard: `AuthGuard`. Methods marked `@Public()` bypass auth.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| GET | /auth/me | Auth | - | 200 `{ userId, username, preferredLocale, roles, permissions, tokenVersion, lastLoginAt, nickname, avatarUrl }` | 401 |
| POST | /auth/login | Public (RateLimited) | Body: `{ username, password }` | 200 `{ accessToken, expiresIn, sessionId, user }` + Set-Cookie | 401/429 |
| POST | /auth/refresh | Public (RateLimited) | Cookie: `refresh_token` | 200 `{ accessToken, expiresIn }` + Set-Cookie | 401/429 |
| POST | /auth/logout | Public | Cookie: `refresh_token` | 200 `{ affectedRows }` + Clear-Cookie | 401 |
| POST | /auth/register | Public (RateLimited) | Body: `{ login_type: 'password', username, password, ... }` / `{ login_type: 'code', email, code, ... }` / `{ login_type: 'third', provider, code, ... }` | 201 `{ accessToken, expiresIn, sessionId }` + Set-Cookie | 429 |

### AuthEmailController (`/auth/email`)
All endpoints are `@Public()` with rate limiting.

| Method | Path | Auth | Input | Success Response | Error Response |
|--------|------|------|-------|-----------------|----------------|
| POST | /auth/email/send-code | Public (RateLimited) | Body: `{ email, purpose (login\|register\|reset), locale? }` | 200 `{ ttlSeconds, resendCooldownSeconds }` | 429 |
| POST | /auth/email/login | Public (RateLimited) | Body: `{ email, code }` | 200 `{ accessToken, expiresIn, sessionId, user }` + Set-Cookie | 401/429 |
| POST | /auth/email/reset-password | Public (RateLimited) | Body: `{ email, code, password }` | 200 `{ success: true }` | 401/429 |

## Service

Handles authentication flows: password-based login/register, email verification code login/register/reset, JWT access token generation, refresh token rotation with reuse detection.

| Method | Description |
|--------|-------------|
| `getSession(username)` | Fetches user session data (roles, permissions) from cache/DB. Returns null if not found. |
| `login(username, password, ip?, userAgent?)` | Validates password (scrypt), creates session record, generates JWT + refresh token. Sets refresh token in cache. |
| `refresh(rawRefreshToken, ip?, userAgent?)` | Validates refresh token hash, rotates token (detects reuse → revokes all sessions). Returns new JWT + refresh token. |
| `logout(username, sessionId?)` | Deletes session from cache, invalidates user session cache. |
| `sendEmailCode(email, purpose, locale)` | Generates 6-digit code, stores in cache with TTL, sends via MailService. Rate-limited by cooldown key. |
| `emailLogin(email, code, ip?, userAgent?)` | Verifies email code, looks up user by email, creates session, returns JWT. |
| `emailResetPassword(email, code, password)` | Verifies code, hashes new password (scrypt), updates user record. |
| `register(input, ip?, userAgent?)` | Unified registration. Dispatches by `login_type`: password (hashes pw, creates user), code (verifies email code, creates user), third (exchanges OAuth code, creates user + OAuth link). |

## Repositories

### AuthRepository (MySQL via Drizzle ORM)

Tables: `users`, `user_Auth`, `user_profiles`, `user_auth`, `user_oauth`, `user_role_mappings`, `roles`, `user_permission_mappings`, `role_permission_mappings`, `permissions`

| Method | SQL |
|--------|-----|
| `getSessionUserByUsername(username)` (cached) | `SELECT * FROM users WHERE username = ? LIMIT 1`<br>`SELECT r.name FROM user_role_mappings urm INNER JOIN roles r ON urm.role_id = r.id WHERE urm.user_id = ?`<br>`SELECT p.resource, p.action, p.scope FROM user_permission_mappings upm INNER JOIN permissions p ON upm.permission_id = p.id WHERE upm.user_id = ?`<br>`SELECT p.resource, p.action, p.scope FROM user_role_mappings urm INNER JOIN role_permission_mappings rpm ON urm.role_id = rpm.role_id INNER JOIN permissions p ON rpm.permission_id = p.id WHERE urm.user_id = ?` |
| `createUser(username, loginType, params)` | Unified user creation. Inserts into `users`, `user_profiles`, `user_auth` (type varies by loginType), assigns USER role + read permission. `login_type` values: `'password'` \| `'code'` \| `'third'`. |
| `getUserPermissions(userId)` (cached) | `SELECT p.resource, p.action, p.scope FROM user_permission_mappings upm INNER JOIN permissions p ON upm.permission_id = p.id WHERE upm.user_id = ?`<br>`SELECT p.resource, p.action, p.scope FROM user_role_mappings urm INNER JOIN role_permission_mappings rpm ON urm.role_id = rpm.role_id INNER JOIN permissions p ON rpm.permission_id = p.id WHERE urm.user_id = ?` |
| `getUserByEmail(email)` | `SELECT * FROM users WHERE email = ? LIMIT 1`<br>+ same role/perm joins |
| `getUserByOAuthProvider(provider, providerUserId)` | Checks `user_oauth` for existing link, returns `AuthEntity` via `getSessionUserById`. |
| `getSessionUserById(userId)` | Same role/perm joins as `getSessionUserByUsername` but by user ID. |
| `linkOAuthProvider(userId, provider, data)` | `INSERT INTO user_oauth (user_id, provider, provider_user_id, access_token, ...)` |
| `updatePasswordByEmail(email, passwordHash)` | `UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?` |
| `invalidateSession(username)` | Cache-only: deletes `CACHE_KEYS.authSession(username)` |
| `assignUserPermission(userId, permissionCode)` | `SELECT id FROM permissions WHERE resource = ? LIMIT 1`<br>`INSERT INTO user_permission_mappings (user_id, permission_id) VALUES (?, ?)` |

### SessionRepository (Redis/Cache)

Sessions are stored in a cache (Redis) — no MySQL queries.

| Method | Description |
|--------|-------------|
| `create(session)` | Stores `session:{id} → SessionRecord` and `session:hash-index:{id} → hash` with TTL. |
| `findById(id)` | Returns `SessionRecord` from cache key `session:{id}`. |
| `delete(key)` | Deletes arbitrary cache key. |
| `deleteSession(id)` | Deletes `session:{id}`, `session:hash:{refreshTokenHash}`, `session:hash-index:{id}`. |
| `getCurrentHashIndex(sessionId)` | Returns current hash from `session:hash-index:{sessionId}`. |
| `setCurrentHashIndex(sessionId, hash)` | Sets `session:hash-index:{sessionId} → hash` with TTL. |
| `getRefreshTokenHash(hashKey)` | Returns session ID from given hash key. |
| `setRefreshTokenHash(hashKey, sessionId)` | Stores `hashKey → sessionId` with TTL. |
| `deleteHashKey(hashKey)` | Deletes given hash key. |
| `addToUserSessions(userId, sessionId)` | Appends session ID to `user:sessions:{userId}` array. |
| `removeFromUserSessions(userId, sessionId)` | Removes session ID from `user:sessions:{userId}` array. |
| `getUserSessionIds(userId)` | Returns array from `user:sessions:{userId}`. |
| `revokeUserSessions(userId)` | Deletes all session and hash-index keys for user, then deletes `user:sessions:{userId}`. |
| `listUserSessions(userId, currentSessionId?)` | Returns all sessions with metadata, sorted by `lastActiveAt` DESC. |
| `revokeSessionById(id, userId)` | Validates ownership, deletes session/hash keys, removes from user session list. |
