import {
  Body,
  Controller,
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
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Public, Roles, Permissions } from '@/common/decorators';
import { DEFAULTS, PERMISSIONS, ROLES } from '@/constants';
import {
  CreatePostSchema,
  PostListQuerySchema,
  UpdatePostSchema,
} from '@/modules/post/dtos/post.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { PostListEntitySchema, PostEntitySchema } from '@/modules/post/entities/post.entity';
import PostService from '@/modules/post/post.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.POST_ACCESS_ANY)
@Controller('posts', {
  tag: { name: 'Posts', description: '文章管理相关接口' },
})
class PostController {
  constructor(@Inject(PostService) private readonly postService: PostService) {}

  @Public()
  @Get('', {
    apiDoc: {
      summary: '列出所有公开文章',
      tags: ['Posts'],
      request: {
        query: PostListQuerySchema,
      },
      responses: {
        200: {
          description: '文章列表',
          schema: z.object({
            list: z.array(PostListEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('tag') tag?: string,
    @Query('category') category?: string,
    @Query('author') author?: string,
  ) {
    return this.postService.list(
      page ? Math.max(1, Number(page)) : 1,
      pageSize
        ? Math.max(1, Math.min(DEFAULTS.MAX_PAGE_SIZE, Number(pageSize)))
        : DEFAULTS.PAGE_SIZE,
      { keyword, tag, category, author },
    );
  }

  @Public()
  @Get(':slug/adjacent', {
    apiDoc: {
      summary: '获取上下篇文章',
      tags: ['Posts'],
      request: {
        params: z.object({ slug: z.string() }),
      },
      responses: {
        200: {
          description: '上下篇文章',
          schema: z.object({
            prev: z.object({ slug: z.string(), title: z.string() }).nullable(),
            next: z.object({ slug: z.string(), title: z.string() }).nullable(),
          }),
        },
      },
    },
  })
  async getAdjacent(@Param('slug') slug: string) {
    return this.postService.getAdjacent(slug);
  }

  @Public()
  @Get('calendar', {
    apiDoc: {
      summary: '获取文章日历数据',
      tags: ['Posts'],
      request: {
        query: z.object({
          year: z.coerce.number().int().min(2000).max(2100),
          month: z.coerce.number().int().min(1).max(12),
        }),
      },
      responses: {
        200: {
          description: '每日文章数',
          schema: z.record(z.string(), z.number()),
        },
      },
    },
  })
  async calendar(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;
    return this.postService.getCalendarCounts(y, m);
  }

  @Public()
  @Get(':slug', {
    apiDoc: {
      summary: '根据slug获取文章',
      tags: ['Posts'],
      request: {
        params: z.object({ slug: z.string() }),
      },
      responses: {
        200: {
          description: '文章详情',
          schema: PostEntitySchema,
        },
      },
    },
  })
  async getBySlug(@Param('slug') slug: string) {
    return this.postService.getBySlug(slug);
  }

  @Post('', {
    apiDoc: {
      summary: '创建新文章',
      tags: ['Posts'],
      request: {
        body: CreatePostSchema,
      },
      responses: {
        201: {
          description: '文章创建成功',
          schema: z.object({ slug: z.string() }),
        },
      },
    },
  })
  async create(@Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = CreatePostSchema.parse(body);
    return this.postService.create({
      title: String(data.title ?? ''),
      slug: data.slug,
      contentMd: String(data.content_md ?? ''),
      authorId: user.userId,
      authorName: user.username,
      authorUsername: user.username,
      coverImage: data.cover_image != null ? String(data.cover_image) : null,
      isPinned: Boolean(data.is_pinned),
      featuredWeight: Number(data.featured_weight ?? 0),
      status: (data.status as 'draft' | 'published' | 'archived') ?? 'draft',
      visibility: (data.visibility as 'public' | 'private' | 'password') ?? 'public',
      allowComment: data.allow_comment !== false,
      tagIds: data.tag_ids,
      categoryIds: data.category_ids,
      createdBy: user.userId,
      updatedBy: user.userId,
    });
  }

  @Put(':slug', {
    apiDoc: {
      summary: '更新文章',
      tags: ['Posts'],
      request: {
        params: z.object({ slug: z.string() }),
        body: UpdatePostSchema,
      },
      responses: {
        200: {
          description: '文章更新成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async update(@Param('slug') slug: string, @Body() body: unknown, @Var('user') user: AuthEntity) {
    const data = UpdatePostSchema.parse(body);
    return this.postService.updateBySlug(slug, {
      title: data.title != null ? String(data.title) : undefined,
      contentMd: data.content_md != null ? String(data.content_md) : undefined,
      tagIds: data.tag_ids,
      categoryIds: data.category_ids,
      updatedBy: user.userId,
    });
  }
}

export default PostController;
