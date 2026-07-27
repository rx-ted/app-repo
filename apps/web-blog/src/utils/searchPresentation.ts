import { ORAMA_MATCH_GROUPS, type OramaMatchGroupKey } from '@/config/search';
import type { BlogPostCardVO } from '@/types/blog';
import { NUMBERS } from '@/constants';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightText(text: string, keyword: string) {
  const source = text.trim();
  const term = keyword.trim();
  if (!source) return '';
  if (!term) return escapeHtml(source);

  const pattern = new RegExp(`(${escapeRegExp(term)})`, 'ig');
  return escapeHtml(source).replace(pattern, '<mark class="search-highlight">$1</mark>');
}

export function buildSearchExcerpt(
  text: string,
  keyword: string,
  maxLength = NUMBERS.EXCERPT_MAX_LEN,
) {
  const source = text.trim();
  const term = keyword.trim();
  if (!source) return '';
  if (!term) {
    return source.length > maxLength ? `${source.slice(0, maxLength).trim()}…` : source;
  }

  const lowerSource = source.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerSource.indexOf(lowerTerm);
  if (index < 0) {
    return source.length > maxLength ? `${source.slice(0, maxLength).trim()}…` : source;
  }

  const contextBefore = Math.max(0, index - Math.floor(maxLength * NUMBERS.EXCERPT_CONTEXT_BEFORE));
  const contextAfter = Math.min(
    source.length,
    index + term.length + Math.floor(maxLength * NUMBERS.EXCERPT_CONTEXT_AFTER),
  );
  const prefix = contextBefore > 0 ? '…' : '';
  const suffix = contextAfter < source.length ? '…' : '';
  return `${prefix}${source.slice(contextBefore, contextAfter).trim()}${suffix}`;
}

export function containsKeyword(text: string, keyword: string) {
  const source = text.trim().toLowerCase();
  const term = keyword.trim().toLowerCase();
  if (!source || !term) return false;
  return source.includes(term);
}

export function getSearchMatchMeta(item: BlogPostCardVO, keyword: string) {
  const tags = (item.tags ?? []).filter((tag) => containsKeyword(tag, keyword));
  const categories = (item.categories ?? []).filter((category) =>
    containsKeyword(category, keyword),
  );
  const author = [item.author_name, item.author_username]
    .filter((value): value is string => Boolean(value))
    .find((value) => containsKeyword(value, keyword));

  return {
    author: author ?? '',
    tags,
    categories,
  };
}

export type SearchMatchChip = {
  key: string;
  type: OramaMatchGroupKey;
  label: string;
  value: string;
};

export function buildSearchMatchChips(item: BlogPostCardVO, keyword: string): SearchMatchChip[] {
  const meta = getSearchMatchMeta(item, keyword);
  const values: Record<OramaMatchGroupKey, string[]> = {
    author: meta.author ? [meta.author] : [],
    tag: meta.tags,
    category: meta.categories,
  };

  return ORAMA_MATCH_GROUPS.flatMap((group) =>
    values[group.key].map((value) => ({
      key: `${group.key}:${value}`,
      type: group.key,
      label: group.label,
      value,
    })),
  );
}
