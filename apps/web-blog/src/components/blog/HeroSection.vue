<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useBlogStore } from '@/stores/blog';
import { storeToRefs } from 'pinia';
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
const route = useRoute();
const blog = useBlogStore();
const { pinned, loading } = storeToRefs(blog);

const isHome = computed(() => route.path === '/');

const slides = computed(() => pinned.value || []);
const current = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function startAutoPlay() {
  stopAutoPlay();
  if (slides.value.length <= 1) return;
  timer = setInterval(() => {
    current.value = (current.value + 1) % slides.value.length;
  }, 5000);
}

function stopAutoPlay() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function goTo(index: number) {
  current.value = index;
  startAutoPlay();
}

function prev() {
  current.value = (current.value - 1 + slides.value.length) % slides.value.length;
  startAutoPlay();
}

function next() {
  current.value = (current.value + 1) % slides.value.length;
  startAutoPlay();
}

onMounted(() => {
  if (!pinned.value?.length) {
    blog.fetchHome();
  }
  startAutoPlay();
});

onUnmounted(() => {
  stopAutoPlay();
});
</script>

<template>
  <section v-if="isHome" class="hero-section">
    <div class="hero-bg" />
    <div v-if="loading" class="hero-loading">
      <div class="hero-loading-pulse" />
    </div>
    <template v-else-if="slides.length">
      <div class="hero-slides" @mouseenter="stopAutoPlay" @mouseleave="startAutoPlay">
        <div
          v-for="(slide, i) in slides"
          :key="slide.id"
          class="hero-slide"
          :class="{ active: i === current }"
        >
          <div
            class="hero-slide-bg"
            :style="slide.cover_image ? { backgroundImage: `url(${slide.cover_image})` } : undefined"
          />
          <div class="hero-slide-overlay" />
          <div class="hero-slide-content">
            <h2 class="hero-slide-title">{{ slide.title }}</h2>
            <p v-if="slide.excerpt" class="hero-slide-excerpt">{{ slide.excerpt }}</p>
            <div class="hero-slide-meta">
              <span v-if="slide.reading_time" class="hero-slide-reading">
                {{ t('post.readTime', { min: slide.reading_time }) }}
              </span>
            </div>
            <RouterLink :to="`/posts/${slide.slug}`" class="hero-slide-link">
              {{ t('post.readMore') || 'Read More' }}
            </RouterLink>
          </div>
        </div>
      </div>

      <button class="hero-arrow hero-arrow-prev" aria-label="Previous" @click="prev">‹</button>
      <button class="hero-arrow hero-arrow-next" aria-label="Next" @click="next">›</button>

      <div v-if="slides.length > 1" class="hero-dots">
        <button
          v-for="(_, i) in slides"
          :key="i"
          class="hero-dot"
          :class="{ active: i === current }"
          @click="goTo(i)"
        />
      </div>
    </template>
    <div v-else class="hero-empty">
      <p class="hero-empty-text">{{ t('home.noPosts') }}</p>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  box-shadow: var(--app-card-shadow);
  min-height: 260px;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--app-primary) 8%, transparent),
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
}

/* loading */
.hero-loading {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
}

.hero-loading-pulse {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid var(--app-border);
  border-top-color: var(--app-primary);
  animation: hero-spin 0.8s linear infinite;
}

@keyframes hero-spin {
  to {
    transform: rotate(360deg);
  }
}

/* slides */
.hero-slides {
  position: relative;
  z-index: 1;
  height: 260px;
}

.hero-slide {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}

.hero-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.hero-slide-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.hero-slide-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--app-bg-base) 92%, transparent),
    color-mix(in srgb, var(--app-bg-base) 50%, transparent) 60%,
    transparent
  );
}

.hero-slide-content {
  position: relative;
  padding: 40px 48px;
  max-width: 600px;
}

.hero-slide-title {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--app-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-slide-excerpt {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--app-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hero-slide-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.hero-slide-reading {
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.hero-slide-link {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--app-primary);
  text-decoration: none;
  transition: opacity 0.2s;
}

.hero-slide-link:hover {
  opacity: 0.85;
}

/* arrows */
.hero-arrow {
  position: absolute;
  z-index: 2;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--app-text) 8%, transparent);
  color: var(--app-text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-arrow:hover {
  background: color-mix(in srgb, var(--app-primary) 15%, transparent);
  color: var(--app-primary);
}

.hero-arrow-prev {
  left: 12px;
}

.hero-arrow-next {
  right: 12px;
}

/* dots */
.hero-dots {
  position: absolute;
  z-index: 2;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.hero-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--app-text) 20%, transparent);
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.2s;
  padding: 0;
}

.hero-dot.active {
  background: var(--app-primary);
  transform: scale(1.3);
}

/* empty */
.hero-empty {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
}

.hero-empty-text {
  font-size: 14px;
  color: var(--app-text-tertiary);
}

@media (max-width: 640px) {
  .hero-section {
    min-height: 200px;
  }

  .hero-loading,
  .hero-slides,
  .hero-empty {
    height: 200px;
  }

  .hero-slide-content {
    padding: 28px 24px;
    max-width: 100%;
  }

  .hero-slide-title {
    font-size: 20px;
  }

  .hero-arrow {
    display: none;
  }
}
</style>
