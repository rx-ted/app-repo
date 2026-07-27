# Data Design Specification

> **Status: REFERENCE** — 数据模型设计参考文档，持续更新。

## Purpose

This document defines the data model boundaries, naming conventions,
and transformation rules between client, service, storage, and response layers.

The goal is to ensure:

- clear responsibility boundaries
- easy maintenance
- stable API contracts
- database independence
- future microservice scalability

## Layered Data Model Figure

System data flow:

Client
→ Request DTO
→ Controller
→ Command / Query
→ Service Model
→ Entity
→ Repository / Database
→ Entity
→ Service Model
→ Response DTO
→ Response Envelope
→ Client

## Data Type Definitions

### Client → Server

Type: Request DTO

Purpose:
Receive client request payload.

Examples:

- LoginRequestDto
- CreateUserRequestDto
- UpdateProfileRequestDto

Example:

{
"username": "ben",
"password": "123456"
}

Rules:

- validate input
- no business logic
- only transport fields

---

## Controller → Service

Type:

- Command
- Query

Purpose:
Internal business transfer object.

Examples:

- CreateUserCommand
- GetUserQuery

Rules:

- business-oriented
- can include derived fields
- not directly exposed to client

## Service Internal Model

Type: Domain Model / Service Model

Purpose:
Business layer data object.

Examples:

- UserModel
- OrderModel

Rules:

- camelCase naming
- pure business fields
- independent from DB schema

Example:

{
id: 1,
userName: "ben",
createdAt: Date
}

## Service ↔ Database

Type: Entity

Purpose:
Persistent storage model.

Examples:

- UserEntity
- TransactionEntity

Rules:

- match database schema
- may use snake_case fields
- include persistence metadata

Example:

{
user_id: 1,
user_name: "ben",
created_at: "2026-04-16 10:00:00"
}

## Service → Client

Type: Response DTO

Purpose:
Output data object.

Examples:

- UserResponseDto
- LoginResponseDto

Rules:

- hide internal fields
- hide database fields
- hide sensitive fields

Example:

{
"id": 1,
"username": "ben"
}

## Standard Response Envelope

All API responses must use unified format.

Type: ApiResponse<T>

Structure:

{
"status": "success",
"code": 200,
"message": "OK",
"data": {},
"timestamp": "2026-04-16T10:00:00Z",
"requestId": "uuid"
}

Fields:

status:

- success
- fail
- error

code:
HTTP / business status code

message:
human-readable message

data:
actual response payload

timestamp:
server response time

requestId:
request trace id for debugging

meta:
optional pagination metadata

Example:

{
"status": "success",
"code": 200,
"message": "User fetched successfully",
"data": {
"id": 1,
"username": "ben"
},
"timestamp": "2026-04-16T10:00:00Z",
"requestId": "req-123456"
}

---

## Mapping Rules

### DTO → Service Model

Request DTO must be converted to service model.

Example:

CreateUserRequestDto
→
CreateUserCommand
→
UserModel

### Service Model ↔ Entity

Service layer uses camelCase.

Database layer may use snake_case.

Must use mapper / adapter conversion.

Example:

Service:

{
userId: 1,
userName: "ben"
}

Entity:

{
user_id: 1,
user_name: "ben"
}

---

### Entity → Response DTO

Database fields must never be returned directly.

Example:

UserEntity
→ UserModel
→ UserResponseDto

---

### Mapper Convention

Directory:

src/modules/{\*}s/{\*}.mapper.ts

Examples:

- src/modules/usdrs/user.mapper.ts
- src/modules/orders/order.mapper.ts

Functions:

toEntity(model)
toModel(entity)
toResponse(model)

Example:

toEntity(userModel)
toModel(userEntity)
toResponse(userModel)

```ts
export class UserMapper {
  static toEntity(model: UserModel): UserEntity {
    return {
      user_id: model.userId,
      user_name: model.userName,
    };
  }

  static toModel(entity: UserEntity): UserModel {
    return {
      userId: entity.user_id,
      userName: entity.user_name,
    };
  }

  static toResponse(model: UserModel): UserResponseDto {
    return {
      id: model.userId,
      username: model.userName,
    };
  }
}
```
