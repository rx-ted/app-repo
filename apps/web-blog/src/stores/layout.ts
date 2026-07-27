import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { DEFAULT_LAYOUT_CONFIG, LAYOUT } from '@/constants/layout';
import { STORAGE_KEYS } from '@/constants/storage';
import { useStorage } from '@/composables/useStorage';
import type {
  LayoutConfig,
  LayoutId,
  LayoutType,
  FullOptions,
  DocOptions,
  SimpleOptions,
  BlankOptions,
  SaveLayoutConfigPartial,
} from '@/types/layout';

export const useLayoutStore = defineStore('layout', () => {
  const storage = useStorage();
  const config = ref<LayoutConfig>(loadFromStorage());
  const initDone = ref(false);

  const layoutId = computed<LayoutId>(() => config.value.layoutId);
  const topPinned = computed(() => config.value.topPinned);

  const fullOptions = computed<FullOptions>(() => config.value.layouts.full);
  const docOptions = computed<DocOptions>(() => config.value.layouts.doc);
  const simpleOptions = computed<SimpleOptions>(() => config.value.layouts.simple);
  const blankOptions = computed<BlankOptions>(() => config.value.layouts.blank);

  function getLayoutOptions(
    type: LayoutType,
  ): FullOptions | DocOptions | SimpleOptions | BlankOptions {
    return config.value.layouts[type];
  }

  function loadFromStorage(): LayoutConfig {
    const parsed = storage.get<LayoutConfig | null>(STORAGE_KEYS.USER_LAYOUT, null);
    if (parsed) {
      return deepMerge(DEFAULT_LAYOUT_CONFIG, { ...parsed, layoutId: LAYOUT.DEFAULT_ID });
    }
    return { ...DEFAULT_LAYOUT_CONFIG };
  }

  function deepMerge(base: LayoutConfig, override: Partial<LayoutConfig>): LayoutConfig {
    return {
      ...base,
      ...override,
      layouts: {
        ...base.layouts,
        ...(override.layouts
          ? {
              full: { ...base.layouts.full, ...override.layouts.full },
              doc: { ...base.layouts.doc, ...override.layouts.doc },
              simple: { ...base.layouts.simple, ...override.layouts.simple },
              blank: { ...base.layouts.blank, ...override.layouts.blank },
            }
          : {}),
      },
    };
  }

  function persistToStorage(cfg: LayoutConfig): void {
    storage.set(STORAGE_KEYS.USER_LAYOUT, cfg);
  }

  async function init(): Promise<void> {
    if (initDone.value) return;
    config.value = loadFromStorage();
    initDone.value = true;
  }

  function resetToDefaults(): void {
    config.value = { ...DEFAULT_LAYOUT_CONFIG, layoutId: LAYOUT.DEFAULT_ID };
    persistToStorage(config.value);
  }

  function save(newConfig: LayoutConfig): void {
    config.value = { ...newConfig, layoutId: LAYOUT.DEFAULT_ID };
    persistToStorage(config.value);
  }

  function savePartial(partial: SaveLayoutConfigPartial): void {
    (config.value.layouts as Record<string, unknown>)[partial.type] = partial.options;
    persistToStorage(config.value);
  }

  return {
    config,
    initDone,
    layoutId,
    topPinned,
    fullOptions,
    docOptions,
    simpleOptions,
    blankOptions,
    getLayoutOptions,
    init,
    resetToDefaults,
    save,
    savePartial,
  };
});
