import type { PermissionRequestResponseDto } from '@/modules/permission-request/dtos/permission-request.response.dto';
import type { PermissionRequestEntity } from '@/modules/permission-request/entities/permission-request.entity';

export class PermissionRequestMapper {
  static toResponse(
    entity: PermissionRequestEntity & { permission_ids?: number[] },
  ): PermissionRequestResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      permission_ids: entity.permission_ids ?? [],
      request_type: entity.request_type,
      target_user_id: entity.target_user_id,
      path: entity.path,
      scope: entity.scope,
      entity_type: entity.entity_type,
      entity_data: entity.entity_data,
      status: entity.status,
      reason: entity.reason,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  static toEntity(dto: PermissionRequestResponseDto): PermissionRequestEntity {
    return {
      id: dto.id,
      user_id: dto.user_id,
      permission_code: '',
      request_type: dto.request_type,
      target_user_id: dto.target_user_id,
      path: dto.path,
      scope: dto.scope,
      entity_type: dto.entity_type,
      entity_data: dto.entity_data,
      expires_at: null,
      status: dto.status,
      reason: dto.reason,
      created_at: dto.created_at,
      updated_at: dto.updated_at,
    };
  }

  static toModel(entity: PermissionRequestEntity): Record<string, unknown> {
    return { ...entity };
  }
}

export default PermissionRequestMapper;
