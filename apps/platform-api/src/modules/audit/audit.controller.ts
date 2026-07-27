import { Controller, Get, Inject, Param, Query, UseGuards } from '@rx-ted/packages-honest';
import { z } from '@/lib/openapi';
import { AuthGuard, RolesGuard, PermissionsGuard } from '@/common/guards';
import { Roles, Permissions } from '@/common/decorators';
import { PERMISSIONS, ROLES } from '@/constants';
import { AuditEntitySchema } from '@/modules/audit/entities/audit.entity';
import AuditService from '@/modules/audit/audit.service';
import { AuditListQuerySchema } from '@/modules/audit/dtos/audit.schema';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Roles(ROLES.ADMIN)
@Permissions(PERMISSIONS.AUDIT_ACCESS_ANY)
@Controller('audit', {
  tag: { name: 'Audit', description: '审计日志相关接口' },
})
export class AuditController {
  constructor(@Inject(AuditService) private readonly auditService: AuditService) {}

  @Get('', {
    apiDoc: {
      summary: '列出所有审计日志',
      tags: ['Audit'],
      request: {
        query: AuditListQuerySchema,
      },
      responses: {
        200: {
          description: '审计日志列表',
          schema: z.object({
            data: z.array(AuditEntitySchema),
            total: z.number(),
          }),
        },
      },
    },
  })
  async list(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.auditService.list(page, pageSize);
  }

  @Get(':id', {
    apiDoc: {
      summary: '根据ID获取审计日志',
      tags: ['Audit'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '审计日志详情',
          schema: AuditEntitySchema,
        },
      },
    },
  })
  async getById(@Param('id') id: string) {
    return this.auditService.getById(id);
  }
}
