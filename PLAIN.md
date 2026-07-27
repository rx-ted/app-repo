# Pending / Unimplemented Items

> 本文档记录经过代码审计后确认**尚未实现**或**无法验证**的计划项。
> 已实现或已废弃的项目不会出现在此处。

---

## 功能计划

### IP 地理定位

- **来源**: `PLAN.md` §1.1
- **状态**: 部分实现（`geoip.service.ts` 已存在）
- **待办**:
  - [ ] 登录/评论时记录城市信息到用户/评论记录
  - [ ] Session 和 audit_log 中增加城市字段

### 用户在线状态

- **来源**: `PLAN.md` §1.2
- **状态**: 部分实现（`last_login_at` 字段已存在）
- **待办**:
  - [ ] 新增心跳接口 `PUT /users/heartbeat`，刷新 `last_active_at`
  - [ ] 用户信息/作者信息接口返回 `last_active_at`
  - [ ] 登录时自动更新 `last_active_at`
  - [ ] 前端在线状态绿点（Header 头像 + NetworkCard）

### 站点信息接口

- **来源**: `PLAN.md` §1.3
- **状态**: 已实现（`system.info.service.ts` + `GET /system/info`）
- **待办**: 无（已实现）

### 文章统计缓存

- **来源**: `PLAN.md` §1.4
- **状态**: 未实现
- **待办**:
  - [ ] Redis 缓存每日文章创建数（当天 +1，删除 -1）
  - [ ] 首次读取时从 DB 初始化缓存
  - [ ] 供日历组件使用

### 评论增强

- **来源**: `PLAN.md` §1.5
- **状态**: 未实现
- **待办**:
  - [ ] 未登录评论记录 IP、操作系统、浏览器版本
  - [ ] 提交成功后生成随机头像
  - [ ] IP → 城市转换（复用 geoip）

### 标签/分类审批工作流

- **来源**: `PLAN.md` §1.6
- **状态**: 设计文档存在（`docs/implementations/2026-06-21-tag-category-approval-design.md`）
- **待办**:
  - [ ] 后端审批接口实现
  - [ ] 前端管理界面

### 用户布局持久化

- **来源**: `PLAN.md` §2.1
- **状态**: 未实现
- **待办**:
  - [ ] `user-layout` 设置保存到 `localStorage`（不发送服务器）

### 标签页面重新设计

- **来源**: `PLAN.md` §2.3
- **状态**: 未实现
- **待办**:
  - [ ] Top 10 标签列表 + 比例条
  - [ ] 指定标签页面（时间线）

### 分类页面重新设计

- **来源**: `PLAN.md` §2.4
- **状态**: 未实现
- **待办**:
  - [ ] 与标签页面设计结构保持一致

### 归档/时间线

- **来源**: `PLAN.md` §2.5
- **状态**: 部分实现（`ArchivePage` 已存在）
- **待办**:
  - [ ] 提取为独立组件或独立页面

### 友链 & 留言页面

- **来源**: `PLAN.md` §2.6
- **状态**: 部分实现（`FriendsPage` + `GuestbookPage` 已存在，`friend-link` 模块已存在）
- **待办**: 无（已实现）

### 相册页面

- **来源**: `PLAN.md` §2.7
- **状态**: 未实现
- **待办**:
  - [ ] 相册页面（上传和预览）
  - [ ] API 支持

### 链接菜单

- **来源**: `PLAN.md` §2.8
- **状态**: 未实现
- **待办**:
  - [ ] 新增菜单项，点击跳转新页面

### 日历组件

- **来源**: `PLAN.md` §2.9
- **状态**: 部分实现（`CalendarPage` + `CalendarWidget` 已存在）
- **待办**:
  - [ ] 每天序号下面显示文章创作篇数（需后端缓存支持）

### 评论增强前端

- **来源**: `PLAN.md` §2.10
- **状态**: 未实现
- **待办**:
  - [ ] 未登录时显示昵称/邮箱/网址
  - [ ] 提交时自动带上 IP/系统版本/浏览器版本
  - [ ] 成功后显示随机生成的头像

---

## todo.md 中的待办

### Blog statistics

- **来源**: `todo.md`
- **状态**: 未实现
- **待办**:
  - [ ] 设计计数系统（views, likes, comments）
  - [ ] Write-behind cache pattern（KV → DB flush）

---

## 废弃的包引用

以下包名在旧文档中出现，但已不再存在于代码库中：

| 包名 | 状态 | 说明 |
|------|------|------|
| `@rx-ted/packages-event-bus` | 已删除 | BullMQ 队列，已从项目中移除 |
| `@rx-ted/packages-config` | 已删除 | 配置包，功能已合并到 `packages/core` |
| `@rx-ted/packages-logger` | 已删除 | 日志包，功能已合并到 `packages/core` |
| `@rx-ted/packages-auth` | 从未存在 | 认证逻辑内联在 `platform-api` 中 |
| `@rx-ted/packages-http-client` | 从未存在 | HTTP 客户端逻辑内联在各 app 中 |
| `web-admin` | 已删除 | 管理后台前端，已移除 |
| `@rx-ted/markdown-core` | 未实现 | 设计文档存在，未实现为独立包 |
| `@rx-ted/markdown-ui` | 未实现 | 设计文档存在，未实现为独立包 |
