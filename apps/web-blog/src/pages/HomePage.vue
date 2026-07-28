<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { NButton, NSkeleton } from 'naive-ui';
import BlogArticleCard from '@/components/blog/BlogArticleCard.vue';
import { useLoginPrompt } from '@/composables/useLoginPrompt';

const router = useRouter();
const blog = useBlogStore();
const { items, articlesLoading, loading, error } = storeToRefs(blog);

function goToAuthor(username?: string) {
  if (!username) return;
  router.push(`/authors/${username}`);
}

function goToTag(tag: string) {
  router.push(`/tags/${encodeURIComponent(tag)}`);
}

function goToCategory(category: string) {
  router.push(`/categories/${encodeURIComponent(category)}`);
}

const loginPrompt = useLoginPrompt();

onMounted(async () => {
  await Promise.all([blog.fetchHome(), blog.fetchPage(1)]);
  loginPrompt.show();
});
</script>

<template>
  <div class="home-dashboard">
    <div v-if="loading || articlesLoading" class="loading-state">
      <n-skeleton text :repeat="6" />
    </div>

    <template v-else-if="error">
      <div class="error-state">
        <p>{{ error }}</p>
        <n-button @click="blog.fetchHome()">重试</n-button>
      </div>
    </template>

    <template v-else>
      <section v-if="items.length" class="section">
        <div class="section-header">
          <h2 class="section-title">最近发布</h2>
          <router-link to="/posts" class="view-all">查看全部 →</router-link>
        </div>
        <div class="article-list">
          <template v-for="(article, i) in items" :key="article.id">
            <BlogArticleCard
              :article="article"
              :variant="i === 0 ? 'spotlight' : 'default'"
              :mode="i === 0 ? 'list' : 'card'"
              @open="(slug) => router.push(`/posts/${slug}`)"
              @open-author="goToAuthor"
              @tag-click="goToTag"
              @category-click="goToCategory"
            />
          </template>
        </div>
      </section>
      <section v-else class="empty-state">
        <p>暂无内容</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.home-dashboard {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 0 48px;
}

.loading-state {
  padding: 48px 0;
}

.error-state {
  text-align: center;
  padding: 48px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--app-border);
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.view-all {
  font-size: 13px;
  color: var(--app-primary);
  text-decoration: none;
}

.view-all:hover {
  opacity: 0.8;
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--app-text-tertiary);
}

@media (max-width: 640px) {
  .home-dashboard {
    padding: 16px 0 32px;
  }
}
</style>
