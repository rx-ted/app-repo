<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton } from 'naive-ui';

type TaxonomyPill = {
  key: string;
  name: string;
  kind?: 'tag' | 'category';
};

const props = withDefaults(
  defineProps<{
    items: TaxonomyPill[];
    activeValue?: string;
    limit?: number;
    collapsible?: boolean;
    interactive?: boolean;
  }>(),
  {
    activeValue: '',
    limit: 0,
    collapsible: false,
    interactive: true,
  },
);

const emit = defineEmits<(e: 'select', name: string) => void>();

const expanded = ref(false);

const canToggle = computed(() =>
  Boolean(props.collapsible && props.limit > 0 && props.items.length > props.limit),
);

const visibleItems = computed(() => {
  if (!canToggle.value || expanded.value || props.limit <= 0) return props.items;
  return props.items.slice(0, props.limit);
});

function itemStyle(index: number) {
  const hue = ((index * 360) / Math.max(visibleItems.value.length, 1)) % 360;
  return {
    '--taxonomy-tone': `hsl(${hue}, 50%, 55%)`,
  } as Record<string, string>;
}

function handleSelect(name: string) {
  if (!props.interactive) return;
  emit('select', name);
}
</script>

<template>
  <div class="taxonomy-pills">
    <div class="pill-wrap" :class="{ collapsed: canToggle && !expanded }">
      <button
        v-for="(item, i) in visibleItems"
        :key="item.key"
        type="button"
        class="taxonomy-pill"
        :class="{
        active: activeValue === item.name,
        readonly: !interactive,
      }"
        :style="itemStyle(i)"
        @click="handleSelect(item.name)"
      >
        {{ item.name }}
      </button>
      <div v-if="canToggle && !expanded" class="fade-mask" />
    </div>
    <div v-if="canToggle" class="toggle-row">
      <n-button text size="small" @click="expanded = !expanded">
        {{ expanded ? "收起" : `展开更多` }}
      </n-button>
    </div>
  </div>
</template>

<style scoped>
.taxonomy-pills {
  display: grid;
  gap: 10px;
}

.pill-wrap {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 1px;
  align-items: flex-start;
  transition: max-height 0.24s ease;
}

.pill-wrap.collapsed {
  max-height: 88px;
  overflow: hidden;
}

.fade-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 38px;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--app-bg-container) 0%, transparent),
    var(--app-bg-container)
  );
}

.taxonomy-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  padding: 6px 8px;
  /* border-radius: 999px; */
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--taxonomy-tone) 36%, var(--app-border));
  background: color-mix(in srgb, var(--taxonomy-tone) 14%, var(--app-bg-container));
  color: var(--taxonomy-tone);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.taxonomy-pill:hover,
.taxonomy-pill.active {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--taxonomy-tone) 68%, var(--app-border));
  background: color-mix(in srgb, var(--taxonomy-tone) 20%, var(--app-bg-elevated));
}

.taxonomy-pill.readonly {
  cursor: default;
}

.taxonomy-pill.readonly:hover {
  transform: none;
}

.toggle-row {
  display: flex;
  justify-content: flex-start;
}
</style>
