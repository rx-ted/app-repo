<script setup lang="ts">
import { NButton } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { formatDateTime } from '@/utils/formatDate';

defineProps<{
  nickname: string;
  unreadCount: number;
  lastLoginAt?: string | null;
}>();

const { t, locale } = useI18n();
const router = useRouter();
</script>

<template>
  <div class="dashboard-hero">
    <div class="hero-text">
      <h1 class="hero-title">{{ t('dashboard.welcome', { nickname }) }}</h1>
      <p class="hero-desc">
        <template v-if="unreadCount > 0"
          >{{ t('dashboard.unread', { count: unreadCount }) }}</template
        >
        <template v-else>{{ t('dashboard.noUnread') }}</template>
        <template v-if="lastLoginAt">
          · {{ t('dashboard.lastLogin') }}：{{ formatDateTime(lastLoginAt, locale) }}
        </template>
      </p>
    </div>
    <n-button type="primary" size="large" @click="router.push('/editor')">
      {{ t('dashboard.newPost') }}
    </n-button>
  </div>
</template>

<style scoped>
.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.hero-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
}
.hero-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}
</style>
