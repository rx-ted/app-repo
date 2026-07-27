import { darkTheme, lightTheme } from 'naive-ui';
import { computed, nextTick, provide, watch } from 'vue';
import { useThemeStore } from '@/stores/theme';
import { useData } from '@/theme/data';
import { NUMBERS } from '@/constants';

export function useTheme() {
  const data = useData();
  const store = useThemeStore();

  // App.Config.theme → store
  watch(
    () => data.value?.theme,
    (theme) => {
      store.init(theme);
    },
    { immediate: true, deep: true },
  );

  // DOM 副作用
  watch(
    () => store.isDark,
    (dark) => {
      document.documentElement.classList.toggle('dark', dark);
    },
    { immediate: true },
  );

  const theme = computed(() => (store.isDark ? darkTheme : lightTheme));

  return {
    theme,
    themeMode: computed(() => store.mode),
    themeColor: computed(() => store.color),
    isDark: computed(() => store.isDark),
    darkTransition: computed(() => store.darkTransition),
    toggleTheme: store.toggle,
    setTheme: store.setMode,
    setColor: store.setColor,
  };
}

// TODO: https://vitepress.dev/zh/guide/extending-default-theme#on-appearance-toggle
export function useThemeTransition() {
  const { toggleTheme, isDark, darkTransition } = useTheme();

  if (!darkTransition.value) return;

  const enableTransitions = () =>
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  provide('toggle-appearance', async (event?: MouseEvent) => {
    if (!enableTransitions() || !event) {
      toggleTheme();
      return;
    }
    const { clientX: x, clientY: y } = event;

    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      )}px at ${x}px ${y}px)`,
    ];

    await document.startViewTransition(async () => {
      toggleTheme();
      await nextTick();
    }).ready;

    document.documentElement.animate(
      { clipPath: isDark.value ? clipPath.reverse() : clipPath },
      {
        duration: NUMBERS.THEME_TRANSITION_DURATION,
        easing: 'ease-in',
        fill: 'forwards',
        pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`,
      },
    );
  });
}
