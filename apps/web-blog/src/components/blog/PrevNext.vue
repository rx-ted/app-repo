<template>
  <nav v-if="!loading" class="prev-next" aria-label="上下篇文章">
    <router-link v-if="prev" :to="`/posts/${prev.slug}`" class="pn-link pn-prev">
      <span class="pn-direction">← 上一篇</span>
      <span class="pn-title">{{ prev.title }}</span>
    </router-link>
    <button v-else class="pn-link pn-prev pn-na" @click="onNa">
      <span class="pn-direction">← 上一篇</span>
      <span class="pn-title pn-na-text">没有更多了</span>
    </button>

    <router-link v-if="next" :to="`/posts/${next.slug}`" class="pn-link pn-next">
      <span class="pn-direction">下一篇 →</span>
      <span class="pn-title">{{ next.title }}</span>
    </router-link>
    <button v-else class="pn-link pn-next pn-na" @click="onNa">
      <span class="pn-direction">下一篇 →</span>
      <span class="pn-title pn-na-text">没有更多了</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { http } from '@/http';
import { useMessage } from '@/composables/useMessage';

const route = useRoute();
const message = useMessage();

const prev = ref<{ slug: string; title: string } | null>(null);
const next = ref<{ slug: string; title: string } | null>(null);
const loading = ref(true);

function onNa() {
  message.info('没有更多了');
}

async function fetchAdjacent(slug: string) {
  loading.value = true;
  try {
    const body = await http.get<{ prev: typeof prev.value; next: typeof next.value }>(
      `/posts/${slug}/adjacent`,
    );
    prev.value = body.prev ?? null;
    next.value = body.next ?? null;
  } catch {
    prev.value = null;
    next.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  const slug = String(route.params.slug || '');
  if (slug) fetchAdjacent(slug);
});

watch(
  () => route.params.slug,
  (slug) => {
    if (slug) fetchAdjacent(String(slug));
  },
);
</script>

<style scoped>
.prev-next {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.pn-link {
  flex: 1;
  max-width: 50%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
  padding: 14px 18px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  transition: all 0.15s;
  color: var(--app-text);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: inherit;
}

.pn-link:hover:not(.pn-na) {
  border-color: var(--app-primary);
  background: color-mix(in srgb, var(--app-primary) 4%, transparent);
}

.pn-na:hover {
  border-color: var(--app-border);
  background: var(--app-bg-muted);
}

.pn-direction {
  font-size: 12px;
  color: var(--app-text-tertiary);
}

.pn-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pn-na-text {
  color: var(--app-text-tertiary);
  font-weight: 400;
}

.pn-next {
  text-align: right;
}
</style>
