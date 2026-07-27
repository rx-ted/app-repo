<template>
  <div class="author-card">
    <div class="author-avatar">
      <img :src="author.avatar" :alt="author.name">
    </div>
    <div class="author-info">
      <h4 class="author-name">{{ author.name }}</h4>
      <p class="author-bio">{{ author.bio }}</p>
      <div class="author-meta">
        <span class="author-stat">{{ author.postCount }} 篇文章</span>
        <span class="author-stat">{{ author.commentCount }} 评论</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SITE_AUTHOR } from '@/constants/author';
import { usePostDetailStore } from '@/stores/postDetail';

const postDetailStore = usePostDetailStore();

const author = computed(() => ({
  name: postDetailStore.item?.author ?? SITE_AUTHOR.name,
  avatar: SITE_AUTHOR.avatar,
  bio: SITE_AUTHOR.bio,
  postCount: 42,
  commentCount: 186,
}));
</script>

<style scoped>
.author-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.author-avatar {
  flex-shrink: 0;
}

.author-avatar img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
  color: var(--app-text);
}

.author-bio {
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.5;
  margin: 0 0 8px;
}

.author-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.author-stat {
  font-size: 12px;
  color: var(--app-text-tertiary);
}
</style>
