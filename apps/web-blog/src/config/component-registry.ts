import type { Component } from 'vue';
import { defineAsyncComponent } from 'vue';

type RegistryEntry = { component: Component; title: string };

const aside = {
  'author-profile': {
    component: defineAsyncComponent(() => import('@/components/blog/AuthorProfileCard.vue')),
    title: 'Author Profile',
  },
  'blog-stats': {
    component: defineAsyncComponent(() => import('@/components/blog/BlogStatsCard.vue')),
    title: 'Blog Stats',
  },
  'recommended-reading': {
    component: defineAsyncComponent(() => import('@/components/blog/RecommendedReading.vue')),
    title: 'Recommended Reading',
  },
  trending: {
    component: defineAsyncComponent(() => import('@/components/blog/Trending.vue')),
    title: 'Trending',
  },
  'tag-list': {
    component: defineAsyncComponent(() => import('@/components/blog/TagList.vue')),
    title: 'Tag List',
  },
  'category-list': {
    component: defineAsyncComponent(() => import('@/components/blog/CategoryList.vue')),
    title: 'Category List',
  },
  'ad-banner': {
    component: defineAsyncComponent(() => import('@/components/ads/AdBanner.vue')),
    title: 'Ad Banner',
  },
  toc: {
    component: defineAsyncComponent(() =>
      import('@rx-ted/packages-markdown-editor').then((m) => m.TocTree),
    ),
    title: 'Table of Contents',
  },
  'recent-posts': {
    component: defineAsyncComponent(() => import('@/components/blog/RecentPosts.vue')),
    title: 'Recent Posts',
  },
  'calendar-widget': {
    component: defineAsyncComponent(() => import('@/components/blog/CalendarWidget.vue')),
    title: 'Calendar',
  },
} satisfies Record<string, RegistryEntry>;

const content = {
  'hero-section': {
    component: defineAsyncComponent(() => import('@/components/blog/HeroSection.vue')),
    title: 'Hero Section',
  },
  'author-card': {
    component: defineAsyncComponent(() => import('@/components/blog/AuthorCard.vue')),
    title: 'Author Card',
  },
  breadcrumb: {
    component: defineAsyncComponent(() => import('@/components/blog/BreadcrumbNav.vue')),
    title: 'Breadcrumb',
  },
  'prev-next': {
    component: defineAsyncComponent(() => import('@/components/blog/PrevNext.vue')),
    title: 'Prev/Next',
  },
  'update-notice': {
    component: defineAsyncComponent(() => import('@/components/blog/UpdateNotice.vue')),
    title: 'Update Notice',
  },
  'share-tools': {
    component: defineAsyncComponent(() => import('@/components/blog/ShareTools.vue')),
    title: 'Share Tools',
  },
  donate: {
    component: defineAsyncComponent(() => import('@/components/blog/DonatePanel.vue')),
    title: 'Donate',
  },
  comments: {
    component: defineAsyncComponent(() => import('@/components/blog/CommentsSection.vue')),
    title: 'Comments',
  },
  'recommended-reading': {
    component: defineAsyncComponent(() => import('@/components/blog/RecommendedReading.vue')),
    title: 'Recommended Reading',
  },
  'ad-banner': {
    component: defineAsyncComponent(() => import('@/components/ads/AdBanner.vue')),
    title: 'Ad Banner',
  },
} satisfies Record<string, RegistryEntry>;

export type AsideComponentKey = keyof typeof aside;
export type ContentComponentKey = keyof typeof content;

export const ASIDE_COMPONENT_REGISTRY: Record<string, RegistryEntry> = aside;
export const CONTENT_COMPONENT_REGISTRY: Record<string, RegistryEntry> = content;
