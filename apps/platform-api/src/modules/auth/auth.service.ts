import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import SessionManagerService from '@/modules/auth/services/session-manager.service';
import PasswordAuthService from '@/modules/auth/services/password-auth.service';
import EmailAuthService from '@/modules/auth/services/email-auth.service';
import OAuthService from '@/modules/auth/services/oauth.service';

@Service()
class AuthService {
  constructor(
    @Inject(SessionManagerService) private sessionManager: SessionManagerService,
    @Inject(PasswordAuthService) private passwordAuth: PasswordAuthService,
    @Inject(EmailAuthService) private emailAuth: EmailAuthService,
    @Inject(OAuthService) private oauthService: OAuthService,
  ) {}

  async getSession(username: string) {
    return this.sessionManager.getSession(username);
  }

  async login(username: string, password: string, ip?: string, userAgent?: string) {
    return this.passwordAuth.login(username, password, ip, userAgent);
  }

  async refresh(rawRefreshToken: string, ip?: string, userAgent?: string) {
    return this.sessionManager.refresh(rawRefreshToken, ip, userAgent);
  }

  async logout(username: string, sessionId?: string) {
    return this.sessionManager.logout(username, sessionId);
  }

  async sendEmailCode(
    email: string,
    purpose: 'login' | 'register' | 'reset',
    locale: 'zh-CN' | 'en' = 'zh-CN' as const,
  ) {
    return this.emailAuth.sendEmailCode(email, purpose, locale);
  }

  async emailLogin(email: string, code: string, ip?: string, userAgent?: string) {
    return this.emailAuth.emailLogin(email, code, ip, userAgent);
  }

  async register(
    input:
      | {
          login_type: 'password';
          username: string;
          password: string;
          email?: string;
          nickname?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
        }
      | {
          login_type: 'email';
          email: string;
          code: string;
          username?: string;
          preferred_locale?: 'zh-CN' | 'en';
          nickname?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
        }
      | {
          login_type: 'github';
          code: string;
          username?: string;
          preferred_locale?: 'zh-CN' | 'en';
          nickname?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
        }
      | {
          login_type: 'google';
          code: string;
          username?: string;
          preferred_locale?: 'zh-CN' | 'en';
          nickname?: string;
          avatar_url?: string;
          bio?: string;
          location?: string;
        }
      | {
          login_type: 'wechat';
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
    switch (input.login_type) {
      case 'password':
        return this.passwordAuth.register(input, ip, userAgent);
      case 'email':
        return this.emailAuth.registerByEmail(input, ip, userAgent);
      case 'github':
      case 'google':
      case 'wechat':
        return this.oauthService.registerViaOAuth(input, ip, userAgent);
      default:
        throw new HTTPException(400, { message: 'Unsupported login type' });
    }
  }

  async emailResetPassword(email: string, code: string, password: string) {
    return this.emailAuth.emailResetPassword(email, code, password);
  }

  async createSessionAndTokens(
    ...args: Parameters<SessionManagerService['createSessionAndTokens']>
  ) {
    return this.sessionManager.createSessionAndTokens(...args);
  }

  async exchangeOAuthCode(provider: 'github' | 'google' | 'wechat', code: string) {
    if (provider === 'github') {
      return this.oauthService.exchangeGitHubCode(code);
    }
    throw new HTTPException(400, { message: `Unsupported OAuth provider: ${provider}` });
  }

  async updateUserProfileFields(
    userId: string,
    fields: { avatar_url?: string; nickname?: string; website?: string; location?: string },
  ) {
    return this.sessionManager.updateUserProfileFields(userId, fields);
  }

  async recordAuditLogin(actorId: string, username: string, loginType: string, ip?: string) {
    return this.sessionManager.recordAuditLogin(actorId, username, loginType, ip);
  }

  async recordAuditRegister(actorId: string, username: string, loginType: string) {
    return this.sessionManager.recordAuditRegister(actorId, username, loginType);
  }

  async recordAuditBind(actorId: string, provider: string) {
    return this.sessionManager.recordAuditBind(actorId, provider);
  }
}

export default AuthService;
