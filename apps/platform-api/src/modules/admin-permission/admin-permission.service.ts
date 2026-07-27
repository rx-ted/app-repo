import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, and } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { userPermissionMappings } from '@/schema';
import AuditService from '@/modules/audit/audit.service';
import { CACHE_KEYS } from '@/constants';

@Service()
class AdminPermissionService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(AuditService) private auditService: AuditService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async grantPermissions(
    actorId: string,
    userId: string,
    permissionIds: number[],
  ): Promise<{ granted: number; skipped: number }> {
    let granted = 0;
    let skipped = 0;

    const existingMappings = await this.db
      .select()
      .from(userPermissionMappings)
      .where(eq(userPermissionMappings.userId, userId));

    const existingPermIds = new Set(existingMappings.map((m) => m.permissionId));

    for (const permissionId of permissionIds) {
      if (existingPermIds.has(permissionId)) {
        skipped++;
        continue;
      }
      await this.db.insert(userPermissionMappings).values({ userId, permissionId });
      granted++;
    }

    await this.cache.delete(CACHE_KEYS.authPerms(userId));

    await this.auditService.record({
      actor_id: actorId,
      actor_role: null,
      action: 'admin.permission.grant',
      target_type: 'user',
      target_id: userId,
      status: 'SUCCESS',
      meta: {
        permission_ids: permissionIds,
        granted_count: granted,
        skipped_count: skipped,
      },
    });

    return { granted, skipped };
  }

  async revokePermissions(
    actorId: string,
    userId: string,
    permissionIds: number[],
  ): Promise<{ revoked: number }> {
    let revoked = 0;

    for (const permissionId of permissionIds) {
      const result = await this.db
        .delete(userPermissionMappings)
        .where(
          and(
            eq(userPermissionMappings.userId, userId),
            eq(userPermissionMappings.permissionId, permissionId),
          ),
        );

      if (result[0]?.affectedRows && result[0].affectedRows > 0) {
        revoked++;
      }
    }

    await this.cache.delete(CACHE_KEYS.authPerms(userId));

    await this.auditService.record({
      actor_id: actorId,
      actor_role: null,
      action: 'admin.permission.revoke',
      target_type: 'user',
      target_id: userId,
      status: 'SUCCESS',
      meta: {
        permission_ids: permissionIds,
        revoked_count: revoked,
      },
    });

    return { revoked };
  }
}

export default AdminPermissionService;
