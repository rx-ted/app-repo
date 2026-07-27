# Specification: Three Enhancements (Discover, Writing, About)

Date: 2026-07-21

## Overview

Three independent changes: (1) rename "Friend Links" to "Discover" with table rename, (2) fix writing page draft/LocalStorage behavior, (3) rewrite About page.

---

## 1. Discover Page (renamed from Friend Links)

### Concept
迁移从「友情链接」(双向社交) → 「发现」(单向探索/逛一逛)。页面呈现精选工具/站点，访客可提交自己的站点等待审核。

### Database changes
- Table `friendLinks` → `discoveries` via migration: `ALTER TABLE friendLinks RENAME TO discoveries`
- All columns remain identical (id, name, url, logo, description, category, status, email, sortOrder, failCount, lastCheckedAt, createdAt, updatedAt)
- Schema key: `friendLinks` → `discoveries`, entity class `FriendLinksSchema` → `DiscoveriesSchema`

### Backend changes
- Module directory: `friend-link/` → `discover/`
- Controller path: `@Controller('friend-links')` → `@Controller('discoveries')`
- Service: rename all references, cache key change
- DTOs / Mapper: rename classes and file names
- Seed data: rename array, insert table `discoveries`
- Module registration: `FriendLinkModule` → `DiscoverModule`
- Permission constants: `FRIEND_LINK_*` → `DISCOVER_*`
- API routes: `/friend-links` → `/discoveries`

### Frontend changes
- Page: `FriendsPage.vue` → `DiscoverPage.vue` (rewrite notice board copy)
- Route: `/friends` → `/discover`, name `'friends'` → `'discover'`
- TopBar: `'Friends'` → `'Discover'`
- i18n: `friends.*` → `discover.*` (keys restructured, notice board copy updated to exploration tone)
- Comment store: tag `'friends'` → `'discover'`
- API constants: `FRIEND_LINKS` → `DISCOVERIES` etc.

### Notice board new copy (exploration tone)
- 发现推荐：这里收集了有趣的项目和工具，每周更新
- 探索分类：按分类浏览，发现你感兴趣的内容
- 提交发现：填写信息提交你的站点，审核通过后将展示在这里
- 可用性检查：系统定期检查站点可用性，失效站点将被标记

### No changes to
- Submission flow (still email-code verification)
- Health check logic
- Category/status enums
- Card display (same design)

---

## 2. Writing Page — Draft Recovery & Clear

### Problem
1. On successful submission, content should be cleared (including localStorage) but currently `BlogEditor` watches `loading` prop — fragile.
2. When user hits "save" without login → confirm dialog → `/login?redirect=/editor` → login → back to `/editor` → `BlogEditor` mounts → shows `confirm('恢复草稿？')` — user has to confirm again unnecessarily.

### Solution

#### Successful submission → clear content
- In `EditorPage.save()`, after successful API call: explicitly call `localStorage.removeItem('editor:draft')` and reset `draft.content = ''`
- Keep existing `BlogEditor` watch-based clear as secondary fallback

#### Returning from login → silent restore
- `EditorPage.save()` redirects to login with `redirect=/editor?restoreDraft=1`
- `BlogEditor.vue` on mount: if `route.query.restoreDraft === '1'`, silently restore draft from localStorage (no `window.confirm`)
- Normal mount (no `restoreDraft` param): keep existing `confirm` behavior
- Login page already handles `redirect` query correctly — no changes needed there

### Files affected
- `apps/web-blog/src/pages/EditorPage.vue` — add redirect param, add clear-on-success
- `apps/web-blog/src/components/editors/BlogEditor.vue` — detect `restoreDraft` query param, skip confirm

---

## 3. About Page — Rewrite

Rewrite the existing static page with six sections.

### Sections

| Section | Content |
|---------|---------|
| **关于我** | 个人简介（开发者、全栈、追求简洁高效的设计），头像占位，GitHub 链接，技术兴趣 |
| **关于本站** | 站点定位：个人博客 + 技术实验场，基于现代全栈技术栈构建，强调代码质量和架构设计 |
| **联系我** | Email: `gjy.18sui@gmail.com`，GitHub: `https://github.com/rx-ted` |
| **使用哪些依赖** | 分类展示：前端 (Vue 3, Pinia, Naive UI, Vite)、运行时 (Hono, Drizzle ORM, D1)、工具链 (TypeScript, Turborepo, pnpm, Biome) |
| **技术理念** | 架构原则：深度模块化、类型安全、测试驱动、小而美的设计 |
| **未来方向** | 路线图：完善搜索系统、评论系统集成、性能优化、PWA 支持、更多平台适配 |

### Design approach
- Static page (no API needed), keeping existing route `/about`, layout `'simple'`
- Responsive card-style layout with smooth visual hierarchy
- Remove existing hero/features/architecture sections entirely
- Use existing i18n keys where appropriate

### Files affected
- `apps/web-blog/src/pages/AboutPage.vue` — full rewrite
- Updated e2e tests if needed

---

## Out of scope
- No new API endpoints
- No database schema changes for Discover beyond table rename
- No functional changes to submission/health-check logic
