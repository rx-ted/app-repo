export function ok<T>(data: T) {
  return { status: 200, code: 'OK', data } as const;
}

export function created<T>(data: T) {
  return { status: 201, code: 'CREATED', data } as const;
}

export function noContent() {
  return { status: 204, code: 'NO_CONTENT', data: null } as const;
}

export function paginated<T>(list: T[], total: number) {
  return { status: 200, code: 'OK', data: { list, total } } as const;
}
