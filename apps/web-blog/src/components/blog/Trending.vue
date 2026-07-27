<template>
  <div class="trending">
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
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
        <h4 class="widget-title">热门文章</h4>
      </div>
    </div>
    <ol class="trend-list">
      <li v-for="(item, i) in trending" :key="item.slug" class="trend-item">
        <router-link :to="`/posts/${item.slug}`" class="trend-link">
          <span class="trend-rank" :style="rankStyle(i)">{{ i + 1 }}</span>
          <span class="trend-title">{{ item.title }}</span>
          <span class="trend-views">{{ item.views }}</span>
        </router-link>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBlogStore } from '@/stores/blog';

const blog = useBlogStore();

const rankColors = ['hsl(35, 85%, 50%)', 'hsl(150, 50%, 45%)', 'hsl(210, 60%, 50%)'];

function rankStyle(i: number) {
  if (i >= 3) return undefined;
  return {
    background: `color-mix(in srgb, ${rankColors[i]} 18%, transparent)`,
    color: rankColors[i],
  } as Record<string, string>;
}

const trending = computed(() =>
  [...blog.featured]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 10)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      views: p.view_count ?? 0,
    })),
);
</script>

<style scoped>
.trending {
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
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: var(--app-error);
  flex-shrink: 0;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.trend-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.trend-item {
  margin-bottom: 2px;
}

.trend-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  padding: 7px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.trend-link:hover {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.trend-rank {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  background: var(--app-bg-muted);
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.trend-title {
  flex: 1;
  font-size: 13px;
  color: var(--app-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.trend-views {
  font-size: 11px;
  color: var(--app-text-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
