<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { usePostDetailStore } from '@/stores/postDetail';
import { storeToRefs } from 'pinia';
import { headingId } from '@/utils/headingId';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const store = usePostDetailStore();
const { item } = storeToRefs(store);

const headings = ref<TocItem[]>([]);
const activeId = ref('');
let observer: IntersectionObserver | null = null;

function extractHeadings(markdown: string): TocItem[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const items: TocItem[] = [];
  visit(tree, 'heading', (node: any) => {
    const text = node.children
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.value)
      .join('');
    const id = headingId({ text });
    items.push({ id, text, level: node.depth });
  });
  return items;
}

function handleClick(e: MouseEvent, h: TocItem) {
  e.preventDefault();
  const el = document.getElementById(h.id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setupObserver() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id;
        }
      }
    },
    { root: document.querySelector('.doc-body'), rootMargin: '0px 0px -80% 0px', threshold: 0 },
  );
  for (const h of headings.value) {
    const el = document.getElementById(h.id);
    if (el) observer!.observe(el);
  }
}

watch(
  () => item.value?.content,
  (md) => {
    if (md) {
      headings.value = extractHeadings(md);
      requestAnimationFrame(setupObserver);
    } else {
      headings.value = [];
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (item.value?.content) {
    headings.value = extractHeadings(item.value.content);
    requestAnimationFrame(setupObserver);
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<template>
  <nav v-if="headings.length" class="toc-tree">
    <ul>
      <li
        v-for="h in headings"
        :key="h.id"
        :class="['toc-item', `toc-level-${h.level}`, { active: activeId === h.id }]"
      >
        <a :href="`#${h.id}`" @click="handleClick($event, h)">{{ h.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.toc-tree {
  font-size: 13px;
  line-height: 1.6;
}

.toc-tree ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item a {
  display: block;
  padding: 3px 0 3px 12px;
  color: var(--app-text-secondary);
  text-decoration: none;
  transition: color 0.15s;
  border-left: 2px solid transparent;
}

.toc-item a:hover {
  color: var(--app-text);
}

.toc-item.active a {
  color: var(--app-primary);
  border-left-color: var(--app-primary);
}

.toc-level-2 a { padding-left: 12px; }
.toc-level-3 a { padding-left: 24px; }
.toc-level-4 a { padding-left: 36px; }
.toc-level-5 a { padding-left: 48px; }
.toc-level-6 a { padding-left: 60px; }
</style>
