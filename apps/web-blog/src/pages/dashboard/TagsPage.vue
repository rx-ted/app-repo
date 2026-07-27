<script setup lang="ts">
import { NButton, NCard, NEmpty, NSpin, NAlert, NInput, NPopconfirm, NModal } from 'naive-ui';
import { API } from '@/constants';
import { onMounted, ref, computed } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { useSessionStore } from '@/stores/session';

type Tag = {
  id: number;
  name: string;
  slug: string;
  usageCount?: number;
  createdBy: string;
};

const session = useSessionStore();
const isLoggedIn = computed(() => session.isAuthenticated);

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const tags = ref<Tag[]>([]);
const newName = ref('');
const editingTag = ref<Tag | null>(null);
const editName = ref('');
const showEditModal = ref(false);

function canModify(tag: Tag) {
  if (!session.user) return false;
  return session.user.id === tag.createdBy || session.user.roles?.includes('admin');
}

async function load(noCache = false) {
  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<{ data: Tag[]; total: number }>>(API.TAGS_LIST, {
      cache: !noCache,
    });
    tags.value = (response.data?.data ?? []).map((t: any) => ({
      id: Number(t.id),
      name: t.name,
      slug: t.slug,
      usageCount: t.postCount,
      createdBy: t.createdBy,
    }));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function createTag() {
  if (!newName.value.trim()) return;
  if (!isLoggedIn.value) {
    error.value = '请先登录后创建标签';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await http.post(API.TAGS_LIST, {
      name: newName.value.trim(),
    });
    newName.value = '';
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建失败';
  } finally {
    saving.value = false;
  }
}

async function deleteTag(id: number) {
  if (!isLoggedIn.value) {
    error.value = '请先登录后删除标签';
    return;
  }
  error.value = '';
  try {
    await http.delete(`/tags/${id}`);
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '删除失败';
  }
}

function startEdit(tag: Tag) {
  if (!isLoggedIn.value) {
    error.value = '请先登录后编辑标签';
    return;
  }
  editingTag.value = tag;
  editName.value = tag.name;
  showEditModal.value = true;
}

async function saveEdit() {
  if (!editingTag.value || !editName.value.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    await http.put(`/tags/${editingTag.value.id}`, {
      name: editName.value.trim(),
    });
    showEditModal.value = false;
    editingTag.value = null;
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '编辑失败';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <n-spin :show="loading">
    <n-alert v-if="error" type="error" :show-icon="false" class="alert">{{ error }}</n-alert>

    <template v-if="tags">
      <div class="page-header">
        <h2 class="page-title">标签管理</h2>
      </div>

      <n-card v-if="isLoggedIn" size="small" class="form-card" title="新建标签">
        <div class="form-row">
          <n-input
            v-model:value="newName"
            placeholder="标签名称"
            :disabled="saving"
            style="flex:1"
          />
          <n-button type="primary" :disabled="!newName.trim()" :loading="saving" @click="createTag"
            >创建</n-button
          >
        </div>
      </n-card>

      <n-card size="small" class="list-card">
        <template v-if="tags.length">
          <div v-for="tag in tags" :key="tag.id" class="tag-item">
            <div class="tag-info">
              <span class="tag-name">{{ tag.name }}</span>
              <span class="tag-slug">/{{ tag.slug }}</span>
              <span class="tag-count">{{ tag.usageCount ?? 0 }} 篇文章</span>
            </div>
            <div class="tag-actions" v-if="canModify(tag)">
              <n-button size="tiny" secondary @click="startEdit(tag)">编辑</n-button>
              <n-popconfirm @positive-click="deleteTag(tag.id)">
                <template #trigger>
                  <n-button size="tiny" secondary type="error">删除</n-button>
                </template>
                确定删除标签 "{{ tag.name }}"？
              </n-popconfirm>
            </div>
          </div>
        </template>
        <n-empty v-else description="暂无标签" />
      </n-card>
    </template>

    <n-modal v-model:show="showEditModal" preset="card" title="编辑标签" style="width:400px">
      <n-input v-model:value="editName" placeholder="标签名称" :disabled="saving" />
      <template #footer>
        <n-button @click="showEditModal = false" :disabled="saving">取消</n-button>
        <n-button type="primary" :disabled="!editName.trim()" :loading="saving" @click="saveEdit"
          >保存</n-button
        >
      </template>
    </n-modal>
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
.form-card {
  border-radius: 12px;
  margin-bottom: 12px;
}
.form-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.list-card {
  border-radius: 12px;
}
.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--app-border);
}
.tag-item:last-child {
  border-bottom: none;
}
.tag-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.tag-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.tag-name {
  font-size: 14px;
  font-weight: 600;
}
.tag-slug {
  font-size: 12px;
  color: var(--app-text-tertiary);
}
.tag-count {
  font-size: 12px;
  color: var(--app-text-secondary);
}
@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
