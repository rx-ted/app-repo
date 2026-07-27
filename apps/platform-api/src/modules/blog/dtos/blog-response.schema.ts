import { z } from 'zod';

export const BlogPostItemSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().optional(),
  cover_image: z.string().nullable().optional(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  status: z.string().optional(),
  author_name: z.string().nullable().optional(),
  author_username: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  reading_time: z.number().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  updated_at: z.string(),
  published_at: z.string().nullable().optional(),
});

export const BlogActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['post.updated', 'notification']),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  created_at: z.string(),
});

export const TrendingTagSchema = z.object({
  name: z.string(),
  postCount: z.number(),
});

export const BlogHomeResponseSchema = z.object({
  hero: z.object({
    title: z.string(),
    description: z.string(),
    stats: z.object({
      posts: z.number(),
      tags: z.number(),
      categories: z.number(),
      totalViews: z.number(),
      totalLikes: z.number(),
      totalComments: z.number(),
      runtime: z.string(),
    }),
  }),
  featured: z.array(BlogPostItemSchema),
  latest: z.array(BlogPostItemSchema),
  pinned: z.array(BlogPostItemSchema),
  trendingTags: z.array(TrendingTagSchema),
});

export const BlogDashboardResponseSchema = z.object({
  me: z.object({
    id: z.string(),
    username: z.string(),
    roles: z.array(z.string()),
    created_at: z.string(),
    last_login_at: z.string().nullable(),
    nickname: z.string().nullable(),
    avatar_url: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
  }),
  posts: z.object({
    list: z.array(BlogPostItemSchema),
    total: z.number(),
  }),
  stats: z.object({
    days: z.number(),
    views: z.number(),
    likes: z.number(),
    comments: z.number(),
  }),
  notifications: z.object({
    unreadCount: z.number(),
    recent: z.array(
      z.object({
        id: z.number(),
        type: z.string(),
        content: z.string(),
        is_read: z.boolean(),
        created_at: z.string(),
      }),
    ),
  }),
  activity: z.array(BlogActivityItemSchema),
  permissions: z.array(z.string()),
});

export const BlogAuthorResponseSchema = z.object({
  author: z.object({
    id: z.string(),
    username: z.string(),
    created_at: z.string(),
    last_login_at: z.string().nullable(),
    nickname: z.string().nullable(),
    avatar_url: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
    location: z.string().nullable(),
  }),
  posts: z.object({
    list: z.array(BlogPostItemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    tags: z.array(z.string()),
    activeTag: z.string().nullable(),
  }),
});

export const BlogPostDetailSchema = z.object({
  id: z.number(),
  slug: z.string(),
  title: z.string(),
  content_md: z.string().optional(),
  content_html: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
  author_username: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  tag_ids: z.array(z.number()).optional(),
  categories: z.array(z.string()).optional(),
  category_ids: z.array(z.number()).optional(),
  cover_image: z.string().nullable().optional(),
  is_pinned: z.boolean().optional(),
  featured_weight: z.number().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  visibility: z.enum(['public', 'private', 'password']).optional(),
  allow_comment: z.boolean().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  reading_time: z.number().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type BlogPostItem = z.infer<typeof BlogPostItemSchema>;
export type BlogActivityItem = z.infer<typeof BlogActivityItemSchema>;
export type TrendingTag = z.infer<typeof TrendingTagSchema>;
export type BlogHomeResponse = z.infer<typeof BlogHomeResponseSchema>;
export type BlogDashboardResponse = z.infer<typeof BlogDashboardResponseSchema>;
export type BlogAuthorResponse = z.infer<typeof BlogAuthorResponseSchema>;
export type BlogPostDetail = z.infer<typeof BlogPostDetailSchema>;
export type BlogSearchResponse = { list: BlogPostItem[]; total: number };
