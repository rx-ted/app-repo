import {
  and,
  eq,
  count,
  desc,
  asc,
  like,
  notLike,
  sql,
  not,
  inArray,
  gt,
  lt,
  or,
} from 'drizzle-orm';
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
import { CacheService, cacheable, versionedCacheKey } from '@rx-ted/packages-honest-plugins/cache';
import { CacheInvalidationService } from '@/modules/post/services/cache-invalidation.service';

function encodePostCursor(createdAt: Date | string, id: number): string | null {
  try {
    const iso =
      createdAt instanceof Date ? createdAt.toISOString() : new Date(createdAt).toISOString();
    return btoa(`${iso}|${id}`);
  } catch {
    return null;
  }
}

function decodePostCursor(cursor?: string): { createdAt: Date; id: number } | null {
  if (!cursor) return null;
  try {
    const [iso, id] = atob(cursor).split('|');
    const createdAt = new Date(iso);
    const parsedId = Number(id);
    if (Number.isNaN(createdAt.getTime()) || !Number.isInteger(parsedId)) return null;
    return { createdAt, id: parsedId };
  } catch {
    return null;
  }
}

function deriveLang(slug: string): 'en' | 'zh-CN' {
  return slug.endsWith('.zh') ? 'zh-CN' : 'en';
}

function extractTranslationSlug(slug: string, contentMd: string): string | null {
  const isZh = deriveLang(slug) === 'zh-CN';
  for (const match of contentMd.matchAll(/\]\(\/posts\/([\w.-]+?)\)/g)) {
    const link = match[1];
    if (link.endsWith('.zh') !== isZh) return link;
  }
  return null;
}

function mapToPostListEntity(
  p: typeof postCore.$inferSelect,
  content: typeof postContent.$inferSelect | null,
  stats: typeof postStats.$inferSelect | null,
  author: typeof users.$inferSelect | null,
): PostListEntity {
  return {
    id: String(p.id),
    slug: p.slug,
    lang: deriveLang(p.slug),
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
    lang: deriveLang(p.slug),
    translationSlug: extractTranslationSlug(p.slug, content?.contentMd ?? ''),
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
      lang?: 'en' | 'zh-CN';
      excludeSlugs?: string[];
      cursor?: string;
    },
  ): Promise<{ list: PostListEntity[]; total: number; nextCursor: string | null }> {
    const excludeSlugs = [...new Set(options?.excludeSlugs ?? [])].sort();
    const cursor = decodePostCursor(options?.cursor);
    const cacheKey = await versionedCacheKey(
      this.cache,
      'post:list',
      `${page}:${pageSize}:${options?.keyword ?? ''}:${options?.tag ?? ''}:${options?.category ?? ''}:${options?.author ?? ''}:${options?.lang ?? ''}:${excludeSlugs.join(',')}:${options?.cursor ?? ''}`,
    );
    return cacheable(this.cache, cacheKey, 60, async () => {
      const baseConditions: ReturnType<typeof eq>[] = [eq(postCore.status, 'published')];

      if (options?.lang) {
        baseConditions.push(
          options.lang === 'zh-CN' ? like(postCore.slug, '%.zh') : notLike(postCore.slug, '%.zh'),
        );
      }

      if (options?.keyword) {
        baseConditions.push(like(postCore.title, `%${options.keyword}%`));
      }
      if (excludeSlugs.length) {
        baseConditions.push(not(inArray(postCore.slug, excludeSlugs)));
      }
      if (options?.tag) {
        baseConditions.push(
          sql`${postCore.id} IN (SELECT ${postTagMappings.postId} FROM ${postTagMappings} INNER JOIN ${postTags} ON ${postTagMappings.tagId} = ${postTags.id} WHERE ${postTags.slug} = ${options.tag})`,
        );
      }
      if (options?.category) {
        baseConditions.push(
          sql`${postCore.id} IN (SELECT ${postCategoryMappings.postId} FROM ${postCategoryMappings} INNER JOIN ${postCategories} ON ${postCategoryMappings.categoryId} = ${postCategories.id} WHERE ${postCategories.slug} = ${options.category})`,
        );
      }
      if (options?.author) {
        baseConditions.push(
          sql`${postCore.userId} IN (SELECT ${users.id} FROM ${users} WHERE ${users.username} = ${options.author})`,
        );
      }

      const listConditions = [...baseConditions];
      if (cursor) {
        listConditions.push(
          or(
            lt(postCore.createdAt, cursor.createdAt),
            and(eq(postCore.createdAt, cursor.createdAt), lt(postCore.id, cursor.id)),
          ) as any,
        );
      }

      const [totalResult] = await this.db
        .select({ total: count() })
        .from(postCore)
        .where(and(...baseConditions));
      const total = totalResult.total;

      const rows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(users, eq(postCore.userId, users.id))
        .leftJoin(postContent, eq(postCore.id, postContent.postId))
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(and(...listConditions))
        .orderBy(desc(postCore.createdAt), desc(postCore.id))
        .limit(pageSize + 1)
        .offset(cursor ? 0 : computeOffset({ page, pageSize }));
      const hasMore = rows.length > pageSize;
      const pageRows = rows.slice(0, pageSize);
      const nextCursor =
        hasMore && pageRows.length
          ? encodePostCursor(
              pageRows[pageRows.length - 1].postCore.createdAt,
              pageRows[pageRows.length - 1].postCore.id,
            )
          : null;

      return {
        list: pageRows.map((r) =>
          mapToPostListEntity(r.postCore, r.postContent, r.postStats, r.users),
        ),
        total,
        nextCursor,
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
    const currentDate = new Date(current.createdAt);
    const sameLang =
      deriveLang(current.slug) === 'zh-CN'
        ? like(postCore.slug, '%.zh')
        : notLike(postCore.slug, '%.zh');

    const [prevRow] = await this.db
      .select({ slug: postCore.slug, title: postCore.title })
      .from(postCore)
      .where(
        and(
          eq(postCore.status, 'published'),
          sameLang,
          or(
            lt(postCore.createdAt, currentDate),
            and(eq(postCore.createdAt, currentDate), lt(postCore.id, currentId)),
          ),
        ),
      )
      .orderBy(desc(postCore.createdAt), desc(postCore.id))
      .limit(1);

    const [nextRow] = await this.db
      .select({ slug: postCore.slug, title: postCore.title })
      .from(postCore)
      .where(
        and(
          eq(postCore.status, 'published'),
          sameLang,
          or(
            gt(postCore.createdAt, currentDate),
            and(eq(postCore.createdAt, currentDate), gt(postCore.id, currentId)),
          ),
        ),
      )
      .orderBy(asc(postCore.createdAt), asc(postCore.id))
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

  async create(
    data: Omit<PostEntity, 'id' | 'createdAt' | 'updatedAt'> & {
      tagIds?: number[];
      categoryIds?: number[];
    },
  ): Promise<PostEntity> {
    const now = new Date();
    let createdId!: number;

    const runTransaction =
      typeof this.db.transaction === 'function'
        ? this.db.transaction.bind(this.db)
        : async (fn: (tx: any) => Promise<void>) => fn(this.db);
    await runTransaction(async (tx: any) => {
      await tx.insert(postCore).values({
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

      const [created] = await tx
        .select()
        .from(postCore)
        .where(eq(postCore.slug, data.slug))
        .limit(1);
      if (!created) throw new Error('Failed to create post');
      createdId = Number(created.id);

      if (data.contentMd) {
        await tx.insert(postContent).values({
          postId: created.id,
          contentMd: data.contentMd,
        });
      }

      if (data.tagIds?.length) {
        await tx
          .insert(postTagMappings)
          .values(data.tagIds.map((tagId) => ({ postId: created.id, tagId })));
      }
      if (data.categoryIds?.length) {
        await tx
          .insert(postCategoryMappings)
          .values(data.categoryIds.map((categoryId) => ({ postId: created.id, categoryId })));
      }
    });

    await this.cacheInvalidator.invalidatePostRelated(data.slug);
    return (await this.findById(String(createdId)))!;
  }

  async update(
    slug: string,
    data: Partial<PostEntity> & { tagIds?: number[]; categoryIds?: number[] },
  ): Promise<PostEntity | null> {
    const existing = await this.db.select().from(postCore).where(eq(postCore.slug, slug)).limit(1);
    if (!existing.length) return null;

    const postId = existing[0].id;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    const runTransaction =
      typeof this.db.transaction === 'function'
        ? this.db.transaction.bind(this.db)
        : async (fn: (tx: any) => Promise<void>) => fn(this.db);
    await runTransaction(async (tx: any) => {
      await tx.update(postCore).set(updateData).where(eq(postCore.slug, slug));

      if (data.contentMd !== undefined) {
        const existingContent = await tx
          .select()
          .from(postContent)
          .where(eq(postContent.postId, postId))
          .limit(1);
        if (existingContent.length) {
          await tx
            .update(postContent)
            .set({ contentMd: data.contentMd })
            .where(eq(postContent.postId, postId));
        } else {
          await tx.insert(postContent).values({ postId, contentMd: data.contentMd });
        }
      }

      if (data.tagIds !== undefined) {
        await tx.delete(postTagMappings).where(eq(postTagMappings.postId, postId));
        if (data.tagIds.length) {
          await tx.insert(postTagMappings).values(data.tagIds.map((tagId) => ({ postId, tagId })));
        }
      }

      if (data.categoryIds !== undefined) {
        await tx.delete(postCategoryMappings).where(eq(postCategoryMappings.postId, postId));
        if (data.categoryIds.length) {
          await tx
            .insert(postCategoryMappings)
            .values(data.categoryIds.map((categoryId) => ({ postId, categoryId })));
        }
      }
    });

    await this.cacheInvalidator.invalidatePostRelated(slug);
    return this.findBySlug(slug);
  }
}

export { PostRepository };
