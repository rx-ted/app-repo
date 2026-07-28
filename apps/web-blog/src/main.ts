import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createHead } from '@vueuse/head';

import App from '@/App.vue';
import { router } from '@/router';

import 'md-editor-v3/lib/style.css';
import './styles/main.scss';

import { dataSymbol } from './theme/data';
import { initData } from './theme/default';
import { tokenStorage } from '@/lib/http/tokenStorage';

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  const config = initData();
  app.provide(dataSymbol, config);

  app.use(pinia);
  app.use(createHead());

  app.use(router);
  app.mount('#app');

  // don't block layout rendering — fetch auth / user session in background
  const { useSessionStore } = await import('@/stores/session');
  const store = useSessionStore();
  store.bootstrap();

  // sync token changes from external storage (e.g. cross-tab) to pinia state
  tokenStorage.subscribe((t: string | null) => {
    store.token = t;
  });
}

bootstrap();
