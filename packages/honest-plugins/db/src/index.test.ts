import { describe, it, expect } from 'vitest';
import * as plugin from './index';

describe('plugin barrel exports', () => {
  it('exports DB_GLOBAL_KEY', () => {
    expect(plugin.DB_GLOBAL_KEY).toBe('app:db');
  });

  it('exports DbService (class)', () => {
    expect(plugin.DbService).toBeDefined();
    expect(typeof plugin.DbService).toBe('function');
  });

  it('exports BaseRepository (class)', () => {
    expect(plugin.BaseRepository).toBeDefined();
    expect(typeof plugin.BaseRepository).toBe('function');
  });

  it('exports core Drizzle operators', () => {
    expect(plugin.eq).toBeDefined();
    expect(plugin.and).toBeDefined();
    expect(plugin.or).toBeDefined();
    expect(plugin.not).toBeDefined();
    expect(plugin.sql).toBeDefined();
    expect(plugin.asc).toBeDefined();
    expect(plugin.desc).toBeDefined();
    expect(plugin.count).toBeDefined();
    expect(typeof plugin.eq).toBe('function');
    expect(typeof plugin.and).toBe('function');
  });

  it('exports MysqlPlugin', () => {
    expect(plugin.MysqlPlugin).toBeDefined();
    expect(typeof plugin.MysqlPlugin).toBe('function');
  });

  it('exports mysql namespace', () => {
    expect(plugin.mysql).toBeDefined();
    expect(plugin.mysql.MysqlPlugin).toBeDefined();
    expect(plugin.mysql.mysqlTable).toBeDefined();
    expect(plugin.mysql.varchar).toBeDefined();
    expect(plugin.mysql.int).toBeDefined();
  });

  it('exports MySQL column builders at top level', () => {
    expect(plugin.mysqlTable).toBeDefined();
    expect(plugin.varchar).toBeDefined();
    expect(plugin.int).toBeDefined();
    expect(plugin.bigint).toBeDefined();
    expect(plugin.datetime).toBeDefined();
    expect(plugin.boolean).toBeDefined();
    expect(plugin.json).toBeDefined();
  });

  it('exports type-only namespaces (no runtime value)', () => {
    // These are type-only namespaces (re-exports of .d.ts modules)
    // They may not have runtime values depending on the Drizzle version
    // Just verify the exports exist without throwing
    expect(plugin).toHaveProperty('postgres');
    expect(plugin).toHaveProperty('sqlite');
    expect(plugin).toHaveProperty('d1');
  });
});
