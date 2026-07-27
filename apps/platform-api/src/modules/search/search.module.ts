import { Module } from '@rx-ted/packages-honest';
import { SearchController } from '@/modules/search/search.controller';
import { SearchService } from '@/modules/search/search.service';

@Module({
  controllers: [SearchController],
  services: [SearchService],
})
export class SearchModule {}

export default SearchModule;
