<template>
  <div class="recent-posts">
    <div class="rec-header">
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
          <path d="M17 3.5V2M7 3.5V2M2 8h20" />
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <path d="M16 14h.01M12 14h.01M8 14h.01" />
        </svg>
        <h4 class="widget-title">近期文章</h4>
      </div>
    </div>
    <ul class="post-list">
      <li v-for="post in posts" :key="post.slug" class="post-item">
        <router-link :to="`/posts/${post.slug}`" class="post-link">
          <span class="post-title">{{ post.title }}</span>
          <span class="post-date">{{ post.date }}</span>
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBlogStore } from '@/stores/blog';

const blog = useBlogStore();

const posts = computed(() =>
  blog.latest.slice(0, 5).map((post) => ({
    slug: post.slug,
    title: post.title,
    date: post.updated_at?.slice(0, 10) ?? '',
  })),
);
</script>

<style scoped>
.recent-posts {
  padding: 16px 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
}

.rec-header {
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
  color: var(--app-primary);
  flex-shrink: 0;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.post-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.post-item {
  margin-bottom: 2px;
}

.post-link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-decoration: none;
  padding: 7px 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.post-link:hover {
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.post-title {
  font-size: 13px;
  color: var(--app-text);
  line-height: 1.4;
}

.post-date {
  font-size: 11px;
  color: var(--app-text-secondary);
}
</style>
