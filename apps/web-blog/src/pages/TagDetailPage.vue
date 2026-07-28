<template>
  <div class="tag-detail-page">
    <div class="page-header">
      <h1 class="page-title">
        <router-link to="/tags" class="page-prefix">标签</router-link>
        <span class="page-sep">/</span>
        {{ tagName }}
      </h1>
      <p class="page-subtitle">{{ tag?.postCount ?? 0 }} 篇文章</p>
    </div>

    <ArticleTimeline
      :articles="articles"
      :loading="loading"
      :show-load-more="showLoadMore"
      :show-tags="true"
      :active-tag="tagName"
      accent-color="var(--app-primary)"
      @load-more="loadMore"
      @select="goToPost"
      @tag-click="goToTag"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { BlogPostCardVO } from '@/types/blog';
import { API } from '@/constants/api';
import { useBlogStore } from '@/stores/blog';
import ArticleTimeline from '@/components/blog/ArticleTimeline.vue';

const route = useRoute();
const router = useRouter();
const blog = useBlogStore();

const tagName = computed(() => (route.params.name as string) ?? '');
const loading = ref(false);
const articles = ref<BlogPostCardVO[]>([]);
const page = ref(1);
const total = ref(0);
const pageSize = 10;

const tag = computed(() =>
  blog.tagsList.find((tg) => tg.slug === tagName.value || tg.name === tagName.value),
);

const showLoadMore = computed(() => articles.value.length < total.value);

async function fetchPosts() {
  loading.value = true;
  try {
    const body = await http.get<ApiResponse<{ list: BlogPostCardVO[]; total: number }>>(
      API.POSTS_LIST,
      {
        query: { page: page.value, pageSize, tag: tagName.value },
      },
    );
    if (page.value === 1) {
      articles.value = body.data.list;
    } else {
      articles.value = [...articles.value, ...body.data.list];
    }
    total.value = body.data.total;
  } catch {
    articles.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value++;
  fetchPosts();
}

function goToPost(slug: string) {
  router.push(`/posts/${slug}`);
}

function goToTag(name: string) {
  router.push(`/tags/${encodeURIComponent(name.toLowerCase())}`);
}

watch(
  tagName,
  () => {
    if (tagName.value) {
      page.value = 1;
      fetchPosts();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.tag-detail-page {
  padding: 32px 0;
}
.page-header {
  margin-bottom: 32px;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
.page-prefix {
  color: var(--app-text-tertiary);
  font-weight: 400;
  text-decoration: none;
  transition: color 0.15s;
}
.page-prefix:hover {
  color: var(--app-primary);
}
.page-sep {
  color: var(--app-text-quaternary);
  font-weight: 400;
  margin: 0 4px;
}
.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}
</style>
