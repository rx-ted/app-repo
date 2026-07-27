import { Body, Controller, Delete, Get, Inject, Post, UseGuards } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { PermissionEntitySchema } from '@/modules/permission/entities/permission.entity';
import {
  CreatePermissionSchema,
  DeletePermissionSchema,
  PermissionListQuerySchema,
} from '@/modules/permission/dtos/permission.schema';
import PermissionService from '@/modules/permission/permission.service';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.PERMISSION_ACCESS_ANY)
@Controller('permission', {
  tag: { name: 'Permissions', description: '权限管理相关接口' },
})
export class PermissionController {
  constructor(@Inject(PermissionService) private readonly permissionService: PermissionService) {}

  @Get('', {
    apiDoc: {
      summary: '列出所有权限',
      tags: ['Permissions'],
      request: {
        query: PermissionListQuerySchema,
      },
      responses: {
        200: {
          description: '权限列表',
          schema: z.object({
            data: z.array(PermissionEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list() {
    return this.permissionService.list();
  }

  @Post('', {
    apiDoc: {
      summary: '创建或更新权限',
      tags: ['Permissions'],
      request: {
        body: CreatePermissionSchema,
      },
      responses: {
        201: {
          description: '权限创建/更新成功',
          schema: z.object({ affectedRows: z.number(), id: z.string().optional() }),
        },
      },
    },
  })
  async create(@Body() body: unknown) {
    return this.permissionService.upsert(
      body as Partial<
        import('@/modules/permission/entities/permission.entity.ts').PermissionEntity
      >,
    );
  }

  @Delete('', {
    apiDoc: {
      summary: '删除权限',
      tags: ['Permissions'],
      request: {
        body: DeletePermissionSchema,
      },
      responses: {
        200: {
          description: '权限删除成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async remove(@Body() body: { permission_id: number; target_user_id?: string }) {
    return this.permissionService.remove(body);
  }
}

export default PermissionController;
