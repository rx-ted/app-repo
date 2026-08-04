import { describe, it, expect, vi } from 'vitest';
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
  CODE_THEMES,
  DEFAULT_PREVIEW_THEME,
  EDITOR_THEMES,
  EDITOR_THEME_VARS,
  getPreviewTheme,
  getEditorTheme,
  applyEditorTheme,
  isTaskChecked,
  toggleTask,
  createI18n,
  registerLocale,
  remarkSourceMap,
  rehypeInteractiveTasks,
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
    expect(PREVIEW_THEMES.length).toBeGreaterThanOrEqual(15);
    expect(DEFAULT_PREVIEW_THEME).toBe('github-light');
    expect(EDITOR_THEMES).toEqual(['light', 'dark']);
    expect(CODE_THEMES).toContain('github-light');
    expect(getPreviewTheme('nope').id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('exposes editor theme helpers', () => {
    expect(EDITOR_THEME_VARS.light['--me-bg']).toBeTruthy();
    expect(getEditorTheme('dark').dark).toBe(true);
    const setProperty = vi.fn();
    applyEditorTheme({ style: { setProperty } } as unknown as HTMLElement, getEditorTheme('light'));
    expect(setProperty.mock.calls.length).toBeGreaterThan(0);
  });

  it('exposes task toggling and interactive-task pipeline support', () => {
    expect(toggleTask('- [ ] a', 0, true)).toBe('- [x] a');
    expect(isTaskChecked('- [x] a', 0)).toBe(true);
    expect(rehypeInteractiveTasks).toBeTypeOf('function');
  });

  it('exposes i18n', () => {
    const { t } = createI18n();
    expect(t('saveArticle')).toBe('保存到本地');
    registerLocale('xx' as never, { saveArticle: 'X' });
    expect(createI18n({ locale: 'xx' as never }).t('saveArticle')).toBe('X');
  });
});
