import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import GitHubService from '@/modules/github/github.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiBearerAuth,
} from '@rx-ted/packages-honest-plugins-swagger';

@ApiTags('GitHub Discussion')
@Controller('github', { tag: { name: 'GitHub Discussion', description: 'GitHub Discussion 与评论' } })
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class GitHubDiscussionsController {
  constructor(@Inject(GitHubService) private readonly githubService: GitHubService) {}

  @Get('discussions')
  @ApiOperation({ summary: '列出 Discussion' })
  @ApiQuery({ name: 'owner', required: true, type: String })
  @ApiQuery({ name: 'repo', required: true, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ description: 'Discussion 列表' })
  async listDiscussions(
    @Ctx() c: Context,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.listDiscussions(user.username ?? user.userId, owner, repo, category, cursor);
  }

  @Get('discussions/:number')
  @ApiOperation({ summary: '获取 Discussion' })
  @ApiParam({ name: 'number', required: true, type: Number })
  @ApiQuery({ name: 'owner', required: true, type: String })
  @ApiQuery({ name: 'repo', required: true, type: String })
  @ApiOkResponse({ description: 'Discussion 详情' })
  async getDiscussion(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.getDiscussion(user.username ?? user.userId, owner, repo, Number(number));
  }

  @Post('discussions')
  @ApiOperation({ summary: '创建 Discussion' })
  @ApiBody({
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      categoryId: z.string().optional(),
      categorySlug: z.string().optional(),
      blogUrl: z.string().optional(),
      postTitle: z.string().optional(),
      slug: z.string().optional(),
    }),
  })
  @ApiOkResponse({ description: '创建的 Discussion' })
  async createDiscussion(@Ctx() c: Context, @Body() body: unknown) {
    const parsed = z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string(),
      body: z.string(),
      categoryId: z.string().optional(),
      categorySlug: z.string().optional(),
      blogUrl: z.string().optional(),
      postTitle: z.string().optional(),
      slug: z.string().optional(),
    }).parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.createDiscussion(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      parsed.title,
      parsed.body,
      parsed.categoryId,
      parsed.categorySlug,
      parsed.blogUrl,
      parsed.postTitle,
      parsed.slug,
    );
  }

  @Post('discussions/:number')
  @ApiOperation({ summary: '更新 Discussion' })
  @ApiParam({ name: 'number', required: true, type: Number })
  @ApiBody({
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string().optional(),
      body: z.string().optional(),
      blogUrl: z.string().optional(),
      postTitle: z.string().optional(),
    }),
  })
  @ApiOkResponse({ description: '更新后的 Discussion' })
  async updateDiscussionAlias(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({
      owner: z.string(),
      repo: z.string(),
      title: z.string().optional(),
      body: z.string().optional(),
      blogUrl: z.string().optional(),
      postTitle: z.string().optional(),
    }).parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.updateDiscussion(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      Number(number),
      parsed.title,
      parsed.body,
      parsed.blogUrl,
      parsed.postTitle,
    );
  }

  @Delete('discussions/:number')
  @ApiOperation({ summary: '关闭 Discussion' })
  @ApiParam({ name: 'number', required: true, type: Number })
  @ApiQuery({ name: 'owner', required: true, type: String })
  @ApiQuery({ name: 'repo', required: true, type: String })
  @ApiOkResponse({ description: '操作结果' })
  async closeDiscussion(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    await this.githubService.closeDiscussion(user.username ?? user.userId, owner, repo, Number(number));
    return { ok: true };
  }

  @Get('discussions/:number/comments')
  @ApiOperation({ summary: '列出 Discussion 评论' })
  @ApiParam({ name: 'number', required: true, type: Number })
  @ApiQuery({ name: 'owner', required: true, type: String })
  @ApiQuery({ name: 'repo', required: true, type: String })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ description: '评论列表' })
  async listComments(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.listComments(user.username ?? user.userId, owner, repo, Number(number), cursor);
  }

  @Post('discussions/:number/comments')
  @ApiOperation({ summary: '新增 Discussion 评论' })
  @ApiParam({ name: 'number', required: true, type: Number })
  @ApiBody({
    schema: z.object({
      owner: z.string(),
      repo: z.string(),
      body: z.string(),
    }),
  })
  @ApiOkResponse({ description: '新增的评论' })
  async addComment(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({
      owner: z.string(),
      repo: z.string(),
      body: z.string(),
    }).parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.addComment(user.username ?? user.userId, parsed.owner, parsed.repo, Number(number), parsed.body);
  }

  @Post('comments/:id')
  @ApiOperation({ summary: '更新 Discussion 评论' })
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiBody({ schema: z.object({ body: z.string() }) })
  @ApiOkResponse({ description: '更新后的评论' })
  async updateComment(@Ctx() c: Context, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ body: z.string() }).parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.updateComment(user.username ?? user.userId, id, parsed.body);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '删除 Discussion 评论' })
  @ApiParam({ name: 'id', required: true, type: String })
  @ApiOkResponse({ description: '操作结果' })
  async deleteComment(@Ctx() c: Context, @Param('id') id: string) {
    const user = c.get('user') as { username?: string; userId: string };
    await this.githubService.deleteComment(user.username ?? user.userId, id);
    return { ok: true };
  }
}

export default GitHubDiscussionsController;