# @rx-ted/packages-honest-plugins-counter

## 1.1.0

### Minor Changes

- d70dfae: The counter plugin now debounces its flush loop and lets consumers register domain-specific flush handlers instead of coupling the plugin to business tables: `CounterPlugin.registerFlushHandler(prefix, handler)` is called for each key whose pending delta reaches the threshold (or on the debounce timer), and the plugin is reachable as a `CounterPlugin` under `COUNTER_PLUGIN_KEY` (alongside the existing `COUNTER_GLOBAL_KEY` driver). `CounterDriver` gains `pendingKeys()` so consumers can snapshot the touched keys; `StatsBufferService` uses these to fold view/like/comment deltas into `post_stats` and invalidate the per-lang blog home cache.

  Outside Cloudflare Workers (Node/Bun) the plugin now falls back to an in-memory driver instead of requiring a Durable Object binding. The Durable Object is split into a dedicated export: `@rx-ted/packages-honest-plugins-counter/do` and `@rx-ted/packages-honest-plugins/counter/do`.

## 1.0.2

### Patch Changes

- ecd82a4: Test changeset to verify automated patch version bump.
- Updated dependencies [312bbb3]
- Updated dependencies [312bbb3]
  - @rx-ted/packages-core@1.0.3
  - @rx-ted/packages-honest@1.0.3

## 1.0.1

### Patch Changes

- 6f2fb99: New package `@rx-ted/packages-honest-plugins-counter` — Durable Objects backed counter plugin with pending buffer and flush handlers, exposed via `@rx-ted/packages-honest-plugins/counter` subpath export
