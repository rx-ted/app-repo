# Comment System Redesign: Guestbook Merged + Reply Folding

> **Status: PARTIALLY IMPLEMENTED** — 评论系统已存在，guestbook 合并部分实现。

## Goal

Replace the standalone `guestbook_messages` table with the existing comment system, and add reply folding animation to the comment component.

## Changes

### 1. Database: `comments` table

- **Remove `.notNull()`** from `post_id` — nullable now, FK constraint kept when non-null
- **Add `tag` column**: `mysqlEnum('tag', ['post', 'guestbook', 'friends', 'about'])`, default `'post'`, not null
- Existing rows: all get `tag = 'post'`
- Guestbook entries use `tag = 'guestbook'`, `post_id = null`

### 2. Backend API

| File | Change |
|------|--------|
| `comment.entity.ts` | Add `tag` column, make `postId` nullable |
| `comment.request.dto.ts` | `CreateCommentSchema`: `postId` optional, add `tag` default `'post'`; `CommentPageQuerySchema`: add `tag` default `'post'`, `postId` optional |
| `comment.response.dto.ts` | `CommentVO`: add `tag: string` |
| `comment.service.ts` | `page()`: filter by `WHERE tag=? AND (post_id=? OR ? IS NULL)`; `create()`: accept `tag` and pass to insert; `buildCommentVO()`: include `tag` in response |
| `comment.mapper.ts` | Pass through `tag` |
| Delete `guestbook/` module | Remove controller, service, entity, mappers, dtos, module file; remove from `AppModule` |

#### Validation Rules

- `tag = 'post'` → `postId` required
- `tag = 'guestbook' | 'friends' | 'about'` → `postId` not allowed (null)

### 3. Frontend

| File | Change |
|------|--------|
| `types/community.ts` | `CommentVO` add `tag` field |
| `GuestbookPage.vue` | Rewrite to use `API.COMMENTS_PAGE?tag=guestbook` + `API.COMMENTS_CREATE`; remove old guestbook API calls |
| `constants/api.ts` | Remove `GUESTBOOK_LIST` / `GUESTBOOK_CREATE` |
| `components/blog/CommentsSection.vue` | Add `activeReplyId` state; pass down to CommentThread → CommentItem |
| `components/comment/CommentItem.vue` | `replying` derived from `activeReplyId === comment.id`; wrap reply form in `<n-collapse-transition>` |
| `components/comment/CommentThread.vue` | Accept `activeReplyId` prop, pass to each CommentItem |
| `components/comment/CommentReplyList.vue` | Accept `activeReplyId` prop, pass to each nested CommentItem |

#### Reply Folding Behavior

- `CommentsSection` holds `activeReplyId: Ref<number | null>`
- Click reply on comment A → set `activeReplyId = A.id`
- Click reply on comment B → set `activeReplyId = B.id` (A closes automatically)
- Click reply on same comment A again → set `activeReplyId = null` (toggles off)
- On successful submit or cancel → set `activeReplyId = null`
- Reply form wrapped in `<n-collapse-transition :show="activeReplyId === comment.id">`

### 4. Files to Delete

- `apps/platform-api/src/modules/guestbook/` (entire directory)
- `apps/web-blog/src/constants/api.ts`: `GUESTBOOK_LIST`, `GUESTBOOK_CREATE`

### 5. Migration

- Drizzle migration to add `tag` column and make `post_id` nullable
- Update existing guestbook_messages table data to `comments` table (one-time script or manual)

### 6. Future-Proofing

- Adding new comment types (e.g., `friends`, `about`) requires only adding the enum value and passing `tag` in the API call
- No new tables needed

## Not In Scope

- Admin dashboard for cross-type comment management
- Real-time updates / WebSockets
- Notification system enhancements
