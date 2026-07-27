<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import AppIcon from '@/components/AppIcon.vue';

const props = defineProps<{
  collapsed: boolean;
}>();

const emit = defineEmits<{
  'update:collapsed': [value: boolean];
}>();

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();

interface SiderItem {
  icon: string;
  label: string;
  path?: string;
  action?: 'cc';
  disabled?: boolean;
  requireAuth?: boolean;
}

const navItems = computed<SiderItem[]>(() => [
  { icon: 'tabler:home', label: t('nav.home'), path: '/' },
  { icon: 'tabler:tags', label: t('nav.tags'), path: '/tags' },
  { icon: 'tabler:folder', label: t('nav.categories'), path: '/categories' },
  { icon: 'tabler:calendar', label: t('nav.calendar'), path: '/calendar' },
  { icon: 'tabler:archive', label: t('nav.archive'), path: '/archive' },
  { icon: 'tabler:pencil', label: t('nav.write'), path: '/editor' },
  { icon: 'tabler:user', label: t('nav.about'), path: '/about' },
]);

const bottomItems = computed<SiderItem[]>(() => [
  { icon: 'tabler:copyright', label: t('nav.copyright'), path: '/copyright' },
  { icon: 'tabler:settings', label: t('nav.settings'), path: '/dashboard/settings' },
]);

function isActive(item: SiderItem): boolean {
  if (!item.path) return false;
  if (item.path === '/') return route.path === '/';
  if (item.path === '/about') return route.path.startsWith('/about');
  if (item.path === '/editor') return route.path.startsWith('/editor');
  return route.path.startsWith(item.path);
}

function handleClick(item: SiderItem) {
  if (item.disabled) return;
  if (item.path) {
    router.push(item.path);
  }
}

function toggleCollapse() {
  emit('update:collapsed', !props.collapsed);
}
</script>

<template>
  <aside class="app-sider" :class="{ collapsed }">
    <div class="sider-items">
      <div
        v-for="item in navItems"
        :key="item.label"
        class="sider-item"
        :class="{
          active: isActive(item),
          collapsed,
          disabled: item.disabled,
        }"
        :title="collapsed ? item.label : undefined"
        @click="handleClick(item)"
      >
        <span class="item-icon"><AppIcon :name="item.icon" :width="18" :height="18" /></span>
        <span v-if="!collapsed" class="item-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="sider-spacer" />

    <div v-if="!collapsed" class="sider-divider" />
    <div class="sider-items bottom">
      <div
        v-for="item in bottomItems"
        :key="item.label"
        class="sider-item"
        :class="{ active: isActive(item), collapsed }"
        :title="collapsed ? item.label : undefined"
        @click="handleClick(item)"
      >
        <span class="item-icon"><AppIcon :name="item.icon" :width="18" :height="18" /></span>
        <span v-if="!collapsed" class="item-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="collapse-area" @click="toggleCollapse">
      <div class="sider-item collapse-item" :class="{ collapsed }">
        <span class="item-icon collapse-icon"
          ><AppIcon
            :name="collapsed ? 'tabler:chevron-right' : 'tabler:chevron-left'"
            :width="14"
            :height="14"
          /></span
        >
        <span v-if="!collapsed" class="item-label">{{ t('nav.collapse') }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.app-sider {
  display: flex;
  flex-direction: column;
  padding: 8px;
  gap: 2px;
  flex-shrink: 0;
  background: var(--app-sidebar-bg);
  border-right: 1px solid var(--app-border);
  overflow-y: auto;
  transition: width 0.2s ease;
  width: 200px;
}

.app-sider.collapsed {
  width: 60px;
  padding: 8px 6px;
}

.sider-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sider-items.bottom {
  margin-top: auto;
}

.sider-divider {
  height: 1px;
  background: var(--app-border);
  margin: 6px 0;
}

.sider-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--app-sidebar-text);
  transition: all 0.12s;
  white-space: nowrap;
}

.sider-item.collapsed {
  justify-content: center;
  padding: 8px 0;
}

.sider-item:hover {
  background: var(--app-sidebar-hover);
  color: var(--app-sidebar-text-active);
}

.sider-item.active {
  background: var(--app-sidebar-active);
  color: var(--app-sidebar-text-active);
}

.sider-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sider-item.disabled:hover {
  background: transparent;
  color: var(--app-sidebar-text);
}

.item-icon {
  font-size: 16px;
  line-height: 1;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.item-label {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sider-spacer {
  flex: 1;
}

.collapse-area {
  cursor: pointer;
  padding-top: 4px;
}

.collapse-item {
  color: var(--app-sidebar-text);
}

.collapse-item:hover {
  background: var(--app-sidebar-hover);
  color: var(--app-sidebar-text-active);
}

.collapse-icon {
  font-size: 12px;
}

@media (max-width: 767px) {
  .app-sider {
    width: 60px;
    padding: 8px 6px;
  }

  .sider-item {
    justify-content: center;
    padding: 8px 0;
  }
}
</style>
