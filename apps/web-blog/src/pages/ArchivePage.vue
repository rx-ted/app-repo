<template>
  <div class="archive-page">
    <div class="page-header">
      <h1 class="page-title">归档</h1>
      <p v-if="total > 0" class="page-subtitle">共 {{ total }} 篇文章</p>
    </div>

    <ArchiveTimeline :grouped="grouped" :loading="loading" @select="goToPost" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useArchive } from '@/composables/useArchive';
import ArchiveTimeline from '@/components/blog/ArchiveTimeline.vue';

const router = useRouter();
const { loading, total, grouped, fetchAll } = useArchive();

function goToPost(slug: string) {
  router.push(`/posts/${slug}`);
}

onMounted(fetchAll);
</script>

<style scoped>
.archive-page {
  padding: 32px 0;
}
.page-header {
  margin-bottom: 32px;
}
.page-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0;
}
.page-subtitle {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 6px 0 0;
}
</style>
