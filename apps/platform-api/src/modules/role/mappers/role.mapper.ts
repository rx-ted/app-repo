import type { RoleResponseDto } from '@/modules/role/dtos/role.response.dto';
import type { RoleEntity } from '@/modules/role/entities/role.entity';

export class RoleMapper {
  static toResponse(entity: RoleEntity): RoleResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }

  static toEntity(dto: RoleResponseDto): RoleEntity {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      created_at: dto.created_at,
      updated_at: dto.updated_at,
    };
  }

  static toModel(entity: RoleEntity): Record<string, unknown> {
    return { ...entity };
  }
}
