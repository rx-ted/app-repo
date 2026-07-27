import { NOOP_LOGGER } from '@rx-ted/packages-core';
import type { ILogger } from '@rx-ted/packages-core';
import type { DiContainer, IServiceRegistry } from '../interfaces';
import { StaticServiceRegistry } from '../registries';
import type { Constructor } from '../types';

/**
 * Dependency Injection container that manages class instances and their dependencies
 */
export class Container implements DiContainer {
  constructor(
    private readonly serviceRegistry: IServiceRegistry = new StaticServiceRegistry(),
    private readonly logger: ILogger = NOOP_LOGGER,
    private readonly debugDi = false,
  ) {}

  /**
   * Map of class constructors to their instances
   */
  private instances = new Map<Constructor, any>();

  private emitLog(
    level: 'debug' | 'error' | 'warn',
    message: string,
    details?: Record<string, unknown>,
  ): void {
    if (!this.debugDi) {
      return;
    }
    const context: Record<string, unknown> = { category: 'di' };
    if (details) {
      Object.assign(context, details);
    }
    if (level === 'debug') {
      this.logger.debug(context, message);
    } else if (level === 'warn') {
      this.logger.warn(context, message);
    } else {
      this.logger.error(context, message);
    }
  }

  /**
   * Resolves a class instance, creating it if necessary and injecting its dependencies
   * @param target - The class constructor to resolve
   * @returns An instance of the target class
   */
  resolve<T>(target: Constructor<T>): T {
    return this.resolveWithTracking(target, new Set<Constructor>());
  }

  /**
   * Internal recursive resolver with circular dependency tracking
   */
  private resolveWithTracking<T>(target: Constructor<T>, resolving: Set<Constructor>): T {
    if (this.instances.has(target)) {
      this.emitLog('debug', `Resolved ${target.name} from DI cache`);
      return this.instances.get(target);
    }

    if (resolving.has(target)) {
      const cycle = [...resolving.keys(), target].map((t) => t.name).join(' -> ');
      this.emitLog('error', `Circular dependency detected while resolving ${target.name}`, {
        cycle,
      });
      throw new Error(`Circular dependency detected: ${cycle}`);
    }
    resolving.add(target);

    this.emitLog('debug', `Resolving ${target.name}`, {
      resolving: [...resolving].map((constructor) => constructor.name),
    });

    // Priority: 1) @Inject() decorator metadata  → 2) design:paramtypes (tsc emit)
    // @Inject() is required when running under esbuild (Cloudflare Workers)
    // because esbuild does not emit design:paramtypes.
    const injectParams = Reflect.getOwnMetadata('di:inject:params', target) as
      | (Constructor | undefined)[]
      | undefined;
    const designParams = Reflect.getMetadata('design:paramtypes', target) as
      | (Constructor | undefined)[]
      | undefined;
    const paramTypes = injectParams ?? designParams ?? [];
    if (target.length > 0 && paramTypes.length === 0) {
      if (!this.serviceRegistry.isService(target)) {
        this.emitLog(
          'error',
          `Cannot resolve ${target.name}: missing @Injectable() or @Service() decorator`,
        );
        throw new Error(
          `Cannot resolve ${target.name}: it is not decorated with @Injectable() or @Service(). Did you forget to add @Injectable() or @Service() to the class?`,
        );
      }
      this.emitLog(
        'error',
        `Cannot resolve ${target.name}: missing dependency metadata for ${target.length} parameter(s). Add @Inject() to each constructor parameter.`,
      );
      throw new Error(
        `Cannot resolve ${target.name}: constructor has ${target.length} parameter(s) but no dependency metadata was found. ` +
          `Use @Inject() on each constructor parameter when running under esbuild (Cloudflare Workers).`,
      );
    }

    const dependencies = paramTypes.map((paramType, index) => {
      if (!paramType || paramType === Object || paramType === Array || paramType === Function) {
        this.emitLog('error', `Cannot resolve dependency at index ${index} of ${target.name}`);
        throw new Error(
          `Cannot resolve dependency at index ${index} of ${target.name}. Use concrete class types for constructor dependencies.`,
        );
      }
      return this.resolveWithTracking(paramType, new Set(resolving));
    });

    const instance = new target(...dependencies);
    this.instances.set(target, instance);

    this.emitLog('debug', `Created ${target.name} instance`, {
      dependencyCount: dependencies.length,
    });

    return instance;
  }

  /**
   * Registers a pre-created instance for a class
   * @param target - The class constructor to register
   * @param instance - The instance to register
   */
  register<T>(target: Constructor<T>, instance: T): void {
    this.instances.set(target, instance);
  }

  has<T>(target: Constructor<T>): boolean {
    return this.instances.has(target);
  }

  clear(): void {
    this.instances.clear();
  }
}
