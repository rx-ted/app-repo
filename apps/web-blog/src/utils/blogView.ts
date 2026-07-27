import type { App } from '@/theme/app';
import type { BlogAuthorVO, BlogPostCardVO, BlogPostDetailVO } from '@/types/blog';
import { NUMBERS } from '@/constants';

function estimateReadingTime(text?: string) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / NUMBERS.READING_WPM));
}

export function mapPostCardVOToArticle(post: BlogPostCardVO): App.BlogArticle {
  return {
    id: String(post.id),
    title: post.title,
    slug: post.slug,
    author: post.author_name ?? post.author_username ?? 'Unknown',
    authorUsername: post.author_username ?? undefined,
    tags: post.tags ?? [],
    categories: post.categories ?? [],
    coverImage: post.cover_image ?? null,
    isPinned: Boolean(post.is_pinned),
    views: Number(post.view_count ?? 0),
    likes: Number(post.like_count ?? 0),
    comments: Number(post.comment_count ?? 0),
    createdAt: post.published_at ?? post.updated_at,
    updatedAt: post.updated_at,
    readingTime: Number(post.reading_time ?? 1),
  };
}

export function mapAuthorPostVOToArticle(
  post: BlogAuthorVO['posts']['list'][number],
  author?: BlogAuthorVO['author'] | null,
): App.BlogArticle {
  return {
    ...mapPostCardVOToArticle(post),
    author: post.author_name ?? author?.nickname ?? author?.username ?? 'Unknown',
    authorUsername: post.author_username ?? author?.username,
  };
}

export function mapPostDetailVOToArticle(post: BlogPostDetailVO): App.BlogArticle {
  const content = post.content_md ?? '';
  return {
    ...mapPostCardVOToArticle({
      ...post,
      published_at: post.created_at,
    }),
    content,
    contentHtml: post.content_html ?? undefined,
    createdAt: post.created_at,
    readingTime: Number(post.reading_time ?? estimateReadingTime(content ?? undefined)),
  };
}
