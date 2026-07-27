import { Get, Inject, Param, Controller } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthorStatsEntitySchema } from '@/modules/author-stats/entities/author-stats.entity';
import AuthorStatsService from '@/modules/author-stats/author-stats.service';

@Controller('author-stats', {
  tag: { name: 'AuthorStats', description: '作者统计相关接口' },
})
class AuthorStatsController {
  constructor(
    @Inject(AuthorStatsService) private readonly authorStatsService: AuthorStatsService,
  ) {}

  @Get(':identifier', {
    apiDoc: {
      summary: '获取作者统计',
      tags: ['AuthorStats'],
      request: {
        params: z.object({ identifier: z.string() }),
      },
      responses: {
        200: {
          description: '作者统计信息',
          schema: AuthorStatsEntitySchema,
        },
      },
    },
  })
  async getStats(@Param('identifier') identifier: string) {
    return this.authorStatsService.getStats(identifier);
  }
}

export default AuthorStatsController;
