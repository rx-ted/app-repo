import { and, eq, count, desc, like, sql, not, inArray } from 'drizzle-orm';
import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { computeOffset } from '@/common/utils/pagination';
import {
  postCore,
  postContent,
  postStats,
  postTags,
  postTagMappings,
  postCategories,
  postCategoryMappings,
  users,
} from '@/schema';
import type { PostEntity, PostListEntity } from '@/modules/post/entities/post.entity';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { CacheInvalidationService } from '@/modules/post/services/cache-invalidation.service';

function mapToPostListEntity(
  p: typeof postCore.$inferSelect,
  content: typeof postContent.$inferSelect | null,
  stats: typeof postStats.$inferSelect | null,
  author: typeof users.$inferSelect | null,
): PostListEntity {
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    coverImage: p.coverImage ?? null,
    status: p.status ?? 'draft',
    authorName: author?.username ?? '',
    authorUsername: author?.username ?? '',
    tags: [],
    tagNames: [],
    categories: [],
    categoryNames: [],
    readingTime: Math.max(1, Math.ceil((content?.contentMd?.length ?? 0) / 1000)),
    viewCount: stats?.viewCount ?? 0,
    likeCount: stats?.likeCount ?? 0,
    commentCount: stats?.commentCount ?? 0,
    createdAt: p.createdAt.toISOString(),
  };
}

function mapToPostEntity(
  p: typeof postCore.$inferSelect,
  content: typeof postContent.$inferSelect | null,
  stats: typeof postStats.$inferSelect | null,
  author: typeof users.$inferSelect | null,
): PostEntity {
  return {
    id: String(p.id),
    slug: p.slug,
    title: p.title,
    contentMd: content?.contentMd ?? '',
    contentHtml: content?.contentHtml ?? null,
    coverImage: p.coverImage ?? null,
    isPinned: p.isPinned ?? false,
    featuredWeight: p.featuredWeight ?? 0,
    status: p.status ?? 'draft',
    visibility: p.visibility ?? 'public',
    allowComment: p.allowComment ?? true,
    authorId: p.userId,
    authorName: author?.username ?? '',
    authorUsername: author?.username ?? '',
    tags: [],
    tagNames: [],
    categories: [],
    categoryNames: [],
    readingTime: Math.max(1, Math.ceil((content?.contentMd?.length ?? 0) / 1000)),
    viewCount: stats?.viewCount ?? 0,
    likeCount: stats?.likeCount ?? 0,
    commentCount: stats?.commentCount ?? 0,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdBy: p.createdBy ?? null,
    updatedBy: p.updatedBy ?? null,
  };
}

@Service()
class PostRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(CacheInvalidationService) private cacheInvalidator: CacheInvalidationService,
  ) {}

  async list(
    page: number,
    pageSize: number,
    options?: {
      keyword?: string;
      tag?: string;
      category?: string;
      author?: string;
      excludeSlugs?: string[];
    },
  ): Promise<{ list: PostListEntity[]; total: number }> {
    const cacheKey = `post:list:${page}:${pageSize}:${options?.keyword ?? ''}:${options?.tag ?? ''}:${options?.category ?? ''}:${options?.author ?? ''}`;
    return cacheable(this.cache, cacheKey, 60, async () => {
      const conditions: ReturnType<typeof eq>[] = [eq(postCore.status, 'published')];

      if (options?.keyword) {
        conditions.push(like(postCore.title, `%${options.keyword}%`));
      }
      if (options?.excludeSlugs?.length) {
        conditions.push(not(inArray(postCore.slug, options.excludeSlugs)));
      }
      if (options?.tag) {
        conditions.push(
          sql`${postCore.id} IN (SELECT ${postTagMappings.postId} FROM ${postTagMappings} INNER JOIN ${postTags} ON ${postTagMappings.tagId} = ${postTags.id} WHERE ${postTags.slug} = ${options.tag})`,
        );
      }
      if (options?.category) {
        conditions.push(
          sql`${postCore.id} IN (SELECT ${postCategoryMappings.postId} FROM ${postCategoryMappings} INNER JOIN ${postCategories} ON ${postCategoryMappings.categoryId} = ${postCategories.id} WHERE ${postCategories.slug} = ${options.category})`,
        );
      }
      if (options?.author) {
        conditions.push(
          sql`${postCore.userId} IN (SELECT ${users.id} FROM ${users} WHERE ${users.username} = ${options.author})`,
        );
      }

      const [totalResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(and(...conditions));
      const total = totalResult.total;

      const result: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postContent, eq(postCore.id, postContent.postId))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(and(...conditions))
        .orderBy(desc(postCore.createdAt))
        .limit(pageSize)
        .offset(computeOffset({ page, pageSize }));
      return {
        list: result.map((r) =>
          mapToPostListEntity(r.postCore, r.postContent, r.postStats, r.users),
        ),
        total,
      };
    });
  }

  async findAdjacent(slug: string): Promise<{
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  }> {
    const current = await this.findBySlug(slug);
    if (!current) return { prev: null, next: null };
    const currentId = Number(current.id);

    const [prevRow] = await this.db
      .select({ slug: postCore.slug, title: postCore.title })
      .from(postCore)
      .where(and(eq(postCore.status, 'published'), sql`${postCore.id} < ${currentId}`))
      .orderBy(desc(postCore.id))
      .limit(1);

    const [nextRow] = await this.db
      .select({ slug: postCore.slug, title: postCore.title })
      .from(postCore)
      .where(and(eq(postCore.status, 'published'), sql`${postCore.id} > ${currentId}`))
      .orderBy(postCore.id)
      .limit(1);

    return {
      prev: prevRow ?? null,
      next: nextRow ?? null,
    };
  }

  async findBySlug(slug: string): Promise<PostEntity | null> {
    return cacheable(this.cache, `post:slug:${slug}`, 120, async () => {
      const result: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postContent, eq(postCore.id, postContent.postId))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(eq(postCore.slug, slug))
        .limit(1);
      if (!result.length) return null;
      const r = result[0];
      return mapToPostEntity(r.postCore, r.postContent, r.postStats, r.users);
    });
  }

  async findById(id: string): Promise<PostEntity | null> {
    return cacheable(this.cache, `post:id:${id}`, 120, async () => {
      const result: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postContent, eq(postCore.id, postContent.postId))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(eq(postCore.id, Number(id)))
        .limit(1);
      if (!result.length) return null;
      const r = result[0];
      return mapToPostEntity(r.postCore, r.postContent, r.postStats, r.users);
    });
  }

  async create(data: Omit<PostEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<PostEntity> {
    const now = new Date();
    await this.db.insert(postCore).values({
      userId: data.authorId,
      slug: data.slug,
      title: data.title,
      coverImage: data.coverImage ?? null,
      isPinned: data.isPinned ?? false,
      featuredWeight: data.featuredWeight ?? 0,
      status: data.status ?? 'draft',
      visibility: data.visibility ?? 'public',
      allowComment: data.allowComment ?? true,
      createdAt: now,
      updatedAt: now,
      publishedAt: data.status === 'published' ? now : null,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
    });

    const [created] = await this.db
      .select()
      .from(postCore)
      .where(eq(postCore.slug, data.slug))
      .limit(1);
    if (!created) throw new Error('Failed to create post');

    if (data.contentMd) {
      await this.db.insert(postContent).values({
        postId: created.id,
        contentMd: data.contentMd,
      });
    }

    await this.cacheInvalidator.invalidatePostRelated(data.slug);
    return (await this.findById(String(created.id)))!;
  }

  async update(slug: string, data: Partial<PostEntity>): Promise<PostEntity | null> {
    const existing = await this.db.select().from(postCore).where(eq(postCore.slug, slug)).limit(1);
    if (!existing.length) return null;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    await this.db.update(postCore).set(updateData).where(eq(postCore.slug, slug));

    if (data.contentMd !== undefined) {
      const existingContent = await this.db
        .select()
        .from(postContent)
        .where(eq(postContent.postId, existing[0].id))
        .limit(1);
      if (existingContent.length) {
        await this.db
          .update(postContent)
          .set({ contentMd: data.contentMd })
          .where(eq(postContent.postId, existing[0].id));
      } else {
        await this.db
          .insert(postContent)
          .values({ postId: existing[0].id, contentMd: data.contentMd });
      }
    }

    await this.cacheInvalidator.invalidatePostRelated(slug);
    return this.findBySlug(slug);
  }
}

export { PostRepository };
