import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import { conflict } from '@/lib/api-error';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { env } from '@rx-ted/packages-core';
import { LOCALE } from '@/constants';
import { envParams } from '@/constants';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import { logger } from '@/lib/logger';

@Service()
class OAuthService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionManagerService) private sessionManager: SessionManagerService,
  ) {}

  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new HTTPException(504, { message: `GitHub API timed out after ${timeoutMs}ms` });
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async exchangeGitHubCode(code: string): Promise<{
    providerUserId: string;
    email: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    website?: string;
    location?: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    const tokenResponse = await this.fetchWithTimeout(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.require('GITHUB_CLIENT_ID'),
          client_secret: env.require('GITHUB_SECRET'),
          code,
        }),
      },
    );
    const tokenText = await tokenResponse.text();
    let tokenData: { access_token?: string; error?: string };
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      logger.error({ response: tokenText }, '[OAuth] raw token response');
      throw new HTTPException(502, {
        message: `GitHub returned non-JSON: ${tokenText.slice(0, 120)}`,
      });
    }
    if (!tokenData.access_token) {
      throw new HTTPException(401, { message: 'OAuth code exchange failed' });
    }

    const userResponse = await this.fetchWithTimeout('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'app.19981204.xyz',
      },
    });
    const userText = await userResponse.text();
    let userData: {
      id: number;
      login: string;
      email?: string;
      name?: string;
      avatar_url?: string;
      blog?: string;
      location?: string;
    };
    try {
      userData = JSON.parse(userText);
    } catch {
      logger.error({ response: userText }, '[OAuth] raw user response');
      throw new HTTPException(502, {
        message: `GitHub user API returned non-JSON: ${userText.slice(0, 120)}`,
      });
    }

    let email = userData.email;
    if (!email) {
      const emailsResponse = await this.fetchWithTimeout('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'app.19981204.xyz',
        },
      });
      const emailsText = await emailsResponse.text();
      let emails: { email: string; primary: boolean }[];
      try {
        emails = JSON.parse(emailsText);
      } catch {
        logger.error({ response: emailsText }, '[OAuth] raw emails response');
        emails = [];
      }
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email;
    }

    const website = userData.blog && userData.blog.length > 0 ? userData.blog : undefined;

    return {
      providerUserId: String(userData.id),
      email: email ?? `${userData.login}@github.user`,
      username: userData.login,
      nickname: userData.name ?? userData.login,
      avatar_url: userData.avatar_url,
      website,
      location: userData.location || undefined,
      accessToken: tokenData.access_token,
    };
  }

  async registerViaOAuth(
    input: {
      login_type: 'github' | 'google' | 'wechat';
      code: string;
      username?: string;
      preferred_locale?: 'zh-CN' | 'en';
      nickname?: string;
      avatar_url?: string;
      bio?: string;
      location?: string;
    },
    ip?: string,
    userAgent?: string,
  ) {
    const providerUser = await this.exchangeGitHubCode(input.code);
    const existingLink = await this.authRepo.getUserByOAuthProvider(
      input.login_type,
      providerUser.providerUserId,
    );

    if (existingLink) {
      await this.authRepo.updateLastLoginAt(existingLink.userId);
      await this.sessionManager.recordAuditLogin(
        existingLink.userId,
        existingLink.username,
        input.login_type,
        ip,
      );
      return this.sessionManager.createSessionAndTokens(existingLink, ip, userAgent);
    }

    if (providerUser.email && (await this.authRepo.getUserByEmail(providerUser.email))) {
      throw conflict('EMAIL_ALREADY_EXISTS', '该邮箱已被注册');
    }

    const displayName = input.username ?? providerUser.username ?? providerUser.email.split('@')[0];
    const locale = input.preferred_locale ?? LOCALE.DEFAULT;
    const user = await this.authRepo.createUser(
      displayName,
      input.login_type,
      {
        email: providerUser.email,
        nickname: input.nickname ?? providerUser.nickname,
        avatarUrl: input.avatar_url ?? providerUser.avatar_url,
        website: providerUser.website,
        location: providerUser.location,
        bio: input.bio,
        preferredLocale: locale,
      },
      envParams.ADMIN_USERS,
    );

    await this.authRepo.linkOAuthProvider(user.userId, input.login_type, {
      providerUserId: providerUser.providerUserId,
      accessToken: providerUser.accessToken,
      refreshToken: providerUser.refreshToken,
    });

    await this.sessionManager.recordAuditRegister(user.userId, user.username, input.login_type);
    return this.sessionManager.createSessionAndTokens(user, ip, userAgent);
  }

  async bindGitHub(userId: string, code: string) {
    const providerUser = await this.exchangeGitHubCode(code);
    const existingLink = await this.authRepo.getUserByOAuthProvider(
      'github',
      providerUser.providerUserId,
    );

    if (existingLink && existingLink.userId !== userId) {
      throw new HTTPException(409, { message: '该 GitHub 账号已被其他用户绑定' });
    }

    if (existingLink && existingLink.userId === userId) {
      return { alreadyBound: true };
    }

    await this.authRepo.linkOAuthProvider(userId, 'github', {
      providerUserId: providerUser.providerUserId,
      accessToken: providerUser.accessToken,
    });

    await this.authRepo.updateProfile(userId, {
      avatar_url: providerUser.avatar_url,
      nickname: providerUser.nickname,
      website: providerUser.website,
      location: providerUser.location,
    });

    await this.sessionManager.recordAuditBind(userId, 'github');

    return { alreadyBound: false };
  }
}

export default OAuthService;
