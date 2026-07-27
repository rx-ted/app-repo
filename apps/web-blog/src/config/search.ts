export type OramaPostDocument = {
  id: string;
  post_id: number;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image: string;
  is_pinned: boolean;
  featured_weight: number;
  tags: string[];
  categories: string[];
  author_name: string;
  author_username: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  reading_time: number;
  updated_at: string;
  published_at: string;
  search_text?: string;
  search_pinyin?: string;
};

export const ORAMA_POST_SEARCH_PROPERTIES = [
  'title',
  'slug',
  'tags',
  'categories',
  'author_name',
  'author_username',
  'search_text',
  'search_pinyin',
] as const;

export const ORAMA_POST_SEARCH_BOOST = {
  title: 3,
  slug: 2,
  tags: 1.8,
  categories: 1.5,
  author_name: 1.2,
  search_text: 1,
  search_pinyin: 1,
} as const;

export const ORAMA_MATCH_GROUPS = [
  {
    key: 'author',
    label: '作者',
    fields: ['author_name', 'author_username'] as const,
  },
  {
    key: 'tag',
    label: '标签',
    fields: ['tags'] as const,
  },
  {
    key: 'category',
    label: '分类',
    fields: ['categories'] as const,
  },
] as const;

export type OramaMatchGroupKey = (typeof ORAMA_MATCH_GROUPS)[number]['key'];
