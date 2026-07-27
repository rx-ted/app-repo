# SlotConfig ComponentConfig Implementation Plan

> **Status: IMPLEMENTED** — Task 1-2 已完成（checkboxes 已勾选）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-component `order` and `closable` support to layout slot configurations.

**Architecture:** A shared utility `normalizeComponents()` converts the mixed `(string | ComponentConfig)[]` array from route meta into a sorted `ComponentConfig[]` array. Each layout imports it and adds a registry lookup + closable UI. The type system preserves string shorthand for backward compatibility.

**Tech Stack:** Vue 3, TypeScript, vue-router

---

### Task 1: Update types in `theme/app.ts` and `router/index.ts`

**Files:**
- Modify: `apps/web-blog/src/theme/app.ts`
- Modify: `apps/web-blog/src/router/index.ts`

- [x] **Step 1: Done** — `ComponentConfig` exported, `AsideSlotConfig` / `ContentSlotConfig` updated to `(Key | ComponentConfig)[]`.

- [x] **Step 2: Done** — Types already committed.

---

### Task 2: Create `theme/slot-utils.ts`

**Files:**
- Create: `apps/web-blog/src/theme/slot-utils.ts`

- [ ] **Step 1: Write the utility**

```ts
import type { ComponentConfig } from '@/theme/app';

export function normalizeComponents(
  raw: (string | ComponentConfig)[] | undefined | null,
): ComponentConfig[] {
  if (!raw) return [];
  const normalized = raw.map((item) =>
    typeof item === 'string' ? { name: item } : item,
  );
  return normalized.sort((a, b) => {
    if (a.order === -1) return 1;
    if (b.order === -1) return -1;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm typecheck --filter @rx-ted/web-blog`
Expected: clean output, exit code 0.

---

### Task 3: Update `FullLayout.vue`

**Files:**
- Modify: `apps/web-blog/src/layouts/FullLayout.vue`

- [ ] **Step 1: Add imports and close-state ref**

Add to the imports block:
```ts
import { normalizeComponents } from '@/theme/slot-utils';
import type { ComponentConfig } from '@/theme/app';
```

Add after the `year` ref:
```ts
const hiddenComponents = ref(new Set<string>());
```

- [ ] **Step 2: Update `pickArr` signature**

Replace the `pickArr` function:
```ts
function pickArr(
  override: (string | ComponentConfig)[] | undefined,
  fallback: string[],
): (string | ComponentConfig)[] {
  return override ?? fallback;
}
```

- [ ] **Step 3: Replace the rightComponents computed**

Old (lines 70-74):
```ts
const rightComponents = computed(() =>
  pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents)
    .map((key) => ({ key, entry: ASIDE_COMPONENT_REGISTRY[key] }))
    .filter((c) => c.entry),
);
```

New:
```ts
const rightComponents = computed(() =>
  normalizeComponents(pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents))
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);
```

- [ ] **Step 4: Replace the leftComponents computed**

Old (lines 59-68):
```ts
const leftComponents = computed(() => {
  const keys = pickArr(regions.value?.aside?.left?.components, options.value.asideLeftComponents);
  const rightKeys = new Set(
    pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents),
  );
  return keys
    .filter((key) => !rightKeys.has(key))
    .map((key) => ({ key, entry: ASIDE_COMPONENT_REGISTRY[key] }))
    .filter((c) => c.entry);
});
```

New:
```ts
const leftComponents = computed(() => {
  const left = normalizeComponents(pickArr(regions.value?.aside?.left?.components, options.value.asideLeftComponents));
  const rightNames = new Set(
    normalizeComponents(pickArr(regions.value?.aside?.right?.components, options.value.asideRightComponents)).map((c) => c.name),
  );
  return left
    .filter((cfg) => !rightNames.has(cfg.name) && !hiddenComponents.value.has(cfg.name))
    .map((cfg) => ({ cfg, entry: ASIDE_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry);
});
```

Note: the filtering logic (dedup with right sidebar) stays the same.

- [ ] **Step 5: Replace beforeComponents computed**

Old (lines 76-80):
```ts
const beforeComponents = computed(() =>
  pickArr(regions.value?.content?.before?.components, options.value.beforeContentComponents ?? [])
    .map((key) => ({ key, entry: CONTENT_COMPONENT_REGISTRY[key] }))
    .filter((c) => c.entry),
);
```

New:
```ts
const beforeComponents = computed(() =>
  normalizeComponents(pickArr(regions.value?.content?.before?.components, options.value.beforeContentComponents ?? []))
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);
```

- [ ] **Step 6: Replace afterComponents computed**

Old (lines 82-86):
```ts
const afterComponents = computed(() =>
  pickArr(regions.value?.content?.after?.components, options.value.afterContentComponents ?? [])
    .map((key) => ({ key, entry: CONTENT_COMPONENT_REGISTRY[key] }))
    .filter((c) => c.entry),
);
```

New:
```ts
const afterComponents = computed(() =>
  normalizeComponents(pickArr(regions.value?.content?.after?.components, options.value.afterContentComponents ?? []))
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);
```

- [ ] **Step 7: Add close handler after `onSearchClick`**

```ts
function onComponentClose(name: string) {
  hiddenComponents.value = new Set(hiddenComponents.value).add(name);
}
```

- [ ] **Step 8: Update template to use `cfg` instead of `key`, and render close button**

Replace each `<aside>` template block. Example for `app-aside-right`:

Old:
```html
<aside v-if="showRight" class="app-aside app-aside-right">
  <component :is="c.entry.component" v-for="c in rightComponents" :key="c.key" />
</aside>
```

New:
```html
<aside v-if="showRight" class="app-aside app-aside-right">
  <div v-for="c in rightComponents" :key="c.cfg.name" class="slot-component-wrapper">
    <button
      v-if="c.cfg.closable"
      class="slot-component-close"
      @click="onComponentClose(c.cfg.name)"
    >×</button>
    <component :is="c.entry.component" />
  </div>
</aside>
```

Do the same for all four sections: `app-aside-left`, `content-before`, `content-after`, `app-aside-right`. Each uses the same pattern with its corresponding computed ref.

- [ ] **Step 9: Add styles for the close button**

Add after existing styles:
```css
.slot-component-wrapper {
  position: relative;
}

.slot-component-close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.5;
  font-size: 16px;
  color: var(--app-text);
}

.slot-component-close:hover {
  opacity: 1;
}
```

---

### Task 4: Update `DocLayout.vue`

**Files:**
- Modify: `apps/web-blog/src/layouts/DocLayout.vue`

Follow the same pattern as Task 3 (FullLayout):

- [ ] **Step 1: Add imports + hiddenComponents ref + pickArr update + close handler**

```ts
import { normalizeComponents } from '@/theme/slot-utils';
import type { ComponentConfig } from '@/theme/app';
```

Add after the `year` ref:
```ts
const hiddenComponents = ref(new Set<string>());
```

Update `pickArr` signature:
```ts
function pickArr(
  override: (string | ComponentConfig)[] | undefined,
  fallback: string[],
): (string | ComponentConfig)[] {
  return override ?? fallback;
}
```

Add close handler:
```ts
function onComponentClose(name: string) {
  hiddenComponents.value = new Set(hiddenComponents.value).add(name);
}
```

- [ ] **Step 2: Replace all 4 computed props** (leftComponents, rightComponents, beforeComponents, afterComponents) using the same pattern as Task 3 Steps 3-6.

- [ ] **Step 3: Update template** — add wrapper div + close button to each of the 4 section blocks.

- [ ] **Step 4: Add the same close button styles** from Task 3 Step 9.

---

### Task 5: Update `SimpleLayout.vue`

**Files:**
- Modify: `apps/web-blog/src/layouts/SimpleLayout.vue`

Same pattern but only 2 sections (before, after — no aside):

- [ ] **Step 1: Add imports + hiddenComponents ref + close handler**

```ts
import { normalizeComponents } from '@/theme/slot-utils';
```

```ts
const hiddenComponents = ref(new Set<string>());
```

```ts
function onComponentClose(name: string) {
  hiddenComponents.value = new Set(hiddenComponents.value).add(name);
}
```

- [ ] **Step 2: Replace beforeComponents and afterComponents computed props**

Old:
```ts
const beforeComponents = computed(() =>
  (regions.value?.content?.before?.components ?? [])
    .map((key) => ({ key, entry: CONTENT_COMPONENT_REGISTRY[key] }))
    .filter((c) => c.entry),
);
```

New:
```ts
const beforeComponents = computed(() =>
  normalizeComponents(regions.value?.content?.before?.components)
    .map((cfg) => ({ cfg, entry: CONTENT_COMPONENT_REGISTRY[cfg.name] }))
    .filter((c) => c.entry && !hiddenComponents.value.has(c.cfg.name)),
);
```

Same for `afterComponents`.

- [ ] **Step 3: Update template** — add wrapper div + close button to before/after sections.

- [ ] **Step 4: Add the same close button styles**.

---

### Task 6: Final typecheck

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: all projects pass, exit code 0.
