import { computed, ref, type ComputedRef } from 'vue';
import { useStorage } from '@/composables/useStorage';
import type { App } from './app';
import { APP_DATA_STORAGE_KEY } from './data';

export const DefaultAppConfig: App.Config = {
  floating: {
    enabled: true,
    draggable: true,
    defaultOpen: false,
    position: {
      dock: 'left',
    },
    interactions: {
      hoverToOpen: true,
      autoCollapseOnLeave: true,
    },
    secondary: {
      compact: 'auto',
    },
    modules: [
      {
        id: 'ambient-music',
        preset: 'music',
        title: 'Ambient Mix',
        titleKey: 'floating.music.title',
        icon: 'solar:music-note-2-linear',
        description: 'Focus soundtrack and scene control',
        descriptionKey: 'floating.music.description',
        accent: 'primary',
        pinned: true,
      },
      {
        id: 'notification-center',
        preset: 'notifications',
        title: '通知中心',
        titleKey: 'floating.notifications.title',
        icon: 'solar:bell-linear',
        description: '评论、点赞和系统提醒',
        descriptionKey: 'floating.notifications.description',
        badge: 4,
        accent: 'warning',
        pinned: true,
      },
      {
        id: 'ai-assistant',
        preset: 'ai',
        title: 'AI 助手',
        titleKey: 'floating.ai.title',
        icon: 'solar:stars-line-duotone',
        description: 'Disabled by default, ready for plugin wiring',
        descriptionKey: 'floating.ai.description',
        accent: 'info',
        enabled: false,
      },
      {
        id: 'quick-tools',
        preset: 'utility',
        title: 'Quick Tools',
        titleKey: 'floating.utility.title',
        icon: 'solar:widget-5-linear',
        description: 'Theme, profile and navigation shortcuts',
        descriptionKey: 'floating.utility.description',
        accent: 'success',
      },
    ],
  },
};

const CONFIG_KEYS = new Set(['theme', 'floating']);

function isValidThemeConfig(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return Object.keys(obj).every((key) => CONFIG_KEYS.has(key));
}

export function initData(): ComputedRef<App.Config> {
  const config = ref<App.Config>({
    theme: undefined,
    floating: DefaultAppConfig.floating,
  });
  try {
    const storage = useStorage();
    const storedData = storage.get<unknown>(APP_DATA_STORAGE_KEY, null);
    if (storedData && isValidThemeConfig(storedData)) {
      config.value = {
        theme: storedData.theme as App.Config['theme'] | undefined,
        floating: storedData.floating as App.Config['floating'] | undefined,
      };
    }
  } catch {
    console.error('数据初始化失败，使用默认配置');
  }

  return computed(() => config.value);
}
