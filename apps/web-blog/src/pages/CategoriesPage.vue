<template>
  <div class="categories-page">
    <div class="page-header">
      <h1 class="page-title">分类</h1>
      <p class="page-subtitle">全部分类 · {{ sortedCategories.length }} 个分类</p>
    </div>

    <div v-if="categoriesLoading" class="loading-state">加载中...</div>

    <div v-else class="category-grid">
      <div
        v-for="cat in sortedCategories"
        :key="cat.id"
        class="category-card"
        @click="goToCategory(cat.slug)"
      >
        <div
          class="card-accent"
          :style="{ background: cardAccent(sortedCategories.indexOf(cat)) }"
        />
        <div class="card-body">
          <div class="card-top">
            <span class="card-name">{{ cat.name }}</span>
            <span
              class="card-count"
              :style="{ background: cardAccentBg(sortedCategories.indexOf(cat)) }"
              >{{ cat.postCount ?? 0 }}</span
            >
          </div>
          <p v-if="cat.description" class="card-desc">{{ cat.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { storeToRefs } from 'pinia';

const router = useRouter();
const blog = useBlogStore();
const { categoriesList, categoriesLoading } = storeToRefs(blog);

const PALETTE = [
  '#e86f5e',
  '#e8a05e',
  '#e8c85e',
  '#8fc75e',
  '#5ec4a8',
  '#5ea3c7',
  '#7a7bc7',
  '#b07ac7',
];

const sortedCategories = computed(() =>
  [...categoriesList.value].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)),
);

function cardAccent(index: number): string {
  return PALETTE[index % PALETTE.length];
}

function cardAccentBg(index: number): string {
  const c = PALETTE[index % PALETTE.length];
  return `color-mix(in srgb, ${c} 14%, transparent)`;
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
.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 640px) {
  .category-grid {
    grid-template-columns: 1fr;
  }
}
.category-card {
  display: flex;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--app-text) 8%, transparent);
}
.card-accent {
  width: 4px;
  flex-shrink: 0;
}
.card-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-count {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
  color: var(--app-text);
}
.card-desc {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
