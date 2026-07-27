import type { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import type { Application } from '../application';
import type { IApplicationContext } from './application-context.interface';
import type { Constructor } from '../types';

/**
 * Processor callback for plugin pre/post hooks.
 * Receives app, hono, and the application context (registry) for sharing pipeline data.
 */
export type PluginProcessor = (
  app: Application,
  hono: Hono,
  ctx: IApplicationContext,
) => void | Promise<void>;

/**
 * Optional metadata for plugin diagnostics.
 */
export interface PluginMeta {
  /**
   * Stable plugin name used for diagnostics.
   */
  name?: string;
}

/**
 * Object form of a plugin entry with optional pre/post processors.
 * Processors run before (pre) or after (post) the plugin's lifecycle hooks.
 */
export interface PluginEntryObject {
  plugin: IPlugin | Constructor<IPlugin>;
  /**
   * Optional stable plugin name for diagnostics.
   * Takes precedence over plugin.meta.name.
   */
  name?: string;
  preProcessors?: PluginProcessor[];
  postProcessors?: PluginProcessor[];
}

/**
 * Lifecycle status for a managed service.
 */
export enum ServiceStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  READY = 'ready',
  STOPPING = 'stopping',
  ERROR = 'error',
  RECONNECTING = 'reconnecting',
  DEAD = 'dead',
}

/**
 * Health information for a single service.
 */
export interface ServiceHealth {
  status: ServiceStatus;
  error?: string;
  lastCheck?: number;
  uptime?: number;
  reconnectCount?: number;
}

/**
 * Interface for Honest framework plugins
 * Plugins can extend the framework's functionality by hooking into
 * different stages of the application lifecycle
 */
export interface IPlugin {
  /**
   * Optional metadata for plugin diagnostics.
   */
  meta?: PluginMeta;

  /**
   * Stable plugin identifier, used for diagnostics and logging.
   */
  name: string;

  /**
   * Application logger, injected by the framework before lifecycle hooks run.
   * Use this to emit structured log events from within plugin code.
   */
  logger?: ILogger;

  /**
   * Hook that runs before module registration begins.
   * Use this to set up plugin functionality that modules might depend on.
   * @param app - The Honest application instance
   * @param hono - The underlying Hono application instance
   */
  beforeModulesRegistered?: (app: Application, hono: Hono) => void | Promise<void>;

  /**
   * Hook that runs after all modules have been registered.
   * Use this to perform cleanup or setup that requires all modules to be ready.
   * @param app - The Honest application instance
   * @param hono - The underlying Hono application instance
   */
  afterModulesRegistered?: (app: Application, hono: Hono) => void | Promise<void>;

  // ── Runtime Phase (optional) ──────────────────────────────

  /**
   * Hook that runs after HTTP server is ready, in background.
   * Use this for async initialization that should not block the HTTP server startup.
   */
  onBootstrap?: () => Promise<void>;

  /**
   * Hook that runs during graceful shutdown.
   * Use this to close connections and release resources.
   */
  onShutdown?: () => Promise<void>;

  /**
   * Returns the current health status of this service.
   * Only called if the plugin implements onBootstrap or onShutdown.
   */
  onHealthCheck?: () => ServiceHealth;

  /**
   * Names of other plugins or DI Tokens that must bootstrap before this one.
   * PluginEngine uses this for dependency ordering.
   */
  dependsOn?: (string | Function)[];
}

/**
 * Type for plugin implementations
 * Can be either a class implementing IPlugin or an instance of IPlugin
 */
export type PluginType = Constructor<IPlugin> | IPlugin;

/**
 * Plugin entry: either a plain plugin or an object wrapping a plugin with optional processors.
 * Use the object form to attach preProcessors (run before lifecycle hooks) and postProcessors
 * (run after). Processors receive (app, hono, ctx) where ctx is the application context.
 */
export type PluginEntry = PluginType | PluginEntryObject;
