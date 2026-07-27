import type { Middleware } from 'openapi-fetch';

export class HttpError extends Error {
  status: number;
  statusText: string;
  body?: unknown;

  constructor(message: string, status: number, statusText: string, body?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

export function createErrorMapper(): Middleware {
  return {
    onResponse: ({ response }) => {
      if (!response.ok) {
        const cloned = response.clone();
        return cloned.json().then(
          (body) => {
            throw new HttpError(
              ((body as Record<string, unknown>)?.message as string) || response.statusText,
              response.status,
              response.statusText,
              body,
            );
          },
          () => {
            throw new HttpError(response.statusText, response.status, response.statusText);
          },
        );
      }
      return response;
    },
  };
}
