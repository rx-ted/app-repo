import { describe, it, expect, vi } from 'vitest';
import { bundledThemes } from 'shiki';
import {
  PREVIEW_THEMES,
  REQUIRED_PREVIEW_VARS,
  REQUIRED_PREVIEW_TYPOGRAPHY,
  DEFAULT_PREVIEW_THEME,
  CODE_THEMES,
  getPreviewTheme,
  getPreviewPalette,
  EDITOR_THEMES,
  EDITOR_THEME_VARS,
  getEditorTheme,
  applyPreviewTheme,
  applyEditorTheme,
} from './themes';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('themes registry', () => {
  it('preview theme ids are unique and non-empty', () => {
    const ids = PREVIEW_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of PREVIEW_THEMES) expect(t.id.length).toBeGreaterThan(0);
  });

  it('offers exactly the curated set of six preview themes', () => {
    expect(PREVIEW_THEMES.map((t) => t.id).sort()).toEqual([
      'cyanosis',
      'github',
      'mk-cute',
      'smart-blue',
      'vscode',
      'vuepress',
    ]);
  });

  it('default preview theme exists in the registry', () => {
    expect(getPreviewTheme(DEFAULT_PREVIEW_THEME).id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('unknown preview theme falls back to the default', () => {
    expect(getPreviewTheme('no-such-theme').id).toBe(DEFAULT_PREVIEW_THEME);
  });

  it('every preview theme defines every required css variable in both modes', () => {
    for (const t of PREVIEW_THEMES) {
      for (const mode of EDITOR_THEMES) {
        for (const key of REQUIRED_PREVIEW_VARS) {
          expect(t.vars[mode][key], `${t.id}/${mode} is missing ${key}`).toBeTruthy();
        }
      }
    }
  });

  it('every preview theme defines the typography and box variables', () => {
    for (const t of PREVIEW_THEMES) {
      expect(t.fontFamily).toBeTruthy();
      expect(t.fontSize).toBeTruthy();
      expect(t.lineHeight).toBeTruthy();
      expect(t.contentMaxWidth).toBeTruthy();
      expect(t.contentPadding).toBeTruthy();
    }
  });

  it('light-only themes repeat their light palette in dark mode', () => {
    for (const t of PREVIEW_THEMES) {
      if (!t.darkable) expect(t.vars.dark).toEqual(t.vars.light);
    }
  });

  it('only darkable themes ship an official dark variant', () => {
    expect(getPreviewTheme('github').darkable).toBe(true);
    expect(getPreviewTheme('vscode').darkable).toBe(true);
    expect(getPreviewTheme('vuepress').darkable).toBe(true);
    expect(getPreviewTheme('cyanosis').darkable).toBe(true);
    expect(getPreviewTheme('mk-cute').darkable).toBe(false);
    expect(getPreviewTheme('smart-blue').darkable).toBe(false);
  });

  it('ported themes carry their original source attribution', () => {
    for (const id of ['cyanosis', 'mk-cute', 'smart-blue']) {
      const t = getPreviewTheme(id);
      expect(t.source?.url).toMatch(/^https:\/\/github\.com\//);
      expect(t.source?.name).toBeTruthy();
      expect(t.source?.author).toBeTruthy();
      expect(t.source?.license).toBe('MIT');
    }
    for (const id of ['github', 'vscode', 'vuepress']) {
      expect(getPreviewTheme(id).source).toBeUndefined();
    }
  });

  it('every preview theme has a compiled css asset', () => {
    for (const t of PREVIEW_THEMES) {
      const asset = fileURLToPath(new URL(`../themes/__gen/${t.id}.css`, import.meta.url));
      expect(existsSync(asset), `${t.id} → ${asset}`).toBe(true);
    }
  });

  it('every preview default codeTheme is a shiki-bundled theme in both modes', () => {
    for (const t of PREVIEW_THEMES) {
      for (const mode of EDITOR_THEMES) {
        expect(Object.hasOwn(bundledThemes, t.codeTheme[mode]), t.codeTheme[mode]).toBe(true);
      }
    }
  });

  it('dark mode preview themes use the dark mermaid theme', () => {
    for (const t of PREVIEW_THEMES) {
      expect(t.mermaidTheme.dark).toBe('dark');
      expect(t.mermaidTheme.light).toBe('default');
    }
  });

  it('getPreviewPalette returns the palette of the requested mode', () => {
    const theme = getPreviewTheme(DEFAULT_PREVIEW_THEME);
    expect(getPreviewPalette(theme, 'light')).toBe(theme.vars.light);
    expect(getPreviewPalette(theme, 'dark')).toBe(theme.vars.dark);
  });

  it('editor themes are exactly light and dark', () => {
    expect(EDITOR_THEMES).toEqual(['light', 'dark']);
  });

  it('CODE_THEMES mirrors the shiki bundled themes', () => {
    expect(CODE_THEMES.length).toBe(Object.keys(bundledThemes).length);
    expect(CODE_THEMES).toEqual(
      expect.arrayContaining(['github-light', 'one-dark-pro', 'tokyo-night', 'light-plus']),
    );
    for (const t of PREVIEW_THEMES) {
      expect(CODE_THEMES).toContain(t.codeTheme.light);
      expect(CODE_THEMES).toContain(t.codeTheme.dark);
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

  it('applyPreviewTheme writes the palette and typography variables onto an element', () => {
    const setProperty = vi.fn();
    const el = { style: { setProperty } } as unknown as HTMLElement;
    applyPreviewTheme(el, getPreviewTheme(DEFAULT_PREVIEW_THEME), 'dark');
    expect(setProperty.mock.calls.length).toBeGreaterThan(0);
    for (const [name, value] of setProperty.mock.calls) {
      expect(name).toMatch(/^--me-/);
      expect(value).toBeTruthy();
    }
    const names = setProperty.mock.calls.map(([name]) => name as string);
    for (const key of REQUIRED_PREVIEW_VARS) expect(names).toContain(key);
    for (const key of REQUIRED_PREVIEW_TYPOGRAPHY) expect(names).toContain(key);
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
