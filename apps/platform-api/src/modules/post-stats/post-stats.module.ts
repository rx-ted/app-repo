import { Module } from '@rx-ted/packages-honest';
import PostStatsController from '@/modules/post-stats/post-stats.controller';
import { PostStatsService } from '@/modules/post-stats/post-stats.service';
import { StatsBufferService } from '@/modules/post-stats/stats-buffer.service';

@Module({
  controllers: [PostStatsController],
  services: [PostStatsService, StatsBufferService],
})
export class PostStatsModule {}

export default PostStatsModule;
