<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import type { BlogPostCardVO } from '@/types/blog';
import { SearchUnavailableError, searchPosts } from '@/api/search';
import SearchResultCard from '@/components/search/SearchResultCard.vue';
import { NTag, NSpace, NAlert, NEmpty, NPagination } from 'naive-ui';
import { NUMBERS } from '@/constants';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const keyword = ref(String(route.query.q ?? ''));
const page = ref(Number(route.query.page ?? 1) || 1);
const pageSize = NUMBERS.DEFAULT_PAGE_SIZE;
const total = ref(0);
const list = ref<BlogPostCardVO[]>([]);
const loading = ref(false);
const unavailableMessage = ref('');

async function search(targetPage = 1, explicitKeyword = keyword.value) {
  loading.value = true;
  try {
    const response = await searchPosts(explicitKeyword, targetPage, pageSize);
    unavailableMessage.value = '';
    list.value = response.list;
    total.value = response.total;
    page.value = targetPage;
  } catch (error) {
    list.value = [];
    total.value = 0;
    unavailableMessage.value =
      error instanceof SearchUnavailableError ? error.message : t('search.unavailable');
  } finally {
    loading.value = false;
  }
}

function syncRoute(targetPage = 1) {
  router.replace({
    path: '/search',
    query: {
      q: keyword.value.trim() || undefined,
      page: targetPage > 1 ? String(targetPage) : undefined,
    },
  });
}

function changePage(targetPage = 1) {
  syncRoute(targetPage);
  void search(targetPage);
}

watch(
  () => route.query,
  (query) => {
    const nextKeyword = typeof query.q === 'string' ? query.q : '';
    const nextPage = Number(query.page ?? 1) || 1;
    keyword.value = nextKeyword;
    void search(nextPage, nextKeyword);
  },
);

onMounted(() => search(page.value, keyword.value));

function openPost(slug: string) {
  router.push(`/posts/${slug}`);
}

function clearSearch() {
  keyword.value = '';
  syncRoute(1);
}
</script>

<template>
  <div class="search-shell">
    <div class="search-header">
      <p class="search-kicker">{{ t('search.siteSearch') }}</p>
      <div class="search-title-row">
        <div>
          <h1>{{ t('search.title') }}</h1>
          <p class="search-copy">
            {{ t('search.description') }}
          </p>
        </div>
        <n-tag v-if="keyword.trim()" round type="primary" size="large">
          {{ keyword }}
        </n-tag>
      </div>
      <div class="search-meta-row">
        <span v-if="keyword.trim()">
          {{ t('search.resultWithKeyword', { total, keyword }) }}
        </span>
        <span v-else>{{ t('search.waitingForInput') }}</span>
        <button v-if="keyword.trim()" type="button" class="search-clear" @click="clearSearch">
          {{ t('search.clear') }}
        </button>
      </div>
    </div>

    <n-space vertical size="large">
      <n-alert v-if="unavailableMessage" type="warning" :show-icon="false">
        {{ unavailableMessage }}
      </n-alert>

      <SearchResultCard
        v-for="item in list"
        :key="item.id"
        :item="item"
        :keyword="keyword"
        @select="openPost"
      />

      <n-empty
        v-if="!list.length && !loading && !unavailableMessage"
        :description="keyword.trim() ? t('search.empty') : t('search.waitingDescription')"
      />
      <n-pagination
        v-if="total > pageSize"
        v-model:page="page"
        :page-size="pageSize"
        :item-count="total"
        @update:page="changePage"
      />
    </n-space>
  </div>
</template>

<style scoped>
.search-shell {
  max-width: 880px;
  margin: 24px auto;
  display: grid;
  gap: 20px;
}

.search-header {
  display: grid;
  gap: 12px;
  padding: 20px 22px;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--app-primary) 8%, transparent), transparent 55%),
    var(--app-bg-container);
}

.search-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--app-text-tertiary);
}

.search-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.search-title-row h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 36px);
  line-height: 1.1;
}

.search-copy {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
}

.search-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: var(--app-text-secondary);
}

.search-clear {
  border: 0;
  padding: 0;
  color: var(--app-primary);
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.search-clear:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .search-header {
    padding: 18px;
  }

  .search-title-row {
    flex-direction: column;
  }
}
</style>
