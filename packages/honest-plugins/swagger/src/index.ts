import 'reflect-metadata';

export const API_OPERATION_META = 'api:operation';
export const API_RESPONSES_META = 'api:responses';
export const API_PARAMETERS_META = 'api:parameters';
export const API_BODY_META = 'api:body';
export const API_SECURITY_META = 'api:security';
export const API_EXCLUDE_META = 'api:exclude';
export const API_CONSUMES_META = 'api:consumes';
export const API_PRODUCES_META = 'api:produces';
export const API_PROPERTIES_META = 'api:properties';
export const API_TAGS_META = 'api:tags';

function methodTarget(target: any): any {
  return typeof target === 'function' ? target : target?.constructor;
}

function getMeta<T>(target: any, key: string, propertyKey: string | symbol): T | undefined {
  const ctor = methodTarget(target);
  return ctor ? (Reflect as any).getMetadata(key, ctor, propertyKey) : undefined;
}

function setMeta(target: any, key: string, propertyKey: string | symbol, value: any): void {
  const ctor = methodTarget(target);
  if (ctor) (Reflect as any).defineMetadata(key, value, ctor, propertyKey);
}

export function ApiTags(...tags: string[]) {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey === undefined) {
      (Reflect as any).defineMetadata(API_TAGS_META, tags, target);
    } else {
      const current = getMeta<any[]>(target, API_TAGS_META, propertyKey) ?? [];
      setMeta(target, API_TAGS_META, propertyKey, [...current, ...tags]);
    }
  };
}

export interface ApiOperationOptions {
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
}

export function ApiOperation(options: ApiOperationOptions) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    const current = getMeta<ApiOperationOptions>(target, API_OPERATION_META, propertyKey) ?? {};
    setMeta(target, API_OPERATION_META, propertyKey, { ...current, ...options });
  };
}

export interface ApiResponseOptions {
  status?: number;
  description?: string;
  type?: any;
  schema?: any;
  isArray?: boolean;
}

export function ApiResponse(options: ApiResponseOptions) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    const current = getMeta<ApiResponseOptions[]>(target, API_RESPONSES_META, propertyKey) ?? [];
    setMeta(target, API_RESPONSES_META, propertyKey, [...current, options]);
  };
}

function shortcut(status: number, description?: string) {
  return (options: Omit<ApiResponseOptions, 'status'> = {}) =>
    ApiResponse({ status, description, ...options });
}

export const ApiOkResponse = shortcut(200, 'OK');
export const ApiCreatedResponse = shortcut(201, 'Created');
export const ApiBadRequestResponse = shortcut(400, 'Bad Request');
export const ApiUnauthorizedResponse = shortcut(401, 'Unauthorized');
export const ApiForbiddenResponse = shortcut(403, 'Forbidden');
export const ApiNotFoundResponse = shortcut(404, 'Not Found');
export const ApiConflictResponse = shortcut(409, 'Conflict');

export function ApiBody(options: any) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    setMeta(target, API_BODY_META, propertyKey, options);
  };
}

export interface ApiParamOptions {
  name: string;
  required?: boolean;
  description?: string;
  type?: any;
  schema?: any;
  example?: any;
  enum?: any[];
}

function makeParamDecorator(kind: 'path' | 'query' | 'header') {
  return (options: ApiParamOptions) => (target: any, propertyKey: string | symbol) => {
    const current = getMeta<any[]>(target, API_PARAMETERS_META, propertyKey) ?? [];
    setMeta(target, API_PARAMETERS_META, propertyKey, [...current, { ...options, in: kind }]);
  };
}

export const ApiParam = makeParamDecorator('path');
export const ApiQuery = makeParamDecorator('query');
export const ApiHeader = makeParamDecorator('header');

export function ApiBearerAuth(name: string = 'bearerAuth') {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey === undefined) {
      const sec = ((Reflect as any).getMetadata(API_SECURITY_META, target) ?? []) as any[];
      (Reflect as any).defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
    } else {
      const current = getMeta<any[]>(target, API_SECURITY_META, propertyKey) ?? [];
      setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
    }
  };
}

export function ApiBasicAuth(name: string = 'basicAuth') {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey === undefined) {
      const sec = ((Reflect as any).getMetadata(API_SECURITY_META, target) ?? []) as any[];
      (Reflect as any).defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
    } else {
      const current = getMeta<any[]>(target, API_SECURITY_META, propertyKey) ?? [];
      setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
    }
  };
}

export function ApiCookieAuth(name: string = 'cookieAuth') {
  return ApiBearerAuth(name);
}

export function ApiSecurity(name: string) {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey === undefined) {
      const sec = ((Reflect as any).getMetadata(API_SECURITY_META, target) ?? []) as any[];
      (Reflect as any).defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
    } else {
      const current = getMeta<any[]>(target, API_SECURITY_META, propertyKey) ?? [];
      setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
    }
  };
}

export function ApiExcludeEndpoint() {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    setMeta(target, API_EXCLUDE_META, propertyKey, true);
  };
}

export function ApiConsumes(...mime: string[]) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    setMeta(target, API_CONSUMES_META, propertyKey, mime);
  };
}

export function ApiProduces(...mime: string[]) {
  return (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => {
    setMeta(target, API_PRODUCES_META, propertyKey, mime);
  };
}

export interface ApiPropertyOptions {
  type?: any;
  description?: string;
  required?: boolean;
  example?: any;
  enum?: any[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  isArray?: boolean;
  name?: string;
}

export function ApiProperty(options: ApiPropertyOptions = {}) {
  return (target: any, propertyKey: string | symbol) => {
    const ctor = typeof target === 'function' ? target : target.constructor;
    const current = ((Reflect as any).getMetadata(API_PROPERTIES_META, ctor) ?? []) as any[];
    (Reflect as any).defineMetadata(
      API_PROPERTIES_META,
      [...current, { name: propertyKey, ...options }],
      ctor,
    );
  };
}

// Fixed parameter decorators expected by users
export function BodyParam(property?: string) {
  return (target: any, propertyKey: string | symbol, parameterIndex: number) => {
    // metadata not bound to index in this minimal implementation;
  };
}
