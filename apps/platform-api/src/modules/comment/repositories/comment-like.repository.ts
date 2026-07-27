import { eq, and } from 'drizzle-orm';
import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { commentLikes, comments } from '@/schema';

@Service()
class CommentLikeRepository {
  constructor(@Inject(DbService) private db: DbService) {}

  async findByUserAndComment(userId: string, commentId: number) {
    const result = await this.db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)))
      .limit(1);
    return result[0] ?? null;
  }

  async insert(userId: string, commentId: number) {
    const now = new Date();
    await this.db.insert(commentLikes).values({ userId, commentId, createdAt: now });
  }

  async delete(userId: string, commentId: number) {
    await this.db
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
  }

  async batchInsert(values: { userId: string; commentId: number }[]) {
    if (!values.length) return;
    const now = new Date();
    await this.db.insert(commentLikes).values(values.map((v) => ({ ...v, createdAt: now })));
  }

  async batchDelete(keys: { userId: string; commentId: number }[]) {
    if (!keys.length) return;
    for (const key of keys) {
      await this.delete(key.userId, key.commentId);
    }
  }

  async findByUserId(userId: string): Promise<number[]> {
    const rows = await this.db
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(eq(commentLikes.userId, userId));
    return rows.map((r) => r.commentId);
  }

  async batchUpdateCommentLikes(deltas: Map<number, number>) {
    for (const [commentId, delta] of deltas) {
      await this.db.update(comments).set({ likes: delta }).where(eq(comments.id, commentId));
    }
  }

  async batchIncrementCommentLikes(deltas: Map<number, number>) {
    for (const [commentId, delta] of deltas) {
      const comment = await this.db
        .select({ likes: comments.likes })
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);
      if (comment[0]) {
        const newLikes = Math.max(0, (comment[0].likes ?? 0) + delta);
        await this.db.update(comments).set({ likes: newLikes }).where(eq(comments.id, commentId));
      }
    }
  }

  async getLikedCommentIds(userId: string): Promise<number[]> {
    const rows = await this.db
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(eq(commentLikes.userId, userId));
    return rows.map((r) => r.commentId);
  }

  async getCommentLikeCount(commentId: number): Promise<number> {
    const result = await this.db
      .select({ count: comments.likes })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    return result[0]?.count ?? 0;
  }

  async getCommentLikeCountRaw(commentId: number): Promise<{ likes: number }> {
    const result = await this.db
      .select({ likes: comments.likes })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    return result[0] ?? { likes: 0 };
  }
}

export { CommentLikeRepository };
