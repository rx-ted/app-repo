<script setup lang="ts">
import { NButton, NCard, NDataTable, NEmpty, NTag, NSpin, NAlert } from 'naive-ui';
import { h, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogDashboardVO } from '@/types/blog';
import { formatDateTime } from '@/utils/formatDate';
import { API } from '@/constants';

type PostStatus = 'all' | 'published' | 'draft' | 'archived';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const data = ref<BlogDashboardVO | null>(null);
const activeTab = ref<PostStatus>('all');

const filteredPosts = computed(() => {
  if (!data.value) return [];
  if (activeTab.value === 'all') return data.value.posts.list;
  return data.value.posts.list.filter((p) => p.status === activeTab.value);
});

const columns = [
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      h('span', { style: 'font-weight:500' }, row.title),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      h(
        NTag,
        {
          size: 'small',
          type:
            row.status === 'published' ? 'success' : row.status === 'draft' ? 'warning' : 'default',
        },
        { default: () => row.status },
      ),
  },
  {
    title: '更新时间',
    key: 'updated_at',
    width: 180,
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      formatDateTime(row.updated_at, 'zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 160,
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      h('div', { style: 'display:flex;gap:8px' }, [
        h(
          NButton,
          {
            size: 'tiny',
            onClick: () => router.push(`/editor/${row.slug}`),
          },
          { default: () => '编辑' },
        ),
        h(
          NButton,
          {
            size: 'tiny',
            secondary: true,
            onClick: () => router.push(`/posts/${row.slug}`),
          },
          { default: () => '查看' },
        ),
      ]),
  },
];

const tabs: { key: PostStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'published', label: '发布' },
  { key: 'draft', label: '草稿' },
  { key: 'archived', label: '归档' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<BlogDashboardVO>>(API.BLOG_DASHBOARD);
    data.value = response.data;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <n-spin :show="loading">
    <n-alert v-if="error" type="error" :show-icon="false" class="alert">{{ error }}</n-alert>

    <template v-if="data">
      <div class="page-header">
        <h2 class="page-title">文章管理</h2>
        <n-button type="primary" @click="router.push('/editor')">写新文章</n-button>
      </div>

      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-btn"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
          <span class="tab-count"
            >({{ tab.key === 'all' ? data.posts.total : data.posts.list.filter(p => p.status === tab.key).length }})</span
          >
        </button>
      </div>

      <n-card size="small" class="table-card">
        <n-data-table
          v-if="filteredPosts.length"
          :columns="columns"
          :data="filteredPosts"
          size="small"
          :bordered="false"
        />
        <n-empty v-else description="暂无文章" />
      </n-card>
    </template>
  </n-spin>
</template>

<style scoped>
.alert {
  margin-bottom: 16px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: transparent;
  font-size: 13px;
  color: var(--app-text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}
.tab-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}
.tab-btn.active {
  background: var(--app-primary);
  border-color: var(--app-primary);
  color: #fff;
}
.tab-count {
  font-size: 12px;
  opacity: 0.7;
}
.table-card {
  border-radius: 12px;
}
</style>
