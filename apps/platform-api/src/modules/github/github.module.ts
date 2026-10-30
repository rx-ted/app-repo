import { Module } from '@rx-ted/packages-honest';
import { GitHubController } from '@/modules/github/github.controller';
import GitHubService from '@/modules/github/github.service';

@Module({
  controllers: [GitHubController],
  services: [GitHubService],
})
class GitHubModule {}

export default GitHubModule;
