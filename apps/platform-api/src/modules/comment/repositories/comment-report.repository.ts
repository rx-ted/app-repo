import { eq, and, desc, count } from 'drizzle-orm';
import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { computeOffset } from '@/common/utils/pagination';
import { commentReports, comments, users } from '@/schema';

@Service()
class CommentReportRepository {
  constructor(@Inject(DbService) private db: DbService) {}

  async findByReporterAndComment(reporterId: string, commentId: number) {
    const result = await this.db
      .select()
      .from(commentReports)
      .where(
        and(eq(commentReports.reporterId, reporterId), eq(commentReports.commentId, commentId)),
      )
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: {
    commentId: number;
    reporterId: string;
    reason: string;
    description?: string | null;
  }) {
    const now = new Date();
    await this.db.insert(commentReports).values({
      commentId: data.commentId,
      reporterId: data.reporterId,
      reason: data.reason as any,
      description: data.description ?? null,
      createdAt: now,
    });
  }

  async listReports(
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<{ data: any[]; total: number }> {
    const where = status ? eq(commentReports.status, status as any) : undefined;

    const totalResult = await this.db.select({ total: count() }).from(commentReports).where(where);
    const total = Number(totalResult[0]?.total ?? 0);

    const rows = await this.db
      .select({
        id: commentReports.id,
        commentId: commentReports.commentId,
        commentContent: comments.content,
        reporterId: commentReports.reporterId,
        reporterUsername: users.username,
        reason: commentReports.reason,
        description: commentReports.description,
        status: commentReports.status,
        createdAt: commentReports.createdAt,
      })
      .from(commentReports)
      .leftJoin(comments, eq(commentReports.commentId, comments.id))
      .leftJoin(users, eq(commentReports.reporterId, users.id))
      .where(where)
      .orderBy(desc(commentReports.createdAt))
      .limit(pageSize)
      .offset(computeOffset({ page, pageSize }));

    return {
      data: rows.map((r) => ({
        id: String(r.id),
        commentId: String(r.commentId),
        commentContent: r.commentContent ?? '',
        reporter: { id: r.reporterId ?? '', username: r.reporterUsername ?? '' },
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? '',
      })),
      total,
    };
  }

  async resolve(id: number, status: string, resolverId: string) {
    await this.db
      .update(commentReports)
      .set({
        status: status as any,
        resolverId,
        resolvedAt: new Date(),
      })
      .where(eq(commentReports.id, id));
  }
}

export { CommentReportRepository };
