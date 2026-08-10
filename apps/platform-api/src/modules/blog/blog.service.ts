import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, and, like, count, gt, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { getUptimeMs } from '@/modules/system/system-info.service';
import { computeOffset } from '@/common/utils/pagination';
import { StatsBufferService } from '@/modules/post-stats/stats-buffer.service';
import { postCore, postStats, users, postTags, postCategories } from '@/schema';
import type {
  BlogHomeResponse,
  BlogSearchResponse,
  BlogPostItem,
} from '@/modules/blog/dtos/blog.response.dto';
import { BlogMapper } from '@/modules/blog/mappers/blog.mapper';
import { CACHE_KEYS } from '@/constants';

export type BlogLang = 'en' | 'zh-CN';

const PINNED_TOP_LIMIT = 3;
const PINNED_QUERY_LIMIT = 10;

/**
 * Translation pairs share a base slug (`foo.zh` ↔ `foo`). Group pinned rows by
 * that base, keep the version matching the requested language (falling back to
 * whichever version exists), and return the top N in pinned order.
 */
export function pickPinnedForLang(
  rows: BlogPostItem[],
  lang?: BlogLang,
  limit = PINNED_TOP_LIMIT,
): BlogPostItem[] {
  const groups = new Map<string, { en?: BlogPostItem; zh?: BlogPostItem }>();
  const order = new Map<string, number>();
  rows.forEach((row, i) => {
    const base = row.slug.endsWith('.zh') ? row.slug.slice(0, -3) : row.slug;
    if (!order.has(base)) order.set(base, i);
    const group = groups.get(base) ?? {};
    if (row.slug.endsWith('.zh')) group.zh = row;
    else group.en = row;
    groups.set(base, group);
  });
  return [...groups.entries()]
    .sort((a, b) => order.get(a[0])! - order.get(b[0])!)
    .map(([, group]) => (lang === 'zh-CN' ? (group.zh ?? group.en) : (group.en ?? group.zh)))
    .filter((p): p is BlogPostItem => !!p)
    .slice(0, limit);
}

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
    @Inject(StatsBufferService) private buffer: StatsBufferService,
  ) {}

  async getSummary(lang?: BlogLang): Promise<BlogHomeResponse> {
    return this.getHome(lang);
  }

  async getHome(lang?: BlogLang): Promise<BlogHomeResponse> {
    const base = await this.getHomeBase(lang);
    const buffered = await this.buffer.getBufferedTotals();
    return {
      ...base,
      hero: {
        ...base.hero,
        stats: {
          ...base.hero.stats,
          totalViews: base.hero.stats.totalViews + buffered.views,
          totalLikes: base.hero.stats.totalLikes + buffered.likes,
          totalComments: base.hero.stats.totalComments + buffered.comments,
        },
      },
    };
  }

  private async getHomeBase(lang?: BlogLang): Promise<BlogHomeResponse> {
    return cacheable(this.cache, CACHE_KEYS.blogHome(lang), 60, async () => {
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
        .orderBy(desc(postCore.featuredWeight), desc(postCore.createdAt))
        .limit(PINNED_QUERY_LIMIT);

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
      pinned = pickPinnedForLang(
        pinned.map((p) => enrichedMap.get(p.id) ?? p),
        lang,
      );

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
