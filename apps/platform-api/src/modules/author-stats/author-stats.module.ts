import { Module } from '@rx-ted/packages-honest';
import AuthorStatsController from '@/modules/author-stats/author-stats.controller';
import { AuthorStatsService } from '@/modules/author-stats/author-stats.service';

@Module({
  controllers: [AuthorStatsController],
  services: [AuthorStatsService],
})
export class AuthorStatsModule {}

export default AuthorStatsModule;
