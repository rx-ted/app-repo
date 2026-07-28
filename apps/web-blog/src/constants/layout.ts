import type { LayoutConfig } from '@/types/layout';

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  layoutId: 'layout-1',
  topPinned: false,
  header: {
    left: ['logo'],
    center: ['search'],
    right: ['theme', 'locale', 'notifications', 'user'],
  },
  sider: {
    menuItems: ['home', 'posts', 'about'],
  },
  layouts: {
    full: {
      showAsideLeft: false,
      showAsideRight: true,
      asideLeftComponents: [],
      asideRightComponents: [
        'author-profile',
        'blog-stats',
        'recommended-reading',
        // 'trending',
        'calendar-widget',
        'tag-list',
        'category-list',
        'ad-banner',
      ],
      showBeforeContent: true,
      showAfterContent: true,
      beforeContentComponents: ['hero-section'],
      afterContentComponents: ['ad-banner'],
    },
    doc: {
      showAsideRight: true,
      showAsideLeft: false,
      showTopAd: false,
      asideRightComponents: ['ad-banner', 'toc'],
      asideLeftComponents: [
        'recommended-reading',
        'recent-posts',
        // 'trending',
        'tag-list',
        'category-list',
      ],
      showBeforeContent: true,
      showAfterContent: true,
      beforeContentComponents: [
        'ad-banner',
        'author-card',
        'breadcrumb',
        'prev-next',
        'update-notice',
      ],
      afterContentComponents: ['share-tools', 'donate', 'comments', 'recommended-reading'],
    },
    simple: {},
    blank: {},
  },
};

export const LAYOUT = {
  CACHE_TTL: 7 * 24 * 60 * 60 * 1000,
  DEFAULT_ID: 'layout-1',
  LAYOUT_2_ID: 'layout-2',
} as const;
