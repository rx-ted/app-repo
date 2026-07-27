import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MysqlPlugin } from './plugin';
import type { Application } from '@rx-ted/packages-honest';

vi.mock('@rx-ted/packages-honest', () => ({
  ComponentManager: {
    registerPlugin: vi.fn(),
    getPlugin: vi.fn().mockReturnValue({ platform: 'node' }),
    hasPlugin: vi.fn(),
  },
  resolvePluginLogger: vi.fn().mockReturnValue({
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
  LOGGER_SYMBOL: Symbol('logger'),
}));

vi.mock('./client', () => ({
  createMysqlPool: vi.fn().mockReturnValue({ end: vi.fn() }),
  createMysqlClient: vi.fn(),
  MysqlDatabaseClient: class {
    constructor(public pool: any) {}
    prepare = vi.fn();
    getConnection = vi.fn();
    close = vi.fn();
  },
}));

vi.mock('./driver', () => ({
  createMysqlDriver: vi.fn().mockResolvedValue({
    query: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    close: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock('drizzle-orm/mysql2', () => ({
  drizzle: vi.fn().mockReturnValue({ _: 'drizzle-instance' }),
}));

import { ComponentManager } from '@rx-ted/packages-honest';
import { createMysqlPool } from './client';
import { createMysqlDriver } from './driver';
import { drizzle } from 'drizzle-orm/mysql2';
import { DB_GLOBAL_KEY } from '../constants';

function createMockApp(): Application {
  const ctx = new Map<string, any>();
  return {
    getContext: vi.fn().mockReturnValue({
      set: vi.fn((key: string, value: any) => {
        ctx.set(key, value);
      }),
      get: vi.fn((key: string) => ctx.get(key)),
    }),
  } as unknown as Application;
}

describe('MysqlPlugin', () => {
  let plugin: MysqlPlugin;
  let mockApp: Application;

  const defaultOptions = {
    connection: {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'secret',
      database: 'test',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = new MysqlPlugin(defaultOptions);
    mockApp = createMockApp();
  });

  describe('construction', () => {
    it('sets name and version', () => {
      expect(plugin.name).toBe('mysql-plugin');
      expect(plugin.version).toBe('1.0.0');
    });

    it('has static globalKey', () => {
      expect(MysqlPlugin.globalKey).toBe(DB_GLOBAL_KEY);
    });

    it('implements IPlugin', () => {
      expect(typeof plugin.beforeModulesRegistered).toBe('function');
      expect(typeof plugin.afterModulesRegistered).toBe('function');
      expect(typeof plugin.close).toBe('function');
    });
  });

  describe('beforeModulesRegistered', () => {
    it('creates pool, driver, and drizzle instance', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(createMysqlPool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: 'secret',
        database: 'test',
      });
      expect(createMysqlDriver).toHaveBeenCalled();
      expect(drizzle).toHaveBeenCalled();
    });

    it('registers the drizzle instance in ComponentManager', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(ComponentManager.registerPlugin).toHaveBeenCalledWith(
        DB_GLOBAL_KEY,
        expect.objectContaining({ _: 'drizzle-instance' }),
      );
    });

    it('stores pool, driver and drizzle in app context', async () => {
      const ctx = { set: vi.fn() };
      (mockApp.getContext as any).mockReturnValue(ctx);

      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(ctx.set).toHaveBeenCalledWith('honest:mysql:pool', expect.any(Object));
      expect(ctx.set).toHaveBeenCalledWith('honest:mysql', expect.any(Object));
      expect(ctx.set).toHaveBeenCalledWith('context:db', expect.any(Object));
    });

    it('uses custom contextKey if provided', async () => {
      const ctx = { set: vi.fn() };
      (mockApp.getContext as any).mockReturnValue(ctx);
      plugin = new MysqlPlugin({
        ...defaultOptions,
        contextKey: 'custom:ctx',
      });

      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(ctx.set).toHaveBeenCalledWith('custom:ctx', expect.any(Object));
    });
  });

  describe('afterModulesRegistered', () => {
    it('runs health check', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);
      const healthCheck = vi.fn().mockResolvedValue(true);

      (createMysqlDriver as any).mockResolvedValue({
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(),
        close: vi.fn(),
        healthCheck,
      });
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      await plugin.afterModulesRegistered(mockApp, {} as any);

      expect(healthCheck).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('getClient returns driver after init', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(plugin.getClient()).toBeDefined();
    });

    it('getClient throws before init', () => {
      expect(() => plugin.getClient()).toThrow('MySQL driver not initialized');
    });

    it('getDrizzle returns instance after init', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(plugin.getDrizzle()).toBeDefined();
    });

    it('getDrizzle throws before init', () => {
      expect(() => plugin.getDrizzle()).toThrow('Drizzle not initialized');
    });

    it('getPool returns pool after init', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      expect(plugin.getPool()).toBeDefined();
    });

    it('getPool throws before init', () => {
      expect(() => plugin.getPool()).toThrow('MySQL pool not initialized');
    });
  });

  describe('close', () => {
    it('calls close on driver and pool end', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      const driverClose = vi.fn().mockResolvedValue(undefined);
      (createMysqlDriver as any).mockResolvedValue({
        query: vi.fn(),
        execute: vi.fn(),
        transaction: vi.fn(),
        close: driverClose,
        healthCheck: vi.fn().mockResolvedValue(true),
      });
      await plugin.beforeModulesRegistered(mockApp, {} as any);

      await plugin.close();

      expect(driverClose).toHaveBeenCalled();
    });

    it('resets internal references after close', async () => {
      await plugin.beforeModulesRegistered(mockApp, {} as any);
      await plugin.close();

      expect(() => plugin.getClient()).toThrow('MySQL driver not initialized');
    });
  });
});
