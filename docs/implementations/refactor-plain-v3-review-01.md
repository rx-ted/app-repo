# PluginEngine 设计文档（v3 Review 01）

> **Status: DRAFT** — PluginEngine v3 设计评审，尚未实施。

> 状态：Draft
> 更新时间：2026-07-14
> 前提：refactor-plan-v2 已完成（axios + openapi-fetch middleware + mail warmUp）
> 位置：`packages/honest/src/`（集成到 honest 框架）
> 基于：`refactor-plain-v3.md` + 设计评审，整合了 HonestJS / NestJS 现有模式

---

## 1. 背景

当前 `getPlugins()` 是同步阻塞链：

```text
createApp()
  → getPlugins()
    → await maybeMail()       // 动态 import + 实例化
  → app.create(AppModule)
    → beforeModulesRegistered // mail 初始化 providers
    → afterModulesRegistered  // 仅日志
  → return hono
```

Cloudflare runtime 中，`runHealthChecks()` 已通过 `ctx.waitUntil` 后台执行，但 `getPlugins()` 本身仍然在主请求链路上。当 mail 配置了 SMTP provider 时，`ensureInit()` 建立连接 + `verify()` 可能耗时30+秒。

根本问题：**框架缺少统一的服务生命周期管理层**。每个 plugin 各自管理自己的启动/关闭/健康检查，没有统一的状态追踪和依赖排序。

### 当前痛点

| 问题 | 位置 | 影响 |
|------|------|------|
| Mail init 阻塞主链路 | `plugins.ts:65` | 首请求30s+ |
| 无统一健康状态 | 各 plugin 自行实现 | `/health` 端点不完整 |
| 无优雅关闭 | runtime 各自处理 | 连接泄漏风险 |
| 依赖关系隐式 | 硬编码在 `getPlugins()` | 难以扩展 |
| `waitUntil` 需手动获取 | 各 runtime 文件各自 import `Platform` | 不够统一 |

---

## 2. 设计目标

- **HTTP 先启动，后台服务随后初始化** — 核心目标
- Build Phase 与 Runtime Phase 严格分离
- 所有后台服务统一管理
- 支持生命周期状态机
- 支持服务依赖关系和拓扑排序
- 支持健康检查
- 支持自动重连（指数退避）
- 支持优雅关闭
- 跨 Runtime（CF Workers / Node / Bun）

---

## 3. 接口设计

### 3.1 IPlugin — 统一生命周期接口

**变更说明**：不再使用多接口分组（IRuntimePlugin / IHealthAware / IDependent），而是将所有可选钩子合入 `IPlugin`，参考 NestJS 的 `OnApplicationBootstrap` / `OnApplicationShutdown` 模式。

一个 plugin 类实现所有钩子，无需多接口组合。新字段均为 optional，现有 plugin 完全不受影响。

```ts
interface IPlugin {
  readonly name: string;

  // ── Build Phase ──────────────────────────────────────────
  // HTTP 未启动，Module 未实例化

  /** DI 注册前：注册 providers、配置 logger、注册路由 */
  beforeModulesRegistered?(app: Application, hono: Hono): void | Promise<void>;

  /** DI 注册后：容器/配置/logger/module/controller 已就绪 */
  afterModulesRegistered?(app: Application, hono: Hono): void | Promise<void>;

  // ── Runtime Phase ────────────────────────────────────────
  // HTTP 已启动，后台服务初始化阶段

  /** 后台启动服务，不阻塞 HTTP（替代 IRuntimePlugin.bootstrap） */
  onBootstrap?(): Promise<void>;

  /** 优雅关闭（替代 IRuntimePlugin.shutdown） */
  onShutdown?(): Promise<void>;

  // ── Health & Dependencies（跨阶段可选）────────────────────

  /** 返回当前服务健康状态（替代 IHealthAware.health） */
  onHealthCheck?(): ServiceHealth;

  /** 声明依赖的其他 plugin 名称或 DI Token */
  dependsOn?: (string | Function)[];
}
```

### 3.2 使用示例

```ts
// 简单 plugin：仅 Build Phase
class LoggerPlugin implements IPlugin {
  name = 'app:logger';
  beforeModulesRegistered() { /* 配置 logger */ }
  afterModulesRegistered()  { /* logger 已可用 */ }
}

// 完整 plugin：Build + Runtime + Health + Dependencies
class RedisPlugin implements IPlugin {
  name = 'app:redis';
  dependsOn = ['app:cache'];

  // ── Build Phase ──
  beforeModulesRegistered() { /* 注册 redis config provider */ }
  afterModulesRegistered()  { /* logger、config 已可用 */ }

  // ── Runtime Phase ──
  async onBootstrap() { await this.connect(); }
  async onShutdown()  { await this.disconnect(); }

  // ── Health ──
  onHealthCheck(): ServiceHealth {
    return { status: this.connected ? 'ready' : 'error' };
  }
}

// 轻量 plugin：仅 Runtime Phase（无需 Build 钩子）
class MailPlugin implements IPlugin {
  name = 'app:mail';
  dependsOn = ['app:cache'];

  async onBootstrap() { await this.warmUp(); }
  async onShutdown()  { await this.close(); }
  onHealthCheck()     { return { status: this.ready ? 'ready' : 'starting' }; }
}
```

### 3.3 依赖声明：支持字符串和 DI Token 两种模式

```ts
// 字符串模式（简单，适用于轻量场景）
class MailPlugin implements IPlugin {
  dependsOn = ['app:cache'];
}

// DI Token 模式（类型安全，利用 DI 容器解析依赖）
class MailPlugin implements IPlugin {
  dependsOn = [CacheService];  // 由 PluginEngine 通过 DI 容器解析
}
```

---

## 4. 完整生命周期

```text
Build Phase                                          Runtime Phase
─────────────────                                    ─────────────────
                                                      
createApplication()                                  
    │                                                
    ▼                                                
beforeModulesRegistered()                            
  ├─ plugin A: 注册 providers                        
  ├─ plugin B: 配置 logger                           
  └─ plugin C: 注册路由                              
    │                                                
    ▼                                                
Register Modules                                     
  ├─ DI 容器实例化                                    
  ├─ Controller / Service / Config 就绪              
  └─ Middleware 注册完成                              
    │                                                
    ▼                                                
afterModulesRegistered()                             
  ├─ plugin A: providers 已可用                      
  ├─ plugin B: logger 已可用                         
  └─ plugin C: 路由已注册                            
    │                                                
    ▼                                                
Application Built                                    listen()  ← CF: export default / Node: serve()
    │                                                        │
    │  ┌─────────────────────────────────────────────────────┘
    │  │
    │  ▼
    │  HTTP Server Ready        ←──── 从此刻起可以接收请求
    │      │
    │      ▼
    │  Background Services Bootstrap
    │  ├─ Redis connecting...     (后台)
    │  ├─ Mail warming-up...      (后台)
    │  ├─ D1 ready                (binding，立即就绪)
    │  └─ Cache warming-up...     (后台)
    │      │
    │      ▼
    │  Application Ready         ←──── 所有服务就绪
    │
    ▼
  export default hono / app      ← 对外暴露
```

### 阶段划分

| 阶段 | 范围 | HTTP 状态 | 典型操作 |
|------|------|-----------|----------|
| **Build Phase** | createApp → afterModulesRegistered | ❌ 未启动 | providers 注册、DI 实例化、路由配置、logger 配置 |
| **Build Complete** | afterModulesRegistered → listen | ❌ 未启动 | Framework 已构建，等待部署 |
| **Runtime Phase** | listen → HTTP Ready | ✅ 监听中 | export default hono（CF）/ serve()（Node） |
| **Bootstrap** | HTTP Ready → Application Ready | ✅ 可接收请求 | 后台连接数据库、预热缓存、预热邮件 |
| **Steady State** | Application Ready → shutdown | ✅ 正常服务 | 处理请求 |

### 关键区分：Build Phase vs Runtime Phase

```text
Build Phase（Framework Building）:
  - HTTP 未启动
  - Module 还未实例化完成
  - 优先级：config → logger → DI → middleware → controller → route
  - 结束标志：afterModulesRegistered() 全部完成

Runtime Phase（Application Running）:
  - HTTP 已启动
  - Module 已实例化并可用
  - 后台服务异步初始化
  - 结束标志：所有 IPlugin.onBootstrap() 完成
```

---

## 5. 与现有架构的关系

### 5.1 Application — PluginEngine 取代 RuntimeManager + PluginRunner

**变更说明**：不引入独立的 RuntimeManager，而是将运行时生命周期能力并入 `PluginEngine`（或保持原名 `PluginRunner` 扩展）。`Application` 只需要一个生命周期管理器。

```ts
// packages/honest/src/plugin-engine.ts
class PluginEngine {
  private services = new Map<string, ManagedService>();

  /** 注册 IPlugin */
  register(plugin: IPlugin): void;

  /** Build Phase：执行 beforeModulesRegistered / afterModulesRegistered */
  async runBuildPhase(): Promise<void>;

  /** Runtime Phase：拓扑排序后按层并发启动 onBootstrap */
  async runBootstrap(): Promise<void>;

  /** Shutdown Phase：按依赖逆序执行 onShutdown */
  async runShutdown(): Promise<void>;

  /** 获取单个服务状态 */
  getService(name: string): ServiceHealth;

  /** 聚合所有服务健康状态 */
  health(): Record<string, ServiceHealth>;

  /** 重启单个服务 */
  async restart(name: string): Promise<void>;
}

// packages/honest/src/application.ts
class Application {
  private pluginEngine: PluginEngine;
  private context: ApplicationContext;

  constructor(options) {
    this.pluginEngine = new PluginEngine(this.logger);
    this.context = new ApplicationContext(/* ... */);
  }

  getPluginEngine(): PluginEngine { return this.pluginEngine; }
  getContext(): IApplicationContext { return this.context; }
}
```

### 5.2 IApplicationContext 增加 waitUntil（不改名）

**变更说明**：保留 `ApplicationContext` 命名，不重命名为 PipelineContext。NestJS 用 `ApplicationContext`，HonestJS 现有用户已熟悉，重命名增加迁移成本而收益有限。`waitUntil` 作为新增方法加入。

```ts
interface IApplicationContext {
  // ...existing get/set/has/delete/keys...

  /** 后台执行任务（CF: ctx.waitUntil，Node: 直接 catch 错误） */
  waitUntil(promise: Promise<unknown>): void;
}
```

实现从 `Platform.context()` 注入：

```ts
// packages/honest/src/application-context.ts
class ApplicationContext implements IApplicationContext {
  // ...existing Map store...

  waitUntil(promise: Promise<unknown>): void {
    const ctx = Platform.context();
    if (ctx.waitUntil) {
      ctx.waitUntil(promise);  // CF: fire-and-forget
    } else {
      promise.catch((err) => this.logger?.error({ err }, '[runtime] background task failed'));
    }
  }
}
```

任何拿到 `ctx` 的代码都可以 `ctx.waitUntil(...)` 而不需要 import `Platform`。

### 5.3 文件结构

```text
packages/honest/src/
├── plugin-engine.ts             // PluginEngine（生命周期总管理器）
├── lifecycle.ts                 // ServiceStatus enum + 状态机
├── health.ts                    // 健康检查聚合
├── topology.ts                  // 依赖拓扑排序
├── reconnect.ts                 // 重连策略
├── interfaces/
│   └── plugin.interface.ts      // IPlugin（统一接口，含所有钩子）
├── application.ts               // 持有 PluginEngine，创建 ApplicationContext
├── application-context.ts       // IApplicationContext 实现（含 waitUntil）
└── ...
```

---

## 6. Application 启动流程（分 Runtime）

### CF Workers

```ts
// runtime/cloudflare.ts
export default {
  async fetch(request, env, executionCtx) {
    return Platform.run(
      {
        platform: 'cloudflare',
        env,
        request,
        executionContext: executionCtx,
        waitUntil: executionCtx.waitUntil.bind(executionCtx),
      },
      async () => {
        if (!cachedHono) {
          // ── Build Phase（同步链路，HTTP 未启动）──
          const hono = new Hono();
          const app = await createApp(hono);

          // ── Runtime Phase 开始 ──
          // CF: 立即开始监听，后台服务由 ctx.waitUntil 调度
          const engine = app.getPluginEngine();
          const ctx = app.getContext();
          ctx.waitUntil(engine.runBootstrap());

          cachedApp = app;
          cachedHono = hono;
        }
        return cachedHono.fetch(request, env, executionCtx);
      },
    );
  },
};
```

### Node / Bun

```ts
// runtime/serve.ts
const app = await createApp();
const engine = app.getPluginEngine();

// ── Runtime Phase 开始 ──
// Node: HTTP 先启动，后台服务随后初始化
const server = serve(
  { fetch: app.hono.fetch, port },
  async () => {
    logger.info(`HTTP server running at http://localhost:${port}`);
    // 后台启动所有服务
    await engine.runBootstrap();
    logger.info('application ready');
  },
);

const shutdown = async (signal: string) => {
  logger.info(`received ${signal}, shutting down...`);
  await engine.runShutdown();
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

### 时序图

```text
CF Workers:
  createApp (Build Phase)   ████
  HTTP Ready                ──────────────────────────────►
  Redis connecting...           ████████████
  Mail warming-up...            ██████████████████████████████
  D1 ready                      █ (binding)

Node/Bun:
  createApp (Build Phase)   ████
  HTTP Ready                ──────────────────────────────►
  Redis connecting...           ████████████
  Mail warming-up...            ██████████████████████████████
  D1 connecting...              ██████████
```

---

## 7. 启动策略矩阵

| 策略 | 接口方法 | 行为 | 适用场景 |
|------|----------|------|----------|
| **Sync Init** | `beforeModulesRegistered` / `afterModulesRegistered` | Build Phase 完成即就绪 | DI 注册、路由、logger、config |
| **Background Bootstrap** | `onBootstrap` | HTTP 后台初始化 | Redis、Mail、Cache warmup |
| **Binding** | `onBootstrap`（立即返回） | CF binding，无需实际连接 | D1/KV |

### 轻量级服务

```ts
class CachePlugin implements IPlugin {
  name = 'app:cache';

  beforeModulesRegistered() {
    // 注册 config provider（<10ms）
  }

  afterModulesRegistered() {
    // 仅日志
  }
  // 无 onBootstrap —— 没有后台服务需要管理
}
```

### 完整服务

```ts
class MailPlugin implements IPlugin {
  name = 'app:mail';
  dependsOn = ['app:cache'];

  // ── Build Phase ──
  beforeModulesRegistered() {
    // 注册 mail providers（<10ms）
  }

  afterModulesRegistered() {
    // logger 已可用
    this.logger.info('mail providers registered, health check will run in background');
  }

  // ── Runtime Phase ──
  async onBootstrap() {
    // HTTP 已启动，后台预热
    await this.warmUp();
    await this.runHealthChecks();
  }

  async onShutdown() {
    await this.close();
  }

  // ── Health ──
  onHealthCheck(): ServiceHealth {
    return {
      status: this.ready ? 'ready' : 'starting',
      reconnectCount: this.reconnectCount,
    };
  }
}
```

---

## 8. 生命周期状态机

每个后台服务具有统一生命周期：

```text
STOPPED
    │
    ▼
STARTING
    │
    ▼
READY
    │
    ▼
STOPPING
    │
    ▼
STOPPED
```

异常路径：

```text
READY
    │
    ▼
ERROR ──── 超过最大重试 ────► DEAD (不再重连)
    │
    ▼
RECONNECTING
    │
    ▼
READY (成功) 或 ERROR (失败)
```

```ts
enum ServiceStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  READY = 'ready',
  STOPPING = 'stopping',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  DEAD = 'dead',
}

interface ServiceHealth {
  status: ServiceStatus;
  error?: string;
  lastCheck?: number;
  uptime?: number;
  reconnectCount?: number;
}
```

---

## 9. 服务依赖

PluginEngine 根据 `IPlugin.dependsOn` 进行拓扑排序，同层并发：

```text
Layer 0:  DB (D1), Cache (KV)      ← 无依赖，并发启动
Layer 1:  Redis, Mail               ← dependsOn: ['app:cache']
Layer 2:  EventBus                  ← dependsOn: ['app:cache', 'app:db']
```

支持两种依赖声明方式：

| 模式 | 示例 | 适用场景 |
|------|------|----------|
| **字符串模式** | `dependsOn: ['app:cache']` | 轻量场景，按名称匹配 |
| **DI Token 模式** | `dependsOn: [CacheService]` | 类型安全，通过 DI 容器解析实例 |

检测循环依赖：构建时抛出错误。

---

## 10. 错误处理策略

| 场景 | 策略 | HTTP 影响 |
|------|------|-----------|
| 后台服务启动失败 | 标记 ERROR，继续启动其他服务 | HTTP 正常运行 |
| 请求时服务不可用 | 返回503 + `Retry-After` | 中间件拦截 |
| 重连成功 | 自动恢复 READY | 自动恢复 |
| 超过最大重试 | 标记 DEAD，停止重连 | 持续503 |
| 单服务崩溃 | 仅影响该服务 | 部分降级 |

### 503 降级中间件

```ts
function requireService(name: string) {
  return async (c: Context, next: Next) => {
    const engine = c.get('pluginEngine');
    const health = engine.getService(name);
    if (health.status !== ServiceStatus.READY) {
      return c.json(
        { error: `${name} service unavailable`, status: health.status },
        503,
        { 'Retry-After': '5' },
      );
    }
    return next();
  };
}

app.post('/api/mail/send', requireService('app:mail'), sendMailHandler);
```

---

## 11. 自动重连

```ts
interface ReconnectConfig {
  strategy: 'fixed' | 'exponential';
  initialDelayMs: number;    // 默认 1000
  maxDelayMs: number;        // 默认 30000
  maxRetries: number;        // 默认 Infinity
  jitter: boolean;           // 默认 true
}
```

指数退避示例：

```text
Attempt 1:  1s
Attempt 2:  2s
Attempt 3:  4s
Attempt 4:  8s
Attempt 5:  16s
Attempt 6:  30s (cap)
```

---

## 12. Health Check 端点

```text
GET /health
```

```json
{
  "status": "healthy",
  "services": {
    "app:db":    { "status": "ready", "uptime": 120000 },
    "app:cache": { "status": "ready", "uptime": 120000 },
    "app:redis": { "status": "ready", "uptime": 60000 },
    "app:mail":  { "status": "starting", "reconnectCount": 0 }
  }
}
```

聚合逻辑：所有 READY → `"healthy"` / 任意 STARTING → `"degraded"` / 任意 ERROR → `"unhealthy"`

---

## 13. 优雅关闭

### Node / Bun

```ts
const shutdown = async (signal: string) => {
  logger.info(`received ${signal}, shutting down...`);
  await engine.runShutdown();    // 按依赖逆序关闭
  server.close(() => process.exit(0));
};
```

关闭顺序：

```text
SIGTERM
  → 停止接受新请求
  → EventBus (Layer 2)
  → Redis, Mail (Layer 1)
  → DB, Cache (Layer 0)
  → Exit
```

### CF Workers

CF Worker 被回收时自动清理。`waitUntil` 中的任务会完成当前执行。保证不丢消息（event-bus 先于 db 关闭）、不泄漏连接。

---

## 14. 实施步骤

### Phase 1：接口统一 + PluginEngine（不改变行为）

1. **扩展 IPlugin**：新增可选钩子 `onBootstrap` / `onShutdown` / `onHealthCheck` / `dependsOn`，现有 `IPlugin` 保持不变
2. **保留 ApplicationContext 命名**：仅新增 `waitUntil()` 方法，不重命名
3. **实现 PluginEngine**：
   - 合并现有 PluginRunner + RuntimeManager 能力
   - `register(plugin)` / `runBuildPhase()` / `runBootstrap()` / `runShutdown()` / `health()` / `getService(name)` / `restart(name)`
4. **实现 ServiceStatus 状态机**（`lifecycle.ts`）
5. **实现拓扑排序**（`topology.ts`），支持字符串和 DI Token 两种依赖
6. **实现重连策略**（`reconnect.ts`）
7. **Application 自动创建 PluginEngine**，通过 `app.getPluginEngine()` 访问
8. 现有 plugin 不做任何修改（新钩子 optional）

### Phase 2：Mail Plugin 适配

1. `MailPlugin` 新增 `onBootstrap()` / `onShutdown()` / `onHealthCheck()` / `dependsOn`
2. 从 `cloudflare.ts` 中移除手写的 `waitUntil(runHealthChecks())` —— 由 PluginEngine 统一调度

### Phase 3：DB + Cache + Redis Plugin 适配

1. 各 plugin 实现新生命周期钩子
2. 验证依赖排序正确

### Phase 4：Health 端点 + 优雅关闭

1. 添加 `GET /health` 端点
2. Node runtime 添加 SIGTERM/SIGINT 处理
3. 503 降级中间件

---

## 15. 未解决问题

1. **CF Workers 的 `waitUntil` 超时**：CF 的 `waitUntil` 最大 90 秒，如果所有服务 bootstrap 超时，框架应如何处理？建议 `PluginEngine.runBootstrap()` 应有整体超时。

2. **Node 环境的 Server-Sent Events / WebSocket**：这些场景需要在 HTTP Ready 之前注册路由，但后台服务可能还没就绪。建议在 `afterModulesRegistered` 阶段注册所有路由（包括 WS/SSE），这样 HTTP Ready 时路由已完整。

3. **脱离 DI 容器的 Plugin**：`dependsOn` 字符串模式无法利用容器生命周期管理。建议未来统一走 DI Token 模式。

4. **Module 级别生命周期**：当前生命周期仅存在于 plugin 层面。未来可以允许 `@Module()` 也实现 `IPlugin` 的可选钩子，使模块级生命周期更自然。

---

## 16. 参考链接

- HonestJS Plugin 文档：https://honestjs.dev/docs/features/plugins
- HonestJS DI 文档：https://honestjs.dev/docs/concepts/dependency-injection
- NestJS Lifecycle Events：https://docs.nestjs.com/fundamentals/lifecycle-events
