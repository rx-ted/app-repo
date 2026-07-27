# @rx-ted/web-blog

## 1.0.2

### Patch Changes

- 6f2fb99: Rename friend-link module to discover with category/status support, add post category/tag mapping, rewrite about page with i18n

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.

## 1.0.0

### Major Changes

- Vue 3 SPA blog frontend — built on Naive UI + Pinia + Vue Router
- Post/comment/author pages with Markdown rendering
- Auth (login/register) with OAuth callback support
- Comment system with replies, likes, reports, and admin moderation
- Archive timeline, tag/category/friend-link pages
- Editor with Markdown toolbar (md-editor-v3)
- Dashboard for author management (posts, drafts, settings, categories, tags)
- Internationalization (zh/en) with dynamic messages
- Theme system with dark mode, view transitions, and color customization
- HTTP client with token injection, 401 refresh, error normalization, and request logging
- SEO head management via @vueuse/head
- E2E tests (Playwright) with smoke/incremental/failed modes

### Patch Changes

- CORS + auth refresh fix — hono/cors middleware, proper API base URL usage
- HTTP middleware refactor — decoupled from shared packages, inline tokenStorage/refreshHandler
- Registration form — user_profiles/user_auth creation with defaults (nickname, avatar, bio)
- TopBar redesign — dropdowns, Iconify icons, view transition theme toggle
- Dark mode contrast fixes — dropdown hover, sidebar hover, button hover
- Editor layout fix — 50vw dialog, 1400px/80% width, 75vh height
- Double form submission prevention on register
- Dev API proxy target defaults to localhost:3000
