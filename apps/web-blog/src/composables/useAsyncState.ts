import { type Ref, ref } from 'vue';

export function useAsyncState<T, A extends unknown[]>(
  fn: (...args: A) => Promise<T>,
  defaultValue: T,
) {
  const data = ref<T>(defaultValue) as Ref<T>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute(...args: A): Promise<T | null> {
    loading.value = true;
    error.value = null;
    try {
      const result = await fn(...args);
      data.value = result;
      return result;
    } catch (e: any) {
      error.value = e?.message || 'Unknown error';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, execute };
}
