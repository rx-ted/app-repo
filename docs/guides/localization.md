---
title: Localization
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
lang: en
---

**English** | [中文](./localization.zh.md)

# Localization

Two built-in locales (`zh-CN`, `en`) live in `src/lang/`. UI strings are keys
like `editor.toolbar.bold` / `editor.save` resolved through a small resolver
(`createI18n` from `src/lang/index.ts`).

```ts
import { createI18n, registerLocale } from '@rx-ted/packages-markdown-editor';

const { t } = createI18n({
  locale: 'en',
  messages: { 'editor.toolbar.bold': 'B' }, // overrides
});

t('editor.save'); // resolves overrides → current locale → zh-CN → the key itself

registerLocale('fr', { 'editor.save': 'Enregistrer' });
```

## Resolution order

`createI18n().t(key)` looks up:

1. the per-instance `messages` overrides,
2. the current locale (`zh-CN` or `en`),
3. the `zh-CN` bundle as the fallback base,
4. the key itself.

## Types

- `MessageSchema` — the full `zh-CN` message table type.
- `EnMessageSchema` — the `en` table type.
- `lang.spec.ts` asserts both locales export the **same key set**, so adding a
  key in one locale without the other fails CI.

## Adding a string

Add the key to both `src/lang/zh-CN.ts` and `src/lang/en.ts`. The `MarkdownEditor`
accepts a `locale` prop and per-instance `messages` overrides, so consumers can
tune wording without forking the bundles.
