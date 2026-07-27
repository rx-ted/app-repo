export interface BlogPostCardVO {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image?: string | null;
  is_pinned?: boolean;
  featured_weight?: number;
  status?: string;
  author_name?: string | null;
  author_username?: string | null;
  tags?: string[];
  categories?: string[];
  reading_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  updated_at: string;
  published_at?: string | null;
}

export interface TrendingTagItem {
  name: string;
  postCount: number;
}

export interface BlogHomeVO {
  hero: {
    title: string;
    description: string;
    stats: {
      posts: number;
      tags: number;
      categories: number;
      totalViews: number;
      totalLikes: number;
      totalComments: number;
      runtime: string;
    };
  };
  featured: BlogPostCardVO[];
  latest: BlogPostCardVO[];
  pinned: BlogPostCardVO[];
  trendingTags: TrendingTagItem[];
}

export interface BlogPostDetailVO {
  id: number;
  slug: string;
  title: string;
  content_md?: string;
  content_html?: string | null;
  author_name?: string | null;
  author_username?: string | null;
  tags?: string[];
  tag_ids?: number[];
  categories?: string[];
  category_ids?: number[];
  cover_image?: string | null;
  is_pinned?: boolean;
  featured_weight?: number;
  status: 'draft' | 'published' | 'archived';
  visibility?: 'public' | 'private' | 'password';
  allow_comment?: boolean;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  reading_time?: number;
  created_at: string;
  updated_at: string;
}

export interface BlogAuthorVO {
  author: {
    id: string;
    username: string;
    created_at: string;
    last_login_at: string | null;
    nickname: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
  };
  posts: {
    list: BlogPostCardVO[];
    total: number;
    page: number;
    pageSize: number;
    tags: string[];
    activeTag: string | null;
  };
}

export interface BlogDashboardVO {
  me: {
    id: string;
    username: string;
    roles: string[];
    created_at: string;
    last_login_at: string | null;
    nickname: string | null;
    avatar_url: string | null;
    bio: string | null;
    website: string | null;
  };
  posts: {
    list: BlogPostCardVO[];
    total: number;
  };
  stats: {
    days: number;
    views: number;
    likes: number;
    comments: number;
  };
  notifications: {
    unreadCount: number;
    recent: {
      id: number;
      type: string;
      content: string;
      is_read: boolean;
      created_at: string;
    }[];
  };
  activity: DashboardActivityVO[];
  permissions: string[];
}

export interface DashboardActivityVO {
  id: string;
  type: 'post.updated' | 'notification';
  title: string;
  description: string | null;
  slug: string | null;
  created_at: string;
}

export interface BlogPostPageVO {
  list: BlogPostCardVO[];
  total: number;
}

export type DashboardNotificationVO = {
  id: number;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
};
