<template>
  <div class="comment-actions">
    <!-- Like -->
    <button
      class="action-btn"
      :class="{ liked: comment.isLiked }"
      @click="$emit('like', comment.id)"
    >
      <span v-if="comment.isLiked">❤</span>
      <span v-else>🤍</span>
      <span>{{ comment.likes || 0 }}</span>
    </button>

    <!-- Reply -->
    <button class="action-btn" @click="$emit('reply', comment)">💬 回复</button>

    <!-- Copy -->
    <button class="action-btn" @click="handleCopy">📋 复制</button>

    <!-- Share -->
    <n-dropdown trigger="click" :options="shareOptions" @select="handleShare">
      <button class="action-btn">↗ 分享</button>
    </n-dropdown>

    <!-- Edit (own comment, <5min) -->
    <button v-if="isOwner && canEditComment" class="action-btn" @click="$emit('edit', comment)">
      ✏ 编辑
    </button>

    <!-- Delete (own comment or admin) -->
    <button
      v-if="isOwner || isAdmin"
      class="action-btn danger"
      @click="$emit('delete', comment.id)"
    >
      🗑 删除
    </button>

    <!-- Report -->
    <button v-if="!isOwner" class="action-btn" @click="$emit('report', comment)">⚑ 举报</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NDropdown, useMessage } from 'naive-ui';
import type { CommentVO } from '@/types/community';
import { copyToClipboard, getCommentLink, timeAgo } from '@/utils/comment';

const props = defineProps<{
  comment: CommentVO;
  isOwner: boolean;
  isAdmin?: boolean;
  postSlug?: string;
}>();

const emit = defineEmits<{
  like: [id: number];
  reply: [comment: CommentVO];
  edit: [comment: CommentVO];
  delete: [id: number];
  report: [comment: CommentVO];
}>();

const message = useMessage();

const canEditComment = computed(() => {
  const created = new Date(props.comment.createdAt).getTime();
  return Date.now() - created < 5 * 60 * 1000;
});

const shareOptions = [
  { label: '复制链接', key: 'copy-link' },
  { label: '分享到 Twitter/X', key: 'twitter' },
  { label: '分享到微博', key: 'weibo' },
];

function handleCopy() {
  copyToClipboard(props.comment.content);
  message.success('已复制');
}

async function handleShare(key: string) {
  const link = getCommentLink(props.postSlug ?? '', props.comment.id);
  const text = props.comment.content.slice(0, 100);
  if (key === 'copy-link') {
    copyToClipboard(link);
    message.success('链接已复制');
  } else if (key === 'twitter') {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      '_blank',
      'noopener,noreferrer',
    );
  } else if (key === 'weibo') {
    window.open(
      `https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }
}
</script>

<style scoped>
.comment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: var(--n-text-color-3);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.action-btn:hover {
  color: var(--app-primary);
  background: var(--app-bg);
}

.action-btn.liked {
  color: var(--app-primary);
}

.action-btn.danger:hover {
  color: #e74c3c;
}
</style>
