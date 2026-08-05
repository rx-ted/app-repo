---
title: platform-api — API server
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - api
  - hono
  - backend
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: en
---

**English** | [中文](./api.zh.md)

# platform-api — API server

A blog platform API built on Hono + Honest DI framework, serving the web-blog frontend.

## Tech stack

- Runtime: Node.js (Bun dev / Node prod)
- Framework: Hono 4.12 + Honest (NestJS-style DI)
- Database: MySQL / SQLite / D1 (via honest-plugins/db)
- Cache: Redis / KV / Local (via honest-plugins/cache)
- Validation: Zod / automatic OpenAPI generation
- Email: Resend / Brevo / SMTP (via honest-plugins/mail)
- Object storage: AWS S3 (via honest-plugins/s3)
- API docs: OpenAPI + Scalar UI (via honest-plugins/api-doc)

## Dependencies

| Dependency | Package |
| --- | --- |
| packages-core | `@rx-ted/packages-core` |
| packages-honest | `@rx-ted/packages-honest` |
| HonestPlugins/db | `@rx-ted/packages-honest-plugins-db` |
| HonestPlugins/cache | `@rx-ted/packages-honest-plugins-cache` |
| HonestPlugins/mail | `@rx-ted/packages-honest-plugins-mail` |
| HonestPlugins/s3 | `@rx-ted/packages-honest-plugins-s3` |
| HonestPlugins/api-doc | `@rx-ted/packages-honest-plugins-api-doc` |

## Feature modules (23)

| Module | Route prefix | Description |
| --- | --- | --- |
| `auth` | `/auth` | Login/register/logout/refresh/email verification code/sessions/OAuth (4 controllers + 4 services) |
| `post` | `/posts` | Post CRUD + versioning + stats + CacheInvalidationService |
| `comment` | `/comments` | Comment CRUD + likes/reports/threads |
| `user` | `/user` | User profiles/management (UserController + AdminUserController) |
| `blog` | `/blog` | Blog summary/home data (DashboardService + AuthorService) |
| `category` | `/categories` | Category CRUD |
| `tags` | `/tags` | Tag CRUD |
| `search` | `/search` | Search endpoint |
| `notification` | `/notification` | Notifications (in-app + email) + real-time push |
| `role` | `/role` | Role management |
| `permission` | `/permission` | Permission management |
| `admin-permission` | `/admin/permissions` | Admin permission overrides |
| `permission-request` | `/permission-request` | Permission request approval flow |
| `audit` | `/audit` | Audit logs |
| `announcement` | `/announcement` | Announcement CRUD |
| `mail` | `/mail` | Email sending + templates |
| `post-stats` | `/post-stats` | Post view statistics |
| `author-stats` | `/author-stats` | Author statistics |
| `discover` | `/discoveries` | Discover page content |
| `upload` | `/upload` | File upload |
| `system` | `/system` | System initialization + health check + site info |
| `hello` | `/hello` | Test endpoint |
| `geoip` | — | IP geolocation service |

The full list of API endpoints is in [api-routes.md](./api-routes.md).

## Database (29 tables)

| Table | Purpose |
| --- | --- |
| systemMeta | System initialization metadata |
| users / userAuth / userProfiles / userOauth | User system |
| roles / userRoleMappings | Role management |
| permissions / userPermissionMappings / rolePermissionMappings | Permission management |
| permissionRequests / permissionRequestItems | Permission requests |
| postCore / postContent / postRevisions / postStats | Post system |
| postTagMappings / postCategoryMappings | Post associations |
| postTags / postCategories | Tags and categories |
| comments / commentLikes / commentReports / postCommentThreads | Comment system |
| notifications | Notifications |
| auditLogs | Audit logs |
| authorStats | Author statistics |
| announcements | Announcements |
| discoveries | Discover page content |

## Authentication system

### Service split

| Service | Responsibility |
| --- | --- |
| `PasswordAuthService` | Password login (scrypt hashing + timing-safe comparison) |
| `EmailAuthService` | Email verification code (6 digits, 5-minute TTL, 60s resend cooldown) |
| `OAuthService` | GitHub OAuth flow |
| `SessionManagerService` | Session management (create/list/revoke single/all) |
| `AuthContextService` | Implements the `IAuthContextService` interface, decoupling the auth context |

### Auth flow

- JWT access token (15m expiry)
- Refresh cookie: httpOnly, secure, SameSite=Lax, path=/api/v1/auth (7d expiry)
- Token reuse detection (stolen-token warning)

### Controller split

| Controller | Route prefix | Description |
| --- | --- | --- |
| `AuthController` | `/auth` | Core auth (login/register/logout/refresh) |
| `AuthEmailController` | `/auth/email` | Email verification code |
| `AuthOAuthController` | `/auth/oauth` | OAuth (GitHub) |
| `SessionsController` | `/auth/sessions` | Session management |

### Route guards

| Guard | Purpose |
| --- | --- |
| `AuthGuard` | JWT Bearer validation (decouples the auth context via the `IAuthContextService` interface) |
| `RolesGuard` | Role checks |
| `PermissionsGuard` | Permission code checks |
| `RateLimitGuard` | Rate limiting |
| `EnvironmentGuard` | Production environment blocking |
| `InitKeyGuard` | System initialization key validation |

## Plugins

| Plugin | Package | Purpose |
| --- | --- | --- |
| ApiDocPlugin | `honest-plugins/api-doc` | OpenAPI spec + Scalar UI |
| DbPlugin | `honest-plugins/db` | Drizzle ORM + MySQL/SQLite/D1 |
| CachePlugin | `honest-plugins/cache` | Redis/KV/Local caching |
| MailPlugin | `honest-plugins/mail` | Resend/Brevo/SMTP email |
| S3Plugin | `honest-plugins/s3` | AWS S3 object storage |

## Common utilities

- `common/utils/pagination.ts` — pagination utilities (offset/limit parsing, response formatting)
- `common/guards/auth-context.interface.ts` — the `IAuthContextService` interface (decouples the auth context dependency)
