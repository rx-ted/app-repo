import { THEME_CSS_URLS } from '../themes/urls';

/**
 * Injects the active preview theme's compiled CSS as a <link> in <head>.
 *
 * Each theme stylesheet is scoped under its own `[data-me-preview-theme]`
 * selector, so multiple themes can coexist on one page (e.g. the editor's
 * preview pane and the theme-modal preview). A theme is loaded at most once;
 * links are never torn down, which also keeps switching themes cheap.
 */
const loaded = new Set<string>();

export function loadPreviewThemeCss(themeId: string): void {
  if (typeof document === 'undefined' || loaded.has(themeId)) return;
  const href = THEME_CSS_URLS[themeId];
  if (!href) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.meThemeCss = themeId;
  document.head.appendChild(link);
  loaded.add(themeId);
}

/** For tests: forget all injected stylesheet links. */
export function resetPreviewThemeCss(): void {
  loaded.clear();
}
