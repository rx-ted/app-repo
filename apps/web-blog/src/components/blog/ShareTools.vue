<template>
  <div class="share-tools">
    <span class="share-label">分享</span>
    <div class="share-actions">
      <button class="share-btn" title="复制链接" @click="copyLink">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span>{{ copied ? '已复制' : '复制链接' }}</span>
      </button>
      <button class="share-btn share-btn-primary" title="分享" @click="share">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span>分享</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useMessage } from '@/composables/useMessage';

const message = useMessage();
const copied = ref(false);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    copied.value = true;
    message.success('链接已复制');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    message.error('复制失败');
  }
}

async function share() {
  const url = window.location.href;
  const title = document.title;

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch {
      // user cancelled
    }
  } else {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener',
    );
  }
}
</script>

<style scoped>
.share-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.share-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.share-actions {
  display: flex;
  gap: 8px;
}

.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.share-btn:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.share-btn-primary {
  border-color: var(--app-primary);
  color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 6%, transparent);
}

.share-btn-primary:hover {
  background: var(--app-primary);
  color: #fff;
}
</style>
