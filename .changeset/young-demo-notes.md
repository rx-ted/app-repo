---
'@rx-ted/packages-markdown-editor': patch
---

Ship the standalone demo prebuilt inside the package: `pnpm build` now also emits `dist/demo`, so the demo travels with the published `dist` folder and can be served from any project that has the package installed (`npx serve node_modules/@rx-ted/packages-markdown-editor/dist/demo`). The demo config builds with a relative base so the static site works from any path. The README's documentation links now point at the repo docs on GitHub instead of relative `../../docs/` paths that are dead in the published tarball.
