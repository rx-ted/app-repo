export {
  AuthorBriefSchema,
  CommentSchema,
  CommentPageResultSchema,
  LikeToggleResultSchema,
  CommentReportSchema,
  CommentReportPageResultSchema,
  type AuthorBrief,
  type CommentVO,
  type CommentPageResult,
  type LikeToggleResult,
  type CommentReport,
  type CommentReportPageResult,
} from './comment.schema';

import type { AuthorBrief as _AuthorBrief } from './comment.schema';
import type { CommentReport as _CommentReport } from './comment.schema';

export type AuthorBriefVO = _AuthorBrief;
export type CommentReportVO = _CommentReport;
