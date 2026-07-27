import type {
  ApiDocOptions,
  ApiTagOptions,
  ControllerOptions,
  FilterType,
  GuardType,
  MiddlewareType,
  ModuleOptions,
  ParameterMetadata,
  PipeType,
  RedirectOptions,
  RouteDefinition,
} from '../interfaces';
import type { Constructor } from '../types';

export type ComponentType = 'middleware' | 'guard' | 'pipe' | 'filter' | 'plugin';

export type ComponentInstance = MiddlewareType | GuardType | PipeType | FilterType | unknown;

export interface ComponentTypeMap {
  middleware: MiddlewareType;
  guard: GuardType;
  pipe: PipeType;
  filter: FilterType;
  plugin: unknown;
}

/**
 * Central registry for managing application metadata
 * Stores and provides access to:
 * - Route definitions and controller configurations
 * - Injectable / Service and module registrations
 * - Parameter metadata and context indices
 * - Component registrations at global, controller, and handler levels
 */
export class MetadataRegistry {
  /**
   * Stores route definitions for each controller
   * Maps controller classes to their route configurations
   */
  private static readonly routes = new Map<Constructor, RouteDefinition[]>();

  /**
   * Stores base paths for controllers
   * Maps controller classes to their route prefixes
   */
  private static readonly controllers = new Map<Constructor, string>();

  /**
   * Stores configuration options for controllers
   * Includes settings like versioning and prefix options
   */
  private static readonly controllerOptions = new Map<Constructor, ControllerOptions>();

  /**
   * Stores API documentation metadata for controllers (tags)
   */
  private static readonly controllerTags = new Map<Constructor, ApiTagOptions>();

  /**
   * Stores API documentation metadata for routes
   * Keyed by controller constructor, then handler name
   */
  private static readonly routeApiDocs = new Map<
    Constructor,
    Map<string | symbol, ApiDocOptions>
  >();

  /**
   * Registry of service classes
   * Used for dependency injection and lifecycle management
   */
  private static readonly services = new Set<Constructor>();

  /**
   * Stores configuration options for modules
   * Includes imports, exports, providers, and controllers
   */
  private static readonly modules = new Map<Constructor, ModuleOptions>();

  /**
   * Stores parameter metadata for controller methods
   * Used for parameter transformation and validation
   */
  private static readonly parameters = new Map<
    Constructor,
    Map<string | symbol, ParameterMetadata[]>
  >();

  /**
   * Stores indices of context parameters in controller methods
   * Used for optimizing context injection
   */
  private static readonly contextIndices = new Map<Constructor, Map<string | symbol, number>>();

  /**
   * Registry for controller-level components
   * Components registered here apply to all routes in a specific controller
   */
  private static readonly controller = new Map<
    ComponentType,
    Map<Constructor, ComponentInstance[]>
  >([
    ['middleware', new Map<Constructor, MiddlewareType[]>()],
    ['guard', new Map<Constructor, GuardType[]>()],
    ['pipe', new Map<Constructor, PipeType[]>()],
    ['filter', new Map<Constructor, FilterType[]>()],
  ]);

  /**
   * Registry for handler-level components
   * Components registered here apply to specific route handlers
   * Keyed by controller constructor then handler name for collision-safe lookups
   */
  private static readonly handler = new Map<
    ComponentType,
    Map<Constructor, Map<string | symbol, ComponentInstance[]>>
  >([
    ['middleware', new Map()],
    ['guard', new Map()],
    ['pipe', new Map()],
    ['filter', new Map()],
  ]);

  /**
   * Stores redirect metadata for route handlers
   * Maps controller -> handler name -> RedirectOptions
   */
  private static readonly redirects = new Map<Constructor, Map<string | symbol, RedirectOptions>>();

  /**
   * Gets all route definitions for a controller
   * @param controller - The controller class to get routes for
   * @returns Array of route definitions for the controller
   */
  static getRoutes(controller: Constructor): RouteDefinition[] {
    return this.routes.get(controller) || [];
  }

  /**
   * Set routes for a controller
   */
  static setRoutes(controller: Constructor, routes: RouteDefinition[]): void {
    this.routes.set(controller, routes);
  }

  /**
   * Add a route to a controller
   */
  static addRoute(controller: Constructor, route: RouteDefinition): void {
    if (!this.routes.has(controller)) {
      this.routes.set(controller, []);
    }
    this.routes.get(controller)!.push(route);
  }

  /**
   * Get controller path
   */
  static getControllerPath(controller: Constructor): string {
    return this.controllers.get(controller) || '';
  }

  /**
   * Check if a class is registered as a controller.
   */
  static hasController(controller: Constructor): boolean {
    return this.controllers.has(controller);
  }

  /**
   * Set controller path
   */
  static setControllerPath(controller: Constructor, path: string): void {
    this.controllers.set(controller, path);
  }

  /**
   * Get controller options
   */
  static getControllerOptions(controller: Constructor): ControllerOptions {
    return this.controllerOptions.get(controller) || {};
  }

  /**
   * Set controller options
   */
  static setControllerOptions(controller: Constructor, options: ControllerOptions): void {
    this.controllerOptions.set(controller, options);
  }

  /**
   * Set controller tag for API documentation
   */
  static setControllerTag(controller: Constructor, tag: ApiTagOptions): void {
    this.controllerTags.set(controller, tag);
  }

  /**
   * Get controller tag for API documentation
   */
  static getControllerTag(controller: Constructor): ApiTagOptions | undefined {
    return this.controllerTags.get(controller);
  }

  /**
   * Set API documentation metadata for a route
   */
  static setRouteApiDoc(
    controller: Constructor,
    handlerName: string | symbol,
    apiDoc: ApiDocOptions,
  ): void {
    if (!this.routeApiDocs.has(controller)) {
      this.routeApiDocs.set(controller, new Map());
    }
    this.routeApiDocs.get(controller)!.set(handlerName, apiDoc);
  }

  /**
   * Get API documentation metadata for a route
   */
  static getRouteApiDoc(
    controller: Constructor,
    handlerName: string | symbol,
  ): ApiDocOptions | undefined {
    const controllerDocs = this.routeApiDocs.get(controller);
    return controllerDocs?.get(handlerName);
  }

  /**
   * Check if class is a service
   */
  static isService(service: Constructor): boolean {
    return this.services.has(service);
  }

  /**
   * Add a service
   */
  static addService(service: Constructor): void {
    this.services.add(service);
  }

  /**
   * Get all services
   */
  static getAllServices(): Set<Constructor> {
    return this.services;
  }

  /**
   * Get module options
   */
  static getModuleOptions(module: Constructor): ModuleOptions | undefined {
    return this.modules.get(module);
  }

  /**
   * Set module options
   */
  static setModuleOptions(module: Constructor, options: ModuleOptions): void {
    this.modules.set(module, options);
  }

  /**
   * Get parameter metadata
   */
  static getParameters(controller: Constructor): Map<string | symbol, ParameterMetadata[]> {
    return this.parameters.get(controller) || new Map();
  }

  /**
   * Set parameter metadata
   */
  static setParameterMap(
    controller: Constructor,
    params: Map<string | symbol, ParameterMetadata[]>,
  ): void {
    this.parameters.set(controller, params);
  }

  /**
   * Get context indices
   */
  static getContextIndices(controller: Constructor): Map<string | symbol, number> {
    return this.contextIndices.get(controller) || new Map();
  }

  /**
   * Set context indices
   */
  static setContextIndices(controller: Constructor, indices: Map<string | symbol, number>): void {
    this.contextIndices.set(controller, indices);
  }

  /**
   * Register a component at the controller level
   */
  static registerController<T extends ComponentType>(
    type: T,
    controller: Constructor,
    component: ComponentTypeMap[T],
  ): void {
    const typeMap = this.controller.get(type)!;
    if (!typeMap.has(controller)) {
      typeMap.set(controller, []);
    }
    typeMap.get(controller)!.push(component as unknown as ComponentInstance);
  }

  /**
   * Get all controller-level components of a specific type for a controller
   */
  static getController<T extends ComponentType>(
    type: T,
    controller: Constructor,
  ): ComponentTypeMap[T][] {
    const typeMap = this.controller.get(type)!;
    return (typeMap.get(controller) || []) as unknown as ComponentTypeMap[T][];
  }

  /**
   * Register a component at the handler level
   */
  static registerHandler<T extends ComponentType>(
    type: T,
    controller: Constructor,
    handlerName: string | symbol,
    component: ComponentTypeMap[T],
  ): void {
    const typeMap = this.handler.get(type)!;
    if (!typeMap.has(controller)) {
      typeMap.set(controller, new Map());
    }
    const controllerMap = typeMap.get(controller)!;
    if (!controllerMap.has(handlerName)) {
      controllerMap.set(handlerName, []);
    }
    controllerMap.get(handlerName)!.push(component as unknown as ComponentInstance);
  }

  /**
   * Get all handler-level components of a specific type for a handler
   */
  static getHandler<T extends ComponentType>(
    type: T,
    controller: Constructor,
    handlerName: string | symbol,
  ): ComponentTypeMap[T][] {
    const typeMap = this.handler.get(type)!;
    const controllerMap = typeMap.get(controller);
    if (!controllerMap) {
      return [] as unknown as ComponentTypeMap[T][];
    }
    return (controllerMap.get(handlerName) || []) as unknown as ComponentTypeMap[T][];
  }

  /**
   * Clears handler-level component registrations created via {@link registerHandler}.
   * Does not remove decorator-defined routes, controllers, or modules.
   */
  static clearHandlerComponents(): void {
    for (const typeMap of this.handler.values()) {
      for (const controllerMap of typeMap.values()) {
        controllerMap.clear();
      }
      typeMap.clear();
    }
  }

  /**
   * Set redirect metadata for a handler
   */
  static setRedirect(
    controller: Constructor,
    handlerName: string | symbol,
    url: string,
    statusCode: number,
  ): void {
    if (!this.redirects.has(controller)) {
      this.redirects.set(controller, new Map());
    }
    this.redirects.get(controller)!.set(handlerName, { url, statusCode });
  }

  /**
   * Get redirect metadata for a handler
   */
  static getRedirect(
    controller: Constructor,
    handlerName: string | symbol,
  ): RedirectOptions | undefined {
    return this.redirects.get(controller)?.get(handlerName);
  }

  /**
   * Clears all registered decorator metadata.
   * Primarily used for testing. Warning: clearing after importing decorated classes
   * (e.g. shared fixtures) removes their metadata until those modules are re-evaluated.
   */
  static clear(): void {
    this.routes.clear();
    this.controllers.clear();
    this.controllerOptions.clear();
    this.services.clear();
    this.modules.clear();
    this.parameters.clear();
    this.contextIndices.clear();
    this.redirects.clear();

    for (const map of this.controller.values()) {
      map.clear();
    }

    for (const typeMap of this.handler.values()) {
      for (const controllerMap of typeMap.values()) {
        controllerMap.clear();
      }
      typeMap.clear();
    }
  }
}
