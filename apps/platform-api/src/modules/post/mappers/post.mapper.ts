import type { PostEntity, PostListEntity } from '@/modules/post/entities/post.entity';

export class PostMapper {
  static toCardResponse(entity: PostListEntity) {
    return {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      cover_image: entity.coverImage ?? null,
      status: entity.status,
      author_name: entity.authorName,
      author_username: entity.authorUsername,
      tags: entity.tags ?? [],
      tag_names: entity.tagNames ?? [],
      categories: entity.categories ?? [],
      category_names: entity.categoryNames ?? [],
      reading_time: entity.readingTime,
      view_count: entity.viewCount,
      like_count: entity.likeCount,
      comment_count: entity.commentCount,
      updated_at: entity.createdAt,
    };
  }

  static toDetailResponse(entity: PostEntity) {
    return {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      content_md: entity.contentMd,
      content_html: entity.contentHtml ?? null,
      cover_image: entity.coverImage ?? null,
      is_pinned: entity.isPinned,
      featured_weight: entity.featuredWeight,
      status: entity.status,
      visibility: entity.visibility,
      allow_comment: entity.allowComment,
      author_name: entity.authorName,
      author_username: entity.authorUsername,
      tags: entity.tags ?? [],
      tag_names: entity.tagNames ?? [],
      categories: entity.categories ?? [],
      category_names: entity.categoryNames ?? [],
      reading_time: entity.readingTime,
      view_count: entity.viewCount,
      like_count: entity.likeCount,
      comment_count: entity.commentCount,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  static toMutationResponse(affectedRows: number, insertId?: string) {
    return {
      affectedRows,
      ...(insertId ? { insertId } : {}),
      rows: [],
    };
  }
}

export default PostMapper;
