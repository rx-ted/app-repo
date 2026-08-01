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
  rehypeMermaid,
  rehypeDetailsHeading,
  rehypeCodeData,
  getPrettyCodeOptions,
  type MarkdownPipelineOptions,
  type MarkdownRenderResult,
} from './core/markdown';
export {
  PREVIEW_THEMES,
  REQUIRED_PREVIEW_VARS,
  DEFAULT_PREVIEW_THEME,
  EDITOR_THEMES,
  getPreviewTheme,
  applyPreviewTheme,
  type PreviewThemeConfig,
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
export { default as BlogEditor } from './components/BlogEditor.vue';
export {
  default as BlogEditorSaveDialog,
  type EditorSavePayload,
} from './components/BlogEditorSaveDialog.vue';
export { default as TocTree } from './components/TocTree.vue';
