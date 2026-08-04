<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue';
import { NButton, NSpace, NIcon, NDropdown, NPopover, NModal, NInput } from 'naive-ui';
import { Icon } from '@iconify/vue';
import MarkdownRenderer from './MarkdownRenderer.vue';
import BlogEditorSaveDialog, { type EditorSavePayload } from './BlogEditorSaveDialog.vue';
import { getPreviewTheme, PREVIEW_THEMES } from '../core/themes';
import { createI18n } from '../lang';
import type { Locale } from '../lang';
import type { BlogEditorProps } from './blog-editor/props';
import { EMOJIS, TABLE_MAX_COLS, TABLE_MAX_ROWS, THEME_SAMPLE } from './blog-editor/constants';
import { useEditor } from './blog-editor/useEditor';
import { useSyncToc } from './blog-editor/useSyncToc';
import { useFullscreen } from './blog-editor/useFullscreen';
import { useTheme } from './blog-editor/useTheme';
import { useStatus } from './blog-editor/useStatus';
import { useToolbarOptions } from './blog-editor/useToolbarOptions';
import { useEmoji } from './blog-editor/useEmoji';
import { useMermaid } from './blog-editor/useMermaid';
import { useTablePicker } from './blog-editor/useTablePicker';
import { useImagePicker } from './blog-editor/useImagePicker';
import { useFrontMatter } from './blog-editor/useFrontMatter';
import { useSave } from './blog-editor/useSave';

const props = withDefaults(defineProps<BlogEditorProps>(), {
  helpHref: undefined,
  draftStorageKey: 'editor:draft',
  autoRestore: false,
  editorTheme: 'light',
  previewTheme: 'github-light',
  codeTheme: undefined,
  locale: 'zh-CN',
  messages: () => ({}),
  createdAt: null,
  updatedAt: null,
  uploadImage: undefined,
  saveMode: 'file',
  onBeforeSave: undefined,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'save', payload: EditorSavePayload): void;
  (e: 'saveFile', content: string): void;
  (e: 'cancel'): void;
  (e: 'update:locale', value: Locale): void;
  (e: 'update:editorTheme', value: 'light' | 'dark'): void;
  (e: 'update:previewTheme', value: string): void;
  (e: 'update:codeTheme', value: string | undefined): void;
}>();

const editorGridRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const previewScrollRef = ref<HTMLElement | null>(null);

const localeRef = ref<Locale>(props.locale ?? 'zh-CN');
watch(
  () => props.locale,
  (v) => {
    localeRef.value = v;
  },
);

const t = computed(() => createI18n({ locale: localeRef.value, messages: props.messages }).t);

const editor = useEditor({
  textareaRef,
  modelValue: toRef(props, 'modelValue'),
  emitUpdate: (v) => emit('update:modelValue', v),
});

const syncToc = useSyncToc({
  textareaRef,
  previewScrollRef,
  currentValue: editor.currentValue,
  isTyping: () => editor.isTyping.value,
  isEditorNearEnd: editor.isEditorNearEnd,
});

const fullscreen = useFullscreen({
  editorGridRef,
  onPreviewLayoutChange: () => nextTick(syncToc.attachScrollListeners),
});

const theme = useTheme({
  editorGridRef,
  props,
  onUpdateEditorTheme: (v) => emit('update:editorTheme', v),
  onUpdatePreviewTheme: (v) => emit('update:previewTheme', v),
  onUpdateCodeTheme: (v) => emit('update:codeTheme', v),
});

const status = useStatus({ textareaRef, currentValue: editor.currentValue });

const toolbarOptions = useToolbarOptions({
  t,
  insertBlock: editor.insertBlock,
  localeRef,
  onUpdateLocale: (v) => emit('update:locale', v),
});

const emoji = useEmoji({ insertBeforeAfter: editor.insertBeforeAfter });

const mermaid = useMermaid({ t, insertAtCursor: editor.insertAtCursor });

const tablePicker = useTablePicker({ insertTable: editor.insertTable });

const imagePicker = useImagePicker({
  t,
  hasUploadImage: () => Boolean(props.uploadImage),
  uploadImage: props.uploadImage,
  insertInline: editor.insertInline,
  insertBeforeAfter: editor.insertBeforeAfter,
});

const frontMatter = useFrontMatter({
  currentValue: editor.currentValue,
  emitValue: editor.emitValue,
});

const dialogRef = ref<InstanceType<typeof BlogEditorSaveDialog>>();

const save = useSave({
  props,
  currentValue: editor.currentValue,
  emitValue: editor.emitValue,
  dirty: editor.dirty,
  t,
  dialogRef,
  emitSave: (p) => emit('save', p),
  emitSaveFile: (c) => emit('saveFile', c),
});

function openHelp() {
  if (props.helpHref) {
    window.open(props.helpHref, '_blank');
  }
}

/* ── Template bindings (flattened from composables) ── */

const {
  currentValue,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onInput,
  insertInline,
  insertBlock,
  insertHeading,
  emitValue,
  dirty,
  lastModifiedAt,
} = editor;

const {
  onReady,
  onEditorScroll,
  onEditorClick,
  onPreviewScroll,
  onTocClick,
  tocItems,
  activeTocId,
} = syncToc;

const {
  showPreview,
  previewOnly,
  windowFullscreen,
  screenFullscreen,
  showToc,
  overlayTarget,
  toggleWindowFullscreen,
  toggleScreenFullscreen,
  togglePreviewOnly,
  toggleShowPreview,
  toggleToc,
} = fullscreen;

const {
  editorThemeRef,
  previewThemeRef,
  codeThemeRef,
  themeModalOpen,
  themeDraft,
  codeThemeSearch,
  editorThemeVarsStyle,
  filteredCodeThemes,
  openThemeModal,
  applyThemeDraft,
} = theme;

const { cursor, stats, onTextareaCursor, formatTime } = status;

const { headingOptions, onHeadingSelect, languageOptions, onLocaleSelect } = toolbarOptions;

const { emojiOpen, onEmojiSelect } = emoji;

const { mermaidOptions, onMermaidSelect } = mermaid;

const { tablePickerOpen, hoverRows, hoverCols, onTableCellHover, onTableCellClick } = tablePicker;

const { imageFileRef, imageOptions, onImageSelect, onImageFileChange } = imagePicker;

const { frontMatterOpen, frontMatterRaw, openFrontMatter, applyFrontMatter, removeFrontMatter } =
  frontMatter;

const { requestSave, onKeydown } = save;

defineExpose({
  openSave: requestSave,
  requestSave,
  getContent: () => currentValue.value,
  setContent: (v: string) => emitValue(v),
  isDirty: () => dirty.value,
});
</script>

<template>
  <div
    ref="editorGridRef"
    class="editor-grid"
    :class="{ 'is-window-fullscreen': windowFullscreen }"
    :data-me-editor-theme="editorThemeRef"
  >
    <section class="editor-main">
      <div class="editor-topbar">
        <div>
          <h1>{{ t('editor.title') }}</h1>
        </div>
        <NSpace>
          <NButton v-if="props.helpHref" @click="openHelp">
            <template #icon>
              <Icon icon="mdi:help-circle-outline" width="16" />
            </template>
            {{ t('editor.help') }}
          </NButton>
          <slot name="save" :content="currentValue" :request-save="requestSave">
            <NButton type="primary" :loading="props.loading" @click="requestSave"> {{ t('editor.save') }} </NButton>
          </slot>
        </NSpace>
      </div>

      <div class="editor-body" :class="{ 'with-preview': showPreview, 'preview-only': previewOnly }">
        <div class="toolbar">
          <button class="tb-btn" :title="t('editor.toolbar.undo')" :disabled="!canUndo" @click="onUndo"><Icon icon="mdi:undo" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.redo')" :disabled="!canRedo" @click="onRedo"><Icon icon="mdi:redo" width="16" /></button>

          <span class="tb-sep"></span>
          <button class="tb-btn" :title="t('editor.toolbar.bold')" @click="insertInline('bold')"><Icon icon="mdi:format-bold" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.italic')" @click="insertInline('italic')"><Icon icon="mdi:format-italic" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.strikethrough')" @click="insertInline('strikethrough')"><Icon icon="mdi:format-strikethrough" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.underline')" @click="insertInline('underline')"><Icon icon="mdi:format-underline" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.inlineCode')" @click="insertInline('code')"><Icon icon="mdi:code-tags" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.highlight')" @click="insertInline('highlight')"><Icon icon="mdi:marker" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.superscript')" @click="insertInline('superscript')"><Icon icon="mdi:format-superscript" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.subscript')" @click="insertInline('subscript')"><Icon icon="mdi:format-subscript" width="16" /></button>

          <span class="tb-sep"></span>
          <n-dropdown trigger="hover" :options="headingOptions" :to="overlayTarget" @select="onHeadingSelect">
            <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.heading')">
              H <Icon icon="mdi:chevron-down" width="12" />
            </button>
          </n-dropdown>
          <button class="tb-btn" :title="t('editor.toolbar.unorderedList')" @click="insertBlock('ul')"><Icon icon="mdi:format-list-bulleted" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.orderedList')" @click="insertBlock('ol')"><Icon icon="mdi:format-list-numbered" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.taskList')" @click="insertBlock('task')"><Icon icon="mdi:check-box-outline" width="16" /></button>

          <span class="tb-sep"></span>
          <button class="tb-btn" :title="t('editor.toolbar.blockquote')" @click="insertBlock('blockquote')"><Icon icon="mdi:format-quote-close" width="16" /></button>
          <button class="tb-btn" :title="t('editor.toolbar.codeBlock')" @click="insertBlock('codeblock')"><Icon icon="mdi:code-braces" width="16" /></button>
          <n-dropdown trigger="hover" :options="mermaidOptions" :to="overlayTarget" @select="onMermaidSelect">
            <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.mermaid')">
              <Icon icon="mdi:sitemap-outline" width="16" />
              <Icon icon="mdi:chevron-down" width="12" />
            </button>
          </n-dropdown>
          <n-popover trigger="hover" v-model:show="tablePickerOpen" :to="overlayTarget">
            <template #trigger>
              <button class="tb-btn" :title="t('editor.toolbar.table')" :class="{ active: tablePickerOpen }"><Icon icon="mdi:table" width="16" /></button>
            </template>
            <div class="table-picker" @mouseleave="hoverRows = 2; hoverCols = 2">
              <div class="table-picker-grid">
                <button
                  v-for="i in TABLE_MAX_ROWS * TABLE_MAX_COLS"
                  :key="i"
                  class="table-picker-cell"
                  :class="{
                    active: (i - 1) % TABLE_MAX_COLS < hoverCols && Math.floor((i - 1) / TABLE_MAX_COLS) < hoverRows,
                  }"
                  @mouseenter="onTableCellHover(i)"
                  @click="onTableCellClick(i)"
                ></button>
              </div>
              <div class="table-picker-label">
                {{ hoverRows }} × {{ hoverCols }} · {{ t('editor.table.insert') }}
              </div>
            </div>
          </n-popover>
          <button class="tb-btn" :title="t('editor.toolbar.hr')" @click="insertBlock('hr')"><Icon icon="mdi:minus" width="16" /></button>

          <span class="tb-sep"></span>
          <button class="tb-btn" :title="t('editor.toolbar.link')" @click="insertInline('link')"><Icon icon="mdi:link-variant" width="16" /></button>
          <n-dropdown trigger="hover" :options="imageOptions" :to="overlayTarget" @select="onImageSelect">
            <button class="tb-btn" :title="t('editor.toolbar.image')"><Icon icon="mdi:image-outline" width="16" /></button>
          </n-dropdown>
          <n-popover trigger="hover" v-model:show="emojiOpen" :to="overlayTarget">
            <template #trigger>
              <button class="tb-btn" :title="t('editor.toolbar.emoji')" :class="{ active: emojiOpen }"><Icon icon="mdi:emoticon-outline" width="16" /></button>
            </template>
            <div class="emoji-grid">
              <button
                v-for="e in EMOJIS"
                :key="e.shortcode"
                class="emoji-cell"
                :title="`:${e.shortcode}:`"
                @click="onEmojiSelect(e.shortcode)"
              >
                {{ e.glyph }}
              </button>
            </div>
          </n-popover>
          <button class="tb-btn" :title="t('editor.toolbar.frontMatter')" @click="openFrontMatter"><Icon icon="mdi:file-code-outline" width="16" /></button>

          <span class="tb-sep"></span>
          <button class="tb-btn" :title="t('editor.toolbar.toc')" :class="{ active: showToc }" @click="toggleToc"><Icon icon="mdi:toc" width="16" /></button>
          <button
            class="tb-btn"
            :title="t('editor.toolbar.windowFullscreen')"
            :class="{ active: windowFullscreen }"
            @click="toggleWindowFullscreen"
          >
            <Icon :icon="windowFullscreen ? 'mdi:window-restore' : 'mdi:window-maximize'" width="16" />
          </button>
          <button
            class="tb-btn"
            :title="t('editor.toolbar.screenFullscreen')"
            :class="{ active: screenFullscreen }"
            @click="toggleScreenFullscreen"
          >
            <Icon :icon="screenFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'" width="16" />
          </button>

          <span class="tb-sep"></span>
          <button
            class="tb-btn tb-btn-wide"
            :title="previewOnly ? t('editor.toolbar.previewOnly') : t(showPreview ? 'editor.hidePreview' : 'editor.showPreview')"
            :disabled="previewOnly"
            @click="toggleShowPreview"
          >
            <Icon :icon="showPreview ? 'icon-park-outline:preview-open' : 'icon-park-outline:preview-close-one'" width="16" />
          </button>
          <button
            class="tb-btn tb-btn-wide preview-only-btn"
            :title="previewOnly ? t('editor.toolbar.exitPreviewOnly') : t('editor.toolbar.previewOnly')"
            :class="{ 'preview-only-active': previewOnly }"
            @click="togglePreviewOnly"
          >
            <Icon :icon="previewOnly ? 'mdi:card-text' : 'mdi:card-text-outline'" width="16" />
          </button>

          <span class="tb-sep"></span>
          <button class="tb-btn" :title="t('editor.save')" @click="requestSave"><Icon icon="mdi:content-save-outline" width="16" /></button>
          <button class="tb-btn tb-btn-drop tb-btn-wide" :title="getPreviewTheme(previewThemeRef).label" :class="{ active: themeModalOpen }" @click="openThemeModal">
            <Icon icon="mdi:brush" width="16" />
            {{ getPreviewTheme(previewThemeRef).label }}
          </button>
          <n-dropdown trigger="hover" :options="languageOptions" :to="overlayTarget" @select="onLocaleSelect">
            <button class="tb-btn tb-btn-drop" :title="t('editor.toolbar.language')">
              <Icon icon="mdi:language" width="16" />
              {{ localeRef === 'zh-CN' ? '中' : 'EN' }}
            </button>
          </n-dropdown>
          <button v-if="props.helpHref" class="tb-btn tb-btn-wide" :title="t('editor.help')" @click="openHelp">
            <Icon icon="mdi:help-circle-outline" width="16" />
            {{ t('editor.help') }}
          </button>
        </div>

        <div v-show="!previewOnly" class="editor-pane">
          <div class="editor-pane-body">
            <textarea
              ref="textareaRef"
              class="editor-textarea"
              @input="onInput(($event.target as HTMLTextAreaElement).value)"
              @keydown="onKeydown"
              @click="onEditorClick(); onTextareaCursor()"
              @keyup="onTextareaCursor()"
              @select="onTextareaCursor()"
              :placeholder="t('editor.placeholder')"
              spellcheck="true"
              wrap="off"
            />

            <div class="editor-statusbar">
              <span class="status-save-state" :class="{ dirty }">{{ dirty ? t('editor.statusbar.unsaved') : t('editor.statusbar.saved') }}</span>
              <span class="status-spacer"></span>
              <span v-if="props.createdAt" class="status-item">{{ t('editor.statusbar.createdAt') }} {{ formatTime(props.createdAt) }}</span>
              <span v-if="props.updatedAt" class="status-item">{{ t('editor.statusbar.updatedAt') }} {{ formatTime(props.updatedAt) }}</span>
              <span v-if="lastModifiedAt" class="status-item">{{ t('editor.statusbar.lastModifiedAt') }} {{ formatTime(lastModifiedAt) }}</span>
              <span class="status-item">{{ stats.chars }} {{ t('editor.statusbar.chars') }}</span>
              <span class="status-item">{{ stats.words }} {{ t('editor.statusbar.words') }}</span>
              <span class="status-item">{{ stats.lines }} {{ t('editor.statusbar.lines') }}</span>
              <span class="status-item">Ln {{ cursor.row }}, Col {{ cursor.col }}</span>
            </div>
          </div>
        </div>

        <div v-if="showPreview" class="preview-pane">
          <div class="preview-header">{{ t('editor.preview') }}</div>
          <div ref="previewScrollRef" class="preview-scroll">
            <MarkdownRenderer
              :content="currentValue"
              :theme="previewThemeRef"
              :code-theme="codeThemeRef"
              :interactive-tasks="true"
              :heading-insert="true"
              @ready="onReady"
              @insert-heading="insertHeading"
              @update:content="emitValue"
            />
          </div>
          <div v-if="showToc" class="toc-float">
            <div class="toc-float-header">{{ t('editor.toolbar.toc') }}</div>
            <nav v-if="tocItems.length" class="toc-nav">
              <button
                v-for="item in tocItems"
                :key="item.id"
                class="toc-item"
                :class="[{ active: activeTocId === item.id }, `toc-level-${item.depth}`]"
                :title="item.text"
                @click="onTocClick(item)"
              >
                {{ item.text }}
              </button>
            </nav>
            <div v-else class="toc-empty">{{ t('editor.toolbar.toc') }}…</div>
          </div>
        </div>
      </div>
    </section>

    <input ref="imageFileRef" type="file" accept="image/*" class="image-file-input" @change="onImageFileChange" />

    <BlogEditorSaveDialog
      :key="localeRef"
      ref="dialogRef"
      :tag-options="props.tagOptions"
      :category-options="props.categoryOptions"
      :locale="localeRef"
      :messages="props.messages"
      :to="overlayTarget"
      @confirm="emit('save', $event)"
    />

    <n-modal
      v-model:show="frontMatterOpen"
      preset="card"
      :title="t('editor.frontMatter.title')"
      :to="overlayTarget"
      style="width:50vw;max-width:640px;min-width:400px"
    >
      <div class="fm-hint">{{ t('editor.frontMatter.content') }}</div>
      <n-input v-model:value="frontMatterRaw" type="textarea" :rows="12" spellcheck="false" class="fm-textarea" />
      <template #footer>
        <n-space justify="end">
          <n-button @click="frontMatterOpen = false">{{ t('cancel') }}</n-button>
          <n-button @click="removeFrontMatter">{{ t('editor.frontMatter.remove') }}</n-button>
          <n-button type="primary" @click="applyFrontMatter">{{ t('editor.frontMatter.insert') }}</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="themeModalOpen"
      preset="card"
      :title="t('editor.toolbar.theme')"
      :to="overlayTarget"
      style="width:80vw;max-width:980px;min-width:680px"
    >
      <div class="theme-modal" :style="editorThemeVarsStyle">
        <div class="theme-side">
          <div class="theme-section">
            <label class="theme-label">{{ t('editor.toolbar.editorTheme') }}</label>
            <div class="theme-segment">
              <button
                class="theme-seg"
                :class="{ active: themeDraft.editor === 'light' }"
                @click="themeDraft.editor = 'light'"
              >
                {{ t('editor.theme.light') }}
              </button>
              <button
                class="theme-seg"
                :class="{ active: themeDraft.editor === 'dark' }"
                @click="themeDraft.editor = 'dark'"
              >
                {{ t('editor.theme.dark') }}
              </button>
            </div>
          </div>

          <div class="theme-section">
            <label class="theme-label">{{ t('editor.toolbar.previewTheme') }}</label>
            <div class="theme-list">
              <button
                v-for="p in PREVIEW_THEMES"
                :key="p.id"
                class="theme-opt"
                :class="{ active: themeDraft.preview === p.id }"
                @click="themeDraft.preview = p.id"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <div class="theme-section grow">
            <label class="theme-label">{{ t('editor.toolbar.codeTheme') }}</label>
            <button
              class="theme-opt theme-opt-auto"
              :class="{ active: themeDraft.code == null }"
              @click="themeDraft.code = undefined"
            >
              {{ t('editor.theme.auto') }}
            </button>
            <n-input v-model:value="codeThemeSearch" size="small" :placeholder="t('editor.theme.search')" clearable class="theme-search" />
            <div class="theme-list theme-list-code">
              <button
                v-for="id in filteredCodeThemes"
                :key="id"
                class="theme-opt"
                :class="{ active: themeDraft.code === id }"
                @click="themeDraft.code = id"
              >
                {{ id }}
              </button>
            </div>
          </div>
        </div>

        <div class="theme-preview">
          <div class="theme-preview-head">
            <span>{{ getPreviewTheme(themeDraft.preview).label }}</span>
            <span class="theme-preview-code">{{ themeDraft.code ?? t('editor.theme.auto') }}</span>
          </div>
          <div class="theme-preview-body">
            <MarkdownRenderer :content="THEME_SAMPLE" :theme="themeDraft.preview" :code-theme="themeDraft.code" />
          </div>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="themeModalOpen = false">{{ t('cancel') }}</n-button>
          <n-button type="primary" @click="applyThemeDraft">{{ t('editor.theme.apply') }}</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<style scoped src="./blog-editor/editor.css" />
