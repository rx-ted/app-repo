# Three Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename "Friend Links" to "Discover", fix writing-page draft behavior, rewrite About page.

**Architecture:** Three independent subsystems: (1) rename backend module + frontend page + database table from friend-link to discover, (2) two small fixes to EditorPage/BlogEditor for draft lifecycle, (3) full rewrite of AboutPage as static page with 6 sections.

**Tech Stack:** Hono + Drizzle ORM + D1, Vue 3 + Pinia + Vue Router + Naive UI

---

## File Structure

### Discover (rename)
| Action | Old Path | New Path |
|--------|----------|----------|
| Rename | `apps/platform-api/src/modules/friend-link/` | `apps/platform-api/src/modules/discover/` |
| Rename (inside dir) | `friend-link.entity.ts` | `discover.entity.ts` |
| Rename (inside dir) | `friend-link.controller.ts` | `discover.controller.ts` |
| Rename (inside dir) | `friend-link.service.ts` | `discover.service.ts` |
| Rename (inside dir) | `friend-link.module.ts` | `discover.module.ts` |
| Rename (inside dir) | `dtos/friend-link.schema.ts` | `dtos/discover.schema.ts` |
| Rename (inside dir) | `dtos/friend-link.request.dto.ts` | `dtos/discover.request.dto.ts` |
| Rename (inside dir) | `dtos/friend-link.response.dto.ts` | `dtos/discover.response.dto.ts` |
| Rename (inside dir) | `mappers/friend-link.mapper.ts` | `mappers/discover.mapper.ts` |
| Modify | `apps/platform-api/src/schema/index.ts` | — |
| Modify | `apps/platform-api/src/constants/roles.ts` | — |
| Modify | `apps/platform-api/src/modules/system/system-init.service.ts` | — |
| Modify | `apps/platform-api/src/app.module.ts` | — |
| Create | `drizzle/d1/0002_discover_rename.sql` | — |
| Rename | `apps/web-blog/src/pages/FriendsPage.vue` | `DiscoverPage.vue` |
| Modify | `apps/web-blog/src/pages/DiscoverPage.vue` | rewrite notice/copy |
| Modify | `apps/web-blog/src/router/index.ts` | — |
| Modify | `apps/web-blog/src/layouts/TopBar.vue` | — |
| Modify | `apps/web-blog/src/constants/api.ts` | — |
| Rename | `apps/web-blog/src/i18n/messages/friends.ts` | `discover.ts` |
| Modify | `apps/web-blog/src/i18n/messages/discover.ts` | rewrite i18n keys |
| Modify | `apps/web-blog/src/i18n/messages.ts` | — |
| Modify | `apps/web-blog/src/stores/comment.ts` | — |

### Writing Page
| Action | Path |
|--------|------|
| Modify | `apps/web-blog/src/pages/EditorPage.vue` |
| Modify | `apps/web-blog/src/components/editors/BlogEditor.vue` |

### About Page
| Action | Path |
|--------|------|
| Rewrite | `apps/web-blog/src/pages/AboutPage.vue` |

---

### Task 1: Database migration — rename table

**Files:**
- Create: `drizzle/d1/0002_discover_rename.sql`

- [ ] **Step 1: Create migration SQL**

Create `drizzle/d1/0002_discover_rename.sql`:
```sql
ALTER TABLE `friendLinks` RENAME TO `discoveries`;
```

- [ ] **Step 2: Commit**

```bash
git add drizzle/d1/0002_discover_rename.sql
git commit -m "feat(platform-api): add migration to rename friendLinks to discoveries"
```

---

### Task 2: Backend module rename — entity, controller, service, DTOs, mapper

**Files:**
- Rename dir `apps/platform-api/src/modules/friend-link/` → `apps/platform-api/src/modules/discover/`
- Rename all files inside to `discover.*`

- [ ] **Step 1: Rename directory and all files**

```bash
cd apps/platform-api/src/modules
mv friend-link discover
cd discover
mv friend-link.entity.ts discover.entity.ts
mv friend-link.controller.ts discover.controller.ts
mv friend-link.service.ts discover.service.ts
mv friend-link.module.ts discover.module.ts
mv dtos/friend-link.schema.ts dtos/discover.schema.ts
mv dtos/friend-link.request.dto.ts dtos/discover.request.dto.ts
mv dtos/friend-link.response.dto.ts dtos/discover.response.dto.ts
mv mappers/friend-link.mapper.ts mappers/discover.mapper.ts
```

- [ ] **Step 2: Update discover.entity.ts — rename schema and references**

Read file, replace:
- `FriendLinksSchema` → `DiscoveriesSchema`
- `FRIEND_LINK_CATEGORIES` → `DISCOVER_CATEGORIES`
- `FRIEND_LINK_STATUSES` → `DISCOVER_STATUSES`
- `IFriendLink` → `IDiscovery`
- `friendLink` → `discovery` in comments/vars

The schema key `friendLinks` in the entity file stays for now — it will be changed in the schema/index.ts update (Task 3).

- [ ] **Step 3: Update discover.controller.ts**

Replace:
- `friend-link` → `discoveries` in path/descriptions
- `FriendLink*` → `Discover*` in class/import names
- `FRIEND_LINK_*` → `DISCOVER_*` in permission references

- [ ] **Step 4: Update discover.service.ts**

Replace:
- All `friendLink`/`friendLinks` → `discovery`/`discoveries`
- Cache key string from `friend-links` → `discoveries`
- `FRIEND_LINK_CATEGORIES` → `DISCOVER_CATEGORIES`
- `FRIEND_LINK_STATUSES` → `DISCOVER_STATUSES`

- [ ] **Step 5: Update discover.module.ts**

Replace:
- `FriendLink*` → `Discover*`
- `friend-link` → `discover`
- Import paths unchanged (it's the same file, just renamed dir)

- [ ] **Step 6: Update DTOS**

In `dtos/discover.schema.ts`:
- `CreateFriendLinkSchema` → `CreateDiscoverySchema`
- `UpdateFriendLinkSchema` → `UpdateDiscoverySchema`
- `FriendLinkResponseSchema` → `DiscoveryResponseSchema`
- `SendFriendLinkCodeSchema` → no rename needed (stays)

In `dtos/discover.request.dto.ts`:
- Update export name

In `dtos/discover.response.dto.ts`:
- Update export name

- [ ] **Step 7: Update mapper**

In `mappers/discover.mapper.ts`:
- `FriendLinkMapper` → `DiscoveryMapper`
- `FriendLinkResponseSchema` → `DiscoveryResponseSchema`
- `IFriendLink` → `IDiscovery`

- [ ] **Step 8: Commit**

```bash
git add apps/platform-api/src/modules/discover/
git commit -m "feat(platform-api): rename friend-link module to discover"
```

---

### Task 3: Backend — update schema/index.ts, roles.ts, system-init, app.module

**Files:**
- Modify: `apps/platform-api/src/schema/index.ts`
- Modify: `apps/platform-api/src/constants/roles.ts`
- Modify: `apps/platform-api/src/modules/system/system-init.service.ts`
- Modify: `apps/platform-api/src/app.module.ts`

- [ ] **Step 1: Update schema/index.ts**

Change:
```ts
import { FriendLinksSchema } from '@/modules/friend-link/entities/friend-link.entity';
```
to:
```ts
import { DiscoveriesSchema } from '@/modules/discover/entities/discover.entity';
```

Change:
```ts
friendLinks: FriendLinksSchema,
```
to:
```ts
discoveries: DiscoveriesSchema,
```

- [ ] **Step 2: Update roles.ts**

Replace:
- `FRIEND_LINK_ACCESS_ANY: 'friend-link:access:any'` → `DISCOVER_ACCESS_ANY: 'discover:access:any'`
- `FRIEND_LINK_MANAGE: 'friend-link:manage'` → `DISCOVER_MANAGE: 'discover:manage'`

- [ ] **Step 3: Update system-init.service.ts**

Replace:
- `import { FriendLinksSchema, FRIEND_LINK_CATEGORIES }` → `import { DiscoveriesSchema, DISCOVER_CATEGORIES }`
- `friendLinks` (the schema accessor) → `discoveries`
- `FRIEND_LINKS_SEED` → `DISCOVERIES_SEED`
- `runSeedFriendLinks()` → `runSeedDiscoveries()`
- `seed_friend_links` → `seed_discoveries`
- `friend-links` in log strings → `discoveries`

Update the seed method:
```ts
private async runSeedDiscoveries() {
  logger.info('[seed] seed_discoveries start');
  await this.db.delete(discoveries).where(isNull(discoveries.email));
  for (const link of DISCOVERIES_SEED) {
    await this.db.insert(discoveries).values({ ...link, email: null, failCount: 0 });
  }
  logger.info('[seed] seed_discoveries ok');
}
```

- [ ] **Step 4: Update app.module.ts**

Change:
```ts
import { FriendLinkModule } from '@/modules/friend-link/friend-link.module';
```
to:
```ts
import { DiscoverModule } from '@/modules/discover/discover.module';
```
And update the `imports` array.

- [ ] **Step 5: Commit**

```bash
git add apps/platform-api/src/schema/index.ts \
  apps/platform-api/src/constants/roles.ts \
  apps/platform-api/src/modules/system/system-init.service.ts \
  apps/platform-api/src/app.module.ts
git commit -m "feat(platform-api): update imports and constants for discover rename"
```

---

### Task 4: Frontend — API constants, i18n, router, nav

**Files:**
- Modify: `apps/web-blog/src/constants/api.ts`
- Rename: `apps/web-blog/src/i18n/messages/friends.ts` → `discover.ts`
- Modify: `apps/web-blog/src/i18n/messages/discover.ts`
- Modify: `apps/web-blog/src/i18n/messages.ts`
- Modify: `apps/web-blog/src/router/index.ts`
- Modify: `apps/web-blog/src/layouts/TopBar.vue`

- [ ] **Step 1: Update API constants**

In `apps/web-blog/src/constants/api.ts`:
```ts
DISCOVERIES: '/discoveries',
DISCOVERIES_ALL: '/discoveries/all',
DISCOVERIES_SEND_CODE: '/discoveries/send-code',
DISCOVER_CHECK: (id: number) => `/discoveries/${id}/check`,
```
Remove old `FRIEND_LINKS` constants.

- [ ] **Step 2: Rename i18n file**

```bash
mv apps/web-blog/src/i18n/messages/friends.ts apps/web-blog/src/i18n/messages/discover.ts
```

- [ ] **Step 3: Rewrite i18n keys in discover.ts**

New content (zh-CN + en):

```ts
import type { Messages } from '../types';

const messages: Messages = {
  discover: {
    title: '发现',
    subtitle: '共 {count} 个发现',
    empty: '暂无内容',
    loading: '加载中...',
    add: '提交发现',
    filter: {
      all: '全部',
      active: '仅活跃',
    },
    category: {
      blog: '博客',
      docs: '文档',
      framework: '框架',
      mail: '邮箱服务',
      mall: '商城',
      community: '社区论坛',
      tool: '工具',
      other: '其他',
    },
    form: {
      email: '邮箱',
      emailPlaceholder: '请输入邮箱地址',
      sendCode: '发送验证码',
      code: '验证码',
      codePlaceholder: '请输入6位验证码',
      name: '站点名称',
      namePlaceholder: '请输入站点名称',
      url: '站点链接',
      urlPlaceholder: 'https://example.com',
      logo: '图标链接（可选）',
      logoPlaceholder: 'https://example.com/logo.png',
      description: '描述（可选）',
      descriptionPlaceholder: '一句话介绍你的站点',
      category: '分类',
      categoryPlaceholder: '选择分类',
      submit: '提交申请',
      cancel: '取消',
      sending: '发送中...',
      submitting: '提交中...',
    },
    success: {
      created: '已提交！审核通过后将展示在这里。',
      codeSent: '验证码已发送，请查收邮件',
    },
    error: {
      codeFailed: '验证码发送失败，请稍后重试',
      createFailed: '提交失败，请稍后重试',
      invalidCode: '验证码错误或已过期',
    },
    cooldown: '已发送，请等待 {seconds} 秒',
    notice: [
      '发现推荐：这里收集了有趣的项目和工具，每周更新。',
      '探索分类：按分类浏览，发现你感兴趣的内容。',
      '提交发现：填写信息提交你的站点，审核通过后将展示在这里。',
      '可用性检查：系统定期检查站点可用性，失效站点将被标记。',
    ],
  },
};

export default messages;
```

Also remove `FRIEND_LINK_CATEGORIES` import if present.

- [ ] **Step 4: Update i18n registration**

In `apps/web-blog/src/i18n/messages.ts`:
```ts
import discover from './messages/discover';
```
And where `friends` is spread into locales, replace with `discover`.

- [ ] **Step 5: Update router**

In `apps/web-blog/src/router/index.ts`:
```ts
{
  path: '/discover',
  name: 'discover',
  component: () => import('@/pages/DiscoverPage.vue'),
  meta: { layout: 'simple', title: '发现' },
},
```

- [ ] **Step 6: Update TopBar nav**

In `apps/web-blog/src/layouts/TopBar.vue`:
```ts
{ label: 'Discover', path: '/discover' },
```
And in `pageTitle` mapping: `friends: 'Friends'` → `discover: 'Discover'`.

- [ ] **Step 7: Commit**

```bash
git add apps/web-blog/src/constants/api.ts \
  apps/web-blog/src/i18n/messages/discover.ts \
  apps/web-blog/src/i18n/messages.ts \
  apps/web-blog/src/router/index.ts \
  apps/web-blog/src/layouts/TopBar.vue
git commit -m "feat(web-blog): update frontend constants, i18n, router for discover rename"
```

---

### Task 5: Frontend — DiscoverPage.vue

**Files:**
- Rename: `apps/web-blog/src/pages/FriendsPage.vue` → `DiscoverPage.vue`
- Modify: `apps/web-blog/src/pages/DiscoverPage.vue`

- [ ] **Step 1: Rename file**

```bash
mv apps/web-blog/src/pages/FriendsPage.vue apps/web-blog/src/pages/DiscoverPage.vue
```

- [ ] **Step 2: Update imports and API references**

Read `DiscoverPage.vue`, replace:
- `API.FRIEND_LINKS` → `API.DISCOVERIES`
- `API.FRIEND_LINKS_ALL` → `API.DISCOVERIES_ALL`
- `API.FRIEND_LINKS_SEND_CODE` → `API.DISCOVERIES_SEND_CODE`
- `API.FRIEND_LINK_CHECK` → `API.DISCOVER_CHECK`
- `t('friends.` → `t('discover.`
- `noticeMaintain`, `noticeContent`, `noticeAdd`, `noticeCheck` → use array index from i18n

- [ ] **Step 3: Update comment store tag**

In `apps/web-blog/src/stores/comment.ts`, change tag union from `'friends'` to `'discover'`.

- [ ] **Step 4: Commit**

```bash
git add apps/web-blog/src/pages/DiscoverPage.vue \
  apps/web-blog/src/stores/comment.ts
git commit -m "feat(web-blog): rename FriendsPage to DiscoverPage"
```

---

### Task 6: Writing page — clear content and localStorage on success

**Files:**
- Modify: `apps/web-blog/src/pages/EditorPage.vue`

- [ ] **Step 1: Add draft clear after successful save**

In `EditorPage.vue`, in the `save()` function, after the successful API call (both create and edit branches), add:

```ts
localStorage.removeItem('editor:draft');
draft.content = '';
```

The updated `save()` function:
```ts
async function save(payload: EditorSavePayload) {
  if (!session.isAuthenticated) {
    const ok = window.confirm('需要登录才能保存文章，是否前往登录？');
    if (ok) router.push({ name: 'login', query: { redirect: route.fullPath } });
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const requestBody = {
      title: payload.title,
      cover_image: payload.cover_image,
      is_pinned: payload.is_pinned,
      featured_weight: payload.featured_weight,
      content_md: draft.content,
      status: payload.status,
      visibility: payload.visibility,
      allow_comment: payload.allow_comment,
      tag_ids: payload.tag_ids,
      category_ids: payload.category_ids,
    };

    if (isEdit.value) {
      await http.put(`/posts/${slug.value}`, requestBody);
      localStorage.removeItem('editor:draft');
      draft.content = '';
      router.push(`/posts/${slug.value}`);
      return;
    }

    const response = await http.post<ApiResponse<{ slug: string }>>(API.POSTS_LIST, requestBody);
    localStorage.removeItem('editor:draft');
    draft.content = '';
    router.push(`/posts/${response.data.slug}`);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '保存失败';
  } finally {
    loading.value = false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/pages/EditorPage.vue
git commit -m "fix(web-blog): clear draft content and localStorage on successful save"
```

---

### Task 7: Writing page — silent draft restore after login

**Files:**
- Modify: `apps/web-blog/src/pages/EditorPage.vue`
- Modify: `apps/web-blog/src/components/editors/BlogEditor.vue`

- [ ] **Step 1: Add `restoreDraft` param to login redirect**

In `EditorPage.vue`, change the login redirect in `save()`:
```ts
if (ok) router.push({
  name: 'login',
  query: { redirect: '/editor?restoreDraft=1' },
});
```

- [ ] **Step 2: Add `restoreDraft` detection in BlogEditor**

In `BlogEditor.vue`, in `onMounted`, modify the draft restore logic:

```ts
onMounted(() => {
  const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (saved && saved !== props.modelValue && !props.isEdit) {
    if (route.query.restoreDraft === '1') {
      emit('update:modelValue', saved);
    } else if (window.confirm('检测到未保存的草稿，是否恢复？')) {
      emit('update:modelValue', saved);
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }
});
```

Add `import { useRoute } from 'vue-router'` and `const route = useRoute()` in the script setup.

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/pages/EditorPage.vue \
  apps/web-blog/src/components/editors/BlogEditor.vue
git commit -m "fix(web-blog): silent draft restore after login with restoreDraft param"
```

---

### Task 8: About page rewrite

**Files:**
- Rewrite: `apps/web-blog/src/pages/AboutPage.vue`

- [ ] **Step 1: Rewrite AboutPage.vue**

Full rewrite with 6 sections. Here's the complete new component:

```vue
<script setup lang="ts">
const author = {
  name: 'rx-ted',
  bio: '全栈开发者，追求简洁高效的设计与代码质量。热衷于 TypeScript、Vue、Rust 生态，持续探索现代 Web 技术。',
  github: 'https://github.com/rx-ted',
  email: 'gjy.18sui@gmail.com',
};

const site = {
  name: 'Fullstack Blog',
  description: '个人博客与技术实验场。基于全栈现代技术栈构建，强调类型安全、架构设计与代码质量。从零搭建 monorepo，实践 DDD + 深度模块化。',
  builtAt: '2025',
};

const dependencies = [
  { category: '前端框架', items: ['Vue 3', 'Pinia', 'Vue Router', 'Naive UI'] },
  { category: '构建工具', items: ['Vite', 'TypeScript', 'Turborepo', 'pnpm'] },
  { category: '运行时', items: ['Hono', 'Drizzle ORM', 'D1 (SQLite)'] },
  { category: '代码质量', items: ['Biome', 'Vitest', 'Playwright'] },
];

const philosophy = [
  {
    title: '深度模块化',
    desc: '每个模块有清晰的边界和接口，内部实现可独立演化，外部通过窄接口通信。',
  },
  {
    title: '类型安全',
    desc: '端到端 TypeScript，从数据库到前端视图共享类型定义，编译期消除一类错误。',
  },
  {
    title: '测试驱动',
    desc: '核心逻辑先写测试，确保重构安全。单元测试 + 集成测试 + E2E 测试分层覆盖。',
  },
  {
    title: '小而美',
    desc: '不引入不必要的依赖，每个工具选择都有明确理由。代码即文档，命名即注释。',
  },
];

const future = [
  '完善全文搜索引擎，支持中文分词与高级搜索语法',
  '集成更多评论后端（Giscus、Webmentions）',
  '性能优化：图片懒加载、骨架屏、流式渲染',
  'PWA 支持：离线访问、推送通知',
  'API 文档自动生成（OpenAPI + Scalar）',
];
</script>

<template>
  <div class="about-page">
    <section class="about-section">
      <h2>关于我</h2>
      <div class="author-card">
        <div class="avatar-placeholder">{{ author.name[0].toUpperCase() }}</div>
        <div class="author-info">
          <h3>{{ author.name }}</h3>
          <p>{{ author.bio }}</p>
          <a :href="author.github" target="_blank" rel="noopener" class="contact-link">
            GitHub ↗
          </a>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>关于本站</h2>
      <p>{{ site.description }}</p>
      <p class="built-at">始于 {{ site.builtAt }}</p>
    </section>

    <section class="about-section">
      <h2>联系我</h2>
      <div class="contact-list">
        <div class="contact-item">
          <span class="contact-label">Email</span>
          <a :href="`mailto:${author.email}`">{{ author.email }}</a>
        </div>
        <div class="contact-item">
          <span class="contact-label">GitHub</span>
          <a :href="author.github" target="_blank" rel="noopener">{{ author.github }}</a>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>使用哪些依赖</h2>
      <div class="dep-categories">
        <div v-for="cat in dependencies" :key="cat.category" class="dep-category">
          <h3>{{ cat.category }}</h3>
          <div class="dep-items">
            <span v-for="item in cat.items" :key="item" class="dep-tag">{{ item }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>技术理念</h2>
      <div class="philosophy-grid">
        <div v-for="item in philosophy" :key="item.title" class="philosophy-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <section class="about-section">
      <h2>未来方向</h2>
      <ul class="future-list">
        <li v-for="item in future" :key="item">{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.about-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.about-section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--border-color, #e5e7eb);
}

.author-card {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color, #6366f1), var(--primary-hover, #4f46e5));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
}

.author-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.author-info p {
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.contact-link {
  color: var(--primary-color, #6366f1);
  font-weight: 500;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

.built-at {
  margin-top: 0.5rem;
  color: var(--text-secondary, #6b7280);
  font-size: 0.875rem;
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.contact-label {
  font-weight: 600;
  min-width: 5rem;
  color: var(--text-secondary, #6b7280);
}

.contact-item a {
  color: var(--primary-color, #6366f1);
  text-decoration: none;
}

.contact-item a:hover {
  text-decoration: underline;
}

.dep-categories {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.dep-category h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--text-secondary, #6b7280);
}

.dep-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.dep-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--bg-secondary, #f3f4f6);
  color: var(--text-primary, #111827);
  font-size: 0.875rem;
  border: 1px solid var(--border-color, #e5e7eb);
}

.philosophy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.philosophy-card {
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-color, #e5e7eb);
  background: var(--bg-primary, #fff);
}

.philosophy-card h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.philosophy-card p {
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
  font-size: 0.9rem;
}

.future-list {
  list-style: disc;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.future-list li {
  color: var(--text-secondary, #6b7280);
  line-height: 1.6;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/pages/AboutPage.vue
git commit -m "feat(web-blog): rewrite About page with 6 sections"
```

---

### Task 9: Verify — typecheck and build

- [ ] **Step 1: Typecheck platform-api**

```bash
pnpm --filter platform-api typecheck
```
Fix any type errors.

- [ ] **Step 2: Typecheck web-blog**

```bash
pnpm --filter web-blog typecheck
```
Fix any type errors.

- [ ] **Step 3: Build platform-api**

```bash
pnpm --filter platform-api build
```

- [ ] **Step 4: Build web-blog**

```bash
pnpm --filter web-blog build
```

- [ ] **Step 5: Commit fixes (if any)**

```bash
git commit -am "fix: typecheck and build fixes after three-tasks changes"
```
