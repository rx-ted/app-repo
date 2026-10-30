import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@rx-ted/packages-honest';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ROLES } from '@/constants';
import OutboxService from '@/modules/outbox/outbox.service';
import OutboxProcessorService from '@/modules/outbox/outbox-processor.service';

@UseGuards(AuthGuard, RolesGuard)
@Roles(ROLES.ADMIN)
@Controller('outbox', { tag: { name: 'Outbox', description: 'Outbox 事件管理' } })
export class OutboxController {
  constructor(
    @Inject(OutboxService) private readonly outboxService: OutboxService,
    @Inject(OutboxProcessorService) private readonly processor: OutboxProcessorService,
  ) {}

  @Get('', { apiDoc: { summary: '列出 Outbox 事件', tags: ['Outbox'] } })
  async list(@Query('status') status?: string, @Query('limit') limit?: string) {
    return this.outboxService.list(status, limit ? Number(limit) : 20);
  }

  @Post('process', { apiDoc: { summary: '手动处理 pending 事件', tags: ['Outbox'] } })
  async process() {
    await this.processor.runOnce(20);
    return { ok: true };
  }

  @Post(':id/retry', { apiDoc: { summary: '重试 Outbox 事件', tags: ['Outbox'] } })
  async retry(@Param('id') id: string) {
    await this.outboxService.retry(id);
    return { ok: true };
  }
}

export default OutboxController;
