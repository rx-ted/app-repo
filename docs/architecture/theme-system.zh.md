---
title: 主题系统
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - themes
  - markdown
  - css
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---
[English](./theme-system.md) | **中文**

# 主题系统

主题化是**数据 + 编译后的 CSS 资源**，而不是写死的逻辑。`src/core/themes.ts` 负责数据结构和精选列表；`src/themes/*.scss` 负责真正的阅读样式；构建脚本把每个 SCSS 编译成独立的 CSS 资源；`themeCss.ts` 在运行时只注入当前激活的主题。

## 配置结构

```ts
interface PreviewThemeConfig {
  id: string;                    // 稳定 id，同时也是 attribute 的值
  label: string;                 // 选择器中显示的名称
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  contentMaxWidth: string;       // 内容“盒子”
  contentPadding: string;
  vars: Record<EditorTheme, Record<string, string>>;  // 每个 light/dark 的调色板
  codeTheme: Record<EditorTheme, string>;             // 每个模式默认的 shiki 主题
  mermaidTheme: Record<EditorTheme, 'default' | 'dark'>;
  darkable: boolean;             // 是否存在官方深色变体？
  source?: ThemeSource;          // 移植主题的来源署名
}
```

### CSS 变量约定

每个主题的 SCSS 都定义相同的约定，因此组件永远不会硬编码颜色。必需的调色板变量（`REQUIRED_PREVIEW_VARS`）：

```
--me-text --me-text-secondary --me-text-muted --me-text-tertiary
--me-border --me-bg --me-bg-soft --me-bg-code --me-bg-highlight
--me-primary --me-link --me-success --me-warning --me-danger --me-info
--me-bg-success --me-bg-warning --me-bg-danger --me-bg-info --me-error
```

再加上排版 / 盒子变量（`REQUIRED_PREVIEW_TYPOGRAPHY`）：

```
--me-font-family --me-font-size --me-line-height
--me-content-max-width --me-content-padding
```

`themes.spec.ts` 会断言每个已注册主题都定义了上述所有变量。

## 从 SCSS 到每个主题的 CSS 资源

1. `src/themes/<id>.scss` — 完整的阅读样式表，作用域限定在 `[data-me-preview-theme="<id>"]` 下（调色板不同时还有 `[data-me-mode]`）。
2. `scripts/build-themes.mjs`（由 `pretest` / `prebuild` / `predemo` 运行）把每个 SCSS 编译到 `src/themes/__gen/<id>.css`（gitignored，每次运行都会重新生成）。
3. 包的 `vite.config.ts` 通过 `assetInfo.originalFileName` 把这些生成的文件路由到 `dist/themes/<id>.css`，而不是带哈希的 `assets/` 目录；`package.json` 暴露 `./themes/*` 子路径导出，让打包器消费者可以直接导入。

> **给新克隆仓库的提醒：** `__gen/` 是生成的，所以先构建该包（或运行它的 `pre*` 脚本），再通过源码别名构建消费它的应用。

## 运行时加载

`src/core/themeCss.ts`：

```ts
loadPreviewThemeCss(themeId)  // 按主题幂等地注入 <link>
resetPreviewThemeCss()        // 仅测试用
```

- 每个主题 id 会在 `<head>` 中追加一个 `<link rel="stylesheet">`，并标记为 `data-me-theme-css="<id>"`，**最多一次**——这些 link 从不被拆除，因此切换主题很廉价，同一页面可以共存多个预览（例如主题弹窗示例）。
- `MarkdownRenderer` 在挂载时以及 `theme` 变化时调用它，并把 `data-me-preview-theme` / `data-me-mode` 应用到根元素。编辑器的预览面板通过同一个组件做相同的事。
- 因为主题 `<link>` 在**包 CSS 之后**加载，在同等特异性下主题规则按源码顺序胜出。这正是主题样式表需要作用域（`[data-me-preview-theme]`）的原因——既避免跨主题泄漏，又能胜过基础规则。

### 消费者

- **源码消费者**（本仓库 `getWorkspaceAliases`，位于 web-blog/demo）：`?url` 主题导入会被打包并自动输出。
- **dist 消费者**：通过自己的打包器显式导入样式表：

  ```ts
  import '@rx-ted/packages-markdown-editor/themes/cyanosis.css';
  ```

## 代码块与主题对比度

两条规则保证代码在所有主题组合下都清晰可读：

1. **`keepBackground: true`** — shiki 把 `background-color` 内联写到 `<pre>` 上，而 `figure[data-rehype-pretty-code-figure]` / `.code-group` 的背景是 `transparent`。代码块背景由代码主题（而非阅读主题）决定。
2. **`pre > code` 绝不强制 color/background** — 移植的掘金主题原本硬编码了 `pre > code { color; background }`，会与 shiki 的内联样式冲突（例如深色 mk-cute chip 文字出现在浅色代码块上）。这些声明会被剥掉；行内代码通过 `code:not(pre > code)`（使用 `--me-bg-code`）保留其主题身份。

## 编辑器 chrome 与预览主题

- `EDITOR_THEMES`（`light` / `dark`）+ `EDITOR_THEME_VARS` 定义 chrome（工具栏、面板、对话框），由 `applyEditorTheme(el, theme)` 应用。
- **预览主题**是独立的：`useTheme`（位于 `src/components/blog-editor/useTheme.ts`）持有 `editorThemeRef`、`previewThemeRef`、`codeThemeRef`，与 props 保持同步，并运行主题选择器弹窗（草稿选择 + 实时样例渲染）。
- `darkable: false` 的主题（mk-cute、smart-blue）没有官方深色变体，因此在两种编辑器模式下都渲染其浅色调色板——与原版行为一致。

## 六个精选主题

| id | 调色板 | `darkable` | 来源 |
| --- | --- | --- | --- |
| `github` | GitHub light/dark | ✓ | — |
| `vscode` | VS Code light/dark | ✓ | — |
| `vuepress` | VuePress light/dark | ✓ | — |
| `cyanosis` | Cyanosis light/dark | ✓ | [cumt-robin/juejin-markdown-theme-cyanosis](https://github.com/cumt-robin/juejin-markdown-theme-cyanosis) (MIT) |
| `smart-blue` | Smart blue（light） | — | [cumt-robin/juejin-markdown-theme-smart-blue](https://github.com/cumt-robin/juejin-markdown-theme-smart-blue) (MIT) |
| `mk-cute` | Mk cute（light） | — | [Jacky-Summer/juejin-markdown-theme-mk-cute](https://github.com/Jacky-Summer/juejin-markdown-theme-mk-cute) (MIT) |

三个移植主题都是忠实的 SCSS 移植（见每个 `src/themes/*.scss` 的文件头），并会把 `source` 署名带进选择器。

要添加你自己的主题，见 [自定义主题](../guides/custom-themes.zh.md)。
