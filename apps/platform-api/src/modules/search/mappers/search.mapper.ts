import type { SearchPostItem, SearchResponseDto } from '@/modules/search/dtos/search.response.dto';
import type { SearchEntity, SearchPostEntity } from '@/modules/search/entities/search.entity';

export class SearchMapper {
  static toResponse(entity: SearchEntity): SearchResponseDto {
    return {
      posts: { list: [], total: 0 },
      tags: { list: [], total: 0 },
      categories: { list: [], total: 0 },
      author: { list: [], total: 0 },
    };
  }

  static toPostItem(entity: SearchPostEntity): SearchPostItem {
    return {
      id: entity.id,
      slug: entity.slug,
      title: entity.title,
      excerpt: '',
      cover_image: entity.cover_image,
      is_pinned: entity.is_pinned,
      featured_weight: entity.featured_weight,
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

  static toModel(entity: SearchEntity): Record<string, unknown> {
    return { ...entity };
  }
}
