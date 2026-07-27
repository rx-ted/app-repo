import { Controller, Ctx, Get, Inject, Ip, Query, UA, UseGuards } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { setCookie } from 'hono/cookie';
import { AuthGuard } from '@/common/guards';
import { Public } from '@/common/decorators';
import OAuthService from '@/modules/auth/services/oauth.service';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { env } from '@rx-ted/packages-core';
import { envParams } from '@/constants';
import { AUTH } from '@/constants/auth';
import { logger } from '@/lib/logger';

const OAUTH_STATE_TTL = 600;

function getUser(c: Context): AuthEntity {
  return c.get('user') as AuthEntity;
}

@UseGuards(AuthGuard)
@Controller('auth/oauth', {
  tag: { name: 'Auth', description: 'OAuth 第三方认证' },
})
class AuthOAuthController {
  constructor(
    @Inject(OAuthService) private readonly oauthService: OAuthService,
    @Inject(SessionManagerService) private readonly sessionManager: SessionManagerService,
    @Inject(AuthRepository) private readonly authRepo: AuthRepository,
    @Inject(CacheService) private readonly cache: CacheService,
  ) {}

  private getFrontendUrl(): string {
    const domain = envParams.FRONTEND_DOMAIN;
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${domain}`;
  }

  private getApiUrl(c: Context): string {
    const host = c.req.header('Host') ?? envParams.SITE_DOMAIN;
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  private async generateState(redirect: string, userId?: string): Promise<string> {
    const state = crypto.randomUUID();
    const data: Record<string, string> = { redirect };
    if (userId) data.userId = userId;
    await this.cache.set(`oauth:state:${state}`, JSON.stringify(data), OAUTH_STATE_TTL);
    return state;
  }

  private async consumeState(state: string): Promise<{ redirect: string; userId?: string } | null> {
    const key = `oauth:state:${state}`;
    const raw = await this.cache.get<string>(key);
    if (!raw) return null;
    await this.cache.delete(key);
    return JSON.parse(raw) as { redirect: string; userId?: string };
  }

  private setRefreshCookie(
    c: Context,
    token: string,
    maxAge: number = AUTH.COOKIE_MAX_AGE_SECONDS,
  ) {
    setCookie(c, AUTH.COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: AUTH.COOKIE_PATH,
      maxAge,
    });
  }

  @Public()
  @Get('github', {
    apiDoc: {
      summary: 'GitHub OAuth 登录发起',
      tags: ['Auth'],
      responses: { 302: { description: 'Redirect to GitHub authorization' } },
    },
  })
  async githubLogin(@Query('redirect') redirect: string = '/', @Ctx() c: Context) {
    const clientId = env.var('GITHUB_CLIENT_ID', '');
    if (!clientId) throw new HTTPException(500, { message: 'GitHub OAuth not configured' });

    const state = await this.generateState(redirect);
    const callbackUrl = `${this.getApiUrl(c)}/api/v1/auth/oauth/github/callback`;

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=user:email`;
    return c.redirect(url);
  }

  @Public()
  @Get('github/callback', {
    apiDoc: {
      summary: 'GitHub OAuth 登录回调',
      tags: ['Auth'],
      responses: { 302: { description: 'Redirect to frontend with token' } },
    },
  })
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Ctx() c: Context,
    @Ip() ip?: string,
    @UA() ua?: string,
  ) {
    if (!code || !state) throw new HTTPException(400, { message: 'Missing code or state' });

    const stored = await this.consumeState(state);
    if (!stored) throw new HTTPException(400, { message: 'Invalid or expired state' });

    const frontendUrl = this.getFrontendUrl();

    try {
      const providerUser = await this.oauthService.exchangeGitHubCode(code);
      const existingLink = await this.authRepo.getUserByOAuthProvider(
        'github',
        providerUser.providerUserId,
      );

      let result: { accessToken: string; refreshToken: string; sessionId: string };
      if (existingLink) {
        await this.authRepo.updateLastLoginAt(existingLink.userId);
        await this.sessionManager.recordAuditLogin(
          existingLink.userId,
          existingLink.username,
          'github',
          ip,
        );
        result = await this.sessionManager.createSessionAndTokens(existingLink, ip, ua);
      } else {
        const matchByEmail = providerUser.email
          ? await this.authRepo.getUserByEmail(providerUser.email)
          : null;
        const matchByUsername = providerUser.username
          ? await this.authRepo.getSessionUserByUsername(providerUser.username)
          : null;
        const existingUser = matchByEmail ?? matchByUsername;

        if (existingUser) {
          const userLink = await this.authRepo.getUserOAuthByProvider(
            existingUser.userId,
            'github',
          );
          if (userLink) {
            throw new HTTPException(409, { message: '该账户已被绑定到其他 GitHub 账号' });
          }
          await this.authRepo.linkOAuthProvider(existingUser.userId, 'github', {
            providerUserId: providerUser.providerUserId,
            accessToken: providerUser.accessToken,
          });
          await this.authRepo.updateProfile(existingUser.userId, {
            avatar_url: providerUser.avatar_url,
            nickname: providerUser.nickname,
            website: providerUser.website,
            location: providerUser.location,
          });
          await this.authRepo.updateLastLoginAt(existingUser.userId);
          await this.sessionManager.recordAuditBind(existingUser.userId, 'github');
          result = await this.sessionManager.createSessionAndTokens(existingUser, ip, ua);
        } else {
          const displayName =
            providerUser.username ?? providerUser.email?.split('@')[0] ?? 'github_user';
          const user = await this.authRepo.createUser(
            displayName,
            'github',
            {
              email: providerUser.email,
              nickname: providerUser.nickname,
              avatarUrl: providerUser.avatar_url,
              website: providerUser.website,
              location: providerUser.location,
            },
            envParams.ADMIN_USERS,
          );
          await this.authRepo.linkOAuthProvider(user.userId, 'github', {
            providerUserId: providerUser.providerUserId,
            accessToken: providerUser.accessToken,
          });
          await this.authRepo.updateLastLoginAt(user.userId);
          await this.sessionManager.recordAuditRegister(user.userId, user.username, 'github');
          result = await this.sessionManager.createSessionAndTokens(user, ip, ua);
        }
      }

      const redirectUrl = `${frontendUrl}/login?token=${result.accessToken}&redirect=${encodeURIComponent(stored.redirect)}`;
      this.setRefreshCookie(c, result.refreshToken);
      return c.redirect(redirectUrl);
    } catch (e) {
      logger.error({ err: e }, '[OAuth] githubCallback error');
      const errorMsg = e instanceof HTTPException ? e.message : 'OAuth login failed';
      return c.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorMsg)}`);
    }
  }

  @Get('github/bind', {
    apiDoc: {
      summary: 'GitHub OAuth 绑定发起（需登录）',
      tags: ['Auth'],
      responses: { 200: { description: 'GitHub authorization URL' } },
    },
  })
  async githubBind(@Query('redirect') redirect: string = '/profile', @Ctx() c: Context) {
    const user = getUser(c);
    const clientId = env.var('GITHUB_CLIENT_ID', '');
    if (!clientId) throw new HTTPException(500, { message: 'GitHub OAuth not configured' });

    const state = await this.generateState(redirect, user.userId);
    const callbackUrl = `${this.getApiUrl(c)}/api/v1/auth/oauth/github/bind/callback`;

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}&scope=user:email`;
    return { url };
  }

  @Public()
  @Get('github/bind/callback', {
    apiDoc: {
      summary: 'GitHub OAuth 绑定回调',
      tags: ['Auth'],
      responses: { 302: { description: 'Redirect to frontend with status' } },
    },
  })
  async githubBindCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Ctx() c: Context,
  ) {
    if (!code || !state) throw new HTTPException(400, { message: 'Missing code or state' });

    const stored = await this.consumeState(state);
    if (!stored?.userId) throw new HTTPException(400, { message: 'Invalid or expired state' });

    const frontendUrl = this.getFrontendUrl();
    const redirect = stored.redirect.startsWith('/') ? stored.redirect : '/profile';

    try {
      await this.oauthService.bindGitHub(stored.userId, code);
      return c.redirect(`${frontendUrl}${redirect}?github=connected`);
    } catch (e) {
      const errorMsg = e instanceof HTTPException ? e.message : 'GitHub binding failed';
      return c.redirect(`${frontendUrl}${redirect}?error=${encodeURIComponent(errorMsg)}`);
    }
  }
}

export default AuthOAuthController;
