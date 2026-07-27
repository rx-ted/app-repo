import { Inject, Service } from '@rx-ted/packages-honest';
import { eq } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { postStats } from '@/schema';
import type { PostStatsResponseDto } from '@/modules/post-stats/dtos/post-stats.response.dto';
import { PostStatsMapper } from '@/modules/post-stats/mappers/post-stats.mapper';
import { StatsBufferService } from '@/modules/post-stats/stats-buffer.service';

@Service()
export class PostStatsService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(StatsBufferService) private buffer: StatsBufferService,
  ) {}

  async getByPostId(postId: string): Promise<PostStatsResponseDto> {
    const numId = Number(postId);
    const [row] = await this.db
      .select()
      .from(postStats)
      .where(eq(postStats.postId, numId))
      .limit(1);

    const buf = await this.buffer.getBufferedStats(numId);

    const dbView = row?.viewCount ?? 0;
    const dbLike = row?.likeCount ?? 0;
    const dbComment = row?.commentCount ?? 0;

    return PostStatsMapper.toResponse({
      post_id: postId,
      view_count: dbView + buf.views,
      like_count: dbLike + buf.likes,
      comment_count: dbComment + buf.comments,
      updated_at: new Date().toISOString(),
    });
  }

  async recordView(postId: string): Promise<{ affectedRows: number }> {
    await this.buffer.recordView(Number(postId));
    return { affectedRows: 1 };
  }

  async recordLike(postId: string): Promise<{ affectedRows: number }> {
    await this.buffer.recordLike(Number(postId));
    return { affectedRows: 1 };
  }

  async recordComment(postId: string): Promise<{ affectedRows: number }> {
    await this.buffer.recordComment(Number(postId));
    return { affectedRows: 1 };
  }

  async refreshAll(): Promise<{ affectedRows: number }> {
    const rows = await this.db.select({ id: postStats.postId }).from(postStats);
    let count = 0;
    for (const row of rows) {
      await this.buffer.flushPostStats(row.id);
      count++;
    }
    return { affectedRows: count };
  }

  async flushAll(): Promise<{ flushed: number }> {
    const count = await this.buffer.flushAll();
    return { flushed: count };
  }
}

export default PostStatsService;
