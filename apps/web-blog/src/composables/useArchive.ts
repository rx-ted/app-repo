import { ref, computed } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogPostCardVO, BlogPostPageVO } from '@/types/blog';
import { API } from '@/constants/api';

export type MonthGroup = { month: number; articles: BlogPostCardVO[] };
export type YearGroup = { year: number; months: MonthGroup[] };

export function useArchive() {
  const loading = ref(false);
  const articles = ref<BlogPostCardVO[]>([]);
  const total = ref(0);
  const error = ref<string | null>(null);

  const grouped = computed<YearGroup[]>(() => {
    const map = new Map<number, Map<number, BlogPostCardVO[]>>();

    for (const a of articles.value) {
      const d = new Date(a.published_at ?? a.updated_at);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (!map.has(y)) map.set(y, new Map());
      const monthMap = map.get(y)!;
      if (!monthMap.has(m)) monthMap.set(m, []);
      monthMap.get(m)!.push(a);
    }

    const result: YearGroup[] = [];
    const years = [...map.keys()].sort((a, b) => b - a);
    for (const y of years) {
      const monthMap = map.get(y)!;
      const months: MonthGroup[] = [...monthMap.keys()]
        .sort((a, b) => b - a)
        .map((m) => ({ month: m, articles: monthMap.get(m)! }));
      result.push({ year: y, months });
    }
    return result;
  });

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      const response = await http.get<ApiResponse<BlogPostPageVO>>(API.POSTS_LIST, {
        query: { page: 1, pageSize: 9999 },
      });
      articles.value = response.data.list;
      total.value = response.data.total;
    } catch {
      articles.value = [];
      total.value = 0;
    } finally {
      loading.value = false;
    }
  }

  return { loading, articles, total, grouped, error, fetchAll };
}
