---
'@rx-ted/packages-markdown-editor': patch
---

Commit the generated per-theme CSS assets (`src/themes/__gen/*.css`) so apps that consume the package source can build from a fresh checkout without depending on the theme codegen step or the turbo build cache
