# Event Bus: 共享异步消息基础设施

> **Status: SUPERSEDED** — Event Bus 已从项目中移除，BullMQ 不再使用。

## 概述

将当前模块各自维护的 BullMQ 用法（UserLayoutQueue）抽取为独立共享包 `@rx-ted/packages-event-bus`，与 Redis-backed PubSub 共同组成 Event Bus 基础设施，通过 Honest 插件 `EventBusPlugin` 统一管理初始化、生命周期和 DI 注入。

### Event Bus 架构

```
packages/event-bus/
├── QueueManager          BullMQ 队列管理（连接/队列/Worker）
├── PubSub                Redis Pub/Sub 实时消息（接口不变，跨实例）
├── QueueService          Honest DI 代理（像 DbService/CacheService）
└── EventBusPlugin        Honest 插件 — 初始化全部 + EventBridge

应用层：
  websocket.ts、NotificationService 使用 pubsub 单例
  UserLayoutConsumer / MailConsumer 注入 QueueService 使用队列
  EventBridge 在插件内将 QueueManager 事件 → PubSub → WebSocket
```

### 与现有模式的对比

| 角色 | 已有模式 | EventBus 模式 |
|------|----------|--------------|
| MySQL 接入 | MysqlPlugin → DbService (DI) | 相同模式 |
| Redis 缓存 | RedisPlugin → CacheService (DI) | **PubSub + QueueManager 相同模式** |
| 队列管理 | UserLayoutQueue (自建 Queue/Worker) | EventBusPlugin → QueueService (DI) |
| 实时推送 | in-memory PubSub (仅单进程) | Redis Pub/Sub (跨实例) |

## 1. 包 `@rx-ted/packages-event-bus`

### 目录结构

```
packages/event-bus/
├── src/
│   ├── index.ts                 # 导出所有公共 API
│   ├── types.ts                 # JobMap, RealtimeEvent, QueueConfig, WorkerConfig
│   ├── queue-manager.ts         # QueueManager 单例
│   ├── pubsub.ts                # PubSub 类 + 单例（Redis-backed，接口兼容）
│   ├── event-bus-plugin.ts      # Honest 插件：初始化全流程
│   └── queue-service.ts         # QueueService — Honest DI 代理
├── package.json
├── tsconfig.json
```

### JobMap 类型注册表

每个队列的名称和 payload 类型集中定义在 `JobMap` 中，新模块加入时在此添加：

```typescript
// packages/event-bus/src/types.ts

export interface JobMap {
  'layout-config-sync': {
    userId: string;
    layoutId: string;
    config: Record<string, unknown>;
    version: number;
    timestamp: number;
  };
  'mail:send': {
    mailLogId: number;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  };
}

export type JobData<T extends keyof JobMap> = JobMap[T];

export interface QueueConfig {
  defaultJobOptions?: {
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
    removeOnComplete?: { age: number } | boolean;
    removeOnFail?: { age: number } | boolean;
  };
}

export interface WorkerConfig {
  concurrency?: number;
  limiter?: { max: number; duration: number };
}

/** registerWorker 的标识策略：同队列可注册多个不同 role 的 Worker */
export interface WorkerIdentity<T extends keyof JobMap> {
  queueName: T;
  role: string;     // 如 'default' | 'flush' | 'dead-letter'
}

export interface JobHandler<T> {
  (job: Job<T>): Promise<void>;
}

export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
```

### QueueManager 单例

遵循代码库已有模式（`pubsub` / `wsServer`），不是 `@Service()`，而是手动导出的单例：

```typescript
// packages/event-bus/src/queue-manager.ts

export class QueueManager {
  static getInstance(): QueueManager;

  /** 初始化 Redis 连接（app 启动时调用一次） */
  initialize(config: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    prefix?: string;      // 多环境共用 Redis 时隔离队列键前缀，默认 'bull'
  }): void;

  /** 获取已注册的队列实例（不存在则创建） */
  getQueue<T extends keyof JobMap>(
    name: T,
    opts?: QueueConfig,
  ): Queue<JobMap[T]>;

  /** 注册 Worker（同 queueName + role 不可重复注册） */
  registerWorker<T extends keyof JobMap>(
    identity: WorkerIdentity<T>,
    handler: JobHandler<JobMap[T]>,
    opts?: WorkerConfig,
  ): Worker;

  /** 获取一个独立的 IORedis 连接（给 flush 场景使用临时 Worker） */
  getConnection(): IORedis;

  /** 监听 Worker 事件（事件 payload 自带 isFinal 标记，无需调用方自行判断重试次数） */
  on(event: 'job:completed' | 'job:failed', listener: (payload: {
    queueName: string;
    job: Job;
    error?: Error;
    isFinal: boolean;       // 仅 job:failed：true = 所有重试已耗尽，false = 还有重试机会
  }) => void): void;

  /** 优雅关闭所有 Workers 和连接 */
  async shutdown(): Promise<void>;

  /** 获取所有队列的统计（监控用） */
  async getQueueStats(): Promise<QueueStats[]>;
}
```

**生命周期**：
1. `initialize()` — 应用启动时调用一次，创建独立 IORedis 连接
2. Worker 随模块注册，同 `queueName + role` 不可重复注册（防止重复 Worker）
3. `shutdown()` — 关闭所有 Worker → 关闭 Queue → 关闭 Redis 连接
4. 注册 `SIGTERM`/`SIGINT` 时调用 `shutdown()`

### PubSub — Redis-backed 实时消息

将现有 `apps/platform-api/src/lib/pubsub.ts` 的 `PubSub` 类迁移到包内，接口完全兼容。升级为 Redis Pub/Sub 后端，确保 EventBridge 推送跨实例可靠：

```typescript
// packages/event-bus/src/pubsub.ts

export interface RealtimeEvent {
  type: string;
  userId?: string;
  data: unknown;
  timestamp: number;
}

export class PubSub {
  initialize(config: RedisConfig): void;            // 创建 subscribe + publish 连接
  subscribe(channel: string, handler): () => void;   // 本地注册 + Redis SUBSCRIBE
  subscribeToUser(userId: string, handler): () => void;
  publish(channel: string, event: RealtimeEvent): Promise<void>;   // 本地分发 + Redis PUBLISH
  publishToUser(userId: string, type: string, data: unknown): Promise<void>;
  broadcast(type: string, data: unknown): Promise<void>;
  shutdown(): Promise<void>;
}

export const pubsub = new PubSub();
```

**关键设计**：
- 未调用 `initialize()` 时退化为纯本地模式，与现有行为一致
- `initialize()` 后：`publish()` **仅通过 Redis PUBLISH**（不再本地分发），`subscribe()` 注册本地 handler + Redis SUBSCRIBE，Redis subscriber 收到消息后反序列化分发给本地 handlers——避免同实例双重分发
- 未初始化时：`publish()` 仅本地分发，`subscribe()` 仅注册本地 handler
- 需要两个独立 IORedis 连接（subscribe 连接不能执行其他命令）
- `subscribeToPattern()` 使用 Redis `PSUBSCRIBE`
- `subscribe()` 同步返回 unsubscribe 函数，Redis SUBSCRIBE 是 fire-and-forget。**重要**：调用 `subscribe()` 后立即 `publish()` 可能因 Redis 订阅未就绪而丢消息。系统级服务（如 AlertService）应在初始化完成后、业务开始前建立订阅

### EventBusPlugin — Honest 插件

插件在 `beforeModulesRegistered()` 中完成全部初始化，确保模块构造时所有基础设施就绪：

```typescript
// packages/event-bus/src/event-bus-plugin.ts

export const QUEUE_MANAGER_KEY = 'event-bus:queue-manager';

export interface EventBusPluginOptions {
  redis: {
    host: string;
    port: number;
    username?: string;
    password?: string;
  };
  prefix?: string;       // BullMQ 队列键前缀，多环境隔离
}

export class EventBusPlugin implements IPlugin {
  constructor(private options: EventBusPluginOptions) {}

  async beforeModulesRegistered(app: Application): Promise<void> {
    // (1) 初始化 PubSub（Redis 后端）
    pubsub.initialize(this.options.redis);

    // (2) 初始化 QueueManager
    QueueManager.getInstance().initialize({
      ...this.options.redis,
      prefix: this.options.prefix ?? 'app',
    });

    // (3) 设置 EventBridge：Worker 事件 → PubSub → WebSocket
    this.setupEventBridge();

    // (4) 注册到 ComponentManager，供 QueueService DI 代理
    ComponentManager.registerPlugin(QUEUE_MANAGER_KEY, QueueManager.getInstance());
  }

  async afterModulesRegistered(app: Application): Promise<void> {}

  async close(): Promise<void> {
    await QueueManager.getInstance().shutdown();
    await pubsub.shutdown();
  }

  private setupEventBridge(): void {
    // 每次失败都发布（含中间重试，由 isFinal 区分是否最终失败）
    QueueManager.getInstance().on('job:failed', ({ queueName, job, error, isFinal }) => {
      pubsub.publish(`bus:${queueName}`, {
        type: 'job:failed',
        data: { queueName, jobId: job.id, error: error?.message, isFinal },
        timestamp: Date.now(),
      });

      // 仅在最终失败时额外发布到告警频道
      if (isFinal) {
        pubsub.publish('bus:final-fail', {
          type: 'job:finalFailed',
          data: { queueName, jobId: job.id, error: error?.message },
          timestamp: Date.now(),
        });
      }
    });
  }
}
```

**EventBridge 订阅通道**：`bus:{queueName}`，前端/其他模块通过 `pubsub.subscribe('bus:layout-config-sync', handler)` 订阅。PubSub 已是 Redis 后端，推送跨实例可靠。

### QueueService — Honest DI 代理

遵循 DbService / CacheService 已有的"构造函数返回"模式，使消费者通过常规 DI 注入使用 QueueManager：

```typescript
// packages/event-bus/src/queue-service.ts

import { Service, ComponentManager } from '@rx-ted/packages-honest';
import { QUEUE_MANAGER_KEY } from './event-bus-plugin';

@Service()
export class QueueService {
  constructor() {
    return ComponentManager.getPlugin<QueueManager>(QUEUE_MANAGER_KEY);
  }
}
export interface QueueService extends QueueManager {}

// 消费者：
@Service()
class UserLayoutConsumer {
  constructor(
    private db: DbService,
    private cache: CacheService,
    private queue: QueueService,    // DI 自动解析，无需在模块 services 中显式声明
  ) {
    this.queue.registerWorker(...)   // → QueueManager.registerWorker
  }
}
```

> QueueService 只需 `@Service()` 装饰 + 被消费者 import，Honest DI 的 `design:paramtypes` 会自动发现并懒加载。无需在 `@Module({ services: [...] })` 中显式声明。

### 导出

```typescript
// packages/event-bus/src/index.ts

export { QueueManager } from './queue-manager';
export { QueueService } from './queue-service';
export { EventBusPlugin, QUEUE_MANAGER_KEY, type EventBusPluginOptions } from './event-bus-plugin';
export { pubsub, PubSub, type RealtimeEvent } from './pubsub';
export type {
  JobMap, JobData, QueueConfig, WorkerConfig, WorkerIdentity, JobHandler, QueueStats,
} from './types';
```

### package.json（遵循 monorepo 现有风格）

```json
{
  "name": "@rx-ted/packages-event-bus",
  "version": "1.0.0",
  "type": "module",
  "description": "Event Bus: async queues + realtime pub/sub infrastructure",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "vitest": "./src/index.ts",
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.0.0"
  },
  "peerDependencies": {
    "@rx-ted/packages-honest": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "tsup": "^8.5.1",
    "typescript": "^6.0.3",
    "vitest": "^4.1.7"
  }
}
```

**platform-api 依赖追加**：

```bash
pnpm add @rx-ted/packages-event-bus@workspace:^ --filter @rx-ted/platform-api
```

---

## 2. 迁移: UserLayoutModule

### 变更内容

| 文件 | 操作 | 说明 |
|------|------|------|
| `user-layout.queue.ts` | **删除** | 不再需要 Queue/Worker 管理，由 QueueManager 替代 |
| `user-layout.consumer.ts` | **重构** | 通过 QueueManager 注册 Worker，移除 Cron Flush |
| `user-layout.service.ts` | **微调** | 调用 `QueueManager.getQueue('layout-config-sync').add()` 替代原 `layoutSyncQueue.enqueue()` |
| `user-layout.module.ts` | **简化** | 移除 `UserLayoutQueue` 的 imports |

### 关于 Cron Flush 的决策

现有 `UserLayoutConsumer` 除常驻 Worker 外，每 30 分钟创建一个临时 Worker 执行 `flush()`（等待队列排空后关闭）。

**问题**：常驻 Worker 已在持续消费；临时 Worker 与之并存抢占同一队列，不仅不保证"全部消费"，在多实例时还会多次触发。

**结论**：**移除 Cron Flush**。常驻 Worker（concurrency: 5）足以应对当前写入量。如需兜底，改为应用启动时检查队列是否有积压并一次性处理，而非周期性重复。

### Consumer 改造后结构（注入 QueueService）

```typescript
@Service()
class UserLayoutConsumer {
  constructor(
    private db: DbService,
    private cache: CacheService,
    private queue: QueueService,    // ← 通过 DI 注入，像 DbService
  ) {
    this.startWorker();
  }

  private startWorker(): void {
    this.queue.registerWorker(
      { queueName: 'layout-config-sync', role: 'default' },
      async (job) => {
        const { userId, layoutId, config, version } = job.data;
        await this.upsertConfig(userId, layoutId, config, version);
      },
      { concurrency: 5 },
    );
  }

  private async upsertConfig(...): Promise<void> { /* 同现有逻辑 */ }
}
```

### Service 改造（注入 QueueService）

```typescript
@Service()
class UserLayoutService {
  constructor(
    private db: DbService,
    private cache: CacheService,
    private queue: QueueService,    // ← 通过 DI 注入
  ) {}

  async saveConfig(userId: string, config: object): Promise<void> {
    // 写缓存 + 入队
    await this.queue.getQueue('layout-config-sync').add(`layout:${userId}`, {
      userId, layoutId: config.layoutId, config, version: Date.now(), timestamp: Date.now(),
    }, { jobId: `layout:${userId}` });
  }
}
```

---

## 4. 迁移: MailModule (异步化)

### 当前问题

- `MailService.send()` 同步等待邮件驱动发送完成
- 发送失败只 `console.error`，没有重试机制
- 发送耗时阻塞 HTTP 响应
- 只有**非紧急邮件**需要异步化；**验证码邮件**保持同步以确保低延迟送达

### 改造目标

- `send()` / `sendFromTemplate()` — **改为异步**：先入队写 `queued` 日志，Worker 发送后更新为 `sent` 或 `failed`
- `sendVerificationCode()` — **保持同步**：验证码需即时送达
- 异步路径加入重试策略（3 次指数退避）
- 失败任务保留在 BullMQ failed set 中，可查询和重试

### 改造方案

**新增**：`mail:send` 队列定义在 JobMap 中

**mailLogs 字段扩展**：

| 字段 | 变更 |
|------|------|
| `status` | 从 `'sent' | 'failed'` 扩展为 `'queued' | 'sent' | 'failed'`，默认 `'queued'` |
| `queued_at` | **新增** `DATETIME(3)`，入队时写入 |
| `error_message` | **新增** `TEXT NULL`，最终失败时记录 |
| `job_id` | **新增** `VARCHAR(64) NULL`，关联 BullMQ 任务 ID |

```sql
ALTER TABLE mail_logs MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'queued';
ALTER TABLE mail_logs ADD COLUMN queued_at DATETIME(3) NULL;
ALTER TABLE mail_logs ADD COLUMN error_message TEXT NULL;
ALTER TABLE mail_logs ADD COLUMN job_id VARCHAR(64) NULL;
```

**MailService 改造**——保持返回契约不变（仍为 `MailSendResultDto`）：

```typescript
@Service()
class MailService {
  // 非紧急邮件 → 先写 queued 日志，再异步入队
  async send(input: Partial<MailEntity>): Promise<MailSendResultDto> {
    // 1. 先写 queued 状态的日志（获取 mailLogId）
    const now = new Date();
    const [result] = await this.db.insert(mailLogs).values({
      recipient: input.to ?? '',
      subject: input.subject ?? '',
      status: 'queued',
      queuedAt: now,
    });

    // 2. 异步入队（带 mailLogId 回调用）
    // 注意：enqueue 失败时必须回滚日志状态，否则会永久卡在 queued
    const qm = QueueManager.getInstance();
    try {
      await qm.getQueue('mail:send').add(
        `mail:${result.insertId}`,
        {
          mailLogId: result.insertId,
          to: input.to!,
          subject: input.subject!,
          html: input.html,
          text: input.text,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    } catch (err) {
      // Redis 入队失败 → 补偿：更新日志为 failed
      await this.db.update(mailLogs)
        .set({
          status: 'failed',
          errorMessage: `Enqueue failed: ${(err as Error).message}`,
          jobId: null,
        })
        .where(eq(mailLogs.id, result.insertId));
      throw err;
    }

    // 3. 立即返回原有 MailSendResultDto（调用方不受影响）
    const [row] = await this.db
      .select()
      .from(mailLogs)
      .where(eq(mailLogs.id, result.insertId))
      .limit(1);
    return MailMapper.toResponse(mapMailLogRow(row));
  }

  // sendFromTemplate() 同样改造：先写 queued 日志，再入队
  async sendFromTemplate(input: { ... }): Promise<MailSendResultDto> { /* 同上模式 */ }

  // 验证码邮件 → 保持同步（即时送达）
  async sendVerificationCode(input: {
    to: string;
    code: string;
    purpose: 'login' | 'register';
    ttlSeconds: number;
    locale: 'zh-CN' | 'en';
  }): Promise<MailSendResultDto> {
    // 完全保持现有实现不变：同步发送驱动 + 同步写 DB status = 'sent'
  }
}
```

**新增**：MailConsumer — Worker 处理器（注入 QueueService）

```typescript
// apps/platform-api/src/modules/mail/mail.consumer.ts

@Service()
class MailConsumer {
  constructor(
    private db: DbService,
    private queue: QueueService,
  ) {
    this.queue.registerWorker(
      { queueName: 'mail:send', role: 'default' },
      async (job) => {
        const mail = getMailDriver();
        if (!mail) throw new Error('Mail driver not available');

        await mail.send({
          to: job.data.to,
          subject: job.data.subject,
          html: job.data.html,
          text: job.data.text ?? '',
        });

        // 成功 → 更新日志为 sent
        await this.db.update(mailLogs)
          .set({ status: 'sent', jobId: job.id, sentAt: new Date() })
          .where(eq(mailLogs.id, job.data.mailLogId));
      },
      { concurrency: 3 },
    );

    // 最终失败 → 更新日志为 failed
    this.queue.on('job:failed', async ({ queueName, job, error, isFinal }) => {
      if (queueName !== 'mail:send') return;
      if (!isFinal) return;
      const data = job.data as JobMap['mail:send'];
      await this.db.update(mailLogs)
        .set({ status: 'failed', errorMessage: job.failedReason, jobId: job.id })
        .where(eq(mailLogs.id, data.mailLogId));
    });
  }
}
```

---

## 4. 失败告警系统

### 动机

操作失败（Redis/MySQL/Mail 异步写入）经 event-bus 重试后，最终仍失败时，需要可靠的告警机制通知负责人。通过现有 NotificationModule + WebSocket + MailModule 打通推送链路。

### 链路

```
QueueManager job:failed 事件
    ↓ (attemptsMade >= maxAttempts)
EventBridge 发布到 bus:final-fail 频道       ← 仅在最终失败时触发
    ↓
AlertService 订阅 → NotificationService.create()
    ├→ notifications 表（持久化）
    ├→ WebSocket 推送给在线负责人            ← 已有（pubsub → wsServer）
    └→ MailModule（可选，关键队列启用）
```

### 变更

#### EventBusPlugin 增强

新增 `bus:final-fail` 频道，仅在最终失败（所有重试耗尽）时触发：

```typescript
// EventBusPlugin.setupEventBridge() 中

// 每次失败都发布（含中间重试）
QueueManager.getInstance().on('job:failed', ({ queueName, job, error }) => {
  pubsub.publish(`bus:${queueName}`, {
    type: 'job:failed',
    data: { queueName, jobId: job.id, error: error.message, attemptsMade: job.attemptsMade },
    timestamp: Date.now(),
  });
});

// 仅在最终失败时发布
QueueManager.getInstance().on('job:failed', ({ queueName, job, error, isFinal }) => {
  if (!isFinal) return;
  pubsub.publish('bus:final-fail', {
    type: 'job:finalFailed',
    data: { queueName, jobId: job.id, error: error.message },
    timestamp: Date.now(),
  });
});
```

#### NotificationService.create()

当前只有 list/read/mark，新增创建接口：

```typescript
@Service()
class NotificationService {
  async create(input: {
    type: string;
    title: string;
    content?: string;
    userIds: string[];           // 通知对象（用户 UUID）
  }): Promise<NotificationResponseDto> {
    const dtos: NotificationResponseDto[] = [];

    for (const userId of input.userIds) {
      const [result] = await this.db.insert(notifications).values({
        userId,
        type: input.type,
        title: input.title,
        content: input.content ?? '',
        isRead: false,
        createdAt: new Date(),
      });

      const [row] = await this.db.select().from(notifications)
        .where(eq(notifications.id, result.insertId)).limit(1);

      const dto = mapRowToDto(row);
      dtos.push(dto);

      // WebSocket 推送（每人自己的通知）
      broadcastToUser(userId, 'notification:created', dto);
    }

    // 缓存失效（确保下次 list 读到新数据）
    await this.cache.delete('notifications:list');
    await this.cache.delete('notifications:summary');

    return dtos[0];  // 返回第一条供确认
  }
}
```

#### AlertService — 订阅最终失败事件

```typescript
// apps/platform-api/src/modules/notification/alert.service.ts

@Service()
class AlertService {
  constructor(private notification: NotificationService) {
    pubsub.subscribe('bus:final-fail', async (event: RealtimeEvent) => {
      const { queueName, jobId, error } = event.data as FinalFailEventData;
      await this.notification.create({
        type: 'system_alert',
        title: `Job failed: ${queueName}`,
        content: `Job ${jobId} failed after retries: ${error}`,
        userIds: await this.getAdminUserIds(),    // 实际 UUID，不可用 'admin'
      });
    });
  }

  /** 查询管理员用户 ID（notifications.userId 是 FK → users.id，36 位 UUID） */
  private async getAdminUserIds(): Promise<string[]> {
    // 实现方式：从 roles 或 user_roles 表查询 admin 角色用户
    // 或用配置指定：getConfigValue('ADMIN_USER_IDS')?.split(',') ?? []
    // 或用 DB 查询：this.db.select().from(users).where(eq(users.role, 'admin'))
    return [];
  }
}
```

### 告警的告警

如果 `AlertService` 自身创建通知也失败（DB 写入失败），不再递归告警——用 `logger.error` 兜底即可，避免级联失败。

---

## 5. Bootstrap 集成

使用 `EventBusPlugin` 后，bootstrap 大幅简化——只需将插件加入 `plugins` 数组。插件内部自动处理初始化顺序、EventBridge 和生命周期：

```typescript
// apps/platform-api/src/index.ts

import { EventBusPlugin } from '@rx-ted/packages-event-bus';
import { requireConfig, getConfigValue } from './lib/config';

const app = await Application.create(AppModule, {
  plugins: [
    MysqlPlugin({ ... }),
    RedisPlugin({ ... }),
    EventBusPlugin({                          // ← 新：可选，构造器风格 new EventBusPlugin(...)
      redis: {
        host: requireConfig('REDIS_HOST'),
        port: Number(requireConfig('REDIS_PORT')),
        username: getConfigValue('REDIS_USERNAME'),
        password: getConfigValue('REDIS_PASSWORD'),
      },
      prefix: 'app',
    }),
    MailPlugin({ ... }),
  ],
});
```

**插件内部执行顺序**（由 `beforeModulesRegistered()` 保证）：

```
EventBusPlugin.beforeModulesRegistered()
  → pubsub.initialize()       // Redis 连接
  → QueueManager.initialize() // Redis 连接
  → setupEventBridge()        // 桥接 QueueManager 事件 → PubSub
  → ComponentManager.registerPlugin(QUEUE_MANAGER_KEY)

模块注册（各 Consumer 构造 → registerWorker via QueueService DI）
  → QueueManager 已就绪
  → EventBridge 已就绪
  → Worker 事件不丢失

优雅关闭（Plugin.close() 由框架 or SIGTERM handler 调用）
  → QueueManager.shutdown()
  → pubsub.shutdown()
```

### 实现阶段

分两轮推进，第一轮不依赖 Redis PubSub，先让队列系统跑稳定：

**第一轮：队列基础设施 + 模块迁移**
- Phase 1a: `packages/event-bus` — QueueManager + QueueService + EventBusPlugin（不含 PubSub，暂用 in-memory）
- Phase 1b: UserLayoutModule 迁移（删 UserLayoutQueue、注入 QueueService、移 Cron Flush）
- Phase 1c: MailModule 异步化（send/sendFromTemplate 异步入队 + MailConsumer，验证码同步）

**第二轮：Redis PubSub + 告警**
- Phase 2a: PubSub 迁移到 package + 升级 Redis 后端
- Phase 2b: EventBridge 从 in-memory 升级为 Redis Pub/Sub
- Phase 2c: 失败告警系统（bus:final-fail + AlertService + NotificationService.create）

---

## 6. 监控与运维

### QueueManager.getQueueStats()

暴露出所有队列的等待/活跃/完成/失败/延迟任务数，可用于：

- 管理端 `/admin/queues` 页面展示
- 告警：`failed > threshold` 时通知
- 健康检查

### 失败任务管理

BullMQ 默认在 failed set 中保留失败任务（`removeOnFail: false` 确保不被自动删除）。失败任务可通过 Admin UI 或 BullMQ Dashboard 查看和重试。

**策略**：

| 项目 | 策略 |
|------|------|
| 保留时长 | 7 天（`removeOnFail: { age: 604800 }`）|
| 最大重试 | 3 次，指数退避（2s → 4s → 8s）|
| 最终失败 | 保留在 failed set 中供人工介入 |
| DLQ 队列 | 暂不引入独立的 `{queue}:dlq`，当前规模 failed set + 定期巡检足够 |

### 轻量方案的局限性（可选增强）

如果未来需要更复杂的调度（延迟任务、定时任务链、任务依赖），BullMQ 的 Flow API 支持父子任务链。当前设计不封装 Flow，保持团队直接使用 BullMQ API 的灵活性。

---

## 7. 文件变更总览

| 操作 | 路径 |
|------|------|
| **新增** | `packages/event-bus/src/index.ts` |
| **新增** | `packages/event-bus/src/queue-manager.ts` |
| **新增** | `packages/event-bus/src/pubsub.ts` |
| **新增** | `packages/event-bus/src/types.ts` |
| **新增** | `packages/event-bus/src/event-bus-plugin.ts` |
| **新增** | `packages/event-bus/src/queue-service.ts` |
| **新增** | `packages/event-bus/package.json` |
| **新增** | `packages/event-bus/tsconfig.json` |
| **新增** | `apps/platform-api/src/modules/notification/alert.service.ts` |
| **新增** | `apps/platform-api/src/modules/mail/mail.consumer.ts` |
| **新增** | `apps/platform-api/src/db/migrations/xxxx_mail_logs_status.sql` (mailLogs 状态扩展) |
| **修改** | `apps/platform-api/src/modules/mail/entities/mail.entity.ts` (status 字段改为 `queued | sent | failed`，新增 `queuedAt` `errorMessage` `jobId`) |
| **修改** | `apps/platform-api/src/modules/mail/dtos/mail.schema.ts` (Zod schema 同步) |
| **修改** | `apps/platform-api/src/modules/mail/mappers/mail.mapper.ts` (同步新字段) |
| **删除** | `apps/platform-api/src/modules/user-layout/user-layout.queue.ts` |
| **删除** | `apps/platform-api/src/lib/pubsub.ts` (迁移到 `packages/event-bus`) |
| **删除** | `apps/platform-api/src/lib/event-bridge.ts` (迁移到 `EventBusPlugin`) |
| **修改** | `apps/platform-api/src/modules/user-layout/user-layout.consumer.ts` |
| **微调** | `apps/platform-api/src/modules/user-layout/user-layout.service.ts` |
| **微调** | `apps/platform-api/src/modules/user-layout/user-layout.module.ts` |
| **微调** | `apps/platform-api/src/modules/mail/mail.module.ts` (加入 `MailConsumer`) |
| **修改** | `apps/platform-api/src/modules/mail/mail.service.ts` (改为异步入队) |
| **微调** | `apps/platform-api/src/index.ts` (移除手动初始化，加入 `EventBusPlugin`) |
| **微调** | `apps/platform-api/src/lib/websocket.ts` (import 路径改为 `@rx-ted/packages-event-bus`) |
| **微调** | `pnpm-workspace.yaml` (添加 `packages/event-bus`) |
| **微调** | 根 `tsconfig.json` 或相关路径配置 |

---

## 8. 未来扩展

### NotificationModule

现为同步 DB + WebSocket 推送，适合即时通知。无需迁移。

### WebSocket 推送链路打通

当 EventBridge 发布到 PubSub 后，订阅该通道的 WebSocket 客户端（通过 `subscribe` 消息）能收到实时推送。

### 定时任务

定时任务（如清理、批处理）不封装到 event-bus，由各模块自行实现（`setInterval` 或 BullMQ `QueueScheduler`），event-bus 专注于**异步消息队列**而非调度器。

### 任务依赖 / 流程编排

需改用 BullMQ Flow API（`flowProducer.add()`），当前不引入，保持设计轻量。

---

## 9. 架构决策记录

| 决策 | 选项 | 结论 | 理由 |
|------|------|------|------|
| QueueManager 形态 | `@Service()` vs 手动单例 + DI 代理 | 手动单例 + QueueService 代理 | Honest 无 `providers`/`exports`；通过 QueueService（像 DbService）实现 DI 注入 |
| 基础设施承载 | in-memory PubSub + 独立 QueueManager vs Redis-backed PubSub + QueueManager 统一包 | 统一到 `packages/event-bus` | PubSub 和队列共享 Redis 连接，初始化顺序由插件保证 |
| 初始化方式 | 手动在 index.ts 编排 vs Honest 插件 | Honest 插件 `EventBusPlugin` | `beforeModulesRegistered()` 保证在模块构造前全部就绪；index.ts 只需加一行 plugin |
| EventBridge 位置 | 独立 `lib/event-bridge.ts` vs 内嵌在插件 | 内嵌在 `EventBusPlugin` | 紧耦合 QueueManager 和 PubSub，不属于通用包也不应独立 |
| Job 类型安全 | 集中 JobMap vs 各模块自行 | 集中 JobMap | 编译期保证队列名和 payload 类型匹配 |
| Worker 生命周期 | 包自动管理 vs 模块主动注册 | 模块主动注册 | 各模块对并发、重试、cron 有不同需求；包只提供基础设施 |
| Mail 异步化 | 完全异步 vs 仅非紧急邮件 | 仅非紧急邮件异步 | 验证码需低延迟即时送达，不适合入队等待；`send()` 和 `sendFromTemplate()` 可异步 |
| Mail 返回契约 | 返回 `{ jobId }` vs 保留 `MailSendResultDto` | 保留原 DTO | 先写 `queued` 日志获取 mailLogId，入队后立即返回原 DTO，不破坏调用方 |
| Mail 日志状态 | `sent` 不变 vs 扩展 `queued/sent/failed` | 扩展为三态 | 入队时写 `queued`，Worker 成功写 `sent`，失败事件写 `failed` + errorMessage |
| UserLayout Cron Flush | 保留 vs 移除 | 移除 | 常驻 Worker 足够消费；临时 Worker 与常驻冲突，多实例会有重复消费 |
| PubSub 实现 | 保持 in-memory vs 升级 Redis Pub/Sub | 升级 Redis Pub/Sub | 确保 EventBridge 跨实例可靠；未初始化时退化为本地模式 |
| `registerWorker` 标识 | 仅 `queueName` vs `queueName + role` | `queueName + role` | 同一队列未来可能需要多个不同角色的 Worker |
| 失败告警机制 | 手动轮询 failed set vs EventBridge → AlertService | EventBridge → AlertService | 复用现有 pubsub + NotificationModule，松散耦合；AlertService 自身失败不递归告警 |
| 告警推送链路 | 单独实现 vs 复用 NotificationModule + WebSocket | 复用 | NotificationModule 已有 DB 持久化和 WebSocket 推送，只需加 `create()` 方法 |
