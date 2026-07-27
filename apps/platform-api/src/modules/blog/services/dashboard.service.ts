import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import {
  postCore,
  postStats,
  users,
  notifications,
  userProfiles,
  userRoleMappings,
  roles,
  userPermissionMappings,
  permissions,
} from '@/schema';
import type { BlogDashboardResponse } from '@/modules/blog/dtos/blog.response.dto';
import { BlogMapper } from '@/modules/blog/mappers/blog.mapper';
@Service()
export class DashboardService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async getMine(userId?: string): Promise<BlogDashboardResponse> {
    return this.getDashboard(userId);
  }

  async getDashboard(userId?: string): Promise<BlogDashboardResponse> {
    const uid = userId ?? '';
    return cacheable(this.cache, `blog:dashboard:${uid}`, 60, async () => {
      const [me] = userId
        ? await this.db.select().from(users).where(eq(users.id, userId)).limit(1)
        : await this.db.select().from(users).limit(1);
      if (!me) {
        return {
          me: {
            id: '',
            username: '',
            roles: [],
            created_at: '',
            last_login_at: null,
            nickname: null,
            avatar_url: null,
            bio: null,
            website: null,
          },
          posts: { list: [], total: 0 },
          stats: { days: 0, views: 0, likes: 0, comments: 0 },
          notifications: { unreadCount: 0, recent: [] },
          activity: [],
          permissions: [],
        };
      }

      const [profile] = await this.db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, me.id))
        .limit(1);

      const roleRows = await this.db
        .select({ name: roles.name })
        .from(userRoleMappings)
        .innerJoin(roles, eq(userRoleMappings.roleId, roles.id))
        .where(eq(userRoleMappings.userId, me.id));

      const permRows = await this.db
        .select({ resource: permissions.resource, action: permissions.action })
        .from(userPermissionMappings)
        .innerJoin(permissions, eq(userPermissionMappings.permissionId, permissions.id))
        .where(eq(userPermissionMappings.userId, me.id));

      const postRows: any[] = await this.db
        .select()
        .from(postCore)
        .leftJoin(postStats, eq(postCore.id, postStats.postId))
        .where(eq(postCore.userId, me.id))
        .orderBy(desc(postCore.createdAt));

      const [viewsResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.viewCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.userId, me.id));
      const [likesResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.likeCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.userId, me.id));
      const [commentsResult] = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${postStats.commentCount}), 0)` })
        .from(postStats)
        .innerJoin(postCore, eq(postCore.id, postStats.postId))
        .where(eq(postCore.userId, me.id));

      const notifSummary = await this.db
        .select({ value: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, me.id), eq(notifications.isRead, false)));
      const recentNotifs = await this.db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, me.id))
        .orderBy(desc(notifications.createdAt))
        .limit(5);

      const recentPosts = await this.db
        .select({
          id: postCore.id,
          title: postCore.title,
          slug: postCore.slug,
          updatedAt: postCore.updatedAt,
        })
        .from(postCore)
        .where(eq(postCore.userId, me.id))
        .orderBy(desc(postCore.updatedAt))
        .limit(10);

      const postActivity = recentPosts.map((p) => ({
        id: `post-${p.id}`,
        type: 'post.updated' as const,
        title: p.title,
        description: null,
        slug: p.slug,
        created_at: p.updatedAt.toISOString(),
      }));

      const notifActivity = recentNotifs.map((n) => ({
        id: `notif-${n.id}`,
        type: 'notification' as const,
        title: n.title ?? n.content ?? '',
        description: n.content ?? null,
        slug: null,
        created_at: n.createdAt.toISOString(),
      }));

      const mergedActivity = [...postActivity, ...notifActivity]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20);

      const daysSinceJoined = Math.floor(
        (Date.now() - me.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        me: {
          id: me.id,
          username: me.username,
          roles: roleRows.map((r) => r.name),
          created_at: me.createdAt.toISOString(),
          last_login_at: me.lastLoginAt?.toISOString() ?? null,
          nickname: profile?.nickname ?? null,
          avatar_url: profile?.avatarUrl ?? null,
          bio: profile?.bio ?? null,
          website: profile?.website ?? null,
        },
        posts: {
          list: postRows.map((r) => BlogMapper.mapPostRow(r.postCore, me, r.postStats)),
          total: postRows.length,
        },
        stats: {
          days: daysSinceJoined,
          views: Number(viewsResult.total),
          likes: Number(likesResult.total),
          comments: Number(commentsResult.total),
        },
        notifications: {
          unreadCount: notifSummary[0]?.value ?? 0,
          recent: recentNotifs.map((n) => ({
            id: n.id,
            type: n.type ?? 'notification',
            content: n.content ?? n.title ?? '',
            is_read: n.isRead ?? false,
            created_at: n.createdAt.toISOString(),
          })),
        },
        activity: mergedActivity,
        permissions: permRows.map((p) => `${p.resource}:${p.action}`),
      };
    });
  }
}
