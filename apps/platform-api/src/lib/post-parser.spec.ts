import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST_META_KEYS, parsePostMeta, warnUnknownMetaFields } from './post-parser';

const FULL_FRONT_MATTER = `---
title: Hello World
slug: hello-world
author: rx-ted
date: 2026-08-10
category: guides
tags:
  - hono
  - vue
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 2
lang: en
cover: /assets/cover.png
doc_hash: 0123456789abcdef
---
# Body
content
`;

describe('post-parser', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses all documented fields including cover and lang', () => {
    const { data, content } = parsePostMeta(FULL_FRONT_MATTER);

    expect(data.title).toBe('Hello World');
    expect(data.slug).toBe('hello-world');
    expect(data.author).toBe('rx-ted');
    expect(String(data.date)).toContain('2026');
    expect(data.category).toBe('guides');
    expect(data.tags).toEqual(['hono', 'vue']);
    expect(data.status).toBe('published');
    expect(data.visibility).toBe('public');
    expect(data.allow_comment).toBe(true);
    expect(data.pinned).toBe(false);
    expect(data.featured_weight).toBe(2);
    expect(data.lang).toBe('en');
    expect(data.cover).toBe('/assets/cover.png');
    expect(data.doc_hash).toBe('0123456789abcdef');
    expect(content).toContain('# Body');
  });

  it('keeps unknown fields at runtime but warns about them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { data } = parsePostMeta(`---
title: T
banner: /b.png
related: [1, 2]
---
body
`);

    expect((data as unknown as Record<string, unknown>).banner).toBe('/b.png');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"banner"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"related"'));
  });

  it('does not warn for known fields', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    parsePostMeta(FULL_FRONT_MATTER);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warnUnknownMetaFields returns the unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(warnUnknownMetaFields({ title: 'x', excerpt: 'y' })).toEqual(['excerpt']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('POST_META_KEYS covers the full documented front-matter schema', () => {
    expect(POST_META_KEYS).toEqual(
      expect.arrayContaining([
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
      ]),
    );
  });
});
