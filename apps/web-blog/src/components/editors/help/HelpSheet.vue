<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<(e: 'close') => void>();

const shortcuts = [
  { keys: ['Ctrl', 'S'], action: '保存' },
  { keys: ['Ctrl', 'P'], action: '切换预览' },
  { keys: ['Ctrl', '/'], action: '打开帮助' },
  { keys: ['Tab'], action: '缩进' },
];

const syntaxItems = [
  { syntax: '# Heading', desc: '一级标题' },
  { syntax: '## Heading', desc: '二级标题' },
  { syntax: '**bold**', desc: '粗体' },
  { syntax: '*italic*', desc: '斜体' },
  { syntax: '[text](url)', desc: '链接' },
  { syntax: '![alt](url)', desc: '图片' },
  { syntax: '```\ncode\n```', desc: '代码块' },
  { syntax: '- item', desc: '无序列表' },
  { syntax: '1. item', desc: '有序列表' },
  { syntax: '> quote', desc: '引用' },
  { syntax: '---', desc: '分隔线' },
];
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    style="width: 50vw; max-width: 560px; min-width: 320px"
    title="Markdown 帮助"
    @close="emit('close')"
    @update:show="(v: boolean) => !v && emit('close')"
  >
    <h3 class="help-section-title">快捷键</h3>
    <div class="help-grid">
      <div v-for="item in shortcuts" :key="item.keys.join('+')" class="help-row">
        <span class="help-keys">
          <kbd v-for="key in item.keys" :key="key">{{ key }}</kbd>
        </span>
        <span>{{ item.action }}</span>
      </div>
    </div>

    <h3 class="help-section-title">Markdown 语法</h3>
    <div class="help-grid">
      <div v-for="item in syntaxItems" :key="item.syntax" class="help-row">
        <code class="help-syntax">{{ item.syntax }}</code>
        <span>{{ item.desc }}</span>
      </div>
    </div>

    <h3 class="help-section-title">Frontmatter 元数据</h3>
    <p class="help-desc">在文章开头用 <code>---</code> 包裹可设置元数据，保存弹窗自动读取。</p>
    <div class="help-grid">
      <div class="help-row">
        <code class="help-syntax">title: 文章标题</code>
        <span>设置文章标题</span>
      </div>
      <div class="help-row">
        <code class="help-syntax">cover: https://example.com/cover.jpg</code>
        <span>封面图 URL</span>
      </div>
      <div class="help-row">
        <code class="help-syntax">tag: c/c++, java</code>
        <span>标签（逗号分隔多个）</span>
      </div>
      <div class="help-row">
        <code class="help-syntax">tags: c/c++, java</code>
        <span><code>tag</code> 的别名</span>
      </div>
      <div class="help-row">
        <code class="help-syntax">category: 分类名称</code>
        <span>分类（最多一个）</span>
      </div>
      <div class="help-row">
        <code class="help-syntax">status: draft</code>
        <span>draft（草稿）/ published（发布）/ archived（归档）</span>
      </div>
    </div>

    <template #footer>
      <NButton @click="emit('close')">知道了</NButton>
    </template>
  </NModal>
</template>

<style scoped lang="scss">
.help-section-title {
  margin: 20px 0 12px;
  font-size: 15px;

  &:first-child {
    margin-top: 0;
  }
}

.help-grid {
  display: grid;
  gap: 8px;
}

.help-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 16px;
  align-items: center;
}

.help-keys {
  display: flex;
  gap: 4px;
}

kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid var(--app-border, #d9d9d9);
  border-radius: 4px;
  background: var(--app-bg-muted, var(--app-bg-soft, #f5f5f5));
}

.help-desc {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.help-syntax {
  font-size: 13px;
  white-space: nowrap;
}
</style>
