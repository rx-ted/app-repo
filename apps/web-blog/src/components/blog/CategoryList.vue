<template>
  <div class="category-list">
    <div class="widget-header">
      <div class="header-left">
        <svg
          class="header-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <h4 class="widget-title">分类</h4>
      </div>
      <button class="view-all" @click="router.push('/categories')">
        <span>查看更多</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
    <div class="cat-rows">
      <div
        v-for="(cat, i) in displayCategories"
        :key="cat.key"
        class="cat-row"
        @click="onCategorySelect(cat.slug)"
      >
        <div class="cat-accent" :style="{ background: palette[i] }" />
        <div class="cat-body">
          <span class="cat-name">{{ cat.name }}</span>
          <span class="cat-count" :style="{ background: accentBg(i), color: palette[i] }"
            >{{ cat.count }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBlogStore } from '@/stores/blog';

const router = useRouter();
const blog = useBlogStore();

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

const palette = PALETTE;

function accentBg(index: number): string {
  const c = PALETTE[index % PALETTE.length];
  return `color-mix(in srgb, ${c} 12%, transparent)`;
}

const categories = computed(() =>
  [...blog.categoriesList]
    .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
    .map((c) => ({ key: c.slug, slug: c.slug, name: c.name, count: c.postCount ?? 0 })),
);

const displayCategories = computed(() => categories.value.slice(0, 8));

onMounted(() => {
  if (!blog.categoriesList.length) {
    blog.fetchCategories();
  }
});

function onCategorySelect(slug: string) {
  router.push(`/categories/${slug}`);
}
</script>

<style scoped>
.category-list {
  padding: 16px 0;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
  overflow: hidden;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: var(--app-warning);
  flex-shrink: 0;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.view-all {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: var(--app-text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  white-space: nowrap;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.view-all:hover {
  color: var(--app-warning);
  background: color-mix(in srgb, var(--app-warning) 8%, transparent);
}

.cat-rows {
  display: flex;
  flex-direction: column;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cat-row:hover {
  background: color-mix(in srgb, var(--app-warning) 4%, transparent);
}

.cat-accent {
  width: 3px;
  align-self: stretch;
  flex-shrink: 0;
  opacity: 0.6;
}

.cat-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  min-width: 0;
}

.cat-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
