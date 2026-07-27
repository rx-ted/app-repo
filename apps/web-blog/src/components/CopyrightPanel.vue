<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue';
</script>

<template>
  <div class="copyright-panel">
    <div class="cp-header">
      <div class="cp-brand">
        <div class="cp-logo">◈</div>
        <div>
          <div class="cp-name">Blog</div>
        </div>
      </div>
    </div>

    <div class="cp-info">
      <div class="cp-item">
        <AppIcon name="tabler:brand-github" :width="18" :height="18" />
        <a href="https://github.com/rx-ted" target="_blank" rel="noopener">github.com/rx-ted</a>
      </div>
      <div class="cp-item">
        <AppIcon name="tabler:license" :width="18" :height="18" />
        <span>MIT License</span>
      </div>
      <div class="cp-item">
        <AppIcon name="tabler:quote" :width="18" :height="18" />
        <span>点点滴滴，记录美好</span>
      </div>
      <div class="cp-item">
        <AppIcon name="tabler:mail" :width="18" :height="18" />
        <a href="mailto:gjy.18sui@gmail.com">gjy.18sui@gmail.com</a>
      </div>
    </div>

    <div class="cp-footer">
      <span>© 2026 Blog. MIT License</span>
    </div>
  </div>
</template>

<style scoped>
.copyright-panel {
  max-width: 720px;
  margin: 40px auto;
  padding: 32px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 16px;
}

.cp-header {
  margin-bottom: 24px;
}

.cp-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cp-logo {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--app-primary) 12%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-primary);
  font-size: 16px;
  font-weight: 700;
}

.cp-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--app-text);
}

.cp-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.cp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--app-text-secondary);
}

.cp-item a {
  color: var(--app-primary);
  text-decoration: none;
}

.cp-item a:hover {
  text-decoration: underline;
}

.cp-footer {
  padding-top: 16px;
  border-top: 1px solid var(--app-border);
  font-size: 13px;
  color: var(--app-text-tertiary);
}
</style>
