import { Module } from '@rx-ted/packages-honest';
import CommentDiscussionService from '@/modules/comment-map/comment-discussion.service';
import {
  Controller,
  Get,
  Inject,
  Post,
  Delete,
  Put,
  Param,
  Body,
  UseGuards,
  Query,
} from '@rx-ted/packages-honest';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ROLES } from '@/constants';
import { z } from '@/lib/openapi';

@Controller('comments', { tag: { name: 'Comments', description: '评论映射' } })
@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
export class CommentDiscussionController {
  constructor(
    @Inject(CommentDiscussionService) private readonly service: CommentDiscussionService,
  ) {}

  @Get('discussion', {
    apiDoc: { summary: '解析 slug/scope 对应的 Discussion', tags: ['Comments'] },
  })
  async resolve(@Query('scope') scope?: string, @Query('slug') slug?: string) {
    return this.service.resolve(scope, slug);
  }

  @Post('discussion', { apiDoc: { summary: '创建/确保 Discussion 映射', tags: ['Comments'] } })
  async ensure(@Body() body: unknown) {
    const parsed = z
      .object({
        scope: z.string().optional(),
        slug: z.string().optional(),
        postTitle: z.string(),
        blogUrl: z.string(),
        githubOwner: z.string(),
        githubRepo: z.string(),
        categoryId: z.string().optional(),
        categorySlug: z.string().optional(),
      })
      .parse(body);
    return this.service.ensureMapping(parsed);
  }

  @Post('discussion/maps', { apiDoc: { summary: '手动创建映射', tags: ['Comments'] } })
  async create(@Body() body: unknown) {
    return this.service.createMapping(body as any);
  }

  @Put('discussion/maps/:id', { apiDoc: { summary: '更新映射', tags: ['Comments'] } })
  async update(@Param('id') id: string, @Body() body: unknown) {
    await this.service.updateMapping(Number(id), body as Record<string, unknown>);
    return { ok: true };
  }

  @Delete('discussion/maps/:id', { apiDoc: { summary: '删除映射', tags: ['Comments'] } })
  async remove(@Param('id') id: string) {
    await this.service.deleteMapping(Number(id));
    return { ok: true };
  }
}

@Module({
  controllers: [CommentDiscussionController],
  services: [CommentDiscussionService],
})
class CommentMapModule {}
export default CommentMapModule;
