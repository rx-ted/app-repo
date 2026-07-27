import { Icon } from '@iconify/vue';
import { useBreakpoints } from '@vueuse/core';
import { NIcon, useOsTheme } from 'naive-ui';
import { h } from 'vue';
import { useRoute } from 'vue-router';
import type { App } from '@/theme/app';
import { NUMBERS } from '@/constants';

export const isMobile = useBreakpoints({ mobile: NUMBERS.MOBILE_BREAKPOINT }).smaller('mobile');

export function getLocalOsTheme() {
  return useOsTheme().value || 'light';
}

export function renderIcon(name: string, size = 24, color?: string) {
  return () =>
    h(NIcon, null, {
      default: () => h(Icon, { icon: name, width: size, height: size, color: color }),
    });
}

export function normalizeNav(items: App.NavItem[], level = 1): App.NavItem[] {
  return items.map((item) => {
    if (level > NUMBERS.MAX_NAV_DEPTH) {
      console.warn(`[HeaderNav] Nav level > 3 is not supported: ${item.label}`);
      return {
        ...item,
        disabled: true,
        children: undefined,
      };
    }

    return {
      ...item,
      children: item.children ? normalizeNav(item.children, level + 1) : undefined,
    };
  });
}

export function isActive(path?: string) {
  const route = useRoute();
  if (!path) return false;
  return route.path === path || route.path.startsWith(`${path}/`);
}
