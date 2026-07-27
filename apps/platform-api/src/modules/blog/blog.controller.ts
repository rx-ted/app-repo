import { Get, Inject, Param, Controller, Ctx, UseGuards } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import BlogService from '@/modules/blog/blog.service';
import { DashboardService } from '@/modules/blog/services/dashboard.service';
import { AuthorService } from '@/modules/blog/services/author.service';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import {
  BlogDashboardResponseSchema,
  BlogHomeResponseSchema,
  BlogAuthorResponseSchema,
} from '@/modules/blog/dtos/blog.response.dto';

@UseGuards(AuthGuard)
@Controller('blog', {
  tag: { name: 'Blog', description: '博客相关接口' },
})
class BlogController {
  constructor(
    @Inject(BlogService) private readonly blogService: BlogService,
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
    @Inject(AuthorService) private readonly authorService: AuthorService,
  ) {}

  @Get('dashboard', {
    apiDoc: {
      summary: '获取控制台数据',
      tags: ['Blog'],
      responses: {
        200: {
          description: '控制台信息',
          schema: BlogDashboardResponseSchema,
        },
      },
    },
  })
  async getDashboard(@Ctx() c: Context) {
    const user = c.get('user') as { userId: string } | undefined;
    return this.dashboardService.getDashboard(user?.userId);
  }

  @Public()
  @Get('summary', {
    apiDoc: {
      summary: '获取博客摘要',
      tags: ['Blog'],
      responses: {
        200: {
          description: '博客摘要信息',
          schema: BlogHomeResponseSchema,
        },
      },
    },
  })
  async getSummary() {
    return this.blogService.getSummary();
  }

  @Get('me', {
    apiDoc: {
      summary: '获取我的博客',
      tags: ['Blog'],
      responses: {
        200: {
          description: '我的博客信息',
          schema: BlogDashboardResponseSchema,
        },
      },
    },
  })
  async getMine(@Ctx() c: Context) {
    const user = c.get('user') as { userId: string } | undefined;
    return this.dashboardService.getMine(user?.userId);
  }

  @Public()
  @Get('by-username/:username', {
    apiDoc: {
      summary: '根据用户名获取博客',
      tags: ['Blog'],
      request: {
        params: z.object({ username: z.string() }),
      },
      responses: {
        200: {
          description: '博客信息',
          schema: BlogAuthorResponseSchema,
        },
      },
    },
  })
  async getByUsername(@Param('username') username: string) {
    return this.authorService.getByUsername(username);
  }

  @Public()
  @Get('authors/:username', {
    apiDoc: {
      summary: '根据用户名获取作者信息',
      tags: ['Blog'],
      request: {
        params: z.object({ username: z.string() }),
      },
      responses: {
        200: {
          description: '作者信息',
          schema: BlogAuthorResponseSchema,
        },
      },
    },
  })
  async getAuthorByUsername(@Param('username') username: string) {
    return this.authorService.getByUsername(username);
  }
}

export default BlogController;
