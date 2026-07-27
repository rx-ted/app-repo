import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NUMBERS } from '@/constants';

class SearchUnavailableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'SearchUnavailableError';
  }
}

const searchPosts = vi.fn();

vi.mock('@/api/search', () => ({
  searchPosts,
  SearchUnavailableError,
}));

const pushMock = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ query: { q: '' } }),
}));

describe('useSearch', () => {
  beforeEach(() => {
    vi.resetModules();
    searchPosts.mockReset();
    pushMock.mockReset();
  });

  it('runSearch calls API with correct parameters', async () => {
    vi.useFakeTimers();
    const mockResults = {
      list: [{ slug: 'post-1', title: 'Post 1', id: 1, updated_at: '2024-01-01' }],
    };
    searchPosts.mockResolvedValue(mockResults);

    const { useSearch } = await import('./useSearch');
    const { keyword, results, loading, open } = useSearch();

    keyword.value = 'vue';
    await vi.advanceTimersByTimeAsync(NUMBERS.DEBOUNCE_MS);

    expect(searchPosts).toHaveBeenCalledWith('vue', 1, NUMBERS.MAX_SEARCH_RESULTS);
    expect(results.value).toEqual(mockResults.list);
    expect(loading.value).toBe(false);
    expect(open.value).toBe(true);

    vi.useRealTimers();
  });

  it('handles API errors with unavailableMessage', async () => {
    vi.useFakeTimers();
    searchPosts.mockRejectedValue(new SearchUnavailableError('Search is down'));

    const { useSearch } = await import('./useSearch');
    const { keyword, results, unavailableMessage, loading } = useSearch();

    keyword.value = 'error-test';
    await vi.advanceTimersByTimeAsync(NUMBERS.DEBOUNCE_MS);

    expect(unavailableMessage.value).toBe('Search is down');
    expect(results.value).toEqual([]);
    expect(loading.value).toBe(false);

    vi.useRealTimers();
  });

  it('handles generic errors with default SEARCH_UNAVAILABLE message', async () => {
    vi.useFakeTimers();
    searchPosts.mockRejectedValue(new Error('Network failure'));

    const { useSearch } = await import('./useSearch');
    const { keyword, unavailableMessage } = useSearch();

    keyword.value = 'error';
    await vi.advanceTimersByTimeAsync(NUMBERS.DEBOUNCE_MS);

    expect(unavailableMessage.value).toBe('搜索暂时不可用，请稍后再试。');

    vi.useRealTimers();
  });

  it('submits empty keyword does not navigate', async () => {
    const { useSearch } = await import('./useSearch');
    const { keyword, submit } = useSearch();

    keyword.value = '  ';
    submit();

    expect(pushMock).not.toHaveBeenCalled();
  });

  it('submit navigates to search page with keyword', async () => {
    const { useSearch } = await import('./useSearch');
    const { keyword, submit, open } = useSearch();

    keyword.value = 'vue';
    submit();

    expect(pushMock).toHaveBeenCalledWith({
      path: '/search',
      query: { q: 'vue' },
    });
    expect(open.value).toBe(false);
  });
});
