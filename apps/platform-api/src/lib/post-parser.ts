import matter from 'gray-matter';

export interface PostMeta {
  title?: string;
  slug?: string;
  date?: string | Date;
  category?: string;
  tags?: string[];
  status?: string;
  visibility?: string;
  allow_comment?: boolean;
  pinned?: boolean;
  featured_weight?: number;
  doc_hash?: string;
  [key: string]: unknown;
}

export function parsePostMeta(contentMd: string): { data: PostMeta; content: string } {
  const parsed = matter(contentMd);
  return { data: parsed.data as PostMeta, content: parsed.content };
}
