export interface AuthorBriefVO {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  level: number;
  bio: string | null;
  website: string | null;
  location: string | null;
  joinDate: string;
  followerCount: number;
  followingCount: number;
  likeReceivedCount: number;
  isFollowed: boolean;
}

export interface CommentVO {
  id: number;
  postId: number | null;
  tag: 'post' | 'guestbook' | 'discover' | 'about';
  parentId: number | null;
  content: string;
  likes: number;
  status: 'NORMAL' | 'DELETED';
  createdAt: string;
  updatedAt: string | null;
  author: AuthorBriefVO;
  isLiked: boolean;
  replyCount: number;
  replies?: {
    total: number;
    list: CommentVO[];
  };
}

export interface CommentNode extends CommentVO {
  children: CommentNode[];
}

export interface CommentPageResult {
  data: CommentVO[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LikeToggleResult {
  isLiked: boolean;
  likes: number;
}

export type CommentSort = 'newest' | 'hottest';

export interface UserProfileVO {
  id: string;
  username: string;
  email: string | null;
  preferredLocale: 'zh-CN' | 'en';
  status: 'NORMAL' | 'MUTED' | 'BANNED' | 'DELETED';
  tokenVersion: number;
  lastLoginAt: string | null;
  nickname: string | null;
  avatarUrl: string | null;
  gender: 'Male' | 'Female' | 'Unknown' | null;
  birthday: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
}

export type TaxonomyItemVO = {
  id: number;
  name: string;
};

export type NotificationVO = {
  id: number;
  channel: 'internal' | 'email';
  type: string;
  locale: 'zh-CN' | 'en';
  title?: string | null;
  content: string;
  payload?: Record<string, unknown> | null;
  is_read: boolean;
  read_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
};
