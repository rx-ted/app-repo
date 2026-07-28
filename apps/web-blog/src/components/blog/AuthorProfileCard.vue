<script setup lang="ts">
import { SITE_AUTHOR, SITE_INFO } from '@/constants/author';
import AppIcon from '@/components/AppIcon.vue';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
</script>

<template>
  <div class="author-profile-card">
    <div class="widget-header">
      <div class="header-left">
        <svg
          class="header-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21a8 8 0 1 0-16 0" />
        </svg>
        <h4 class="widget-title">{{t('home.authorProfileCard.title')}}</h4>
      </div>
    </div>

    <div class="apc-profile">
      <div class="apc-avatar-wrap">
        <img class="apc-avatar" :src="SITE_AUTHOR.avatar" :alt="SITE_AUTHOR.name">
        <span class="apc-status" />
      </div>
      <div class="apc-info">
        <h4 class="apc-name">{{ SITE_AUTHOR.nickname }}</h4>
        <p class="apc-desc">{{ SITE_AUTHOR.description }}</p>
        <p class="apc-motto">{{ SITE_INFO.motto }}</p>
      </div>
    </div>

    <div class="apc-social">
      <a
        v-for="(link, key) in SITE_AUTHOR.social"
        :key="key"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="apc-social-link"
        :title="link.label"
      >
        <AppIcon :name="link.icon" :width="18" :height="18" />
        <span>{{ link.label }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.author-profile-card {
  padding: 16px 20px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  border-radius: 12px;
  box-shadow: var(--app-card-shadow);
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-icon {
  color: var(--app-warning);
  flex-shrink: 0;
}

.widget-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin: 0;
}

.apc-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  margin-bottom: 16px;
}

.apc-avatar-wrap {
  position: relative;
  width: 64px;
  height: 64px;
}

.apc-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--app-primary);
}

.apc-status {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--app-success);
  border: 3px solid var(--app-bg-container);
}

.apc-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.apc-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.apc-desc {
  margin: 0;
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.apc-motto {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--app-text-secondary);
  font-style: italic;
  max-width: 220px;
}

.apc-social {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.apc-social-link {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
  background: color-mix(in srgb, var(--app-text) 4%, transparent);
  transition: all 0.2s;
  text-decoration: none;
}

.apc-social-link:hover {
  background: color-mix(in srgb, var(--app-primary) 10%, transparent);
  color: var(--app-primary);
}
</style>
