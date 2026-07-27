# @rx-ted/packages-honest-plugins-counter

Counter plugin for [@rx-ted/packages-honest](https://github.com/rx-ted/honest). Provides high-performance counters backed by Cloudflare Durable Objects with automatic periodic flushing.

## Features

- **Durable Objects**: each counter key maps to a dedicated DO instance for strong consistency
- **Pending buffer**: increments/decrements are buffered in the DO and flushed in batches
- **Flush handlers**: register domain-specific flush logic (e.g. write deltas to DB)
- **Plugin-based**: integrates via the Honest plugin lifecycle

## Installation

```bash
pnpm add @rx-ted/packages-honest-plugins-counter
```

Peer dependencies: `@rx-ted/packages-honest`, `hono`

## Usage

### Register as a plugin

```ts
import { CounterPlugin } from '@rx-ted/packages-honest-plugins/counter';

const plugin = new CounterPlugin({
  doBinding: 'COUNTER_DO', // default
});

const { hono } = await Application.create(AppModule, {
  plugins: [plugin],
});
```

### Register a flush handler

```ts
import { CounterPlugin } from '@rx-ted/packages-honest-plugins/counter';

const plugin = new CounterPlugin();

// Called when pending delta is flushed — write to your DB here
plugin.registerFlushHandler('post:views:', async (key, delta) => {
  const postId = key.split(':')[2];
  await db.update(posts).set({ viewCount: sql`${posts.viewCount} + ${delta}` }).where(eq(posts.id, postId));
});
```

### Access the counter

```ts
import { ComponentManager } from '@rx-ted/packages-honest';
import { CounterService } from '@rx-ted/packages-honest-plugins/counter';

const counter = ComponentManager.getPlugin<CounterDriver>('counter');
await counter.increment('post:views:123', 1);
const views = await counter.value('post:views:123');
```

## API

| Method | Description |
|--------|-------------|
| `increment(key, delta?)` | Increment a counter, returns new value |
| `decrement(key, delta?)` | Decrement a counter, returns new value |
| `value(key)` | Get current counter value |
| `mget(keys)` | Get values for multiple keys |
| `flush(key)` | Consume pending delta and run flush handler |
| `pending(key)` | Get pending (unflushed) delta |
| `close()` | No-op, for interface compliance |
| `healthCheck()` | Always returns `true` |

## Wrangler config

Add a Durable Objects binding in `wrangler.jsonc`:

```jsonc
{
  "durable_objects": {
    "bindings": [
      { "name": "COUNTER_DO", "class_name": "CounterDO" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_classes": ["CounterDO"] }
  ]
}
```

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests |
| `pnpm build` | Build |
