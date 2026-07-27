<script setup lang="ts">
import { computed, h, inject, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from '@/theme/useTheme';
import { useI18n } from '@/composables/useI18n';
import { THEME } from '@/constants/theme';
import { NDropdown } from 'naive-ui';
import type { DropdownOption } from 'naive-ui';
import BlogUserMenu from '@/components/users/BlogUserMenu.vue';
import AppIcon from '@/components/AppIcon.vue';

const brandColorMap: Record<string, string> = {
  blue: '#3B82F6',
  green: '#22C55E',
  orange: '#F97316',
  purple: '#8B5CF6',
  red: '#EF4444',
};

defineProps<{
  showNav?: boolean;
}>();

const emit = defineEmits<{
  'search-click': [];
}>();

const route = useRoute();
const router = useRouter();
const { isDark, toggleTheme, themeColor, setColor } = useTheme();
const { locale, setLocale, t } = useI18n();

const toggleAppearance = inject('toggle-appearance', (event?: MouseEvent) => {
  toggleTheme();
});

const mobileMoreOpen = ref(false);

const localeOptions = computed<DropdownOption[]>(() => [
  { label: '中文', key: 'zh-CN' },
  { label: 'English', key: 'en' },
]);

function handleLocaleSelect(key: string) {
  setLocale(key as 'zh-CN' | 'en');
}

const colorOptions = computed<DropdownOption[]>(() =>
  THEME.BRANDS.map((c) => ({
    label: t(`color.${c}`),
    key: c,
    icon: () =>
      h('span', {
        style: {
          display: 'inline-block',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: brandColorMap[c],
          verticalAlign: 'middle',
        },
      }),
  })),
);

function handleColorSelect(key: string) {
  setColor(key as (typeof THEME.BRANDS)[number]);
}

const notifOptions = computed<DropdownOption[]>(() => [
  { label: t('common.notImplemented'), key: 'placeholder', disabled: true },
]);

interface NavItem {
  label: string;
  path?: string;
  href?: string;
  target?: '_self' | '_blank';
  children?: { label: string; path: string; href?: string; target?: '_self' | '_blank' }[];
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/' },
  {
    label: 'Articles',
    children: [
      { label: 'Tags', path: '/tags' },
      { label: 'Categories', path: '/categories' },
      { label: 'Calendar', path: '/calendar' },
      { label: 'Archive', path: '/archive' },
    ],
  },
  { label: 'Discover', path: '/discover' },
  { label: 'Guestbook', path: '/guestbook' },
  { label: 'Write', path: '/editor' },
  { label: 'GitHub', href: 'https://github.com/rx-ted', target: '_blank' },
  { label: 'About', path: '/about' },
];

function isActive(item: NavItem): boolean {
  const checkPath = (path: string) => {
    if (path === '/') return route.path === '/';
    if (path === '/about') return route.path.startsWith('/about');
    if (path === '/editor') return route.path.startsWith('/editor');
    return route.path.startsWith(path);
  };
  if (item.path && checkPath(item.path)) return true;
  if (item.children) return item.children.some((c) => c.path && checkPath(c.path));
  return false;
}

function handleNavClick(item: NavItem) {
  if (item.href) {
    window.open(item.href, item.target ?? '_self', 'noopener,noreferrer');
  } else if (item.path) {
    router.push(item.path);
  }
}

function handleNavSelect(key: string) {
  router.push(key);
  mobileMoreOpen.value = false;
}

const pageTitle = computed(() => {
  if (route.path === '/') return '';
  const name = route.name as string | undefined;
  if (!name) return '';
  const map: Record<string, string> = {
    home: '',
    posts: 'Posts',
    'post-detail': 'Post',
    about: 'About',
    'editor-create': 'Editor',
    'editor-edit': 'Editor',
    login: 'Login',
    register: 'Register',
    search: 'Search',
    profile: 'Profile',
    dashboard: 'Dashboard',
    'dashboard-posts': 'Dashboard',
    'dashboard-drafts': 'Dashboard',
    'dashboard-categories': 'Dashboard',
    'dashboard-tags': 'Dashboard',
    'dashboard-settings': 'Settings',
    'forgot-password': 'Forgot Password',
    'not-found': 'Not Found',
    author: 'Author',
    archive: 'Archive',
    calendar: 'Calendar',
    discover: 'Discover',
    guestbook: 'Guestbook',
  };
  return map[name] ?? String(name);
});

const localeKey = computed(() => (locale.value === 'zh-CN' ? '中文' : 'English'));
</script>

<template>
  <header class="app-topbar">
    <div class="topbar-left">
      <span class="topbar-logo" @click="router.push('/')">Blog</span>
      <template v-if="showNav">
        <div class="search-box" @click="emit('search-click')">
          <AppIcon name="tabler:search" :width="16" :height="16" />
          <span class="search-box-placeholder">{{ t('header.search.placeholder') }}</span>
          <span class="search-box-shortcut">⌘K</span>
        </div>
      </template>
      <template v-else>
        <span v-if="pageTitle" class="topbar-separator">|</span>
        <span v-if="pageTitle" class="topbar-page">{{ pageTitle }}</span>
      </template>
    </div>

    <template v-if="showNav">
      <nav class="topbar-center topbar-nav-centered">
        <template v-for="item in navItems" :key="item.label">
          <n-dropdown
            v-if="item.children"
            trigger="hover"
            :options="item.children.map(c => ({ label: c.label, key: c.path }))"
            @select="handleNavSelect"
          >
            <span
              class="topbar-nav-item"
              :class="{ active: isActive(item) }"
              @click="handleNavClick(item)"
            >
              {{ item.label }}
              <AppIcon name="tabler:chevron-down" :width="12" :height="12" />
            </span>
          </n-dropdown>
          <a
            v-else-if="item.href"
            :href="item.href"
            :target="item.target ?? '_self'"
            rel="noopener noreferrer"
            class="topbar-nav-item"
            >{{ item.label }} <AppIcon name="tabler:external-link" :width="12" :height="12" /></a
          >
          <span
            v-else
            class="topbar-nav-item"
            :class="{ active: isActive(item) }"
            @click="handleNavClick(item)"
            >{{ item.label }}</span
          >
        </template>
      </nav>
      <div class="search-box-mobile-wrap">
        <span class="search-box-mobile" @click="emit('search-click')">
          <AppIcon name="tabler:search" :width="18" :height="18" />
        </span>
      </div>
    </template>

    <div v-else class="topbar-center" @click="emit('search-click')">
      <span class="search-icon"><AppIcon name="tabler:search" :width="16" :height="16" /></span>
      <span class="search-placeholder">{{ t('header.search.placeholder') }}</span>
      <span class="search-shortcut">⌘K</span>
    </div>

    <div class="topbar-right">
      <template v-if="!showNav">
        <n-dropdown trigger="click" :options="localeOptions" @select="handleLocaleSelect">
          <button class="topbar-btn">
            <AppIcon name="tabler:language" :width="18" :height="18" />
          </button>
        </n-dropdown>
        <n-dropdown trigger="click" :options="colorOptions" @select="handleColorSelect">
          <button class="topbar-btn color-btn">
            <span class="color-dot" :style="{ backgroundColor: brandColorMap[themeColor] }"></span>
          </button>
        </n-dropdown>
        <button class="topbar-btn" @click="toggleAppearance($event)">
          <AppIcon
            :name="isDark ? 'line-md:sunny-filled-loop-to-moon-filled-transition' : 'line-md:moon-filled-to-sunny-filled-loop-transition'"
            :width="18"
            :height="18"
          />
        </button>
        <n-dropdown trigger="click" :options="notifOptions">
          <button class="topbar-btn">
            <AppIcon name="tabler:bell" :width="18" :height="18" />
          </button>
        </n-dropdown>
        <BlogUserMenu />
      </template>
      <template v-else>
        <div class="topbar-actions-desktop">
          <n-dropdown trigger="click" :options="localeOptions" @select="handleLocaleSelect">
            <button class="topbar-btn">
              <AppIcon name="tabler:language" :width="18" :height="18" />
            </button>
          </n-dropdown>
          <n-dropdown trigger="click" :options="colorOptions" @select="handleColorSelect">
            <button class="topbar-btn color-btn">
              <span
                class="color-dot"
                :style="{ backgroundColor: brandColorMap[themeColor] }"
              ></span>
            </button>
          </n-dropdown>
          <button class="topbar-btn" @click="toggleAppearance($event)">
            <AppIcon
              :name="isDark ? 'line-md:sunny-filled-loop-to-moon-filled-transition' : 'line-md:moon-filled-to-sunny-filled-loop-transition'"
              :width="18"
              :height="18"
            />
          </button>
          <n-dropdown trigger="click" :options="notifOptions">
            <button class="topbar-btn">
              <AppIcon name="tabler:bell" :width="18" :height="18" />
            </button>
          </n-dropdown>
          <BlogUserMenu />
        </div>
        <button class="topbar-btn topbar-more-btn" @click="mobileMoreOpen = !mobileMoreOpen">
          <AppIcon name="tabler:dots-vertical" :width="18" :height="18" />
        </button>
      </template>
    </div>
  </header>

  <div
    v-if="mobileMoreOpen && showNav"
    class="mobile-more-backdrop"
    @click="mobileMoreOpen = false"
  >
    <div class="mobile-more-panel" @click.stop>
      <div class="mobile-more-nav">
        <a
          v-for="item in navItems"
          :key="item.label"
          :href="item.href"
          :target="item.href ? item.target ?? '_self' : undefined"
          :rel="item.href ? 'noopener noreferrer' : undefined"
          class="mobile-nav-item"
          :class="{ active: isActive(item) }"
          @click="item.href ? (mobileMoreOpen = false) : (handleNavClick(item), mobileMoreOpen = false)"
          >{{ item.label }}<template v-if="item.href"> <AppIcon name="tabler:external-link" :width="12" :height="12" /></template></a
        >
      </div>
      <div class="mobile-more-divider" />
      <div class="mobile-more-actions">
        <n-dropdown trigger="click" :options="localeOptions" @select="handleLocaleSelect">
          <button class="topbar-btn" :title="localeKey">
            <AppIcon name="tabler:language" :width="18" :height="18" />
          </button>
        </n-dropdown>
        <n-dropdown trigger="click" :options="colorOptions" @select="handleColorSelect">
          <button class="topbar-btn color-btn">
            <span class="color-dot" :style="{ backgroundColor: brandColorMap[themeColor] }"></span>
          </button>
        </n-dropdown>
        <button class="topbar-btn" @click="toggleAppearance($event)">
          <AppIcon
            :name="isDark ? 'line-md:sunny-filled-loop-to-moon-filled-transition' : 'line-md:moon-filled-to-sunny-filled-loop-transition'"
            :width="18"
            :height="18"
          />
        </button>
        <n-dropdown trigger="click" :options="notifOptions">
          <button class="topbar-btn">
            <AppIcon name="tabler:bell" :width="18" :height="18" />
          </button>
        </n-dropdown>
        <BlogUserMenu />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-topbar {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 0 16px;
  gap: 12px;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-bg);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 120px;
}

.topbar-logo {
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  cursor: text;
  user-select: none;
  min-width: 180px;
  transition: border-color 0.12s;
}

.search-box:hover {
  border-color: var(--app-primary);
}

.search-box-placeholder {
  flex: 1;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.search-box-shortcut {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  color: var(--app-text-secondary);
  font-family: monospace;
  flex-shrink: 0;
}

.search-box-mobile-wrap {
  display: none;
  flex: 1;
  justify-content: center;
}

.search-box-mobile {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: background 0.12s;
}

.search-box-mobile:hover {
  background: var(--app-bg-soft);
  color: var(--app-text);
}

.topbar-separator {
  color: var(--app-text-secondary);
  font-size: 14px;
}

.topbar-page {
  font-size: 13px;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.topbar-nav-centered {
  justify-content: center;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
}

.topbar-nav-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: all 0.12s;
  white-space: nowrap;
}

.topbar-nav-item:hover {
  background: var(--app-bg-soft);
  color: var(--app-text);
}

.topbar-nav-item.active {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  font-weight: 600;
}

.topbar-center {
  flex: 1;
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: text;
  user-select: none;
}

.search-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.search-placeholder {
  flex: 1;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.search-shortcut {
  font-size: 10px;
  padding: 1px 6px;
  background: var(--app-bg-soft);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  color: var(--app-text-secondary);
  font-family: monospace;
  flex-shrink: 0;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topbar-actions-desktop {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topbar-btn {
  width: 34px;
  height: 34px;
  color: var(--app-sidebar-text);
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}

.color-btn {
  font-size: 13px;
}

.color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.topbar-btn:hover {
  background: var(--app-bg-soft);
}

.user-btn {
  font-weight: 700;
  font-size: 13px;
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  color: var(--app-primary);
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

.user-btn:hover {
  background: color-mix(in srgb, var(--app-primary) 20%, transparent);
}

.topbar-more-btn {
  display: none;
}

/* Mobile menu panel */
.mobile-more-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: transparent;
}

.mobile-more-panel {
  position: fixed;
  top: 52px;
  right: 8px;
  min-width: 200px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 8px;
  z-index: 1001;
}

.mobile-more-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-nav-item {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  color: var(--app-text-secondary);
  transition: all 0.12s;
}

.mobile-nav-item:hover {
  background: var(--app-bg-soft);
  color: var(--app-text);
}

.mobile-nav-item.active {
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  font-weight: 600;
}

.mobile-more-divider {
  height: 1px;
  background: var(--app-border);
  margin: 6px 0;
}

.mobile-more-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

@media (max-width: 767px) {
  .app-topbar {
    padding: 0 8px;
    gap: 6px;
  }

  .topbar-left {
    gap: 8px;
    min-width: auto;
  }

  .search-box {
    display: none;
  }

  .search-box-mobile-wrap {
    display: flex;
  }

  .topbar-nav-centered {
    display: none;
  }

  .topbar-actions-desktop {
    display: none;
  }

  .topbar-more-btn {
    display: flex;
  }

  .topbar-center {
    max-width: none;
  }

  .search-placeholder {
    display: none;
  }

  .topbar-right {
    gap: 2px;
  }
}
</style>
