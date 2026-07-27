<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { CommentThreadVO } from '@/types/commentThread';

const props = defineProps<{
  thread: CommentThreadVO;
  term: string;
  theme?: string;
}>();

const rootRef = ref<HTMLElement | null>(null);

function renderGiscus() {
  if (!rootRef.value || !props.thread.giscus) return;
  if (props.thread.giscus.missing_fields.length) {
    console.warn('[giscus] Missing config:', props.thread.giscus.missing_fields);
    return;
  }
  rootRef.value.innerHTML = '';

  const script = document.createElement('script');
  script.src = 'https://giscus.app/client.js';
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.setAttribute(
    'data-repo',
    `${props.thread.giscus.repo_owner}/${props.thread.giscus.repo_name}`,
  );
  script.setAttribute('data-repo-id', props.thread.giscus.repo_id);
  script.setAttribute('data-category', props.thread.giscus.category);
  script.setAttribute('data-category-id', props.thread.giscus.category_id);
  script.setAttribute('data-mapping', props.thread.giscus.mapping);
  script.setAttribute('data-term', props.term);
  script.setAttribute('data-strict', props.thread.giscus.strict);
  script.setAttribute('data-reactions-enabled', props.thread.giscus.reactions_enabled);
  script.setAttribute('data-emit-metadata', props.thread.giscus.emit_metadata);
  script.setAttribute('data-input-position', props.thread.giscus.input_position);
  script.setAttribute('data-theme', props.theme || props.thread.giscus.theme);
  script.setAttribute('data-lang', props.thread.giscus.lang);
  script.setAttribute('data-loading', 'lazy');
  rootRef.value.appendChild(script);
}

onMounted(renderGiscus);

watch(
  () => [
    props.term,
    props.theme,
    props.thread.updated_at,
    props.thread.giscus?.missing_fields.join(','),
  ],
  () => {
    renderGiscus();
  },
);
</script>

<template>
  <div ref="rootRef" class="giscus-thread" />
</template>

<style scoped>
.giscus-thread {
  min-height: 120px;
}
</style>
