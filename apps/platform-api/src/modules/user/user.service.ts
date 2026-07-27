import { Inject, Service } from '@rx-ted/packages-honest';
import { HTTPException } from 'hono/http-exception';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';

import type { UserProfileEntity } from '@/modules/user/entities/user.entity';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { SessionRepository } from '@/modules/auth/repositories/session.repository';
import { toUserProfile, type UserProfile } from '@/modules/auth/auth.do';
import { AUTH } from '@/constants/auth';
import { DEFAULTS, LOCALE } from '@/constants';
import MailService from '@/modules/mail/mail.service';
import { AuthRepository } from '@/modules/auth/repositories/auth.repository';
import AuditService from '@/modules/audit/audit.service';
import { generateEmailCode, codeCacheKey, cooldownCacheKey } from '@/modules/auth/auth.utils';

@Service()
class UserService {
  constructor(
    @Inject(UserRepository) private userRepo: UserRepository,
    @Inject(SessionRepository) private sessionRepo: SessionRepository,
    @Inject(CacheService) private cache: CacheService,
    @Inject(MailService) private mailService: MailService,
    @Inject(AuthRepository) private authRepo: AuthRepository,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  async heartbeat(sessionId: string): Promise<void> {
    await this.sessionRepo.updateLastActiveAt(sessionId);
  }

  async getSelfProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepo.getFullUserProfile(userId);
    if (!user) return null;
    return toUserProfile({
      userId: user.id,
      username: user.username,
      email: user.email,
      preferredLocale: user.preferredLocale,
      status: user.status,
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      gender: user.gender,
      birthday: user.birthday,
      bio: user.bio,
      website: user.website,
      location: user.location,
    });
  }

  async updateProfile(userId: string, input: Partial<UserProfileEntity>) {
    const profile = await this.userRepo.updateProfile(userId, input);
    if (!profile) return null;

    await this.audit.record({
      actor_id: userId,
      action: 'user.profile.update',
      target_type: 'user',
      target_id: userId,
      status: 'SUCCESS',
      meta: { updated_fields: Object.keys(input as Record<string, unknown>) },
    });

    return { id: profile.id };
  }

  async sendEmailChangeCode(userId: string, newEmail: string) {
    const cooldownKey = cooldownCacheKey(newEmail, 'register');
    const existing = await this.cache.get(cooldownKey);
    if (existing) {
      throw new HTTPException(429, { message: '请等待后重新发送验证码' });
    }

    const code = generateEmailCode();
    const codeKey = codeCacheKey(newEmail, 'register');
    await this.cache.set(codeKey, code, AUTH.EMAIL_CODE_TTL_SECONDS);
    await this.cache.set(cooldownKey, '1', AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS);

    await this.mailService.sendVerificationCode({
      to: newEmail,
      code,
      purpose: 'register',
      ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
      locale: LOCALE.DEFAULT,
    });

    return {
      ttlSeconds: AUTH.EMAIL_CODE_TTL_SECONDS,
      resendCooldownSeconds: AUTH.EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
    };
  }

  async updateEmail(userId: string, newEmail: string, code: string) {
    const codeKey = codeCacheKey(newEmail, 'register');
    const stored = await this.cache.get<string>(codeKey);
    if (!stored || stored !== code) {
      throw new HTTPException(401, { message: '验证码错误或已过期' });
    }

    const existing = await this.authRepo.getUserByEmail(newEmail.toLowerCase());
    if (existing && existing.userId !== userId) {
      throw new HTTPException(409, { message: '该邮箱已被其他用户使用' });
    }

    await this.cache.delete(codeKey);
    await this.userRepo.updateEmail(userId, newEmail);
    await this.authRepo.updateLastLoginAt(userId);

    await this.audit.record({
      actor_id: userId,
      action: 'user.email.update',
      target_type: 'user',
      target_id: userId,
      status: 'SUCCESS',
      meta: { email: newEmail },
    });

    return { success: true };
  }

  async getPublicProfile(username: string) {
    const profile = await this.userRepo.getPublicProfile(username);
    if (!profile) return null;
    return {
      id: profile.id,
      username: profile.username,
      github_connected: profile.githubConnected,
      preferred_locale: profile.preferredLocale,
      nickname: profile.nickname,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      created_at: profile.updatedAt,
    };
  }

  async getBrief(userId: string, currentUserId?: string) {
    const profile = await this.userRepo.getProfile(userId);
    if (!profile) return null;
    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.nickname,
      avatar: profile.avatarUrl,
      level: 0,
      bio: profile.bio,
      website: profile.website,
      location: profile.location,
      joinDate: profile.updatedAt ?? new Date().toISOString(),
      followerCount: 0,
      followingCount: 0,
      likeReceivedCount: 0,
      isFollowed: false,
    };
  }

  async list(page: number = 1, pageSize: number = DEFAULTS.MAX_PAGE_SIZE) {
    const result = await this.userRepo.list(page, pageSize);
    return {
      data: result.data.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        preferred_locale: user.preferredLocale,
        status: user.status,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
        login_type: user.loginType,
      })),
      total: result.total,
    };
  }
}

export default UserService;
