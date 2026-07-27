import { Inject, Service } from '@rx-ted/packages-honest';
import { CounterService } from '@rx-ted/packages-honest-plugins/counter';
import { eq, sql } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postStats } from '@/schema';

const COUNTER_KEYS = {
  views: (postId: number) => `stats:v:${postId}`,
  likes: (postId: number) => `stats:l:${postId}`,
  comments: (postId: number) => `stats:c:${postId}`,
} as const;

@Service()
export class StatsBufferService {
  constructor(
    @Inject(CounterService) private counter: CounterService,
    @Inject(DbService) private db: DbService,
  ) {}

  async recordView(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.views(postId));
  }

  async recordLike(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.likes(postId));
  }

  async recordComment(postId: number): Promise<void> {
    await this.counter.increment(COUNTER_KEYS.comments(postId));
  }

  async getBufferedStats(
    postId: number,
  ): Promise<{ views: number; likes: number; comments: number }> {
    const [views, likes, comments] = await this.counter.mget([
      COUNTER_KEYS.views(postId),
      COUNTER_KEYS.likes(postId),
      COUNTER_KEYS.comments(postId),
    ]);
    return { views, likes, comments };
  }

  async flushPostStats(postId: number): Promise<void> {
    const viewsPending = await this.counter.pending(COUNTER_KEYS.views(postId));
    const likesPending = await this.counter.pending(COUNTER_KEYS.likes(postId));
    const commentsPending = await this.counter.pending(COUNTER_KEYS.comments(postId));

    if (!viewsPending && !likesPending && !commentsPending) return;

    const [existing] = await this.db
      .select()
      .from(postStats)
      .where(eq(postStats.postId, postId))
      .limit(1);

    if (!existing) {
      await this.db.insert(postStats).values({
        postId,
        viewCount: viewsPending,
        likeCount: likesPending,
        commentCount: commentsPending,
      });
    } else {
      if (viewsPending) {
        await this.db
          .update(postStats)
          .set({ viewCount: sql`view_count + ${viewsPending}` })
          .where(eq(postStats.postId, postId));
      }
      if (likesPending) {
        await this.db
          .update(postStats)
          .set({ likeCount: sql`like_count + ${likesPending}` })
          .where(eq(postStats.postId, postId));
      }
      if (commentsPending) {
        await this.db
          .update(postStats)
          .set({ commentCount: sql`comment_count + ${commentsPending}` })
          .where(eq(postStats.postId, postId));
      }
    }

    await Promise.all([
      this.counter.flush(COUNTER_KEYS.views(postId)),
      this.counter.flush(COUNTER_KEYS.likes(postId)),
      this.counter.flush(COUNTER_KEYS.comments(postId)),
    ]);
  }

  async flushAll(): Promise<number> {
    const result = await this.counter.flushAll();
    return result.flushed;
  }
}
