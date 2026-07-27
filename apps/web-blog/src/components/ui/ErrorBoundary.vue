<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';

interface ErrorBoundaryProps {
  fallback?: string;
  onError?: (error: Error) => void;
}

const props = withDefaults(defineProps<ErrorBoundaryProps>(), {
  fallback: 'Something went wrong',
});

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err;
  props.onError?.(err);
  return false;
});

function _handleRetry() {
  error.value = null;
}
</script>

<template>
  <div v-if="error" class="error-boundary">
    <slot name="fallback">
      <div class="error-content">
        <h2>Something went wrong</h2>
        <p>{{ error.message }}</p>
        <button @click="_handleRetry">Try Again</button>
      </div>
    </slot>
  </div>
  <slot v-else />
</template>

<style scoped lang="scss">
.error-boundary {
  min-height: 100%;
}

.error-content {
  padding: 2rem;
  text-align: center;
  
  h2 {
    color: var(--app-error);
    margin-bottom: 1rem;
  }
  
  p {
    color: var(--app-text-secondary);
    margin-bottom: 1rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    background: var(--app-primary);
    color: var(--app-text-inverse);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    
    &:hover {
      opacity: 0.85;
    }
  }
}
</style>
