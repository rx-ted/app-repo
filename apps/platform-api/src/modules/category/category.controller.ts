import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Var,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import { CategoryEntitySchema } from '@/modules/category/entities/category.entity';
import CategoryService from '@/modules/category/category.service';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from '@/modules/category/dtos/category.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';

@Controller('categories', {
  tag: { name: 'Categories', description: '分类管理相关接口' },
})
class CategoryController {
  constructor(@Inject(CategoryService) private readonly categoryService: CategoryService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: '列出所有分类',
      tags: ['Categories'],
      responses: {
        200: {
          description: '分类列表',
          schema: z.array(CategoryEntitySchema),
        },
      },
    },
  })
  async list() {
    return this.categoryService.list();
  }

  @UseGuards(AuthGuard)
  @Post('', {
    apiDoc: {
      summary: '创建新分类',
      tags: ['Categories'],
      request: {
        body: CreateCategorySchema,
      },
      responses: {
        201: {
          description: '分类创建成功',
          schema: z.object({ affectedRows: z.number(), id: z.string().optional() }),
        },
      },
    },
  })
  async create(@Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = CreateCategorySchema.parse(body);
    const slug = data.slug ?? data.name.toLowerCase().replace(/\s+/g, '-');
    return this.categoryService.create({ ...data, slug, createdBy: user.userId });
  }

  @UseGuards(AuthGuard)
  @Put(':id', {
    apiDoc: {
      summary: '更新分类',
      tags: ['Categories'],
      request: {
        params: z.object({ id: z.string() }),
        body: UpdateCategorySchema,
      },
      responses: {
        200: {
          description: '分类更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = body as { name?: string; slug?: string; description?: string };
    const result = await this.categoryService.update(id, data, user.userId, user.roles);
    if (!result) return { affectedRows: 0 };
    return { affectedRows: 1 };
  }

  @UseGuards(AuthGuard)
  @Delete(':id', {
    apiDoc: {
      summary: '删除分类',
      tags: ['Categories'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '分类删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async delete(@Param('id') id: string, @Var('user') user: AuthEntity) {
    const ok = await this.categoryService.delete(id, user.userId, user.roles);
    return { affectedRows: ok ? 1 : 0 };
  }
}

export default CategoryController;
