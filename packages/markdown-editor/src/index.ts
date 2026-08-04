import './styles/theme.css';

export { __version } from './package-api';
export {
  MarkdownIndex,
  HeadingTree,
  type SourceNode,
  type NodeKind,
  type HeadingNode,
} from './core/sourcemap';
export { DomIndex } from './core/domIndex';
export { SyncEngine, SyncReason } from './core/syncEngine';
export { stripFrontMatter } from './core/stripFrontMatter';
export { headingId } from './core/headingId';
export { remarkSourceMap } from './core/remarkSourceMap';
export {
  hastToString,
  remarkCodeLabel,
  rehypeCaptureCodeMeta,
  rehypeLineHighlight,
  rehypeCodeGroup,
  rehypeRestoreCodeBlocks,
  rehypeDiffMark,
  rehypeNotationDiff,
} from './core/rehypeCodeGroup';
export {
  buildMarkdownPipeline,
  renderMarkdown,
  remarkDirectiveHandler,
  remarkFrontMatter,
  remarkHighlight,
  rehypeMermaid,
  rehypeDetailsHeading,
  rehypeCodeData,
  rehypeInteractiveTasks,
  getPrettyCodeOptions,
  type MarkdownPipelineOptions,
  type MarkdownRenderResult,
} from './core/markdown';
export { isTaskChecked, toggleTask } from './core/tasks';
export {
  PREVIEW_THEMES,
  REQUIRED_PREVIEW_VARS,
  DEFAULT_PREVIEW_THEME,
  CODE_THEMES,
  EDITOR_THEMES,
  EDITOR_THEME_VARS,
  getPreviewTheme,
  applyPreviewTheme,
  getEditorTheme,
  applyEditorTheme,
  type PreviewThemeConfig,
  type EditorThemeConfig,
  type EditorTheme,
} from './core/themes';
export {
  createI18n,
  registerLocale,
  type I18nOptions,
  type Locale,
  type MessageSchema,
} from './lang';
export { default as MarkdownRenderer, type ReadyPayload } from './components/MarkdownRenderer.vue';
export { default as MarkdownEditor } from './components/MarkdownEditor.vue';
export {
  default as MarkdownEditorSaveDialog,
  type EditorSavePayload,
} from './components/MarkdownEditorSaveDialog.vue';
export { default as TocTree } from './components/TocTree.vue';
