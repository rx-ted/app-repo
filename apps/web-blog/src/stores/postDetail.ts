import { defineStore } from 'pinia';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { App } from '@/theme/app';
import type { BlogPostDetailVO } from '@/types/blog';
import { mapPostDetailVOToArticle } from '@/utils/blogView';
import { ERRORS } from '@/constants';
import { useAsyncState } from '@/composables/useAsyncState';

export const usePostDetailStore = defineStore('postDetail', () => {
  const {
    data: item,
    loading,
    error,
    execute,
  } = useAsyncState(
    async (slug: string) => {
      const body = await http.get<ApiResponse<BlogPostDetailVO>>(`/posts/${slug}`);
      if (body.code !== 'OK' || !body.data) {
        throw new Error(ERRORS.API_RETURNED_EMPTY);
      }
      return mapPostDetailVOToArticle(body.data);
    },
    null as App.BlogArticle | null,
  );

  async function fetchBySlug(slug: string) {
    await execute(slug);
    if (error.value) {
      item.value = null;
    }
  }

  return {
    item,
    loading,
    error,
    fetchBySlug,
  };
});
