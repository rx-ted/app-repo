<template>
  <div class="donate-wrap">
    <button v-if="!showPanel" class="donate-trigger" @click="showPanel = true">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
        <path d="M4 7v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7" />
        <path d="M12 12v6" />
        <path d="M9 15h6" />
      </svg>
      <span>投币支持</span>
    </button>

    <div v-else class="donate-panel">
      <div class="donate-header">
        <h4 class="donate-title">赞助支持</h4>
        <button class="donate-close" @click="showPanel = false" title="收起">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <p class="donate-desc">如果这篇文章对你有帮助，欢迎打赏支持</p>
      <div class="donate-qrs">
        <div class="qr-item">
          <img
            src="https://api.dicebear.com/9.x/icons/svg?seed=wechat-pay&backgroundColor=#22c55e"
            alt="微信支付"
          >
          <span class="qr-label">微信</span>
        </div>
        <div class="qr-item">
          <img
            src="https://api.dicebear.com/9.x/icons/svg?seed=alipay&backgroundColor=#1677ff"
            alt="支付宝"
          >
          <span class="qr-label">支付宝</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showPanel = ref(false);
</script>

<style scoped>
.donate-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donate-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid var(--app-warning);
  border-radius: 10px;
  background: color-mix(in srgb, var(--app-warning) 8%, transparent);
  color: var(--app-warning);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.donate-trigger:hover {
  background: var(--app-warning);
  color: #fff;
}

.donate-panel {
  padding: 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
  text-align: center;
}

.donate-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 6px;
  position: relative;
}

.donate-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0;
  color: var(--app-text);
}

.donate-close {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text-tertiary);
  cursor: pointer;
  transition: all 0.15s;
}

.donate-close:hover {
  background: var(--app-bg-muted);
  color: var(--app-text);
}

.donate-desc {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin: 0 0 16px;
}

.donate-qrs {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.qr-item img {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  border: 1px solid var(--app-border);
}

.qr-label {
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
