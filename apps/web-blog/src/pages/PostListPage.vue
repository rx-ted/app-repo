<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { useI18n } from '@/composables/useI18n';
import BlogArticleList from '@/components/blog/BlogArticleList.vue';
import { NButtonGroup, NButton, NTag } from 'naive-ui';

const route = useRoute();
const router = useRouter();
const blog = useBlogStore();
const { t } = useI18n();

const feed = computed(() => String(route.query.feed || ''));
const tag = computed(() => String(route.query.tag || ''));
const category = computed(() => String(route.query.category || ''));
const author = computed(() => String(route.query.author || ''));
const viewMode = computed<'card' | 'list' | undefined>(() => {
  const value = String(route.query.viewMode || '');
  return value === 'list' || value === 'card' ? value : undefined;
});
const activeViewMode = computed<'card' | 'list'>(() => viewMode.value ?? 'card');

const listTitle = computed(() =>
  author.value
    ? t('post.filterByAuthor', { author: author.value })
    : tag.value
      ? t('post.filterByTag', { tag: tag.value })
      : category.value
        ? t('post.filterByCategory', { category: category.value })
        : feed.value === 'latest'
          ? t('post.latest')
          : t('post.all'),
);

const listDescription = computed(() =>
  author.value
    ? t('post.descByAuthor')
    : tag.value
      ? t('post.descByTag')
      : category.value
        ? t('post.descByCategory')
        : feed.value === 'latest'
          ? t('post.descLatest')
          : t('post.descAll'),
);

const hasActiveFilters = computed(() => Boolean(tag.value || category.value || author.value));

function updateQuery(patch: Record<string, string | undefined>) {
  router.push({
    path: '/posts',
    query: { ...route.query, ...patch },
  });
}

function clearTag() {
  updateQuery({ tag: undefined });
}
function clearCategory() {
  updateQuery({ category: undefined });
}
function clearAuthor() {
  updateQuery({ author: undefined });
}
function setViewMode(mode: 'card' | 'list') {
  updateQuery({ viewMode: mode });
}
function clearAll() {
  router.push('/posts');
}

const urlPage = Number(route.query.page);
if (Number.isFinite(urlPage) && urlPage >= 1) {
  blog.page = urlPage;
}

watch(
  () => blog.page,
  (val) => {
    const next = val > 1 ? String(val) : undefined;
    if (String(route.query.page ?? '') !== (next ?? '')) {
      updateQuery({ page: next });
    }
  },
);

watch(
  () => route.query.page,
  (raw) => {
    const n = Number(raw);
    const target = Number.isFinite(n) && n >= 1 ? n : 1;
    if (target !== blog.page) {
      blog.page = target;
    }
  },
);

onMounted(() => {
  if (!blog.hero) {
    blog.fetchHome();
  }
});
</script>

<template>
  <div class="doc-shell">
    <div class="page-header">
      <div>
        <h1 class="page-badge">{{ t('post.badge') }}</h1>
        <h3>{{ listTitle }}</h3>
        <p class="page-desc">{{ listDescription }}</p>
      </div>
      <div class="page-controls">
        <n-button-group>
          <n-button
            :type="activeViewMode === 'card' ? 'primary' : 'default'"
            size="small"
            @click="setViewMode('card')"
          >
            {{ t('post.viewMode.card') }}
          </n-button>
          <n-button
            :type="activeViewMode === 'list' ? 'primary' : 'default'"
            size="small"
            @click="setViewMode('list')"
          >
            {{ t('post.viewMode.list') }}
          </n-button>
        </n-button-group>
      </div>
    </div>

    <div v-if="hasActiveFilters" class="filter-bar">
      <div class="active-filters">
        <n-tag v-if="tag" closable @close="clearTag">{{ t('post.filterByTag', { tag }) }}</n-tag>
        <n-tag v-if="category" closable @close="clearCategory"
          >{{ t('post.filterByCategory', { category }) }}</n-tag
        >
        <n-tag v-if="author" closable @close="clearAuthor">@{{ author }}</n-tag>
      </div>
      <n-button text size="small" @click="clearAll">{{ t('post.clearAll') }}</n-button>
    </div>

    <BlogArticleList
      :show-toolbar="false"
      :title="listTitle"
      :tag="tag"
      :category="category"
      :author="author"
      :initial-view-mode="viewMode"
      @view-mode-change="setViewMode"
    />
  </div>
</template>

<style scoped>
.doc-shell {
  max-width: 1120px;
  margin: 24px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  margin: 4px 0 8px;
}

.page-desc {
  margin: 0;
  color: var(--app-text-secondary);
  line-height: 1.6;
  max-width: 560px;
}

.page-controls {
  flex-shrink: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--app-bg-muted);
  border: 1px solid var(--app-border);
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 800px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .doc-shell {
    margin: 16px auto;
    gap: 16px;
  }
}
</style>
