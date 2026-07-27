import type { TagResponseDto } from '@/modules/tags/dtos/tags.response.dto';
import type { TagEntity } from '@/modules/tags/entities/tags.entity';

export class TagMapper {
  static toResponse(entity: TagEntity): TagResponseDto {
    return {
      id: String(entity.id),
      name: entity.name,
      slug: entity.slug,
      postCount: entity.usageCount,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toEntity(dto: Partial<TagResponseDto>): TagEntity {
    return {
      id: Number(dto.id) || 0,
      name: dto.name ?? '',
      slug: dto.slug ?? '',
      usageCount: dto.postCount ?? 0,
      createdBy: dto.createdBy ?? '',
      createdAt: dto.createdAt ?? '',
      updatedAt: dto.updatedAt ?? '',
    };
  }

  static toModel(entity: TagEntity): Record<string, unknown> {
    return { ...entity };
  }
}

export default TagMapper;
