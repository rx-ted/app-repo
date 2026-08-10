import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogHomeVO, BlogPostPageVO, TrendingTagItem } from '@/types/blog';
import type { App } from '@/theme/app';
import { mapPostCardVOToArticle } from '@/utils/blogView';
import { useStorage } from '@/composables/useStorage';
import { useI18n } from '@/composables/useI18n';
import { STORAGE_KEYS } from '@/constants/storage';
import { API, ERRORS, NUMBERS } from '@/constants';

export type TagItem = {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
  createdAt?: string;
};

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  postCount?: number;
  description?: string | null;
  createdAt?: string;
};

export type AuthorStats = {
  user_id: string;
  post_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  tags: Array<{ id: string; name: string; slug: string; postCount: number }>;
  categories: Array<{ id: string; name: string; slug: string; postCount: number }>;
  last_updated: string;
};

export const useBlogStore = defineStore('blog', () => {
  const hero = ref<BlogHomeVO['hero'] | null>(null);
  const featured = ref<BlogHomeVO['featured']>([]);
  const latest = ref<BlogHomeVO['latest']>([]);
  const pinned = ref<BlogHomeVO['pinned']>([]);
  const trendingTags = ref<TrendingTagItem[]>([]);
  const loading = ref(false);
  const error = ref('');

  const items = ref<App.BlogArticle[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(NUMBERS.DEFAULT_PAGE_SIZE);
  const articlesLoading = ref(false);
  const articlesError = ref<string | null>(null);
  const storage = useStorage();
  const viewMode = ref<'card' | 'list'>(
    storage.get(STORAGE_KEYS.VIEW_MODE, 'card') as 'card' | 'list',
  );

  const totalPosts = computed(() => hero.value?.stats.posts ?? 0);
  const totalViews = computed(() => hero.value?.stats.totalViews ?? 0);
  const totalLikes = computed(() => hero.value?.stats.totalLikes ?? 0);
  const totalComments = computed(() => hero.value?.stats.totalComments ?? 0);
  const tagsCount = computed(() => hero.value?.stats.tags ?? 0);
  const categoriesCount = computed(() => hero.value?.stats.categories ?? 0);

  const tagsList = ref<TagItem[]>([]);
  const categoriesList = ref<CategoryItem[]>([]);
  const tagsLoading = ref(false);
  const categoriesLoading = ref(false);

  const authorStats = ref<AuthorStats | null>(null);
  const authorStatsLoading = ref(false);

  async function fetchHome() {
    loading.value = true;
    error.value = '';
    try {
      const { locale } = useI18n();
      const response = await http.get<ApiResponse<BlogHomeVO>>(API.BLOG_SUMMARY, {
        query: { lang: locale.value },
      });
      hero.value = response.data.hero;
      featured.value = response.data.featured;
      latest.value = response.data.latest;
      pinned.value = response.data.pinned;
      trendingTags.value = response.data.trendingTags;
    } catch {
      /* backend unavailable — show empty state */
    } finally {
      loading.value = false;
    }
  }

  function setViewMode(mode: 'card' | 'list') {
    viewMode.value = mode;
    storage.set(STORAGE_KEYS.VIEW_MODE, mode);
  }

  async function fetchPage(
    targetPage?: number,
    options?: {
      excludeSlugs?: string[];
      keyword?: string;
      tag?: string;
      category?: string;
      author?: string;
    },
  ) {
    const p = targetPage ?? page.value;
    articlesLoading.value = true;
    articlesError.value = null;

    try {
      const body = await http.get<ApiResponse<BlogPostPageVO>>(API.POSTS_LIST, {
        query: {
          page: p,
          pageSize: pageSize.value,
          keyword: options?.keyword || '',
          excludeSlugs: options?.excludeSlugs ?? [],
          tag: options?.tag || undefined,
          category: options?.category || undefined,
          author: options?.author || undefined,
        },
      });
      if (body.code !== 'OK') {
        throw new Error(ERRORS.POST_ACCESS_DENIED);
      }
      const rawList = body.data?.list ?? [];
      items.value = rawList.map(mapPostCardVOToArticle);
      total.value = body.data?.total ?? rawList.length;
      page.value = p;
    } catch {
      items.value = [];
      total.value = 0;
    } finally {
      articlesLoading.value = false;
    }
  }

  async function fetchTags() {
    tagsLoading.value = true;
    try {
      const body = await http.get<ApiResponse<{ data: TagItem[]; total: number }>>(API.TAGS_LIST, {
        query: { page: 1, pageSize: 100 },
      });
      tagsList.value = body.data?.data ?? [];
    } catch {
      tagsList.value = [];
    } finally {
      tagsLoading.value = false;
    }
  }

  async function fetchCategories() {
    categoriesLoading.value = true;
    try {
      const body = await http.get<ApiResponse<CategoryItem[]>>(API.CATEGORIES_LIST);
      categoriesList.value = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
          ? body.data
          : [];
    } catch {
      categoriesList.value = [];
    } finally {
      categoriesLoading.value = false;
    }
  }

  async function fetchAuthorStats(username: string) {
    authorStatsLoading.value = true;
    try {
      const body = await http.get<ApiResponse<AuthorStats>>(
        `/author-stats/${encodeURIComponent(username)}`,
      );
      authorStats.value = body.data ?? null;
    } catch {
      authorStats.value = null;
    } finally {
      authorStatsLoading.value = false;
    }
  }

  return {
    hero,
    featured,
    latest,
    pinned,
    trendingTags,
    loading,
    error,
    items,
    total,
    page,
    pageSize,
    articlesLoading,
    articlesError,
    viewMode,
    totalPosts,
    totalViews,
    totalLikes,
    totalComments,
    tagsCount,
    categoriesCount,
    tagsList,
    categoriesList,
    tagsLoading,
    categoriesLoading,
    authorStats,
    authorStatsLoading,
    fetchHome,
    setViewMode,
    fetchPage,
    fetchTags,
    fetchCategories,
    fetchAuthorStats,
  };
});
