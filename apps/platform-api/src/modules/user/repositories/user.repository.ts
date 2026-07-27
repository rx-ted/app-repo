import { eq, count, desc } from 'drizzle-orm';
import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { computeOffset } from '@/common/utils/pagination';
import { users, userProfiles } from '@/schema';
import type {
  UserEntity,
  UserProfileEntity,
  UserPublicProfileEntity,
} from '@/modules/user/entities/user.entity';
import { CACHE } from '@/constants';

export interface UserModuleRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  getProfile(userId: string): Promise<UserProfileEntity | null>;
  getPublicProfile(username: string): Promise<UserPublicProfileEntity | null>;
  updateProfile(
    userId: string,
    data: Partial<UserProfileEntity>,
  ): Promise<UserProfileEntity | null>;
  list(page: number, pageSize: number): Promise<{ data: UserEntity[]; total: number }>;
}

@Service()
class UserRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async findById(id: string): Promise<UserEntity | null> {
    return cacheable(this.cache, `user:id:${id}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!result.length) return null;
      const u = result[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        loginType: u.loginType,
        preferredLocale: u.preferredLocale,
        status: u.status!,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      };
    });
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return cacheable(this.cache, `user:username:${username}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (!result.length) return null;
      const u = result[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        loginType: u.loginType,
        preferredLocale: u.preferredLocale,
        status: u.status!,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      };
    });
  }

  async getProfile(userId: string): Promise<UserProfileEntity | null> {
    return cacheable(this.cache, `user:profile:${userId}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await (this.db.select().from(users as any) as any)
        .leftJoin(userProfiles as any, eq((users as any).id, (userProfiles as any).userId))
        .where(eq((users as any).id, userId))
        .limit(1);
      if (!result.length) return null;
      const { users: u, user_profiles: p } = result[0] as any;
      return {
        id: u.id,
        username: u.username,
        githubConnected: false,
        preferredLocale: u.preferredLocale,
        nickname: p?.nickname ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        gender: p?.gender ?? null,
        birthday: p?.birthday ?? null,
        bio: p?.bio ?? null,
        website: p?.website ?? null,
        location: p?.location ?? null,
        updatedAt: (p?.updatedAt ?? u.updatedAt).toISOString(),
      };
    });
  }

  async getPublicProfile(username: string): Promise<UserPublicProfileEntity | null> {
    return cacheable(this.cache, `user:public:${username}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await (this.db.select().from(users as any) as any)
        .leftJoin(userProfiles as any, eq((users as any).id, (userProfiles as any).userId))
        .where(eq((users as any).username, username))
        .limit(1);
      if (!result.length) return null;
      const { users: u, user_profiles: p } = result[0] as any;
      return {
        id: u.id,
        username: u.username,
        githubConnected: false,
        preferredLocale: u.preferredLocale,
        nickname: p?.nickname ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        gender: p?.gender ?? null,
        birthday: p?.birthday ?? null,
        bio: p?.bio ?? null,
        website: p?.website ?? null,
        location: p?.location ?? null,
        updatedAt: (p?.updatedAt ?? u.updatedAt).toISOString(),
        createdAt: u.createdAt.toISOString(),
      };
    });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    await this.db
      .update(users)
      .set({ email: email.toLowerCase(), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await this.cache.delete(`user:id:${userId}`);
  }

  async updateProfile(
    userId: string,
    data: Partial<UserProfileEntity>,
  ): Promise<UserProfileEntity | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birthday !== undefined) updateData.birthday = data.birthday;

    await this.db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
    await this.cache.delete(`user:profile:${userId}`);
    await this.cache.delete(`user:public:${userId}`);
    return this.getProfile(userId);
  }

  async getFullUserProfile(userId: string): Promise<{
    id: string;
    username: string;
    email: string | null;
    preferredLocale: 'zh-CN' | 'en';
    status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
    tokenVersion: number;
    lastLoginAt: string | null;
    nickname: string | null;
    avatarUrl: string | null;
    gender: 'Male' | 'Female' | 'Unknown' | null;
    birthday: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
    createdAt: string;
  } | null> {
    return cacheable(this.cache, `user:full:${userId}`, CACHE.USER_SESSION_TTL, async () => {
      const result = await (this.db.select().from(users as any) as any)
        .leftJoin(userProfiles as any, eq((users as any).id, (userProfiles as any).userId))
        .where(eq((users as any).id, userId))
        .limit(1);
      if (!result.length) return null;
      const { users: u, user_profiles: p } = result[0] as any;
      return {
        id: u.id,
        username: u.username,
        email: u.email ?? null,
        preferredLocale: u.preferredLocale,
        status: u.status,
        tokenVersion: u.tokenVersion ?? 0,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        nickname: p?.nickname ?? null,
        avatarUrl: p?.avatarUrl ?? null,
        gender: p?.gender ?? null,
        birthday: p?.birthday ?? null,
        bio: p?.bio ?? null,
        website: p?.website ?? null,
        location: p?.location ?? null,
        createdAt: u.createdAt.toISOString(),
      };
    });
  }

  async list(page: number, pageSize: number): Promise<{ data: UserEntity[]; total: number }> {
    return cacheable(
      this.cache,
      `user:list:${page}:${pageSize}`,
      CACHE.USER_SESSION_TTL,
      async () => {
        const [totalResult] = await this.db.select({ total: count() }).from(users);
        const total = totalResult.total;
        const result = await this.db
          .select()
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(pageSize)
          .offset(computeOffset({ page, pageSize }));
        return {
          data: result.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            loginType: u.loginType,
            preferredLocale: u.preferredLocale,
            status: u.status!,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          })),
          total,
        };
      },
    );
  }
}

export { UserRepository };
