import { ComponentManager, Inject, Service } from '@rx-ted/packages-honest';
import {
  CounterService,
  COUNTER_PLUGIN_KEY,
  type CounterPlugin,
} from '@rx-ted/packages-honest-plugins/counter';
import { sql } from 'drizzle-orm';
import { CacheService } from '@rx-ted/packages-honest-plugins/cache';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postStats } from '@/schema';
import { CACHE_KEYS } from '@/constants';

const COUNTER_KEYS = {
  views: (postId: number) => `stats:v:${postId}`,
  likes: (postId: number) => `stats:l:${postId}`,
  comments: (postId: number) => `stats:c:${postId}`,
} as const;

type StatsKind = 'views' | 'likes' | 'comments';

const STATS_COLUMNS: Record<StatsKind, 'viewCount' | 'likeCount' | 'commentCount'> = {
  views: 'viewCount',
  likes: 'likeCount',
  comments: 'commentCount',
};

const FLUSH_PATTERNS: Record<StatsKind, string> = {
  views: 'stats:v:',
  likes: 'stats:l:',
  comments: 'stats:c:',
};

@Service()
export class StatsBufferService {
  constructor(
    @Inject(CounterService) private counter: CounterService,
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {
    this.registerFlushHandlers();
  }

  private registerFlushHandlers(): void {
    const plugin = ComponentManager.getPlugin<CounterPlugin>(COUNTER_PLUGIN_KEY);
    for (const kind of Object.keys(STATS_COLUMNS) as StatsKind[]) {
      plugin.registerFlushHandler(FLUSH_PATTERNS[kind], (key, delta) =>
        this.applyFlush(key, kind, delta),
      );
    }
  }

  private async applyFlush(key: string, kind: StatsKind, delta: number): Promise<void> {
    if (delta === 0) return;
    const postId = this.postIdFromKey(key);
    const zeroes = { viewCount: 0, likeCount: 0, commentCount: 0 };
    await this.db
      .insert(postStats)
      .values({ postId, ...zeroes, [STATS_COLUMNS[kind]]: delta })
      .onConflictDoUpdate({
        target: postStats.postId,
        set: { [STATS_COLUMNS[kind]]: sql`${postStats[STATS_COLUMNS[kind]]} + ${delta}` },
      });
    await this.cache.deleteByPattern(CACHE_KEYS.blogHomePattern);
  }

  async getBufferedTotals(): Promise<{ views: number; likes: number; comments: number }> {
    const totals = { views: 0, likes: 0, comments: 0 };
    const keys = await this.counter.pendingKeys();
    for (const key of keys) {
      if (key.startsWith(FLUSH_PATTERNS.views)) {
        totals.views += await this.counter.pending(key);
      } else if (key.startsWith(FLUSH_PATTERNS.likes)) {
        totals.likes += await this.counter.pending(key);
      } else if (key.startsWith(FLUSH_PATTERNS.comments)) {
        totals.comments += await this.counter.pending(key);
      }
    }
    return totals;
  }

  private postIdFromKey(key: string): number {
    return Number(key.split(':')[2]);
  }

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
