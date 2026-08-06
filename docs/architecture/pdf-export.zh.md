---
title: PDF 导出
author: rx-ted
date: 2026-08-05
category: architecture
tags:
  - pdf
  - print
  - markdown
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---
[English](./pdf-export.md) | **中文**

# PDF 导出

PDF 导出会把文档**独立地**重新渲染，这样消费者自己的布局永远不会错误地裁剪或分页它，然后通过一个稳定的、携带所有页面属性的 `#export-pdf-preview` 节点打印。

## 覆盖层

```html
<Teleport to="body">
  <div v-if="pdfOverlayVisible" class="pdf-print-overlay" :style="pdfOverlayVars">
    <MarkdownRenderer
      id="export-pdf-preview"
      :content="currentValue"
      :theme="previewThemeRef"
      :code-theme="codeThemeRef"
      :mode="editorThemeRef"
      @ready="pdfOverlayReady = true"
    />
  </div>
</Teleport>
```

- 会挂载一个**全新的 `MarkdownRenderer`**（与屏幕上的预览使用相同的 theme / code theme / mode），因此打印出来的就是你看到的——包括已加载的主题样式表。
- `.pdf-print-overlay` 在屏幕上是固定的、占满整个视口的白色容器；打印时它会变成 `static` 并允许内容溢出可见。

## 打印流程

`exportPdf()`（位于 `MarkdownEditor.vue`）：

1. 显示覆盖层并重置 `pdfOverlayReady`。
2. `await nextTick()`，然后用 `requestAnimationFrame` 轮询，直到渲染器发出 `ready`（markdown 渲染是异步的——shiki、mermaid、……）。
3. 等待 `300ms` 让字体 / 布局稳定。
4. 校验 `#export-pdf-preview` 存在（对应上游 `md-editor-extension` 的 `ExportPDF` 守卫，其 `EDITOR_ID` 为 `'export-pdf-preview'`）。
5. `window.print()`；在 `afterprint` 时隐藏覆盖层，并带一个 30 秒的兜底定时器，以防 `afterprint` 永不触发（无头 / 取消对话框的场景）。

## `#export-pdf-preview` 上的页面属性

打印样式表（`MarkdownEditor.vue` 中的全局 `<style>`）把所有东西都挂到这一个节点上：

```css
@page export-pdf {
  size: A4;
  margin: 16mm 14mm;
}

#export-pdf-preview {
  page: export-pdf;
}

@media print {
  #export-pdf-preview, #export-pdf-preview * {
    print-color-adjust: exact;        /* 保留主题背景 */
    -webkit-print-color-adjust: exact;
  }
  #export-pdf-preview pre,
  #export-pdf-preview table,
  #export-pdf-preview blockquote,
  #export-pdf-preview details,
  #export-pdf-preview figure[data-rehype-pretty-code-figure],
  #export-pdf-preview .mermaid,
  #export-pdf-preview .katex-display {
    break-inside: avoid;              /* 避免在块中间分页 */
  }
  #export-pdf-preview h1, #export-pdf-preview h2,
  #export-pdf-preview h3, #export-pdf-preview h4 {
    break-after: avoid;               /* 避免孤立的标题 */
  }
}
```

- **命名页面** — `page: export-pdf` + `@page export-pdf` 让输出在稳定的 A4 纸面上分页，并使用固定的页边距，与浏览器默认纸张无关。
- **`print-color-adjust: exact`** — Chrome 的默认值是 `economy`：当“背景图形”选项关闭时，它会剥掉背景填充并把浅色文字重新映射，这会让主题化文档塌缩成“普通默认”外观。`exact` 强制把代码块填充、行内代码 chip 和主题背景带进 PDF。（已用 A/B 验证：没有它时，`printBackground: false` 的 PDF 里 mk-cute 的代码块填充和主题颜色会消失；有了它就能保留。）
- **强制溢出换行** — 打印纸面无法滚动，因此任何比页面更宽的内容都会被静默裁剪。打印样式表在 `#export-pdf-preview` 上始终让长代码行换行，并把表格约束到页面宽度（`white-space: pre-wrap`、`table-layout: fixed`），与屏幕上的 `overflowOptions` prop 无关。

消费者可以在包样式表之后发出自己的 `@page` 规则，来覆盖纸张或页边距。

## 为什么两个预览都使用这个 id

`MarkdownRenderer` 接受 `id` prop。编辑器的屏幕预览和导出覆盖层都以 `id="export-pdf-preview"` 渲染，因此你可以同时在普通页面和导出期间拿到这个节点。在短暂的导出窗口里会有两个同 id 节点（主预览 + 覆盖层）；打印 CSS 会隐藏主预览（`body > *:not(.pdf-print-overlay)`），所以没有副作用。

## 不经覆盖层的直接打印

对于不使用导出按钮、直接打印编辑器页面的消费者，作用域化的 `editor.css` 打印兜底会中和 flex 高度链（否则带 `overflow: hidden` 的有界盒子会把文档裁剪到网格高度——也就是“只打印 N 页”的 bug）。覆盖层路径是推荐方式。
