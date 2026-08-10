import matter from 'gray-matter';

export const POST_META_KEYS = [
  'title',
  'slug',
  'date',
  'category',
  'tags',
  'status',
  'visibility',
  'allow_comment',
  'pinned',
  'featured_weight',
  'doc_hash',
  'lang',
  'cover',
  'author',
] as const;

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
  lang?: string;
  cover?: string;
  author?: string;
}

const KNOWN_META_KEYS = new Set<string>(POST_META_KEYS);

export function warnUnknownMetaFields(data: Record<string, unknown>): string[] {
  const unknown = Object.keys(data).filter((key) => !KNOWN_META_KEYS.has(key));
  for (const key of unknown) {
    console.warn(
      `[post-parser] unknown front-matter field "${key}" — extend PostMeta / POST_META_KEYS if it should be kept`,
    );
  }
  return unknown;
}

export function parsePostMeta(contentMd: string): { data: PostMeta; content: string } {
  const parsed = matter(contentMd);
  warnUnknownMetaFields(parsed.data as Record<string, unknown>);
  return { data: parsed.data as PostMeta, content: parsed.content };
}
