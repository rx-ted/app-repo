import { computed, ref } from 'vue';
import { useStorage } from '@/composables/useStorage';
import { STORAGE_KEYS } from '@/constants/storage';

export type ContentLanguageMode = 'original' | 'translated' | 'bilingual';

const storage = useStorage();
const mode = ref<ContentLanguageMode>(
  storage.get(STORAGE_KEYS.CONTENT_LANG_MODE, 'bilingual') as ContentLanguageMode,
);

export function useContentLanguage() {
  function setMode(next: ContentLanguageMode) {
    mode.value = next;
    storage.set(STORAGE_KEYS.CONTENT_LANG_MODE, next);
  }

  return {
    mode: computed(() => mode.value),
    setMode,
  };
}
