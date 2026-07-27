/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEV_API_TARGET?: string;
  readonly VITE_HTTP_TIMEOUT_MS?: string;
  readonly VITE_HTTP_WITH_CREDENTIALS?: string;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

