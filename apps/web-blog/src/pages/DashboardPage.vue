<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { NButton, NEmpty, NSpin, NAlert, NTabs, NTabPane } from 'naive-ui';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogDashboardVO } from '@/types/blog';
import DashboardHero from '@/components/dashboard/DashboardHero.vue';
import DashboardStats from '@/components/dashboard/DashboardStats.vue';
import type { StatItem } from '@/components/dashboard/DashboardStats.vue';
import DashboardActivity from '@/components/dashboard/DashboardActivity.vue';
import DashboardDrafts from '@/components/dashboard/DashboardDrafts.vue';
import type { DraftItem } from '@/components/dashboard/DashboardDrafts.vue';
import PostsPage from '@/pages/dashboard/PostsPage.vue';
import DraftsPage from '@/pages/dashboard/DraftsPage.vue';
import CategoriesPage from '@/pages/dashboard/CategoriesPage.vue';
import TagsPage from '@/pages/dashboard/TagsPage.vue';
import RequestsPage from '@/pages/dashboard/RequestsPage.vue';

const loading = ref(false);
const error = ref('');
const dashboard = ref<BlogDashboardVO | null>(null);
const activeTab = ref('overview');

const statCards = computed<StatItem[]>(() => {
  if (!dashboard.value) return [];
  const d = dashboard.value;
  const drafts = d.posts.list.filter((p) => p.status === 'draft').length;
  return [
    {
      label: '总文章',
      value: d.posts.total,
      icon: 'solar:document-linear',
      color: 'var(--app-info)',
    },
    {
      label: '总阅读量',
      value: d.stats.views,
      icon: 'solar:eye-linear',
      color: 'var(--app-primary)',
    },
    {
      label: '评论',
      value: d.stats.comments,
      icon: 'solar:chat-round-linear',
      color: 'var(--app-success)',
    },
    { label: '草稿', value: drafts, icon: 'solar:pen-linear', color: 'var(--app-warning)' },
  ];
});

const drafts = computed<DraftItem[]>(() => {
  if (!dashboard.value) return [];
  return dashboard.value.posts.list
    .filter((p) => p.status === 'draft')
    .map((p) => ({ id: p.id, title: p.title, slug: p.slug, updated_at: p.updated_at }))
    .slice(0, 5);
});

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<BlogDashboardVO>>('/blog/dashboard');
    dashboard.value = response.data;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function markNotificationsRead() {
  await http.post('/notification/read-all');
  await loadDashboard();
}

async function markNotificationRead(id: number) {
  await http.post(`/notification/${id}/read`);
  await loadDashboard();
}

onMounted(loadDashboard);

const tabs = [
  { key: 'overview', label: '概览', disabled: false },
  { key: 'posts', label: '文章', disabled: false },
  { key: 'drafts', label: '草稿', disabled: false },
  { key: 'categories', label: '分类', disabled: false },
  { key: 'tags', label: '标签', disabled: false },
  { key: 'requests', label: '审批', disabled: false },
  { key: 'comments', label: '评论', disabled: true },
  { key: 'messages', label: '消息', disabled: true },
];
</script>

<template>
  <n-spin :show="loading">
    <n-alert v-if="error" type="error" :show-icon="false" class="alert">
      {{ error }}
    </n-alert>

    <template v-if="dashboard">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane
          v-for="tab in tabs"
          :key="tab.key"
          :tab="tab.label"
          :name="tab.key"
          :disabled="tab.disabled"
        >
          <div v-if="tab.key === 'overview'" class="dashboard-page">
            <DashboardHero
              :nickname="dashboard.me.nickname || dashboard.me.username"
              :unread-count="dashboard.notifications.unreadCount"
              :last-login-at="dashboard.me.last_login_at"
            />
            <DashboardStats :stats="statCards" />
            <DashboardActivity
              :activities="dashboard.activity"
              :notifications="dashboard.notifications.recent"
              @mark-all-read="markNotificationsRead"
              @mark-read="markNotificationRead"
            />
            <DashboardDrafts :drafts="drafts" />
          </div>

          <PostsPage v-else-if="tab.key === 'posts'" />
          <DraftsPage v-else-if="tab.key === 'drafts'" />
          <CategoriesPage v-else-if="tab.key === 'categories'" />
          <TagsPage v-else-if="tab.key === 'tags'" />
          <RequestsPage v-else-if="tab.key === 'requests'" />
          <n-empty v-else description="暂未开放" />
        </n-tab-pane>
      </n-tabs>
    </template>
  </n-spin>
</template>

<style scoped>
.alert {
  margin-bottom: 16px;
}
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 960px;
}
</style>
