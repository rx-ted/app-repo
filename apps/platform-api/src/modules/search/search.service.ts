import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, like, count, and, or, inArray } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import {
  postCore,
  postContent,
  postStats,
  users,
  postTags,
  postTagMappings,
  postCategories,
  postCategoryMappings,
  userProfiles,
} from '@/schema';
import type {
  SearchResponseDto,
  SearchAuthorItem,
} from '@/modules/search/dtos/search.response.dto';
import type { SearchEntity } from '@/modules/search/entities/search.entity';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { DEFAULTS } from '@/constants';

function extractExcerpt(
  contentMd: string | null,
  q: string,
  maxLen = DEFAULTS.EXCERPT_MAX_LEN,
): string {
  if (!contentMd) return '';
  const lower = contentMd.toLowerCase();
  const term = q.toLowerCase();
  const idx = lower.indexOf(term);
  if (idx < 0) return contentMd.slice(0, maxLen);
  const start = Math.max(0, idx - Math.floor(maxLen * DEFAULTS.EXCERPT_CONTEXT_BEFORE));
  const end = Math.min(
    contentMd.length,
    idx + term.length + Math.floor(maxLen * DEFAULTS.EXCERPT_CONTEXT_AFTER),
  );
  const prefix = start > 0 ? '…' : '';
  const suffix = end < contentMd.length ? '…' : '';
  return `${prefix}${contentMd.slice(start, end)}${suffix}`;
}

@Service()
export class SearchService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async search(params: Partial<SearchEntity>): Promise<SearchResponseDto> {
    const q = params.q ?? '';
    const types = params.types ?? ['posts'];
    const limit = params.limit ?? 10;
    const offset = params.offset ?? 0;

    return cacheable(
      this.cache,
      `search:${q}:${types.join(',')}:${limit}:${offset}`,
      60,
      async () => {
        const result: SearchResponseDto = {
          posts: { list: [], total: 0 },
          tags: { list: [], total: 0 },
          categories: { list: [], total: 0 },
          author: { list: [], total: 0 },
        };

        if (!q) return result;

        const pattern = `%${q}%`;

        if (types.includes('posts')) {
          const titleCondition = like(postCore.title, pattern);
          const contentCondition = like(postContent.contentMd, pattern);
          const postConditions = and(
            eq(postCore.status, 'published'),
            or(titleCondition, contentCondition),
          );

          const [totalResult] = await this.db
            .select({ total: count() })
            .from(postCore)
            .leftJoin(postContent, eq(postCore.id, postContent.postId))
            .where(postConditions);

          const rows = (await this.db
            .select()
            .from(postCore)
            .leftJoin(users, eq(postCore.userId, users.id))
            .leftJoin(postContent, eq(postCore.id, postContent.postId))
            .leftJoin(postStats, eq(postCore.id, postStats.postId))
            .where(postConditions)
            .orderBy(desc(postCore.createdAt))
            .limit(limit)
            .offset(offset)) as any[];

          const postIds = rows.map((r) => r.postCore.id).filter((id) => id != null);

          const tagRows = postIds.length
            ? await this.db
                .select({ postId: postTagMappings.postId, name: postTags.name })
                .from(postTagMappings)
                .innerJoin(postTags, eq(postTagMappings.tagId, postTags.id))
                .where(inArray(postTagMappings.postId, postIds))
            : [];

          const catRows = postIds.length
            ? await this.db
                .select({ postId: postCategoryMappings.postId, name: postCategories.name })
                .from(postCategoryMappings)
                .innerJoin(postCategories, eq(postCategoryMappings.categoryId, postCategories.id))
                .where(inArray(postCategoryMappings.postId, postIds))
            : [];

          const tagMap = new Map<number, string[]>();
          for (const row of tagRows) {
            const arr = tagMap.get(row.postId) ?? [];
            arr.push(row.name);
            tagMap.set(row.postId, arr);
          }

          const catMap = new Map<number, string[]>();
          for (const row of catRows) {
            const arr = catMap.get(row.postId) ?? [];
            arr.push(row.name);
            catMap.set(row.postId, arr);
          }

          result.posts = {
            list: rows.map((r) => ({
              id: String(r.postCore.id),
              slug: r.postCore.slug,
              title: r.postCore.title,
              cover_image: r.postCore.coverImage ?? null,
              is_pinned: r.postCore.isPinned ?? false,
              featured_weight: r.postCore.featuredWeight ?? 0,
              author_name: r.users?.username ?? null,
              author_username: r.users?.username ?? null,
              tags: tagMap.get(r.postCore.id) ?? [],
              categories: catMap.get(r.postCore.id) ?? [],
              excerpt: extractExcerpt(r.postContent?.contentMd ?? null, q),
              reading_time: Math.max(1, Math.ceil((r.postContent?.contentMd?.length ?? 0) / 1000)),
              view_count: r.postStats?.viewCount ?? 0,
              like_count: r.postStats?.likeCount ?? 0,
              comment_count: r.postStats?.commentCount ?? 0,
              updated_at: r.postCore.updatedAt.toISOString(),
              published_at: r.postCore.publishedAt?.toISOString() ?? null,
            })),
            total: totalResult.total,
          };
        }

        if (types.includes('tags')) {
          const [totalResult] = await this.db
            .select({ total: count() })
            .from(postTags)
            .where(like(postTags.name, pattern));
          const rows = await this.db
            .select()
            .from(postTags)
            .where(like(postTags.name, pattern))
            .orderBy(desc(postTags.usageCount))
            .limit(limit)
            .offset(offset);

          result.tags = {
            list: rows.map((t) => ({
              id: String(t.id),
              name: t.name,
              slug: t.slug,
              post_count: t.usageCount,
            })),
            total: totalResult.total,
          };
        }

        if (types.includes('categories')) {
          const [totalResult] = await this.db
            .select({ total: count() })
            .from(postCategories)
            .where(like(postCategories.name, pattern));
          const rows = await this.db
            .select()
            .from(postCategories)
            .where(like(postCategories.name, pattern))
            .orderBy(desc(postCategories.createdAt))
            .limit(limit)
            .offset(offset);

          result.categories = {
            list: rows.map((c) => ({
              id: String(c.id),
              name: c.name,
              slug: c.slug,
              post_count: c.postCount ?? 0,
            })),
            total: totalResult.total,
          };
        }

        if (types.includes('author')) {
          const [totalResult] = await this.db
            .select({ total: count() })
            .from(users)
            .where(like(users.username, pattern));
          const rows = await (this.db.select().from(users as any) as any)
            .leftJoin(userProfiles as any, eq((users as any).id, (userProfiles as any).userId))
            .where(like((users as any).username, pattern))
            .orderBy(desc((users as any).createdAt))
            .limit(limit)
            .offset(offset);

          result.author = {
            list: await Promise.all(
              rows.map(async (r: any) => {
                const [postCountResult] = await this.db
                  .select({ total: count() })
                  .from(postCore)
                  .where(eq(postCore.userId, r.users.id));
                return {
                  id: r.users.id,
                  username: r.users.username,
                  nickname: r.userProfiles?.nickname ?? null,
                  avatar_url: r.userProfiles?.avatarUrl ?? null,
                  bio: r.userProfiles?.bio ?? null,
                  post_count: postCountResult.total,
                } as SearchAuthorItem;
              }),
            ),
            total: totalResult.total,
          };
        }

        return result;
      },
    );
  }
}

export default SearchService;
