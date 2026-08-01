import { describe, it, expect } from 'vitest';
import {
  __version,
  MarkdownIndex,
  DomIndex,
  SyncEngine,
  SyncReason,
  stripFrontMatter,
  headingId,
  buildMarkdownPipeline,
  renderMarkdown,
  PREVIEW_THEMES,
  DEFAULT_PREVIEW_THEME,
  EDITOR_THEMES,
  getPreviewTheme,
  createI18n,
  registerLocale,
  remarkSourceMap,
  remarkCodeLabel,
  rehypeCodeGroup,
} from './index';

describe('package entry', () => {
  it('exposes a version marker', () => {
    expect(__version).toBe('1.0.0');
  });

  it('exposes core classes', () => {
    expect(MarkdownIndex).toBeTypeOf('function');
    expect(DomIndex).toBeTypeOf('function');
    expect(SyncEngine).toBeTypeOf('function');
    expect(SyncReason).toBeTypeOf('object');
  });

  it('exposes pure helpers', () => {
    expect(stripFrontMatter('---\na: b\n---\n# Hi')).toBe('# Hi');
    expect(headingId({ text: 'Hello World' })).toBe('hello-world');
    expect(remarkSourceMap).toBeTypeOf('function');
    expect(remarkCodeLabel).toBeTypeOf('function');
    expect(rehypeCodeGroup).toBeTypeOf('function');
  });

  it('exposes pipeline builders', () => {
    expect(buildMarkdownPipeline).toBeTypeOf('function');
    expect(renderMarkdown).toBeTypeOf('function');
  });

  it('exposes theme registry', () => {
    expect(PREVIEW_THEMES.length).toBe(6);
    expect(DEFAULT_PREVIEW_THEME).toBe('github-light');
    expect(EDITOR_THEMES).toEqual(['light', 'dark']);
    expect(getPreviewTheme('nope').id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('exposes i18n', () => {
    const { t } = createI18n();
    expect(t('saveArticle')).toBe('保存文章');
    registerLocale('xx' as never, { saveArticle: 'X' });
    expect(createI18n({ locale: 'xx' as never }).t('saveArticle')).toBe('X');
  });
});
