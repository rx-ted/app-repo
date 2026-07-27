import { eq, desc, count } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { postCategories } from '@/schema';
import { postCategoryMappings } from '@/schema';
import type { CategoryEntity } from '@/modules/category/entities/category.entity';
import { CACHE } from '@/constants';

export interface CategoryModuleRepository {
  list(): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  create(data: { name: string; slug: string; description?: string }): Promise<CategoryEntity>;
  update(
    id: string,
    data: { name?: string; slug?: string; description?: string },
  ): Promise<CategoryEntity | null>;
  delete(id: string): Promise<boolean>;
}

function mapToEntity(c: typeof postCategories.$inferSelect): CategoryEntity {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? null,
    postCount: c.postCount ?? 0,
    createdBy: c.createdBy,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

@Service()
class CategoryRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async listCategories(): Promise<CategoryEntity[]> {
    return cacheable(this.cache, 'categories:list', CACHE.USER_SESSION_TTL, async () => {
      const rows = await this.db
        .select({
          id: postCategories.id,
          name: postCategories.name,
          slug: postCategories.slug,
          description: postCategories.description,
          createdBy: postCategories.createdBy,
          postCount: count(postCategoryMappings.categoryId),
          createdAt: postCategories.createdAt,
          updatedAt: postCategories.updatedAt,
        })
        .from(postCategories)
        .leftJoin(postCategoryMappings, eq(postCategories.id, postCategoryMappings.categoryId))
        .groupBy(postCategories.id)
        .orderBy(desc(postCategories.updatedAt));
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description ?? null,
        createdBy: r.createdBy,
        postCount: r.postCount,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    });
  }

  async findCategoryById(id: string): Promise<CategoryEntity | null> {
    return cacheable(this.cache, `categories:${id}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await this.db
        .select()
        .from(postCategories)
        .where(eq(postCategories.id, Number(id)))
        .limit(1);
      if (!result.length) return null;
      return mapToEntity(result[0]);
    });
  }

  async findCategoryBySlug(slug: string): Promise<CategoryEntity | null> {
    return cacheable(this.cache, `categories:slug:${slug}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await this.db
        .select()
        .from(postCategories)
        .where(eq(postCategories.slug, slug))
        .limit(1);
      if (!result.length) return null;
      return mapToEntity(result[0]);
    });
  }

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    createdBy: string;
  }): Promise<CategoryEntity> {
    const now = new Date();
    const insertResult: any = await this.db.insert(postCategories).values({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );

    await this.cache.delete('categories:list');
    return this.findCategoryById(String(insertId)) as unknown as CategoryEntity;
  }

  async updateCategory(
    id: string,
    data: { name?: string; slug?: string; description?: string },
  ): Promise<CategoryEntity | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;

    await this.db
      .update(postCategories)
      .set(updateData)
      .where(eq(postCategories.id, Number(id)));

    await this.cache.delete('categories:list');
    await this.cache.delete(`categories:${id}`);
    return this.findCategoryById(id);
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await this.db.delete(postCategories).where(eq(postCategories.id, Number(id)));

    await this.cache.delete('categories:list');
    await this.cache.delete(`categories:${id}`);
    return (result[0]?.affectedRows ?? 0) > 0;
  }
}

export { CategoryRepository };
