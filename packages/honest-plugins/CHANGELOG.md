# @rx-ted/packages-honest-plugins

## 1.1.0

### Minor Changes

- d70dfae: The counter plugin now debounces its flush loop and lets consumers register domain-specific flush handlers instead of coupling the plugin to business tables: `CounterPlugin.registerFlushHandler(prefix, handler)` is called for each key whose pending delta reaches the threshold (or on the debounce timer), and the plugin is reachable as a `CounterPlugin` under `COUNTER_PLUGIN_KEY` (alongside the existing `COUNTER_GLOBAL_KEY` driver). `CounterDriver` gains `pendingKeys()` so consumers can snapshot the touched keys; `StatsBufferService` uses these to fold view/like/comment deltas into `post_stats` and invalidate the per-lang blog home cache.

  Outside Cloudflare Workers (Node/Bun) the plugin now falls back to an in-memory driver instead of requiring a Durable Object binding. The Durable Object is split into a dedicated export: `@rx-ted/packages-honest-plugins-counter/do` and `@rx-ted/packages-honest-plugins/counter/do`.

### Patch Changes

- Updated dependencies [d70dfae]
  - @rx-ted/packages-honest-plugins-counter@1.1.0

## 1.0.4

### Patch Changes

- 312bbb3: Test changeset to verify automated patch version bump.
- Updated dependencies [ecd82a4]
- Updated dependencies [ecd82a4]
- Updated dependencies [ecd82a4]
- Updated dependencies [ecd82a4]
- Updated dependencies [ecd82a4]
- Updated dependencies [ecd82a4]
  - @rx-ted/packages-honest-plugins-api-doc@1.0.2
  - @rx-ted/packages-honest-plugins-cache@1.0.2
  - @rx-ted/packages-honest-plugins-counter@1.0.2
  - @rx-ted/packages-honest-plugins-db@1.0.2
  - @rx-ted/packages-honest-plugins-mail@1.0.2
  - @rx-ted/packages-honest-plugins-s3@1.0.2

## 1.0.3

### Patch Changes

- 32b8b81: Accumulate miscellaneous fixes and refinements.

## 1.0.2

### Patch Changes

- 6f2fb99: New package `@rx-ted/packages-honest-plugins-counter` — Durable Objects backed counter plugin with pending buffer and flush handlers, exposed via `@rx-ted/packages-honest-plugins/counter` subpath export
- Updated dependencies [6f2fb99]
  - @rx-ted/packages-honest-plugins-counter@1.0.1

## 1.0.1

### Patch Changes

- 11bbae7: Remove defunct packages (web-admin, auth, http-client, search) and introduce barrel packages for consolidated exports. Migrate all internal imports from scoped plugin names (`@rx-ted/packages-honest-plugins-db`) to path-based barrel imports (`@rx-ted/packages-honest-plugins/db`). Reset all package versions to 1.0.0 with consolidated changelogs. Clean up obsolete documentation across the monorepo.
- Updated dependencies [11bbae7]
  - @rx-ted/packages-honest-plugins-db@1.0.1
  - @rx-ted/packages-honest-plugins-cache@1.0.1
  - @rx-ted/packages-honest-plugins-mail@1.0.1
  - @rx-ted/packages-honest-plugins-s3@1.0.1
  - @rx-ted/packages-honest-plugins-api-doc@1.0.1
