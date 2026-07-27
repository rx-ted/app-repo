export type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

export type ApiResponse<T> = {
  status: number;
  code: string;
  data: T;
  message: string;
  error: unknown;
};

export type QueryParamValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>;

export type QueryParams = Record<string, QueryParamValue>;

export type HttpRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  query?: QueryParams;
  body?: unknown;
  responseType?: HttpResponseType;
  timeoutMs?: number;
  withCredentials?: boolean;
  authToken?: string;
  signal?: AbortSignal;
  cache?: boolean;
};

export type DownloadOptions = HttpRequestOptions & {
  filename?: string;
  autoSave?: boolean;
};

export type DownloadResult = {
  blob: Blob;
  filename: string;
  response: Response;
};
