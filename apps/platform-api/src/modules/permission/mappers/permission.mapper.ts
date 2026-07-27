import type { PermissionResponseDto } from '@/modules/permission/dtos/permission.response.dto';
import type { PermissionEntity } from '@/modules/permission/entities/permission.entity';

export class PermissionMapper {
  static toResponse(entity: PermissionEntity): PermissionResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      created_at: entity.created_at,
    };
  }

  static toEntity(dto: PermissionResponseDto): PermissionEntity {
    return {
      id: dto.id,
      name: dto.name,
      code: dto.code,
      description: dto.description,
      created_at: dto.created_at,
    };
  }

  static toModel(entity: PermissionEntity): Record<string, unknown> {
    return { ...entity };
  }
}
