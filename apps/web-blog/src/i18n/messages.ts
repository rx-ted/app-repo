import type { App } from '@/theme/app';

import auth from './messages/auth';
import blog from './messages/blog';
import common from './messages/common';
import dashboard from './messages/dashboard';
import search from './messages/search';
import discover from './messages/discover';
import about from './messages/about';

export type MessageSchema = Record<string, string>;

export const messages: Record<App.Locale, MessageSchema> = {
  'zh-CN': {
    ...common['zh-CN'],
    ...auth['zh-CN'],
    ...blog['zh-CN'],
    ...dashboard['zh-CN'],
    ...search['zh-CN'],
    ...discover['zh-CN'],
    ...about['zh-CN'],
  },
  en: {
    ...common.en,
    ...auth.en,
    ...blog.en,
    ...dashboard.en,
    ...search.en,
    ...discover.en,
    ...about.en,
  },
};
