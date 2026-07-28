import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Var,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import { TagEntitySchema } from '@/modules/tags/entities/tags.entity';
import {
  CreateTagSchema,
  TagsListQuerySchema,
  UpdateTagSchema,
} from '@/modules/tags/dtos/tags.schema';
import TagsService from '@/modules/tags/tags.service';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';

@Controller('tags', {
  tag: { name: 'Tags', description: '标签管理相关接口' },
})
class TagsController {
  constructor(@Inject(TagsService) private readonly tagsService: TagsService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: '列出所有标签',
      tags: ['Tags'],
      request: {
        query: TagsListQuerySchema,
      },
      responses: {
        200: {
          description: '标签列表',
          schema: z.object({
            data: z.array(TagEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const p = page ? Math.max(1, Number(page)) : 1;
    const ps = pageSize ? Math.max(1, Math.min(100, Number(pageSize))) : 10;
    return this.tagsService.findAll(p, ps);
  }

  @Public()
  @Get(':id', {
    apiDoc: {
      summary: '根据ID获取标签',
      tags: ['Tags'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '标签详情',
          schema: TagEntitySchema,
        },
      },
    },
  })
  async findById(@Param('id') id: string) {
    return this.tagsService.findById(id);
  }

  @UseGuards(AuthGuard)
  @Post('', {
    apiDoc: {
      summary: '创建新标签',
      tags: ['Tags'],
      request: {
        body: CreateTagSchema,
      },
      responses: {
        201: {
          description: '标签创建成功',
          schema: z.object({ affectedRows: z.number(), id: z.string().optional() }),
        },
      },
    },
  })
  async create(@Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = body as { name: string; slug: string };
    return this.tagsService.create({ ...data, createdBy: user.userId });
  }

  @UseGuards(AuthGuard)
  @Put(':id', {
    apiDoc: {
      summary: '更新标签',
      tags: ['Tags'],
      request: {
        params: z.object({ id: z.string() }),
        body: UpdateTagSchema,
      },
      responses: {
        200: {
          description: '标签更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = body as { name?: string; slug?: string };
    const result = await this.tagsService.update(id, data, user.userId, user.roles);
    if (!result) return { affectedRows: 0 };
    return { affectedRows: 1 };
  }

  @UseGuards(AuthGuard)
  @Delete(':id', {
    apiDoc: {
      summary: '删除标签',
      tags: ['Tags'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '标签删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async delete(@Param('id') id: string, @Var('user') user: AuthEntity) {
    const ok = await this.tagsService.delete(id, user.userId, user.roles);
    return { affectedRows: ok ? 1 : 0 };
  }
}

export default TagsController;
