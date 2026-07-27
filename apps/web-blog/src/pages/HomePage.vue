<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { NButton, NPagination, NSkeleton } from 'naive-ui';
import BlogArticleCard from '@/components/blog/BlogArticleCard.vue';
import AdCard from '@/components/ads/AdCard.vue';
import { adSlots } from '@/components/ads/AdSlots';
import { useLoginPrompt } from '@/composables/useLoginPrompt';

const router = useRouter();
const blog = useBlogStore();
const { items, total, page, pageSize, articlesLoading, loading, error } = storeToRefs(blog);

const pageCount = computed(() => Math.ceil(total.value / pageSize.value));

const slot1Index = adSlots.find((s) => s.location === 'post-grid-1')?.desktop.index;
const slot2Index = adSlots.find((s) => s.location === 'post-grid-2')?.desktop.index;

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

function onPageChange(newPage: number) {
  blog.fetchPage(newPage);
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
        <h2 class="section-title">最近发布</h2>
        <div class="post-grid">
          <template v-for="(article, i) in items" :key="article.id">
            <BlogArticleCard
              :article="article"
              variant="default"
              mode="card"
              @open="(slug) => router.push(`/posts/${slug}`)"
              @open-author="goToAuthor"
              @tag-click="goToTag"
              @category-click="goToCategory"
            />
            <AdCard
              v-if="slot1Index != null && i === slot1Index"
              title="精选推荐"
              description="发现更多优质文章和内容"
            />
            <AdCard
              v-if="slot2Index != null && i === slot2Index"
              title="广告合作"
              description="联系我们投放您的广告"
            />
          </template>
        </div>
        <div class="pagination-row">
          <n-pagination :page="page" :page-count="pageCount" @update:page="onPageChange" />
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
  gap: 32px;
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

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.pagination-row {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: var(--app-text-tertiary);
}

@media (max-width: 640px) {
  .home-dashboard {
    gap: 24px;
    padding: 16px 0 32px;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }
}
</style>
