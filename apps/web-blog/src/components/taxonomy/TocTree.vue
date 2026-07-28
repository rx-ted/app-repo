<script setup lang="ts">
import { MdCatalog } from 'md-editor-v3';
import { headingId } from '@/utils/headingId';

function handleClick(e: MouseEvent, t: { text: string; level: number }) {
  e.preventDefault();
  const id = headingId({ text: t.text });
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
</script>

<template>
  <MdCatalog
    editorId="post-detail"
    :mdHeadingId="headingId"
    scrollElement=".doc-body"
    :scrollElementOffsetTop="0"
    :on-click="handleClick"
  />
</template>

<style scoped>
:deep(.md-editor-catalog) {
  border: none;
  background: transparent;
  padding: 0;
}

:deep(.md-editor-catalog-link span) {
  color: var(--app-text-secondary);
  transition: color 0.15s;
}

:deep(.md-editor-catalog-link span:hover) {
  color: var(--app-text);
}

:deep(.md-editor-catalog-active > span) {
  color: var(--app-primary) !important;
}
</style>
