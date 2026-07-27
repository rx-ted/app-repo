<script setup lang="ts">
import { ref, watch, onBeforeUnmount, reactive } from 'vue';
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { EditorSavePayload } from './BlogEditorSaveDialog.vue';
import { NButton, NSpace } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import HelpSheet from '@/components/editors/help/HelpSheet.vue';
import BlogEditorSaveDialog from './BlogEditorSaveDialog.vue';
import { useTheme } from '../../theme/useTheme';
import { Emoji, Mark } from '@vavt/v3-extension';
import { buildToolBars } from './components/defToolbars';

const props = defineProps<{
  modelValue: string;
  loading?: boolean;
  isEdit?: boolean;
  tagOptions: { label: string; value: number }[];
  categoryOptions: { label: string; value: number }[];
  initialMeta?: Partial<EditorSavePayload>;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save', payload: EditorSavePayload): void;
  (e: 'cancel'): void;
}>();

const showHelp = ref(false);
const route = useRoute();

const DRAFT_STORAGE_KEY = 'editor:draft';

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const { themeMode } = useTheme();

watch(
  () => props.modelValue,
  () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, props.modelValue);
    }, 2000);
  },
);

function saveBeforeUnload() {
  localStorage.setItem(DRAFT_STORAGE_KEY, props.modelValue);
}
onBeforeUnmount(() => {
  saveBeforeUnload();
  if (saveTimer) clearTimeout(saveTimer);
});

onMounted(() => {
  const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (saved && saved !== props.modelValue && !props.isEdit) {
    if (route.query.restoreDraft === '1') {
      emit('update:modelValue', saved);
    } else if (window.confirm('检测到未保存的草稿，是否恢复？')) {
      emit('update:modelValue', saved);
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }
});

// Clear draft on successful save
watch(
  () => props.loading,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  },
);

const dialogRef = ref<InstanceType<typeof BlogEditorSaveDialog>>();

function requestSave() {
  dialogRef.value?.open(props.modelValue, {
    ...props.initialMeta,
  });
}

const customToolbarItems = [0, 1];

const state = reactive({
  toolbar: buildToolBars(customToolbarItems),
});
</script>

<template>
  <div class="editor-grid">
    <section class="editor-main">
      <div class="editor-topbar">
        <div>
          <h1>写作页面</h1>
        </div>
        <NSpace>
          <NButton @click="showHelp = true">
            <template #icon>
              <Icon icon="mdi:help-circle-outline" width="16" />
            </template>
          </NButton>
          <NButton type="primary" :loading="props.loading" @click="requestSave"> 保存 </NButton>
        </NSpace>
      </div>

      <div class="editor-body">
        <MdEditor
          editorId="blog-editor"
          :model-value="props.modelValue"
          language="zh-CN"
          previewTheme="github"
          codeTheme="github"
          :noKatex="false"
          :noMermaid="false"
          :toolbarExclude="['htmlPreview', 'catalog']"
          @onSave="requestSave"
          @onChange="(v) => emit('update:modelValue', v)"
          :style="{ height: '100%' }"
          :theme="themeMode"
          :toolbars="state.toolbar"
        >
          <template #defToolbars>
            <Mark />
            <Emoji />
          </template>
        </MdEditor>
      </div>
    </section>

    <BlogEditorSaveDialog
      ref="dialogRef"
      :tag-options="props.tagOptions"
      :category-options="props.categoryOptions"
      @confirm="emit('save', $event)"
    />

    <HelpSheet :visible="showHelp" @close="showHelp = false" />
  </div>
</template>

<style scoped lang="scss">
.editor-grid {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.editor-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 12px;
}

.editor-topbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  flex-shrink: 0;
}

.editor-body {
  flex: 1;
  min-height: 0;
}

.editor-topbar h1 {
  margin: 6px 0 0;
}

@media (max-width: 1080px) {
  .editor-topbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
