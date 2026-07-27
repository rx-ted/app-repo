export interface SearchEntity {
  q: string;
  types: ('posts' | 'tags' | 'categories' | 'author')[];
  limit: number;
  offset: number;
}

export interface SearchPostEntity {
  id: string;
  slug: string;
  title: string;
  cover_image: string | null;
  is_pinned: boolean;
  featured_weight: number;
  author_name: string | null;
  author_username: string | null;
  tags: string[];
  categories: string[];
  reading_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  updated_at: string;
  published_at: string | null;
}
