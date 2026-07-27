import { vi } from 'vitest';

vi.mock('@platform-api/lib/config', () => ({
  requireConfig: (key: string) => {
    if (key === 'JWT_SECRET') return 'test-jwt-secret';
    if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
    throw new Error(`Missing required config: ${key}`);
  },
  getAppConfig: vi.fn(),
  setAppConfig: vi.fn(),
  clearAppConfig: vi.fn(),
  getConfigValue: vi.fn(),
  hasConfig: vi.fn(() => true),
  validateConfig: vi.fn(),
  ensureConfig: vi.fn(),
}));

function chainableColumn(column: Record<string, any>) {
  return {
    ...column,
    notNull: () => chainableColumn({ ...column, notNull: true }),
    default: (v: any) => chainableColumn({ ...column, default: v }),
    defaultNow: () => chainableColumn({ ...column, defaultNow: true }),
    unique: () => chainableColumn({ ...column, unique: true }),
    autoincrement: () => chainableColumn({ ...column, autoincrement: true }),
    primaryKey: () => chainableColumn({ ...column, primaryKey: true }),
    references: (ref: any) => chainableColumn({ ...column, references: ref }),
  };
}

vi.mock('@rx-ted/packages-honest', () => ({
  // Decorators
  Module: () => (target: any) => target,
  Controller: () => (target: any) => target,
  Get: () => () => {},
  Post: () => () => {},
  Put: () => () => {},
  Delete: () => () => {},
  Patch: () => () => {},
  Body: () => () => {},
  Param: () => () => {},
  Query: () => () => {},
  Ctx: () => () => {},
  Ip: () => () => {},
  UA: () => () => {},
  Inject: () => () => {},
  Var: () => () => {},
  Service: () => (target: any) => target,
  Injectable: () => (target: any) => target,
  UseGuards: () => () => {},
  UseMiddleware: () => () => {},
  UseInterceptors: () => () => {},
  // Classes
  CacheService: vi.fn(),
  DbService: vi.fn(),
  ComponentManager: vi.fn(),
  Container: { get: vi.fn() },
  // Drizzle ORM re-exports (chainable)
  mysqlTable: (name: string, columns: Record<string, any>, extraConfig?: any) => ({
    name, columns, extraConfig,
  }),
  varchar: (name: string, config: any) => chainableColumn({ name, config, dataType: 'varchar' }),
  char: (name: string, config: any) => chainableColumn({ name, config, dataType: 'char' }),
  int: (name: string, config: any) => chainableColumn({ name, config, dataType: 'int' }),
  bigint: (name: string, config: any) => chainableColumn({ name, config, dataType: 'bigint' }),
  datetime: (name: string, config: any) => chainableColumn({ name, config, dataType: 'datetime' }),
  text: (name: string, config: any) => chainableColumn({ name, config, dataType: 'text' }),
  longtext: (name: string, config: any) => chainableColumn({ name, config, dataType: 'longtext' }),
  boolean: (name: string, config: any) => chainableColumn({ name, config, dataType: 'boolean' }),
  json: (name: string, config: any) => chainableColumn({ name, config, dataType: 'json' }),
  date: (name: string, config: any) => chainableColumn({ name, config, dataType: 'date' }),
  mysqlEnum: (name: string, values: string[], config: any) =>
    chainableColumn({ name, values, config, dataType: 'enum' }),
  index: (config: any) => ({ type: 'index', config }),
  uniqueIndex: (config: any) => ({ type: 'uniqueIndex', config }),
  primaryKey: (columns: any, config?: any) => ({ type: 'primaryKey', columns, config }),
  foreignKey: (config: any) => ({ type: 'foreignKey', config }),
  // Utilities
  cacheable: () => () => {},
  MAIL_GLOBAL_KEY: 'mail_driver',
  createServiceTestContainer: vi.fn(),
  createControllerTestApplication: vi.fn(),
}));
