<script setup lang="ts">
import { NIcon } from 'naive-ui';
import { Icon } from '@iconify/vue';

interface Props {
  /** Iconify 图标名，例如 'flat-color-icons:address-book' */
  name: string;
  /** 图标宽度 */
  width?: number | string;
  /** 图标高度 */
  height?: number | string;
  /** 颜色（可选） */
  color?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <NIcon>
    <Icon
      :icon="props.name"
      :width="props.width || 36"
      :height="props.height || 36"
      :color="props.color"
    />
  </NIcon>
</template>
