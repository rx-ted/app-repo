<template>
  <div class="categories-page">
    <div class="page-header">
      <h1 class="page-title">分类</h1>
      <p class="page-subtitle">全部分类 · {{ sortedCategories.length }} 个分类</p>
    </div>

    <div v-if="categoriesLoading" class="loading-state">加载中...</div>

    <div v-else class="bento-grid">
      <div
        v-for="(cat, i) in sortedCategories"
        :key="cat.id"
        class="bento-item"
        :class="bentoClass(i)"
        :style="bentoStyle(i)"
        @click="goToCategory(cat.slug)"
      >
        <div class="bi-top">
          <span class="bi-name">{{ cat.name }}</span>
          <span class="bi-count">{{ cat.postCount ?? 0 }} 篇</span>
        </div>
        <p v-if="cat.description" class="bi-desc">{{ cat.description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { storeToRefs } from 'pinia';
import { getColor } from '@/utils/colors';

const router = useRouter();
const blog = useBlogStore();
const { categoriesList, categoriesLoading } = storeToRefs(blog);

const sortedCategories = computed(() =>
  [...categoriesList.value].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)),
);

function bentoClass(index: number): string {
  if (index === 0) return 'large';
  if (index <= 2) return 'wide';
  return '';
}

function bentoStyle(index: number) {
  const c = getColor(index);
  return {
    background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})`,
    color: '#fff',
  };
}

onMounted(() => {
  if (!categoriesList.value.length) {
    blog.fetchCategories();
  }
});

function goToCategory(slug: string) {
  router.push(`/categories/${slug}`);
}
</script>

<style scoped>
.categories-page {
  padding: 32px 0;
}

.page-header {
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}

.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}

.loading-state {
  padding: 48px 0;
  text-align: center;
  color: var(--app-text-tertiary);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 80px;
  gap: 10px;
}

.bento-item {
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.25s;
  overflow: hidden;
  position: relative;
}

.bento-item:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.bento-item.large {
  grid-column: span 2;
  grid-row: span 2;
  padding: 20px;
}

.bento-item.wide {
  grid-column: span 2;
}

.bi-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.bi-name {
  font-size: 13px;
  font-weight: 700;
}

.large .bi-name {
  font-size: 20px;
}

.wide .bi-name {
  font-size: 15px;
}

.bi-count {
  font-size: 11px;
  opacity: 0.75;
  flex-shrink: 0;
}

.large .bi-count {
  font-size: 13px;
}

.bi-desc {
  font-size: 12px;
  opacity: 0.8;
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.large .bi-desc {
  font-size: 13px;
  -webkit-line-clamp: 3;
}

@media (max-width: 640px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    grid-auto-rows: 70px;
  }

  .bento-item.large {
    grid-column: span 2;
    grid-row: span 1;
  }

  .bento-item.wide {
    grid-column: span 2;
  }
}
</style>
