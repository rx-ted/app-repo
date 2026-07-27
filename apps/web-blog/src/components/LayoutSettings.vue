<template>
  <div class="layout-settings">
    <NCard :title="t('layout.title')" size="small">
      <NSpace vertical size="large">
        <div class="setting-row">
          <span class="setting-label">{{ t('layout.mode') }}</span>
          <NSelect
            v-model:value="localConfig.layoutId"
            :options="layoutOptions"
            style="width: 160px"
          />
        </div>

        <NDivider />

        <div class="setting-row">
          <span class="setting-label">{{ t('layout.topPinned') }}</span>
          <NSwitch v-model:value="localConfig.topPinned" />
        </div>

        <NDivider />

        <NTabs v-model:value="activeTab" type="line" animated>
          <NTabPane name="full" tab="FULL">
            <div class="tab-content">
              <div class="setting-row">
                <span class="setting-label">{{ t('layout.sidebar') }}</span>
                <div class="switch-group">
                  <span class="switch-item"
                    >{{ t('layout.left') }}
                    <NSwitch v-model:value="fullOpts.showAsideLeft" size="small" /></span
                  >
                  <span class="switch-item"
                    >{{ t('layout.right') }}
                    <NSwitch v-model:value="fullOpts.showAsideRight" size="small" /></span
                  >
                </div>
              </div>

              <div class="comp-list">
                <div v-if="fullOpts.asideLeftComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.left') }}</div>
                  <VueDraggable
                    v-model="fullOpts.asideLeftComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in fullOpts.asideLeftComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleAside('full', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('aside', key) }}</span>
                      <NSelect
                        :value="'left'"
                        :options="asidePlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setAsidePlacement('full', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-if="fullOpts.asideRightComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.right') }}</div>
                  <VueDraggable
                    v-model="fullOpts.asideRightComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in fullOpts.asideRightComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleAside('full', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('aside', key) }}</span>
                      <NSelect
                        :value="'right'"
                        :options="asidePlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setAsidePlacement('full', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-for="opt in disabledAside('full')" :key="opt.value" class="comp-row">
                  <span class="drag-placeholder" />
                  <NCheckbox @update:checked="(v) => toggleAside('full', opt.value, v)" />
                  <span class="comp-label disabled">{{ compLabel('aside', opt.value) }}</span>
                </div>
              </div>

              <NDivider />

              <div class="setting-row">
                <span class="setting-label">{{ t('layout.contentArea') }}</span>
                <div class="switch-group">
                  <span class="switch-item"
                    >{{ t('layout.before') }}
                    <NSwitch v-model:value="fullOpts.showBeforeContent" size="small" /></span
                  >
                  <span class="switch-item"
                    >{{ t('layout.after') }}
                    <NSwitch v-model:value="fullOpts.showAfterContent" size="small" /></span
                  >
                </div>
              </div>

              <div class="comp-list">
                <div v-if="fullOpts.beforeContentComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.before') }}</div>
                  <VueDraggable
                    v-model="fullOpts.beforeContentComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div
                      v-for="key in fullOpts.beforeContentComponents"
                      :key="key"
                      class="comp-row"
                    >
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleContent('full', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('content', key) }}</span>
                      <NSelect
                        :value="'before'"
                        :options="contentPlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setContentPlacement('full', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-if="fullOpts.afterContentComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.after') }}</div>
                  <VueDraggable
                    v-model="fullOpts.afterContentComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in fullOpts.afterContentComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleContent('full', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('content', key) }}</span>
                      <NSelect
                        :value="'after'"
                        :options="contentPlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setContentPlacement('full', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-for="opt in disabledContent('full')" :key="opt.value" class="comp-row">
                  <span class="drag-placeholder" />
                  <NCheckbox @update:checked="(v) => toggleContent('full', opt.value, v)" />
                  <span class="comp-label disabled">{{ compLabel('content', opt.value) }}</span>
                </div>
              </div>
            </div>
          </NTabPane>

          <NTabPane name="doc" tab="DOC">
            <div class="tab-content">
              <div class="setting-row">
                <span class="setting-label">{{ t('layout.sidebar') }}</span>
                <div class="switch-group">
                  <span class="switch-item"
                    >{{ t('layout.left') }}
                    <NSwitch v-model:value="docOpts.showAsideLeft" size="small" /></span
                  >
                  <span class="switch-item"
                    >{{ t('layout.right') }}
                    <NSwitch v-model:value="docOpts.showAsideRight" size="small" /></span
                  >
                </div>
              </div>
              <div class="setting-row">
                <span class="setting-label">{{ t('layout.topAd') }}</span>
                <NSwitch v-model:value="docOpts.showTopAd" size="small" />
              </div>

              <div class="comp-list">
                <div v-if="docOpts.asideLeftComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.left') }}</div>
                  <VueDraggable
                    v-model="docOpts.asideLeftComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in docOpts.asideLeftComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleAside('doc', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('aside', key) }}</span>
                      <NSelect
                        :value="'left'"
                        :options="asidePlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setAsidePlacement('doc', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-if="docOpts.asideRightComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.right') }}</div>
                  <VueDraggable
                    v-model="docOpts.asideRightComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in docOpts.asideRightComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleAside('doc', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('aside', key) }}</span>
                      <NSelect
                        :value="'right'"
                        :options="asidePlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setAsidePlacement('doc', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-for="opt in disabledAside('doc')" :key="opt.value" class="comp-row">
                  <span class="drag-placeholder" />
                  <NCheckbox @update:checked="(v) => toggleAside('doc', opt.value, v)" />
                  <span class="comp-label disabled">{{ compLabel('aside', opt.value) }}</span>
                </div>
              </div>

              <NDivider />

              <div class="setting-row">
                <span class="setting-label">{{ t('layout.contentArea') }}</span>
                <div class="switch-group">
                  <span class="switch-item"
                    >{{ t('layout.before') }}
                    <NSwitch v-model:value="docOpts.showBeforeContent" size="small" /></span
                  >
                  <span class="switch-item"
                    >{{ t('layout.after') }}
                    <NSwitch v-model:value="docOpts.showAfterContent" size="small" /></span
                  >
                </div>
              </div>

              <div class="comp-list">
                <div v-if="docOpts.beforeContentComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.before') }}</div>
                  <VueDraggable
                    v-model="docOpts.beforeContentComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in docOpts.beforeContentComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleContent('doc', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('content', key) }}</span>
                      <NSelect
                        :value="'before'"
                        :options="contentPlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setContentPlacement('doc', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-if="docOpts.afterContentComponents.length > 0" class="placement-group">
                  <div class="placement-label">{{ t('layout.after') }}</div>
                  <VueDraggable
                    v-model="docOpts.afterContentComponents"
                    handle=".drag-handle"
                    class="drag-group"
                  >
                    <div v-for="key in docOpts.afterContentComponents" :key="key" class="comp-row">
                      <span class="drag-handle">⠿</span>
                      <NCheckbox
                        :checked="true"
                        @update:checked="(v) => toggleContent('doc', key, v)"
                      />
                      <span class="comp-label">{{ compLabel('content', key) }}</span>
                      <NSelect
                        :value="'after'"
                        :options="contentPlacementOptions"
                        size="small"
                        class="comp-select"
                        @update:value="(p) => setContentPlacement('doc', key, p)"
                      />
                    </div>
                  </VueDraggable>
                </div>

                <div v-for="opt in disabledContent('doc')" :key="opt.value" class="comp-row">
                  <span class="drag-placeholder" />
                  <NCheckbox @update:checked="(v) => toggleContent('doc', opt.value, v)" />
                  <span class="comp-label disabled">{{ compLabel('content', opt.value) }}</span>
                </div>
              </div>
            </div>
          </NTabPane>

          <NTabPane name="simple" tab="SIMPLE">
            <div class="tab-content">
              <p class="no-config">{{ t('layout.simpleDesc') }}</p>
            </div>
          </NTabPane>

          <NTabPane name="blank" tab="BLANK">
            <div class="tab-content">
              <p class="no-config">{{ t('layout.blankDesc') }}</p>
            </div>
          </NTabPane>
        </NTabs>

        <NDivider />

        <NSpace justify="end">
          <NButton @click="handleReset">{{ t('layout.reset') }}</NButton>
          <NButton type="primary" @click="handleSave">{{ t('layout.save') }}</NButton>
        </NSpace>
      </NSpace>
    </NCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import {
  NCard,
  NSwitch,
  NSelect,
  NSpace,
  NButton,
  NDivider,
  NTabs,
  NTabPane,
  NCheckbox,
} from 'naive-ui';
import { useLayoutStore } from '@/stores/layout';
import { useI18n } from '@/composables/useI18n';
import type { LayoutConfig, FullOptions, DocOptions } from '@/types/layout';
import { LAYOUT, DEFAULT_LAYOUT_CONFIG } from '@/constants/layout';
import { ASIDE_COMPONENT_REGISTRY, CONTENT_COMPONENT_REGISTRY } from '@/config/component-registry';

const layoutStore = useLayoutStore();
const { t } = useI18n();

const activeTab = ref('full');

const localConfig = ref<LayoutConfig>({ ...layoutStore.config });

const fullOpts = reactive(localConfig.value.layouts.full);
const docOpts = reactive(localConfig.value.layouts.doc);

watch(
  () => layoutStore.config,
  (cfg) => {
    localConfig.value = { ...cfg };
    Object.assign(fullOpts, cfg.layouts.full);
    Object.assign(docOpts, cfg.layouts.doc);
  },
  { deep: true },
);

const asidePlacementOptions = computed(() => [
  { label: t('layout.asidePlacementLeft'), value: 'left' },
  { label: t('layout.asidePlacementRight'), value: 'right' },
]);

const contentPlacementOptions = computed(() => [
  { label: t('layout.contentPlacementBefore'), value: 'before' },
  { label: t('layout.contentPlacementAfter'), value: 'after' },
]);

const layoutOptions = computed(() => [{ label: t('layout.classic'), value: LAYOUT.DEFAULT_ID }]);

function getOpts(layout: 'full' | 'doc'): FullOptions | DocOptions {
  return layout === 'full' ? fullOpts : docOpts;
}

function compLabel(type: 'aside' | 'content', key: string): string {
  if (type === 'aside') {
    const entry = ASIDE_COMPONENT_REGISTRY[key];
    return t(`layout.aside.${key}`, undefined, entry?.title ?? key);
  }
  const entry = CONTENT_COMPONENT_REGISTRY[key];
  return t(`layout.content.${key}`, undefined, entry?.title ?? key);
}

function disabledAside(layout: 'full' | 'doc') {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const enabled = [...o.asideLeftComponents, ...o.asideRightComponents];
  return Object.entries(ASIDE_COMPONENT_REGISTRY)
    .filter(([key]) => !enabled.includes(key))
    .map(([value]) => ({ label: compLabel('aside', value), value }));
}

function disabledContent(layout: 'full' | 'doc') {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const enabled = [...(o.beforeContentComponents ?? []), ...(o.afterContentComponents ?? [])];
  return Object.entries(CONTENT_COMPONENT_REGISTRY)
    .filter(([key]) => !enabled.includes(key))
    .map(([value]) => ({ label: compLabel('content', value), value }));
}

function toggleAside(layout: 'full' | 'doc', key: string, enabled: boolean) {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const leftIdx = o.asideLeftComponents.indexOf(key);
  const rightIdx = o.asideRightComponents.indexOf(key);
  if (!enabled) {
    if (leftIdx !== -1) o.asideLeftComponents.splice(leftIdx, 1);
    if (rightIdx !== -1) o.asideRightComponents.splice(rightIdx, 1);
  } else if (leftIdx === -1 && rightIdx === -1) {
    o.asideLeftComponents.push(key);
  }
}

function setAsidePlacement(layout: 'full' | 'doc', key: string, placement: 'left' | 'right') {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const leftIdx = o.asideLeftComponents.indexOf(key);
  const rightIdx = o.asideRightComponents.indexOf(key);
  if (leftIdx !== -1) o.asideLeftComponents.splice(leftIdx, 1);
  if (rightIdx !== -1) o.asideRightComponents.splice(rightIdx, 1);
  if (placement === 'left') o.asideLeftComponents.push(key);
  else o.asideRightComponents.push(key);
}

function toggleContent(layout: 'full' | 'doc', key: string, enabled: boolean) {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const beforeIdx = o.beforeContentComponents?.indexOf(key) ?? -1;
  const afterIdx = o.afterContentComponents?.indexOf(key) ?? -1;
  if (!enabled) {
    if (beforeIdx !== -1) o.beforeContentComponents.splice(beforeIdx, 1);
    if (afterIdx !== -1) o.afterContentComponents.splice(afterIdx, 1);
  } else if (beforeIdx === -1 && afterIdx === -1) {
    if (!o.beforeContentComponents) o.beforeContentComponents = [];
    o.beforeContentComponents.push(key);
  }
}

function setContentPlacement(layout: 'full' | 'doc', key: string, placement: 'before' | 'after') {
  const o = getOpts(layout) as FullOptions | DocOptions;
  const beforeIdx = o.beforeContentComponents?.indexOf(key) ?? -1;
  const afterIdx = o.afterContentComponents?.indexOf(key) ?? -1;
  if (beforeIdx !== -1) o.beforeContentComponents.splice(beforeIdx, 1);
  if (afterIdx !== -1) o.afterContentComponents.splice(afterIdx, 1);
  if (placement === 'before') {
    if (!o.beforeContentComponents) o.beforeContentComponents = [];
    o.beforeContentComponents.push(key);
  } else {
    if (!o.afterContentComponents) o.afterContentComponents = [];
    o.afterContentComponents.push(key);
  }
}

function handleSave() {
  localConfig.value.layouts.full = { ...fullOpts } as FullOptions;
  localConfig.value.layouts.doc = { ...docOpts } as DocOptions;
  layoutStore.save(localConfig.value);
}

function handleReset() {
  localConfig.value = { ...DEFAULT_LAYOUT_CONFIG };
  Object.assign(fullOpts, DEFAULT_LAYOUT_CONFIG.layouts.full);
  Object.assign(docOpts, DEFAULT_LAYOUT_CONFIG.layouts.doc);
}
</script>

<style scoped>
.layout-settings {
  max-width: 520px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.setting-label {
  font-size: 14px;
  color: var(--app-text);
}

.switch-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.comp-list {
  margin-top: 8px;
}

.placement-group {
  margin-bottom: 4px;
}

.placement-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0 2px;
}

.comp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.drag-handle {
  cursor: grab;
  color: var(--app-text-tertiary);
  font-size: 14px;
  user-select: none;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-placeholder {
  width: 16px;
  flex-shrink: 0;
}

.comp-label {
  flex: 1;
  font-size: 14px;
  color: var(--app-text);
}

.comp-label.disabled {
  opacity: 0.45;
}

.comp-select {
  width: 90px;
}

.drag-group {
  min-height: 4px;
}

.tab-content {
  min-height: 120px;
}

.no-config {
  font-size: 13px;
  color: var(--app-text-secondary);
  line-height: 1.6;
  padding: 24px 0;
  text-align: center;
}
</style>
