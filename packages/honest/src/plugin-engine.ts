import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import type { Application } from './application';
import type { IApplicationContext, IPlugin, ServiceHealth } from './interfaces';
import { ServiceStatus } from './interfaces';
import type { NormalizedPluginEntry } from './application/plugin-entries';
import { topologicalSort } from './topology';
import { calculateDelay, resolveReconnectConfig } from './reconnect';
import type { ReconnectConfig } from './reconnect';

interface ManagedService {
  plugin: IPlugin;
  status: ServiceStatus;
  health: ServiceHealth;
  startTime?: number;
  reconnectCount: number;
  reconnectConfig: ReconnectConfig;
}

export class PluginEngine {
  private services = new Map<string, ManagedService>();
  private tokenMap = new Map<Function, string>();
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * Register a normalized plugin entry.
   * Should be called during Application initialization before runPreBuild.
   */
  register(entry: NormalizedPluginEntry): void {
    const service: ManagedService = {
      plugin: entry.plugin,
      status: ServiceStatus.STOPPED,
      health: { status: ServiceStatus.STOPPED },
      reconnectCount: 0,
      reconnectConfig: resolveReconnectConfig(),
    };
    this.services.set(entry.name, service);
    this.registerTokenForPlugin(entry.plugin, entry.name);
  }

  /**
   * Register a raw IPlugin instance with a given name.
   */
  registerPlugin(name: string, plugin: IPlugin): void {
    const service: ManagedService = {
      plugin,
      status: ServiceStatus.STOPPED,
      health: { status: ServiceStatus.STOPPED },
      reconnectCount: 0,
      reconnectConfig: resolveReconnectConfig(),
    };
    this.services.set(name, service);
    this.registerTokenForPlugin(plugin, name);
  }

  /**
   * Register a DI token (constructor) -> plugin name mapping.
   * This enables dependsOn to use constructor references instead of strings.
   */
  registerToken(token: Function, pluginName: string): void {
    this.tokenMap.set(token, pluginName);
  }

  private registerTokenForPlugin(plugin: IPlugin, name: string): void {
    const ctor = plugin.constructor;
    if (ctor?.name !== 'Object') {
      this.tokenMap.set(ctor as unknown as Function, name);
    }
  }

  private resolveDepToken(token: Function): string | undefined {
    return this.tokenMap.get(token);
  }

  // ── Build Phase ──────────────────────────────────────────

  /**
   * Run preProcessors and beforeModulesRegistered for all registered plugins.
   * Order matches plugin registration order.
   */
  async runPreBuild(
    entries: NormalizedPluginEntry[],
    app: Application,
    hono: Hono,
    ctx: IApplicationContext,
  ): Promise<void> {
    for (const entry of entries) {
      for (const fn of entry.preProcessors) {
        await fn(app, hono, ctx);
      }
      if (entry.plugin.beforeModulesRegistered) {
        await entry.plugin.beforeModulesRegistered(app, hono);
      }
    }
  }

  /**
   * Run afterModulesRegistered and postProcessors for all registered plugins.
   * Order matches plugin registration order.
   */
  async runPostBuild(
    entries: NormalizedPluginEntry[],
    app: Application,
    hono: Hono,
    ctx: IApplicationContext,
  ): Promise<void> {
    for (const entry of entries) {
      if (entry.plugin.afterModulesRegistered) {
        await entry.plugin.afterModulesRegistered(app, hono);
      }
      for (const fn of entry.postProcessors) {
        await fn(app, hono, ctx);
      }
    }
  }

  // ── Runtime Phase ────────────────────────────────────────

  /**
   * Bootstrap all services with topological dependency ordering.
   * Services in the same dependency layer run concurrently.
   */
  async runBootstrap(): Promise<void> {
    const runtimeServices: { name: string; service: ManagedService }[] = [];

    for (const [name, service] of this.services) {
      if (service.plugin.onBootstrap) {
        runtimeServices.push({ name, service });
      }
    }

    if (runtimeServices.length === 0) return;

    const layers = topologicalSort(
      runtimeServices.map(({ name, service }) => ({
        name,
        dependsOn: service.plugin.dependsOn ?? [],
      })),
      (token) => this.resolveDepToken(token),
    );

    for (const layer of layers) {
      await Promise.all(
        layer.items.map(async ({ name }) => {
          const svc = this.services.get(name)!;
          await this.bootstrapService(name, svc);
        }),
      );
    }
  }

  private async bootstrapService(name: string, svc: ManagedService): Promise<void> {
    svc.status = ServiceStatus.STARTING;
    svc.health = { status: ServiceStatus.STARTING, reconnectCount: svc.reconnectCount };

    try {
      svc.startTime = Date.now();
      await svc.plugin.onBootstrap!();
      svc.status = ServiceStatus.READY;
      svc.health = {
        status: ServiceStatus.READY,
        uptime: Date.now() - svc.startTime,
        lastCheck: Date.now(),
        reconnectCount: svc.reconnectCount,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(
        { category: 'runtime', service: name, error: message },
        `[runtime] service "${name}" bootstrap failed: ${message}`,
      );
      svc.status = ServiceStatus.ERROR;
      svc.health = {
        status: ServiceStatus.ERROR,
        error: message,
        lastCheck: Date.now(),
        reconnectCount: svc.reconnectCount,
      };
      this.scheduleReconnect(name, svc);
    }
  }

  /**
   * Shut down all services in reverse dependency order.
   */
  async runShutdown(): Promise<void> {
    const runtimeServices: { name: string; service: ManagedService }[] = [];

    for (const [name, service] of this.services) {
      if (service.plugin.onShutdown) {
        runtimeServices.push({ name, service });
      }
    }

    if (runtimeServices.length === 0) return;

    const layers = topologicalSort(
      runtimeServices.map(({ name, service }) => ({
        name,
        dependsOn: service.plugin.dependsOn ?? [],
      })),
      (token) => this.resolveDepToken(token),
    );

    for (let i = layers.length - 1; i >= 0; i--) {
      await Promise.all(
        layers[i].items.map(async ({ name }) => {
          const svc = this.services.get(name)!;
          if (svc.status === ServiceStatus.READY || svc.status === ServiceStatus.ERROR) {
            await this.shutdownService(name, svc);
          }
        }),
      );
    }
  }

  private async shutdownService(name: string, svc: ManagedService): Promise<void> {
    svc.status = ServiceStatus.STOPPING;
    try {
      await svc.plugin.onShutdown!();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error(
        { category: 'runtime', service: name, error: message },
        `[runtime] service "${name}" shutdown error: ${message}`,
      );
    }
    svc.status = ServiceStatus.STOPPED;
    svc.health = { status: ServiceStatus.STOPPED };
  }

  // ── Health ───────────────────────────────────────────────

  /**
   * Get health for a single service by name.
   */
  getService(name: string): ServiceHealth {
    const svc = this.services.get(name);
    if (!svc) return { status: ServiceStatus.STOPPED };
    return this.refreshHealth(name, svc);
  }

  /**
   * Get aggregated health for all managed services.
   */
  health(): Record<string, ServiceHealth> {
    const result: Record<string, ServiceHealth> = {};
    for (const [name, svc] of this.services) {
      result[name] = this.refreshHealth(name, svc);
    }
    return result;
  }

  private refreshHealth(name: string, svc: ManagedService): ServiceHealth {
    if (svc.plugin.onHealthCheck) {
      const custom = svc.plugin.onHealthCheck();
      svc.health = { ...svc.health, ...custom, lastCheck: Date.now() };
    }
    return { ...svc.health };
  }

  // ── Restart ──────────────────────────────────────────────

  /**
   * Restart a single service by name.
   */
  async restart(name: string): Promise<void> {
    const svc = this.services.get(name);
    if (!svc) {
      throw new Error(`Service "${name}" not found`);
    }
    if (svc.status === ServiceStatus.STARTING || svc.status === ServiceStatus.STOPPING) {
      throw new Error(`Service "${name}" is currently ${svc.status}, cannot restart`);
    }
    if (svc.plugin.onShutdown) {
      await this.shutdownService(name, svc);
    }
    if (svc.plugin.onBootstrap) {
      svc.reconnectCount = 0;
      await this.bootstrapService(name, svc);
    }
  }

  // ── Reconnect ────────────────────────────────────────────

  private reconnecting = new Set<string>();

  private scheduleReconnect(name: string, svc: ManagedService): void {
    if (this.reconnecting.has(name)) return;
    if (svc.reconnectCount >= svc.reconnectConfig.maxRetries) {
      svc.status = ServiceStatus.DEAD;
      svc.health = {
        status: ServiceStatus.DEAD,
        error: `exceeded max retries (${svc.reconnectConfig.maxRetries})`,
        lastCheck: Date.now(),
        reconnectCount: svc.reconnectCount,
      };
      return;
    }

    this.reconnecting.add(name);
    svc.reconnectCount++;
    svc.status = ServiceStatus.RECONNECTING;
    svc.health = {
      status: ServiceStatus.RECONNECTING,
      lastCheck: Date.now(),
      reconnectCount: svc.reconnectCount,
    };

    const delay = calculateDelay(svc.reconnectConfig, svc.reconnectCount);

    setTimeout(async () => {
      this.reconnecting.delete(name);
      await this.bootstrapService(name, svc);
    }, delay);
  }

  /**
   * Get the number of registered services.
   */
  get serviceCount(): number {
    return this.services.size;
  }
}
