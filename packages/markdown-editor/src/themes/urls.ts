// Build-time per-theme CSS assets. Each theme is compiled from its SCSS in
// `src/themes/<id>.scss` into `src/themes/__gen/<id>.css` (see
// scripts/build-themes.mjs), then emitted by the library build as
// `dist/themes/<id>.css`. The `?url` imports keep those files as separate,
// relative assets so a theme's stylesheet is only fetched when it is actually
// applied.
import cyanosisCss from './__gen/cyanosis.css?url';
import githubCss from './__gen/github.css?url';
import mkCuteCss from './__gen/mk-cute.css?url';
import smartBlueCss from './__gen/smart-blue.css?url';
import vscodeCss from './__gen/vscode.css?url';
import vuepressCss from './__gen/vuepress.css?url';

/** Maps every preview theme id to its compiled CSS asset URL. */
export const THEME_CSS_URLS: Record<string, string> = {
  github: githubCss,
  vscode: vscodeCss,
  vuepress: vuepressCss,
  cyanosis: cyanosisCss,
  'mk-cute': mkCuteCss,
  'smart-blue': smartBlueCss,
};
