<template>
  <div class="components-page">
    <header class="cp-header">
      <h1 class="cp-title">组件目录</h1>
      <p class="cp-desc">所有通过注册表动态注入的组件一览（共 {{ totalCount }} 个）</p>
    </header>

    <section class="cp-section">
      <h2 class="cp-section-title">侧栏组件（ASIDE_COMPONENT_REGISTRY）</h2>
      <div class="cp-grid">
        <div v-for="(entry, key) in ASIDE_COMPONENT_REGISTRY" :key="key" class="cp-card">
          <div class="cp-card-header">
            <span class="cp-key">{{ key }}</span>
            <span class="cp-title">{{ asideLabel(key) }}</span>
          </div>
          <div class="cp-card-body">
            <component :is="entry.component" />
          </div>
        </div>
      </div>
    </section>

    <section class="cp-section">
      <h2 class="cp-section-title">内容区组件（CONTENT_COMPONENT_REGISTRY）</h2>
      <div class="cp-grid">
        <div v-for="(entry, key) in CONTENT_COMPONENT_REGISTRY" :key="key" class="cp-card">
          <div class="cp-card-header">
            <span class="cp-key">{{ key }}</span>
            <span class="cp-title">{{ contentLabel(key) }}</span>
          </div>
          <div class="cp-card-body">
            <component :is="entry.component" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useBlogStore } from '@/stores/blog';
import { useI18n } from '@/composables/useI18n';
import { ASIDE_COMPONENT_REGISTRY, CONTENT_COMPONENT_REGISTRY } from '@/config/component-registry';
const { t } = useI18n();

function asideLabel(key: string): string {
  return t(`layout.aside.${key}`, undefined, ASIDE_COMPONENT_REGISTRY[key]?.title ?? key);
}

function contentLabel(key: string): string {
  return t(`layout.content.${key}`, undefined, CONTENT_COMPONENT_REGISTRY[key]?.title ?? key);
}

const blog = useBlogStore();

const totalCount =
  Object.keys(ASIDE_COMPONENT_REGISTRY).length + Object.keys(CONTENT_COMPONENT_REGISTRY).length;

onMounted(() => {
  blog.fetchHome();
});
</script>

<style scoped>
.components-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

.cp-header {
  margin-bottom: 36px;
}

.cp-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--app-text);
  margin: 0 0 6px;
}

.cp-desc {
  font-size: 14px;
  color: var(--app-text-secondary);
  margin: 0;
}

.cp-section {
  margin-bottom: 40px;
}

.cp-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--app-border);
}

.cp-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cp-card {
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: var(--app-bg-elevated);
  overflow: hidden;
}

.cp-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--app-bg-container);
  border-bottom: 1px solid var(--app-border);
}

.cp-key {
  font-size: 11px;
  font-weight: 600;
  font-family: ui-monospace, "SF Mono", monospace;
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.cp-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--app-text);
}

.cp-card-body {
  padding: 16px;
}

.cp-card-body > :deep(*) {
  margin-bottom: 0 !important;
}
</style>
