# Layout Redesign & User Preferences System

> **Status: PARTIALLY IMPLEMENTED** — 前端布局系统已实现，BullMQ 异步持久化方案因 event-bus 包删除而未实现。

## 概述

为 web-blog 重新设计布局系统，支持用户个性化配置（组件开关、菜单修改、布局选择），并采用 Redis 优先、MySQL 最终持久化的存储方案，通过 BullMQ 实现异步同步。

## 布局方案

### 布局 1（默认）— 完整三栏

```
top-pinned（通知栏）🔘 可开关
header（核心）: [logo | 页面名] [搜索] [语言 | 颜色 | 主题 | 通知 | 头像]
body: [aside left 🔘] [content 居中] [aside right 🔘]
footer 🔘
```

### 布局 2 — 简洁双栏

```
top-pinned（通知栏）🔘 可开关
topbar（核心）: [logo | 页面名] [搜索] [语言 | 颜色 | 主题 | 通知 | 头像]
body: [sider（核心，含 menu 🔧）] [content 居中]
no footer
```

### 组件分类

| 分类 | 组件 | 说明 |
|------|------|------|
| ⚡ 核心 | header/topbar, sider, menu | 不可关闭，menu 项可修改 |
| 🔘 可开关 | top-pinned, aside left, aside right, footer | 用户可独立开关 |
| 🔧 可修改 | menu 项/排序, 颜色主题, 语言 | 通过配置界面自定义 |

布局切换为**全局**生效，默认使用布局 1。

## 技术架构

### 数据流

```
写入:
  Client → POST /api/v1/user/layout-config
    → Redis SET（即时，TTL 7天）
    → BullMQ Queue Add（异步）
      → Worker 消费 → MySQL UPSERT

读取:
  Client → GET /api/v1/user/layout-config
    → Redis GET（命中则返回）
    → MySQL SELECT（未命中，回填 Redis）
    → 都不存在 → 返回默认配置

离线降级:
  API 不可用 → localStorage 默认配置
```

### 数据库表

```sql
CREATE TABLE user_layout_configs (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT UNIQUE NOT NULL,
  layout_id   VARCHAR(20) NOT NULL,           -- 'layout-1' | 'layout-2'
  config      JSON NOT NULL,                  -- 完整配置快照
  version     INT DEFAULT 1,                  -- 乐观锁
  synced_at   DATETIME(3),                    -- 最后同步时间
  created_at  DATETIME(3) DEFAULT NOW(3),
  updated_at  DATETIME(3) DEFAULT NOW(3) ON UPDATE NOW(3)
);
```

### Redis 缓存

| Key | Value | TTL |
|-----|-------|-----|
| `user:layout:{userId}` | `{ layoutId, config, version, updatedAt }` | 7 天 |
| `user:layout:default` | 系统默认配置 | 长期 |

### BullMQ 队列

- **Queue**: `layout-config-sync`
- **Job 数据**: `{ userId, layoutId, config, version, timestamp }`
- **Worker**: 消费并写入 MySQL
  - 去重：按 userId 合并（deduplication）
  - 重试：最多 3 次
  - 失败：记录到失败队列
- **Cron**: 每 30 分钟执行一次批量刷新

## 后端模块

`modules/user-layout/` 结构：

```
├── user-layout.module.ts
├── user-layout.controller.ts
├── user-layout.service.ts
├── entities/user-layout.entity.ts     -- Drizzle table
├── dtos/user-layout.schema.ts         -- Zod
├── dtos/user-layout.request.dto.ts
├── dtos/user-layout.response.dto.ts
├── user-layout.consumer.ts            -- BullMQ Worker
└── user-layout.processor.ts           -- Cron 批量处理器
```

### API 端点

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/user/layout-config` | 读取当前用户配置 |
| PUT | `/api/v1/user/layout-config` | 保存/更新配置 |
| POST | `/api/v1/user/layout-config/reset` | 重置为默认 |

## 前端架构

### Store

`stores/layout.ts` (Pinia Store)

- **State**: `layoutId`, `components` (topPinned, asideLeft, asideRight, footer, menuItems), `loading`, `error`
- **Actions**: `fetchConfig()`, `updateConfig()`, `resetToDefault()`
- **localStorage 降级**: key `app:layout-config`

### 布局组件

| 文件 | 说明 |
|------|------|
| `LayoutResolver.vue` | 读取 Config，选择布局 |
| `FullLayout.vue` | 条件渲染 aside/footer/通知栏 |
| `Layout2.vue` | 精简双栏布局（新增） |
| `SideBar.vue` | 接收 menuItems 配置（修改） |
| `TopBar.vue` | 接收 menuItems、通知配置（修改） |

### 配置页面组件

| 文件 | 说明 |
|------|------|
| `LayoutSettings.vue` | 布局选择器（卡片式选择） |
| `ComponentToggles.vue` | 组件开关列表 |
| `MenuEditor.vue` | 菜单项拖拽排序/开关 |

配置页面嵌入 Dashboard Settings 页面。

### 默认配置

```typescript
const defaultLayoutConfig = {
  layoutId: 'layout-1',
  components: {
    topPinned: true,
    asideLeft: true,
    asideRight: false,
    footer: true,
    menuItems: [
      { icon: 'tabler:home', label: 'nav.home', path: '/' },
      { icon: 'tabler:article', label: 'nav.posts', path: '/posts' },
      { icon: 'tabler:pencil', label: 'nav.write', path: '/editor' },
      { icon: 'tabler:user', label: 'nav.about', path: '/about' },
      { icon: 'tabler:settings', label: 'nav.settings', path: '/dashboard/settings' },
    ],
  },
};
```

## 依赖变更

- **新增**: `bullmq` (后端)
- **已有**: `redis`, `mysql2`, `drizzle-orm`, `zod`
