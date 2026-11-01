import { Module } from '@rx-ted/packages-honest';
import { GitHubAuthController } from '@/modules/github/github-auth.controller';
import { GitHubRepositoryController } from '@/modules/github/github-repository.controller';
import { GitHubDiscussionsController } from '@/modules/github/github-discussions.controller';
import GitHubService from '@/modules/github/github.service';

@Module({
  controllers: [
    GitHubAuthController,
    GitHubRepositoryController,
    GitHubDiscussionsController,
  ],
  services: [GitHubService],
})
class GitHubModule {}

export default GitHubModule;