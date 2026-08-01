import { describe, it, expect } from 'vitest';
import { stripFrontMatter } from './stripFrontMatter';

describe('stripFrontMatter', () => {
  it('strips a leading YAML front matter block', () => {
    const md = [
      '---',
      'title: Hello',
      'author: rx-ted',
      'doc_hash: abc123',
      '---',
      '# Body',
      '',
      'Content here.',
    ].join('\n');

    expect(stripFrontMatter(md)).toBe('# Body\n\nContent here.');
  });

  it('keeps the rest of the document intact', () => {
    const md = '---\ntags:\n  - a\n  - b\n---\n# Title\n\npara';
    const stripped = stripFrontMatter(md);
    expect(stripped).toContain('# Title');
    expect(stripped).not.toContain('tags:');
    expect(stripped).not.toContain('---');
  });

  it('leaves markdown without front matter unchanged', () => {
    const md = '# No front matter\n\nJust body.';
    expect(stripFrontMatter(md)).toBe(md);
  });

  it('leaves a document that only starts with a horizontal rule unchanged', () => {
    const md = '---\n\n# Body';
    expect(stripFrontMatter(md)).toBe(md);
  });

  it('handles CRLF line endings', () => {
    const md = '---\r\ntitle: T\r\n---\r\n# Body';
    expect(stripFrontMatter(md)).toBe('# Body');
  });

  it('handles an empty front matter block', () => {
    const md = '---\n---\nBody text';
    expect(stripFrontMatter(md)).toBe('Body text');
  });
});
