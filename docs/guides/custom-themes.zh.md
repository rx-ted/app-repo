---
title: 自定义主题
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - themes
  - scss
  - markdown
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./custom-themes.md) | **中文**

# 自定义主题

一个预览主题由 `PreviewThemeConfig` 加上一份作用域限定的 SCSS 样式表组成。两者必须遵循同一套 CSS 变量约定，这样组件才不会硬编码颜色。

## 1. 定义配置

在 `src/core/themes.ts` 的 `PREVIEW_THEMES` 中注册你的主题：

```ts
{
  id: 'my-theme',
  label: 'My Theme',
  fontFamily: "'Source Serif 4', Georgia, serif",
  fontSize: '17px',
  lineHeight: '1.9',
  contentMaxWidth: '780px',
  contentPadding: '32px',
  vars: {
    light: {
      '--me-text': '#202124',
      '--me-text-secondary': '#5f6368',
      '--me-bg': '#ffffff',
      '--me-bg-code': '#f6f8fa',
      '--me-link': '#1a73e8',
      /* ... every REQUIRED_PREVIEW_VARS key */
    },
    dark: {
      /* repeat if your theme has an official dark variant */
    },
  },
  codeTheme: { light: 'github-light', dark: 'github-dark' },
  mermaidTheme: { light: 'default', dark: 'dark' },
  darkable: true,
  source: { name: '…', author: '…', url: '…', license: 'MIT' }, // optional attribution
}
```

## 2. 编写 SCSS

创建 `src/themes/my-theme.scss`，并限定在主题作用域内，避免样式泄漏：

```scss
[data-me-preview-theme='my-theme'] {
  /* palette + typography via the --me-* variables … */

  .markdown-body {
    font-family: var(--me-font-family);
    color: var(--me-text);
    /* … full reading style */
  }
}
```

两条硬性规则，继承自 [theme-system](../architecture/theme-system.zh.md)：

- **`pre > code` 绝不能设置 `color` / `background`** —— 这些由 shiki 代码主题通过 `keepBackground: true`（内联在 `<pre>` 上）接管。这里只放块级布局（`font-family`、圆角、内边距、溢出等）。
- **行内代码** 通过 `code:not(pre > code)`（使用 `--me-bg-code`）保留其胶囊样式，因此在主题对比度修复中不会受影响。

如果你的主题没有深色变体，请设置 `darkable: false` —— 这样它在两种编辑器模式下都渲染浅色调色板（正如 mk-cute / smart-blue 所做）。

## 3. 接入构建

构建脚本（`scripts/build-themes.mjs`，由 `pretest`/`prebuild`/`predemo` 运行）会将每个 `src/themes/*.scss` 编译为 `src/themes/__gen/*.css`，包构建再将其产出为 `dist/themes/<id>.css`。`MarkdownRenderer` 和主题选择器会自动从 `PREVIEW_THEMES` 中识别新主题。

## 4. 注明来源

移植的主题应携带 `source` —— 选择器会渲染署名信息，且 `themes.spec.ts` 会检查每个条目的完整性（id、vars、`codeTheme`、`mermaidTheme`、`darkable`，以及编译产物是否存在）。

## 从掘金主题移植

现有的移植（cyanosis、smart-blue、mk-cute）都是对其 MIT 原版 SCSS 的忠实移植 —— 具体做法参见每个 `src/themes/*.scss` 的文件头：将原版样式复制到 `[data-me-preview-theme]` 作用域内，把硬编码颜色映射到 `--me-*` 约定上，并将原版的正文字体调色板保留为 `vars`。
