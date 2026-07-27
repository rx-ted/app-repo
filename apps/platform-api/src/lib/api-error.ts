export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function badRequest(code: string, message: string, details?: unknown) {
  return new ApiError(message, 400, code, details);
}

export function notFound(code: string, message: string, details?: unknown) {
  return new ApiError(message, 404, code, details);
}

export function conflict(code: string, message: string, details?: unknown) {
  return new ApiError(message, 409, code, details);
}

export function forbidden(code: string, message: string, details?: unknown) {
  return new ApiError(message, 403, code, details);
}

export function internal(code: string, message: string, details?: unknown) {
  return new ApiError(message, 500, code, details);
}

export function toApiError(err: unknown, fallback = 'INTERNAL_SERVER_ERROR'): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return internal(fallback, err.message, { cause: err });
  return internal(fallback, String(err));
}
