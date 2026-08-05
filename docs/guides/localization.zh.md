---
title: 本地化
author: rx-ted
date: 2026-08-05
category: guide
tags:
  - i18n
  - localization
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

[English](./localization.md) | **中文**

# 本地化

内置两种语言（`zh-CN`、`en`），位于 `src/lang/`。界面文案是以 `editor.toolbar.bold` / `editor.save` 这类键形式存在，通过一个轻量解析器（`src/lang/index.ts` 中的 `createI18n`）进行解析。

```ts
import { createI18n, registerLocale } from '@rx-ted/packages-markdown-editor';

const { t } = createI18n({
  locale: 'en',
  messages: { 'editor.toolbar.bold': 'B' }, // overrides
});

t('editor.save'); // resolves overrides → current locale → zh-CN → the key itself

registerLocale('fr', { 'editor.save': 'Enregistrer' });
```

## 解析顺序

`createI18n().t(key)` 会依次查找：

1. 实例级的 `messages` 覆写，
2. 当前语言（`zh-CN` 或 `en`），
3. 作为兜底基础的 `zh-CN` 语言包，
4. 键本身。

## 类型

- `MessageSchema` — 完整的 `zh-CN` 文案表类型。
- `EnMessageSchema` — `en` 文案表类型。
- `lang.spec.ts` 断言两种语言导出**相同的一组键**，因此只在一个语言中添加键而不同步另一个语言会导致 CI 失败。

## 新增文案

将键同时添加到 `src/lang/zh-CN.ts` 和 `src/lang/en.ts`。`MarkdownEditor` 接受 `locale` prop 和实例级的 `messages` 覆写，因此使用者无需派生语言包即可调整文案措辞。
