<script setup lang="ts">
import { NCard, NButton, NEmpty } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { formatDateTime } from '@/utils/formatDate';
import type { DashboardActivityVO, DashboardNotificationVO } from '@/types/blog';

const props = defineProps<{
  activities: DashboardActivityVO[];
  notifications: DashboardNotificationVO[];
}>();

const emit = defineEmits<{
  markAllRead: [];
  markRead: [id: number];
}>();

const { t, locale } = useI18n();
const router = useRouter();

function openActivity(item: DashboardActivityVO) {
  if (item.slug) router.push(`/posts/${item.slug}`);
}
</script>

<template>
  <div class="dashboard-activity">
    <n-card :title="t('dashboard.recentActivity')" size="small" class="activity-card">
      <template v-if="activities.length">
        <div
          v-for="item in activities"
          :key="item.id"
          class="activity-item"
          :class="{ clickable: !!item.slug }"
          @click="openActivity(item)"
        >
          <div
            class="activity-dot"
            :class="item.type === 'post.updated' ? 'dot-post' : 'dot-notif'"
          />
          <div class="activity-body">
            <div class="activity-title">{{ item.title }}</div>
            <div v-if="item.description" class="activity-desc">{{ item.description }}</div>
            <div class="activity-time">{{ formatDateTime(item.created_at, locale) }}</div>
          </div>
        </div>
      </template>
      <n-empty v-else :description="t('dashboard.noActivity')" />
    </n-card>

    <n-card :title="t('dashboard.notifications')" size="small" class="activity-card">
      <template #header-extra>
        <n-button v-if="notifications.length" text size="small" @click="emit('markAllRead')">
          {{ t('dashboard.markAllRead') }}
        </n-button>
      </template>
      <template v-if="notifications.length">
        <div
          v-for="item in notifications"
          :key="item.id"
          class="notification-item"
          :class="{ unread: !item.is_read }"
        >
          <div class="notification-body">
            <div class="notification-title">{{ item.type }}</div>
            <div class="notification-desc">{{ item.content }}</div>
            <div class="activity-time">{{ formatDateTime(item.created_at, locale) }}</div>
          </div>
          <n-button v-if="!item.is_read" text size="tiny" @click="emit('markRead', item.id)">
            {{ t('dashboard.markRead') }}
          </n-button>
        </div>
      </template>
      <n-empty v-else :description="t('dashboard.noNotifications')" />
    </n-card>
  </div>
</template>

<style scoped>
.dashboard-activity {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.activity-card {
  border-radius: 12px;
}
.activity-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
  cursor: default;
  border-bottom: 1px solid var(--app-border);
}
.activity-item:last-child {
  border-bottom: none;
}
.activity-item.clickable {
  cursor: pointer;
}
.activity-item.clickable:hover {
  color: var(--app-primary);
}
.activity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
}
.dot-post {
  background: var(--app-primary);
}
.dot-notif {
  background: var(--app-warning);
}
.activity-body {
  flex: 1;
  min-width: 0;
}
.activity-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.activity-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}
.activity-time {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin-top: 2px;
}
.notification-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--app-border);
}
.notification-item:last-child {
  border-bottom: none;
}
.notification-item.unread {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
  margin: 0 -8px;
  padding: 8px;
  border-radius: 6px;
}
.notification-body {
  flex: 1;
  min-width: 0;
}
.notification-title {
  font-size: 13px;
  font-weight: 600;
}
.notification-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}
@media (max-width: 900px) {
  .dashboard-activity {
    grid-template-columns: 1fr;
  }
}
</style>
