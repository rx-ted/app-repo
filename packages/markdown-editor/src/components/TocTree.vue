<script setup lang="ts">
import {
  ref,
  watch,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  h,
  defineComponent,
} from 'vue';
import type { PropType, Component, VNode } from 'vue';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { headingId } from '../core/headingId';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocNode extends TocItem {
  children: TocNode[];
}

const props = withDefaults(
  defineProps<{
    content: string;
    scrollRoot?: string;
    scrollOffset?: number;
    maxDepth?: number;
  }>(),
  {
    scrollRoot: '',
    scrollOffset: 16,
    maxDepth: 6,
  },
);

const activeId = defineModel<string>('activeId', { default: '' });

const headings = ref<TocItem[]>([]);
const tree = computed<TocNode[]>(() => buildTree(headings.value));

let scrollEl: HTMLElement | null = null;
let rafId = 0;

function extractHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  if (!markdown) return items;
  const ast = unified().use(remarkParse).parse(markdown);
  visit(ast, 'heading', (node: any) => {
    if (node.depth > props.maxDepth) return;
    const text = toString(node);
    if (!text) return;
    items.push({ id: headingId({ text }), text, level: node.depth });
  });
  return items;
}

function buildTree(items: TocItem[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: TocNode[] = [];
  for (const item of items) {
    const node: TocNode = { ...item, children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

function getScrollContainer(): HTMLElement | null {
  if (props.scrollRoot) return document.querySelector<HTMLElement>(props.scrollRoot);
  return (document.scrollingElement as HTMLElement) || null;
}

function activeFromScroll(): string {
  let active = '';
  const offset = props.scrollOffset;
  for (const h of headings.value) {
    const el = document.getElementById(h.id);
    if (!el) continue;
    const top = el.getBoundingClientRect().top;
    const rootTop = scrollEl ? scrollEl.getBoundingClientRect().top : 0;
    if (top - rootTop - offset <= 0) active = h.id;
    else break;
  }
  return active;
}

function onScroll() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    const id = activeFromScroll();
    if (id && id !== activeId.value) activeId.value = id;
  });
}

function attachScroll() {
  detachScroll();
  scrollEl = getScrollContainer();
  const target = scrollEl ?? window;
  target.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function detachScroll() {
  const target = scrollEl ?? window;
  target.removeEventListener('scroll', onScroll);
  scrollEl = null;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (scrollEl) {
    const containerTop = scrollEl.getBoundingClientRect().top;
    const top =
      el.getBoundingClientRect().top - containerTop + scrollEl.scrollTop - props.scrollOffset;
    scrollEl.scrollTo({ top, behavior: 'smooth' });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY - props.scrollOffset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function onClick(e: Event, id: string) {
  e.preventDefault();
  activeId.value = id;
  scrollToHeading(id);
}

watch(
  () => props.content,
  (md) => {
    activeId.value = '';
    headings.value = extractHeadings(md);
    nextTick(attachScroll);
  },
  { immediate: true },
);

onMounted(() => {
  if (!headings.value.length) headings.value = extractHeadings(props.content);
  nextTick(attachScroll);
});

onBeforeUnmount(detachScroll);

const TocList: Component = defineComponent({
  name: 'TocList',
  props: {
    nodes: { type: Array as PropType<TocNode[]>, required: true },
  },
  setup(listProps): () => VNode {
    return (): VNode =>
      h(
        'ul',
        { class: 'toc-list' },
        listProps.nodes.map((node) =>
          h(
            'li',
            {
              class: [
                'toc-item',
                `toc-level-${node.level}`,
                { active: activeId.value === node.id },
              ],
              key: node.id,
            },
            [
              h(
                'a',
                { href: `#${node.id}`, onClick: (e: Event) => onClick(e, node.id) },
                node.text,
              ),
              node.children.length ? h(TocList, { nodes: node.children }) : null,
            ],
          ),
        ),
      );
  },
});
</script>

<template>
  <nav v-if="tree.length" class="toc-tree" :data-me-active-id="activeId">
    <TocList :nodes="tree" />
  </nav>
</template>

<style scoped>
.toc-tree {
  font-size: 13px;
  line-height: 1.6;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-children,
.toc-list ul {
  list-style: none;
  margin: 0;
}

.toc-list ul {
  padding-left: 14px;
}

.toc-item a {
  display: block;
  padding: 3px 0 3px 12px;
  color: var(--me-text-secondary);
  text-decoration: none;
  transition: color 0.15s, border-color 0.15s;
  border-left: 2px solid transparent;
}

.toc-item a:hover {
  color: var(--me-text);
}

.toc-item.active > a {
  color: var(--me-primary);
  border-left-color: var(--me-primary);
}

.toc-level-1 a { padding-left: 8px; }
.toc-level-2 a { padding-left: 8px; }
.toc-level-3 a { padding-left: 16px; }
.toc-level-4 a { padding-left: 24px; }
.toc-level-5 a { padding-left: 32px; }
.toc-level-6 a { padding-left: 40px; }
</style>
