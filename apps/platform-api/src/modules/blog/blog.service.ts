import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, and, like, count, gt, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { getUptimeMs } from '@/modules/system/system-info.service';
import { computeOffset } from '@/common/utils/pagination';
import { postCore, postStats, users, postTags, postCategories } from '@/schema';
import type { BlogHomeResponse, BlogSearchResponse } from '@/modules/blog/dtos/blog.response.dto';
import { BlogMapper } from '@/modules/blog/mappers/blog.mapper';

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

@Service()
export class BlogService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async getSummary(): Promise<BlogHomeResponse> {
    return this.getHome();
  }

  async getHome(): Promise<BlogHomeResponse> {
    return cacheable(this.cache, 'blog:home', 60, async () => {
      const [postCountResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(eq(postCore.status, 'published'));
      const [tagCountResult] = await this.db.select({ total: count() }).from(postTags);
      const [catCountResult] = await this.db.select({ total: count() }).from(postCategories);

      const featuredRows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(and(eq(postCore.status, 'published'), gt(postCore.featuredWeight, 0)))
        .orderBy(desc(postCore.featuredWeight))
        .limit(10);

      const latestRows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(eq(postCore.status, 'published'))
        .orderBy(desc(postCore.createdAt))
        .limit(10);

      const pinnedRows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(and(eq(postCore.status, 'published'), eq(postCore.isPinned, true)))
        .orderBy(desc(postCore.createdAt))
        .limit(5);

      const [viewsResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.viewCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.status, 'published'));
      const [likesResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.likeCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.status, 'published'));
      const [commentsResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.commentCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.status, 'published'));

      const trendingTagRows = await this.db
        .select({ name: postTags.name, usageCount: postTags.usageCount })
        .from(postTags)
        .orderBy(desc(postTags.usageCount))
        .limit(10);

      let featured = featuredRows.map((r) =>
        BlogMapper.mapPostRow(r.postCore, r.users, r.postStats),
      );
      let latest = latestRows.map((r) => BlogMapper.mapPostRow(r.postCore, r.users, r.postStats));
      let pinned = pinnedRows.map((r) => BlogMapper.mapPostRow(r.postCore, r.users, r.postStats));

      const allEnriched = await BlogMapper.enrichPostsWithTaxonomy(this.db, [
        ...featured,
        ...latest,
        ...pinned,
      ]);
      const enrichedMap = new Map(allEnriched.map((p) => [p.id, p]));
      featured = featured.map((p) => enrichedMap.get(p.id) ?? p);
      latest = latest.map((p) => enrichedMap.get(p.id) ?? p);
      pinned = pinned.map((p) => enrichedMap.get(p.id) ?? p);

      return {
        hero: {
          title: '可扩展全栈博客系统',
          description: '围绕内容、认证、权限、缓存与搜索能力构建的全栈博客平台。',
          stats: {
            posts: postCountResult.total,
            tags: tagCountResult.total,
            categories: catCountResult.total,
            totalViews: Number(viewsResult.total),
            totalLikes: Number(likesResult.total),
            totalComments: Number(commentsResult.total),
            runtime: formatUptime(getUptimeMs()),
          },
        },
        featured,
        latest,
        pinned,
        trendingTags: trendingTagRows.map((t) => ({
          name: t.name,
          postCount: t.usageCount,
        })),
      };
    });
  }

  async search(params: {
    keyword?: string;
    page?: number;
    pageSize?: number;
    excludeSlugs?: string[];
    tag?: string;
    category?: string;
    author?: string;
  }): Promise<BlogSearchResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const cacheKey = `blog:search:${params.keyword ?? ''}:${page}:${pageSize}`;

    return cacheable(this.cache, cacheKey, 60, async () => {
      const conditions = [eq(postCore.status, 'published')];

      if (params.keyword) {
        conditions.push(like(postCore.title, `%${params.keyword}%`));
      }
      if (params.excludeSlugs?.length) {
        conditions.push(sql`${postCore.slug} NOT IN (${params.excludeSlugs.join(',')})`);
      }

      let query = this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(and(...conditions))
        .orderBy(desc(postCore.createdAt));

      if (pageSize > 0) {
        query = query.limit(pageSize).offset(computeOffset({ page, pageSize })) as any;
      }

      const rows: any[] = await query;
      const [totalResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(and(...conditions));

      const enriched = await BlogMapper.enrichPostsWithTaxonomy(
        this.db,
        rows.map((r) => BlogMapper.mapPostRow(r.postCore, r.users, r.postStats)),
      );

      return {
        list: enriched,
        total: totalResult.total,
      };
    });
  }
}

export default BlogService;
