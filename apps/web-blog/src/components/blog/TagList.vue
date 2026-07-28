<template>
  <div class="tag-list">
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
          <path
            d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
          />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <h4 class="widget-title">标签</h4>
      </div>
      <button class="view-all" @click="router.push('/tags')">
        <span>全部</span>
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
    <div class="tag-rows">
      <div v-for="tag in displayTags" :key="tag.key" class="tag-row" @click="onTagSelect(tag.name)">
        <div class="tag-info">
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.count }}</span>
        </div>
        <div class="tag-bar-track">
          <div class="tag-bar-fill" :style="{ width: barWidth(tag.count) }" />
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

const tags = computed(() =>
  [...blog.tagsList]
    .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
    .map((t) => ({ key: t.slug, name: t.name, count: t.postCount ?? 0 })),
);

const displayTags = computed(() => tags.value.slice(0, 10));

const maxCount = computed(() => displayTags.value[0]?.count ?? 1);

function barWidth(count: number): string {
  const pct = (count / maxCount.value) * 100;
  return `${Math.max(pct, 2)}%`;
}

onMounted(() => {
  if (!blog.tagsList.length) {
    blog.fetchTags();
  }
});

function onTagSelect(name: string) {
  router.push(`/tags/${encodeURIComponent(name.toLowerCase())}`);
}
</script>

<style scoped>
.tag-list {
  padding: 16px 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: var(--app-primary);
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
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 8%, transparent);
}

.tag-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tag-row:hover {
  background: color-mix(in srgb, var(--app-primary) 5%, transparent);
}

.tag-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}

.tag-count {
  font-size: 11px;
  color: var(--app-text-tertiary);
}

.tag-bar-track {
  height: 3px;
  border-radius: 2px;
  background: var(--app-border);
  overflow: hidden;
}

.tag-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    var(--app-primary),
    color-mix(in srgb, var(--app-primary) 50%, transparent)
  );
  transition: width 0.3s ease;
}
</style>
