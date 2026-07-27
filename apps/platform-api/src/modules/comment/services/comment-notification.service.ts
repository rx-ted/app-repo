import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { notifications, users } from '@/schema';
import { comments } from '@/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

@Service()
class CommentNotificationService {
  constructor(@Inject(DbService) private db: DbService) {}

  async notifyReply(commentId: number, parentId: number, replierId: string, content: string) {
    try {
      const parent = await this.db
        .select({ userId: comments.userId })
        .from(comments)
        .where(eq(comments.id, parentId))
        .limit(1);

      if (!parent[0] || parent[0].userId === replierId) return;

      const replier = await this.db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, replierId))
        .limit(1);

      const replyPreview = content.length > 80 ? `${content.slice(0, 80)}...` : content;

      const parentUserId = parent[0]?.userId;
      if (!parentUserId) return;
      await this.db.insert(notifications).values({
        userId: parentUserId,
        type: 'comment.reply',
        channel: 'internal',
        locale: 'zh-CN',
        title: `${replier[0]?.username ?? '某用户'} 回复了你的评论`,
        content: replyPreview,
        payloadJson: { commentId, replierId } as any,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.error({ err }, 'Failed to send reply notification');
    }
  }

  async notifyMention(
    commentId: number,
    mentionerId: string,
    mentionedUsernames: string[],
    content: string,
  ) {
    try {
      const mentioner = await this.db
        .select({ username: users.username })
        .from(users)
        .where(eq(users.id, mentionerId))
        .limit(1);

      for (const username of mentionedUsernames) {
        const mentioned = await this.db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!mentioned[0] || mentioned[0].id === mentionerId) continue;

        const preview = content.length > 80 ? `${content.slice(0, 80)}...` : content;

        await this.db.insert(notifications).values({
          userId: mentioned[0].id,
          type: 'comment.mention',
          channel: 'internal',
          locale: 'zh-CN',
          title: `${mentioner[0]?.username ?? '某用户'} 在评论中提到了你`,
          content: preview,
          payloadJson: { commentId, mentionerId } as any,
          isRead: false,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      logger.error({ err }, 'Failed to send mention notification');
    }
  }
}

export default CommentNotificationService;
