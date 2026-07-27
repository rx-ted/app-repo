import type { VERSION_NEUTRAL } from '../constants';

/**
 * Security scheme definition for OpenAPI
 */
export interface ApiDocSecurityScheme {
  /**
   * Type of security scheme (e.g., 'http', 'apiKey', 'oauth2')
   */
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  /**
   * Name of the header/query/ cookie parameter (for apiKey)
   */
  name?: string;
  /**
   * Location of the API key (for apiKey)
   */
  in?: 'header' | 'query' | 'cookie';
  /**
   * HTTP authentication scheme (for http)
   */
  scheme?: string;
  /**
   * Bearer format (for http with scheme 'bearer')
   */
  bearerFormat?: string;
  /**
   * Description of the security scheme
   */
  description?: string;
}

/**
 * Security requirement for an operation (OpenAPI Security Requirement Object).
 *
 * Each key is a security scheme name defined in {@link ApiDocSecurityScheme}.
 * Each value is an array of scope names required (empty array for non-OAuth2 schemes).
 *
 * @example
 * { bearerAuth: [] }
 * { oauth2: ['read:write', 'admin'] }
 * { bearerAuth: [], apiKey: [] }
 */
export interface ApiDocSecurityRequirement {
  /** HTTP Bearer token (JWT) */
  bearerAuth?: string[];
  /** HTTP Basic auth */
  basicAuth?: string[];
  /** API key (header/query/cookie) */
  apiKey?: string[];
  /** Cookie-based auth */
  cookieAuth?: string[];
  /** OAuth2 with optional scopes */
  oauth2?: string[];
  /** OpenID Connect */
  openId?: string[];
  /** HTTP Digest auth */
  digestAuth?: string[];

  [name: string]: string[] | undefined;
}

/**
 * API documentation options for route or controller
 */
export interface ApiDocOptions {
  /**
   * Short summary of what the route/controller does
   */
  summary?: string;
  /**
   * Detailed description
   */
  description?: string;
  /**
   * Tags for grouping in API docs
   */
  tags?: string[];
  /**
   * Request documentation (for routes)
   */
  request?: {
    body?: any;
    query?: any;
    params?: any;
  };
  /**
   * Response documentation (for routes)
   */
  responses?: Record<number, { description?: string; schema?: any }>;
  /**
   * Security requirements for this operation
   */
  security?: ApiDocSecurityRequirement[];
}

/**
 * Tag options for controller grouping
 */
export interface ApiTagOptions {
  name: string;
  description?: string;
}

/**
 * Interface for controller configuration options
 */
export interface ControllerOptions {
  /**
   * API prefix for this controller's routes, overrides global prefix
   */
  prefix?: string | null;

  /**
   * API version for this controller's routes (e.g. 1 becomes /v1), overrides global version
   * Set to null to explicitly opt out of versioning even when global version is set
   * Set to VERSION_NEUTRAL to make routes accessible both with and without version prefix
   * Set to an array of numbers to make routes available at multiple versions
   */
  version?: number | null | typeof VERSION_NEUTRAL | number[];

  /**
   * API documentation tag for this controller
   * Groups all routes under this tag in API docs
   * @example
   * @Controller('user', { tag: { name: 'User Manager', description: 'User CURD Interface' } })
   */
  tag?: ApiTagOptions;
}
