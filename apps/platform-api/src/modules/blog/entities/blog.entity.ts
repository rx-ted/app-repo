export interface BlogPostEntity {
  id: string;
  slug: string;
  title: string;
  cover_image: string | null;
  is_pinned: boolean;
  featured_weight: number;
  author_id: string;
  author_name: string | null;
  author_username: string | null;
  tags: string[];
  categories: string[];
  reading_time: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  status: string;
  updated_at: string;
  published_at: string | null;
  created_at: string;
}
