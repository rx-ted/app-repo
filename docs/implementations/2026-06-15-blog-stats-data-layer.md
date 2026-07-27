# Blog Stats / Data Layer Refactor

> **Status: PARTIALLY IMPLEMENTED** — 后端统计接口已存在，enrichment 方案部分实现。

## Problem

`useBlog` store has unreliable statistics:
- `totalPosts`/`totalViews`/`totalLikes` depend on a synthetic `list` ref
- `CategoryList` misuses `trendingTags` (tag names) as categories
- `Trending` uses fake view counts
- `AuthorCard` has hardcoded 42/186
- `trendingTags` is `string[]` without post counts
- No author tag/category breakdown
- `BlogAuthorResponse.tags` is always empty

## Design

### Backend: `GET /blog/summary` enrichment
- `hero.stats` adds: `totalViews`, `totalLikes`, `totalComments` (SQL `COALESCE(SUM(...), 0)`)
- `trendingTags`: `string[]` → `{ name: string; postCount: number }[]`

### Backend: `GET /author-stats/:identifier` enrichment
- Adds `tags: { id: string; name: string; slug: string; postCount: number }[]`
- Adds `categories: { id: string; name: string; slug: string; postCount: number }[]`
- Queried via postTagMappings/postCategoryMappings filtered by author's post IDs

### Backend: `GET /blog/authors/:username` fix
- Populate `posts.tags` with actual tag names used by this author

### Backend: `GET /categories` sort
- Change `orderBy(desc(postCategories.createdAt))` → `orderBy(desc(postCategories.postCount))`

### Frontend: `useBlog` store
- Remove synthetic `list`/`popular`/`recommend` + `fetchHomeData`/`fetchArticleRecommend`
- `totalPosts`/`totalViews`/`totalLikes`/`totalComments` from `hero.stats`
- `trendingTags` → `TagSummary[]`
- `fetchAuthorStats` returns tags + categories

### Frontend: Components
- `CategoryList` → `categoriesList` (API)
- `TagList` → `tagsList` sorted by postCount
- `NetworkCard` → `hero.stats`
- `Trending` → `featured` sorted by `view_count`
- `AuthorCard` → `authorStats` from `useBlog`
- `RecommendedReading` → `featured` sorted by score

## Files Changed

**Backend (platform-api):**
- `modules/blog/blog.service.ts`
- `modules/blog/dtos/blog.response.dto.ts`
- `modules/author-stats/author-stats.service.ts`
- `modules/author-stats/dtos/author-stats.response.dto.ts`
- `modules/author-stats/entities/author-stats.entity.ts`
- `modules/author-stats/mappers/author-stats.mapper.ts`
- `modules/category/repositories/category.repository.ts`

**Frontend (web-blog):**
- `stores/blog.ts`
- `types/blog.ts`
- `components/blog/CategoryList.vue`
- `components/blog/TagList.vue`
- `components/blog/NetworkCard.vue`
- `components/blog/Trending.vue`
- `components/blog/AuthorCard.vue`
- `components/blog/RecommendedReading.vue`
