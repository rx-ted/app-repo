declare module '*.css';

declare module '*.css?url' {
  const url: string;
  export default url;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}
