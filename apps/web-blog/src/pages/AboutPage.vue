<template>
  <div class="about-page">
    <section class="hero">
      <blockquote class="hero-quote">
        <p><strong>Build. Document. Discover.</strong></p>
        <p>{{ t('about.hero.line1') }}</p>
      </blockquote>
    </section>

    <section class="section">
      <h2>{{ t('about.hello.title') }}</h2>
      <p>{{ t('about.hello.p1') }}</p>
      <p>{{ t('about.hello.p2') }}</p>
      <p>{{ t('about.hello.p3') }}</p>
      <p>{{ t('about.hello.p4') }}</p>
      <p>{{ t('about.hello.p5') }}</p>
    </section>

    <section class="section">
      <h2>{{ t('about.focus.title') }}</h2>
      <p class="section-desc">{{ t('about.focus.desc') }}</p>

      <div class="focus-grid">
        <div class="focus-card">
          <h3>{{ t('about.focus.software') }}</h3>
          <div class="tag-list">
            <template v-for="tag in softwareTags" :key="tag">
              <a
                v-if="FOCUS_URLS[tag]"
                :href="FOCUS_URLS[tag]"
                target="_blank"
                rel="noopener"
                class="tag tag-link"
              >{{ tag }} ↗</a>
              <span v-else class="tag tag-hover">{{ tag }}</span>
            </template>
          </div>
        </div>
        <div class="focus-card">
          <h3>{{ t('about.focus.embedded') }}</h3>
          <div class="tag-list">
            <template v-for="tag in embeddedTags" :key="tag">
              <a
                v-if="FOCUS_URLS[tag]"
                :href="FOCUS_URLS[tag]"
                target="_blank"
                rel="noopener"
                class="tag tag-link"
              >{{ tag }} ↗</a>
              <span v-else class="tag tag-hover">{{ tag }}</span>
            </template>
          </div>
        </div>
        <div class="focus-card">
          <h3>{{ t('about.focus.architecture') }}</h3>
          <div class="tag-list">
            <template v-for="tag in archTags" :key="tag">
              <a
                v-if="FOCUS_URLS[tag]"
                :href="FOCUS_URLS[tag]"
                target="_blank"
                rel="noopener"
                class="tag tag-link"
              >{{ tag }} ↗</a>
              <span v-else class="tag tag-hover">{{ tag }}</span>
            </template>
          </div>
        </div>
      </div>

      <p class="focus-footnote">{{ t('about.focus.footnote') }}</p>
    </section>

    <section class="section">
      <h2>{{ t('about.philosophy.title') }}</h2>
      <ul class="philosophy-list">
        <li v-for="i in 6" :key="i">{{ t(`about.philosophy.${i - 1}`) }}</li>
      </ul>
    </section>

    <section class="section">
      <h2>{{ t('about.topics.title') }}</h2>
      <p>{{ t('about.topics.desc') }}</p>
      <div class="topic-grid">
        <div v-for="topic in topics" :key="topic.key" class="topic-item topic-hover">
          <span class="topic-icon">{{ topic.icon }}</span>
          <span class="topic-label">{{ t(`about.topics.${topic.key}`) }}</span>
        </div>
      </div>
      <p class="topic-footnote">{{ t('about.topics.footnote') }}</p>
    </section>

    <section class="section">
      <h2>{{ t('about.learning.title') }}</h2>
      <p>{{ t('about.learning.prefix') }}</p>
      <div class="tag-list">
        <span v-for="item in learning" :key="item" class="tag tag-hover">{{ item }}</span>
      </div>
    </section>

    <section class="section">
      <h2>{{ t('about.why.title') }}</h2>
      <p>{{ t('about.why.p1') }}</p>
      <p>{{ t('about.why.p2') }}</p>
      <p>{{ t('about.why.p3') }}</p>
    </section>

    <section class="section">
      <h2>{{ t('about.discover.title') }}</h2>
      <p>{{ t('about.discover.p1') }}</p>
      <p>{{ t('about.discover.p2') }} <router-link to="/discover">Discover →</router-link></p>
      <p>{{ t('about.discover.p3') }}</p>
    </section>

    <section class="section">
      <h2>{{ t('about.connect.title') }}</h2>
      <p>{{ t('about.connect.p1') }}</p>
      <p>{{ t('about.connect.p2') }}</p>
      <div class="contact-links">
        <a href="mailto:gjy.18sui@gmail.com" class="contact-item">
          <span class="contact-label">Email</span>
          <span>gjy.18sui@gmail.com</span>
        </a>
        <a href="https://github.com/rx-ted" target="_blank" rel="noopener" class="contact-item">
          <span class="contact-label">GitHub</span>
          <span>github.com/rx-ted ↗</span>
        </a>
      </div>
    </section>

    <footer class="about-footer">
      <blockquote class="hero-quote">
        <p><strong>Build. Document. Discover.</strong></p>
        <p><em>{{ t('about.hero.line2') }}</em></p>
      </blockquote>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();

const FOCUS_URLS: Record<string, string | null> = {
  TypeScript: 'https://typescriptlang.org',
  'Node.js': 'https://nodejs.org',
  Vue: 'https://vuejs.org',
  Hono: 'https://hono.dev',
  'REST API': null,
  Docker: 'https://docker.com',
  'GitHub Actions': 'https://github.com/rx-ted',
  Monorepo: null,
  'CI/CD': null,
  'Embedded Linux': null,
  'BSP Development': null,
  'Linux Driver': null,
  IoT: null,
  'Smart Home': null,
  'Screen UI': null,
  'UART / SPI / I²C': null,
  软件架构: null,
  工程化: null,
  自动化测试: null,
  DevOps: null,
  开源基础设施: null,
};

const softwareTags = [
  'TypeScript',
  'Node.js',
  'Vue',
  'Hono',
  'REST API',
  'Docker',
  'GitHub Actions',
  'Monorepo',
  'CI/CD',
];

const embeddedTags = [
  'Embedded Linux',
  'BSP Development',
  'Linux Driver',
  'IoT',
  'Smart Home',
  'Screen UI',
  'UART / SPI / I²C',
];

const archTags = ['软件架构', '工程化', '自动化测试', 'DevOps', '开源基础设施'];

const topics = [
  { icon: '📖', key: '0' },
  { icon: '🏗', key: '1' },
  { icon: '🔧', key: '2' },
  { icon: '📦', key: '3' },
  { icon: '🧪', key: '4' },
  { icon: '📓', key: '5' },
  { icon: '🌐', key: '6' },
];

const learning = [
  'TypeScript',
  'Vue Ecosystem',
  'Software Architecture',
  'AI Coding Workflow',
  'Cloud Native',
  'Open Source Design',
];
</script>

<style scoped>
.about-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.hero {
  text-align: center;
  padding: 2rem 0;
}

.hero-quote {
  margin: 0;
  border-left: none;
  padding: 0;
}

.hero-quote p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  line-height: 1.7;
  color: var(--app-text-secondary);
}

.hero-quote strong {
  font-size: 1.3rem;
  color: var(--app-text);
}

.section h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--app-border);
}

.section p {
  line-height: 1.8;
  color: var(--app-text-secondary);
  margin: 0.6rem 0;
}

.section-desc {
  font-weight: 600;
  color: var(--app-text) !important;
  margin-top: 0 !important;
}

.focus-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1.25rem 0;
}

.focus-card {
  padding: 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
}

.focus-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--app-text);
}

.focus-footnote {
  font-size: 0.9rem;
  color: var(--app-text-tertiary) !important;
  margin-top: 1rem !important;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  background: var(--app-bg);
  border: 1px solid var(--app-border);
  font-size: 0.8rem;
  color: var(--app-text-secondary);
  white-space: nowrap;
}

.tag-link,
.tag-hover {
  transition: border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.tag-link {
  text-decoration: none;
  cursor: pointer;
}

.tag-link:hover,
.tag-hover:hover {
  border-color: var(--app-primary);
  color: var(--app-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-primary) 20%, transparent);
}

.philosophy-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.philosophy-list li {
  padding: 0.6rem 0 0.6rem 1.25rem;
  position: relative;
  line-height: 1.6;
  color: var(--app-text-secondary);
}

.philosophy-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 1rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-primary);
}

.topic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
  margin: 1rem 0;
}

.topic-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: var(--app-bg-container);
  border: 1px solid var(--app-border);
  font-size: 0.9rem;
  color: var(--app-text-secondary);
}

.topic-hover {
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: default;
}

.topic-hover:hover {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-primary) 20%, transparent);
}

.topic-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.topic-label {
  color: var(--app-text-secondary);
}

.topic-footnote {
  font-size: 0.9rem;
  color: var(--app-text-tertiary) !important;
}

.contact-links {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;
}

.contact-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--app-border);
  background: var(--app-bg-container);
  text-decoration: none;
  color: var(--app-text-secondary);
  transition: border-color 0.15s;
}

.contact-item:hover {
  border-color: var(--app-primary);
}

.contact-label {
  font-weight: 600;
  min-width: 4rem;
  color: var(--app-text);
}

.about-footer {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--app-border);
}
</style>
