import type { AnnouncementResponseDto } from '@/modules/announcement/dtos/announcement.response.dto';
import type { AnnouncementEntity } from '@/modules/announcement/entities/announcement.entity';

export class AnnouncementMapper {
  static toResponse(entity: AnnouncementEntity): AnnouncementResponseDto {
    return {
      id: entity.id,
      title: entity.title,
      content: entity.content,
      slot: entity.slot,
      audiences: entity.audiences,
      original: entity.payload_json ? JSON.parse(entity.payload_json) : null,
      translated: entity.translated_payload_json
        ? JSON.parse(entity.translated_payload_json)
        : null,
      created_by: entity.created_by,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  static toEntity(dto: Partial<AnnouncementResponseDto>): AnnouncementEntity {
    return {
      id: dto.id ?? '',
      title: dto.title ?? '',
      content: dto.content ?? '',
      slot: dto.slot ?? 'footer',
      audiences: dto.audiences ?? [],
      payload_json: dto.original ? JSON.stringify(dto.original) : null,
      translated_payload_json: dto.translated ? JSON.stringify(dto.translated) : null,
      created_by: dto.created_by ?? '',
      updated_by: dto.created_by ?? '',
      created_at: dto.created_at ?? '',
      updated_at: dto.updated_at ?? '',
    };
  }

  static toModel(entity: AnnouncementEntity): Record<string, unknown> {
    return { ...entity };
  }
}
