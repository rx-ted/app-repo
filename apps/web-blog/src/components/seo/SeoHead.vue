<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useHead } from '@vueuse/head';
import { siteConfig, fetchSiteConfig } from '@/config/site';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const props = withDefaults(defineProps<SeoProps>(), {
  title: 'Tech Blog',
  description: '',
  keywords: () => ['blog', 'tech', 'programming'],
  image: '',
  type: 'website',
});

const resolvedTitle = computed(() =>
  props.title === 'Tech Blog' ? siteConfig.siteName : props.title,
);
const resolvedDesc = computed(() => props.description || siteConfig.siteDesc);
const resolvedImage = computed(() => props.image || siteConfig.siteImg);
const resolvedAuthor = computed(() => props.author || siteConfig.author);
const siteUrl = computed(() => siteConfig.siteUrl.replace(/\/$/, ''));

onMounted(() => {
  fetchSiteConfig();
});

useHead({
  title: resolvedTitle,
  meta: [
    { name: 'description', content: resolvedDesc },
    { name: 'keywords', content: props.keywords.join(', ') },
    { name: 'author', content: resolvedAuthor },
    { property: 'og:title', content: resolvedTitle },
    { property: 'og:description', content: resolvedDesc },
    {
      property: 'og:image',
      content: computed(() =>
        resolvedImage.value.startsWith('http')
          ? resolvedImage.value
          : `${siteUrl.value}${resolvedImage.value}`,
      ),
    },
    {
      property: 'og:url',
      content: computed(() => (props.url ? `${siteUrl.value}${props.url}` : siteUrl.value)),
    },
    { property: 'og:type', content: props.type },
    { property: 'og:site_name', content: computed(() => siteConfig.siteName) },
    { property: 'twitter:card', content: 'summary_large_image' },
    { property: 'twitter:title', content: resolvedTitle },
    { property: 'twitter:description', content: resolvedDesc },
    {
      property: 'twitter:image',
      content: computed(() =>
        resolvedImage.value.startsWith('http')
          ? resolvedImage.value
          : `${siteUrl.value}${resolvedImage.value}`,
      ),
    },
    ...(props.type === 'article'
      ? [
          {
            property: 'article:author',
            content: resolvedAuthor,
          },
          {
            property: 'article:published_time',
            content: props.publishedTime || '',
          },
          {
            property: 'article:modified_time',
            content: props.modifiedTime || '',
          },
        ]
      : []),
  ],
  link: [
    {
      rel: 'canonical',
      href: computed(() => (props.url ? `${siteUrl.value}${props.url}` : siteUrl.value)),
    },
  ],
});
</script>

<template>
  <slot />
</template>
