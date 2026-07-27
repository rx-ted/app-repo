import { Module } from '@rx-ted/packages-honest';
import DiscoverController from '@/modules/discover/discover.controller';
import DiscoverService from '@/modules/discover/discover.service';

@Module({
  controllers: [DiscoverController],
  services: [DiscoverService],
})
class DiscoverModule {}

export default DiscoverModule;
