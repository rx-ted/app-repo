import { and, eq } from 'drizzle-orm';
import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import generateStupidName from 'sillyname';
import {
  users,
  userAuth,
  userProfiles,
  userOauth,
  userRoleMappings,
  roles,
  userPermissionMappings,
  rolePermissionMappings,
  permissions,
} from '@/schema';
import type { AuthEntity, SessionEntity } from '@/modules/auth/entities/auth.entity';
import { CACHE } from '@/constants/cache';
import { CACHE_KEYS, LOCALE, ROLES, USER_STATUS } from '@/constants';

const DEFAULT_AVATAR = (username: string) =>
  `https://api.dicebear.com/10.x/adventurer-neutral/svg?seed=${username}`;

@Service()
class AuthRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async getSessionUser(): Promise<SessionEntity | null> {
    return null;
  }

  async getSessionUserByUsername(username: string): Promise<AuthEntity | null> {
    return cacheable(
      this.cache,
      CACHE_KEYS.authSession(username),
      CACHE.USER_SESSION_TTL,
      async () => {
        const [user] = await this.db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (!user) return null;

        const roleRows = await this.db
          .select({ name: roles.name })
          .from(userRoleMappings)
          .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
          .where(eq(userRoleMappings.userId, user.id));

        const permRows = await this.db
          .select({
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(userPermissionMappings)
          .innerJoin(permissions, eq(userPermissionMappings.permissionId, permissions.id))
          .where(eq(userPermissionMappings.userId, user.id));

        const rolePermRows = await this.db
          .select({
            resource: permissions.resource,
            action: permissions.action,
            scope: permissions.scope,
          })
          .from(userRoleMappings)
          .innerJoin(
            rolePermissionMappings,
            eq(userRoleMappings.roleId, rolePermissionMappings.roleId),
          )
          .innerJoin(permissions, eq(rolePermissionMappings.permissionId, permissions.id))
          .where(eq(userRoleMappings.userId, user.id));

        const allPerms = [
          ...permRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
          ...rolePermRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
        ];

        return {
          userId: user.id,
          username: user.username,
          email: user.email ?? null,
          passwordHash: user.passwordHash ?? null,
          roles: roleRows.map((r) => r.name),
          permissions: [...new Set(allPerms)],
          tokenVersion: user.tokenVersion ?? 0,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          preferredLocale: user.preferredLocale as 'zh-CN' | 'en',
          status: user.status as 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED',
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      },
    );
  }

  async findByUsername(username: string): Promise<boolean> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return !!user;
  }

  async createUser(
    username: string,
    loginType: 'password' | 'email' | 'google' | 'github' | 'wechat',
    params: {
      passwordHash?: string;
      email?: string;
      nickname?: string;
      avatarUrl?: string;
      website?: string;
      bio?: string;
      location?: string;
      preferredLocale?: 'zh-CN' | 'en';
    },
    adminUsers: string[] = [],
  ): Promise<AuthEntity> {
    const now = new Date();
    const id = `usr_${crypto.randomUUID().replace(/-/g, '')}`;
    const locale = params.preferredLocale ?? LOCALE.DEFAULT;
    const safeEmail = params.email?.toLowerCase();

    await this.db.insert(users).values({
      id,
      username,
      passwordHash: params.passwordHash ?? null,
      email: safeEmail,
      loginType,
      preferredLocale: locale,
      status: USER_STATUS.NORMAL,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });

    const nickname = params.nickname ?? generateStupidName();
    const avatarUrl = params.avatarUrl ?? DEFAULT_AVATAR(username);
    const bio =
      params.bio ??
      (locale === 'zh-CN'
        ? '用户很懒，没有留下简介。'
        : "The user was lazy and didn't leave a description.");
    const location = params.location ?? '';

    const website = params.website ?? '';

    await this.db.insert(userProfiles).values({
      userId: id,
      nickname,
      avatarUrl,
      website,
      bio,
      location,
      updatedAt: now,
    });

    if (loginType === 'password') {
      await this.db.insert(userAuth).values({
        userId: id,
        type: 'password',
        identifier: username,
        credential: params.passwordHash ?? null,
      });
      if (safeEmail) {
        await this.db.insert(userAuth).values({
          userId: id,
          type: 'email',
          identifier: safeEmail,
        });
      }
    } else if (loginType === 'email') {
      await this.db.insert(userAuth).values({
        userId: id,
        type: 'email',
        identifier: params.email!.toLowerCase(),
      });
    } else {
      await this.db.insert(userAuth).values({
        userId: id,
        type: 'password',
        identifier: username,
      });
    }

    const isAdmin =
      adminUsers.includes(username) || (safeEmail ? adminUsers.includes(safeEmail) : false);

    if (isAdmin) {
      const elevated = await this.elevateToAdmin(id);
      await this.cache.delete(CACHE_KEYS.authSession(username));
      return {
        userId: id,
        username,
        email: safeEmail ?? null,
        passwordHash: params.passwordHash ?? null,
        roles: elevated.roleNames,
        permissions: elevated.permCodes,
        tokenVersion: 0,
        lastLoginAt: null,
        preferredLocale: locale,
        status: USER_STATUS.NORMAL,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    }

    const [userRole] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, ROLES.USER))
      .limit(1);
    if (userRole) {
      await this.db.insert(userRoleMappings).values({ userId: id, roleId: userRole.id });
    }

    const [readPerm] = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.action, 'read'))
      .limit(1);
    if (readPerm) {
      await this.db
        .insert(userPermissionMappings)
        .values({ userId: id, permissionId: readPerm.id });
    }

    const roleNames = userRole ? [ROLES.USER] : [];
    const permCodes = readPerm ? ['read'] : [];

    await this.cache.delete(CACHE_KEYS.authSession(username));

    return {
      userId: id,
      username,
      email: safeEmail ?? null,
      passwordHash: params.passwordHash ?? null,
      roles: roleNames,
      permissions: permCodes,
      tokenVersion: 0,
      lastLoginAt: null,
      preferredLocale: locale,
      status: USER_STATUS.NORMAL,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return cacheable(this.cache, CACHE_KEYS.authPerms(userId), CACHE.USER_PERMS_TTL, async () => {
      const directRows = await this.db
        .select({
          resource: permissions.resource,
          action: permissions.action,
          scope: permissions.scope,
        })
        .from(userPermissionMappings)
        .innerJoin(permissions, eq(userPermissionMappings.permissionId, permissions.id))
        .where(eq(userPermissionMappings.userId, userId));

      const roleRows = await this.db
        .select({
          resource: permissions.resource,
          action: permissions.action,
          scope: permissions.scope,
        })
        .from(userRoleMappings)
        .innerJoin(
          rolePermissionMappings,
          eq(userRoleMappings.roleId, rolePermissionMappings.roleId),
        )
        .innerJoin(permissions, eq(rolePermissionMappings.permissionId, permissions.id))
        .where(eq(userRoleMappings.userId, userId));

      const allPerms = [
        ...directRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
        ...roleRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
      ];

      return [...new Set(allPerms)];
    });
  }

  async getUserByEmail(email: string): Promise<AuthEntity | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (!user) return null;

    const roleRows = await this.db
      .select({ name: roles.name })
      .from(userRoleMappings)
      .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
      .where(eq(userRoleMappings.userId, user.id));

    const permRows = await this.db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        scope: permissions.scope,
      })
      .from(userPermissionMappings)
      .innerJoin(permissions, eq(userPermissionMappings.permissionId, permissions.id))
      .where(eq(userPermissionMappings.userId, user.id));

    const rolePermRows = await this.db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        scope: permissions.scope,
      })
      .from(userRoleMappings)
      .innerJoin(rolePermissionMappings, eq(userRoleMappings.roleId, rolePermissionMappings.roleId))
      .innerJoin(permissions, eq(rolePermissionMappings.permissionId, permissions.id))
      .where(eq(userRoleMappings.userId, user.id));

    const allPerms = [
      ...permRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
      ...rolePermRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
    ];

    return {
      userId: user.id,
      username: user.username,
      email: user.email ?? null,
      passwordHash: user.passwordHash ?? null,
      roles: roleRows.map((r) => r.name),
      permissions: [...new Set(allPerms)],
      tokenVersion: user.tokenVersion ?? 0,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      preferredLocale: user.preferredLocale as 'zh-CN' | 'en',
      status: user.status as 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.email, normalizedEmail));

    const [user] = await this.db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (user) {
      await this.cache.delete(CACHE_KEYS.authSession(user.username));
    }
  }

  async invalidateSession(username: string): Promise<void> {
    await this.cache.delete(CACHE_KEYS.authSession(username));
  }

  async getUserProfile(userId: string): Promise<{
    nickname: string | null;
    avatarUrl: string | null;
    gender: 'Male' | 'Female' | 'Unknown' | null;
    birthday: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
  } | null> {
    const [profile] = await this.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    if (!profile) return null;
    return {
      nickname: profile.nickname ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      gender: (profile.gender as 'Male' | 'Female' | 'Unknown') ?? null,
      birthday: profile.birthday ?? null,
      bio: profile.bio ?? null,
      website: profile.website ?? null,
      location: profile.location ?? null,
    };
  }

  private async elevateToAdmin(
    userId: string,
  ): Promise<{ roleNames: string[]; permCodes: string[] }> {
    const [adminRole] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, ROLES.ADMIN))
      .limit(1);

    const allPermissions = await this.db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        scope: permissions.scope,
      })
      .from(permissions);

    if (adminRole) {
      await this.db.insert(userRoleMappings).values({ userId, roleId: adminRole.id });
    }

    for (const perm of allPermissions) {
      await this.db.insert(userPermissionMappings).values({ userId, permissionId: perm.id });
    }

    await this.cache.delete(CACHE_KEYS.authPerms(userId));

    return {
      roleNames: adminRole ? [ROLES.ADMIN] : [],
      permCodes: allPermissions.map((p) => p.name ?? `${p.resource}:${p.action}:${p.scope}`),
    };
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));

    const [user] = await this.db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (user) {
      await this.cache.delete(CACHE_KEYS.authSession(user.username));
    }
  }

  async updateProfile(
    userId: string,
    data: { avatar_url?: string; nickname?: string; website?: string; location?: string },
  ): Promise<void> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.location !== undefined) updateData.location = data.location;

    await this.db.update(userProfiles).set(updateData).where(eq(userProfiles.userId, userId));
  }

  async getUserByOAuthProvider(
    provider: 'github' | 'google' | 'wechat',
    providerUserId: string,
  ): Promise<AuthEntity | null> {
    const [link] = await this.db
      .select({ userId: userOauth.userId })
      .from(userOauth)
      .where(and(eq(userOauth.provider, provider), eq(userOauth.providerUserId, providerUserId)))
      .limit(1);
    if (!link) return null;
    return this.getSessionUserById(link.userId);
  }

  async getSessionUserById(userId: string): Promise<AuthEntity | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return null;

    const roleRows = await this.db
      .select({ name: roles.name })
      .from(userRoleMappings)
      .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
      .where(eq(userRoleMappings.userId, user.id));

    const permRows = await this.db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        scope: permissions.scope,
      })
      .from(userPermissionMappings)
      .innerJoin(permissions, eq(userPermissionMappings.permissionId, permissions.id))
      .where(eq(userPermissionMappings.userId, user.id));

    const rolePermRows = await this.db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        scope: permissions.scope,
      })
      .from(userRoleMappings)
      .innerJoin(rolePermissionMappings, eq(userRoleMappings.roleId, rolePermissionMappings.roleId))
      .innerJoin(permissions, eq(rolePermissionMappings.permissionId, permissions.id))
      .where(eq(userRoleMappings.userId, user.id));

    const allPerms = [
      ...permRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
      ...rolePermRows.map((p) => `${p.resource}:${p.action}:${p.scope}`),
    ];

    return {
      userId: user.id,
      username: user.username,
      email: user.email ?? null,
      passwordHash: user.passwordHash ?? null,
      roles: roleRows.map((r) => r.name),
      permissions: [...new Set(allPerms)],
      tokenVersion: user.tokenVersion ?? 0,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      preferredLocale: user.preferredLocale as 'zh-CN' | 'en',
      status: user.status as 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED',
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async getUserOAuthByProvider(
    userId: string,
    provider: 'github' | 'google' | 'wechat',
  ): Promise<{ providerUserId: string } | null> {
    const [link] = await this.db
      .select({ providerUserId: userOauth.providerUserId })
      .from(userOauth)
      .where(and(eq(userOauth.userId, userId), eq(userOauth.provider, provider)))
      .limit(1);
    return link ?? null;
  }

  async linkOAuthProvider(
    userId: string,
    provider: 'github' | 'google' | 'wechat',
    data: { providerUserId: string; accessToken?: string; refreshToken?: string },
  ): Promise<void> {
    await this.db.insert(userOauth).values({
      userId,
      provider,
      providerUserId: data.providerUserId,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      createdAt: new Date(),
    });
  }

  async assignUserPermission(userId: string, permissionCode: string): Promise<void> {
    const [resource] = permissionCode.split(':');
    const [perm] = await this.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.resource, resource))
      .limit(1);
    if (perm) {
      await this.db.insert(userPermissionMappings).values({ userId, permissionId: perm.id });
    }
    await this.cache.delete(CACHE_KEYS.authPerms(userId));
  }
}

export { AuthRepository };
