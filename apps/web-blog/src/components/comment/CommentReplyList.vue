<template>
  <div class="reply-list">
    <CommentItem
      v-for="reply in replies"
      :key="reply.id"
      :comment="reply"
      :post-slug="postSlug"
      :is-owner="isOwner"
      :is-admin="isAdmin"
      :active-reply-id="activeReplyId"
      @like="(id: number) => $emit('like', id)"
      @reply="(c: any) => $emit('reply', c)"
      @edit="(c: any) => $emit('edit', c)"
      @delete="(id: number) => $emit('delete', id)"
      @report="(c: any) => $emit('report', c)"
      @show-author="(id: string) => $emit('showAuthor', id)"
    />
    <button v-if="hasMore && !loading" class="load-more-btn" @click="$emit('loadMore')">
      加载更多回复 ({{ remaining }})
    </button>
    <span v-if="loading" class="load-more-btn loading">加载中...</span>
  </div>
</template>

<script setup lang="ts">
import type { CommentVO } from '@/types/community';
import CommentItem from './CommentItem.vue';

defineProps<{
  replies: CommentVO[];
  total: number;
  loading: boolean;
  postSlug?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  hasMore: boolean;
  remaining: number;
  activeReplyId?: number | null;
}>();

defineEmits<{
  like: [id: number];
  reply: [comment: CommentVO];
  edit: [comment: CommentVO];
  delete: [id: number];
  report: [comment: CommentVO];
  loadMore: [];
  showAuthor: [userId: string];
}>();
</script>

<style scoped>
.reply-list {
  margin-left: 24px;
  margin-top: 12px;
}

.load-more-btn {
  display: block;
  width: 100%;
  padding: 8px;
  margin-top: 8px;
  border: 1px dashed var(--app-border);
  border-radius: 6px;
  background: transparent;
  color: var(--n-text-color-3);
  font-size: 13px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
}

.load-more-btn:hover {
  color: var(--app-primary);
  border-color: var(--app-primary);
}
</style>
