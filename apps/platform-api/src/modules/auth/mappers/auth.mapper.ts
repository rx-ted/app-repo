import type { SessionEntity } from '@/modules/auth/entities/auth.entity';

export class AuthMapper {
  static toSessionResponse(entity: SessionEntity) {
    return {
      id: entity.userId,
      username: entity.username,
      preferred_locale: entity.preferredLocale,
      roles: entity.roles,
      permissions: entity.permissions,
      tokenVersion: entity.tokenVersion,
      last_login_at: entity.lastLoginAt,
      nickname: entity.nickname,
      avatar_url: entity.avatarUrl,
    };
  }
}

export default AuthMapper;
