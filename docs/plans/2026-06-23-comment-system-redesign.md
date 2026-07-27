# Comment System Redesign Implementation Plan

> **Status: PARTIALLY IMPLEMENTED** — 评论系统已存在，但 guestbook 合并和 reply folding 动画未按设计实现。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge guestbook into comment system (add `tag` column, make `post_id` nullable) and add reply folding animation to comment component.

**Architecture:** Single `comments` table handles all comment types via `tag` enum. Reply form state lifted to `CommentsSection` for single-open folding behavior.

**Tech Stack:** Drizzle ORM (MySQL), NestJS-style controllers/services, Vue 3 + Pinia + Naive UI

---

## File Map

### Modify
- `apps/platform-api/src/modules/comment/entities/comment.entity.ts` — add `tag`, make `postId` nullable
- `apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts` — `CreateCommentSchema`: add `tag`, make `postId` optional; `CommentPageQuerySchema`: add `tag`
- `apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts` — add `tag` to `CommentVO`
- `apps/platform-api/src/modules/comment/comment.service.ts` — `create()`: accept `tag`; `page()`: filter by tag; `buildCommentVO()`: include tag
- `apps/platform-api/src/modules/comment/comment.controller.ts` — pass `tag` from body/query
- `apps/platform-api/src/app.module.ts` — remove `GuestbookModule` import
- `apps/web-blog/src/types/community.ts` — add `tag` to `CommentVO`
- `apps/web-blog/src/stores/comment.ts` — support `tag` in query params
- `apps/web-blog/src/pages/GuestbookPage.vue` — rewrite to use comments API
- `apps/web-blog/src/constants/api.ts` — remove `GUESTBOOK_LIST`, `GUESTBOOK_CREATE`
- `apps/web-blog/src/components/blog/CommentsSection.vue` — add `activeReplyId` state, pass to children
- `apps/web-blog/src/components/comment/CommentItem.vue` — reply form wrapping with `n-collapse-transition`, `activeReplyId` prop
- `apps/web-blog/src/components/comment/CommentReplyList.vue` — accept `activeReplyId` prop, pass down
- `apps/web-blog/src/components/comment/CommentThread.vue` — accept `activeReplyId` prop, pass down

### Delete
- `apps/platform-api/src/modules/guestbook/` (entire directory)
- `apps/web-blog/src/i18n/messages.ts` — remove `guestbook.form.postingAs` keys (added in previous session)

---

### Task 1: Update comment entity — add `tag`, make `postId` nullable

**Files:**
- Modify: `apps/platform-api/src/modules/comment/entities/comment.entity.ts`

- [ ] **Step 1: Add `tag` column and make `postId` nullable**

```typescript
// comment.entity.ts
export const comments = mysqlTable(
  'comments',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().autoincrement(),
    postId: bigint('post_id', { mode: 'number' })
      .references(() => postCore.id, { onDelete: 'cascade' }),  // removed .notNull()
    userId: char('user_id', { length: 36 }),
    parentId: bigint('parent_id', { mode: 'number' }),
    tag: mysqlEnum('tag', ['post', 'guestbook', 'friends', 'about']).default('post').notNull(),
    // ... rest unchanged
  },
);

// CommentEntitySchema — add tag, make postId optional
export const CommentEntitySchema = z.object({
  id: z.string(),
  postId: z.string().nullable(),  // changed: nullable
  parentId: z.string().nullable(),
  tag: z.enum(['post', 'guestbook', 'friends', 'about']),  // new
  // ... rest unchanged
});

export interface CommentEntity {
  id: string;
  postId: string | null;  // changed: nullable
  parentId: string | null;
  tag: 'post' | 'guestbook' | 'friends' | 'about';  // new
  // ... rest unchanged
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/comment/entities/comment.entity.ts
git commit -m "feat(api): add tag column to comments, make postId nullable"
```

---

### Task 2: Update request DTOs — add `tag`

**Files:**
- Modify: `apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts`

- [ ] **Step 1: Update schemas**

```typescript
// comment.request.dto.ts
export const CreateCommentSchema = z
  .object({
    postId: z.string()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'postId must be a valid positive number',
      })
      .optional(),
    tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
    parentId: z.string().nullable().optional(),
    content: z.string().min(1, '评论内容不能为空'),
    guestName: z.string().min(1).max(100).optional(),
    guestEmail: z.string().email().optional(),
    guestWebsite: z.string().url().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.tag === 'post' && !data.postId) return false;
      return true;
    },
    { message: 'postId is required when tag is post', path: ['postId'] },
  )
  .refine(
    (data) => {
      if (data.guestName && !data.guestEmail) return false;
      return true;
    },
    { message: 'guestEmail is required when guestName is provided', path: ['guestEmail'] },
  );

export const CommentPageQuerySchema = z.object({
  tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
  postId: z.string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: 'postId must be a valid positive number',
    })
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['newest', 'hottest']).default('newest'),
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/comment/dtos/comment.request.dto.ts
git commit -m "feat(api): add tag to comment request DTOs"
```

---

### Task 3: Update response DTO — add `tag` to `CommentVO`

**Files:**
- Modify: `apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts`

- [ ] **Step 1: Add tag field**

```typescript
export interface CommentVO {
  id: number;
  postId: number | null;  // changed: nullable
  parentId: number | null;
  tag: 'post' | 'guestbook' | 'friends' | 'about';  // new
  content: string;
  likes: number;
  status: 'NORMAL' | 'DELETED';
  createdAt: string;
  updatedAt: string | null;
  author: AuthorBriefVO;
  isLiked: boolean;
  replyCount: number;
  replies?: {
    total: number;
    list: CommentVO[];
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/platform-api/src/modules/comment/dtos/comment.response.dto.ts
git commit -m "feat(api): add tag to CommentVO response"
```

---

### Task 4: Update comment service — tag support

**Files:**
- Modify: `apps/platform-api/src/modules/comment/comment.service.ts`

- [ ] **Step 1: Update `create()` to accept `tag`**

```typescript
async create(input: {
  postId?: string;
  tag: 'post' | 'guestbook' | 'friends' | 'about';
  parentId?: string;
  userId?: string | null;
  content: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestWebsite?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const city = input.ip ? this.geoipService.lookup(input.ip) : null;

  const comment = await this.commentRepo.createComment({
    postId: input.postId ? Number(input.postId) : null,
    tag: input.tag,
    parentId: input.parentId,
    userId: input.userId ?? null,
    content: input.content,
    guestName: input.guestName ?? null,
    guestEmail: input.guestEmail ?? null,
    guestWebsite: input.guestWebsite ?? null,
    ipAddress: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    city,
  });
  // ... rest unchanged
}
```

- [ ] **Step 2: Update `page()` to filter by tag**

```typescript
async page(
  query: { tag: string; postId?: string; page: number; pageSize: number; sort: string },
  currentUserId: string | null,
): Promise<CommentPageResult> {
  const offset = (query.page - 1) * query.pageSize;
  const orderBy =
    query.sort === 'hottest'
      ? [desc(comments.likes), desc(comments.createdAt)]
      : [desc(comments.createdAt)];

  const conditions = [
    eq(comments.tag, query.tag as any),
    isNull(comments.parentId),
    eq(comments.status, 'NORMAL'),
  ];
  if (query.postId) {
    conditions.push(eq(comments.postId, Number(query.postId)));
  }

  const totalResult = await this.commentRepo
    .getDb()
    .select({ total: count() })
    .from(comments)
    .where(and(...conditions));
  const total = Number(totalResult[0]?.total ?? 0);

  const rows = await this.commentRepo
    .getDb()
    .select()
    .from(comments)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(query.pageSize)
    .offset(offset);

  const data: CommentVO[] = await Promise.all(
    rows.map((row) => this.buildCommentVO(row, currentUserId)),
  );

  return { data, total, page: query.page, pageSize: query.pageSize };
}
```

- [ ] **Step 3: Update `buildCommentVO()` to include `tag`**

```typescript
return {
  id: commentId,
  postId: row.postId,
  parentId: row.parentId,
  tag: row.tag as 'post' | 'guestbook' | 'friends' | 'about',
  content: row.content,
  likes: row.likes ?? 0,
  status: row.status as 'NORMAL' | 'DELETED',
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt?.toISOString() ?? null,
  author,
  isLiked,
  replyCount,
  replies,
};
```

- [ ] **Step 4: Update `replyPage()` to also add tag in the inner `buildCommentVO` (already covered — it calls `buildCommentVO` which now includes tag)**

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/platform-api/src/modules/comment/comment.service.ts
git commit -m "feat(api): add tag support to comment service"
```

---

### Task 5: Update comment controller — pass tag from body/query

**Files:**
- Modify: `apps/platform-api/src/modules/comment/comment.controller.ts`

- [ ] **Step 1: Update `create()` to extract `tag` from body**

```typescript
async create(@Body() body: unknown, @Ctx() c: Context) {
  const parsed = CreateCommentSchema.safeParse(body);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.issues.map((i) => i.message).join('; '),
    });
  }
  const { postId, parentId, content, guestName, guestEmail, guestWebsite, tag } = parsed.data;
  const userId = getUserId(c);
  const ip = getClientIp(c);
  const userAgent = getClientUserAgent(c);
  return this.commentService.create({
    postId,
    tag,
    content,
    userId: userId || null,
    guestName: guestName ?? null,
    guestEmail: guestEmail ?? null,
    guestWebsite: guestWebsite ?? null,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    ...(parentId != null ? { parentId } : {}),
  });
}
```

- [ ] **Step 2: Update `page()` to extract `tag` from query**

```typescript
async page(@Query() query: unknown, @Ctx() c: Context) {
  const parsed = CommentPageQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new HTTPException(400, {
      message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  }
  const q = parsed.data;
  const userId = getUserId(c);
  return this.commentService.page(q, userId || null);
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/platform-api/src/modules/comment/comment.controller.ts
git commit -m "feat(api): pass tag from body/query in comment controller"
```

---

### Task 6: Remove guestbook module

**Files:**
- Delete: `apps/platform-api/src/modules/guestbook/` (entire directory)
- Modify: `apps/platform-api/src/app.module.ts`

- [ ] **Step 1: Delete guestbook directory**

Run: `rm -rf apps/platform-api/src/modules/guestbook`

- [ ] **Step 2: Remove GuestbookModule import from AppModule**

```typescript
// app.module.ts — remove these lines:
// import { GuestbookModule } from '@/modules/guestbook/guestbook.module';
// and remove GuestbookModule from the imports array
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -p tsconfig.json --noEmit` from `apps/platform-api`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(api): remove guestbook module"
```

---

### Task 7: Update frontend types — add `tag` to CommentVO

**Files:**
- Modify: `apps/web-blog/src/types/community.ts`

- [ ] **Step 1: Add tag field**

```typescript
export interface CommentVO {
  id: number;
  postId: number | null;  // changed: nullable
  parentId: number | null;
  tag: 'post' | 'guestbook' | 'friends' | 'about';  // new
  content: string;
  likes: number;
  status: 'NORMAL' | 'DELETED';
  createdAt: string;
  updatedAt: string | null;
  author: AuthorBriefVO;
  isLiked: boolean;
  replyCount: number;
  replies?: {
    total: number;
    list: CommentVO[];
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --build --noEmit` from `apps/web-blog`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/types/community.ts
git commit -m "feat(web): add tag to CommentVO type"
```

---

### Task 8: Update comment store — support `tag` query param

**Files:**
- Modify: `apps/web-blog/src/stores/comment.ts`

- [ ] **Step 1: Add `tag` to fetchComments query params**

```typescript
async function fetchComments(postIdVal: number, pageNum = 1, sortBy?: CommentSort) {
  postId.value = postIdVal;
  if (sortBy) sort.value = sortBy;
  if (pageNum === 1) page.value = 1;
  else page.value = pageNum;

  loading.value = true;
  try {
    const params: Record<string, string> = {
      page: String(page.value),
      pageSize: String(pageSize.value),
      sort: sort.value,
    };
    // postId is passed as query param for all comment types
    params.postId = String(postIdVal);

    const res = await http.get<ApiResponse<CommentPageResult>>(API.COMMENTS_PAGE, {
      query: params,
    });
    // ... rest unchanged
  }
}
```

Also update `createComment` to support `tag`:

```typescript
async function createComment(input: {
  postId?: number;
  tag?: 'post' | 'guestbook' | 'friends' | 'about';
  parentId?: number | null;
  content: string;
  guestName?: string | null;
  guestEmail?: string | null;
  guestWebsite?: string | null;
}): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {
      tag: input.tag ?? 'post',
      content: input.content,
    };
    if (input.postId) body.postId = String(input.postId);
    if (input.parentId) body.parentId = String(input.parentId);
    if (input.guestName) body.guestName = input.guestName;
    if (input.guestEmail) body.guestEmail = input.guestEmail;
    if (input.guestWebsite) body.guestWebsite = input.guestWebsite;

    const res = await http.post<ApiResponse<{ id: string }>>(API.COMMENTS_CREATE, body);
    const data = res.data ?? (res as any);
    if (data?.id) {
      if (input.postId) {
        await fetchComments(input.postId, 1, sort.value);
      }
      return true;
    }
    return false;
  } catch (err) {
    const detail = err instanceof HttpError ? err.body : err;
    console.error('Failed to create comment:', (err as Error)?.message, detail);
    return false;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx vue-tsc --build --noEmit` from `apps/web-blog`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/stores/comment.ts
git commit -m "feat(web): support tag param in comment store"
```

---

### Task 9: Add `activeReplyId` state to CommentsSection

**Files:**
- Modify: `apps/web-blog/src/components/blog/CommentsSection.vue`

- [ ] **Step 1: Add `activeReplyId` state**

```typescript
const activeReplyId = ref<number | null>(null);

function handleReply(comment: CommentNode) {
  if (!isLoggedIn.value) {
    message.warning('请先登录');
    return;
  }
  if (activeReplyId.value === comment.id) {
    activeReplyId.value = null;
  } else {
    activeReplyId.value = comment.id;
  }
}
```

- [ ] **Step 2: Pass `activeReplyId` and `@update:activeReplyId` to CommentThread**

```vue
<CommentThread
  :items="commentTree"
  :active-reply-id="activeReplyId"
  :post-slug="postSlug"
  :is-owner="isLoggedIn"
  :is-admin="false"
  @update:active-reply-id="(id: number | null) => activeReplyId = id"
  @like="handleLike"
  @reply="handleReply"
  @edit="handleEdit"
  @delete="handleDelete"
  @report="handleReport"
  @show-author="handleShowAuthor"
/>
```

Also update the `@reply` emit type to match — `CommentNode` not `any`.

- [ ] **Step 3: Commit**

```bash
git add apps/web-blog/src/components/blog/CommentsSection.vue
git commit -m "feat(web): add activeReplyId state to CommentsSection"
```

---

### Task 10: Update CommentThread to pass `activeReplyId`

**Files:**
- Modify: `apps/web-blog/src/components/comment/CommentThread.vue`

- [ ] **Step 1: Read current file content and add props**

```vue
<script setup lang="ts">
defineProps<{
  items: CommentNode[];
  postSlug?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  activeReplyId?: number | null;
}>();
defineEmits<{
  // ... existing emits
  'update:activeReplyId': [id: number | null];
}>();
</script>
```

Pass `activeReplyId` and the emit to each `CommentItem`:

```vue
<CommentItem
  v-for="item in items"
  :key="item.id"
  :comment="item"
  :post-slug="postSlug"
  :is-owner="isOwner"
  :is-admin="isAdmin"
  :active-reply-id="activeReplyId"
  @update:active-reply-id="(id: number | null) => $emit('update:activeReplyId', id)"
  @like="(id: number) => $emit('like', id)"
  @reply="(c: any) => $emit('reply', c)"
  @edit="(c: any) => $emit('edit', c)"
  @delete="(id: number) => $emit('delete', id)"
  @report="(c: any) => $emit('report', c)"
  @show-author="(id: string) => $emit('showAuthor', id)"
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/components/comment/CommentThread.vue
git commit -m "feat(web): pass activeReplyId through CommentThread"
```

---

### Task 11: Update CommentItem — reply folding with n-collapse-transition

**Files:**
- Modify: `apps/web-blog/src/components/comment/CommentItem.vue`

- [ ] **Step 1: Add props and update reply logic**

```typescript
const props = defineProps<{
  comment: CommentVO;
  postSlug?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  activeReplyId?: number | null;
}>();

const emit = defineEmits<{
  like: [id: number];
  reply: [comment: CommentVO];
  edit: [comment: CommentVO];
  delete: [id: number];
  report: [comment: CommentVO];
  showAuthor: [userId: string];
  'update:activeReplyId': [id: number | null];
}>();
```

Remove local `replying` ref. Derive `isReplyingActive`:

```typescript
const isReplyingActive = computed(() => props.activeReplyId === props.comment.id);
```

- [ ] **Step 2: Update the reply button emit**

In `CommentActions`, the `@reply` emit currently does:

```typescript
@reply="(c: any) => emit('reply', c)"
```

Change to toggle `activeReplyId`:

```typescript
@reply="(c: any) => emit('update:activeReplyId', isReplyingActive ? null : props.comment.id)"
```

- [ ] **Step 3: Wrap reply form in `n-collapse-transition`**

```vue
<!-- Reply input with collapse transition -->
<n-collapse-transition :show="isReplyingActive">
  <div class="reply-input">
    <CommentInput
      :placeholder="`回复 ${displayName}`"
      :submitting="replySubmitting"
      :guest-mode="!isLoggedIn"
      @submit="handleReplySubmit"
    />
  </div>
</n-collapse-transition>
```

Also add `n-collapse-transition` to the script import from naive-ui.

- [ ] **Step 4: After successful reply, emit to close the reply form**

```typescript
async function handleReplySubmit(...) {
  replySubmitting.value = true;
  const result = await store.createComment({
    postId: props.comment.postId,
    parentId: props.comment.id,
    content,
    guestName,
    guestEmail,
    guestWebsite,
  });
  replySubmitting.value = false;
  if (result) {
    emit('update:activeReplyId', null);
    message.success('回复成功');
  } else {
    message.error('回复失败');
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web-blog/src/components/comment/CommentItem.vue
git commit -m "feat(web): reply folding with collapse transition in CommentItem"
```

---

### Task 12: Update CommentReplyList to pass `activeReplyId`

**Files:**
- Modify: `apps/web-blog/src/components/comment/CommentReplyList.vue`

- [ ] **Step 1: Add activeReplyId prop and pass to nested CommentItem**

```typescript
defineProps<{
  replies: CommentVO[];
  total: number;
  loading: boolean;
  postSlug?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  hasMore: boolean;
  remaining: number;
  activeReplyId?: number | null;
}>();

defineEmits<{
  like: [id: number];
  reply: [comment: CommentVO];
  edit: [comment: CommentVO];
  delete: [id: number];
  report: [comment: CommentVO];
  loadMore: [];
  showAuthor: [userId: string];
  'update:activeReplyId': [id: number | null];
}>();
```

```vue
<CommentItem
  v-for="reply in replies"
  :key="reply.id"
  :comment="reply"
  :post-slug="postSlug"
  :is-owner="isOwner"
  :is-admin="isAdmin"
  :active-reply-id="activeReplyId"
  @update:active-reply-id="(id: number | null) => $emit('update:activeReplyId', id)"
  @like="(id: number) => $emit('like', id)"
  @reply="(c: any) => $emit('reply', c)"
  @edit="(c: any) => $emit('edit', c)"
  @delete="(id: number) => $emit('delete', id)"
  @report="(c: any) => $emit('report', c)"
  @show-author="(id: string) => $emit('showAuthor', id)"
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web-blog/src/components/comment/CommentReplyList.vue
git commit -m "feat(web): pass activeReplyId through CommentReplyList"
```

---

### Task 13: Rewrite GuestbookPage to use comments API

**Files:**
- Modify: `apps/web-blog/src/pages/GuestbookPage.vue`
- Modify: `apps/web-blog/src/constants/api.ts`
- Modify: `apps/web-blog/src/i18n/messages.ts`

- [ ] **Step 1: Remove GUESTBOOK_LIST, GUESTBOOK_CREATE from api.ts**

```typescript
// Remove these lines:
// GUESTBOOK_LIST: '/guestbook',
// GUESTBOOK_CREATE: '/guestbook',
```

- [ ] **Step 2: Rewrite GuestbookPage.vue**

The page should now:
- Fetch comments: `store.fetchComments(0, 1)` — but since `tag='guestbook'` doesn't use postId, we need to handle this differently.

Actually, since the comment store's `fetchComments` requires a `postIdVal` parameter and passes it as a query param, we need to think about how the GuestbookPage fetches guestbook comments. 

The simplest approach: GuestbookPage directly calls the API instead of using the store, OR we modify the store to support tag-only queries.

Looking at the controller, `page()` accepts `CommentPageQuerySchema` which has `postId` as optional and `tag` as optional. So we can call `GET /comments/page?tag=guestbook` without a postId.

Let me make GuestbookPage use direct http calls (like it currently does) but target the comments API:

```typescript
// Fetch guestbook messages
const res = await http.get<ApiResponse<CommentPageResult>>(API.COMMENTS_PAGE, {
  query: { tag: 'guestbook', sort: 'newest' },
});
```

For creating:
```typescript
await http.post(API.COMMENTS_CREATE, {
  tag: 'guestbook',
  content: form.value.content.trim(),
  ...(isAuthenticated.value ? {} : {
    guestName: authorName.value.trim(),
    guestEmail: authorEmail.value.trim(),
  }),
});
```

The page should use `CommentVO` for the message type, inheriting author info, likes, etc. But for the guestbook display, we mainly need: id, author (displayName/avatar), content, city (from author.location), createdAt.

- [ ] **Step 2a: Rewrite the template to use CommentVO from types/community**

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { http } from '@/http';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import { API } from '@/constants';
import type { CommentVO, CommentPageResult } from '@/types/community';

const { t } = useI18n();
const session = useSessionStore();

const messages = ref<CommentVO[]>([]);
const loading = ref(false);
const submitting = ref(false);
const submitError = ref('');

const form = ref({ content: '' });
const authorName = ref('');
const authorEmail = ref('');

const isAuthenticated = computed(() => session.isAuthenticated);
const userDisplayName = computed(() => session.user?.nickname || session.user?.username || '');

const formValid = computed(() => {
  if (!form.value.content.trim().length) return false;
  if (isAuthenticated.value) return true;
  return authorName.value.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authorEmail.value);
});

async function fetchMessages() {
  loading.value = true;
  try {
    const res = await http.get<ApiResponse<CommentPageResult>>(API.COMMENTS_PAGE, {
      query: { tag: 'guestbook', sort: 'newest' },
    });
    const data = (res.data ?? res) as CommentPageResult;
    messages.value = data.data ?? [];
  } catch {
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!formValid.value || submitting.value) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const payload: Record<string, string> = {
      tag: 'guestbook',
      content: form.value.content.trim(),
    };
    if (!isAuthenticated.value) {
      payload.guestName = authorName.value.trim();
      payload.guestEmail = authorEmail.value.trim();
    }
    await http.post(API.COMMENTS_CREATE, payload);
    form.value = { content: '' };
    authorName.value = '';
    authorEmail.value = '';
    await fetchMessages();
  } catch {
    submitError.value = t('guestbook.form.error');
  } finally {
    submitting.value = false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function displayName(msg: CommentVO): string {
  return msg.author.displayName || msg.author.username;
}

function displayAvatar(msg: CommentVO): string {
  return msg.author.avatar || msg.author.username.charAt(0);
}

onMounted(fetchMessages);
</script>
```

Template updates: Use `msg.author` for avatar/name/location:

```vue
<div v-for="msg in messages" :key="msg.id" class="message-item">
  <div class="msg-avatar">{{ displayAvatar(msg) }}</div>
  <div class="msg-body">
    <div class="msg-meta">
      <span class="msg-name">{{ displayName(msg) }}</span>
      <span v-if="msg.author.location" class="msg-city">{{ msg.author.location }}</span>
      <span class="msg-date">{{ formatDate(msg.createdAt) }}</span>
    </div>
    <p class="msg-content">{{ msg.content }}</p>
  </div>
</div>
```

- [ ] **Step 2b: Remove `guestbook.form.postingAs` from i18n messages.ts**

Remove the Chinese and English `guestbook.form.postingAs` keys that were added in the previous session.

- [ ] **Step 3: Typecheck**

Run: `npx vue-tsc --build --noEmit` from `apps/web-blog`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web-blog/src/pages/GuestbookPage.vue apps/web-blog/src/constants/api.ts apps/web-blog/src/i18n/messages.ts
git commit -m "feat(web): rewrite GuestbookPage to use comments API"
```

---

### Task 14: Run full typecheck and tests

- [ ] **Step 1: Run full typecheck**

```bash
cd /Users/ben/projects/app && turbo run typecheck
```
Expected: All packages pass typecheck

- [ ] **Step 2: Run full tests**

```bash
cd /Users/ben/projects/app && turbo run test
```
Expected: All tests pass

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: typecheck and test fixes after comment system redesign"
```
