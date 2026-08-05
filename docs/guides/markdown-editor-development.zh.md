---
title: 开发指南
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - development
  - build
  - testing
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./markdown-editor-development.md) | **中文**

# 开发指南

## 仓库布局

```
packages/markdown-editor/
├── demo/                    standalone demo app (its own vite config)
├── docs/
│   ├── architecture/        how the internals work
│   └── guides/              task-oriented usage
├── scripts/
│   └── build-themes.mjs     compiles src/themes/*.scss → src/themes/__gen/*.css
├── src/
│   ├── components/
│   │   ├── MarkdownEditor.vue
│   │   ├── MarkdownRenderer.vue
│   │   ├── MarkdownEditorSaveDialog.vue
│   │   ├── TocTree.vue
│   │   └── blog-editor/     composables (useTheme, useSave, useFullscreen, …)
│   ├── core/
│   │   ├── markdown.ts            unified pipeline
│   │   ├── rehypeCodeGroup.ts     code groups / diff / line highlights
│   │   ├── sourcemap.ts / syncEngine.ts / domIndex.ts / remarkSourceMap.ts
│   │   ├── themes.ts / themeCss.ts
│   │   ├── tasks.ts / stripFrontMatter.ts / headingId.ts
│   ├── lang/                zh-CN / en + createI18n
│   ├── themes/              per-theme SCSS + generated __gen/ + urls.ts
│   └── index.ts             public export surface
└── *.spec.ts                tests co-located with their source
```

## 脚本

```sh
pnpm demo          # standalone demo (http://localhost:5179)
pnpm test          # vitest run (pretest regenerates theme CSS)
pnpm typecheck     # vue-tsc --noEmit
pnpm build         # vite build + vue-tsc + postbuild (prebuild regenerates theme CSS)
```

## 构建细节

- **库构建**（`vite.config.ts`）：`src/index.ts` → `dist/index.js`（ESM）。依赖项与 peer 依赖项均被外部化。
- **主题资源**：`scripts/build-themes.mjs` 在 `pre*` 钩子中运行，将每份 SCSS 编译为 `src/themes/__gen/<id>.css`。`vite.config.ts` 将这些文件输出到 `dist/themes/<id>.css`（以 `assetInfo.originalFileName` 为键），且 `package.json` 暴露了 `./themes/*` 子路径导出。
- **`src/themes/__gen/` 被 gitignore 且为生成产物** —— 全新克隆的仓库在使用源码别名构建前，必须先运行某个 `pre*` 脚本（或执行包构建）。
- **postbuild** 会从产出的 `dist/index.d.ts` 中剥离具有副作用的 `katex.css` / 主题导入，以保证类型声明保持整洁。

## 使用者

- 本仓库的 web-blog/demo 通过 `getWorkspaceAliases`（`vitest` 导出条件）将包解析为**源码**，因此重启开发服务器后改动即可生效。
- 使用 dist 的消费者显式地从包中导入组件与主题样式表（`@rx-ted/packages-markdown-editor/themes/<id>.css`）。

## 测试约定

- 测试与源码放置在同一位置：`src/core/markdown.spec.ts`、`themes.spec.ts` 等。
- Vitest 在 **node 环境**下运行 —— `?url` CSS 导入会解析为空字符串 `""`，因此资源存在性断言检查的是磁盘上的 `src/themes/__gen/<id>.css` 文件，而非 URL 映射。
- `themes.spec.ts` 强制校验主题契约（必需 vars、`codeTheme`、`mermaidTheme`、`darkable`、`source`）以及每个主题的编译产物存在。
- `lang.spec.ts` 强制要求 zh-CN / en 键保持一致。
