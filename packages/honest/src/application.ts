import { Hono } from 'hono';
import type { ILogger } from '@rx-ted/packages-core';
import {
  ENV_SYMBOL,
  LOGGER_SYMBOL,
  detectPlatform,
  NOOP_LOGGER,
  Logger,
  Platform,
  Env,
} from '@rx-ted/packages-core';
import { emitStartupGuide as emitStartupGuideLogs } from './application/startup-guide';
import { normalizePluginEntries } from './application/plugin-entries';
import { ApplicationContext } from './application-context';
import { Container } from './di';
import { ErrorHandler, NotFoundHandler } from './handlers';
import type {
  DiContainer,
  HonestOptions,
  IApplicationContext,
  IMetadataRepository,
  RouteInfo,
} from './interfaces';
import { ComponentManager, RouteManager } from './managers';
import { MetadataRepository, RouteRegistry } from './registries';
import type { Constructor } from './types';
import { isObject } from './utils';
import { PluginEngine } from './plugin-engine';

export const APP_SYMBOL = Symbol('app:honest');

export class Application {
  readonly hono: Hono;
  readonly logger: ILogger;
  readonly options: HonestOptions;

  private container!: DiContainer;
  private context!: IApplicationContext;
  private routeRegistry!: RouteRegistry;
  private metadataRepository!: IMetadataRepository;
  private componentManager!: ComponentManager;
  private routeManager!: RouteManager;
  private pluginEngine!: PluginEngine;

  constructor(options: HonestOptions = {}) {
    this.options = isObject(options) ? options : {};
    this.hono = this.options.existingHono ?? new Hono(this.options.hono);

    // Per-request Runtime context
    this.hono.use('*', (c, next) =>
      Platform.run(
        {
          platform: detectPlatform(),
          env: Platform.env(),
          request: c.req.raw,
        },
        () => next(),
      ),
    );

    this.logger = resolveLogger(this.options.logger, this.options.debug);
    this.pluginEngine = new PluginEngine(this.logger);

    this.setupErrorHandlers();

    if (this.options.deprecations?.printPreV1Warning) {
      this.logger.warn(
        { category: 'deprecations' },
        'Pre-v1 warning: APIs may change before 1.0.0.',
      );
    }
  }

  async create(rootModule: Constructor): Promise<void> {
    const startupStartedAt = Date.now();

    // Load env and make it available via ENV_SYMBOL
    const appEnv = new Env(process.env, Platform.env());
    ComponentManager.registerPlugin(ENV_SYMBOL, appEnv);

    // App-level Platform context (overridable by per-request context)
    Platform.setAppContext({
      platform: detectPlatform(),
      env: appEnv,
    });

    const debugPipeline =
      this.options.debug === true ||
      (typeof this.options.debug === 'object' && Boolean(this.options.debug.pipeline));
    const debugDi =
      this.options.debug === true ||
      (typeof this.options.debug === 'object' && Boolean(this.options.debug.di));

    this.metadataRepository = MetadataRepository.fromRootModule(rootModule);
    this.container = this.options.container || new Container(undefined, this.logger, debugDi);
    this.context = new ApplicationContext();
    this.routeRegistry = new RouteRegistry();
    this.componentManager = new ComponentManager(
      this.container,
      this.metadataRepository,
      this.logger,
    );
    this.componentManager.setupGlobalComponents(this.options);

    this.routeManager = new RouteManager(
      this.hono,
      this.container,
      this.routeRegistry,
      this.componentManager,
      this.metadataRepository,
      this.logger,
      {
        prefix: this.options.routing?.prefix,
        version: this.options.routing?.version,
        debugPipeline,
      },
    );

    const entries = normalizePluginEntries(this.options.plugins);
    const ctx = this.getContext();
    const debug = this.options.debug;
    const debugPlugins = debug === true || (typeof debug === 'object' && debug.plugins);
    const debugRoutes = debug === true || (typeof debug === 'object' && debug.routes);
    const debugStartup =
      debug === true || (typeof debug === 'object' && (debug.startup || debugRoutes));
    let strictNoRoutesFailureEmitted = false;

    try {
      if (debugPlugins && entries.length > 0) {
        this.logger.info(
          { category: 'plugins' },
          `Plugin order: ${entries.map(({ name }) => name).join(' -> ')}`,
        );
      }

      ComponentManager.registerPlugin(LOGGER_SYMBOL, this.logger);

      // Register plugins with PluginEngine for runtime lifecycle management
      for (const entry of entries) {
        this.pluginEngine.register(entry);
      }

      await this.pluginEngine.runPreBuild(entries, this, this.hono, ctx);

      await this.register(rootModule);

      const routes = this.getRoutes();
      if (debugStartup) {
        this.logger.info(
          { category: 'startup', routeCount: routes.length, rootModule: rootModule.name },
          `Application registered ${routes.length} route(s)`,
        );
      }
      if (this.options.strict?.requireRoutes && routes.length === 0) {
        strictNoRoutesFailureEmitted = true;
        this.logger.error(
          {
            category: 'startup',
            rootModule: rootModule.name,
            requireRoutes: true,
            startupDurationMs: Date.now() - startupStartedAt,
          },
          'Strict mode failed: no routes were registered',
        );
        const strictError = new Error(
          'Strict mode: no routes were registered. Check your module/controller decorators.',
        );
        this.emitStartupGuide(strictError, rootModule);
        throw strictError;
      }
      if (debugRoutes) {
        this.logger.info(
          {
            category: 'routes',
            routes: routes.map((route) => `${route.method.toUpperCase()} ${route.fullPath}`),
          },
          'Registered routes',
        );
      }

      await this.pluginEngine.runPostBuild(entries, this, this.hono, ctx);

      ComponentManager.registerPlugin(APP_SYMBOL, this);

      if (debugStartup) {
        this.logger.info(
          {
            category: 'startup',
            rootModule: rootModule.name,
            pluginCount: entries.length,
            routeCount: routes.length,
            startupDurationMs: Date.now() - startupStartedAt,
          },
          'Application startup completed',
        );
      }
    } catch (error: unknown) {
      this.emitStartupGuide(error, rootModule);

      if (debugStartup && !strictNoRoutesFailureEmitted) {
        this.logger.error(
          {
            category: 'startup',
            rootModule: rootModule.name,
            startupDurationMs: Date.now() - startupStartedAt,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          'Application startup failed',
        );
      }
      throw error;
    }
  }

  private setupErrorHandlers(): void {
    this.hono.notFound(this.options.notFound || NotFoundHandler.handle());
    this.hono.onError(this.options.onError || ErrorHandler.handle());
  }

  private shouldEmitRouteDiagnostics(): boolean {
    const debug = this.options.debug;
    return debug === true || (typeof debug === 'object' && Boolean(debug.routes));
  }

  private emitStartupGuide(error: unknown, rootModule: Constructor): void {
    emitStartupGuideLogs(this.logger, this.options.startupGuide, error, rootModule);
  }

  async register(moduleClass: Constructor): Promise<Application> {
    const controllers = await this.componentManager.registerModule(moduleClass);
    const debugRoutes = this.shouldEmitRouteDiagnostics();

    for (const controller of controllers) {
      const controllerStartedAt = Date.now();
      const routeCountBefore = this.routeRegistry.getRoutes().length;
      try {
        await this.routeManager.registerController(controller);
        if (debugRoutes) {
          this.logger.info(
            {
              category: 'routes',
              controller: controller.name,
              routeCountAdded: this.routeRegistry.getRoutes().length - routeCountBefore,
              registrationDurationMs: Date.now() - controllerStartedAt,
            },
            'Registered controller routes',
          );
        }
      } catch (error: unknown) {
        if (debugRoutes) {
          this.logger.error(
            {
              category: 'routes',
              controller: controller.name,
              registrationDurationMs: Date.now() - controllerStartedAt,
              errorMessage: error instanceof Error ? error.message : String(error),
            },
            'Failed to register controller routes',
          );
        }
        throw error;
      }
    }

    return this;
  }

  static async create(
    rootModule: Constructor,
    options: HonestOptions = {},
  ): Promise<{ app: Application; hono: Hono }> {
    const app = new Application(options);
    await app.create(rootModule);
    return { app, hono: app.hono };
  }

  getApp(): Hono {
    return this.hono;
  }

  getContainer(): DiContainer {
    return this.container;
  }

  getContext(): IApplicationContext {
    return this.context;
  }

  getPluginEngine(): PluginEngine {
    return this.pluginEngine;
  }

  getRoutes(): ReadonlyArray<RouteInfo> {
    return this.routeRegistry.getRoutes();
  }

  getRoutingOptions(): HonestOptions['routing'] | undefined {
    return this.options.routing;
  }

  getMetadataRepository(): IMetadataRepository {
    return this.metadataRepository;
  }

  private onStartCallbacks: Array<(port: number) => void> = [];

  registerOnStartCallback(callback: (port: number) => void): void {
    this.onStartCallbacks.push(callback);
  }

  emitOnStart(port: number): void {
    for (const callback of this.onStartCallbacks) {
      try {
        callback(port);
      } catch (error) {
        this.logger.error(
          {
            category: 'startup',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          'Error in onStart callback',
        );
      }
    }
  }
}

function resolveLogger(
  loggerOption: ILogger | undefined,
  debugOption: HonestOptions['debug'],
): ILogger {
  if (loggerOption) {
    if (typeof loggerOption.child === 'function') {
      try {
        return loggerOption.child({ module: 'honest' });
      } catch {}
    }
    return loggerOption;
  }

  if (process.env.VITEST || process.env.NODE_ENV === 'test') return NOOP_LOGGER;

  const debugEnabled =
    debugOption === true ||
    (typeof debugOption === 'object' && Object.values(debugOption).some(Boolean));

  return new Logger({ name: 'honest', level: debugEnabled ? 'debug' : 'info' });
}
