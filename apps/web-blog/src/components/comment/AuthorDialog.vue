<template>
  <n-modal
    :show="show"
    preset="card"
    :style="{ maxWidth: '400px', width: '90%' }"
    :title="author?.username ?? '加载中...'"
    :bordered="false"
    :segmented="false"
    @close="emit('close')"
    @update:show="(v: boolean) => !v && emit('close')"
  >
    <template v-if="author">
      <div class="author-card">
        <div class="author-avatar">
          <n-avatar :src="author.avatar ?? undefined" :size="72" :fallback-src="defaultAvatar" />
          <div class="author-level" v-if="author.level > 0">Lv.{{ author.level }}</div>
        </div>
        <div class="author-name">{{ author.displayName || author.username }}</div>
        <div class="author-username">@{{ author.username }}</div>
        <div v-if="author.bio" class="author-bio">{{ author.bio }}</div>
        <div v-if="author.location || author.website" class="author-meta">
          <span v-if="author.location">📍 {{ author.location }}</span>
          <a v-if="author.website" :href="author.website" target="_blank" rel="noopener noreferrer">
            🔗 {{ author.website }}
          </a>
        </div>
        <div class="author-stats">
          <div class="stat-item">
            <strong>{{ author.followerCount }}</strong>
            <span>粉丝</span>
          </div>
          <div class="stat-item">
            <strong>{{ author.followingCount }}</strong>
            <span>关注</span>
          </div>
          <div class="stat-item">
            <strong>{{ author.likeReceivedCount }}</strong>
            <span>获赞</span>
          </div>
        </div>
        <n-button v-if="!author.isFollowed" type="primary" size="small" @click="handleFollow">
          + 关注
        </n-button>
        <n-button v-else size="small" @click="handleUnfollow"> 已关注 </n-button>
      </div>
    </template>
    <template v-else>
      <n-spin />
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { NModal, NAvatar, NButton, NSpin, useMessage } from 'naive-ui';
import type { AuthorBriefVO } from '@/types/community';
import { useCommentStore } from '@/stores/comment';

const props = defineProps<{
  show: boolean;
  userId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const message = useMessage();
const commentStore = useCommentStore();
const author = ref<AuthorBriefVO | null>(null);
const defaultAvatar = 'data:image/svg+xml;base64,...';

watch(
  () => props.userId,
  async (id) => {
    if (id) {
      author.value = await commentStore.fetchAuthorBrief(id);
    } else {
      author.value = null;
    }
  },
  { immediate: true },
);

function handleFollow() {
  message.info('关注功能开发中');
}

function handleUnfollow() {
  message.info('关注功能开发中');
}
</script>

<style scoped>
.author-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.author-avatar {
  position: relative;
}

.author-level {
  position: absolute;
  bottom: -4px;
  right: -8px;
  background: var(--app-primary);
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

.author-name {
  font-size: 18px;
  font-weight: 600;
}

.author-username {
  font-size: 13px;
  color: var(--n-text-color-3);
}

.author-bio {
  font-size: 13px;
  color: var(--n-text-color-2);
  text-align: center;
  max-width: 300px;
}

.author-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.author-meta a {
  color: var(--app-primary);
  text-decoration: none;
}

.author-stats {
  display: flex;
  gap: 24px;
  margin: 8px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-item strong {
  font-size: 16px;
}

.stat-item span {
  font-size: 12px;
  color: var(--n-text-color-3);
}
</style>
