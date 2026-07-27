# SlotConfig ComponentConfig Design

> **Status: IMPLEMENTED** — SlotConfig/ComponentConfig 已实现。

Date: 2026-06-15

## Summary

Enhance RouteMeta's `SlotConfig` to support per-component configuration objects alongside simple string references, enabling ordering and closability for individual components in layout regions.

## Motivation

The current `SlotConfig` only accepts a flat `string[]` for components, limiting runtime control. Users need to:

- Reorder components within a slot without changing array index
- Show a close button to dismiss individual components

## Type Design

### New type

```ts
type ComponentConfig = {
  /** Component key from the registry */
  name: string;
  /** Sort order within the slot. -1 = always last. Defaults to array index order. */
  order?: number;
  /** Show a close button allowing users to dismiss this component */
  closable?: boolean;
};
```

### Updated SlotConfig

```ts
type AsideSlotConfig = {
  show?: boolean;
  components?: (AsideComponentKey | ComponentConfig)[];
};
type ContentSlotConfig = {
  show?: boolean;
  components?: (ContentComponentKey | ComponentConfig)[];
};
```

### Usage

```ts
meta: {
  regions: {
    aside: {
      right: {
        components: [
          'network-card',
          { name: 'trending', order: -1, closable: true },
        ],
      },
    },
  },
}
```

## Design Decisions

- **YAGNI applied strictly**: Only `order` and `closable` added. No `props`, `show`, `title` overrides, or direct `Component` references — these can be added later if needed.
- **String shorthand preserved**: `'name'` continues to work as sugar for `{ name: 'name' }` — zero migration cost.
- **`order: -1` means last**: allows placing at end without knowing the exact count.

## Implementation

### Files to change

1. `apps/web-blog/src/theme/app.ts` — Update `AsideSlotConfig` / `ContentSlotConfig` types to accept `ComponentConfig` union
2. `apps/web-blog/src/layouts/*Layout.vue` (Full, Doc, Simple) — Normalize mixed arrays, apply `order` sort, render close button

### Runtime behavior

- Utility normalizes `(string | ComponentConfig)[]` to `ComponentConfig[]`
- Sort by `order` ascending, with `-1` pushed to end
- `closable: true` renders a close button that sets local `hidden` state; state resets on route change
