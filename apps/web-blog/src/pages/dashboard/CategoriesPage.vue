<script setup lang="ts">
import { NButton, NCard, NEmpty, NSpin, NAlert, NInput, NModal, NPopconfirm } from 'naive-ui';
import { API } from '@/constants';
import { onMounted, ref, computed } from 'vue';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import { useSessionStore } from '@/stores/session';

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  postCount?: number;
  createdBy: string;
};

const session = useSessionStore();
const isLoggedIn = computed(() => session.isAuthenticated);

const loading = ref(false);
const saving = ref(false);
const error = ref('');
const categories = ref<Category[]>([]);
const newName = ref('');
const newDescription = ref('');
const editingCategory = ref<Category | null>(null);
const editName = ref('');
const editDescription = ref('');
const showEditModal = ref(false);

function canModify(cat: Category) {
  if (!session.user) return false;
  return session.user.id === cat.createdBy || session.user.roles?.includes('admin');
}

async function load(noCache = false) {
  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<Category[]>>(API.CATEGORIES_LIST, {
      cache: !noCache,
    });
    categories.value = (response.data ?? []).map((c: any) => ({
      id: Number(c.id),
      name: c.name,
      slug: c.slug,
      description: c.description,
      postCount: c.postCount,
      createdBy: c.createdBy,
    }));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

async function createCategory() {
  if (!newName.value.trim()) return;
  if (!isLoggedIn.value) {
    error.value = '请先登录后创建分类';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await http.post(API.CATEGORIES_LIST, {
      name: newName.value.trim(),
      description: newDescription.value.trim() || undefined,
    });
    newName.value = '';
    newDescription.value = '';
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '创建失败';
  } finally {
    saving.value = false;
  }
}

function startEdit(cat: Category) {
  if (!isLoggedIn.value) {
    error.value = '请先登录后编辑分类';
    return;
  }
  editingCategory.value = cat;
  editName.value = cat.name;
  editDescription.value = cat.description ?? '';
  showEditModal.value = true;
}

async function saveEdit() {
  if (!editingCategory.value || !editName.value.trim()) return;
  saving.value = true;
  error.value = '';
  try {
    await http.put(`/categories/${editingCategory.value.id}`, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
    });
    showEditModal.value = false;
    editingCategory.value = null;
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '编辑失败';
  } finally {
    saving.value = false;
  }
}

async function deleteCategory(id: number) {
  if (!isLoggedIn.value) {
    error.value = '请先登录后删除分类';
    return;
  }
  error.value = '';
  try {
    await http.delete(`/categories/${id}`);
    await load(true);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '删除失败';
  }
}

onMounted(load);
</script>

<template>
  <n-spin :show="loading">
    <n-alert v-if="error" type="error" :show-icon="false" class="alert">{{ error }}</n-alert>

    <template v-if="categories">
      <div class="page-header">
        <h2 class="page-title">分类管理</h2>
      </div>

      <n-card v-if="isLoggedIn" size="small" class="form-card" title="新建分类">
        <div class="form-row">
          <n-input
            v-model:value="newName"
            placeholder="分类名称"
            :disabled="saving"
            style="flex:1"
          />
          <n-input
            v-model:value="newDescription"
            placeholder="描述（可选）"
            :disabled="saving"
            style="flex:1"
          />
          <n-button
            type="primary"
            :disabled="!newName.trim()"
            :loading="saving"
            @click="createCategory"
            >创建</n-button
          >
        </div>
      </n-card>

      <n-card size="small" class="list-card">
        <template v-if="categories.length">
          <div v-for="cat in categories" :key="cat.id" class="category-item">
            <div class="cat-info">
              <div class="cat-name">{{ cat.name }}</div>
              <div v-if="cat.description" class="cat-desc">{{ cat.description }}</div>
              <div class="cat-slug">/{{ cat.slug }}</div>
            </div>
            <div class="cat-actions">
              <span class="cat-count">{{ cat.postCount ?? 0 }} 篇文章</span>
              <n-button v-if="canModify(cat)" size="tiny" secondary @click="startEdit(cat)"
                >编辑</n-button
              >
              <n-popconfirm v-if="canModify(cat)" @positive-click="deleteCategory(cat.id)">
                <template #trigger>
                  <n-button size="tiny" secondary type="error">删除</n-button>
                </template>
                确定删除分类 "{{ cat.name }}"？
              </n-popconfirm>
            </div>
          </div>
        </template>
        <n-empty v-else description="暂无分类" />
      </n-card>
    </template>

    <n-modal v-model:show="showEditModal" preset="card" title="编辑分类" style="width:480px">
      <div class="form-row">
        <n-input
          v-model:value="editName"
          placeholder="分类名称"
          :disabled="saving"
          style="flex:1"
        />
        <n-input
          v-model:value="editDescription"
          placeholder="描述（可选）"
          :disabled="saving"
          style="flex:1"
        />
      </div>
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
.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}
.category-item:last-child {
  border-bottom: none;
}
.cat-info {
  flex: 1;
  min-width: 0;
}
.cat-name {
  font-size: 14px;
  font-weight: 600;
}
.cat-desc {
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}
.cat-slug {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin-top: 1px;
}
.cat-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.cat-count {
  font-size: 13px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
