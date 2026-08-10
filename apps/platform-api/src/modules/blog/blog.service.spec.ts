import { describe, expect, it } from 'vitest';

import { pickPinnedForLang } from './blog.service';
import type { BlogPostItem } from '@/modules/blog/dtos/blog.response.dto';

function pinned(slug: string, overrides: Partial<BlogPostItem> = {}): BlogPostItem {
  return {
    id: Math.abs(slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)),
    slug,
    title: slug,
    status: 'published',
    updated_at: '2026-08-01T00:00:00.000Z',
    published_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

const enArch = pinned('architecture');
const zhArch = pinned('architecture.zh', { id: 2 });
const enGuide = pinned('guides-front-matter');
const zhGuide = pinned('guides-front-matter.zh', { id: 4 });
const enOnly = pinned('en-only-post');

describe('pickPinnedForLang', () => {
  it('keeps only the matching language version of each translation pair', () => {
    const result = pickPinnedForLang([enArch, zhArch, enGuide, zhGuide], 'zh-CN', 10);
    expect(result.map((p) => p.slug)).toEqual(['architecture.zh', 'guides-front-matter.zh']);
  });

  it('falls back to the available version when the language variant is missing', () => {
    const result = pickPinnedForLang([enArch, zhGuide, enOnly], 'zh-CN', 10);
    expect(result.map((p) => p.slug)).toEqual([
      'architecture',
      'guides-front-matter.zh',
      'en-only-post',
    ]);
  });

  it('returns the top N in pinned order after deduplication', () => {
    const rows = [zhGuide, enArch, zhArch, enGuide, enOnly];
    const result = pickPinnedForLang(rows, 'en', 3);
    expect(result.map((p) => p.slug)).toEqual([
      'guides-front-matter',
      'architecture',
      'en-only-post',
    ]);
  });

  it('keeps the original order when no language is requested', () => {
    const result = pickPinnedForLang([zhGuide, enArch, zhArch], undefined, 3);
    expect(result.map((p) => p.slug)).toEqual(['guides-front-matter.zh', 'architecture']);
  });

  it('returns at most the limit', () => {
    const rows = [enArch, zhArch, enGuide, zhGuide, enOnly];
    const result = pickPinnedForLang(rows, 'en', 3);
    expect(result).toHaveLength(3);
  });

  it('handles empty input', () => {
    expect(pickPinnedForLang([], 'en')).toEqual([]);
  });
});
