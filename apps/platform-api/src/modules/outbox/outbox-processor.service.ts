import { Inject, Service } from '@rx-ted/packages-honest';
import OutboxService from '@/modules/outbox/outbox.service';
import { CacheInvalidationService } from '@/modules/post/services/cache-invalidation.service';
import BlogService from '@/modules/blog/blog.service';

@Service()
class OutboxProcessorService {
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(OutboxService) private outbox: OutboxService,
    @Inject(CacheInvalidationService) private cacheInvalidator: CacheInvalidationService,
    @Inject(BlogService) private blogService: BlogService,
  ) {}

  private async handleEvent(event: { eventType: string; payloadJson: unknown }): Promise<void> {
    const payload = (event.payloadJson ?? {}) as Record<string, unknown>;
    switch (event.eventType) {
      case 'post.created':
      case 'post.updated':
      case 'post.published':
        if (typeof payload.slug === 'string') {
          await this.cacheInvalidator.invalidatePostRelated(payload.slug);
        } else {
          await this.cacheInvalidator.invalidatePostLists();
        }
        await this.blogService.refreshAggregates();
        break;
      case 'blog.aggregate.refresh':
        await this.blogService.refreshAggregates();
        break;
      default:
        break;
    }
  }

  async runOnce(limit = 20): Promise<void> {
    await this.outbox.processPending((event) => this.handleEvent(event), limit);
  }

  start(intervalMs = 5000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => undefined);
    }, intervalMs);
    void this.runOnce().catch(() => undefined);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

export default OutboxProcessorService;
