import { z } from 'zod';

// --- Request schemas ---

export const CreateCommentSchema = z
  .object({
    postId: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'postId must be a valid positive number',
      })
      .optional(),
    tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
    parentId: z.string().nullable().optional(),
    content: z.string().min(1, '评论内容不能为空'),
    guestName: z.string().min(1).max(100).optional(),
    guestEmail: z.string().email().optional(),
    guestWebsite: z.string().url().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.tag === 'post' && !data.postId) return false;
      return true;
    },
    { message: 'postId is required when tag is post', path: ['postId'] },
  )
  .refine(
    (data) => {
      if (data.guestName && !data.guestEmail) return false;
      return true;
    },
    { message: 'guestEmail is required when guestName is provided', path: ['guestEmail'] },
  );

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空'),
});

export const CommentPageQuerySchema = z
  .object({
    tag: z.enum(['post', 'guestbook', 'friends', 'about']).default('post'),
    postId: z
      .string()
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
        message: 'postId must be a valid positive number',
      })
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
    sort: z.enum(['newest', 'hottest']).default('newest'),
  })
  .refine(
    (data) => {
      if (data.tag === 'post' && !data.postId) return false;
      return true;
    },
    { message: 'postId is required when tag is post', path: ['postId'] },
  );

export const ReplyPageQuerySchema = z.object({
  parentId: z.coerce.number().int().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export const CreateReportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
  description: z.string().max(500).optional(),
});

export const ResolveReportSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  action: z.enum(['delete_comment']).optional(),
});

// --- Response schemas ---

export const AuthorBriefSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string().nullable(),
  avatar: z.string().nullable(),
  level: z.number(),
  bio: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  joinDate: z.string(),
  followerCount: z.number(),
  followingCount: z.number(),
  likeReceivedCount: z.number(),
  isFollowed: z.boolean(),
});

export interface CommentVO {
  id: number;
  postId: number | null;
  tag: 'post' | 'guestbook' | 'friends' | 'about';
  parentId: number | null;
  content: string;
  likes: number;
  status: 'NORMAL' | 'DELETED';
  createdAt: string;
  updatedAt: string | null;
  author: AuthorBrief;
  isLiked: boolean;
  replyCount: number;
  replies?: {
    total: number;
    list: CommentVO[];
  };
}

export const CommentSchema: z.ZodType<CommentVO> = z.lazy(() =>
  z.object({
    id: z.number(),
    postId: z.number().nullable(),
    tag: z.enum(['post', 'guestbook', 'friends', 'about']),
    parentId: z.number().nullable(),
    content: z.string(),
    likes: z.number(),
    status: z.enum(['NORMAL', 'DELETED']),
    createdAt: z.string(),
    updatedAt: z.string().nullable(),
    author: AuthorBriefSchema,
    isLiked: z.boolean(),
    replyCount: z.number(),
    replies: z
      .object({
        total: z.number(),
        list: z.array(CommentSchema),
      })
      .optional(),
  }),
);

export const CommentPageResultSchema = z.object({
  data: z.array(CommentSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export const LikeToggleResultSchema = z.object({
  isLiked: z.boolean(),
  likes: z.number(),
});

export const CommentReportSchema = z.object({
  id: z.number(),
  commentId: z.number(),
  commentContent: z.string(),
  reporter: z.object({ id: z.string(), username: z.string() }),
  reason: z.string(),
  description: z.string().nullable(),
  status: z.enum(['PENDING', 'RESOLVED', 'DISMISSED']),
  createdAt: z.string(),
});

export const CommentReportPageResultSchema = z.object({
  data: z.array(CommentReportSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// --- Types ---

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type CommentPageQuery = z.infer<typeof CommentPageQuerySchema>;
export type ReplyPageQuery = z.infer<typeof ReplyPageQuerySchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;
export type AuthorBrief = z.infer<typeof AuthorBriefSchema>;

export type CommentPageResult = z.infer<typeof CommentPageResultSchema>;
export type LikeToggleResult = z.infer<typeof LikeToggleResultSchema>;
export type CommentReport = z.infer<typeof CommentReportSchema>;
export type CommentReportPageResult = z.infer<typeof CommentReportPageResultSchema>;
