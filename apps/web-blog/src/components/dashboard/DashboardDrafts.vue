<script setup lang="ts">
import { NCard, NButton, NEmpty } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { formatDateTime } from '@/utils/formatDate';

export type DraftItem = {
  id: number;
  title: string;
  slug: string;
  updated_at: string;
};

defineProps<{
  drafts: DraftItem[];
}>();

const { t, locale } = useI18n();
const router = useRouter();
</script>

<template>
  <n-card :title="t('dashboard.quickDrafts')" size="small" class="drafts-card">
    <template #header-extra>
      <n-button text size="small" @click="router.push('/editor')"
        >{{ t('dashboard.newDraft') }}</n-button
      >
    </template>
    <template v-if="drafts.length">
      <div v-for="draft in drafts" :key="draft.id" class="draft-item">
        <div class="draft-info">
          <div class="draft-title">{{ draft.title }}</div>
          <div class="draft-meta">
            {{ t('dashboard.lastEdited') }} {{ formatDateTime(draft.updated_at, locale) }}
          </div>
        </div>
        <n-button size="tiny" @click="router.push(`/editor/${draft.slug}`)"
          >{{ t('dashboard.continueEditing') }}</n-button
        >
      </div>
    </template>
    <n-empty v-else :description="t('dashboard.noDrafts')" />
  </n-card>
</template>

<style scoped>
.drafts-card {
  border-radius: 12px;
}
.draft-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--app-border);
}
.draft-item:last-child {
  border-bottom: none;
}
.draft-info {
  flex: 1;
  min-width: 0;
}
.draft-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.draft-meta {
  font-size: 12px;
  color: var(--app-text-tertiary);
  margin-top: 2px;
}
</style>
