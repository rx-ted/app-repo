// src/composables/useSearch.ts
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { BlogPostCardVO } from '@/types/blog';
import { SearchUnavailableError, searchPosts } from '@/api/search';
import { ERRORS, NUMBERS } from '@/constants';

export function useSearch() {
  const router = useRouter();
  const route = useRoute();
  const keyword = ref('');
  const open = ref(false);
  const loading = ref(false);
  const results = ref<BlogPostCardVO[]>([]);
  const unavailableMessage = ref('');
  const activeIndex = ref(-1);
  const inputRef = ref<{ focus: () => void } | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let searchToken = 0;

  const openSearch = async () => {
    open.value = true;
    await nextTick();
    inputRef.value?.focus?.();
  };

  const closeSearch = () => {
    open.value = false;
  };

  const runSearch = async (term: string) => {
    const currentToken = ++searchToken;
    loading.value = true;
    try {
      const response = await searchPosts(term, 1, NUMBERS.MAX_SEARCH_RESULTS);

      if (currentToken !== searchToken) return;
      unavailableMessage.value = '';
      results.value = response.list;
      activeIndex.value = response.list.length ? 0 : -1;
    } catch (error) {
      if (currentToken !== searchToken) return;
      results.value = [];
      activeIndex.value = -1;
      unavailableMessage.value =
        error instanceof SearchUnavailableError ? error.message : ERRORS.SEARCH_UNAVAILABLE;
    } finally {
      if (currentToken === searchToken) {
        loading.value = false;
      }
    }
  };

  const submit = () => {
    const q = keyword.value.trim();
    if (!q) return;
    closeSearch();
    router.push({
      path: '/search',
      query: {
        q,
      },
    });
  };

  const selectResult = (slug: string) => {
    closeSearch();
    router.push(`/posts/${slug}`);
  };

  const moveActive = (direction: 1 | -1) => {
    if (!results.value.length) return;
    const total = results.value.length;
    if (activeIndex.value < 0) {
      activeIndex.value = 0;
      return;
    }
    activeIndex.value = (activeIndex.value + direction + total) % total;
  };

  const setActive = (index: number) => {
    activeIndex.value = index;
  };

  const selectActive = () => {
    const target = results.value[activeIndex.value];
    if (activeIndex.value < 0 || !target) {
      submit();
      return;
    }
    selectResult(target.slug);
  };

  const handleSearchKeydown = (event: KeyboardEvent) => {
    if (!open.value) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      selectActive();
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    const isK = e.key.toLowerCase() === 'k';
    const isCmd = e.metaKey || e.ctrlKey;

    if (isCmd && isK) {
      e.preventDefault();
      openSearch();
    }
  };

  watch(keyword, (value) => {
    const term = value.trim();
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    if (!term) {
      loading.value = false;
      results.value = [];
      unavailableMessage.value = '';
      activeIndex.value = -1;
      return;
    }

    open.value = true;
    debounceTimer = setTimeout(() => {
      void runSearch(term);
    }, NUMBERS.DEBOUNCE_MS);
  });

  watch(
    () => route.query.q,
    (value) => {
      if (typeof value === 'string' && value !== keyword.value) {
        keyword.value = value;
      }
    },
    { immediate: true },
  );

  onMounted(() => window.addEventListener('keydown', onKeydown));
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  });

  return {
    keyword,
    open,
    loading,
    results,
    unavailableMessage,
    activeIndex,
    inputRef,
    openSearch,
    closeSearch,
    submit,
    selectResult,
    handleSearchKeydown,
    setActive,
  };
}
