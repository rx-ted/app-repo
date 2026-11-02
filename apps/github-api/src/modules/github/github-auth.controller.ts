import {
  Controller,
  Ctx,
  Get,
  Post,
  Inject,
  Query,
  UseGuards,
} from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import { HTTPException } from 'hono/http-exception';
import { env } from '@rx-ted/packages-core';
import GitHubService from '@/modules/github/github.service';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiBearerAuth,
} from '@rx-ted/packages-honest-plugins-swagger';

@ApiTags('GitHub Auth')
@Controller('github', { tag: { name: 'GitHub Auth', description: 'GitHub 登录与令牌' } })
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class GitHubAuthController {
  constructor(@Inject(GitHubService) private readonly githubService: GitHubService) {}

  @Get('auth/url')
  @ApiOperation({ summary: '获取 GitHub 授权 URL' })
  @ApiQuery({ name: 'redirectUri', required: false, type: String, description: 'OAuth 回调地址' })
  @ApiQuery({ name: 'source', required: false, type: String, description: '来源：blog/doc/github' })
  @ApiQuery({ name: 'redirect', required: false, type: String, description: '登录成功后回跳地址' })
  @ApiQuery({ name: 'frontend', required: false, type: String, description: '前端 origin 允许列表校验' })
  @ApiOkResponse({ description: 'GitHub 授权 URL' })
  async getAuthUrl(
    @Ctx() c: Context,
    @Query('redirectUri') redirectUri?: string,
    @Query('source') source?: string,
    @Query('redirect') redirect?: string,
    @Query('frontend') frontend?: string,
    @Query('username') username?: string,
  ) {
    const user = c.get('user') as { userId: string; username?: string };
    const clientId = (env.var('GITHUB_CLIENT_ID', '') ?? '').trim();
    const cb = redirectUri ?? env.var('GITHUB_REDIRECT_URI', '') ?? '';
    const platformUsername = username ?? (user.username && user.username !== 'anonymous' ? user.username : undefined);
    const sessionId = (c.get('session_id') as string) ?? undefined;
    return await this.githubService.getAuthUrl(clientId, cb, platformUsername, source ?? 'github', redirect ?? '/', frontend, sessionId);
  }

  @Public()
  @Get('auth/callback')
  @ApiOperation({ summary: 'GitHub 授权回调' })
  @ApiQuery({ name: 'code', required: true, type: String, description: '授权码' })
  @ApiQuery({ name: 'state', required: true, type: String, description: 'OAuth state' })
  @ApiOkResponse({ description: 'GitHub 登录结果' })
  async authCallback(@Query('code') code: string, @Query('state') state: string) {
    return this.githubService.handleCallback(code ?? '', state ?? '');
  }

  private async resolveCode(c: Context): Promise<string> {
    const queryCode = c.req.query('code');
    if (queryCode) return queryCode;
    const text = await c.req.text().catch(() => '');
    try {
      const json = JSON.parse(text);
      if (json?.code) return String(json.code);
    } catch {
      // ignore
    }
    const params = new URLSearchParams(text);
    return params.get('code') ?? '';
  }

  private async exchangeProxy(c: Context) {
    const code = await this.resolveCode(c);
    if (!code) throw new HTTPException(400, { message: 'missing_code' });
    return this.githubService.exchangeCodeForAccessToken(code);
  }

  @Public()
  @Post('auth/token')
  async authTokenPost(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Get('auth/token')
  async authTokenGet(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Post('oauth/token')
  async oauthTokenPost(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Get('oauth/token')
  async oauthTokenGet(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Post('oauth/access_token')
  async oauthAccessTokenPost(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Get('oauth/access_token')
  async oauthAccessTokenGet(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Post('login/oauth/access_token')
  async loginOauthAccessTokenPost(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }

  @Public()
  @Get('login/oauth/access_token')
  async loginOauthAccessTokenGet(@Ctx() c: Context) {
    return this.exchangeProxy(c);
  }
}

export default GitHubAuthController;