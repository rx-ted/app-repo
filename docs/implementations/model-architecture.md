# Module Architecture Specification

> **Status: REFERENCE** — 模块架构规范参考文档。

## Purpose

This document defines the standard module directory structure,
file naming conventions, and responsibility boundaries
for business implementation.

The design follows:

- NestJS-style modular architecture
- decorator-based dependency injection
- controller-service separation
- scalable domain modules

## Standard Directory Layout

All business modules must be placed under: `src/modules/`

Each business domain has its own folder.

Example: `src/modules/users/`

## User Module Example

Standard structure:

src/modules/users/
├── dtos/
│ ├── user.request.dto.ts
│ ├── user.response.dto.ts
│ ├── user.command.dto.ts
│ └── user.query.dto.ts
├── entities/
│ └── user.entity.ts
│ └── user.profile.entity.ts
├── mappers/
│ └── user.mapper.ts
├── repositories/
│ └── user.repository.ts
├── user.controller.ts
├── user.service.ts
├── user.module.ts
└── index.ts

## File Responsibilities

### user.module.ts

Purpose:
Register module metadata and dependencies.

Responsibilities:

- controllers
- services
- imports
- ~~providers~~: not implement
- ~~exports~~: not implement

Example:

```ts
@Module({
  controllers: [UserController],
  services: [UserService],
  imports: [],
  // providers: [UserService],
  // exports: [UserService]
})
export class UserModule {}
```

### user.controller.ts

Purpose:
Handle HTTP requests and responses.

Responsibilities:

- route definitions
- request validation
- response formatting
- authorization decorators

Example:

```ts
@Controller("/users")
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get("/:id")
  @Authorized()
  async getUser() {}

  @Post("/")
  async createUser(@Body() body: CreateUserRequestDto) {}
}
```

### user.service.ts

Purpose:
Implement business logic.

Responsibilities:

- business workflows
- validation logic
- transaction control
- call repository / external services

Example:

```ts
@Service()
export class UserService {
  async createUser(command: CreateUserCommandDto) {}
}
```

### user.mapper.ts

Purpose:
Convert data models between layers.

Responsibilities:

- DTO ↔ Model
- Model ↔ Entity
- Entity ↔ Response DTO

Functions:

- `toEntity()`
- `toModel()`
- `toResponse()`

Example:

```ts
export class UserMapper {
  static toEntity(model) {}
  static toModel(entity) {}
  static toResponse(model) {}
}
```

### user.entity.ts

Purpose:
Database persistence schema.

Responsibilities:

- database field mapping
- persistence metadata
- table relation mapping

Example:

```ts
export class UserEntity {
  user_id: number;
  user_name: string;
}
```

### dtos/

Purpose:
Data transfer layer.

Contains:

user.request.dto.ts
Input data from client

user.response.dto.ts
Output data to client

user.command.dto.ts
Business command input

user.query.dto.ts
Business query input

## Decorator Standards

Framework must support the following decorators.

### Module Level

`@Module()`

Used for:

- module registration
- provider metadata
- dependency imports

Example:

```ts
@Module({
imports: [],
controllers: [],
services: []
})
```

### Controller Level

@Controller(path)

Used for route prefix.

Example: `@Controller('/users')`

### Service Level

- `@Service()`

Used for DI provider registration.

Example:

`@Service()`

### Route Level

- `@Get(path)`
- `@Post(path)`
- `@Put(path)`
- `@Delete(path)`

Examples:

- `@Get('/:id')`
- `@Post('/')`

### Parameter Decorators

- `@Body()`
- `@Param()`
- `@Query()`
- `@Headers()`

Examples:

- `@Body()`
- `@Param('id')`
- `@Query('page')`

### Authorization

- `@Authorized()`

Purpose:
permission validation

Examples:

- `@Authorized()`
- `@Authorized('admin')`

## Module Dependency Rules

Allowed:

controller → service
service → mapper
service → repository
service → external services

**Forbidden**:

controller → entity
controller → database
dto → entity direct dependency

## Naming Convention

Singular file naming standard:

- `user.controller.ts`
- `user.service.ts`
- `user.module.ts`

Folder name uses plural domain:

users/

Examples:

- `modules/users/`
- `modules/orders/`
- `modules/payments/`

## 8. Recommended Future Extension

Optional folders:

src/modules/users/
├── guards/
├── interceptors/
├── pipes/
├── repositories/
├── events/
├── tests/

Examples:

- `user.guard.ts`
- `user.repository.ts`
- `user.event.ts`
