<template>
  <div class="comment-item" :id="`comment-${comment.id}`">
    <div class="comment-main">
      <div class="comment-author" @click="handleAuthorClick">
        <n-avatar
          :src="comment.author.avatar ?? undefined"
          :size="36"
          :fallback-src="defaultAvatar"
          class="author-avatar"
        />
        <div class="author-info">
          <span class="author-name">
            {{ displayName }}
          </span>
          <span class="author-meta">
            {{ authorMeta }}
          </span>
        </div>
      </div>

      <div class="comment-content">
        <span v-if="comment.status === 'DELETED'" class="deleted-text"> 该评论已被删除 </span>
        <template v-else>
          <span v-html="renderContent(comment.content)" />
        </template>
      </div>

      <CommentActions
        :comment="comment"
        :is-owner="isOwner"
        :is-admin="isAdmin"
        :post-slug="postSlug"
        @like="(id: number) => emit('like', id)"
        @reply="(c: any) => emit('reply', c)"
        @edit="(c: any) => emit('edit', c)"
        @delete="(id: number) => emit('delete', id)"
        @report="(c: any) => emit('report', c)"
      />
    </div>

    <!-- Inline edit form -->
    <div v-if="editing" class="edit-form">
      <textarea v-model="editContent" rows="2" class="edit-textarea" />
      <div class="edit-actions">
        <n-button size="small" type="primary" @click="saveEdit">保存</n-button>
        <n-button size="small" @click="cancelEdit">取消</n-button>
      </div>
    </div>

    <!-- Nested replies -->
    <CommentReplyList
      v-if="comment.replies?.list && comment.replies.list.length > 0"
      :replies="comment.replies.list"
      :total="comment.replyCount"
      :loading="replyLoading"
      :post-slug="postSlug"
      :is-owner="isOwner"
      :is-admin="isAdmin"
      :has-more="comment.replyCount > (comment.replies?.list?.length ?? 0)"
      :remaining="comment.replyCount - (comment.replies?.list?.length ?? 0)"
      @like="(id: number) => emit('like', id)"
      @reply="(c: any) => emit('reply', c)"
      @edit="(c: any) => emit('edit', c)"
      @delete="(id: number) => emit('delete', id)"
      @report="(c: any) => emit('report', c)"
      @load-more="handleLoadMore"
      @show-author="(id: string) => emit('showAuthor', id)"
    />

    <!-- Reply input -->
    <n-collapse-transition :show="replying" :appear="false">
      <div v-if="replying" class="reply-input">
        <CommentInput
          :placeholder="`回复 ${displayName}`"
          :submitting="replySubmitting"
          :guest-mode="!isLoggedIn"
          @submit="handleReplySubmit"
        />
      </div>
    </n-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NAvatar, NButton, NCollapseTransition, useMessage } from 'naive-ui';
import type { CommentVO } from '@/types/community';
import { useCommentStore } from '@/stores/comment';
import { useSessionStore } from '@/stores/session';
import { timeAgo, highlightMentions } from '@/utils/comment';
import CommentActions from './CommentActions.vue';
import CommentReplyList from './CommentReplyList.vue';
import CommentInput from './CommentInput.vue';

const props = defineProps<{
  comment: CommentVO;
  postSlug?: string;
  isOwner: boolean;
  isAdmin?: boolean;
  activeReplyId?: number | null;
}>();

const emit = defineEmits<{
  like: [id: number];
  reply: [comment: CommentVO];
  edit: [comment: CommentVO];
  delete: [id: number];
  report: [comment: CommentVO];
  showAuthor: [userId: string];
}>();

const store = useCommentStore();
const sessionStore = useSessionStore();
const message = useMessage();
const defaultAvatar = '';

const isLoggedIn = computed(() => !!sessionStore.token);

const isGuest = computed(() => props.comment.author.id.startsWith('guest:'));

const displayName = computed(() => {
  if (isGuest.value) return props.comment.author.displayName || '匿名';
  return props.comment.author.displayName || props.comment.author.username;
});

const authorMeta = computed(() => {
  if (isGuest.value) {
    const parts: string[] = [];
    if (props.comment.author.location) {
      parts.push(props.comment.author.location);
    }
    parts.push(timeAgo(props.comment.createdAt));
    return parts.join(' · ');
  }
  return `@${props.comment.author.username} · ${timeAgo(props.comment.createdAt)}`;
});

function handleAuthorClick() {
  if (!isGuest.value) {
    emit('showAuthor', props.comment.author.id);
  }
}

// Edit state
const editing = ref(false);
const editContent = ref('');

// Reply state
const replying = computed(() => props.activeReplyId === props.comment.id);
const replySubmitting = ref(false);
const replyLoading = ref(false);

function renderContent(content: string): string {
  return highlightMentions(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\n/g, '<br>');
}

function handleLoadMore() {
  // Load more replies
}

async function handleReplySubmit(
  content: string,
  guestName?: string,
  guestEmail?: string,
  guestWebsite?: string,
) {
  replySubmitting.value = true;
  const result = await store.createComment({
    postId: props.comment.postId ?? undefined,
    parentId: props.comment.id,
    content,
    guestName,
    guestEmail,
    guestWebsite,
  });
  replySubmitting.value = false;
  if (result) {
    message.success('回复成功');
  } else {
    message.error('回复失败');
  }
}

function saveEdit() {
  if (!editContent.value.trim()) return;
  store.editComment(props.comment.id, editContent.value);
  editing.value = false;
}

function cancelEdit() {
  editing.value = false;
  editContent.value = '';
}
</script>

<style scoped>
.comment-item {
  margin-bottom: 16px;
}

.comment-main {
  padding: 8px;
  border-radius: 8px;
  transition: background 0.15s;
}

.comment-main:hover {
  background: var(--app-bg);
}

.comment-author {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin-bottom: 6px;
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.author-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.author-meta {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.comment-content {
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.comment-content :deep(.mention-highlight) {
  color: var(--app-primary);
  font-weight: 500;
}

.comment-content :deep(code) {
  background: var(--n-code-color, #f5f5f5);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 13px;
}

.deleted-text {
  color: var(--n-text-color-3);
  font-style: italic;
}

.edit-form {
  margin: 8px 0 8px 44px;
}

.edit-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
  background: var(--app-bg);
  color: var(--app-text);
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.reply-input {
  margin: 8px 0 8px 44px;
}
</style>
