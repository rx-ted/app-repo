import { Controller, Get, Inject, Param, Post } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { PostStatsEntitySchema } from '@/modules/post-stats/entities/post-stats.entity';
import PostStatsService from '@/modules/post-stats/post-stats.service';

@Controller('post-stats', {
  tag: { name: 'PostStats', description: '文章统计相关接口' },
})
class PostStatsController {
  constructor(@Inject(PostStatsService) private readonly postStatsService: PostStatsService) {}

  @Get(':postId', {
    apiDoc: {
      summary: '根据文章ID获取统计',
      tags: ['PostStats'],
      request: {
        params: z.object({ postId: z.string() }),
      },
      responses: {
        200: {
          description: '文章统计信息',
          schema: PostStatsEntitySchema,
        },
      },
    },
  })
  async getByPostId(@Param('postId') postId: string) {
    return this.postStatsService.getByPostId(postId);
  }

  @Post(':postId/views', {
    apiDoc: {
      summary: '记录文章浏览',
      tags: ['PostStats'],
      request: {
        params: z.object({ postId: z.string() }),
      },
      responses: {
        200: {
          description: '记录成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async recordView(@Param('postId') postId: string) {
    return this.postStatsService.recordView(postId);
  }

  @Post(':postId/likes', {
    apiDoc: {
      summary: '记录文章点赞',
      tags: ['PostStats'],
      request: {
        params: z.object({ postId: z.string() }),
      },
      responses: {
        200: {
          description: '记录成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async recordLike(@Param('postId') postId: string) {
    return this.postStatsService.recordLike(postId);
  }

  @Post(':postId/comments', {
    apiDoc: {
      summary: '记录文章评论',
      tags: ['PostStats'],
      request: {
        params: z.object({ postId: z.string() }),
      },
      responses: {
        200: {
          description: '记录成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async recordComment(@Param('postId') postId: string) {
    return this.postStatsService.recordComment(postId);
  }

  @Post('flush', {
    apiDoc: {
      summary: '将缓存的统计批量刷入数据库',
      tags: ['PostStats'],
      responses: {
        200: {
          description: '刷新结果',
          schema: z.object({ flushed: z.number() }),
        },
      },
    },
  })
  async flushAll() {
    return this.postStatsService.flushAll();
  }

  @Post('refresh', {
    apiDoc: {
      summary: '刷新所有文章统计',
      tags: ['PostStats'],
      responses: {
        200: {
          description: '刷新结果',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async refreshAll() {
    return this.postStatsService.refreshAll();
  }
}

export default PostStatsController;
