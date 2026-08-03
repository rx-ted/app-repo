import { describe, it, expect, vi } from 'vitest';
import { bundledThemes } from 'shiki';
import {
  PREVIEW_THEMES,
  REQUIRED_PREVIEW_VARS,
  DEFAULT_PREVIEW_THEME,
  CODE_THEMES,
  getPreviewTheme,
  EDITOR_THEMES,
  EDITOR_THEME_VARS,
  getEditorTheme,
  applyPreviewTheme,
  applyEditorTheme,
} from './themes';

describe('themes registry', () => {
  it('preview theme ids are unique and non-empty', () => {
    const ids = PREVIEW_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PREVIEW_THEMES) expect(t.id.length).toBeGreaterThan(0);
  });

  it('offers a curated set of light and dark preview themes', () => {
    expect(PREVIEW_THEMES.length).toBeGreaterThanOrEqual(15);
    expect(PREVIEW_THEMES.some((t) => !t.dark)).toBe(true);
    expect(PREVIEW_THEMES.some((t) => t.dark)).toBe(true);
  });

  it('default preview theme exists in the registry', () => {
    expect(getPreviewTheme(DEFAULT_PREVIEW_THEME).id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('unknown preview theme falls back to the default', () => {
    expect(getPreviewTheme('no-such-theme').id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('every preview theme defines every required css variable', () => {
    for (const t of PREVIEW_THEMES) {
      for (const key of REQUIRED_PREVIEW_VARS) {
        expect(t.vars[key], `${t.id} is missing ${key}`).toBeTruthy();
      }
    }
  });

  it('every preview codeTheme is a shiki-bundled theme', () => {
    for (const t of PREVIEW_THEMES) {
      expect(Object.hasOwn(bundledThemes, t.codeTheme), t.codeTheme).toBe(true);
    }
  });

  it('dark preview themes use the dark mermaid theme', () => {
    for (const t of PREVIEW_THEMES) {
      expect(t.dark).toBe(t.mermaidTheme === 'dark');
    }
  });

  it('editor themes are exactly light and dark', () => {
    expect(EDITOR_THEMES).toEqual(['light', 'dark']);
  });

  it('CODE_THEMES mirrors the shiki bundled themes', () => {
    expect(CODE_THEMES.length).toBe(Object.keys(bundledThemes).length);
    expect(CODE_THEMES).toEqual(
      expect.arrayContaining(['github-light', 'one-dark-pro', 'tokyo-night']),
    );
    for (const t of PREVIEW_THEMES) {
      expect(CODE_THEMES).toContain(t.codeTheme);
    }
  });

  it('both editor themes define every required css variable', () => {
    for (const key of REQUIRED_PREVIEW_VARS) {
      for (const id of EDITOR_THEMES) {
        expect(EDITOR_THEME_VARS[id][key], `${id} is missing ${key}`).toBeTruthy();
      }
    }
  });

  it('getEditorTheme returns a config matching the requested id', () => {
    expect(getEditorTheme('dark').dark).toBe(true);
    expect(getEditorTheme('light').dark).toBe(false);
    expect(getEditorTheme('light').vars).toBe(EDITOR_THEME_VARS.light);
  });

  it('applyPreviewTheme writes css variables onto an element', () => {
    const setProperty = vi.fn();
    const el = { style: { setProperty } } as unknown as HTMLElement;
    applyPreviewTheme(el, getPreviewTheme(DEFAULT_PREVIEW_THEME));
    expect(setProperty.mock.calls.length).toBeGreaterThan(0);
    for (const [name, value] of setProperty.mock.calls) {
      expect(name).toMatch(/^--me-/);
      expect(value).toBeTruthy();
    }
  });

  it('applyEditorTheme writes css variables onto an element', () => {
    const setProperty = vi.fn();
    const el = { style: { setProperty } } as unknown as HTMLElement;
    applyEditorTheme(el, getEditorTheme('dark'));
    expect(setProperty.mock.calls.length).toBeGreaterThan(0);
    for (const [name, value] of setProperty.mock.calls) {
      expect(name).toMatch(/^--me-/);
      expect(value).toBeTruthy();
    }
  });
});
