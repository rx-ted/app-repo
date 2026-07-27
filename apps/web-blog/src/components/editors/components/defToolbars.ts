import type { ToolbarNames } from 'md-editor-v3';

export const baseToolBars: ToolbarNames[] = [
  'bold',
  'underline',
  'italic',
  'title',
  'strikeThrough',
  '-',
  'sub',
  'sup',
  'quote',
  'unorderedList',
  'orderedList',
  'task',
  '-',
  'codeRow',
  'code',
  'link',
  'image',
  'table',
  'mermaid',
  'katex',
  '-',
  'revoke',
  'next',
];

export const advancedToolBars: ToolbarNames[] = [
  'save',
  'pageFullscreen',
  'fullscreen',
  'preview',
  'previewOnly',
  'htmlPreview',
  'catalog',
  'github',
];

export type ToolbarCustomItem = number;

export function buildToolBars(customItems: ToolbarCustomItem[] = []): ToolbarNames[] {
  if (customItems.length > 0) {
    return [...baseToolBars, ...customItems, '=', ...advancedToolBars];
  }
  return [...baseToolBars, '=', ...advancedToolBars];
}
