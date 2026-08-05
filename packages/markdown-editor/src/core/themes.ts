import { bundledThemes } from 'shiki';

export type EditorTheme = 'light' | 'dark';

/** Attribution for preview themes ported from third-party sources. */
export interface ThemeSource {
  /** Name of the original theme / repository. */
  name: string;
  /** Original author (GitHub handle). */
  author: string;
  /** Source repository URL. */
  url: string;
  /** License of the original theme. */
  license: string;
}

export interface PreviewThemeConfig {
  id: string;
  label: string;
  /** Font stack applied to the rendered document. */
  fontFamily: string;
  /** Base font size of the markdown body. */
  fontSize: string;
  /** Base line height of the markdown body. */
  lineHeight: string;
  /** Max width of the content column (the "box"); centered when narrower than the pane. */
  contentMaxWidth: string;
  /** Inner padding around the content box. */
  contentPadding: string;
  /**
   * Color palette per editor mode. Day/night flips the palette of the active
   * preview theme, so each theme keeps its own brand background in both modes.
   * Themes without an official dark variant (darkable: false) repeat their
   * light palette in both modes.
   */
  vars: Record<EditorTheme, Record<string, string>>;
  /** Default code highlight theme per mode (overridable via codeTheme). */
  codeTheme: Record<EditorTheme, string>;
  /** Mermaid rendering theme per mode. */
  mermaidTheme: Record<EditorTheme, 'default' | 'dark'>;
  /**
   * Whether the theme ships an official dark variant. When false the theme is
   * light-only and renders its light design even under a dark editor theme
   * (matching the original, which has no dark variant).
   */
  darkable: boolean;
  /** Origin of ported themes; absent for themes authored in-repo. */
  source?: ThemeSource;
}

export interface EditorThemeConfig {
  id: EditorTheme;
  dark: boolean;
  vars: Record<string, string>;
}

/**
 * Every code theme the underlying shiki dependency supports.
 * Consumed by the code-highlighting pipeline (`rehype-pretty-code`).
 */
export const CODE_THEMES: string[] = Object.keys(bundledThemes);

export const REQUIRED_PREVIEW_VARS = [
  '--me-text',
  '--me-text-secondary',
  '--me-text-muted',
  '--me-text-tertiary',
  '--me-border',
  '--me-bg',
  '--me-bg-soft',
  '--me-bg-code',
  '--me-bg-highlight',
  '--me-primary',
  '--me-link',
  '--me-success',
  '--me-warning',
  '--me-danger',
  '--me-info',
  '--me-bg-success',
  '--me-bg-warning',
  '--me-bg-danger',
  '--me-bg-info',
  '--me-error',
] as const;

/** Typography / box variables set per preview theme (not present in the chrome palette). */
export const REQUIRED_PREVIEW_TYPOGRAPHY = [
  '--me-font-family',
  '--me-font-size',
  '--me-line-height',
  '--me-content-max-width',
  '--me-content-padding',
] as const;

/**
 * The curated preview themes. Each one is a complete reading style — prose
 * colors for both day and night, typography and the content box — so the
 * light/dark mode flips the palette while the theme keeps its identity.
 *
 * Three themes are faithful ports of juejin markdown themes and carry their
 * original source in `source` (see each SCSS in `src/themes/` for the ported
 * stylesheet). mk-cute and smart-blue are light-only (`darkable: false`):
 * they render their light design even under a dark editor theme, matching the
 * original.
 */
export const PREVIEW_THEMES: PreviewThemeConfig[] = [
  {
    id: 'github',
    label: 'GitHub',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'",
    fontSize: '16px',
    lineHeight: '1.5',
    contentMaxWidth: '100%',
    contentPadding: '24px 24px 48px',
    codeTheme: { light: 'github-light', dark: 'github-dark' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: true,
    vars: {
      light: {
        '--me-text': '#1f2328',
        '--me-text-secondary': '#57606a',
        '--me-text-muted': '#8c959f',
        '--me-text-tertiary': '#6e7781',
        '--me-border': '#d0d7de',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f6f8fa',
        '--me-bg-code': '#f6f8fa',
        '--me-bg-highlight': 'rgba(59, 130, 246, 0.15)',
        '--me-primary': '#0969da',
        '--me-link': '#0969da',
        '--me-success': '#1a7f37',
        '--me-warning': '#9a6700',
        '--me-danger': '#cf222e',
        '--me-info': '#0969da',
        '--me-bg-success': '#dafbe1',
        '--me-bg-warning': '#fff8c5',
        '--me-bg-danger': '#ffebe9',
        '--me-bg-info': '#ddf4ff',
        '--me-error': '#cf222e',
      },
      dark: {
        '--me-text': '#e6edf3',
        '--me-text-secondary': '#9198a1',
        '--me-text-muted': '#6e7681',
        '--me-text-tertiary': '#8b949e',
        '--me-border': '#30363d',
        '--me-bg': '#0d1117',
        '--me-bg-soft': '#161b22',
        '--me-bg-code': '#161b22',
        '--me-bg-highlight': 'rgba(88, 166, 255, 0.15)',
        '--me-primary': '#4493f8',
        '--me-link': '#4493f8',
        '--me-success': '#3fb950',
        '--me-warning': '#d29922',
        '--me-danger': '#f85149',
        '--me-info': '#4493f8',
        '--me-bg-success': 'rgba(46, 160, 67, 0.15)',
        '--me-bg-warning': 'rgba(187, 128, 9, 0.15)',
        '--me-bg-danger': 'rgba(248, 81, 73, 0.1)',
        '--me-bg-info': 'rgba(56, 139, 253, 0.15)',
        '--me-error': '#f85149',
      },
    },
  },
  {
    id: 'vscode',
    label: 'VS Code',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: '16px',
    lineHeight: '1.6',
    contentMaxWidth: '100%',
    contentPadding: '32px 40px 48px',
    codeTheme: { light: 'light-plus', dark: 'dark-plus' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: true,
    vars: {
      light: {
        '--me-text': '#1f1f1f',
        '--me-text-secondary': '#616161',
        '--me-text-muted': '#8a8a8a',
        '--me-text-tertiary': '#717171',
        '--me-border': '#d4d4d4',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f3f3f3',
        '--me-bg-code': '#f2f2f2',
        '--me-bg-highlight': 'rgba(0, 106, 177, 0.15)',
        '--me-primary': '#006ab1',
        '--me-link': '#006ab1',
        '--me-success': '#388a34',
        '--me-warning': '#895503',
        '--me-danger': '#a1260d',
        '--me-info': '#006ab1',
        '--me-bg-success': 'rgba(56, 138, 52, 0.15)',
        '--me-bg-warning': 'rgba(137, 85, 3, 0.15)',
        '--me-bg-danger': 'rgba(161, 38, 13, 0.12)',
        '--me-bg-info': 'rgba(0, 106, 177, 0.12)',
        '--me-error': '#a1260d',
      },
      dark: {
        '--me-text': '#d4d4d4',
        '--me-text-secondary': '#cccccc',
        '--me-text-muted': '#808080',
        '--me-text-tertiary': '#9d9d9d',
        '--me-border': '#454545',
        '--me-bg': '#1e1e1e',
        '--me-bg-soft': '#252526',
        '--me-bg-code': '#1e1e1e',
        '--me-bg-highlight': 'rgba(55, 148, 255, 0.18)',
        '--me-primary': '#3794ff',
        '--me-link': '#3794ff',
        '--me-success': '#89d185',
        '--me-warning': '#cca700',
        '--me-danger': '#f14c4c',
        '--me-info': '#3794ff',
        '--me-bg-success': 'rgba(137, 209, 133, 0.15)',
        '--me-bg-warning': 'rgba(204, 167, 0, 0.15)',
        '--me-bg-danger': 'rgba(241, 76, 76, 0.15)',
        '--me-bg-info': 'rgba(55, 148, 255, 0.15)',
        '--me-error': '#f14c4c',
      },
    },
  },
  {
    id: 'mk-cute',
    label: 'Mk-Cute',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif",
    fontSize: '16px',
    lineHeight: '1.75',
    contentMaxWidth: '880px',
    contentPadding: '32px 40px 56px',
    codeTheme: { light: 'one-light', dark: 'one-dark-pro' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: false,
    source: {
      name: 'juejin-markdown-theme-mk-cute',
      author: 'Jacky-Summer',
      url: 'https://github.com/Jacky-Summer/juejin-markdown-theme-mk-cute',
      license: 'MIT',
    },
    vars: {
      light: {
        '--me-text': '#36ace1',
        '--me-text-secondary': '#606266',
        '--me-text-muted': '#909399',
        '--me-text-tertiary': '#909399',
        '--me-border': '#d8dde3',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f7f8fa',
        '--me-bg-code': '#282c34',
        '--me-bg-highlight': 'rgba(54, 172, 225, 0.15)',
        '--me-primary': '#36ace1',
        '--me-link': '#409eff',
        '--me-success': '#409eff',
        '--me-warning': '#409eff',
        '--me-danger': '#f56c6c',
        '--me-info': '#409eff',
        '--me-bg-success': 'rgba(64, 158, 255, 0.15)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.15)',
        '--me-bg-danger': 'rgba(245, 108, 108, 0.15)',
        '--me-bg-info': 'rgba(64, 158, 255, 0.15)',
        '--me-error': '#f56c6c',
      },
      dark: {
        '--me-text': '#36ace1',
        '--me-text-secondary': '#606266',
        '--me-text-muted': '#909399',
        '--me-text-tertiary': '#909399',
        '--me-border': '#d8dde3',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f7f8fa',
        '--me-bg-code': '#282c34',
        '--me-bg-highlight': 'rgba(54, 172, 225, 0.15)',
        '--me-primary': '#36ace1',
        '--me-link': '#409eff',
        '--me-success': '#409eff',
        '--me-warning': '#409eff',
        '--me-danger': '#f56c6c',
        '--me-info': '#409eff',
        '--me-bg-success': 'rgba(64, 158, 255, 0.15)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.15)',
        '--me-bg-danger': 'rgba(245, 108, 108, 0.15)',
        '--me-bg-info': 'rgba(64, 158, 255, 0.15)',
        '--me-error': '#f56c6c',
      },
    },
  },
  {
    id: 'vuepress',
    label: 'VuePress',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: '16px',
    lineHeight: '1.7',
    contentMaxWidth: '740px',
    contentPadding: '32px 40px 56px',
    codeTheme: { light: 'min-light', dark: 'min-dark' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: true,
    vars: {
      light: {
        '--me-text': '#2c3e50',
        '--me-text-secondary': '#4e6e8e',
        '--me-text-muted': '#8492a6',
        '--me-text-tertiary': '#6a8bad',
        '--me-border': '#eaecef',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f8f8f9',
        '--me-bg-code': '#f7f7f7',
        '--me-bg-highlight': 'rgba(62, 175, 124, 0.14)',
        '--me-primary': '#3eaf7c',
        '--me-link': '#3eaf7c',
        '--me-success': '#42b983',
        '--me-warning': '#e6a23c',
        '--me-danger': '#c0392b',
        '--me-info': '#2973b7',
        '--me-bg-success': 'rgba(66, 185, 131, 0.15)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.15)',
        '--me-bg-danger': 'rgba(192, 57, 43, 0.12)',
        '--me-bg-info': 'rgba(41, 115, 183, 0.12)',
        '--me-error': '#c0392b',
      },
      dark: {
        '--me-text': '#cfd4dc',
        '--me-text-secondary': '#9aa4b2',
        '--me-text-muted': '#6b7480',
        '--me-text-tertiary': '#8b94a1',
        '--me-border': '#3a3f45',
        '--me-bg': '#1b1b1f',
        '--me-bg-soft': '#242429',
        '--me-bg-code': '#282c34',
        '--me-bg-highlight': 'rgba(99, 226, 183, 0.16)',
        '--me-primary': '#42b983',
        '--me-link': '#63e2b7',
        '--me-success': '#42b983',
        '--me-warning': '#e6a23c',
        '--me-danger': '#e0655a',
        '--me-info': '#4d8fd6',
        '--me-bg-success': 'rgba(66, 185, 131, 0.16)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.16)',
        '--me-bg-danger': 'rgba(224, 101, 90, 0.16)',
        '--me-bg-info': 'rgba(77, 143, 214, 0.16)',
        '--me-error': '#e0655a',
      },
    },
  },
  {
    id: 'cyanosis',
    label: 'Cyanosis',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
    fontSize: '15px',
    lineHeight: '1.75',
    contentMaxWidth: '880px',
    contentPadding: '32px 40px 56px',
    codeTheme: { light: 'github-light', dark: 'github-dark' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: true,
    source: {
      name: 'juejin-markdown-theme-cyanosis',
      author: 'linxsbox',
      url: 'https://github.com/linxsbox/juejin-markdown-theme-cyanosis',
      license: 'MIT',
    },
    vars: {
      light: {
        '--me-text': '#353535',
        '--me-text-secondary': '#666666',
        '--me-text-muted': '#8c8c8c',
        '--me-text-tertiary': '#8c8c8c',
        '--me-border': '#bedcff',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f0fdff',
        '--me-bg-code': '#fff4f4',
        '--me-bg-highlight': 'rgba(61, 168, 245, 0.15)',
        '--me-primary': '#005bb7',
        '--me-link': '#3da8f5',
        '--me-success': '#2196f3',
        '--me-warning': '#2196f3',
        '--me-danger': '#c2185b',
        '--me-info': '#4fc3f7',
        '--me-bg-success': 'rgba(33, 150, 243, 0.12)',
        '--me-bg-warning': 'rgba(33, 150, 243, 0.12)',
        '--me-bg-danger': 'rgba(194, 24, 91, 0.12)',
        '--me-bg-info': 'rgba(79, 195, 247, 0.15)',
        '--me-error': '#c2185b',
      },
      dark: {
        '--me-text': '#cacaca',
        '--me-text-secondary': '#c7c7c7',
        '--me-text-muted': '#999999',
        '--me-text-tertiary': '#999999',
        '--me-border': '#ffe3ba',
        '--me-bg': '#2f2f2f',
        '--me-bg-soft': 'rgba(255, 199, 116, 0.1)',
        '--me-bg-code': 'rgba(255, 227, 185, 0.5)',
        '--me-bg-highlight': 'rgba(255, 182, 72, 0.15)',
        '--me-primary': '#dddddd',
        '--me-link': '#ffb648',
        '--me-success': '#fe9900',
        '--me-warning': '#fe9900',
        '--me-danger': '#ffb648',
        '--me-info': '#ffd28e',
        '--me-bg-success': 'rgba(254, 153, 0, 0.12)',
        '--me-bg-warning': 'rgba(254, 153, 0, 0.12)',
        '--me-bg-danger': 'rgba(255, 182, 72, 0.12)',
        '--me-bg-info': 'rgba(255, 210, 142, 0.15)',
        '--me-error': '#ffb648',
      },
    },
  },
  {
    id: 'smart-blue',
    label: 'Smart Blue',
    fontFamily:
      "-apple-system, system-ui, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.75',
    contentMaxWidth: '880px',
    contentPadding: '32px 40px 56px',
    codeTheme: { light: 'github-light', dark: 'github-dark' },
    mermaidTheme: { light: 'default', dark: 'dark' },
    darkable: false,
    source: {
      name: 'juejin-markdown-theme-smart-blue',
      author: 'cumt-robin',
      url: 'https://github.com/cumt-robin/juejin-markdown-theme-smart-blue',
      license: 'MIT',
    },
    vars: {
      light: {
        '--me-text': '#595959',
        '--me-text-secondary': '#666666',
        '--me-text-muted': '#8c8c8c',
        '--me-text-tertiary': '#8c8c8c',
        '--me-border': '#dfe2e5',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f6f8fa',
        '--me-bg-code': '#f8f8f8',
        '--me-bg-highlight': 'rgba(19, 92, 224, 0.12)',
        '--me-primary': '#135ce0',
        '--me-link': '#036aca',
        '--me-success': '#036aca',
        '--me-warning': '#e6a23c',
        '--me-danger': '#c0392b',
        '--me-info': '#135ce0',
        '--me-bg-success': 'rgba(3, 106, 202, 0.12)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.12)',
        '--me-bg-danger': 'rgba(192, 57, 43, 0.12)',
        '--me-bg-info': 'rgba(19, 92, 224, 0.12)',
        '--me-error': '#c0392b',
      },
      dark: {
        '--me-text': '#595959',
        '--me-text-secondary': '#666666',
        '--me-text-muted': '#8c8c8c',
        '--me-text-tertiary': '#8c8c8c',
        '--me-border': '#dfe2e5',
        '--me-bg': '#ffffff',
        '--me-bg-soft': '#f6f8fa',
        '--me-bg-code': '#f8f8f8',
        '--me-bg-highlight': 'rgba(19, 92, 224, 0.12)',
        '--me-primary': '#135ce0',
        '--me-link': '#036aca',
        '--me-success': '#036aca',
        '--me-warning': '#e6a23c',
        '--me-danger': '#c0392b',
        '--me-info': '#135ce0',
        '--me-bg-success': 'rgba(3, 106, 202, 0.12)',
        '--me-bg-warning': 'rgba(230, 162, 60, 0.12)',
        '--me-bg-danger': 'rgba(192, 57, 43, 0.12)',
        '--me-bg-info': 'rgba(19, 92, 224, 0.12)',
        '--me-error': '#c0392b',
      },
    },
  },
];

export const DEFAULT_PREVIEW_THEME = 'github';

export const EDITOR_THEMES: EditorTheme[] = ['light', 'dark'];

/**
 * Neutral editor chrome palette (toolbar, borders, textarea background) per
 * mode. Independent from the preview theme; the preview pane gets its colors
 * from the active preview theme's palette instead.
 */
export const EDITOR_THEME_VARS: Record<EditorTheme, Record<string, string>> = {
  light: {
    '--me-text': '#1f2328',
    '--me-text-secondary': '#57606a',
    '--me-text-muted': '#8c959f',
    '--me-text-tertiary': '#6e7781',
    '--me-border': '#d0d7de',
    '--me-bg': '#ffffff',
    '--me-bg-soft': '#f6f8fa',
    '--me-bg-code': '#f6f8fa',
    '--me-bg-highlight': 'rgba(59, 130, 246, 0.15)',
    '--me-primary': '#0969da',
    '--me-link': '#0969da',
    '--me-success': '#1a7f37',
    '--me-warning': '#9a6700',
    '--me-danger': '#cf222e',
    '--me-info': '#0969da',
    '--me-bg-success': '#dafbe1',
    '--me-bg-warning': '#fff8c5',
    '--me-bg-danger': '#ffebe9',
    '--me-bg-info': '#ddf4ff',
    '--me-error': '#cf222e',
  },
  dark: {
    '--me-text': '#e6edf3',
    '--me-text-secondary': '#9198a1',
    '--me-text-muted': '#6e7681',
    '--me-text-tertiary': '#8b949e',
    '--me-border': '#30363d',
    '--me-bg': '#0d1117',
    '--me-bg-soft': '#161b22',
    '--me-bg-code': '#161b22',
    '--me-bg-highlight': 'rgba(88, 166, 255, 0.15)',
    '--me-primary': '#4493f8',
    '--me-link': '#4493f8',
    '--me-success': '#3fb950',
    '--me-warning': '#d29922',
    '--me-danger': '#f85149',
    '--me-info': '#4493f8',
    '--me-bg-success': 'rgba(46, 160, 67, 0.15)',
    '--me-bg-warning': 'rgba(187, 128, 9, 0.15)',
    '--me-bg-danger': 'rgba(248, 81, 73, 0.1)',
    '--me-bg-info': 'rgba(56, 139, 253, 0.15)',
    '--me-error': '#f85149',
  },
};

export function getPreviewTheme(id: string): PreviewThemeConfig {
  return PREVIEW_THEMES.find((t) => t.id === id) ?? PREVIEW_THEMES[0];
}

export function getPreviewPalette(
  theme: PreviewThemeConfig,
  mode: EditorTheme,
): Record<string, string> {
  return theme.vars[mode];
}

export function applyPreviewTheme(
  el: HTMLElement,
  theme: PreviewThemeConfig,
  mode: EditorTheme,
): void {
  for (const [key, value] of Object.entries(theme.vars[mode])) {
    el.style.setProperty(key, value);
  }
  const typography: Array<[string, string]> = [
    ['--me-font-family', theme.fontFamily],
    ['--me-font-size', theme.fontSize],
    ['--me-line-height', theme.lineHeight],
    ['--me-content-max-width', theme.contentMaxWidth],
    ['--me-content-padding', theme.contentPadding],
  ];
  for (const [key, value] of typography) {
    el.style.setProperty(key, value);
  }
}

export function getEditorTheme(id: EditorTheme): EditorThemeConfig {
  return { id, dark: id === 'dark', vars: EDITOR_THEME_VARS[id] };
}

export function applyEditorTheme(el: HTMLElement, theme: EditorThemeConfig): void {
  for (const [key, value] of Object.entries(theme.vars)) {
    el.style.setProperty(key, value);
  }
}
