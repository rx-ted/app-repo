<script setup lang="ts">
import BlogPersonCardShell from '@/components/users/BlogPersonCardShell.vue';

const props = defineProps<{
  nickname?: string | null;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  totalPosts?: number;
}>();

const _avatarText = (props.nickname || props.username || 'AU').slice(0, 2).toUpperCase();
</script>

<template>
  <BlogPersonCardShell
    kicker="Author"
    :name="props.nickname || props.username"
    :subtitle="`@${props.username}`"
    :bio="props.bio ?? undefined"
    :avatar-url="props.avatarUrl ?? undefined"
    :avatar-text="_avatarText"
  >
    <div class="meta-row">
      <span>文章 {{ props.totalPosts ?? 0 }}</span>
      <span v-if="props.location">{{ props.location }}</span>
      <a v-if="props.website" :href="props.website" target="_blank" rel="noreferrer"> 个人链接 </a>
    </div>
  </BlogPersonCardShell>
</template>

<style scoped>
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--app-text-secondary);
}
</style>
