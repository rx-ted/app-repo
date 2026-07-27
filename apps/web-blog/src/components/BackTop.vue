<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import { NUMBERS } from '@/constants';

const visible = ref(false);

function getScrollTarget(): HTMLElement | Window {
  const el = document.querySelector<HTMLElement>('.n-layout-scroll-container');
  return el ?? window;
}

function getScrollTop(target: HTMLElement | Window): number {
  return target instanceof Window ? target.scrollY : target.scrollTop;
}

let target: HTMLElement | Window | null = null;

function onScroll() {
  if (target) visible.value = getScrollTop(target) > NUMBERS.SCROLL_THRESHOLD;
}

function scrollToTop() {
  if (target) {
    target.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

onMounted(() => {
  target = getScrollTarget();
  target.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
  if (target) {
    target.removeEventListener('scroll', onScroll);
  }
});
</script>

<template>
  <Transition name="fade">
    <button v-if="visible" class="back-top" @click="scrollToTop" aria-label="Back to top">
      <AppIcon name="line-md:chevron-up" :width="20" :height="20" />
    </button>
  </Transition>
</template>

<style scoped>
.back-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid color-mix(in srgb, var(--app-border) 80%, transparent);
  border-radius: 12px;
  background: var(--app-bg-elevated);
  color: var(--app-text-secondary);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.18s ease;
}
.back-top:hover {
  color: var(--app-primary);
  border-color: color-mix(in srgb, var(--app-primary) 34%, var(--app-border));
  box-shadow: 0 6px 24px color-mix(in srgb, var(--app-primary) 12%, transparent);
}
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
