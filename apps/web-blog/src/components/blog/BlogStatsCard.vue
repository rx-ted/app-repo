<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useBlogStore } from '@/stores/blog';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const blog = useBlogStore();
const { totalPosts, totalViews, totalLikes, totalComments, tagsCount, categoriesCount } =
  storeToRefs(blog);
</script>

<template>
  <div class="blog-stats-card">
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
          <path d="M3 3v18h18" />
          <path d="M7 16l4-8 4 4 4-6" />
        </svg>
        <h4 class="widget-title">站点统计</h4>
      </div>
    </div>

    <div class="bsc-grid">
      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ totalPosts }}</span>
        <span class="bsc-stat-label">{{ t('post.badge') }}</span>
      </div>
      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ tagsCount }}</span>
        <span class="bsc-stat-label">{{ t('nav.tags') }}</span>
      </div>
      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ categoriesCount }}</span>
        <span class="bsc-stat-label">{{ t('nav.categories') }}</span>
      </div>

      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ totalViews }}</span>
        <span class="bsc-stat-label">{{ t('home.stats.views') }}</span>
      </div>
      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ totalLikes }}</span>
        <span class="bsc-stat-label">{{ t('home.stats.likes') }}</span>
      </div>
      <div class="bsc-stat">
        <span class="bsc-stat-value">{{ totalComments }}</span>
        <span class="bsc-stat-label">{{ t('home.stats.comments') }}</span>
      </div>
  
    </div>
  </div>
</template>

<style scoped>
.blog-stats-card {
  padding: 16px 20px;
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

.bsc-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.bsc-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  transition: background 0.2s;
  min-width: 0;
  overflow: hidden;
}

.bsc-stat:hover {
  background: color-mix(in srgb, var(--app-text) 4%, transparent);
}

.bsc-stat-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.bsc-stat-label {
  font-size: 11px;
  color: var(--app-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (max-width: 640px) {
  .bsc-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .bsc-stat-value {
    font-size: 16px;
  }

  .bsc-stat-label {
    font-size: 10px;
  }
}
</style>
