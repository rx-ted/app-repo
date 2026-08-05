---
title: Platform API 路由文档
author: rx-ted
date: 2026-07-22
category: guide
tags:
  - api
  - routes
  - reference
status: published
visibility: public
allow_comment: true
pinned: false
featured_weight: 0
lang: zh-CN
---

# Platform API 路由文档

所有路由均挂载在 `/api/v1` 前缀下。

---

## 目录

- [认证 Auth](#1-认证-auth)
- [系统初始化 System Init](#2-系统初始化-system-init)
- [用户 User](#3-用户-user)
- [文章 Post](#4-文章-post)
- [评论 Comment](#5-评论-comment)
- [标签 Tags](#6-标签-tags)
- [分类 Category](#7-分类-category)
- [角色 Role](#8-角色-role)
- [权限 Permission](#9-权限-permission)
- [权限请求 Permission Request](#10-权限请求-permission-request)
- [审计日志 Audit](#11-审计日志-audit)
- [公告 Announcement](#12-公告-announcement)
- [博客 Blog](#13-博客-blog)
- [通知 Notification](#14-通知-notification)
- [邮件 Mail](#15-邮件-mail)
- [版本 Version](#16-版本-version)
- [指标 Metrics](#17-指标-metrics)
- [文章统计 Post Stats](#18-文章统计-post-stats)
- [作者统计 Author Stats](#19-作者统计-author-stats)
- [搜索 Search](#20-搜索-search)

---

## 全局约定

### 认证方式

- **Bearer JWT**：通过 `Authorization: Bearer <token>` 头传递
- 公共接口无需认证（标记为 `@Public()`）
- 管理接口需要 `admin` 角色 + 对应权限

### 响应格式

所有 JSON 响应经过 `ResponseWrapper` 中间件封装，格式为：

```json
{
  "status": 200,
  "code": "OK",
  "data": { ... }
}
```

如果响应体已包含 `status`、`code`、`data` 字段则保持原样。

### 分页参数

| 参数     | 类型   | 默认值               | 说明     |
| -------- | ------ | -------------------- | -------- |
| page     | number | 1                    | 页码     |
| pageSize | number | 10~100（视接口而定） | 每页数量 |

分页响应格式：

```json
{
  "status": 200,
  "code": "OK",
  "data": {
    "data": [ ... ],
    "total": 42
  }
}
```

### 错误响应

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "错误描述",
  "data": [ ... ],    // 详细错误信息
  "requestId": "uuid",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## 1. 认证 Auth

**基路径：** `/api/v1/auth`  
**控制器：** `AuthController`  
**标签：** 认证相关接口

### 1.1 获取当前会话

```
GET /api/v1/auth/me
```

**认证：** Bearer Token（默认 AuthGuard）

**响应：**

```json
{
  "userId": "uuid",
  "username": "string",
  "preferredLocale": "zh-CN | en",
  "roles": ["string"],
  "permissions": ["string"],
  "tokenVersion": 0,
  "lastLoginAt": "ISO8601",
  "nickname": "string | null",
  "avatarUrl": "string | null"
}
```

### 1.2 登录

```
POST /api/v1/auth/login
```

**认证：** 公开（`@Public()`）

**请求体：**

```json
{
  "username": "string", // 必填
  "password": "string" // 必填
}
```

**响应：**

```json
{
  "token": "jwt_string",
  "user": { ... }
}
```

### 1.3 登出

```
POST /api/v1/auth/logout
```

**认证：** 公开（`@Public()`）

**响应：**

```json
{
  "affectedRows": 1
}
```

### 1.4 注册

```
POST /api/v1/auth/register
```

**认证：** 公开（`@Public()`）

**请求体：**

```json
{
  "username": "string", // 必填，3-50 字符
  "password": "string" // 必填，最少 6 字符
}
```

**响应：**

```json
{
  "token": "jwt_string",
  "user": { ... }
}
```

---

## 2. 系统初始化 System Init

**基路径：** `/api/v1/system/init`  
**控制器：** `SystemController`  
**守卫：** `EnvironmentGuard` + `InitKeyGuard`（需 `X-Init-Key` 头）

### 2.1 运行所有初始化模块

```
POST /api/v1/system/init
```

**认证：** `X-Init-Key` 头

**响应：**

```json
{
  "data": [
    {
      "module": "string",
      "status": "success | failed",
      "error": "string | null"
    }
  ]
}
```

### 2.2 运行指定初始化模块

```
POST /api/v1/system/init/:module
```

**认证：** `X-Init-Key` 头

**路径参数：**

| 参数   | 类型   | 说明     |
| ------ | ------ | -------- |
| module | string | 模块名称 |

**响应：**

```json
{
  "data": {
    "module": "string",
    "status": "success | failed",
    "error": "string | null"
  }
}
```

---

## 3. 用户 User

### 3.1 当前用户（UserController）

**基路径：** `/api/v1/user`  
**守卫：** `AuthGuard`（除公开接口外）

#### 3.1.1 获取当前用户资料

```
GET /api/v1/user/me
```

**认证：** Bearer Token

**响应：** `any`

#### 3.1.2 获取当前用户详细资料

```
GET /api/v1/user/me/profile
```

**认证：** Bearer Token

**响应：** `any`

#### 3.1.3 更新当前用户资料

```
PUT /api/v1/user/me/profile
```

**认证：** Bearer Token

**请求体（全部可选）：**

```json
{
  "nickname": "string (1-50)",
  "avatar_url": "string (url)",
  "bio": "string (最多 500)",
  "website": "string (url)",
  "location": "string (最多 100)",
  "preferred_locale": "zh-CN | en"
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

#### 3.1.4 获取用户公开资料

```
GET /api/v1/user/public/:username
```

**认证：** 公开（`@Public()`）

**路径参数：**

| 参数     | 类型          | 说明   |
| -------- | ------------- | ------ |
| username | string (1-50) | 用户名 |

**响应：** `any`

### 3.2 管理用户（AdminUserController）

**基路径：** `/api/v1/admin/user`  
**守卫：** `AuthGuard` + `RolesGuard` + `PermissionsGuard`  
**权限：** `admin` 角色 + `users:access:any` 权限

#### 3.2.1 列出所有用户

```
GET /api/v1/admin/user
```

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 100    | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

---

## 4. 文章 Post

**基路径：** `/api/v1/posts`  
**守卫：** 列表和详情公开，增删改需 `AuthGuard` + `RolesGuard` + `PermissionsGuard`（`admin` 角色 + `post:access:any` 权限）

### 4.1 列出所有文章

```
GET /api/v1/posts
```

**认证：** 公开

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 4.2 根据 slug 获取文章

```
GET /api/v1/posts/:slug
```

**认证：** 公开

**路径参数：**

| 参数 | 类型   | 说明     |
| ---- | ------ | -------- |
| slug | string | 文章标识 |

**响应：** `any`

### 4.3 创建新文章

```
POST /api/v1/posts
```

**认证：** `admin` + `post:access:any`

**请求体：**

```json
{
  "title": "string (1-200)",
  "slug": "string (1-100, 正则 /^[a-z0-9-]+$/)",
  "contentMd": "string (最少 1 字符)",
  "authorId": "string",
  "authorName": "string",
  "authorUsername": "string"
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 4.4 更新文章

```
PUT /api/v1/posts/:slug
```

**认证：** `admin` + `post:access:any`

**路径参数：**

| 参数 | 类型   | 说明     |
| ---- | ------ | -------- |
| slug | string | 文章标识 |

**请求体（全部可选）：**

```json
{
  "title": "string (1-200)",
  "contentMd": "string (最少 1 字符)"
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 5. 评论 Comment

**基路径：** `/api/v1/comments`  
**守卫：** 列表公开，创建需 `AuthGuard`，删除需额外权限

### 5.1 列出所有评论

```
GET /api/v1/comments
```

**认证：** 公开

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| postId   | string | -      | 按文章过滤           |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 5.2 创建新评论

```
POST /api/v1/comments
```

**认证：** Bearer Token

**请求体：**

```json
{
  "postId": "string",
  "parentId": "string | null", // 可选，父评论ID
  "content": "string (最少 1 字符)"
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 5.3 删除评论

```
DELETE /api/v1/comments/:id
```

**认证：** `admin` + `comment:delete:any`

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 评论ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 6. 标签 Tags

**基路径：** `/api/v1/tags`  
**守卫：** 列表和详情公开，增删改需 `admin` + `tags:access:any`

### 6.1 列出所有标签

```
GET /api/v1/tags
```

**认证：** 公开

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 6.2 根据 ID 获取标签

```
GET /api/v1/tags/:id
```

**认证：** 公开

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 标签ID |

**响应：** `any`

### 6.3 创建新标签

```
POST /api/v1/tags
```

**认证：** `admin` + `tags:access:any`

**请求体：**

```json
{
  "name": "string (1-50)",
  "slug": "string (最多 100)" // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 6.4 更新标签

```
PUT /api/v1/tags/:id
```

**认证：** `admin` + `tags:access:any`

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 标签ID |

**请求体（全部可选）：**

```json
{
  "name": "string (1-50)",
  "slug": "string (最多 100)"
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

### 6.5 删除标签

```
DELETE /api/v1/tags/:id
```

**认证：** `admin` + `tags:access:any`

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 标签ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 7. 分类 Category

**基路径：** `/api/v1/categories`  
**守卫：** 列表公开，创建需 `admin` + `category:access:any`

### 7.1 列出所有分类

```
GET /api/v1/categories
```

**认证：** 公开

**响应：** `array`

### 7.2 创建新分类

```
POST /api/v1/categories
```

**认证：** `admin` + `category:access:any`

**请求体：**

```json
{
  "name": "string (1-100)",
  "slug": "string (最多 100)", // 可选
  "description": "string" // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

---

## 8. 角色 Role

**基路径：** `/api/v1/role`  
**守卫：** 全部需 `admin` + `role:access:any`

### 8.1 列出所有角色

```
GET /api/v1/role
```

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 8.2 根据 ID 获取角色

```
GET /api/v1/role/:id
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 角色ID |

**响应：** `any`

### 8.3 创建新角色

```
POST /api/v1/role
```

**请求体：**

```json
{
  "name": "string (1-100)",
  "description": "string" // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 8.4 更新角色

```
PUT /api/v1/role/:id
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 角色ID |

**请求体（全部可选）：**

```json
{
  "name": "string (1-100)",
  "description": "string"
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

### 8.5 删除角色

```
DELETE /api/v1/role/:id
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 角色ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 9. 权限 Permission

**基路径：** `/api/v1/permission`  
**守卫：** 全部需 `admin` + `permission:access:any`

### 9.1 列出所有权限

```
GET /api/v1/permission
```

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 9.2 创建或更新权限

```
POST /api/v1/permission
```

**请求体：**

```json
{
  "name": "string (1-100)",
  "code": "string (1-100)",
  "description": "string" // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 9.3 删除权限

```
DELETE /api/v1/permission
```

**请求体：**

```json
{
  "permission_id": "number (整数)",
  "target_user_id": "string" // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 10. 权限请求 Permission Request

**基路径：** `/api/v1/permission-request`  
**守卫：** 全部需 `admin` + `permission_request:access:any`

### 10.1 列出所有权限请求

```
GET /api/v1/permission-request
```

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 10.2 列出我的权限请求

```
GET /api/v1/permission-request/me
```

**认证：** `admin` + `permission_request:access:any`

**响应：** `any`

### 10.3 创建权限请求

```
POST /api/v1/permission-request
```

**请求体（全部可选）：**

```json
{
  "permission_code": "string",
  "target_user_id": "string",
  "path": "string",
  "scope": "string",
  "expires_at": "string",
  "reason": "string"
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 10.4 批准权限请求

```
POST /api/v1/permission-request/:id/approve
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 请求ID |

**请求体（可选）：**

```json
{
  "reason": "string"
}
```

**响应：** `any`

### 10.5 拒绝权限请求

```
POST /api/v1/permission-request/:id/reject
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 请求ID |

**请求体（可选）：**

```json
{
  "reason": "string"
}
```

**响应：** `any`

### 10.6 更新权限请求

```
PUT /api/v1/permission-request/:id
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 请求ID |

**请求体（全部可选）：** 同创建

**响应：**

```json
{
  "affectedRows": 1
}
```

### 10.7 删除权限请求

```
DELETE /api/v1/permission-request/:id
```

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 请求ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 11. 审计日志 Audit

**基路径：** `/api/v1/audit`  
**守卫：** 全部需 `admin` + `audit:access:any`

### 11.1 列出所有审计日志

```
GET /api/v1/audit
```

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 11.2 根据 ID 获取审计日志

```
GET /api/v1/audit/:id
```

**路径参数：**

| 参数 | 类型   | 说明       |
| ---- | ------ | ---------- |
| id   | string | 审计日志ID |

**响应：** `any`

### 11.3 创建审计日志

```
POST /api/v1/audit
```

**请求体：**

```json
{
  "actor_id": "string (uuid)",
  "actor_role": "string",
  "action": "string",
  "target_type": "string",
  "target_id": "string",
  "status": "pending | success | failed",
  "message": "string",                         // 可选
  "meta": { ... }                              // 可选，任意 JSON
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 11.4 更新审计日志

```
PUT /api/v1/audit/:id
```

**路径参数：**

| 参数 | 类型   | 说明       |
| ---- | ------ | ---------- |
| id   | string | 审计日志ID |

**请求体（全部可选）：**

```json
{
  "message": "string",
  "meta": { ... }
}
```

**响应：**

```json
{
  "affectedRows": 1
}
```

### 11.5 删除审计日志

```
DELETE /api/v1/audit/:id
```

**路径参数：**

| 参数 | 类型   | 说明       |
| ---- | ------ | ---------- |
| id   | string | 审计日志ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 12. 公告 Announcement

**基路径：** `/api/v1/announcement`  
**守卫：** 列表和详情公开，增删改需 `admin` + `announcement:access:any`

### 12.1 获取活跃公告

```
GET /api/v1/announcement/active
```

**认证：** 公开

**响应：** `any`

### 12.2 列出所有公告

```
GET /api/v1/announcement
```

**认证：** 公开

**查询参数：**

| 参数     | 类型   | 默认值 | 说明                 |
| -------- | ------ | ------ | -------------------- |
| page     | number | 1      | 页码                 |
| pageSize | number | 10     | 每页数量（最大 100） |

**响应：**

```json
{
  "data": [ ... ],
  "total": 42
}
```

### 12.3 根据 ID 获取公告

```
GET /api/v1/announcement/:id
```

**认证：** 公开

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 公告ID |

**响应：** `any`

### 12.4 创建新公告

```
POST /api/v1/announcement
```

**认证：** `admin` + `announcement:access:any`

**请求体：**

```json
{
  "title": "string (1-200)",
  "content": "string (最少 1 字符)",
  "slot": "top | footer",
  "audiences": ["string"],                   // 可选，默认 []
  "original": { ... },                       // 可选
  "translated": { ... }                      // 可选
}
```

**响应：**

```json
{
  "affectedRows": 1,
  "id": "string | null"
}
```

### 12.5 更新公告

```
PUT /api/v1/announcement/:id
```

**认证：** `admin` + `announcement:access:any`

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 公告ID |

**请求体（全部可选）：** 同创建

**响应：**

```json
{
  "affectedRows": 1
}
```

### 12.6 删除公告

```
DELETE /api/v1/announcement/:id
```

**认证：** `admin` + `announcement:access:any`

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 公告ID |

**响应：**

```json
{
  "affectedRows": 1
}
```

---

## 13. 博客 Blog

**基路径：** `/api/v1/blog`  
**守卫：** 全部公开（无需认证）

### 13.1 获取博客摘要

```
GET /api/v1/blog/summary
```

**认证：** 公开

**响应：** `any`

### 13.2 获取我的博客

```
GET /api/v1/blog/me
```

**认证：** 公开

**响应：** `any`

### 13.3 根据用户名获取博客

```
GET /api/v1/blog/by-username/:username
```

**认证：** 公开

**路径参数：**

| 参数     | 类型   | 说明   |
| -------- | ------ | ------ |
| username | string | 用户名 |

**响应：** `any`

---

## 14. 通知 Notification

**基路径：** `/api/v1/notification`  
**守卫：** `AuthGuard`（需登录）

### 14.1 列出我的通知

```
GET /api/v1/notification/me
```

**认证：** Bearer Token

**响应：** `any`

### 14.2 获取通知摘要

```
GET /api/v1/notification/me/summary
```

**认证：** Bearer Token

**响应：** `any`

### 14.3 标记所有通知为已读

```
POST /api/v1/notification/read-all
```

**认证：** Bearer Token

**响应：** `any`

### 14.4 标记通知为已读

```
POST /api/v1/notification/:id/read
```

**认证：** Bearer Token

**路径参数：**

| 参数 | 类型   | 说明   |
| ---- | ------ | ------ |
| id   | string | 通知ID |

**响应：** `any`

---

## 15. 邮件 Mail

**基路径：** `/api/v1/mail`  
**守卫：** `admin` + `mail:send:any`

### 15.1 发送邮件

```
POST /api/v1/mail/send
```

**认证：** `admin` + `mail:send:any`

**请求体：** `Partial<MailEntity>`（任意邮件字段）

**响应：** `any`

### 15.2 从模板发送邮件

```
POST /api/v1/mail/send-from-template
```

**认证：** `admin` + `mail:send:any`

**请求体：**

```json
{
  "template": "string",
  "to": "string",
  "variables": { ... }        // 可选
}
```

**响应：** `any`

---

## 18. 文章统计 Post Stats

**基路径：** `/api/v1/post-stats`  
**守卫：** 全部公开（无需认证）

### 18.1 根据文章 ID 获取统计

```
GET /api/v1/post-stats/:postId
```

**认证：** 公开

**路径参数：**

| 参数   | 类型   | 说明   |
| ------ | ------ | ------ |
| postId | string | 文章ID |

**响应：** `any`

### 18.2 记录文章浏览量

```
POST /api/v1/post-stats/:postId/views
```

**认证：** 公开

**路径参数：**

| 参数   | 类型   | 说明   |
| ------ | ------ | ------ |
| postId | string | 文章ID |

**响应：** `any`

### 18.3 刷新所有文章统计

```
POST /api/v1/post-stats/refresh
```

**认证：** 公开

**响应：** `any`

---

## 19. 作者统计 Author Stats

**基路径：** `/api/v1/author-stats`  
**守卫：** 全部公开（无需认证）

### 19.1 获取作者统计

```
GET /api/v1/author-stats/:identifier
```

**认证：** 公开

**路径参数：**

| 参数       | 类型   | 说明     |
| ---------- | ------ | -------- |
| identifier | string | 作者标识 |

**响应：** `any`

---

## 20. 搜索 Search

**基路径：** `/api/v1/search`  
**守卫：** 全部公开（无需认证）

### 20.1 搜索

```
GET /api/v1/search
```

**认证：** 公开

**查询参数：**

| 参数   | 类型   | 默认值  | 说明                                                              |
| ------ | ------ | ------- | ----------------------------------------------------------------- |
| q      | string | ""      | 搜索关键词                                                        |
| type   | string | "posts" | 搜索类型，逗号分隔。支持：`posts`、`tags`、`categories`、`author` |
| limit  | string | "10"    | 返回数量                                                          |
| offset | string | "0"     | 偏移量                                                            |

**响应：** `any`

---

## 附录

### A. 路由统计

| 维度            | 数量 |
| --------------- | ---- |
| 控制器总数      | 21   |
| 路由总数        | 63   |
| GET             | 29   |
| POST            | 22   |
| PUT             | 8    |
| DELETE          | 4    |
| 公开路由        | 22   |
| 需 AuthGuard    | 8    |
| 需 admin + 权限 | 23   |
| 需 InitKeyGuard | 2    |

### B. 守卫说明

| 守卫               | 说明                                                       |
| ------------------ | ---------------------------------------------------------- |
| `AuthGuard`        | 验证 JWT Bearer token，通过后用户信息存入 `c.get('user')`  |
| `RolesGuard`       | 检查用户角色（通过 `@Roles()` 设置），不匹配返回 403       |
| `PermissionsGuard` | 检查用户权限（通过 `@Permissions()` 设置），不匹配返回 403 |
| `EnvironmentGuard` | 生产环境拦截（仅非生产环境可用）                           |
| `InitKeyGuard`     | 检查 `X-Init-Key` 头（`INIT_KEY` 环境变量）                |

### C. 全局中间件

| 中间件                     | 说明                                                  |
| -------------------------- | ----------------------------------------------------- |
| `RequestContextMiddleware` | 为每个请求注入 `requestId`（UUID）和 `serviceName`    |
| `ResponseWrapper`          | 将所有 JSON 响应包装为 `{ status, code: 'OK', data }` |
| `ApiErrorFilter`           | 统一错误处理，将异常转为标准化错误响应                |
