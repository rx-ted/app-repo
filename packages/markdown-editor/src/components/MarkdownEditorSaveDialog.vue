<script setup lang="ts">
import { reactive, ref } from 'vue';
import { NButton, NInput, NModal, NSpace } from 'naive-ui';
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
const title = ref('');
const current = reactive<Partial<EditorSavePayload>>({});

function extractTitle(markdown: string) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function open(markdown: string, initial?: Partial<EditorSavePayload>) {
  title.value = extractTitle(markdown) || initial?.title || '';
  Object.assign(current, initial);
  // Consumers (e.g. web-blog) pass a singular category_id in initial-meta;
  // map it into the plural payload shape so it survives a save.
  const legacyCategory = (initial as { category_id?: number | null } | undefined)?.category_id;
  if (legacyCategory != null && !current.category_ids?.length) {
    current.category_ids = [legacyCategory];
  }
  visible.value = true;
}

// The dialog only collects a title; the remaining payload is carried through
// from the caller's initial meta so server-side consumers keep a full record.
function _submit() {
  emit('confirm', {
    title: title.value.trim() || current.title?.trim() || '',
    cover_image: current.cover_image?.trim() || undefined,
    is_pinned: current.is_pinned ?? false,
    featured_weight: current.featured_weight ?? 0,
    status: current.status ?? 'draft',
    visibility: current.visibility ?? 'public',
    allow_comment: current.allow_comment ?? true,
    tag_ids: current.tag_ids ? [...current.tag_ids] : [],
    category_ids: current.category_ids ? [...current.category_ids] : [],
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
    style="width:40vw;max-width:480px;min-width:320px"
  >
    <div class="field">
      <label>{{ t('title') }}</label>
      <n-input v-model:value="title" :placeholder="t('titlePlaceholder')" @keyup.enter="_submit" />
    </div>

    <template #footer>
      <n-space justify="end">
        <n-button @click="visible = false">{{ t('cancel') }}</n-button>
        <n-button type="primary" @click="_submit">{{ t('confirmSave') }}</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
