import { Module } from '@rx-ted/packages-honest';

import TagsController from '@/modules/tags/tags.controller';
import TagsService from '@/modules/tags/tags.service';
import { TagsRepository } from '@/modules/tags/repositories/tags.repository';

@Module({
  controllers: [TagsController],
  services: [TagsService, TagsRepository],
})
class TagsModule {}

export default TagsModule;
