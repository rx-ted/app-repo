<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core';
import { ref } from 'vue';

interface LazyImageProps {
  src: string;
  alt?: string;
  placeholder?: string;
  aspectRatio?: string;
}

const props = withDefaults(defineProps<LazyImageProps>(), {
  alt: '',
  placeholder:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E",
  aspectRatio: '16/9',
});

const imageRef = ref<HTMLImageElement | null>(null);
const isLoaded = ref(false);
const isInView = ref(false);

useIntersectionObserver(
  imageRef,
  (entries) => {
    const entry = entries[0];
    if (entry?.isIntersecting) {
      isInView.value = true;
    }
  },
  { threshold: 0.1 },
);

function _handleLoad() {
  isLoaded.value = true;
}
</script>

<template>
  <div class="lazy-image" :style="{ aspectRatio: props.aspectRatio }">
    <img
      v-if="isInView"
      ref="imageRef"
      :src="props.src"
      :alt="props.alt"
      :class="{ loaded: isLoaded }"
      loading="lazy"
      decoding="async"
      @load="_handleLoad"
    >
    <img v-else ref="imageRef" :src="props.placeholder" :alt="props.alt" class="placeholder">
  </div>
</template>

<style scoped lang="scss">
.lazy-image {
  position: relative;
  overflow: hidden;
  background-color: var(--app-bg-soft);
  border-radius: 8px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s ease;

    &.loaded,
    &:not(.placeholder) {
      opacity: 1;
    }
  }
}
</style>
