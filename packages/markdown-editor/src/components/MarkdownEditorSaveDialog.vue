<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NButton, NInput, NModal, NSelect, NSpace, NSwitch } from 'naive-ui';
import { createI18n, type Locale, type MessageSchema } from '../lang';

export type EditorSavePayload = {
  title: string;
  cover_image?: string;
  is_pinned: boolean;
  featured_weight: number;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'private' | 'password';
  allow_comment: boolean;
  tag_ids: number[];
  category_ids: number[];
};

const props = withDefaults(
  defineProps<{
    tagOptions: { label: string; value: number }[];
    categoryOptions: { label: string; value: number }[];
    locale?: Locale;
    messages?: Partial<MessageSchema>;
    to?: string | HTMLElement;
  }>(),
  {
    locale: 'zh-CN',
    messages: () => ({}),
    to: undefined,
  },
);

const { t } = createI18n({ locale: props.locale, messages: props.messages });

const emit = defineEmits<(e: 'confirm', payload: EditorSavePayload) => void>();

const visible = ref(false);
const form = reactive<EditorSavePayload & { category_id: number | null }>({
  title: '',
  cover_image: '',
  is_pinned: false,
  featured_weight: 0,
  status: 'draft',
  visibility: 'public',
  allow_comment: true,
  tag_ids: [],
  category_ids: [],
  category_id: null,
});

function extractTitle(markdown: string) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function open(markdown: string, initial?: Partial<EditorSavePayload>) {
  form.title = extractTitle(markdown) || initial?.title || '';
  form.cover_image = initial?.cover_image ?? '';
  form.tag_ids = initial?.tag_ids ? [...initial.tag_ids] : [];
  form.category_id = initial?.category_ids?.[0] ?? null;
  form.status = initial?.status ?? 'draft';
  form.is_pinned = initial?.is_pinned ?? false;
  form.featured_weight = initial?.featured_weight ?? 0;
  form.visibility = initial?.visibility ?? 'public';
  form.allow_comment = initial?.allow_comment ?? true;

  visible.value = true;
}

function _submit() {
  emit('confirm', {
    ...form,
    cover_image: form.cover_image?.trim() || undefined,
    category_ids: form.category_id != null ? [form.category_id] : [],
  });
  visible.value = false;
}

defineExpose({ open });
</script>

<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    :title="t('saveArticle')"
    :to="props.to"
    style="width:50vw;max-width:720px;min-width:400px"
  >
    <div class="field">
      <label>{{ t('title') }}</label>
      <n-input v-model:value="form.title" :placeholder="t('titlePlaceholder')" />
    </div>
    <div class="field">
      <label>{{ t('coverImage') }}</label>
      <n-input v-model:value="form.cover_image" placeholder="https://example.com/cover.jpg" />
    </div>
    <div class="field">
      <label>{{ t('tags') }}</label>
      <n-select v-model:value="form.tag_ids" multiple :options="props.tagOptions" />
    </div>
    <div class="field">
      <label>{{ t('categories') }}</label>
      <n-select v-model:value="form.category_id" :options="props.categoryOptions" clearable />
    </div>
    <div class="field-grid">
      <div class="field">
        <label>{{ t('status') }}</label>
        <n-select
          v-model:value="form.status"
          :options="[
            { label: t('status.draft'), value: 'draft' },
            { label: t('status.published'), value: 'published' },
            { label: t('status.archived'), value: 'archived' },
          ]"
        />
      </div>
      <div class="field">
        <label>{{ t('visibility') }}</label>
        <n-select
          v-model:value="form.visibility"
          :options="[
            { label: t('visibility.public'), value: 'public' },
            { label: t('visibility.private'), value: 'private' },
            { label: t('visibility.password'), value: 'password' },
          ]"
        />
      </div>
    </div>
    <div class="field switch-field">
      <label>{{ t('allowComment') }}</label>
      <n-switch v-model:value="form.allow_comment" />
    </div>
    <div class="field switch-field">
      <label>{{ t('isPinned') }}</label>
      <n-switch v-model:value="form.is_pinned" />
    </div>
    <div class="field">
      <label>{{ t('featuredWeight') }}</label>
      <n-select
        v-model:value="form.featured_weight"
        :options="[
          { label: t('featuredWeight.0'), value: 0 },
          { label: t('featuredWeight.1'), value: 1 },
          { label: t('featuredWeight.2'), value: 2 },
          { label: t('featuredWeight.3'), value: 3 },
          { label: t('featuredWeight.4'), value: 4 },
          { label: t('featuredWeight.5'), value: 5 },
        ]"
      />
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="visible = false">{{ t('cancel') }}</n-button>
        <n-button type="primary" @click="_submit">{{ t('confirmSave') }}</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

