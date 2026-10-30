import {
  Body,
  Controller,
  Ctx,
  Delete,
  Get,
  Inject,
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
}

export default GitHubController;
