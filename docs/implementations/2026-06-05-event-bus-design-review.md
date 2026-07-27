# Design Review: Event Bus — v4 后

> **Status: SUPERSEDED** — Event Bus 已从项目中移除，BullMQ 不再使用。

> 以下 11 项已在设计文档中全部修正。文档 `2026-06-05-event-bus-design.md` 为最终版。

## ✅ 已修复

| # | 问题 | 处理 |
|---|------|------|
| 1 | JobMap `mail:send` 缺少 `mailLogId` | 添加到源 JobMap，删除重复的"JobMap 调整"段落 |
| 2 | `subscribe()` fire-and-forget 可能导致丢消息 | 文档说明：系统级服务应在初始化完成后、业务开始前建立订阅 |
| 3 | 同实例双重分发（本地 + Redis） | 改为：初始化后 `publish` 仅走 Redis；未初始化时仅本地 |
| 4 | `close()` 没有 await | 改为 `async close(): Promise<void>` |
| 5 | QueueService 需在模块 `services` 中声明 | 文档注明：`@Service()` + 被 import 即可，Honest DI 自动发现 |
| 6 | 最终失败检测逻辑重复（MailConsumer + EventBridge） | 集中到 QueueManager 事件 payload，emit `isFinal: boolean` |
| 7 | `NotificationService.create()` 广播不完整 | 改为逐用户 insert + select DTO + 各自 WebSocket 推送 + 缓存失效 |
| 8 | `userIds: ['admin']` 不是有效 UUID | 替换为 `getAdminUserIds()`，文档注明 FK 约束和实现选项 |
| 9 | Plugin 构造风格不一致 | 改为 `new EventBusPlugin(...)` 标注 |
| 10 | 缺少 mailLogs 实体/schema/mapper | 加入变更列表：entity + Zod schema + mapper |
| 11 | 实现阶段太激进 | 拆为两轮：第一轮队列（不含 PubSub），第二轮 Redis PubSub + 告警 |

## 分轮实现

```
第一轮（无 Redis PubSub）:
  Phase 1a: packages/event-bus — QueueManager + QueueService + EventBusPlugin
  Phase 1b: UserLayoutModule 迁移
  Phase 1c: MailModule 异步化

第二轮（升级实时能力）:
  Phase 2a: PubSub → package + Redis 后端
  Phase 2b: EventBridge 升级 Redis Pub/Sub
  Phase 2c: 失败告警系统
```
