# Runtime Context 设计文档（Draft）

## 1. 背景

现代 JavaScript/TypeScript 已经可以运行在多个 Runtime，例如：

- Node.js
- Bun
- Deno
- Cloudflare Workers
- Vercel Edge Runtime
- Fastly Compute
- 其他符合 WinterCG 规范的平台

不同 Runtime 获取环境变量（Environment Variables）、请求上下文（Request Context）以及平台能力（Platform APIs）的方式存在明显差异。

例如：

| Runtime            | Environment                |
| ------------------ | -------------------------- |
| Node.js            | `process.env`              |
| Bun                | `Bun.env`                  |
| Deno               | `Deno.env.toObject()`      |
| Cloudflare Workers | `fetch(request, env, ctx)` |
| Edge Runtime       | Provider-specific          |

Cloudflare Workers 与其他 Runtime 最大的区别在于：

- `env` 并不是全局变量。
- `env` 与请求生命周期绑定（Request Scoped）。
- 离开 `fetch()` 后无法直接访问。

因此，跨平台库无法简单依赖统一的 `process.env` 或 `globalThis`。

---

# 2. 问题

目前跨平台 Config 模块通常依赖：

```ts
process.env;
```

或者：

```ts
globalThis.__ENV__;
```

这种方式存在以下问题：

## 全局变量污染

多个请求可能共享同一份状态。

例如：

```
Request A
↓

global.env = envA

↓

Request B

↓

global.env = envB
```

Request A 后续读取时可能已经变成 `envB`。

---

## Cloudflare Workers 不支持

Cloudflare 并不存在：

```ts
process.env;
```

所有配置必须来自：

```ts
fetch(request, env, ctx);
```

因此必须在运行时传递。

---

## 平台耦合

业务代码可能出现：

```ts
if (isNode) ...

if (isCloudflare) ...

if (isBun) ...
```

导致业务层直接依赖 Runtime。

---

# 3. 设计目标

Runtime Context 应满足以下目标：

- 支持多 Runtime。
- 请求级上下文（Request Scoped）。
- 无全局状态污染。
- 类型安全。
- 可扩展。
- 可组合。
- 支持未来平台。

非目标：

- 不负责读取 `.env` 文件。
- 不负责配置解析。
- 不负责 Secret 管理。
- 不负责依赖注入容器（DI）。

---

# 4. 核心思想

整个 Runtime 生命周期由一个 Context 描述：

```ts
RuntimeContext;
```

所有 Runtime API 都从当前 Context 获取信息。

业务代码不直接访问平台 API，而统一访问：

```ts
Runtime.env();

Runtime.request();

Runtime.logger();

Runtime.database();
```

这样业务层完全不知道当前运行在哪个平台。

---

# 5. Runtime Context

建议定义：

```ts
export interface RuntimeContext {
  platform: Platform;

  env: Record<string, unknown>;

  request?: Request;

  executionContext?: unknown;

  waitUntil?: (promise: Promise<unknown>) => void;
}
```

未来可扩展：

```ts
interface RuntimeContext {
  platform;

  env;

  request;

  executionContext;

  logger;

  cache;

  database;

  kv;

  r2;

  queue;

  ai;

  websocket;

  locale;

  session;

  traceId;

  user;
}
```

Runtime Context 不限制具体能力，而是作为统一容器。

---

# 6. Runtime API

Runtime 对外暴露统一 API。

例如：

```ts
Runtime.run(context, fn);
```

```ts
Runtime.context();
```

```ts
Runtime.env();
```

```ts
Runtime.request();
```

```ts
Runtime.platform();
```

业务层永远只依赖 Runtime。

例如：

```ts
const env = Runtime.env();

const req = Runtime.request();
```

---

# 7. 生命周期

整个请求生命周期：

```
HTTP Request
        │
        ▼
Platform Adapter
        │
        ▼
创建 RuntimeContext
        │
        ▼
Runtime.run(context)
        │
        ▼
业务逻辑
        │
        ▼
Runtime.env()
Runtime.request()
Runtime.logger()
...
```

所有 API 都来自当前 Context。

---

# 8. Platform Adapter

每个平台只负责创建 RuntimeContext。

## Node

```ts
Runtime.run(
  {
    platform: "node",

    env: process.env,

    request,
  },
  () => app(),
);
```

---

## Bun

```ts
Runtime.run(
  {
    platform: "bun",

    env: Bun.env,
  },
  () => app(),
);
```

---

## Deno

```ts
Runtime.run(
  {
    platform: "deno",

    env: Deno.env.toObject(),
  },
  () => app(),
);
```

---

## Cloudflare Workers

```ts
Runtime.run(
  {
    platform: "cloudflare",

    env,

    request,

    executionContext: ctx,

    waitUntil: ctx.waitUntil.bind(ctx),
  },
  () => app(),
);
```

业务代码无需知道运行平台。

---

# 9. Context Storage

Runtime Context 不建议保存在：

```ts
globalThis;
```

也不建议：

```ts
static currentContext
```

推荐采用 Async Context（例如 AsyncLocalStorage 或兼容实现）。

这样：

```
Request A
↓

Context A

↓

Runtime.env()

↓

Context A
```

```
Request B
↓

Context B

↓

Runtime.env()

↓

Context B
```

两个请求互不影响。

---

# 10. Provider

Runtime Context 可以作为 Provider 的底层实现。

例如：

```ts
Runtime.logger();

Runtime.cache();

Runtime.database();

Runtime.kv();

Runtime.ai();

Runtime.queue();
```

Provider 可以来自不同平台：

```
Cloudflare KV

↓

Runtime.kv()
```

```
Redis

↓

Runtime.cache()
```

```
MySQL

↓

Runtime.database()
```

业务无需感知 Provider 来源。

---

# 11. Config 模块

Config 不直接访问平台 API。

例如：

```ts
const env = Runtime.env();

return env.API_URL;
```

这样 Config 完全跨平台。

---

# 12. 优势

相比直接使用：

```
process.env
```

Runtime Context 具有：

- Request Scoped
- 无共享污染
- 支持 Cloudflare
- 支持 Edge Runtime
- 可扩展
- 易测试
- 类型安全
- 平台无关

---

# 13. 未来扩展

未来 Runtime Context 可以继续承载：

- Logger
- Cache
- Metrics
- OpenTelemetry
- Database
- AI Gateway
- Feature Flag
- Queue
- Scheduler
- Service Binding
- Secrets Manager
- Distributed Tracing

最终形成统一 Runtime 抽象层：

```
Business
      │
      ▼
 Runtime API
      │
      ▼
 Runtime Context
      │
      ▼
Platform Adapter
      │
      ▼
Node / Bun / Deno / Cloudflare / Edge Runtime
```

业务层始终依赖 Runtime API，而不依赖具体平台，实现真正的跨 Runtime 开发。

# 14. 其他内容

1. Context Inheritance（上下文继承）：定义 Runtime.run() 内部启动异步任务、嵌套调用或子请求时，上下文是否自动继承，以及继承规则。
2. Plugin System（插件系统）：允许第三方注册能力，例如 Runtime.register('redis', provider)、Runtime.register('s3', provider)，让 Runtime 不只是 env 容器，而成为整个跨平台基础设施的入口。
