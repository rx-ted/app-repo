export const CACHE_KEYS = {
  // Auth & Session
  authSession: (username: string) => `auth:session:${username}`,
  authPerms: (userId: string) => `auth:perms:${userId}`,
  session: (sessionId: string) => `session:${sessionId}`,
  sessionHash: (hash: string) => `session:hash:${hash}`,
  sessionHashIndex: (sessionId: string) => `session:hash-index:${sessionId}`,
  userSessions: (userId: string) => `user:sessions:${userId}`,

  // Email & Rate Limit
  emailCode: (email: string, purpose: string) => `email:code:${email.toLowerCase()}:${purpose}`,
  emailCooldown: (email: string, purpose: string) =>
    `email:cooldown:${email.toLowerCase()}:${purpose}`,
  rateLimitIp: (ip: string, window: number) => `rl:ip:${ip}:${window}`,
  rateLimitUser: (userId: string, window: number) => `rl:user:${userId}:${window}`,

  // Post
  postList: (
    page: number,
    pageSize: number,
    keyword?: string,
    tag?: string,
    category?: string,
    author?: string,
  ) =>
    `post:list:${page}:${pageSize}:${keyword ?? ''}:${tag ?? ''}:${category ?? ''}:${author ?? ''}`,
  postSlug: (slug: string) => `post:slug:${slug}`,
  postId: (id: string) => `post:id:${id}`,
  postCalendar: (year: number, month: number) =>
    `post:calendar:${year}:${String(month).padStart(2, '0')}`,
  postCalendarPattern: 'post:calendar:*',
  postListPattern: 'post:list:*',
  postSlugPattern: 'post:slug:*',
  postIdPattern: 'post:id:*',

  // Blog
  blogHome: 'blog:home',
  blogAuthor: (username: string, page: number) => `blog:author:${username}:${page}`,
  blogDashboard: (userId: string) => `blog:dashboard:${userId}`,
  blogSearch: (kw: string, page: number, pageSize: number) =>
    `blog:search:${kw}:${page}:${pageSize}`,

  // Search
  searchQuery: (q: string, types: string, limit: number, offset: number) =>
    `search:${q}:${types}:${limit}:${offset}`,

  // Notifications
  notificationsList: 'notifications:list',
  notificationsSummary: 'notifications:summary',

  // Comments
  commentsList: (postId: number | string) => `comments:list:${postId}`,
  commentsThread: (postId: number) => `comments:thread:${postId}`,
  commentLiked: (userId: string) => `comment-liked:${userId}`,
  commentLikeCount: (commentId: number) => `comment-like-count:${commentId}`,

  // Tags & Categories
  tagsList: (page: number, pageSize: number) => `tags:list:${page}:${pageSize}`,
  tagById: (id: number) => `tags:${id}`,
  categoriesList: 'categories:list',
  categoryById: (id: number) => `categories:${id}`,
  categoryBySlug: (slug: string) => `categories:slug:${slug}`,

  // User
  userById: (id: string) => `user:id:${id}`,
  userByUsername: (username: string) => `user:username:${username}`,
  userProfile: (userId: string) => `user:profile:${userId}`,
  userPublic: (username: string) => `user:public:${username}`,
  userFull: (userId: string) => `user:full:${userId}`,
  userList: (page: number, pageSize: number) => `user:list:${page}:${pageSize}`,

  // Permissions & Announcements
  permissionsList: 'permissions:list',
  announcementsActive: 'announcements:active',

  // Discover
  discoveriesActive: 'discoveries:active',
  discoveriesAll: 'discoveries:all',

  // System & Author
  systemInfo: 'system:info',
  authorStats: (userId: string) => `author-stats:${userId}`,
} as const;
