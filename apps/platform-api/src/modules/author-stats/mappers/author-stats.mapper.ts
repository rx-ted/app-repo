import type { AuthorStatsResponseDto } from '@/modules/author-stats/dtos/author-stats.response.dto';
import type { AuthorStatsEntity } from '@/modules/author-stats/entities/author-stats.entity';

export class AuthorStatsMapper {
  static toResponse(entity: AuthorStatsEntity): AuthorStatsResponseDto {
    return {
      user_id: entity.user_id,
      post_count: entity.post_count,
      view_count: entity.view_count,
      like_count: entity.like_count,
      comment_count: entity.comment_count,
      tags: entity.tags,
      categories: entity.categories,
      last_updated: entity.last_updated,
    };
  }

  static toEntity(dto: AuthorStatsResponseDto): AuthorStatsEntity {
    return {
      user_id: dto.user_id,
      post_count: dto.post_count,
      view_count: dto.view_count,
      like_count: dto.like_count,
      comment_count: dto.comment_count,
      tags: dto.tags,
      categories: dto.categories,
      last_updated: dto.last_updated,
    };
  }

  static toModel(entity: AuthorStatsEntity): Record<string, unknown> {
    return { ...entity };
  }
}
