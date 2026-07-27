import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, count } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { postTags, postTagMappings } from '@/schema';
import type { TagEntity } from '@/modules/tags/entities/tags.entity';
import { CACHE } from '@/constants';

function mapToEntity(t: typeof postTags.$inferSelect): TagEntity {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    usageCount: t.usageCount,
    createdBy: t.createdBy,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

@Service()
export class TagsRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async list(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{ tags: TagEntity[]; total: number }> {
    const cacheKey = `tags:list:${page}:${pageSize}`;
    return cacheable(this.cache, cacheKey, CACHE.TAGS_LIST_TTL, async () => {
      const offset = (page - 1) * pageSize;

      const [countResult] = await this.db.select({ count: count() }).from(postTags);

      const rows = await this.db
        .select({
          id: postTags.id,
          name: postTags.name,
          slug: postTags.slug,
          createdBy: postTags.createdBy,
          usageCount: count(postTagMappings.tagId),
          createdAt: postTags.createdAt,
          updatedAt: postTags.updatedAt,
        })
        .from(postTags)
        .leftJoin(postTagMappings, eq(postTags.id, postTagMappings.tagId))
        .groupBy(postTags.id)
        .orderBy(desc(postTags.updatedAt))
        .limit(pageSize)
        .offset(offset);

      return {
        tags: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          createdBy: r.createdBy,
          usageCount: r.usageCount,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        total: countResult?.count ?? 0,
      };
    });
  }

  async findById(id: string): Promise<TagEntity | null> {
    return cacheable(this.cache, `tags:${id}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await this.db
        .select()
        .from(postTags)
        .where(eq(postTags.id, Number(id)))
        .limit(1);
      if (!result.length) return null;
      return mapToEntity(result[0]);
    });
  }

  async create(data: { name: string; slug: string; createdBy: string }): Promise<TagEntity> {
    const now = new Date();
    const insertResult: any = await this.db.insert(postTags).values({
      name: data.name,
      slug: data.slug,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );

    const [created] = await this.db
      .select()
      .from(postTags)
      .where(eq(postTags.id, insertId))
      .limit(1);

    await this.clearAllPageCaches();
    return mapToEntity(created);
  }

  async update(id: string, data: { name?: string; slug?: string }): Promise<TagEntity | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;

    await this.db
      .update(postTags)
      .set(updateData)
      .where(eq(postTags.id, Number(id)));

    await this.clearAllPageCaches();
    await this.cache.delete(`tags:${id}`);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.delete(postTags).where(eq(postTags.id, Number(id)));

    await this.clearAllPageCaches();
    await this.cache.delete(`tags:${id}`);
    return (result[0]?.affectedRows ?? 0) > 0;
  }

  private async clearAllPageCaches(): Promise<void> {
    for (let page = 1; page <= 10; page++) {
      for (const pageSize of [10, 20, 50]) {
        await this.cache.delete(`tags:list:${page}:${pageSize}`);
      }
    }
  }
}
