import 'reflect-metadata';
export declare const API_OPERATION_META = "api:operation";
export declare const API_RESPONSES_META = "api:responses";
export declare const API_PARAMETERS_META = "api:parameters";
export declare const API_BODY_META = "api:body";
export declare const API_SECURITY_META = "api:security";
export declare const API_EXCLUDE_META = "api:exclude";
export declare const API_CONSUMES_META = "api:consumes";
export declare const API_PRODUCES_META = "api:produces";
export declare const API_PROPERTIES_META = "api:properties";
export declare const API_TAGS_META = "api:tags";
export declare function ApiTags(...tags: string[]): (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export interface ApiOperationOptions {
    summary?: string;
    description?: string;
    operationId?: string;
    deprecated?: boolean;
}
export declare function ApiOperation(options: ApiOperationOptions): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export interface ApiResponseOptions {
    status?: number;
    description?: string;
    type?: any;
    schema?: any;
    isArray?: boolean;
}
export declare function ApiResponse(options: ApiResponseOptions): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiOkResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiCreatedResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiBadRequestResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiUnauthorizedResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiForbiddenResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiNotFoundResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare const ApiConflictResponse: (options?: Omit<ApiResponseOptions, "status">) => (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiBody(options: any): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export interface ApiParamOptions {
    name: string;
    required?: boolean;
    description?: string;
    type?: any;
    schema?: any;
    example?: any;
    enum?: any[];
}
export declare const ApiParam: (options: ApiParamOptions) => (target: any, propertyKey: string | symbol) => void;
export declare const ApiQuery: (options: ApiParamOptions) => (target: any, propertyKey: string | symbol) => void;
export declare const ApiHeader: (options: ApiParamOptions) => (target: any, propertyKey: string | symbol) => void;
export declare function ApiBearerAuth(name?: string): (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiBasicAuth(name?: string): (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiCookieAuth(name?: string): (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiSecurity(name: string): (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiExcludeEndpoint(): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiConsumes(...mime: string[]): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
export declare function ApiProduces(...mime: string[]): (target: any, propertyKey: string | symbol, descriptor?: PropertyDescriptor) => void;
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
export declare function ApiProperty(options?: ApiPropertyOptions): (target: any, propertyKey: string | symbol) => void;
export declare function BodyParam(property?: string): (target: any, propertyKey: string | symbol, parameterIndex: number) => void;
