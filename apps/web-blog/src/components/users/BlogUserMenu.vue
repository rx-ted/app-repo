<script setup lang="ts">
import type { DropdownOption } from 'naive-ui';
import { NAvatar, NDropdown, NModal, NButton } from 'naive-ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import LayoutSettings from '@/components/LayoutSettings.vue';
import AppIcon from '@/components/AppIcon.vue';

const router = useRouter();
const session = useSessionStore();
const { t } = useI18n();
const show = ref(false);
const showLayoutSettings = ref(false);

const avatarLetter = computed(() => session.user?.username?.slice(0, 1).toUpperCase() ?? '?');

const authedOptions = computed<DropdownOption[]>(() => [
  { key: 'dashboard', label: t('user.menu.dashboard') },
  { key: 'profile', label: t('user.menu.profile') },
  { type: 'divider', key: 'divider' },
  { key: 'layout', label: t('user.menu.layout') },
  { type: 'divider', key: 'divider2' },
  { key: 'logout', label: t('user.menu.logout') },
]);

async function handleSelect(key: string) {
  show.value = false;
  if (key === 'logout') {
    await session.logout();
    router.push('/');
    return;
  }
  if (key === 'layout') {
    showLayoutSettings.value = true;
    return;
  }
  const routeMap: Record<string, string> = {
    dashboard: '/dashboard',
    profile: '/profile',
  };
  if (routeMap[key]) router.push(routeMap[key]);
}
</script>

<template>
  <template v-if="session.isAuthenticated">
    <n-dropdown
      trigger="manual"
      placement="bottom-end"
      :show="show"
      :options="authedOptions"
      @clickoutside="show = false"
      @select="handleSelect"
    >
      <div class="menu-trigger" @click="show = !show">
        <div class="avatar-wrap">
          <n-avatar v-if="session.user?.avatarUrl" round :size="32" :src="session.user.avatarUrl" />
          <n-avatar v-else round :size="32">
            {{ avatarLetter }}
          </n-avatar>
          <span v-if="session.isOnline" class="online-dot" />
        </div>
      </div>
    </n-dropdown>

    <n-modal
      v-model:show="showLayoutSettings"
      preset="card"
      title="布局设置"
      style="max-width: 520px"
      :bordered="false"
      size="small"
    >
      <LayoutSettings />
      <template #footer>
        <NButton @click="showLayoutSettings = false">关闭</NButton>
      </template>
    </n-modal>
  </template>
  <button v-else class="guest-btn" @click="router.push('/login')">
    <AppIcon name="line-md:login" :width="18" :height="18" />
    <span>{{ t('user.menu.login') }}</span>
  </button>
</template>

<style scoped>
.avatar-wrap {
  position: relative;
  display: inline-flex;
}

.online-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-success);
  border: 2px solid var(--app-bg-container);
}

.menu-trigger {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 4px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease;
}
.menu-trigger:hover {
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}
.guest-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--app-border) 86%, transparent);
  border-radius: 11px;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.18s ease;
}
.guest-btn:hover {
  color: var(--app-primary);
  border-color: color-mix(in srgb, var(--app-primary) 34%, var(--app-border));
}
</style>
