import { Inject, Service } from '@rx-ted/packages-honest';
import { DbService } from '@rx-ted/packages-honest-plugins/db';
import { CommentReportRepository } from '@/modules/comment/repositories/comment-report.repository';
import { commentReports, comments } from '@/schema';
import { eq } from 'drizzle-orm';
import { notFound, forbidden, conflict } from '@/lib/api-error';

@Service()
class CommentReportService {
  constructor(
    @Inject(DbService) private db: DbService,
    @Inject(CommentReportRepository) private reportRepo: CommentReportRepository,
  ) {}

  async createReport(reporterId: string, commentId: number, reason: string, description?: string) {
    const comment = await this.db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    if (!comment[0]) throw notFound('COMMENT_NOT_FOUND', '评论不存在');
    if (comment[0].userId === reporterId)
      throw forbidden('REPORT_SELF_FORBIDDEN', '不可举报自己的评论');

    const existing = await this.reportRepo.findByReporterAndComment(reporterId, commentId);
    if (existing) throw conflict('REPORT_DUPLICATE', '你已经举报过该评论');

    await this.reportRepo.create({ commentId, reporterId, reason, description });
  }

  async listReports(status: string | undefined, page: number, pageSize: number) {
    return this.reportRepo.listReports(status, page, pageSize);
  }

  async resolveReport(reportId: number, status: string, resolverId: string, action?: string) {
    await this.reportRepo.resolve(reportId, status, resolverId);

    if (action === 'delete_comment') {
      const report = await this.db
        .select({ commentId: commentReports.commentId })
        .from(commentReports)
        .where(eq(commentReports.id, reportId))
        .limit(1);
      if (report[0]) {
        await this.db
          .update(comments)
          .set({ status: 'DELETED' })
          .where(eq(comments.id, report[0].commentId));
      }
    }
  }
}

export default CommentReportService;
