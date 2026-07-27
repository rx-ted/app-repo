<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import {
  NAlert,
  NButton,
  NButtonGroup,
  NCard,
  NEmpty,
  NPagination,
  NSkeleton,
  NSpace,
} from 'naive-ui';
import BlogArticleCard from '@/components/blog/BlogArticleCard.vue';

const router = useRouter();
const props = withDefaults(
  defineProps<{
    title?: string;
    showToolbar?: boolean;
    excludeSlugs?: string[];
    keyword?: string;
    tag?: string;
    category?: string;
    author?: string;
    initialViewMode?: 'card' | 'list';
  }>(),
  {
    title: '最新文章',
    showToolbar: true,
    excludeSlugs: () => [],
    keyword: '',
    tag: '',
    category: '',
    author: '',
    initialViewMode: undefined,
  },
);
const blog = useBlogStore();
const {
  items: articles,
  total,
  page,
  pageSize,
  articlesLoading: loading,
  articlesError: error,
  viewMode,
} = storeToRefs(blog);
const emit = defineEmits<(e: 'view-mode-change', mode: 'card' | 'list') => void>();

async function loadArticles(nextPage?: number) {
  await blog.fetchPage(nextPage, {
    excludeSlugs: props.excludeSlugs,
    keyword: props.keyword,
    tag: props.tag,
    category: props.category,
    author: props.author,
  });
}

function setViewMode(mode: 'card' | 'list') {
  blog.setViewMode(mode);
  emit('view-mode-change', mode);
}

function goToArticle(slug: string) {
  router.push(`/posts/${slug}`);
}

function goToAuthor(username?: string) {
  if (!username) return;
  router.push(`/authors/${username}`);
}

function goToTag(tag: string) {
  router.push({ path: '/posts', query: { tag } });
}

function goToCategory(category: string) {
  router.push({ path: '/posts', query: { category } });
}

watch(
  () => blog.page,
  () => {
    loadArticles();
  },
);

onMounted(() => loadArticles(1));
watch(
  () => props.excludeSlugs.join(','),
  () => {
    void loadArticles(1);
  },
);
watch(
  () => `${props.keyword}|${props.tag}|${props.category}|${props.author}`,
  () => {
    void loadArticles(1);
  },
);
watch(
  () => props.initialViewMode,
  (value) => {
    if (value) blog.setViewMode(value);
  },
  { immediate: true },
);
</script>

<template>
  <section class="article-list-shell">
    <div v-if="props.showToolbar" class="list-toolbar">
      <div>
        <h2>{{ props.title }}</h2>
      </div>
      <n-button-group>
        <n-button
          :type="viewMode === 'card' ? 'primary' : 'default'"
          ghost
          @click="setViewMode('card')"
        >
          卡片模式
        </n-button>
        <n-button
          :type="viewMode === 'list' ? 'primary' : 'default'"
          ghost
          @click="setViewMode('list')"
        >
          列表模式
        </n-button>
      </n-button-group>
    </div>

    <n-alert v-if="error" type="error" :show-icon="false">
      {{ error }}
    </n-alert>

    <div v-else-if="loading" class="skeleton-list">
      <n-card v-for="index in 3" :key="index" class="article-card">
        <n-space vertical size="large">
          <n-skeleton text style="width: 48%" />
          <n-skeleton text :repeat="2" />
          <n-skeleton text style="width: 72%" />
        </n-space>
      </n-card>
    </div>

    <div
      v-else-if="articles.length"
      class="article-list"
      :class="viewMode === 'card' ? 'mode-card' : 'mode-list'"
    >
      <BlogArticleCard
        v-for="article in articles"
        :key="article.id"
        :article="article"
        :mode="viewMode"
        @open="goToArticle"
        @open-author="goToAuthor"
        @tag-click="goToTag"
        @category-click="goToCategory"
      />
    </div>

    <n-empty v-else description="还没有文章" />

    <div class="pagination-wrap" v-if="total > pageSize">
      <n-pagination v-model:page="page" :page-size="pageSize" :item-count="total" />
    </div>
  </section>
</template>

<style scoped>
.article-list-shell {
  display: grid;
  gap: 20px;
}

.list-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.toolbar-kicker {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--app-text-tertiary);
}

.list-toolbar h2 {
  margin: 6px 0 0;
}

.skeleton-list,
.article-list {
  display: grid;
  gap: 18px;
}

.article-list.mode-card {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.article-list.mode-list {
  grid-template-columns: 1fr;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

@media (max-width: 900px) {
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 640px) {
  .article-list.mode-card {
    grid-template-columns: 1fr;
  }
}
</style>
