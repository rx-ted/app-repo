import { md5 } from '@noble/hashes/legacy';
import { bytesToHex } from '@noble/hashes/utils';
import { Inject, Service } from '@rx-ted/packages-honest';
import { eq, and, desc, asc, count, isNull } from 'drizzle-orm';

import { CommentMapper } from '@/modules/comment/mappers/comment.mapper';
import { CommentRepository } from '@/modules/comment/repositories/comment.repository';
import CommentLikeService from '@/modules/comment/services/comment-like.service';
import CommentNotificationService from '@/modules/comment/services/comment-notification.service';
import CommentReportService from '@/modules/comment/services/comment-report.service';
import { GeoipService } from '@/modules/geoip/geoip.service';
import { comments, users, userProfiles } from '@/schema';
import { notFound, forbidden, badRequest } from '@/lib/api-error';
import type {
  CommentVO,
  AuthorBriefVO,
  CommentPageResult,
} from '@/modules/comment/dtos/comment.response.dto';

@Service()
class CommentService {
  constructor(
    @Inject(CommentRepository) private commentRepo: CommentRepository,
    @Inject(CommentLikeService) private likeService: CommentLikeService,
    @Inject(CommentNotificationService) private notifService: CommentNotificationService,
    @Inject(CommentReportService) private reportService: CommentReportService,
    @Inject(GeoipService) private geoipService: GeoipService,
  ) {}

  async list(postId?: string) {
    const result = await this.commentRepo.listComments(postId);
    return result.map(CommentMapper.toResponse);
  }

  async getThread(postId: string) {
    return this.commentRepo.getCommentThread(postId).then((thread) =>
      thread.map((c) => ({
        id: c.id,
        postId: c.postId,
        userId: c.userId,
        content: c.content,
        status: c.status,
        createdAt: c.createdAt,
      })),
    );
  }

  async create(input: {
    postId?: string;
    tag: 'post' | 'guestbook' | 'friends' | 'about';
    parentId?: string;
    userId?: string | null;
    content: string;
    guestName?: string | null;
    guestEmail?: string | null;
    guestWebsite?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const city = input.ip ? await this.geoipService.lookup(input.ip) : null;

    const comment = await this.commentRepo.createComment({
      postId: input.postId,
      tag: input.tag,
      parentId: input.parentId,
      userId: input.userId ?? null,
      content: input.content,
      guestName: input.guestName ?? null,
      guestEmail: input.guestEmail ?? null,
      guestWebsite: input.guestWebsite ?? null,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      city,
    });

    if (input.userId) {
      // Send notifications asynchronously
      if (input.parentId) {
        const parentIdNum = Number(input.parentId);
        this.notifService.notifyReply(Number(comment.id), parentIdNum, input.userId, input.content);
      }

      // Parse @mentions
      const mentions = this.parseMentions(input.content, input.userId);
      if (mentions.length) {
        this.notifService.notifyMention(Number(comment.id), input.userId, mentions, input.content);
      }
    }

    return { affectedRows: 1, id: comment.id };
  }

  async update(id: string, userId: string, content: string) {
    const existing = await this.commentRepo.findCommentById(id);
    if (!existing) throw notFound('COMMENT_NOT_FOUND', '评论不存在');
    if (existing.userId !== userId) throw forbidden('COMMENT_FORBIDDEN', '只能编辑自己的评论');

    const createdAt = new Date(existing.createdAt).getTime();
    const now = Date.now();
    if (now - createdAt > 5 * 60 * 1000) {
      throw badRequest('COMMENT_EDIT_EXPIRED', '超过5分钟，无法编辑');
    }

    await this.commentRepo.updateComment(id, content);
    return { affectedRows: 1 };
  }

  async delete(id: string) {
    const deleted = await this.commentRepo.deleteComment(id);
    return { affectedRows: deleted ? 1 : 0 };
  }

  async page(
    query: {
      tag: 'post' | 'guestbook' | 'friends' | 'about';
      postId?: string;
      page: number;
      pageSize: number;
      sort: string;
    },
    currentUserId: string | null,
  ): Promise<CommentPageResult> {
    const offset = (query.page - 1) * query.pageSize;
    const orderBy =
      query.sort === 'hottest'
        ? [desc(comments.likes), desc(comments.createdAt)]
        : [desc(comments.createdAt)];

    const whereConditions = [
      eq(comments.tag, query.tag),
      isNull(comments.parentId),
      eq(comments.status, 'NORMAL'),
    ];
    if (query.postId) {
      whereConditions.push(eq(comments.postId, Number(query.postId)));
    }

    // Count top-level comments
    const totalResult = await this.commentRepo
      .getDb()
      .select({ total: count() })
      .from(comments)
      .where(and(...whereConditions));
    const total = Number(totalResult[0]?.total ?? 0);

    // Fetch top-level comments
    const rows = await this.commentRepo
      .getDb()
      .select()
      .from(comments)
      .where(and(...whereConditions))
      .orderBy(...orderBy)
      .limit(query.pageSize)
      .offset(offset);

    // Build comment VOs with author info and replies
    const data: CommentVO[] = await Promise.all(
      rows.map((row) => this.buildCommentVO(row, currentUserId)),
    );

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async replyPage(
    query: { parentId: number; page: number; pageSize: number },
    currentUserId: string | null,
  ): Promise<CommentPageResult> {
    const offset = (query.page - 1) * query.pageSize;

    const totalResult = await this.commentRepo
      .getDb()
      .select({ total: count() })
      .from(comments)
      .where(and(eq(comments.parentId, query.parentId), eq(comments.status, 'NORMAL')));
    const total = Number(totalResult[0]?.total ?? 0);

    const rows = await this.commentRepo
      .getDb()
      .select()
      .from(comments)
      .where(and(eq(comments.parentId, query.parentId), eq(comments.status, 'NORMAL')))
      .orderBy(asc(comments.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const data: CommentVO[] = await Promise.all(
      rows.map((row) => this.buildCommentVO(row, currentUserId)),
    );

    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async toggleLike(userId: string, commentId: number) {
    return this.likeService.toggle(userId, commentId);
  }

  async getLikedCommentIds(userId: string): Promise<number[]> {
    return this.likeService.getLikedCommentIds(userId);
  }

  async createReport(reporterId: string, commentId: number, reason: string, description?: string) {
    await this.reportService.createReport(reporterId, commentId, reason, description);
  }

  async listReports(status: string | undefined, page: number, pageSize: number) {
    return this.reportService.listReports(status, page, pageSize);
  }

  async resolveReport(reportId: number, status: string, resolverId: string, action?: string) {
    await this.reportService.resolveReport(reportId, status, resolverId, action);
  }

  private async buildCommentVO(
    row: typeof comments.$inferSelect,
    currentUserId: string | null,
  ): Promise<CommentVO> {
    const author = await this.getAuthorBrief(row.userId, currentUserId, row);

    const commentId = row.id;

    // Count replies
    const replyCountResult = await this.commentRepo
      .getDb()
      .select({ total: count() })
      .from(comments)
      .where(and(eq(comments.parentId, commentId), eq(comments.status, 'NORMAL')));
    const replyCount = Number(replyCountResult[0]?.total ?? 0);

    // Preload first 5 replies
    let replies: { total: number; list: CommentVO[] } | undefined;
    if (replyCount > 0) {
      const replyRows = await this.commentRepo
        .getDb()
        .select()
        .from(comments)
        .where(and(eq(comments.parentId, commentId), eq(comments.status, 'NORMAL')))
        .orderBy(asc(comments.createdAt))
        .limit(5);

      const replyList = await Promise.all(
        replyRows.map((r) => this.buildCommentVO(r, currentUserId)),
      );
      replies = { total: replyCount, list: replyList };
    }

    const isLiked = currentUserId
      ? await this.likeService.isLiked(currentUserId, commentId)
      : false;

    return {
      id: commentId,
      postId: row.postId,
      tag: row.tag,
      parentId: row.parentId,
      content: row.content,
      likes: row.likes ?? 0,
      status: row.status as 'NORMAL' | 'DELETED',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
      author,
      isLiked,
      replyCount,
      replies,
    };
  }

  private async getAuthorBrief(
    userId: string | null,
    currentUserId: string | null,
    row?: typeof comments.$inferSelect,
  ): Promise<AuthorBriefVO> {
    if (!userId && row) {
      return this.buildGuestAuthorBrief(row);
    }

    if (!userId) {
      return this.getDefaultGuestAuthorBrief();
    }

    const result = await this.commentRepo
      .getDb()
      .select({
        id: users.id,
        username: users.username,
        nickname: userProfiles.nickname,
        avatarUrl: userProfiles.avatarUrl,
        bio: userProfiles.bio,
        website: userProfiles.website,
        location: userProfiles.location,
        level: users.tokenVersion,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const userRow = result[0];
    if (!userRow) {
      return {
        id: userId,
        username: '未知用户',
        displayName: null,
        avatar: null,
        level: 0,
        bio: null,
        website: null,
        location: null,
        joinDate: '',
        followerCount: 0,
        followingCount: 0,
        likeReceivedCount: 0,
        isFollowed: false,
      };
    }

    return {
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.nickname ?? null,
      avatar: userRow.avatarUrl ?? null,
      level: userRow.level ?? 0,
      bio: userRow.bio ?? null,
      website: userRow.website ?? null,
      location: userRow.location ?? null,
      joinDate: userRow.createdAt?.toISOString() ?? '',
      followerCount: 0,
      followingCount: 0,
      likeReceivedCount: 0,
      isFollowed: false,
    };
  }

  private getDefaultGuestAuthorBrief(): AuthorBriefVO {
    return {
      id: '',
      username: '匿名',
      displayName: null,
      avatar: null,
      level: 0,
      bio: null,
      website: null,
      location: null,
      joinDate: '',
      followerCount: 0,
      followingCount: 0,
      likeReceivedCount: 0,
      isFollowed: false,
    };
  }

  private buildGuestAuthorBrief(row: typeof comments.$inferSelect): AuthorBriefVO {
    const name = row.guestName ?? '匿名';
    const emailHash = row.guestEmail ? this.md5(row.guestEmail.trim().toLowerCase()) : '';
    const avatar = emailHash
      ? `https://www.gravatar.com/avatar/${emailHash}?d=identicon&s=80`
      : `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`;

    return {
      id: `guest:${name}`,
      username: name,
      displayName: name,
      avatar,
      level: 0,
      bio: null,
      website: row.guestWebsite ?? null,
      location: row.city ?? null,
      joinDate: '',
      followerCount: 0,
      followingCount: 0,
      likeReceivedCount: 0,
      isFollowed: false,
    };
  }

  private md5(str: string): string {
    return bytesToHex(md5(new TextEncoder().encode(str)));
  }

  private parseMentions(content: string, selfUserId: string): string[] {
    const seen = new Set<string>();
    return [...content.matchAll(/@(\w+)/g)]
      .map((m) => m[1])
      .filter((m) => {
        if (seen.has(m)) return false;
        seen.add(m);
        return true;
      });
  }
}

export default CommentService;
