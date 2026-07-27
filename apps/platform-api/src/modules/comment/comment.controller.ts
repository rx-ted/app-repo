import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
  Ip,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UA,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { HTTPException } from 'hono/http-exception';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Public, Roles } from '@/common/decorators';
import { ROLES } from '@/constants';
import CommentService from '@/modules/comment/comment.service';
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentPageQuerySchema,
  ReplyPageQuerySchema,
  CreateReportSchema,
  ResolveReportSchema,
} from '@/modules/comment/dtos/comment.request.dto';
import { forbidden } from '@/lib/api-error';

function getUserId(c: Context): string {
  const user = c.get('user') as { userId: string } | undefined;
  return user?.userId ?? '';
}

@Controller('comments', {
  tag: { name: 'Comments', description: '评论管理相关接口' },
})
class CommentController {
  constructor(@Inject(CommentService) private readonly commentService: CommentService) {}

  // ─── Public endpoints ───────────────────────────────

  @Public()
  @Get('page', {
    apiDoc: {
      summary: '分页查询顶级评论',
      tags: ['Comments'],
      request: { query: CommentPageQuerySchema },
      responses: {
        200: { description: '分页评论列表，每条含前5条回复' },
      },
    },
  })
  async page(@Query() query: unknown, @Ctx() c: Context) {
    const parsed = CommentPageQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }
    const q = parsed.data;
    const userId = getUserId(c);
    return this.commentService.page(q, userId || null);
  }

  @Public()
  @Get('replyPage', {
    apiDoc: {
      summary: '分页加载回复',
      tags: ['Comments'],
      request: { query: ReplyPageQuerySchema },
      responses: {
        200: { description: '回复分页列表' },
      },
    },
  })
  async replyPage(@Query() query: unknown, @Ctx() c: Context) {
    const parsed = ReplyPageQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      });
    }
    const q = parsed.data;
    const userId = getUserId(c);
    return this.commentService.replyPage(q, userId || null);
  }

  @Public()
  @Get('', {
    apiDoc: {
      summary: '列出所有评论（平铺）',
      tags: ['Comments'],
      responses: {
        200: { description: '评论列表' },
      },
    },
  })
  async list() {
    return this.commentService.list();
  }

  // ─── Auth required endpoints ────────────────────────

  @Public()
  @Post('', {
    apiDoc: {
      summary: '创建评论（支持登录用户和游客）',
      tags: ['Comments'],
      request: { body: CreateCommentSchema },
      responses: { 201: { description: '创建成功' } },
    },
  })
  async create(@Body() body: unknown, @Ctx() c: Context, @Ip() ip: string, @UA() ua?: string) {
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      throw new HTTPException(400, {
        message: parsed.error.issues.map((i) => i.message).join('; '),
      });
    }
    const { postId, tag, parentId, content, guestName, guestEmail, guestWebsite } = parsed.data;
    const userId = getUserId(c);
    return this.commentService.create({
      postId,
      tag,
      content,
      userId: userId || null,
      guestName: guestName ?? null,
      guestEmail: guestEmail ?? null,
      guestWebsite: guestWebsite ?? null,
      ip: ip ?? null,
      userAgent: ua ?? null,
      ...(parentId != null ? { parentId } : {}),
    });
  }

  @UseGuards(AuthGuard)
  @Put(':id', {
    apiDoc: {
      summary: '编辑评论（5分钟内）',
      tags: ['Comments'],
      request: {
        params: z.object({ id: z.string() }),
        body: UpdateCommentSchema,
      },
      responses: { 200: { description: '编辑成功' } },
    },
  })
  async update(@Param('id') id: string, @Body() body: unknown, @Ctx() c: Context) {
    const data = body as { content: string };
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    return this.commentService.update(id, userId, data.content);
  }

  @UseGuards(AuthGuard)
  @Delete(':id', {
    apiDoc: {
      summary: '删除评论',
      tags: ['Comments'],
      request: { params: z.object({ id: z.string() }) },
      responses: { 200: { description: '删除成功' } },
    },
  })
  async delete(@Param('id') id: string, @Ctx() c: Context) {
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    return this.commentService.delete(id);
  }

  // ─── Like endpoints ─────────────────────────────────

  @UseGuards(AuthGuard)
  @Post(':id/like', {
    apiDoc: {
      summary: '切换评论点赞',
      tags: ['Comments'],
      request: { params: z.object({ id: z.string() }) },
      responses: { 200: { description: '点赞状态' } },
    },
  })
  async toggleLike(@Param('id') id: string, @Ctx() c: Context) {
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    return this.commentService.toggleLike(userId, Number(id));
  }

  @UseGuards(AuthGuard)
  @Get('liked', {
    apiDoc: {
      summary: '获取当前用户点赞的评论ID列表',
      tags: ['Comments'],
      responses: { 200: { description: 'ID列表' } },
    },
  })
  async getLiked(@Ctx() c: Context) {
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    return this.commentService.getLikedCommentIds(userId);
  }

  // ─── Report endpoints ───────────────────────────────

  @UseGuards(AuthGuard)
  @Post(':id/report', {
    apiDoc: {
      summary: '举报评论',
      tags: ['Comments'],
      request: {
        params: z.object({ id: z.string() }),
        body: CreateReportSchema,
      },
      responses: { 201: { description: '举报成功' } },
    },
  })
  async report(@Param('id') id: string, @Body() body: unknown, @Ctx() c: Context) {
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    const data = body as { reason: string; description?: string };
    return this.commentService.createReport(userId, Number(id), data.reason, data.description);
  }

  // ─── Admin report management ────────────────────────

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('reports', {
    apiDoc: {
      summary: '管理员查看举报列表',
      tags: ['Comments'],
      responses: { 200: { description: '举报列表' } },
    },
  })
  async listReports(
    @Query('status') status: string | undefined,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    return this.commentService.listReports(status, Number(page), Number(pageSize));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  @Patch('reports/:id', {
    apiDoc: {
      summary: '管理员处理举报',
      tags: ['Comments'],
      request: {
        params: z.object({ id: z.string() }),
        body: ResolveReportSchema,
      },
      responses: { 200: { description: '处理成功' } },
    },
  })
  async resolveReport(@Param('id') id: string, @Body() body: unknown, @Ctx() c: Context) {
    const userId = getUserId(c);
    if (!userId) throw forbidden('AUTH_REQUIRED', '未登录');
    const data = body as { status: string; action?: string };
    return this.commentService.resolveReport(Number(id), data.status, userId, data.action);
  }
}

export default CommentController;
