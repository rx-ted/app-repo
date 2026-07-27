import type { Context, Next } from 'hono';
import { NOOP_LOGGER } from '@rx-ted/packages-core';
import type { ILogger } from '@rx-ted/packages-core';
import { HONEST_PIPELINE_CONTROLLER_KEY, HONEST_PIPELINE_HANDLER_KEY } from '../constants';
import { createErrorResponse } from '../helpers';
import type {
  ArgumentMetadata,
  DiContainer,
  FilterType,
  GuardType,
  IMetadataRepository,
  IFilter,
  IGuard,
  IMiddleware,
  IPipe,
  MiddlewareType,
  PipeType,
  MetadataComponentType,
} from '../interfaces';
import type { ComponentType, ComponentTypeMap } from '../registries';
import type { Constructor } from '../types';
import { isObject } from '../utils';

type PipelineInstance = MiddlewareType | GuardType | PipeType | FilterType;
type ComponentStore = Map<string, Set<PipelineInstance> | Map<string, unknown>>;

const PLUGIN_NOT_FOUND = (key: string) =>
  `Plugin "${key}" not found. Ensure the corresponding plugin is active and registered before accessing it.`;

/**
 * Manager class for handling all component types in the Honest framework.
 *
 * Each Application instance owns a ComponentManager, which holds per-app
 * global components and a reference to the DI container. Controller-level
 * and handler-level components remain in MetadataRegistry (static, set at
 * class-definition time by decorators).
 */
export class ComponentManager {
  private readonly globalComponents: ComponentStore;

  constructor(
    private readonly container: DiContainer,
    private readonly metadataRepository: IMetadataRepository,
    private readonly logger: ILogger = NOOP_LOGGER,
  ) {
    this.globalComponents = new Map<string, Set<PipelineInstance> | Map<string, unknown>>([
      ['middleware', new Set<MiddlewareType>()] as const,
      ['guard', new Set<GuardType>()] as const,
      ['pipe', new Set<PipeType>()] as const,
      ['filter', new Set<FilterType>()] as const,
    ]);
  }

  /**
   * Configures global components from application options.
   */
  setupGlobalComponents(options: {
    components?: {
      middleware?: MiddlewareType[];
      guards?: GuardType[];
      pipes?: PipeType[];
      filters?: FilterType[];
    };
  }): void {
    const components = options.components || {};

    if (components.middleware) {
      this.registerGlobal('middleware', ...components.middleware);
    }

    if (components.guards) {
      this.registerGlobal('guard', ...components.guards);
    }

    if (components.pipes) {
      this.registerGlobal('pipe', ...components.pipes);
    }

    if (components.filters) {
      this.registerGlobal('filter', ...components.filters);
    }
  }

  registerGlobal<T extends ComponentType>(type: T, ...components: ComponentTypeMap[T][]): void {
    const store = this.globalComponents.get(type);
    if (!store || !(store instanceof Set)) return;
    components.forEach((component) => {
      (store as Set<unknown>).add(component);
    });
  }

  getGlobal<T extends ComponentType>(type: T): Set<ComponentTypeMap[T]> {
    const store = this.globalComponents.get(type);
    if (!store || !(store instanceof Set)) {
      return new Set() as Set<ComponentTypeMap[T]>;
    }
    return store as unknown as Set<ComponentTypeMap[T]>;
  }

  /**
   * Gets all components of a specific type for a handler.
   * Merges: instance global → static controller → static handler.
   */
  getComponents<T extends ComponentType>(
    type: T,
    controller: Constructor,
    handlerName: string | symbol,
  ): ComponentTypeMap[T][] {
    if (type === 'plugin') return [] as ComponentTypeMap[T][];

    const handlerComponents = this.metadataRepository.getHandlerComponents(
      type as MetadataComponentType,
      controller,
      handlerName,
    );
    const controllerComponents = this.metadataRepository.getControllerComponents(
      type as MetadataComponentType,
      controller,
    );
    const store = this.globalComponents.get(type);
    const globalComponents = store instanceof Set ? Array.from(store) : [];

    return [
      ...globalComponents,
      ...controllerComponents,
      ...handlerComponents,
    ] as ComponentTypeMap[T][];
  }

  // -- Middleware --

  resolveMiddleware(
    middlewareItems: MiddlewareType[],
  ): ((c: Context, next: Next) => Promise<Response | void>)[] {
    return middlewareItems.map((middlewareItem) => {
      if (isObject(middlewareItem) && 'use' in middlewareItem) {
        return (middlewareItem as IMiddleware).use.bind(middlewareItem);
      }

      const middleware = this.container.resolve(middlewareItem as Constructor<IMiddleware>);
      return middleware.use.bind(middleware);
    });
  }

  getHandlerMiddleware(
    controller: Constructor,
    handlerName: string | symbol,
  ): ((c: Context, next: Next) => Promise<Response | void>)[] {
    const controllerMiddleware = this.metadataRepository.getControllerComponents(
      'middleware',
      controller,
    );
    const handlerMiddleware = this.metadataRepository.getHandlerComponents(
      'middleware',
      controller,
      handlerName,
    );
    return this.resolveMiddleware([
      ...controllerMiddleware,
      ...handlerMiddleware,
    ] as MiddlewareType[]);
  }

  getGlobalMiddleware(): ((c: Context, next: Next) => Promise<Response | void>)[] {
    const middlewareStore = this.globalComponents.get('middleware');
    const globalMiddleware = middlewareStore instanceof Set ? Array.from(middlewareStore) : [];
    return this.resolveMiddleware(globalMiddleware as MiddlewareType[]);
  }

  // -- Guards --

  resolveGuards(guardItems: GuardType[]): IGuard[] {
    return guardItems.map((guardItem) => {
      if (isObject(guardItem) && 'canActivate' in guardItem) {
        return guardItem as IGuard;
      }

      return this.container.resolve(guardItem as Constructor<IGuard>);
    });
  }

  getHandlerGuards(controller: Constructor, handlerName: string | symbol): IGuard[] {
    const guardItems = this.getComponents('guard', controller, handlerName);
    return this.resolveGuards(guardItems as GuardType[]);
  }

  // -- Pipes --

  resolvePipes(pipeItems: PipeType[]): IPipe[] {
    return pipeItems.map((pipeItem) => {
      if (isObject(pipeItem) && 'transform' in pipeItem) {
        return pipeItem as IPipe;
      }

      return this.container.resolve(pipeItem as Constructor<IPipe>);
    });
  }

  getHandlerPipes(controller: Constructor, handlerName: string | symbol): IPipe[] {
    const pipeItems = this.getComponents('pipe', controller, handlerName);
    return this.resolvePipes(pipeItems as PipeType[]);
  }

  async executePipes(
    value: unknown,
    metadata: ArgumentMetadata,
    pipes: ReadonlyArray<IPipe>,
  ): Promise<unknown> {
    let transformedValue = value;

    for (const pipe of pipes) {
      transformedValue = await pipe.transform(transformedValue, metadata);
    }

    return transformedValue;
  }

  // -- Filters --

  async handleException(exception: unknown, context: Context): Promise<Response | undefined> {
    const normalizedException =
      exception instanceof Error ? exception : new Error(String(exception));
    const controller = context.get(HONEST_PIPELINE_CONTROLLER_KEY) as Constructor | undefined;
    const handlerName = context.get(HONEST_PIPELINE_HANDLER_KEY) as string | undefined;

    if (controller && handlerName) {
      const handlerFilters = this.metadataRepository.getHandlerComponents(
        'filter',
        controller,
        handlerName,
      );
      if (handlerFilters.length > 0) {
        const response = await this.executeFilters(
          handlerFilters as FilterType[],
          normalizedException,
          context,
        );
        if (response) return response;
      }
    }

    if (controller) {
      const controllerFilters = this.metadataRepository.getControllerComponents(
        'filter',
        controller,
      );
      if (controllerFilters.length > 0) {
        const response = await this.executeFilters(
          controllerFilters as FilterType[],
          normalizedException,
          context,
        );
        if (response) return response;
      }
    }

    const filterStore = this.globalComponents.get('filter');
    const globalFilters = filterStore instanceof Set ? Array.from(filterStore) : [];
    if (globalFilters.length > 0) {
      const response = await this.executeFilters(
        globalFilters as FilterType[],
        normalizedException,
        context,
      );
      if (response) return response;
    }

    const { response, status } = createErrorResponse(normalizedException, context);
    return context.json(response, status);
  }

  private async executeFilters(
    filterItems: FilterType[],
    exception: Error,
    context: Context,
  ): Promise<Response | undefined> {
    for (const filterItem of filterItems) {
      let filter: IFilter;

      if (isObject(filterItem) && 'catch' in filterItem) {
        filter = filterItem as IFilter;
      } else {
        filter = this.container.resolve(filterItem as Constructor<IFilter>);
      }

      try {
        const result = await filter.catch(exception, context);
        if (result !== undefined) {
          return result as Response;
        }
      } catch (filterError) {
        const filterName = filter.constructor?.name || 'UnknownFilter';
        this.logger.error(
          {
            category: 'errors',
            filter: filterName,
            error: filterError instanceof Error ? filterError.message : String(filterError),
          },
          'Error in exception filter',
        );

        const { response, status } = createErrorResponse(filterError, context);
        return context.json(response, status);
      }
    }
    return undefined;
  }

  // -- Module registration --

  async registerModule(
    moduleClass: Constructor,
    registered = new Set<Constructor>(),
  ): Promise<Constructor[]> {
    if (registered.has(moduleClass)) {
      return [];
    }
    registered.add(moduleClass);

    const moduleOptions = this.metadataRepository.getModuleOptions(moduleClass);

    if (!moduleOptions) {
      this.logger.error(
        { category: 'startup' },
        `Module ${moduleClass.name} is not properly decorated with @Module()`,
      );
      throw new Error(`Module ${moduleClass.name} is not properly decorated with @Module()`);
    }

    const controllers: Constructor[] = [];

    if (moduleOptions.imports && moduleOptions.imports.length > 0) {
      for (const importedModule of moduleOptions.imports) {
        const importedControllers = await this.registerModule(importedModule, registered);
        controllers.push(...importedControllers);
      }
    }

    if (moduleOptions.services && moduleOptions.services.length > 0) {
      for (const serviceClass of moduleOptions.services) {
        this.container.resolve(serviceClass);
      }
    }

    if (moduleOptions.controllers && moduleOptions.controllers.length > 0) {
      controllers.push(...moduleOptions.controllers);
    }

    return controllers;
  }

  registerPlugin<T>(key: string | symbol, instance: T): void {
    ComponentManager.getPluginStore().set(key, instance);
  }

  getPlugin<T>(key: string | symbol): T {
    const store = ComponentManager.getPluginStore();
    const instance = store.get(key);
    if (!instance) {
      throw new Error(PLUGIN_NOT_FOUND(String(key)));
    }
    return instance as T;
  }

  hasPlugin(key: string | symbol): boolean {
    return ComponentManager.getPluginStore().has(key);
  }

  private static pluginStore: Map<string | symbol, unknown> | null = null;

  private static getPluginStore(): Map<string | symbol, unknown> {
    if (!ComponentManager.pluginStore) {
      ComponentManager.pluginStore = new Map<string | symbol, unknown>();
    }
    return ComponentManager.pluginStore;
  }

  static registerPlugin<T>(key: string | symbol, instance: T): void {
    ComponentManager.getPluginStore().set(key, instance);
  }

  static getPlugin<T>(key: string | symbol): T {
    const instance = ComponentManager.getPluginStore().get(key);
    if (!instance) {
      throw new Error(PLUGIN_NOT_FOUND(String(key)));
    }
    return instance as T;
  }

  static hasPlugin(key: string | symbol): boolean {
    return ComponentManager.getPluginStore().has(key);
  }
}
