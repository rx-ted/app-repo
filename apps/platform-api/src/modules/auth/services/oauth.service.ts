import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import { conflict } from '@/lib/api-error';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { env } from '@rx-ted/packages-core';
import { LOCALE } from '@/constants';
import { envParams } from '@/constants';
import SessionManagerService from '@/modules/auth/services/session-manager.service';

@Service()
class OAuthService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionManagerService) private sessionManager: SessionManagerService,
  ) {}

  async exchangeGitHubCode(
    code: string,
    state?: string,
  ): Promise<{
    providerUserId: string;
    email: string;
    username?: string;
    nickname?: string;
    avatar_url?: string;
    website?: string;
    location?: string;
    accessToken?: string;
    refreshToken?: string;
    redirect?: string;
    frontend?: string;
  }> {
    if (!state) {
      throw new HTTPException(400, { message: 'Missing OAuth state' });
    }
    const base = (env.var('GITHUB_API_BASE_URL', 'http://localhost:3001/api/v1') ?? '')
      .trim()
      .replace(/\/$/, '');
    const res = await fetch(
      `${base}/github/auth/callback?${new URLSearchParams({ code, state }).toString()}`,
    );
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new HTTPException(502, {
        message: `github-api returned non-JSON: ${text.slice(0, 120)}`,
      });
    }
    if (!res.ok) {
      throw new HTTPException(res.status as any, {
        message: data?.message || 'github_auth_failed',
      });
    }

    const login = String(data.login);
    const email = data.email || `${login}@github.user`;

    return {
      providerUserId: String(data.githubUserId ?? data.id ?? login),
      email,
      username: login,
      nickname: data.name || login,
      avatar_url: data.avatarUrl || data.avatar_url,
      website: data.website,
      location: data.location,
      accessToken: undefined,
      refreshToken: undefined,
      redirect: data.redirect,
      frontend: data.frontend,
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

  async bindGitHub(userId: string, code: string, state?: string) {
    const providerUser = await this.exchangeGitHubCode(code, state);
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
