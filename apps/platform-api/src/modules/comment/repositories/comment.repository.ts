import { eq, and, desc, asc } from 'drizzle-orm';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { Inject, Service } from '@rx-ted/packages-honest';
import { CacheService, cacheable } from '@rx-ted/packages-honest-plugins/cache';
import { comments } from '@/schema';
import type { CommentEntity, CommentThreadEntity } from '@/modules/comment/entities/comment.entity';
import { USER_STATUS } from '@/constants';

export interface CommentModuleRepository {
  list(postId?: string): Promise<CommentEntity[]>;
  findById(id: string): Promise<CommentEntity | null>;
  getThread(postId: string): Promise<CommentThreadEntity[]>;
  create(data: {
    postId: string;
    parentId?: string;
    userId?: string | null;
    content: string;
    guestName?: string | null;
    guestEmail?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    city?: string | null;
  }): Promise<CommentEntity>;
  delete(id: string): Promise<boolean>;
}

function mapToCommentEntity(c: typeof comments.$inferSelect): CommentEntity {
  return {
    id: String(c.id),
    postId: c.postId ? String(c.postId) : null,
    tag: c.tag,
    parentId: c.parentId ? String(c.parentId) : null,
    userId: c.userId,
    content: c.content,
    guestName: c.guestName ?? null,
    guestEmail: c.guestEmail ?? null,
    guestWebsite: c.guestWebsite ?? null,
    ipAddress: c.ipAddress ?? null,
    userAgent: c.userAgent ?? null,
    city: c.city ?? null,
    likes: c.likes ?? 0,
    status: c.status ?? USER_STATUS.NORMAL,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
  };
}

@Service()
class CommentRepository {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CacheService) private cache: CacheService,
  ) {}

  async listComments(postId?: string): Promise<CommentEntity[]> {
    return cacheable(this.cache, `comments:list:${postId ?? 'all'}`, 60, async () => {
      const where = postId ? eq(comments.postId, Number(postId)) : undefined;
      const result = await this.db
        .select()
        .from(comments)
        .where(where)
        .orderBy(desc(comments.createdAt));
      return result.map(mapToCommentEntity);
    });
  }

  async findCommentById(id: string): Promise<CommentEntity | null> {
    const result = await this.db
      .select()
      .from(comments)
      .where(eq(comments.id, Number(id)))
      .limit(1);
    if (!result.length) return null;
    return mapToCommentEntity(result[0]);
  }

  async getCommentThread(postId: string): Promise<CommentThreadEntity[]> {
    return cacheable(this.cache, `comments:thread:${postId}`, 60, async () => {
      const result = await this.db
        .select()
        .from(comments)
        .where(and(eq(comments.postId, Number(postId)), eq(comments.status, USER_STATUS.NORMAL)))
        .orderBy(asc(comments.createdAt));
      return result.map((c) => ({
        id: String(c.id),
        postId: String(c.postId),
        userId: c.userId ?? '',
        content: c.content,
        status: c.status ?? USER_STATUS.NORMAL,
        createdAt: c.createdAt.toISOString(),
      }));
    });
  }

  async createComment(data: {
    postId?: string;
    tag: 'post' | 'guestbook' | 'friends' | 'about';
    parentId?: string;
    userId?: string | null;
    content: string;
    guestName?: string | null;
    guestEmail?: string | null;
    guestWebsite?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    city?: string | null;
  }): Promise<CommentEntity> {
    const now = new Date();
    const insertResult: any = await this.db.insert(comments).values({
      ...(data.postId ? { postId: Number(data.postId) } : {}),
      tag: data.tag,
      userId: data.userId ?? null,
      parentId: data.parentId ? Number(data.parentId) : null,
      content: data.content,
      guestName: data.guestName ?? null,
      guestEmail: data.guestEmail ?? null,
      guestWebsite: data.guestWebsite ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      city: data.city ?? null,
      status: USER_STATUS.NORMAL,
      createdAt: now,
    });
    const insertId = Number(
      insertResult.insertId ?? insertResult.lastInsertRowid ?? insertResult.meta?.last_row_id,
    );

    if (data.postId) {
      await this.cache.delete(`comments:list:${data.postId}`);
      await this.cache.delete(`comments:thread:${data.postId}`);
    }
    await this.cache.delete('comments:list:all');
    return this.findCommentById(String(insertId)) as unknown as CommentEntity;
  }

  async updateComment(id: string, content: string): Promise<void> {
    const existing = await this.findCommentById(id);
    await this.db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, Number(id)));
    if (existing?.postId) {
      await this.cache.delete(`comments:list:${existing.postId}`);
      await this.cache.delete(`comments:thread:${existing.postId}`);
    }
    await this.cache.delete('comments:list:all');
  }

  async deleteComment(id: string): Promise<boolean> {
    const existing = await this.findCommentById(id);
    const result = await this.db.delete(comments).where(eq(comments.id, Number(id)));
    if (existing?.postId) {
      await this.cache.delete(`comments:list:${existing.postId}`);
      await this.cache.delete(`comments:thread:${existing.postId}`);
    }
    await this.cache.delete('comments:list:all');
    return (result[0]?.affectedRows ?? 0) > 0;
  }

  getDb() {
    return this.db;
  }
}

export { CommentRepository };
