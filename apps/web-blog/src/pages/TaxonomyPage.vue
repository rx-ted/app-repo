<script setup lang="ts">
import { NButton, NSpace, NCard, NAlert, NForm, NFormItem, NInput, NDataTable } from 'naive-ui';
import { computed, h, onMounted, reactive, ref } from 'vue';
import { http } from '@/http';
import { useI18n } from '@/composables/useI18n';
import { useSessionStore } from '@/stores/session';
import type { TaxonomyItemVO } from '@/types/community';
import { fetchCategories, fetchTags } from '@/api/taxonomy';
import { NUMBERS } from '@/constants';

const loading = ref(false);
const tags = ref<TaxonomyItemVO[]>([]);
const categories = ref<TaxonomyItemVO[]>([]);
const tagForm = reactive({ name: '' });
const categoryForm = reactive({ name: '' });
const tagQuery = ref('');
const categoryQuery = ref('');
const tagPage = ref(1);
const categoryPage = ref(1);
const pageSize = NUMBERS.DEFAULT_PAGE_SIZE;
const { t } = useI18n();
const session = useSessionStore();
const isAdmin = computed(() => session.user?.roles.includes('ADMIN') ?? false);

const filteredTags = computed(() =>
  tags.value.filter((item) =>
    item.name.toLowerCase().includes(tagQuery.value.trim().toLowerCase()),
  ),
);

const filteredCategories = computed(() =>
  categories.value.filter((item) =>
    item.name.toLowerCase().includes(categoryQuery.value.trim().toLowerCase()),
  ),
);

const pagedTags = computed(() =>
  filteredTags.value.slice((tagPage.value - 1) * pageSize, tagPage.value * pageSize),
);

const pagedCategories = computed(() =>
  filteredCategories.value.slice(
    (categoryPage.value - 1) * pageSize,
    categoryPage.value * pageSize,
  ),
);

const tagPagination = computed(() => ({
  page: tagPage.value,
  pageSize,
  itemCount: filteredTags.value.length,
  onUpdatePage: (value: number) => {
    tagPage.value = value;
  },
}));

const categoryPagination = computed(() => ({
  page: categoryPage.value,
  pageSize,
  itemCount: filteredCategories.value.length,
  onUpdatePage: (value: number) => {
    categoryPage.value = value;
  },
}));

async function loadAll() {
  loading.value = true;
  try {
    const [tagResponse, categoryResponse] = await Promise.all([fetchTags(100), fetchCategories()]);
    tags.value = tagResponse;
    categories.value = categoryResponse;
  } finally {
    loading.value = false;
  }
}

async function createTag() {
  if (!isAdmin.value) return;
  if (!tagForm.name.trim()) return;
  await http.post('/tags', { name: tagForm.name.trim() });
  tagForm.name = '';
  await loadAll();
}

async function createCategory() {
  if (!isAdmin.value) return;
  if (!categoryForm.name.trim()) return;
  await http.post('/categories', { name: categoryForm.name.trim() });
  categoryForm.name = '';
  await loadAll();
}

async function renameTag(row: TaxonomyItemVO) {
  if (!isAdmin.value) return;
  const name = window.prompt(t('taxonomy.renameTagPrompt'), row.name)?.trim();
  if (!name || name === row.name) return;
  await http.put(`/tags/${row.id}`, { name });
  await loadAll();
}

async function removeTag(row: TaxonomyItemVO) {
  if (!isAdmin.value) return;
  await http.del(`/tags/${row.id}`);
  await loadAll();
}

async function renameCategory(row: TaxonomyItemVO) {
  if (!isAdmin.value) return;
  const name = window.prompt(t('taxonomy.renameCategoryPrompt'), row.name)?.trim();
  if (!name || name === row.name) return;
  await http.put(`/categories/${row.id}`, { name });
  await loadAll();
}

async function removeCategory(row: TaxonomyItemVO) {
  if (!isAdmin.value) return;
  await http.del(`/categories/${row.id}`);
  await loadAll();
}

const makeColumns = (
  onRename: (row: TaxonomyItemVO) => void,
  onRemove: (row: TaxonomyItemVO) => void,
) => [
  { title: t('taxonomy.column.id'), key: 'id' },
  { title: t('taxonomy.column.name'), key: 'name' },
  {
    title: t('taxonomy.column.actions'),
    key: 'actions',
    render: (row: TaxonomyItemVO) =>
      h(NSpace, null, {
        default: () => [
          h(
            NButton,
            {
              text: true,
              size: 'small',
              disabled: !isAdmin.value,
              onClick: () => onRename(row),
            },
            { default: () => t('taxonomy.rename') },
          ),
          h(
            NButton,
            {
              text: true,
              size: 'small',
              type: 'error',
              disabled: !isAdmin.value,
              onClick: () => onRemove(row),
            },
            { default: () => t('taxonomy.delete') },
          ),
        ],
      }),
  },
];

onMounted(loadAll);
</script>

<template>
  <div class="taxonomy-shell">
    <n-card :title="t('taxonomy.tagManagement')">
      <n-alert v-if="!isAdmin" type="warning" :show-icon="false">
        {{ t('taxonomy.readonlyWarning') }}
      </n-alert>
      <n-form inline>
        <n-form-item :label="t('taxonomy.searchLabel')">
          <n-input v-model:value="tagQuery" :placeholder="t('taxonomy.searchTagPlaceholder')" />
        </n-form-item>
        <n-form-item :label="t('taxonomy.newTagLabel')">
          <n-input v-model:value="tagForm.name" :placeholder="t('taxonomy.newTagPlaceholder')" />
        </n-form-item>
        <n-button type="primary" :disabled="!isAdmin" @click="createTag"
          >{{ t('taxonomy.createTag') }}</n-button
        >
      </n-form>
      <n-data-table
        class="table"
        :columns="makeColumns(renameTag, removeTag)"
        :data="pagedTags"
        :loading="loading"
        :pagination="tagPagination"
      />
    </n-card>

    <n-card :title="t('taxonomy.categoryManagement')" class="section-card">
      <n-form inline>
        <n-form-item :label="t('taxonomy.searchLabel')">
          <n-input
            v-model:value="categoryQuery"
            :placeholder="t('taxonomy.searchCategoryPlaceholder')"
          />
        </n-form-item>
        <n-form-item :label="t('taxonomy.newCategoryLabel')">
          <n-input
            v-model:value="categoryForm.name"
            :placeholder="t('taxonomy.newCategoryPlaceholder')"
          />
        </n-form-item>
        <n-button type="primary" :disabled="!isAdmin" @click="createCategory"
          >{{ t('taxonomy.createCategory') }}</n-button
        >
      </n-form>
      <n-data-table
        class="table"
        :columns="makeColumns(renameCategory, removeCategory)"
        :data="pagedCategories"
        :loading="loading"
        :pagination="categoryPagination"
      />
    </n-card>
  </div>
</template>

<style scoped>
.taxonomy-shell {
  max-width: 960px;
  margin: 24px auto;
}

.section-card {
  margin-top: 20px;
}

.table {
  margin-top: 16px;
}
</style>
