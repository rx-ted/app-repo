import { type InjectionKey, inject, type ComputedRef } from 'vue';
import type { App } from './app';

export const APP_DATA_STORAGE_KEY = 'appData';

export const dataSymbol: InjectionKey<ComputedRef<App.Config>> = Symbol(APP_DATA_STORAGE_KEY);

export function useData(): ComputedRef<App.Config> {
  const data = inject(dataSymbol);
  if (!data) throw new Error('App config not provided!');
  return data;
}
