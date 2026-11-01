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
function methodTarget(target) {
    return typeof target === 'function' ? target : target?.constructor;
}
function getMeta(target, key, propertyKey) {
    const ctor = methodTarget(target);
    return ctor ? Reflect.getMetadata(key, ctor, propertyKey) : undefined;
}
function setMeta(target, key, propertyKey, value) {
    const ctor = methodTarget(target);
    if (ctor)
        Reflect.defineMetadata(key, value, ctor, propertyKey);
}
export function ApiTags(...tags) {
    return (target, propertyKey, descriptor) => {
        if (propertyKey === undefined) {
            Reflect.defineMetadata(API_TAGS_META, tags, target);
        }
        else {
            const current = getMeta(target, API_TAGS_META, propertyKey) ?? [];
            setMeta(target, API_TAGS_META, propertyKey, [...current, ...tags]);
        }
    };
}
export function ApiOperation(options) {
    return (target, propertyKey, descriptor) => {
        const current = getMeta(target, API_OPERATION_META, propertyKey) ?? {};
        setMeta(target, API_OPERATION_META, propertyKey, { ...current, ...options });
    };
}
export function ApiResponse(options) {
    return (target, propertyKey, descriptor) => {
        const current = getMeta(target, API_RESPONSES_META, propertyKey) ?? [];
        setMeta(target, API_RESPONSES_META, propertyKey, [...current, options]);
    };
}
function shortcut(status, description) {
    return (options = {}) => ApiResponse({ status, description, ...options });
}
export const ApiOkResponse = shortcut(200, 'OK');
export const ApiCreatedResponse = shortcut(201, 'Created');
export const ApiBadRequestResponse = shortcut(400, 'Bad Request');
export const ApiUnauthorizedResponse = shortcut(401, 'Unauthorized');
export const ApiForbiddenResponse = shortcut(403, 'Forbidden');
export const ApiNotFoundResponse = shortcut(404, 'Not Found');
export const ApiConflictResponse = shortcut(409, 'Conflict');
export function ApiBody(options) {
    return (target, propertyKey, descriptor) => {
        setMeta(target, API_BODY_META, propertyKey, options);
    };
}
function makeParamDecorator(kind) {
    return (options) => (target, propertyKey) => {
        const current = getMeta(target, API_PARAMETERS_META, propertyKey) ?? [];
        setMeta(target, API_PARAMETERS_META, propertyKey, [
            ...current,
            { ...options, in: kind },
        ]);
    };
}
export const ApiParam = makeParamDecorator('path');
export const ApiQuery = makeParamDecorator('query');
export const ApiHeader = makeParamDecorator('header');
export function ApiBearerAuth(name = 'bearerAuth') {
    return (target, propertyKey, descriptor) => {
        if (propertyKey === undefined) {
            const sec = (Reflect.getMetadata(API_SECURITY_META, target) ?? []);
            Reflect.defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
        }
        else {
            const current = getMeta(target, API_SECURITY_META, propertyKey) ?? [];
            setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
        }
    };
}
export function ApiBasicAuth(name = 'basicAuth') {
    return (target, propertyKey, descriptor) => {
        if (propertyKey === undefined) {
            const sec = (Reflect.getMetadata(API_SECURITY_META, target) ?? []);
            Reflect.defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
        }
        else {
            const current = getMeta(target, API_SECURITY_META, propertyKey) ?? [];
            setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
        }
    };
}
export function ApiCookieAuth(name = 'cookieAuth') {
    return ApiBearerAuth(name);
}
export function ApiSecurity(name) {
    return (target, propertyKey, descriptor) => {
        if (propertyKey === undefined) {
            const sec = (Reflect.getMetadata(API_SECURITY_META, target) ?? []);
            Reflect.defineMetadata(API_SECURITY_META, [...sec, { [name]: [] }], target);
        }
        else {
            const current = getMeta(target, API_SECURITY_META, propertyKey) ?? [];
            setMeta(target, API_SECURITY_META, propertyKey, [...current, { [name]: [] }]);
        }
    };
}
export function ApiExcludeEndpoint() {
    return (target, propertyKey, descriptor) => {
        setMeta(target, API_EXCLUDE_META, propertyKey, true);
    };
}
export function ApiConsumes(...mime) {
    return (target, propertyKey, descriptor) => {
        setMeta(target, API_CONSUMES_META, propertyKey, mime);
    };
}
export function ApiProduces(...mime) {
    return (target, propertyKey, descriptor) => {
        setMeta(target, API_PRODUCES_META, propertyKey, mime);
    };
}
export function ApiProperty(options = {}) {
    return (target, propertyKey) => {
        const ctor = typeof target === 'function' ? target : target.constructor;
        const current = (Reflect.getMetadata(API_PROPERTIES_META, ctor) ?? []);
        Reflect.defineMetadata(API_PROPERTIES_META, [...current, { name: propertyKey, ...options }], ctor);
    };
}
// Fixed parameter decorators expected by users
export function BodyParam(property) {
    return (target, propertyKey, parameterIndex) => {
        // metadata not bound to index in this minimal implementation;
    };
}
