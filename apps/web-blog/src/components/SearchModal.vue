<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const open = ref(false);
const query = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open.value = !open.value;
    if (open.value) nextTick(() => inputRef.value?.focus());
  }
  if (e.key === 'Escape') open.value = false;
}

function openSearch() {
  open.value = true;
  nextTick(() => inputRef.value?.focus());
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

defineExpose({ openSearch });
</script>

<template>
  <Teleport to="body">
    <transition name="search-fade">
      <div v-if="open" class="search-overlay" @click.self="open = false">
        <div class="search-modal" @click.stop>
          <div class="search-input-wrap">
            <span class="search-icon">⌕</span>
            <input
              ref="inputRef"
              v-model="query"
              class="search-input"
              :placeholder="t('header.search.placeholder')"
              disabled
            >
            <span class="search-hint">ESC</span>
          </div>
          <div class="search-empty">
            {{ t('common.notImplemented') }}
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
}

.search-modal {
  width: 100%;
  max-width: 560px;
  background: var(--app-bg-elevated);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid var(--app-border);
}

.search-icon {
  font-size: 18px;
  color: var(--app-text-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  color: var(--app-text);
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--app-text-quaternary);
}

.search-hint {
  font-size: 11px;
  color: var(--app-text-quaternary);
  padding: 2px 6px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  font-family: monospace;
  flex-shrink: 0;
}

.search-results {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.search-result-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--app-text);
}

.search-result-item:hover {
  background: var(--app-bg-muted);
}

.search-empty {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--app-text-tertiary);
}

.search-fade-enter-active,
.search-fade-leave-active {
  transition: opacity 0.15s ease;
}
.search-fade-enter-from,
.search-fade-leave-to {
  opacity: 0;
}
</style>
