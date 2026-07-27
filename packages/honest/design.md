# Honest 框架设计

> Honest 是一个基于 Hono 的装饰器 Web 框架，提供 Controller/Module/Service 模式、依赖注入、插件系统和运行时上下文管理。

## 设计原则

1. **零开销** — 装饰器只写 `reflect-metadata`，不注册插件时不产生副作用
2. **运行时无关** — 通过 `@rx-ted/packages-core` 的 Runtime 抽象，一套代码同时支持 Node / Bun / Cloudflare Workers
3. **可组合** — 插件系统通过 hook 介入生命周期，不侵入核心逻辑
4. **DI 优先** — 构造函数注入 + `@Service()` 自动注册

## 核心架构

```
Application.create(RootModule, options)
  │
  ├─ Runtime.setAppContext(...)          ← 设置应用级运行上下文
  ├─ MetadataRepository.snapshot()      ← 快照装饰器元数据
  ├─ new Application(options)           ← 初始化 Hono / DI / Logger
  │
  ├─ plugins[].beforeModulesRegistered  ← 插件预注册（如数据库连接）
  ├─ app.register(RootModule)           ← 注册模块、控制器、路由
  │   ├─ DI 解析依赖
  │   └─ RouteManager 注册 Hono 路由
  ├─ plugins[].afterModulesRegistered   ← 插件后处理（如生成 API 文档）
  │
  └─ return { app, hono }
```

### 运行上下文 (Runtime)

每个请求进入时，Honest 通过 Hono 中间件设置 `AsyncLocalStorage` 上下文：

```
Request → Hono middleware → Runtime.run({ platform, env, request }) → handler
```

应用层在 `Application.create()` 时通过 `Runtime.setAppContext()` 设置默认上下文。
请求层的上下文会与 app 上下文合并（`Runtime.env()` 合并两者）。

下游代码可通过 `@rx-ted/packages-core` 的 `env` / `Runtime` 访问：

```typescript
import { env, Runtime } from '@rx-ted/packages-core';

env.PLATFORM          // 'node' | 'cloudflare' | 'bun' | ...
env.IS_PROD           // boolean
env.IS_TEST           // boolean
env.get('DATABASE_URL')
env.require('API_KEY')

Runtime.request()     // 当前 Request 对象
Runtime.platform()    // 当前运行时
Runtime.context()     // 完整 RuntimeContext
```

### 装饰器系统

装饰器只存元数据到 `reflect-metadata`，零运行时开销：

| 装饰器 | 作用 |
|--------|------|
| `@Module({ controllers, services, imports })` | 声明模块依赖 |
| `@Controller(prefix, options)` | 声明控制器 |
| `@Service()` | 标记为可注入服务 |
| `@Get / @Post / @Put / @Delete / @Patch` | 注册 HTTP 路由 |
| `@Body / @Param / @Query / @Header / @Ctx / @Req` | 参数注入 |
| `@Inject(token)` | 显式注入依赖（用于 esbuild 等不支持 emitDecoratorMetadata 的场景） |
| `@UseMiddleware / @UseGuards / @UsePipes / @UseFilters` | 声明中间件/守卫/管道/过滤器 |

### 依赖注入 (DI)

基于 `reflect-metadata` 的 `design:paramtypes` 自动解析构造函数依赖：

```typescript
@Service()
class UserService {
  constructor(private db: DbService) {}  // 自动注入
}
```

对于 esbuild / Cloudflare Workers 场景，使用 `@Inject()`：

```typescript
@Injectable()
class UserService {
  constructor(@Inject(DbService) private db: DbService) {}
}
```

DI 容器使用层序遍历解析依赖，检测循环依赖并报错。

### 插件系统

插件通过 `IPlugin` 接口介入应用生命周期：

```typescript
interface IPlugin {
  logger?: ILogger;
  beforeModulesRegistered?: (app, hono) => void | Promise<void>;
  afterModulesRegistered?: (app, hono) => void | Promise<void>;
}
```

插件可选的 pre/post processors 允许编排组合顺序：

```typescript
Application.create(Module, {
  plugins: [
    { plugin: new DbPlugin(), preProcessors: [...], postProcessors: [...] },
  ],
});
```

### Logger

使用 `@rx-ted/packages-core` 的 `Logger` 类作为默认实现：

- 开发环境默认 `level: 'debug'`
- 测试环境自动静默（`NOOP_LOGGER`）
- 支持通过 `options.logger` 传入自定义 `ILogger`
- 每个插件的 `plugin.logger = app.logger` 自动注入框架级 Logger
- 子 Logger 通过 `child({ module: 'xxx' })` 创建

### 插件包 (honest-plugins)

独立子包，每个封装特定功能：

| 包 | 功能 |
|----|------|
| `honest-plugins-db` | 数据库：MySQL（Drizzle ORM）、D1、SQLite、Schema Builder |
| `honest-plugins-cache` | 缓存：Redis、Cloudflare KV |
| `honest-plugins-mail` | 邮件：Resend、Brevo、SMTP |
| `honest-plugins-api-doc` | OpenAPI 文档：Scalar UI、Swagger UI |

### 目录结构

```
packages/honest/src/
├── application.ts              ← Application 主类
├── application-context.ts      ← Map 背书的上下文
├── components/                 ← Layout 组件
├── constants/                  ← 版本号、pipeline 常量
├── decorators/                 ← 所有装饰器
├── di/                         ← DI 容器
├── errors/                     ← 框架错误
├── handlers/                   ← onError / notFound 默认处理
├── helpers/                    ← 工具函数（创建方法/参数装饰器）
├── interfaces/                 ← 所有 TypeScript 接口
├── managers/                   ← 路由管理、组件管理、pipeline
├── plugins/                    ← 内置插件
├── registries/                 ← 元数据注册表
├── testing/                    ← 测试辅助工具
├── types/                      ← Constructor 类型
└── utils/                      ← 通用工具（normalizePath 等）
```

## 使用示例

```typescript
import { Module, Controller, Get, Service, Application } from '@rx-ted/packages-honest';

@Service()
class AppService {
  getHello() { return 'Hello Honest'; }
}

@Controller('/api')
class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/hello')
  hello() {
    return this.appService.getHello();
  }
}

@Module({ controllers: [AppController], services: [AppService] })
class AppModule {}

const { hono } = await Application.create(AppModule, { debug: { routes: true } });
```

## 测试

Honest 提供 `createTestApplication()` 等测试辅助：

```typescript
import { createTestApplication } from '@rx-ted/packages-honest/testing';

const testApp = await createTestApplication({
  module: AppModule,
});
const res = await testApp.request('/api/hello');
expect(res.status).toBe(200);
```
