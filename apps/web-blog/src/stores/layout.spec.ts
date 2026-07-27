// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useLayoutStore } from './layout';
import { DEFAULT_LAYOUT_CONFIG, LAYOUT } from '@/constants/layout';
import { STORAGE_KEYS } from '@/constants/storage';
import { setLocal, getLocal } from '@/utils/storage';
import type { LayoutConfig } from '@/types/layout';

describe('layout store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('should initialize with default config from storage', () => {
    const store = useLayoutStore();
    expect(store.config.layoutId).toBe(LAYOUT.DEFAULT_ID);
    expect(store.topPinned).toBe(false);
    expect(store.fullOptions.showAsideLeft).toBe(false);
    expect(store.fullOptions.showAsideRight).toBe(true);
    expect(store.docOptions.showAsideRight).toBe(true);
    expect(store.initDone).toBe(false);
  });

  it('should load config from localStorage on init (layoutId forced to default)', async () => {
    const storedConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      layoutId: LAYOUT.LAYOUT_2_ID,
      topPinned: true,
    };
    setLocal(STORAGE_KEYS.USER_LAYOUT, storedConfig);

    const store = useLayoutStore();
    expect(store.config.layoutId).toBe(LAYOUT.DEFAULT_ID);
    expect(store.topPinned).toBe(true);
  });

  it('should fall back to default if localStorage is corrupt', async () => {
    localStorage.setItem('app:storage', 'not-json');

    const store = useLayoutStore();
    expect(store.config.layoutId).toBe(LAYOUT.DEFAULT_ID);
    expect(store.topPinned).toBe(false);
  });

  it('should save config to localStorage (layoutId forced to default)', async () => {
    const store = useLayoutStore();
    store.save({ ...DEFAULT_LAYOUT_CONFIG, layoutId: 'layout-2' });

    expect(store.config.layoutId).toBe(LAYOUT.DEFAULT_ID);

    const stored = getLocal<Partial<LayoutConfig>>(STORAGE_KEYS.USER_LAYOUT, {});
    expect(stored.layoutId).toBe(LAYOUT.DEFAULT_ID);
  });

  it('should persist changes to localStorage', async () => {
    const store = useLayoutStore();
    store.save({ ...DEFAULT_LAYOUT_CONFIG, topPinned: true });

    expect(store.topPinned).toBe(true);

    const stored = getLocal<Partial<LayoutConfig>>(STORAGE_KEYS.USER_LAYOUT, {});
    expect(stored.topPinned).toBe(true);
  });
});
