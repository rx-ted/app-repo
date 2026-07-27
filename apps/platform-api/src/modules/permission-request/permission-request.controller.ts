import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
  Var,
} from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import {
  ApproveRejectSchema,
  CreatePermissionRequestSchema,
  PermissionRequestListQuerySchema,
} from '@/modules/permission-request/dtos/permission-request.schema';
import type { AuthEntity } from '@/modules/auth/entities/auth.entity';
import { PermissionRequestEntitySchema } from '@/modules/permission-request/entities/permission-request.entity';
import PermissionRequestService from '@/modules/permission-request/permission-request.service';

@Controller('permission-request', {
  tag: { name: 'PermissionRequests', description: '权限请求相关接口' },
})
class UserPermissionRequestController {
  constructor(
    @Inject(PermissionRequestService)
    private readonly permissionRequestService: PermissionRequestService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('', {
    apiDoc: {
      summary: '创建权限请求',
      tags: ['PermissionRequests'],
      request: {
        body: CreatePermissionRequestSchema,
      },
      responses: {
        201: {
          description: '权限请求创建成功',
          schema: PermissionRequestEntitySchema,
        },
      },
    },
  })
  async create(
    @Body() body: { permission_ids: number[]; reason?: string },
    @Var('user') user: AuthEntity,
  ) {
    return this.permissionRequestService.create(body, user.userId);
  }

  @UseGuards(AuthGuard)
  @Get('me', {
    apiDoc: {
      summary: '列出我的权限请求',
      tags: ['PermissionRequests'],
      responses: {
        200: {
          description: '我的权限请求列表',
          schema: z.array(PermissionRequestEntitySchema),
        },
      },
    },
  })
  async listMine(@Var('user') user: AuthEntity) {
    return this.permissionRequestService.listMine(user.userId);
  }
}

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.PERMISSION_REQUEST_ACCESS_ANY)
@Controller('permission-request', {
  tag: { name: 'PermissionRequests', description: '权限请求管理（管理端）' },
})
class AdminPermissionRequestController {
  constructor(
    @Inject(PermissionRequestService)
    private readonly permissionRequestService: PermissionRequestService,
  ) {}

  @Get('', {
    apiDoc: {
      summary: '列出所有权限请求',
      tags: ['PermissionRequests'],
      request: {
        query: PermissionRequestListQuerySchema,
      },
      responses: {
        200: {
          description: '权限请求列表',
          schema: z.object({
            data: z.array(PermissionRequestEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list() {
    return this.permissionRequestService.list();
  }

  @Post(':id/approve', {
    apiDoc: {
      summary: '批准权限请求',
      tags: ['PermissionRequests'],
      request: {
        params: z.object({ id: z.string() }),
        body: ApproveRejectSchema,
      },
      responses: {
        200: {
          description: '权限请求已批准',
          schema: PermissionRequestEntitySchema,
        },
      },
    },
  })
  async approve(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Var('user') user: AuthEntity,
  ) {
    return this.permissionRequestService.approve(id, body, user.userId);
  }

  @Post(':id/reject', {
    apiDoc: {
      summary: '拒绝权限请求',
      tags: ['PermissionRequests'],
      request: {
        params: z.object({ id: z.string() }),
        body: ApproveRejectSchema,
      },
      responses: {
        200: {
          description: '权限请求已拒绝',
          schema: PermissionRequestEntitySchema,
        },
      },
    },
  })
  async reject(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Var('user') user: AuthEntity,
  ) {
    return this.permissionRequestService.reject(id, body, user.userId);
  }

  @Delete(':id', {
    apiDoc: {
      summary: '删除权限请求',
      tags: ['PermissionRequests'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '权限请求删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async delete(@Param('id') id: string) {
    return this.permissionRequestService.delete(id);
  }
}

export { UserPermissionRequestController, AdminPermissionRequestController };
