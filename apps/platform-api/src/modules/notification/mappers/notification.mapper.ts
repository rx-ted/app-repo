import type {
  NotificationResponseDto,
  NotificationSummaryResponseDto,
} from '@/modules/notification/dtos/notification.response.dto';
import type { NotificationEntity } from '@/modules/notification/entities/notification.entity';

export class NotificationMapper {
  static toResponse(entity: NotificationEntity): NotificationResponseDto {
    return {
      id: entity.id,
      type: entity.type,
      title: entity.title,
      content: entity.content,
      is_read: entity.is_read,
      created_at: entity.created_at,
    };
  }

  static toSummary(
    unreadCount: number,
    recent: NotificationEntity[],
  ): NotificationSummaryResponseDto {
    return {
      unreadCount,
      recent: recent.map((n) => NotificationMapper.toResponse(n)),
    };
  }

  static toEntity(dto: NotificationResponseDto): NotificationEntity {
    return {
      id: dto.id,
      type: dto.type,
      title: dto.title,
      content: dto.content,
      is_read: dto.is_read,
      user_id: '',
      created_at: dto.created_at,
      updated_at: dto.created_at,
    };
  }

  static toModel(entity: NotificationEntity): Record<string, unknown> {
    return { ...entity };
  }
}
