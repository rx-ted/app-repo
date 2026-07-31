<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, watch, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePostDetailStore } from '@/stores/postDetail';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer.vue';
import { NSpin, NAlert, NButton } from 'naive-ui';
import SeoHead from '@/components/seo/SeoHead.vue';
import { http } from '@/http';
import { API } from '@/constants/api';
import { stripFrontMatter } from '@/utils/stripFrontMatter';

const route = useRoute();
const router = useRouter();
const detailStore = usePostDetailStore();
const { item, loading, error } = storeToRefs(detailStore);

const slug = computed(() => String(route.params.slug || ''));

const content = computed(() => stripFrontMatter(item.value?.content ?? ''));

const views = ref(0);
const likes = ref(0);
const comments = ref(0);

watch(
  slug,
  async (newSlug) => {
    if (newSlug) {
      await detailStore.fetchBySlug(newSlug);
      if (item.value) {
        views.value = item.value.views ?? 0;
        likes.value = item.value.likes ?? 0;
        comments.value = item.value.comments ?? 0;
        views.value++;
        http.post(`${API.POSTS_STATS}/${item.value.id}/views`).catch(() => {});
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <SeoHead
    v-if="item"
    :title="`${item.title} - rx-ted's Blog`"
    :description="item.title"
    :keywords="item.tags"
    type="article"
    :author="item.author"
    :published-time="item.createdAt"
    :modified-time="item.updatedAt"
    :url="`/post/${slug}`"
  />
  <article class="post-detail">
    <n-spin :show="loading">
      <n-alert v-if="error" type="error" :show-icon="false" class="alert">
        {{ error }}
        <br><br>
        <n-button @click="router.push('/posts')">返回文章列表</n-button>
      </n-alert>

      <template v-else-if="item">
        <div v-if="item.coverImage" class="post-cover">
          <img :src="item.coverImage ?? ''" :alt="item.title">
        </div>

        <div v-if="item.content" class="post-content">
          <MarkdownRenderer :content="content" />
        </div>
        <pre v-else class="content-plain">{{ content }}</pre>

        <div class="post-footer-stats">
          <span class="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ views }}
          </span>
          <span class="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2 2h4"/></svg>
            {{ likes }}
          </span>
          <span class="stat-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            {{ comments }}
          </span>
        </div>

        <div v-if="item.categories?.length || item.tags?.length" class="post-footer-taxonomy">
          <span
            v-for="(cat, i) in item.categories"
            :key="'c-' + cat"
            class="cat-chip"
            @click="router.push(`/categories/${encodeURIComponent(cat)}`)"
          >{{ item.categoryNames?.[i] ?? cat }}</span>
          <span
            v-for="(tag, i) in item.tags"
            :key="'t-' + tag"
            class="tag-chip"
            @click="router.push(`/tags/${encodeURIComponent(tag)}`)"
          >{{ item.tagNames?.[i] ?? tag }}</span>
        </div>
      </template>
    </n-spin>
  </article>
</template>

<style lang="scss" scoped>
.post-detail {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 24px;
}

.alert {
  margin-bottom: 16px;
}

.post-cover {
  margin-bottom: 40px;
  border-radius: 16px;
  overflow: hidden;
}

.post-cover img {
  width: 100%;
  height: auto;
  display: block;
}

.post-footer-stats {
  display: flex;
  gap: 24px;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid var(--app-border);
  justify-content: center;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--app-text-secondary);
}

.stat-item svg {
  opacity: 0.6;
}

.post-footer-taxonomy {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 32px;
  margin-top: 48px;
  border-top: 1px solid var(--app-border);
}

.cat-chip,
.tag-chip {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.cat-chip {
  background: var(--app-warning-bg, rgba(255, 180, 0, 0.1));
  border: 1px solid var(--app-warning-border, rgba(255, 180, 0, 0.3));
  color: var(--app-warning, #e6a817);
}

.cat-chip:hover {
  background: var(--app-warning-bg-hover, rgba(255, 180, 0, 0.18));
}

.tag-chip {
  background: var(--app-bg-muted);
  border: 1px solid var(--app-border);
  color: var(--app-text-secondary);
}

.tag-chip:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
}

.post-content {
  font-size: 17px;
  line-height: 1.85;
  color: var(--app-text);
}

.content-plain {
  white-space: pre-wrap;
  line-height: 1.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 20px;
  border-radius: 12px;
  background: var(--app-bg-muted);
  border: 1px solid var(--app-border);
}

@media (max-width: 768px) {
  .post-detail {
    padding: 0 16px;
  }

  .post-content {
    font-size: 16px;
  }
}
</style>
