import { Module } from '@rx-ted/packages-honest';

import CategoryController from '@/modules/category/category.controller';
import CategoryService from '@/modules/category/category.service';
import { CategoryRepository } from '@/modules/category/repositories/category.repository';

@Module({
  controllers: [CategoryController],
  services: [CategoryService, CategoryRepository],
})
class CategoryModule {}

export default CategoryModule;
