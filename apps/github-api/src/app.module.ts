import { Module } from '@rx-ted/packages-honest';
import GitHubModule from '@/modules/github/github.module';

@Module({
  imports: [GitHubModule],
})
class AppModule {}

export default AppModule;