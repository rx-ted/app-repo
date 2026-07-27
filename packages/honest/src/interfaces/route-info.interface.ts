import type { ParameterMetadata } from './parameter-metadata.interface';
import type { Constructor } from '../types';

/**
 * Route information for registered routes
 */
export interface RouteInfo {
  /**
   * Controller name
   */
  controller: string | symbol;
  /**
   * Controller class (for accessing metadata)
   */
  controllerClass?: Constructor;
  /**
   * Handler method name
   */
  handler: string | symbol;
  /**
   * HTTP method
   */
  method: string;
  /**
   * Effective prefix
   */
  prefix: string;
  /**
   * Effective version
   */
  version?: string;
  /**
   * Controller route path
   */
  route: string;
  /**
   * Method path
   */
  path: string;
  /**
   * Complete path (prefix + version + route + path)
   */
  fullPath: string;
  /**
   * Parameter metadata for the handler
   */
  parameters: ParameterMetadata[];
}
