import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

import { PostMapper } from '@/modules/post/mappers/post.mapper';
import { PostRepository } from '@/modules/post/repositories/post.repository';
import { parsePostMeta } from '@/lib/post-parser';
import { postCore, postTagMappings, postCategoryMappings } from '@/schema';
import { DEFAULTS, CACHE_KEYS } from '@/constants';

function generateSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
  // 中文/非 ASCII 标题：使用标题的短 hash 作为 slug，保证确定性
  if (!slug) {
    const hash = bytesToHex(sha256(new TextEncoder().encode(title))).slice(0, 8);
    slug = `post-${hash}`;
  }
  return slug;
}

@Service()
class PostService {
  constructor(
    @Inject(PostRepository) private postRepo: PostRepository,
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async list(
    page: number = 1,
    pageSize: number = DEFAULTS.PAGE_SIZE,
    options?: {
      keyword?: string;
      tag?: string;
      category?: string;
      author?: string;
      excludeSlugs?: string[];
    },
  ) {
    const result = await this.postRepo.list(page, pageSize, options);
    return {
      list: result.list.map(PostMapper.toCardResponse),
      total: result.total,
    };
  }

  async getBySlug(slug: string) {
    const post = await this.postRepo.findBySlug(slug);
    if (!post) return null;
    return PostMapper.toDetailResponse(post);
  }

  async getAdjacent(slug: string) {
    return this.postRepo.findAdjacent(slug);
  }

  async getCalendarCounts(year: number, month: number): Promise<Record<string, number>> {
    const cacheKey = CACHE_KEYS.postCalendar(year, month);
    return cacheable(this.cache, cacheKey, 300, async () => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      const rows = await this.db
        .select({
          date: sql<string>`DATE(${postCore.publishedAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(postCore)
        .where(
          and(
            eq(postCore.status, 'published'),
            sql`${postCore.publishedAt} IS NOT NULL`,
            gte(postCore.publishedAt, start),
            lt(postCore.publishedAt, end),
          ),
        )
        .groupBy(sql`DATE(${postCore.publishedAt})`);
      const result: Record<string, number> = {};
      for (const row of rows) {
        result[row.date] = row.count;
      }
      return result;
    });
  }

  async create(input: {
    title: string;
    slug?: string;
    contentMd: string;
    authorId: string;
    authorName: string;
    authorUsername: string;
    coverImage?: string | null;
    isPinned?: boolean;
    featuredWeight?: number;
    status?: 'draft' | 'published' | 'archived';
    visibility?: 'public' | 'private' | 'password';
    allowComment?: boolean;
    tagIds?: number[];
    categoryIds?: number[];
    createdBy: string | null;
    updatedBy: string | null;
  }) {
    let resolvedTitle = input.title;
    let resolvedSlug = input.slug;
    if (!resolvedTitle && !resolvedSlug) {
      const { data: fm } = parsePostMeta(input.contentMd);
      resolvedTitle = fm.title || '';
      resolvedSlug = fm.slug;
    }
    let slug = resolvedSlug || generateSlug(resolvedTitle);
    const existing = await this.db
      .select({ id: postCore.id })
      .from(postCore)
      .where(eq(postCore.slug, slug))
      .limit(1);
    if (existing.length) {
      slug = `${slug}-${Date.now()}`;
    }

    const created = await this.postRepo.create({
      title: resolvedTitle,
      slug,
      contentMd: input.contentMd,
      authorId: input.authorId,
      authorName: input.authorName,
      authorUsername: input.authorUsername,
      contentHtml: null,
      coverImage: input.coverImage ?? null,
      isPinned: input.isPinned ?? false,
      featuredWeight: input.featuredWeight ?? 0,
      status: input.status ?? 'draft',
      visibility: input.visibility ?? 'public',
      allowComment: input.allowComment ?? true,
      readingTime: Math.max(1, Math.ceil(input.contentMd.length / 1000)),
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      publishedAt: input.status === 'published' ? new Date().toISOString() : null,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    });

    const postId = Number(created.id);
    if (input.tagIds?.length) {
      await this.db
        .insert(postTagMappings)
        .values(input.tagIds.map((tagId) => ({ postId, tagId })));
    }
    if (input.categoryIds?.length) {
      await this.db
        .insert(postCategoryMappings)
        .values(input.categoryIds.map((categoryId) => ({ postId, categoryId })));
    }

    return { slug };
  }

  async updateBySlug(
    slug: string,
    input: Partial<{
      title: string;
      contentMd: string;
      tagIds?: number[];
      categoryIds?: number[];
      updatedBy: string | null;
    }>,
  ) {
    const post = await this.postRepo.update(slug, input);
    if (!post) return null;

    if (input.tagIds !== undefined) {
      await this.db.delete(postTagMappings).where(eq(postTagMappings.postId, Number(post.id)));
      if (input.tagIds.length) {
        await this.db
          .insert(postTagMappings)
          .values(input.tagIds.map((tagId) => ({ postId: Number(post.id), tagId })));
      }
    }

    if (input.categoryIds !== undefined) {
      await this.db
        .delete(postCategoryMappings)
        .where(eq(postCategoryMappings.postId, Number(post.id)));
      if (input.categoryIds.length) {
        await this.db
          .insert(postCategoryMappings)
          .values(input.categoryIds.map((categoryId) => ({ postId: Number(post.id), categoryId })));
      }
    }

    return PostMapper.toMutationResponse(1);
  }
}

export default PostService;
