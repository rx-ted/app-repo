import { Module } from '@rx-ted/packages-honest';

import CommentController from '@/modules/comment/comment.controller';
import CommentService from '@/modules/comment/comment.service';
import { CommentRepository } from '@/modules/comment/repositories/comment.repository';
import { CommentLikeRepository } from '@/modules/comment/repositories/comment-like.repository';
import { CommentReportRepository } from '@/modules/comment/repositories/comment-report.repository';
import CommentLikeService from '@/modules/comment/services/comment-like.service';
import CommentNotificationService from '@/modules/comment/services/comment-notification.service';
import CommentReportService from '@/modules/comment/services/comment-report.service';

@Module({
  controllers: [CommentController],
  services: [
    CommentService,
    CommentRepository,
    CommentLikeRepository,
    CommentReportRepository,
    CommentLikeService,
    CommentNotificationService,
    CommentReportService,
  ],
})
class CommentModule {}

export default CommentModule;
