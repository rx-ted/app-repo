<script setup lang="ts">
import type { CommentNode } from '@/types/community';
import CommentItem from './CommentItem.vue';

defineProps<{
  items: CommentNode[];
  onReply: (comment: CommentNode) => void;
  authorUsername?: string;
  postSlug?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
  activeReplyId?: number | null;
}>();

defineEmits<{
  like: [id: number];
  reply: [comment: CommentNode];
  edit: [comment: CommentNode];
  delete: [id: number];
  report: [comment: CommentNode];
  showAuthor: [userId: string];
}>();
</script>

<template>
  <div class="comment-thread">
    <CommentItem
      v-for="comment in items"
      :key="comment.id"
      :comment="comment"
      :post-slug="postSlug"
      :is-owner="isOwner ?? false"
      :is-admin="isAdmin"
      :active-reply-id="activeReplyId"
      @like="(id: number) => $emit('like', id)"
      @reply="(c: any) => $emit('reply', c)"
      @edit="(c: any) => $emit('edit', c)"
      @delete="(id: number) => $emit('delete', id)"
      @report="(c: any) => $emit('report', c)"
      @show-author="(id: string) => $emit('showAuthor', id)"
    />
  </div>
</template>

<style scoped>
.comment-thread {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
