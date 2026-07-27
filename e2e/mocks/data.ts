import type { Page } from '@playwright/test';

export const API_BASE = '/api/v1';

function okResponse(data: unknown) {
  return { status: 200, code: 'OK', data };
}

function createdResponse(data: unknown) {
  return { status: 201, code: 'CREATED', data };
}

function unauthResponse() {
  return { status: 401, code: 'UNAUTHORIZED', message: 'Unauthorized' };
}

function forbiddenResponse() {
  return { status: 403, code: 'FORBIDDEN', message: 'Forbidden' };
}

function notFoundResponse() {
  return { status: 404, code: 'NOT_FOUND', message: 'Not Found' };
}

function rateLimitResponse() {
  return { status: 429, code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' };
}

function validationErrorResponse(message: string) {
  return { status: 422, code: 'VALIDATION_ERROR', message };
}

function serverErrorResponse() {
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' };
}

const NOW = '2025-06-11T10:00:00Z';

export const mockBlogSummary = {
  hero: {
    title: 'Tech Blog',
    description: 'A blog about technology and programming',
    stats: { posts: 42, tags: 12, categories: 5, runtime: 128 },
  },
  featured: [
    {
      id: '1',
      slug: 'getting-started-with-go',
      title: 'Getting Started with Go',
      excerpt: 'A beginner-friendly introduction to Go programming language.',
      cover_image: null,
      author_name: 'Alice',
      author_username: 'alice',
      author_avatar: null,
      tags: ['go', 'programming'],
      tag_ids: [1],
      categories: ['Development'],
      category_ids: [1],
      reading_time: 5,
      view_count: 1200,
      like_count: 45,
      comment_count: 3,
      is_pinned: false,
      featured_weight: 10,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      slug: 'rust-vs-go',
      title: 'Rust vs Go: A Practical Comparison',
      excerpt: 'Comparing two modern systems programming languages.',
      cover_image: null,
      author_name: 'Bob',
      author_username: 'bob',
      author_avatar: null,
      tags: ['rust', 'go', 'comparison'],
      tag_ids: [2, 1],
      categories: ['Development'],
      category_ids: [1],
      reading_time: 8,
      view_count: 850,
      like_count: 32,
      comment_count: 7,
      is_pinned: true,
      featured_weight: 8,
      created_at: '2025-02-20T14:00:00Z',
      updated_at: '2025-02-20T14:00:00Z',
    },
  ],
  latest: [
    {
      id: '3',
      slug: 'testing-in-nodejs',
      title: 'Testing in Node.js: Best Practices',
      excerpt: 'Learn how to write effective tests for Node.js applications.',
      cover_image: null,
      author_name: 'Alice',
      author_username: 'alice',
      author_avatar: null,
      tags: ['nodejs', 'testing'],
      tag_ids: [3],
      categories: ['Development'],
      category_ids: [1],
      reading_time: 6,
      view_count: 420,
      like_count: 18,
      comment_count: 2,
      is_pinned: false,
      featured_weight: 0,
      created_at: '2025-03-10T09:00:00Z',
      updated_at: '2025-03-10T09:00:00Z',
    },
    {
      id: '4',
      slug: 'docker-for-developers',
      title: 'Docker for Developers',
      excerpt: 'A practical guide to using Docker in your development workflow.',
      cover_image: null,
      author_name: 'Bob',
      author_username: 'bob',
      author_avatar: null,
      tags: ['docker', 'devops'],
      tag_ids: [4],
      categories: ['DevOps'],
      category_ids: [2],
      reading_time: 7,
      view_count: 310,
      like_count: 15,
      comment_count: 1,
      is_pinned: false,
      featured_weight: 0,
      created_at: '2025-03-05T11:00:00Z',
      updated_at: '2025-03-05T11:00:00Z',
    },
  ],
  pinned: [],
  trendingTags: ['go', 'rust', 'nodejs', 'docker', 'testing'],
};

export const mockPostDetail = {
  id: '1',
  slug: 'getting-started-with-go',
  title: 'Getting Started with Go',
  content_md: `# Getting Started with Go

Go is a statically typed, compiled programming language designed at Google.

## Why Go?

- **Simplicity**: Clean syntax, easy to learn
- **Performance**: Compiled to native code
- **Concurrency**: Goroutines and channels

## Your First Program

\`\`\`go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
\`\`\``,
  content_html: '<h1>Getting Started with Go</h1><p>Go is a statically typed...</p>',
  excerpt: 'A beginner-friendly introduction to Go programming language.',
  cover_image: null,
  author_name: 'Alice',
  author_username: 'alice',
  author_avatar: null,
  tags: ['go', 'programming'],
  tag_ids: [1],
  categories: ['Development'],
  category_ids: [1],
  is_pinned: false,
  featured_weight: 10,
  status: 'published',
  visibility: 'public',
  allow_comment: true,
  view_count: 1200,
  like_count: 45,
  comment_count: 3,
  reading_time: 5,
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
};

export const mockPostDetailPrivate = {
  ...mockPostDetail,
  slug: 'private-post',
  title: 'Private Post',
  visibility: 'private',
  content_md: '# Private Post\nThis is private content.',
};

export const mockPostDraft = {
  ...mockPostDetail,
  slug: 'draft-post',
  title: 'Draft Post',
  status: 'draft',
  content_md: '# Draft Post\nThis is a draft.',
};

export const mockPostList = {
  list: [
    {
      id: '1',
      slug: 'getting-started-with-go',
      title: 'Getting Started with Go',
      excerpt: 'A beginner-friendly introduction to Go programming language.',
      author_name: 'Alice',
      author_username: 'alice',
      tags: ['go', 'programming'],
      reading_time: 5,
      view_count: 1200,
      like_count: 45,
      comment_count: 3,
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T10:00:00Z',
    },
    {
      id: '2',
      slug: 'rust-vs-go',
      title: 'Rust vs Go: A Practical Comparison',
      excerpt: 'Comparing two modern systems programming languages.',
      author_name: 'Bob',
      author_username: 'bob',
      tags: ['rust', 'go', 'comparison'],
      reading_time: 8,
      view_count: 850,
      like_count: 32,
      comment_count: 7,
      created_at: '2025-02-20T14:00:00Z',
      updated_at: '2025-02-20T14:00:00Z',
    },
    {
      id: '3',
      slug: 'testing-in-nodejs',
      title: 'Testing in Node.js: Best Practices',
      excerpt: 'Learn how to write effective tests for Node.js applications.',
      author_name: 'Alice',
      author_username: 'alice',
      tags: ['nodejs', 'testing'],
      reading_time: 6,
      view_count: 420,
      like_count: 18,
      comment_count: 2,
      created_at: '2025-03-10T09:00:00Z',
      updated_at: '2025-03-10T09:00:00Z',
    },
    {
      id: '4',
      slug: 'docker-for-developers',
      title: 'Docker for Developers',
      excerpt: 'A practical guide to using Docker in your development workflow.',
      author_name: 'Bob',
      author_username: 'bob',
      tags: ['docker', 'devops'],
      reading_time: 7,
      view_count: 310,
      like_count: 15,
      comment_count: 1,
      created_at: '2025-03-05T11:00:00Z',
      updated_at: '2025-03-05T11:00:00Z',
    },
  ],
  total: 4,
  page: 1,
  pageSize: 10,
};

export const mockPostListFilteredByTag = {
  list: [mockPostList.list[0], mockPostList.list[1]],
  total: 2,
  page: 1,
  pageSize: 10,
};

export const mockPostListFilteredByCategory = {
  list: [mockPostList.list[3]],
  total: 1,
  page: 1,
  pageSize: 10,
};

export const mockPostListFilteredByAuthor = {
  list: [mockPostList.list[0], mockPostList.list[2]],
  total: 2,
  page: 1,
  pageSize: 10,
};

export const mockPostListEmpty = {
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
};

export const mockLoginResponse = {
  accessToken: 'mock-jwt-token-abc123',
  expiresIn: 900,
  sessionId: 'session-123',
  user: {
    id: 'user-1',
    username: 'alice',
    preferred_locale: 'zh-CN',
    roles: ['user'],
    permissions: ['post:create', 'post:edit', 'post:delete'],
    tokenVersion: 1,
    last_login_at: '2025-05-29T10:00:00Z',
    nickname: 'Alice',
    avatar_url: null,
  },
};

export const mockAuthSession = mockLoginResponse.user;

export const mockRefreshResponse = {
  accessToken: 'mock-refreshed-jwt-token-xyz789',
  expiresIn: 900,
  sessionId: 'session-123',
};

export const mockRegisterResponse = {
  accessToken: 'mock-jwt-token-new-user',
  expiresIn: 900,
  sessionId: 'session-456',
  user: {
    id: 'user-2',
    username: 'newuser',
    preferred_locale: 'zh-CN',
    roles: ['user'],
    permissions: ['post:create'],
    tokenVersion: 1,
    last_login_at: NOW,
    nickname: 'New User',
    avatar_url: null,
  },
};

export const mockSendCodeResponse = {
  ttlSeconds: 300,
  resendCooldownSeconds: 60,
};

export const mockEmailLoginResponse = {
  ...mockLoginResponse,
  accessToken: 'mock-jwt-email-login',
};

export const mockResetPasswordResponse = {
  success: true,
};

export const mockLogoutResponse = {
  success: true,
};

export const mockSessionList = {
  sessions: [
    {
      id: 'session-123',
      deviceId: 'device-1',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      isCurrent: true,
      lastActiveAt: NOW,
      createdAt: '2025-05-29T10:00:00Z',
    },
    {
      id: 'session-456',
      deviceId: 'device-2',
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0 (iPhone)',
      isCurrent: false,
      lastActiveAt: '2025-05-28T08:00:00Z',
      createdAt: '2025-05-20T10:00:00Z',
    },
  ],
};

export const mockDashboard = {
  me: {
    id: 'user-1',
    username: 'alice',
    nickname: 'Alice',
    avatar_url: null,
    bio: 'Full-stack developer & blogger',
    website: 'https://alice.dev',
    last_login_at: '2025-05-29T10:00:00Z',
  },
  posts: {
    list: [
      {
        id: '1',
        slug: 'getting-started-with-go',
        title: 'Getting Started with Go',
        status: 'published',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      },
      {
        id: '3',
        slug: 'testing-in-nodejs',
        title: 'Testing in Node.js: Best Practices',
        status: 'published',
        created_at: '2025-03-10T09:00:00Z',
        updated_at: '2025-03-10T09:00:00Z',
      },
      {
        id: '5',
        slug: 'draft-post',
        title: 'Unfinished Draft',
        status: 'draft',
        created_at: '2025-04-01T09:00:00Z',
        updated_at: '2025-04-01T09:00:00Z',
      },
    ],
    total: 3,
  },
  stats: {
    views: 1620,
    comments: 5,
    days: 134,
    likes: 63,
  },
  notifications: {
    unreadCount: 3,
    recent: [
      {
        id: 'n1',
        type: 'comment',
        message: 'Bob commented on your post "Getting Started with Go"',
        read: false,
        created_at: '2025-05-28T10:00:00Z',
      },
      {
        id: 'n2',
        type: 'like',
        message: 'Charlie liked your post "Testing in Node.js"',
        read: false,
        created_at: '2025-05-27T10:00:00Z',
      },
      {
        id: 'n3',
        type: 'system',
        message: 'Welcome to the blog!',
        read: false,
        created_at: '2025-05-26T10:00:00Z',
      },
    ],
  },
  activity: [
    {
      type: 'post_created',
      message: 'Created "Testing in Node.js"',
      timestamp: '2025-03-10T09:00:00Z',
    },
    {
      type: 'post_published',
      message: 'Published "Rust vs Go"',
      timestamp: '2025-02-20T14:00:00Z',
    },
  ],
  permissions: ['post:create', 'post:edit', 'post:delete'],
};

export const mockSearchResults = {
  posts: {
    list: [
      {
        id: 1,
        slug: 'getting-started-with-go',
        title: 'Getting Started with Go',
        excerpt: 'A beginner-friendly introduction to Go programming language.',
        author_name: 'Alice',
        author_username: 'alice',
        reading_time: 5,
        view_count: 1200,
        like_count: 45,
        comment_count: 3,
        cover_image: null,
        is_pinned: false,
        featured_weight: 10,
        tags: ['go', 'programming'],
        categories: ['Development'],
        updated_at: '2025-01-15T10:00:00Z',
        published_at: '2025-01-15T10:00:00Z',
      },
      {
        id: 2,
        slug: 'rust-vs-go',
        title: 'Rust vs Go: A Practical Comparison',
        excerpt: 'Comparing two modern systems programming languages.',
        author_name: 'Bob',
        author_username: 'bob',
        reading_time: 8,
        view_count: 850,
        like_count: 32,
        comment_count: 7,
        cover_image: null,
        is_pinned: true,
        featured_weight: 8,
        tags: ['rust', 'go', 'comparison'],
        categories: ['Development'],
        updated_at: '2025-02-20T14:00:00Z',
        published_at: '2025-02-20T14:00:00Z',
      },
    ],
    total: 2,
  },
};

export const mockSearchResultsEmpty = {
  posts: {
    list: [],
    total: 0,
  },
};

export const mockSearchUnavailable = {
  status: 503,
  code: 'SERVICE_UNAVAILABLE',
  message: 'Search service is currently unavailable',
};

export const mockTagList = {
  data: [
    { id: '1', name: 'go', slug: 'go', postCount: 5 },
    { id: '2', name: 'rust', slug: 'rust', postCount: 3 },
    { id: '3', name: 'nodejs', slug: 'nodejs', postCount: 7 },
    { id: '4', name: 'docker', slug: 'docker', postCount: 2 },
    { id: '5', name: 'testing', slug: 'testing', postCount: 4 },
    { id: '6', name: 'devops', slug: 'devops', postCount: 3 },
    { id: '7', name: 'programming', slug: 'programming', postCount: 10 },
    { id: '8', name: 'comparison', slug: 'comparison', postCount: 2 },
  ],
  total: 8,
};

export const mockCategoryList = [
  { id: 1, name: 'Development', postCount: 30 },
  { id: 2, name: 'DevOps', postCount: 8 },
  { id: 3, name: 'Architecture', postCount: 4 },
];

function mockAuthor(v: { id: string; username: string; displayName: string; location?: string }) {
  return {
    id: v.id,
    username: v.username,
    displayName: v.displayName,
    avatar: null,
    level: 1,
    bio: null,
    website: null,
    location: v.location ?? null,
    joinDate: '2025-01-01T00:00:00Z',
    followerCount: 0,
    followingCount: 0,
    likeReceivedCount: 5,
    isFollowed: false,
  };
}

export const mockCommentPage = {
  data: [
    {
      id: 1,
      postId: 1,
      tag: 'post',
      content: 'Great article! Very helpful for beginners.',
      author: mockAuthor({ id: 'user-2', username: 'bob', displayName: 'Bob' }),
      parentId: null,
      isLiked: false,
      likes: 5,
      status: 'NORMAL',
      replyCount: 1,
      createdAt: '2025-01-16T10:00:00Z',
      updatedAt: '2025-01-16T10:00:00Z',
      replies: {
        list: [
          {
            id: 2,
            postId: 1,
            tag: 'post',
            content: 'Thanks Bob! Glad you found it useful.',
            author: mockAuthor({ id: 'user-1', username: 'alice', displayName: 'Alice' }),
            parentId: 1,
            isLiked: false,
            likes: 3,
            status: 'NORMAL',
            replyCount: 0,
            createdAt: '2025-01-16T12:00:00Z',
            updatedAt: '2025-01-16T12:00:00Z',
          },
        ],
        total: 1,
      },
    },
    {
      id: 3,
      postId: 1,
      tag: 'post',
      content: 'Could you add more examples?',
      author: mockAuthor({ id: 'user-3', username: 'charlie', displayName: 'Charlie' }),
      parentId: null,
      isLiked: true,
      likes: 2,
      status: 'NORMAL',
      replyCount: 0,
      createdAt: '2025-01-17T08:00:00Z',
      updatedAt: '2025-01-17T08:00:00Z',
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
};

export const mockGuestbookCommentPage = {
  data: [
    {
      id: 10,
      postId: null,
      tag: 'guestbook',
      content: 'Hello guestbook! Nice blog.',
      author: mockAuthor({ id: 'user-4', username: 'visitor', displayName: 'Visitor', location: 'Shanghai' }),
      parentId: null,
      isLiked: false,
      likes: 2,
      status: 'NORMAL',
      replyCount: 0,
      createdAt: '2026-06-25T10:30:00Z',
      updatedAt: null,
    },
  ],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const mockCommentReplyPage = {
  data: [
    {
      id: 4,
      postId: 1,
      tag: 'post',
      content: 'Sure, I will update the post soon.',
      author: mockAuthor({ id: 'user-1', username: 'alice', displayName: 'Alice' }),
      parentId: 3,
      isLiked: false,
      likes: 1,
      status: 'NORMAL',
      replyCount: 0,
      createdAt: '2025-01-17T10:00:00Z',
      updatedAt: '2025-01-17T10:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 10,
};

export const mockCreateCommentResponse = {
  id: '5',
};

export const mockToggleLikeResult = {
  isLiked: true,
  likes: 6,
};

export const mockAuthorBrief = {
  id: 'user-1',
  username: 'alice',
  nickname: 'Alice',
  avatar_url: null,
};

export const mockAuthorPage = {
  author: {
    username: 'alice',
    nickname: 'Alice',
    avatar_url: null,
    bio: 'Full-stack developer passionate about Go and TypeScript.',
    website: 'https://alice.dev',
    location: 'Shanghai',
    total_posts: 2,
  },
  posts: {
    list: [
      {
        id: '1',
        slug: 'getting-started-with-go',
        title: 'Getting Started with Go',
        excerpt: 'A beginner-friendly introduction to Go programming language.',
        cover_image: null,
        tags: ['go', 'programming'],
        reading_time: 5,
        view_count: 1200,
        like_count: 45,
        comment_count: 3,
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z',
      },
      {
        id: '3',
        slug: 'testing-in-nodejs',
        title: 'Testing in Node.js: Best Practices',
        excerpt: 'Learn how to write effective tests for Node.js applications.',
        cover_image: null,
        tags: ['nodejs', 'testing'],
        reading_time: 6,
        view_count: 420,
        like_count: 18,
        comment_count: 2,
        created_at: '2025-03-10T09:00:00Z',
        updated_at: '2025-03-10T09:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    pageSize: 8,
    tags: ['go', 'nodejs', 'testing', 'programming'],
    activeTag: '',
  },
};

export const mockAuthorPageFiltered = {
  ...mockAuthorPage,
  posts: {
    ...mockAuthorPage.posts,
    list: [mockAuthorPage.posts.list[0]],
    total: 1,
    activeTag: 'go',
  },
};

export const mockAuthorPageEmpty = {
  ...mockAuthorPage,
  posts: {
    list: [],
    total: 0,
    page: 1,
    pageSize: 8,
    tags: [],
    activeTag: '',
  },
};

export const mockCreatePostResponse = {
  slug: 'new-post-title',
};

export const mockUpdatePostResponse = {
  success: true,
};

export const mockActiveAnnouncements = {
  items: [
    {
      id: 'a1',
      original: {
        badge: 'NEW',
        title: 'New Feature Release',
        message: 'Check out our latest updates including markdown support.',
        actions: [{ label: 'Learn More', href: '/changelog', type: 'primary' }],
        items: [],
      },
      translated: null,
      variant: 'info',
      order: 1,
      dismissible: true,
      created_at: '2025-06-01T10:00:00Z',
    },
  ],
};

export const mockNotificationList = {
  list: [
    {
      id: 'n1',
      type: 'comment',
      message: 'Bob commented on your post',
      read: false,
      created_at: '2025-05-28T10:00:00Z',
    },
    {
      id: 'n2',
      type: 'like',
      message: 'Charlie liked your post',
      read: true,
      created_at: '2025-05-27T10:00:00Z',
    },
  ],
  total: 2,
  unread: 1,
};

export const mockUserProfile = {
  github_connected: false,
  preferred_locale: 'en',
  nickname: 'Alice',
  avatar_url: null,
  bio: 'Full-stack developer',
  website: 'https://alice.dev',
  location: 'Shanghai',
  username: 'alice',
  email: 'alice@example.com',
};

export const mockVersionItems = [
  {
    id: 'v1',
    version: '1.1.0',
    releaseChannel: 'stable',
    summary: 'Major update with new features',
    commitShortHash: 'abc1234',
    commitUrl: 'https://github.com/example/commits/abc1234',
    releasedAt: '2025-06-01T10:00:00Z',
    createdAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'v2',
    version: '1.2.0-beta',
    releaseChannel: 'beta',
    summary: 'Beta release with experimental features',
    commitShortHash: 'def5678',
    commitUrl: null,
    releasedAt: null,
    createdAt: '2025-06-10T10:00:00Z',
  },
];

export const mockVersionsList = { data: mockVersionItems, total: 2 };

export const mockVersionChangelog = [
  {
    moduleName: 'core',
    bumpType: 'minor',
    currentVersion: '1.0.0',
    nextVersion: '1.1.0',
    entries: [
      {
        id: 'e1',
        type: 'feature',
        message: 'Add markdown preview support',
      },
      {
        id: 'e2',
        type: 'improvement',
        message: 'Optimize bundle size',
      },
    ],
  },
  {
    moduleName: 'auth',
    bumpType: 'patch',
    currentVersion: '1.0.0',
    nextVersion: '1.0.1',
    entries: [
      {
        id: 'e3',
        type: 'bugfix',
        message: 'Fix token refresh race condition',
      },
    ],
  },
];

export const mockUserLayout = {
  layout: 'full',
  sidebar: { visible: true, width: 260 },
  theme: { mode: 'light', color: 'blue', density: 'comfortable' },
};

export const mockFriendLinks = [
  { id: 1, name: 'Alice Blog', url: 'https://alice.dev', logo: null, description: 'Full-stack development' },
  { id: 2, name: 'Bob Tech', url: 'https://bob.tech', logo: null, description: 'Backend & distributed systems' },
  { id: 3, name: 'Charlie Notes', url: 'https://charlie.me', logo: null, description: 'Notes on frontend & design' },
];

export const mockCalendarCounts: Record<string, number> = {
  '2025-01-15': 1,
  '2025-02-20': 1,
  '2025-03-05': 1,
  '2025-03-10': 1,
};

export const mockGitHubBindUrl = {
  url: 'https://github.com/login/oauth/authorize?state=xxxx',
};

export async function setupApiMocks(page: Page, authenticated = false) {
  const authToken = authenticated ? 'mock-jwt-token-abc123' : null;

  const interceptedRoutes = new Set<string>();

  function trackRoute(method: string, pathPattern: string) {
    interceptedRoutes.add(`${method} ${pathPattern}`);
  }

  async function fulfillJson(route: any, data: unknown, status = 200) {
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      body: JSON.stringify(status >= 200 && status < 300 ? data : data),
    });
  }

  trackRoute('POST', `${API_BASE}/auth/refresh`);
  await page.route(`${API_BASE}/auth/refresh`, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockRefreshResponse));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('GET', `${API_BASE}/auth/me`);
  await page.route(/\/api\/v1\/auth\/me/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockAuthSession));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('POST', `${API_BASE}/auth/login`);
  await page.route(`${API_BASE}/auth/login`, async (route) => {
    const request = route.request();
    const body = request.postDataJSON ? request.postDataJSON() : {};
    if (body.username === 'error' || body.password === 'wrong') {
      await fulfillJson(route, unauthResponse(), 401);
    } else {
      await fulfillJson(route, okResponse(mockLoginResponse));
    }
  });

  trackRoute('POST', `${API_BASE}/auth/register`);
  await page.route(`${API_BASE}/auth/register`, async (route) => {
    await fulfillJson(route, okResponse(mockRegisterResponse));
  });

  trackRoute('POST', `${API_BASE}/auth/logout`);
  await page.route(`${API_BASE}/auth/logout`, async (route) => {
    await fulfillJson(route, okResponse(mockLogoutResponse));
  });

  trackRoute('POST', `${API_BASE}/auth/email/send-code`);
  await page.route(`${API_BASE}/auth/email/send-code`, async (route) => {
    const request = route.request();
    const body = request.postDataJSON ? request.postDataJSON() : {};
    if (body.email === 'invalid@test.com') {
      await fulfillJson(route, validationErrorResponse('Invalid email address'), 422);
    } else {
      await fulfillJson(route, okResponse(mockSendCodeResponse));
    }
  });

  trackRoute('POST', `${API_BASE}/auth/email/login`);
  await page.route(`${API_BASE}/auth/email/login`, async (route) => {
    await fulfillJson(route, okResponse(mockEmailLoginResponse));
  });

  trackRoute('POST', `${API_BASE}/auth/email/reset-password`);
  await page.route(`${API_BASE}/auth/email/reset-password`, async (route) => {
    await fulfillJson(route, okResponse(mockResetPasswordResponse));
  });

  trackRoute('GET', `${API_BASE}/auth/sessions`);
  await page.route(/\/api\/v1\/auth\/sessions$/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockSessionList));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('DELETE', `${API_BASE}/auth/sessions`);
  await page.route(/\/api\/v1\/auth\/sessions(\/.*)?$/, async (route) => {
    await fulfillJson(route, okResponse({ success: true }));
  });

  trackRoute('GET', `${API_BASE}/blog/summary`);
  await page.route(/\/api\/v1\/blog\/summary/, async (route) => {
    await fulfillJson(route, okResponse(mockBlogSummary));
  });

  trackRoute('GET', `${API_BASE}/blog/dashboard`);
  await page.route(/\/api\/v1\/blog\/dashboard/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockDashboard));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('GET', '/blog/authors/');
  await page.route(/\/api\/v1\/blog\/authors\/(.+)/, async (route) => {
    const url = new URL(route.request().url());
    const tag = url.searchParams.get('tag');
    if (tag) {
      await fulfillJson(route, okResponse(mockAuthorPageFiltered));
    } else {
      await fulfillJson(route, okResponse(mockAuthorPage));
    }
  });

  trackRoute('GET', '/blog/by-username/');
  await page.route(/\/api\/v1\/blog\/by-username\/(.+)/, async (route) => {
    await fulfillJson(route, okResponse({ posts: mockAuthorPage.posts }));
  });

  trackRoute('GET', '/posts list');
  await page.route(/\/api\/v1\/posts(?:\/([^?]+))?(\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/v1\/posts(?:\/(.+))?$/);
    const method = route.request().method();

    if (method === 'GET' && match && match[1]) {
      const slug = match[1];
      if (slug === 'non-existent-post') {
        await fulfillJson(route, notFoundResponse(), 404);
      } else if (slug === 'private-post') {
        await fulfillJson(route, okResponse(mockPostDetailPrivate));
      } else if (slug === 'draft-post') {
        await fulfillJson(route, okResponse(mockPostDraft));
      } else {
        await fulfillJson(route, okResponse(mockPostDetail));
      }
    } else if (method === 'GET') {
      const url = new URL(route.request().url());

      // posts/calendar is a separate endpoint, handle it specially
      if (url.pathname === `${API_BASE}/posts/calendar`) {
        await fulfillJson(route, okResponse(mockCalendarCounts));
        return;
      }

      const tag = url.searchParams.get('tag');
      const category = url.searchParams.get('category');
      const author = url.searchParams.get('author');
      const pageParam = url.searchParams.get('page');

      if (tag) {
        await fulfillJson(route, okResponse(mockPostListFilteredByTag));
      } else if (category) {
        await fulfillJson(route, okResponse(mockPostListFilteredByCategory));
      } else if (author) {
        await fulfillJson(route, okResponse(mockPostListFilteredByAuthor));
      } else if (pageParam === '1') {
        await fulfillJson(route, okResponse(mockPostList));
      } else {
        await fulfillJson(route, okResponse(mockPostList));
      }
    } else if (method === 'POST') {
      await fulfillJson(route, okResponse(mockCreatePostResponse), 201);
    } else if (method === 'PUT') {
      await fulfillJson(route, okResponse(mockUpdatePostResponse));
    }
  });

  trackRoute('GET', '/posts/*/adjacent');
  await page.route(/\/api\/v1\/posts\/([^/]+)\/adjacent/, async (route) => {
    await fulfillJson(route, okResponse({ prev: null, next: null }));
  });

  trackRoute('GET', '/search');
  await page.route(/\/api\/v1\/search/, async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q');
    if (q === 'unavailable') {
      await fulfillJson(route, mockSearchUnavailable, 503);
    } else if (q) {
      await fulfillJson(route, okResponse(mockSearchResults));
    } else {
      await fulfillJson(route, okResponse(mockSearchResultsEmpty));
    }
  });

  trackRoute('GET', `${API_BASE}/tags`);
  await page.route(/\/api\/v1\/tags/, async (route) => {
    await fulfillJson(route, okResponse(mockTagList));
  });

  trackRoute('POST', `${API_BASE}/tags`);
  await page.route(`${API_BASE}/tags`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await fulfillJson(route, okResponse({ id: 9, name: 'new-tag', postCount: 0 }), 201);
  });

  trackRoute('GET', `${API_BASE}/categories`);
  await page.route(/\/api\/v1\/categories/, async (route) => {
    await fulfillJson(route, okResponse(mockCategoryList));
  });

  trackRoute('POST', `${API_BASE}/categories`);
  await page.route(`${API_BASE}/categories`, async (route) => {
    await fulfillJson(route, okResponse({ id: 4, name: 'NewCategory', postCount: 0 }), 201);
  });

  trackRoute('GET', `${API_BASE}/comments/page`);
  await page.route(/\/api\/v1\/comments\/page/, async (route) => {
    const url = new URL(route.request().url());
    const tag = url.searchParams.get('tag');
    if (tag === 'guestbook') {
      await fulfillJson(route, okResponse(mockGuestbookCommentPage));
    } else {
      await fulfillJson(route, okResponse(mockCommentPage));
    }
  });

  trackRoute('GET', `${API_BASE}/comments/replyPage`);
  await page.route(/\/api\/v1\/comments\/replyPage/, async (route) => {
    await fulfillJson(route, okResponse(mockCommentReplyPage));
  });

  trackRoute('POST', `${API_BASE}/comments`);
  await page.route(`${API_BASE}/comments`, async (route) => {
    await fulfillJson(route, okResponse(mockCreateCommentResponse), 201);
  });

  trackRoute('PUT', `/comments`);
  await page.route(/\/api\/v1\/comments\/(\d+)$/, async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      await fulfillJson(route, okResponse({ success: true }));
    } else if (method === 'DELETE') {
      await fulfillJson(route, okResponse({ success: true }));
    }
  });

  trackRoute('DELETE', `/comments`);

  trackRoute('POST', `/comments/like`);
  await page.route(/\/api\/v1\/comments\/(\d+)\/like/, async (route) => {
    await fulfillJson(route, okResponse(mockToggleLikeResult));
  });

  trackRoute('GET', `${API_BASE}/comments/liked`);
  await page.route(/\/api\/v1\/comments\/liked/, async (route) => {
    await fulfillJson(route, okResponse({ ids: [1, 3] }));
  });

  trackRoute('GET', `${API_BASE}/user/me`);
  await page.route(/\/api\/v1\/user\/me$/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockAuthSession));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('GET', `${API_BASE}/user/me/profile`);
  await page.route(/\/api\/v1\/user\/me\/profile/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockUserProfile));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('PUT', `${API_BASE}/user/me/profile`);
  await page.route(/\/api\/v1\/user\/me\/profile/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse({ success: true }));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('POST', `${API_BASE}/user/me/email/send-code`);
  await page.route(/\/api\/v1\/user\/me\/email\/send-code/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockSendCodeResponse));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('PUT', `${API_BASE}/user/me/email`);
  await page.route(/\/api\/v1\/user\/me\/email/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse({ success: true }));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('GET', `/users/brief`);
  await page.route(/\/api\/v1\/users\/([^/]+)\/brief/, async (route) => {
    await fulfillJson(route, okResponse(mockAuthorBrief));
  });

  trackRoute('GET', `${API_BASE}/announcement/active`);
  await page.route(/\/api\/v1\/announcement\/active/, async (route) => {
    await fulfillJson(route, okResponse(mockActiveAnnouncements));
  });

  trackRoute('GET', `${API_BASE}/notification/me`);
  await page.route(/\/api\/v1\/notification\/me/, async (route) => {
    if (authenticated) {
      await fulfillJson(route, okResponse(mockNotificationList));
    } else {
      await fulfillJson(route, unauthResponse(), 401);
    }
  });

  trackRoute('POST', `${API_BASE}/notification/read-all`);
  await page.route(`${API_BASE}/notification/read-all`, async (route) => {
    await fulfillJson(route, okResponse({ success: true }));
  });

  await page.route(/\/api\/v1\/notification\/me\/summary/, async (route) => {
    await fulfillJson(route, okResponse({ unread: 3 }));
  });

  await page.route(/\/api\/v1\/notification\/([^/]+)\/read/, async (route) => {
    await fulfillJson(route, okResponse({ success: true }));
  });

  trackRoute('GET', `${API_BASE}/versions`);
  await page.route(/\/api\/v1\/versions(?:\/([^/]+))?/, async (route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/v1\/versions(?:\/([^/]+))?$/);

    if (match?.[1] && url.pathname.endsWith('/changelog')) {
      await fulfillJson(route, okResponse(mockVersionChangelog));
    } else if (match?.[1]) {
      await fulfillJson(route, okResponse(mockVersionsList[0]));
    } else {
      await fulfillJson(route, okResponse(mockVersionsList));
    }
  });

  trackRoute('GET', `${API_BASE}/user-layout`);
  await page.route(/\/api\/v1\/user-layout/, async (route) => {
    await fulfillJson(route, okResponse(mockUserLayout));
  });

  trackRoute('PUT', `${API_BASE}/user-layout`);
  await page.route(/\/api\/v1\/user-layout/, async (route) => {
    await fulfillJson(route, okResponse(mockUserLayout));
  });

  trackRoute('GET', `${API_BASE}/friend-links`);
  await page.route(`${API_BASE}/friend-links`, async (route) => {
    await fulfillJson(route, okResponse(mockFriendLinks));
  });

  trackRoute('GET', `${API_BASE}/user/heartbeat`);
  await page.route(/\/api\/v1\/user\/heartbeat/, async (route) => {
    await fulfillJson(route, okResponse({ success: true }));
  });

  trackRoute('GET', `${API_BASE}/auth/oauth/github/bind`);
  await page.route(/\/api\/v1\/auth\/oauth\/github\/bind/, async (route) => {
    await fulfillJson(route, okResponse(mockGitHubBindUrl));
  });

  // Catch-all for any other /api/v1/ requests to prevent ECONNREFUSED
  await page.route(/\/api\/v1\//, async (route) => {
    await fulfillJson(route, okResponse({}));
  });

  return {
    authToken,
    setAuthenticated: async (isAuth: boolean) => {
      await page.unrouteAll({ behavior: 'wait' });
      await setupApiMocks(page, isAuth);
    },
    interceptedRoutes,
  };
}
