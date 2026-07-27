import type { AuditResponseDto } from '@/modules/audit/dtos/audit.response.dto';
import type { AuditEntity } from '@/modules/audit/entities/audit.entity';

export class AuditMapper {
  static toResponse(entity: AuditEntity): AuditResponseDto {
    return {
      id: entity.id,
      actor_id: entity.actor_id,
      actor_role: entity.actor_role,
      action: entity.action,
      target_type: entity.target_type,
      target_id: entity.target_id,
      status: entity.status,
      message: entity.message,
      meta: entity.meta,
      created_at: entity.created_at,
    };
  }

  static toEntity(dto: AuditResponseDto): AuditEntity {
    return {
      id: dto.id,
      actor_id: dto.actor_id,
      actor_role: dto.actor_role,
      action: dto.action,
      target_type: dto.target_type,
      target_id: dto.target_id,
      status: dto.status,
      message: dto.message,
      meta: dto.meta,
      created_at: dto.created_at,
    };
  }

  static toModel(entity: AuditEntity): Record<string, unknown> {
    return { ...entity };
  }
}
