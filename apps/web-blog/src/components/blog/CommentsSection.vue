<template>
  <div class="comments-section">
    <h4 class="widget-title">评论 ({{ store.totalComments }})</h4>

    <!-- Error state -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <n-button size="small" @click="loadComments">重试</n-button>
    </div>

    <!-- Input area -->
    <CommentInput :submitting="submitting" :guest-mode="!isLoggedIn" @submit="handleSubmit" />

    <!-- Sort bar -->
    <CommentSortBar v-model="store.sort" @update:model-value="handleSortChange" />

    <!-- Loading state -->
    <div v-if="store.loading && !store.comments.length" class="loading-state">
      <n-spin size="small" />
      加载中...
    </div>

    <!-- Empty state -->
    <div v-else-if="!store.comments.length && !store.loading" class="empty-state">
      暂无评论，来发表第一条评论吧
    </div>

    <!-- Comment list -->
    <CommentThread
      v-else
      :items="commentTree"
      :post-slug="postSlug"
      :is-owner="isLoggedIn"
      :is-admin="false"
      :active-reply-id="activeReplyId"
      @like="handleLike"
      @reply="(c: any) => activeReplyId = activeReplyId === c.id ? null : c.id"
      @edit="handleEdit"
      @delete="handleDelete"
      @report="handleReport"
      @show-author="handleShowAuthor"
    />

    <!-- Load more -->
    <div v-if="store.hasMore && !store.loading" class="load-more">
      <n-button text @click="loadMore">加载更多</n-button>
    </div>

    <!-- Author Dialog -->
    <AuthorDialog
      :show="showAuthorDialog"
      :user-id="authorDialogUserId"
      @close="closeAuthorDialog"
    />

    <!-- Report Dialog -->
    <n-modal
      v-model:show="showReportDialog"
      preset="card"
      title="举报评论"
      :style="{ maxWidth: '420px' }"
      :bordered="false"
    >
      <div class="report-form">
        <n-radio-group v-model:value="reportReason">
          <n-space vertical>
            <n-radio value="spam">垃圾广告</n-radio>
            <n-radio value="harassment">人身攻击</n-radio>
            <n-radio value="inappropriate">不适当内容</n-radio>
            <n-radio value="other">其他</n-radio>
          </n-space>
        </n-radio-group>
        <n-input
          v-model:value="reportDescription"
          type="textarea"
          placeholder="补充说明（可选）"
          :maxlength="500"
          rows="3"
          class="report-desc"
        />
        <div class="report-actions">
          <n-button @click="showReportDialog = false">取消</n-button>
          <n-button type="primary" :loading="reportSubmitting" @click="submitReport">
            提交举报
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { NButton, NSpin, NModal, NRadio, NRadioGroup, NSpace, NInput, useMessage } from 'naive-ui';
import { useCommentStore } from '@/stores/comment';
import { usePostDetailStore } from '@/stores/postDetail';
import { useSessionStore } from '@/stores/session';
import { buildCommentTree } from '@/utils/commentTree';
import CommentInput from '@/components/comment/CommentInput.vue';
import CommentSortBar from '@/components/comment/CommentSortBar.vue';
import CommentThread from '@/components/comment/CommentThread.vue';
import AuthorDialog from '@/components/comment/AuthorDialog.vue';
import type { CommentVO, CommentNode, CommentSort } from '@/types/community';

const props = withDefaults(
  defineProps<{
    postId?: number;
    postSlug?: string;
  }>(),
  { postId: undefined, postSlug: undefined },
);

const store = useCommentStore();
const sessionStore = useSessionStore();
const route = useRoute();
const postDetailStore = usePostDetailStore();
const message = useMessage();

const submitting = ref(false);
const error = ref('');
const activeReplyId = ref<number | null>(null);
const showAuthorDialog = ref(false);
const authorDialogUserId = ref<string | null>(null);
const showReportDialog = ref(false);
const reportTargetId = ref<number | null>(null);
const reportReason = ref<'spam' | 'harassment' | 'inappropriate' | 'other'>('spam');
const reportDescription = ref('');
const reportSubmitting = ref(false);

const isLoggedIn = computed(() => !!sessionStore.token);

const currentPostId = computed(() => {
  if (props.postId !== undefined) return props.postId;
  if (postDetailStore.item) return Number(postDetailStore.item.id);
  return null;
});

const commentTree = computed<CommentNode[]>(() => {
  return buildCommentTree(store.comments);
});

onMounted(() => {
  loadComments();
});

watch(currentPostId, (val) => {
  if (val) loadComments();
});

function loadComments() {
  if (!currentPostId.value) return;
  error.value = '';
  store.fetchComments(currentPostId.value, undefined, 1);
}

function assertPostId(): number {
  if (!currentPostId.value) throw new Error('postId is not available');
  return currentPostId.value;
}

function handleSortChange(newSort: CommentSort) {
  store.setSort(newSort);
}

async function handleSubmit(
  content: string,
  guestName?: string,
  guestEmail?: string,
  guestWebsite?: string,
) {
  const pid = assertPostId();
  submitting.value = true;
  const result = await store.createComment({
    postId: pid,
    content,
    guestName,
    guestEmail,
    guestWebsite,
  });
  submitting.value = false;
  if (result) {
    message.success('评论成功');
  } else {
    message.error('评论失败，请稍后重试');
  }
}

async function handleLike(commentId: number) {
  if (!isLoggedIn.value) {
    message.warning('请先登录');
    return;
  }
  await store.toggleLike(commentId);
}

function handleEdit(_comment: CommentNode) {}

async function handleDelete(commentId: number) {
  const ok = await store.deleteComment(commentId);
  if (ok) {
    message.success('删除成功');
  } else {
    message.error('删除失败');
  }
}

function handleReport(comment: CommentNode) {
  reportTargetId.value = comment.id;
  reportReason.value = 'spam';
  reportDescription.value = '';
  showReportDialog.value = true;
}

async function submitReport() {
  if (!reportTargetId.value) return;
  reportSubmitting.value = true;
  try {
    const { http } = await import('@/http');
    await http.post(`/api/v1/comments/${reportTargetId.value}/report`, {
      reason: reportReason.value,
      description: reportDescription.value || undefined,
    });
    message.success('举报已提交，感谢您的反馈');
    showReportDialog.value = false;
  } catch {
    message.error('举报提交失败');
  } finally {
    reportSubmitting.value = false;
  }
}

function handleShowAuthor(userId: string) {
  authorDialogUserId.value = userId;
  showAuthorDialog.value = true;
}

function closeAuthorDialog() {
  showAuthorDialog.value = false;
  authorDialogUserId.value = null;
}

async function loadMore() {
  const pid = assertPostId();
  await store.fetchComments(pid, undefined, store.page + 1);
}
</script>

<style scoped>
.comments-section {
  margin-bottom: 24px;
}

.widget-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--app-text);
}

.login-hint {
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--n-text-color-3);
}

.login-hint a {
  color: var(--app-primary);
  text-decoration: none;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--n-text-color-3);
  font-size: 14px;
}

.error-state {
  text-align: center;
  padding: 16px;
  color: #e74c3c;
}

.load-more {
  text-align: center;
  padding: 12px;
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-desc {
  margin-top: 8px;
}

.report-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
