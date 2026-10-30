import { Controller, Ctx, Get, Inject, Param, Post, UseGuards } from '@rx-ted/packages-honest';
import type { Context } from 'hono';
import { z } from '@/lib/openapi';
import { AuthGuard } from '@/common/guards';
import {
  NotificationResponseSchema,
  NotificationSummaryResponseSchema,
} from '@/modules/notification/dtos/notification.response.dto';
import NotificationService from '@/modules/notification/notification.service';

function getUserId(c: Context): string {
  return (c.get('user') as { userId: string }).userId;
}

@UseGuards(AuthGuard)
@Controller('notification', {
  tag: { name: 'Notifications', description: '通知相关接口' },
})
export class NotificationController {
  constructor(
    @Inject(NotificationService) private readonly notificationService: NotificationService,
  ) {}

  @Get('me', {
    apiDoc: {
      summary: '列出我的通知',
      tags: ['Notifications'],
      responses: {
        200: {
          description: '我的通知列表',
          schema: z.array(NotificationResponseSchema),
        },
      },
    },
  })
  async listMine(@Ctx() c: Context) {
    return this.notificationService.listMine(getUserId(c));
  }

  @Get('me/summary', {
    apiDoc: {
      summary: '获取通知摘要',
      tags: ['Notifications'],
      responses: {
        200: {
          description: '通知摘要',
          schema: NotificationSummaryResponseSchema,
        },
      },
    },
  })
  async getSummary(@Ctx() c: Context) {
    return this.notificationService.getSummary(getUserId(c));
  }

  @Post('read-all', {
    apiDoc: {
      summary: '标记所有通知为已读',
      tags: ['Notifications'],
      responses: {
        200: {
          description: '标记成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async markAllRead(@Ctx() c: Context) {
    return this.notificationService.markAllRead(getUserId(c));
  }

  @Post(':id/read', {
    apiDoc: {
      summary: '标记通知为已读',
      tags: ['Notifications'],
      request: {
        params: z.object({ id: z.string() }),
      },
      responses: {
        200: {
          description: '标记成功',
          schema: z.object({ affectedRows: z.number() }),
        },
      },
    },
  })
  async markRead(@Param('id') id: string, @Ctx() c: Context) {
    return this.notificationService.markRead(getUserId(c), Number(id));
  }
}

export default NotificationController;
