import { eq, inArray } from 'drizzle-orm';
import type { DbService } from '@rx-ted/packages-honest-plugins/db';
import type { BlogActivityItem, BlogPostItem } from '@/modules/blog/dtos/blog.response.dto';
import type { BlogPostEntity } from '@/modules/blog/entities/blog.entity';
import {
  type postCore,
  type postStats,
  type users,
  postTags,
  postTagMappings,
  postCategories,
  postCategoryMappings,
} from '@/schema';

export class BlogMapper {
  static toPostItem(entity: BlogPostEntity): BlogPostItem {
    return {
      id: Number(entity.id),
      slug: entity.slug,
      title: entity.title,
      cover_image: entity.cover_image,
      is_pinned: entity.is_pinned,
      featured_weight: entity.featured_weight,
      status: entity.status,
      author_name: entity.author_name,
      author_username: entity.author_username,
      tags: entity.tags,
      categories: entity.categories,
      reading_time: entity.reading_time,
      view_count: entity.view_count,
      like_count: entity.like_count,
      comment_count: entity.comment_count,
      updated_at: entity.updated_at,
      published_at: entity.published_at,
    };
  }

  static toActivityItem(item: {
    id: number | string;
    type: string;
    title?: string | null;
    description?: string | null;
    slug?: string | null;
    created_at?: string | Date | null;
  }): BlogActivityItem {
    return {
      id: String(item.id ?? ''),
      type: String(item.type ?? 'notification') as 'post.updated' | 'notification',
      title: String(item.title ?? ''),
      description: item.description ? String(item.description) : null,
      slug: item.slug ? String(item.slug) : null,
      created_at: item.created_at
        ? item.created_at instanceof Date
          ? item.created_at.toISOString()
          : String(item.created_at)
        : new Date().toISOString(),
    };
  }

  static toModel(entity: BlogPostEntity): Record<string, unknown> {
    return { ...entity };
  }

  static mapPostRow(
    p: typeof postCore.$inferSelect,
    author: typeof users.$inferSelect | null,
    stats: typeof postStats.$inferSelect | null,
  ): BlogPostItem {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      cover_image: p.coverImage ?? null,
      is_pinned: p.isPinned ?? false,
      featured_weight: p.featuredWeight ?? 0,
      status: p.status ?? 'draft',
      author_name: author?.username ?? null,
      author_username: author?.username ?? null,
      tags: [],
      categories: [],
      reading_time: 1,
      view_count: stats?.viewCount ?? 0,
      like_count: stats?.likeCount ?? 0,
      comment_count: stats?.commentCount ?? 0,
      updated_at: p.updatedAt.toISOString(),
      published_at: p.publishedAt?.toISOString() ?? null,
    };
  }

  static async enrichPostsWithTaxonomy(
    db: DbService,
    posts: BlogPostItem[],
  ): Promise<BlogPostItem[]> {
    const postIds = posts.map((p) => Number(p.id)).filter((id) => id > 0);
    if (!postIds.length) return posts;

    const tagRows = await db
      .select({ postId: postTagMappings.postId, name: postTags.name })
      .from(postTagMappings)
      .innerJoin(postTags, eq(postTagMappings.tagId, postTags.id))
      .where(inArray(postTagMappings.postId, postIds));

    const catRows = await db
      .select({ postId: postCategoryMappings.postId, name: postCategories.name })
      .from(postCategoryMappings)
      .innerJoin(postCategories, eq(postCategoryMappings.categoryId, postCategories.id))
      .where(inArray(postCategoryMappings.postId, postIds));

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

    return posts.map((p) => ({
      ...p,
      tags: tagMap.get(Number(p.id)) ?? [],
      categories: catMap.get(Number(p.id)) ?? [],
    }));
  }
}
