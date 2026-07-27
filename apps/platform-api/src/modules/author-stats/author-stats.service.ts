import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, count, inArray, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { authorStats, postStats } from '@/schema';
import {
  postCore,
  postTags,
  postTagMappings,
  postCategories,
  postCategoryMappings,
} from '@/schema';
import type { AuthorStatsResponseDto } from '@/modules/author-stats/dtos/author-stats.response.dto';
import { AuthorStatsMapper } from '@/modules/author-stats/mappers/author-stats.mapper';

@Service()
export class AuthorStatsService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async getStats(identifier: string): Promise<AuthorStatsResponseDto> {
    return this.getByUserId(identifier);
  }

  async getByUserId(userId: string): Promise<AuthorStatsResponseDto> {
    return cacheable(this.cache, `author-stats:${userId}`, 120, async () => {
      const [postCountResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(eq(postCore.userId, userId));

      const authorPostIds = (
        await this.db.select({ id: postCore.id }).from(postCore).where(eq(postCore.userId, userId))
      ).map((p) => p.id);

      // Aggregate view/like/comment from post_stats
      let totalViews = 0;
      let totalLikes = 0;
      let totalComments = 0;
      if (authorPostIds.length > 0) {
        const [agg] = await this.db
          .select({
            views: sql<number>`COALESCE(SUM(${postStats.viewCount}), 0)`,
            likes: sql<number>`COALESCE(SUM(${postStats.likeCount}), 0)`,
            comments: sql<number>`COALESCE(SUM(${postStats.commentCount}), 0)`,
          })
          .from(postStats)
          .where(inArray(postStats.postId, authorPostIds));
        totalViews = agg?.views ?? 0;
        totalLikes = agg?.likes ?? 0;
        totalComments = agg?.comments ?? 0;
      }

      const tags = await this.db
        .select({
          id: postTags.id,
          name: postTags.name,
          slug: postTags.slug,
          usageCount: postTags.usageCount,
        })
        .from(postTags)
        .innerJoin(postTagMappings, eq(postTags.id, postTagMappings.tagId))
        .where(
          authorPostIds.length > 0
            ? inArray(postTagMappings.postId, authorPostIds)
            : eq(postTagMappings.postId, -1),
        )
        .groupBy(postTags.id);

      const categories = await this.db
        .select({
          id: postCategories.id,
          name: postCategories.name,
          slug: postCategories.slug,
          postCount: postCategories.postCount,
        })
        .from(postCategories)
        .innerJoin(postCategoryMappings, eq(postCategories.id, postCategoryMappings.categoryId))
        .where(
          authorPostIds.length > 0
            ? inArray(postCategoryMappings.postId, authorPostIds)
            : eq(postCategoryMappings.postId, -1),
        )
        .groupBy(postCategories.id);

      return AuthorStatsMapper.toResponse({
        user_id: userId,
        post_count: postCountResult.total,
        view_count: totalViews,
        like_count: totalLikes,
        comment_count: totalComments,
        tags: tags.map((t) => ({
          id: String(t.id),
          name: t.name,
          slug: t.slug,
          postCount: t.usageCount,
        })),
        categories: categories.map((c) => ({
          id: String(c.id),
          name: c.name,
          slug: c.slug,
          postCount: c.postCount ?? 0,
        })),
        last_updated: new Date().toISOString(),
      });
    });
  }

  async refreshAll(): Promise<{ affectedRows: number }> {
    const postCounts = await this.db
      .select({
        userId: postCore.userId,
        count: count(),
      })
      .from(postCore)
      .groupBy(postCore.userId);

    let affectedRows = 0;
    for (const pc of postCounts) {
      const [result] = await this.db
        .insert(authorStats)
        .values({
          userId: pc.userId,
          viewCount: 0,
          likeCount: 0,
          commentCount: 0,
        })
        .onConflictDoNothing();
      affectedRows += result.affectedRows ?? 0;
      await this.cache.delete(`author-stats:${pc.userId}`);
    }
    return { affectedRows };
  }
}

export default AuthorStatsService;
