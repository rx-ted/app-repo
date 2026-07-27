import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { HTTPException } from 'hono/http-exception';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import { LOCALE } from '@/constants';
import { LOGIN_TYPES } from '@/constants';
import { envParams } from '@/constants';
import { AUTH } from '@/constants/auth';
import MailService from '@/modules/mail/mail.service';
import {
  generateEmailCode,
  codeCacheKey,
  cooldownCacheKey,
  hashPassword,
} from '@/modules/auth/auth.utils';
import SessionManagerService from '@/modules/auth/services/session-manager.service';

@Service()
class EmailAuthService {
  constructor(
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(SessionManagerService) private sessionManager: SessionManagerService,
    @Inject(CacheService) private cache: CacheService,
    @Inject(MailService) private mailService: MailService,
  ) {}

  private async verifyEmailCode(email: string, code: string, purpose: string) {
    const codeKey = codeCacheKey(email, purpose);
    const stored = await this.cache.get<string>(codeKey);
    if (!stored || stored !== code) {
      throw new HTTPException(401, { message: '验证码错误或已过期' });
    }
  }

  async sendEmailCode(
    email: string,
    purpose: 'login' | 'register' | 'reset',
    locale: 'zh-CN' | 'en' = LOCALE.DEFAULT,
  ) {
    const cooldownKey = cooldownCacheKey(email, purpose);
    const existing = await this.cache.get(cooldownKey);
    if (existing) {
      throw new HTTPException(429, { message: '请等待后重新发送验证码' });
    }

    const code = generateEmailCode();
    const codeKey = codeCacheKey(email, purpose);
    await this.cache.set(codeKey, code, AUTH.EMAIL_CODE_TTL_SECONDS);
    await this.cache.set(cooldownKey, '1', AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS);

    if (purpose !== 'reset') {
      await this.mailService.sendVerificationCode({
        to: email,
        code,
        purpose: purpose as 'login' | 'register',
        ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
        locale,
      });
    }

    return {
      ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
      resendCooldownSeconds: AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
    };
  }

  async emailLogin(email: string, code: string, ip?: string, userAgent?: string) {
    await this.verifyEmailCode(email, code, 'login');

    const user = await this.authRepo.getUserByEmail(email);
    if (!user) {
      throw new HTTPException(401, { message: '该邮箱未注册' });
    }

    await this.cache.delete(codeCacheKey(email, 'login'));

    await this.authRepo.updateLastLoginAt(user.userId);
    await this.sessionManager.recordAuditLogin(user.userId, user.username, 'email', ip);

    return this.sessionManager.createSessionAndTokens(user, ip, userAgent);
  }

  async registerByEmail(
    input: {
      login_type: 'email';
      email: string;
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
    await this.verifyEmailCode(input.email, input.code, 'register');

    const displayName = input.username ?? input.email.split('@')[0];
    const locale = input.preferred_locale ?? LOCALE.DEFAULT;
    const user = await this.authRepo.createUser(
      displayName,
      LOGIN_TYPES.EMAIL,
      {
        email: input.email,
        nickname: input.nickname,
        avatarUrl: input.avatar_url,
        bio: input.bio,
        location: input.location,
        preferredLocale: locale,
      },
      envParams.ADMIN_USERS,
    );

    await this.cache.delete(codeCacheKey(input.email, 'register'));

    return this.sessionManager.createSessionAndTokens(user, ip, userAgent);
  }

  async emailResetPassword(email: string, code: string, password: string) {
    await this.verifyEmailCode(email, code, 'reset');

    const passwordHash = await hashPassword(password);
    await this.authRepo.updatePasswordByEmail(email, passwordHash);

    await this.cache.delete(codeCacheKey(email, 'reset'));

    return { success: true };
  }
}

export default EmailAuthService;
