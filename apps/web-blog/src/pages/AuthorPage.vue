<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http } from '@/http';
import type { ApiResponse } from '@/http/types';
import type { App } from '@/theme/app';
import type { BlogAuthorVO } from '@/types/blog';
import { mapAuthorPostVOToArticle } from '@/utils/blogView';
import { NSpin, NAlert, NButton, NEmpty, NPagination, NTag } from 'naive-ui';
import BlogAuthorHeroCard from '@/components/users/BlogAuthorHeroCard.vue';
import BlogArticleCard from '@/components/blog/BlogArticleCard.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const error = ref('');
const payload = ref<BlogAuthorVO | null>(null);
const username = computed(() => String(route.params.username || ''));
const currentPage = ref(1);
const activeTag = ref('');

async function loadAuthor() {
  if (!username.value) return;
  loading.value = true;
  error.value = '';
  try {
    const response = await http.get<ApiResponse<BlogAuthorVO>>(`/blog/authors/${username.value}`, {
      query: { page: currentPage.value, pageSize: 8, tag: activeTag.value || undefined },
    });
    payload.value = response.data;
    currentPage.value = response.data.posts.page;
    activeTag.value = response.data.posts.activeTag ?? '';
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '加载作者页失败';
    payload.value = null;
  } finally {
    loading.value = false;
  }
}

function selectTag(tag = '') {
  activeTag.value = tag;
  currentPage.value = 1;
  loadAuthor();
}

function changePage(page: number) {
  currentPage.value = page;
  loadAuthor();
}

const authorArticles = computed<App.BlogArticle[]>(() =>
  (payload.value?.posts.list ?? []).map((post) =>
    mapAuthorPostVOToArticle(post, payload.value?.author),
  ),
);

function goToArticle(slug: string) {
  router.push(`/posts/${slug}`);
}

onMounted(loadAuthor);
watch(
  () => username.value,
  () => {
    currentPage.value = 1;
    activeTag.value = '';
    loadAuthor();
  },
);
</script>

<template>
  <div class="author-page">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="alert">{{ error }}</n-alert>

      <template v-else-if="payload">
        <BlogAuthorHeroCard
          :nickname="payload.author.nickname"
          :username="payload.author.username"
          :avatar-url="payload.author.avatar_url"
          :bio="payload.author.bio"
          :website="payload.author.website"
          :location="payload.author.location"
          :total-posts="payload.posts.total"
        />

        <div v-if="payload.posts.tags.length" class="tag-filters">
          <n-button
            size="small"
            :type="!activeTag ? 'primary' : 'default'"
            ghost
            @click="selectTag()"
            >全部</n-button
          >
          <n-button
            v-for="tag in payload.posts.tags"
            :key="tag"
            size="small"
            :type="activeTag === tag ? 'primary' : 'default'"
            ghost
            @click="selectTag(tag)"
          >
            {{ tag }}
          </n-button>
        </div>

        <div v-if="authorArticles.length" class="post-grid">
          <BlogArticleCard
            v-for="article in authorArticles"
            :key="article.id"
            :article="article"
            @open="goToArticle"
          />
        </div>
        <n-empty v-else description="作者暂时还没有公开文章" />

        <div v-if="payload.posts.total > payload.posts.pageSize" class="pagination-row">
          <n-pagination
            :page="currentPage"
            :page-size="payload.posts.pageSize"
            :item-count="payload.posts.total"
            @update:page="changePage"
          />
        </div>
      </template>
    </n-spin>
  </div>
</template>

<style scoped>
.author-page {
  max-width: 960px;
  margin: 24px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.alert {
  margin-bottom: 0;
}

.tag-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.pagination-row {
  display: flex;
  justify-content: center;
}

@media (max-width: 800px) {
  .post-grid {
    grid-template-columns: 1fr;
  }
}
</style>
