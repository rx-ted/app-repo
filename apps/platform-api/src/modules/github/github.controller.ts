import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import { env } from '@rx-ted/packages-core';
import GitHubService from '@/modules/github/github.service';

const FileBodySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  content: z.string(),
  message: z.string().optional(),
  branch: z.string().optional(),
  sha: z.string().optional(),
});

const DeleteBodySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  sha: z.string(),
  message: z.string().optional(),
  branch: z.string().optional(),
});

@Controller('github', { tag: { name: 'GitHub', description: 'GitHub 集成' } })
@UseGuards(AuthGuard)
export class GitHubController {
  constructor(@Inject(GitHubService) private readonly githubService: GitHubService) {}

  @Get('auth/url', { apiDoc: { summary: '获取 GitHub 授权 URL', tags: ['GitHub'] } })
  async getAuthUrl(@Ctx() c: Context, @Query('redirectUri') redirectUri?: string) {
    const user = c.get('user') as { userId: string; username?: string };
    const clientId = (env.var('GITHUB_CLIENT_ID', '') ?? '').trim();
    const redirect = redirectUri ?? env.var('GITHUB_REDIRECT_URI', '') ?? '';
    return this.githubService.getAuthUrl(clientId, redirect, user.username ?? user.userId);
  }

  @Public()
  @Get('auth/callback', { apiDoc: { summary: 'GitHub 授权回调', tags: ['GitHub'] } })
  async authCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.githubService.handleCallback(code ?? '', state ?? '');
  }

  @Get('files', { apiDoc: { summary: '读取仓库文件', tags: ['GitHub'] } })
  async getFile(
    @Ctx() c: Context,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
    @Query('path') path: string,
    @Query('ref') ref?: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.getFile(user.username ?? user.userId, owner, repo, path, ref);
  }

  @Put('files', { apiDoc: { summary: '新建或更新仓库文件', tags: ['GitHub'] } })
  async putFile(@Ctx() c: Context, @Body() body: unknown) {
    const parsed = FileBodySchema.parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.putFile(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      parsed.path,
      parsed.content,
      parsed.message ?? '',
      parsed.branch,
      parsed.sha,
    );
  }

  @Delete('files', { apiDoc: { summary: '删除仓库文件', tags: ['GitHub'] } })
  async deleteFile(@Ctx() c: Context, @Body() body: unknown) {
    const parsed = DeleteBodySchema.parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.deleteFile(
      user.username ?? user.userId,
      parsed.owner,
      parsed.repo,
      parsed.path,
      parsed.sha,
      parsed.message,
      parsed.branch,
    );
  }
  @Get('discussions', { apiDoc: { summary: '列出 Discussion', tags: ['GitHub'] } })
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

  @Get('discussions/:number', { apiDoc: { summary: '获取 Discussion', tags: ['GitHub'] } })
  async getDiscussion(
    @Ctx() c: Context,
    @Param('number') number: string,
    @Query('owner') owner: string,
    @Query('repo') repo: string,
  ) {
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.getDiscussion(user.username ?? user.userId, owner, repo, Number(number));
  }

  @Post('discussions', { apiDoc: { summary: '创建 Discussion', tags: ['GitHub'] } })
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

    @Post('discussions/:number', { apiDoc: { summary: '更新 Discussion', tags: ['GitHub'] } })
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

  @Delete('discussions/:number', { apiDoc: { summary: '关闭 Discussion', tags: ['GitHub'] } })
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

  @Get('discussions/:number/comments', { apiDoc: { summary: '列出 Discussion 评论', tags: ['GitHub'] } })
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

  @Post('discussions/:number/comments', { apiDoc: { summary: '新增 Discussion 评论', tags: ['GitHub'] } })
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

  @Post('comments/:id', { apiDoc: { summary: '更新 Discussion 评论', tags: ['GitHub'] } })
  async updateComment(@Ctx() c: Context, @Param('id') id: string, @Body() body: unknown) {
    const parsed = z.object({ body: z.string() }).parse(body);
    const user = c.get('user') as { username?: string; userId: string };
    return this.githubService.updateComment(user.username ?? user.userId, id, parsed.body);
  }

  @Delete('comments/:id', { apiDoc: { summary: '删除 Discussion 评论', tags: ['GitHub'] } })
  async deleteComment(@Ctx() c: Context, @Param('id') id: string) {
    const user = c.get('user') as { username?: string; userId: string };
    await this.githubService.deleteComment(user.username ?? user.userId, id);
    return { ok: true };
  }
}

export default GitHubController;
