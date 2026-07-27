import type {
  UserEntity,
  UserProfileEntity,
  UserPublicProfileEntity,
} from '@/modules/user/entities/user.entity';

export class UserMapper {
  static toSelfResponse(entity: UserEntity) {
    return {
      id: entity.id,
      username: entity.username,
      preferred_locale: entity.preferredLocale,
      status: entity.status,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      last_login_at: entity.lastLoginAt,
    };
  }

  static toProfileResponse(entity: UserProfileEntity) {
    return {
      id: entity.id,
      username: entity.username,
      github_connected: entity.githubConnected,
      preferred_locale: entity.preferredLocale,
      nickname: entity.nickname,
      avatar_url: entity.avatarUrl,
      bio: entity.bio,
      website: entity.website,
      location: entity.location,
      updated_at: entity.updatedAt,
    };
  }

  static toPublicProfileResponse(entity: UserPublicProfileEntity) {
    return {
      id: entity.id,
      username: entity.username,
      github_connected: entity.githubConnected,
      preferred_locale: entity.preferredLocale,
      nickname: entity.nickname,
      avatar_url: entity.avatarUrl,
      bio: entity.bio,
      created_at: entity.createdAt,
    };
  }

  static toAdminResponse(entity: UserEntity) {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      preferred_locale: entity.preferredLocale,
      status: entity.status,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      login_type: entity.loginType,
    };
  }
}

export default UserMapper;
