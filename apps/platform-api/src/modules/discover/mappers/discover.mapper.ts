import type { DiscoveryEntity } from '@/modules/discover/entities/discover.entity';
import type { DiscoveryResponseDto } from '@/modules/discover/dtos/discover.response.dto';

export class DiscoveryMapper {
  static toResponse(entity: DiscoveryEntity): DiscoveryResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      url: entity.url,
      logo: entity.logo,
      description: entity.description,
      category: entity.category,
      status: entity.status,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
