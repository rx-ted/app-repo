import type { App } from './app';

export const FLOATING_WIDGET_STORAGE_KEY = 'floatingWidget';
export const FLOATING_DRAG_HINT_KEY = 'floatingDragHintSeen';

export const DEFAULT_FLOATING_MODULES: App.FloatingWidgetModuleConfig[] = [
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
];

export function resolveFloatingModules(modules?: App.FloatingWidgetModuleConfig[]) {
  if (!modules?.length) return DEFAULT_FLOATING_MODULES;
  return [...modules];
}
