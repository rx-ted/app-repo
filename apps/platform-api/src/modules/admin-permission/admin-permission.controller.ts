import { Body, Controller, Inject, Post, UseGuards, Var } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import {
  GrantPermissionsSchema,
  RevokePermissionsSchema,
} from '@/modules/admin-permission/dtos/admin-permission.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import AdminPermissionService from '@/modules/admin-permission/admin-permission.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.PERMISSION_ACCESS_ANY)
@Controller('admin/user-permissions', {
  tag: { name: 'Admin', description: '管理员用户权限管理接口' },
})
export class AdminPermissionController {
  constructor(
    @Inject(AdminPermissionService)
    private readonly adminPermissionService: AdminPermissionService,
  ) {}

  @Post('grant', {
    apiDoc: {
      summary: '为用户授予权限',
      tags: ['Admin', 'Permission'],
      request: { body: GrantPermissionsSchema },
      responses: {
        200: {
          description: '权限授予成功',
          schema: z.object({
            granted: z.number(),
            skipped: z.number(),
          }),
        },
      },
    },
  })
  async grant(
    @Body() body: { userId: string; permissionIds: number[] },
    @Var('user') user: AuthEntity,
  ) {
    return this.adminPermissionService.grantPermissions(
      user.userId,
      body.userId,
      body.permissionIds,
    );
  }

  @Post('revoke', {
    apiDoc: {
      summary: '撤销用户权限',
      tags: ['Admin', 'Permission'],
      request: { body: RevokePermissionsSchema },
      responses: {
        200: {
          description: '权限撤销成功',
          schema: z.object({ revoked: z.number() }),
        },
      },
    },
  })
  async revoke(
    @Body() body: { userId: string; permissionIds: number[] },
    @Var('user') user: AuthEntity,
  ) {
    return this.adminPermissionService.revokePermissions(
      user.userId,
      body.userId,
      body.permissionIds,
    );
  }
}

export default AdminPermissionController;
