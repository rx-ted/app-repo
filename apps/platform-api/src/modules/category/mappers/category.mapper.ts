import type { CategoryEntity } from '@/modules/category/entities/category.entity';

export class CategoryMapper {
  static toResponse(entity: CategoryEntity) {
    return { ...entity };
  }
}

export default CategoryMapper;
