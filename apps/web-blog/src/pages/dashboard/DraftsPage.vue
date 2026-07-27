<script setup lang="ts">
import { NButton, NCard, NDataTable, NEmpty, NSpin, NAlert } from 'naive-ui';
import { h, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogDashboardVO } from '@/types/blog';
import { formatDateTime } from '@/utils/formatDate';
import { API } from '@/constants';

const router = useRouter();
const loading = ref(false);
const error = ref('');
const data = ref<BlogDashboardVO | null>(null);

const drafts = computed(() => {
  if (!data.value) return [];
  return data.value.posts.list.filter((p) => p.status === 'draft');
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
    title: '上次编辑',
    key: 'updated_at',
    width: 180,
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      formatDateTime(row.updated_at, 'zh-CN'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    render: (row: BlogDashboardVO['posts']['list'][number]) =>
      h(
        NButton,
        {
          size: 'tiny',
          type: 'primary',
          onClick: () => router.push(`/editor/${row.slug}`),
        },
        { default: () => '继续编辑' },
      ),
  },
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
        <h2 class="page-title">草稿 ({{ drafts.length }})</h2>
        <n-button type="primary" @click="router.push('/editor')">新建草稿</n-button>
      </div>

      <n-card size="small" class="table-card">
        <n-data-table
          v-if="drafts.length"
          :columns="columns"
          :data="drafts"
          size="small"
          :bordered="false"
        />
        <n-empty v-else description="暂无草稿">
          <template #extra>
            <n-button size="small" type="primary" @click="router.push('/editor')"
              >开始写文章</n-button
            >
          </template>
        </n-empty>
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
.table-card {
  border-radius: 12px;
}
</style>
