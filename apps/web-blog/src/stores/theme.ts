import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getLocalOsTheme } from '@/composables/utils';
import { useStorage } from '@/composables/useStorage';
import { STORAGE_KEYS } from '@/constants/storage';
import type { App } from '@/theme/app';

function resolveMode(config?: App.ThemeMode) {
  const storage = useStorage();
  return (
    config ??
    (storage.get(STORAGE_KEYS.THEME_MODE, null) as App.ThemeMode | null) ??
    getLocalOsTheme()
  );
}

function resolveColor(config?: App.ThemeBrandType) {
  const storage = useStorage();
  return (
    config ?? (storage.get(STORAGE_KEYS.THEME_COLOR, null) as App.ThemeBrandType | null) ?? 'green'
  );
}

export const useThemeStore = defineStore('theme', () => {
  const storage = useStorage();
  const mode = ref<App.ThemeMode>('dark');
  const color = ref<App.ThemeBrandType>('green');
  const darkTransition = ref<boolean>(true);

  const isDark = computed(() => mode.value === 'dark');

  function init(config?: App.Config['theme']) {
    mode.value = resolveMode(config?.mode);
    color.value = resolveColor(config?.color);
  }

  function setMode(m: App.ThemeMode) {
    mode.value = m;
    storage.set(STORAGE_KEYS.THEME_MODE, m);
  }

  function setColor(c: App.ThemeBrandType) {
    color.value = c;
    storage.set(STORAGE_KEYS.THEME_COLOR, c);
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark');
  }

  return {
    // state
    mode,
    color,
    darkTransition,

    // getters
    isDark,

    // actions
    init,
    setMode,
    setColor,
    toggle,
  };
});
