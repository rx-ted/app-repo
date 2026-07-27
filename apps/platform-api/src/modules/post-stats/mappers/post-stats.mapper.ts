import type { PostStatsResponseDto } from '@/modules/post-stats/dtos/post-stats.response.dto';
import type { PostStatsEntity } from '@/modules/post-stats/entities/post-stats.entity';

export class PostStatsMapper {
  static toResponse(entity: PostStatsEntity): PostStatsResponseDto {
    return {
      post_id: entity.post_id,
      view_count: entity.view_count,
      like_count: entity.like_count,
      comment_count: entity.comment_count,
      updated_at: entity.updated_at,
    };
  }

  static toEntity(dto: PostStatsResponseDto): PostStatsEntity {
    return {
      post_id: dto.post_id,
      view_count: dto.view_count,
      like_count: dto.like_count,
      comment_count: dto.comment_count,
      updated_at: dto.updated_at,
    };
  }

  static toModel(entity: PostStatsEntity): Record<string, unknown> {
    return { ...entity };
  }
}
