const LOCAL_BLOB = 'app:storage';
const SESSION_BLOB = 'app:session';

type StoreType = typeof localStorage | typeof sessionStorage;

function getStore(scope: 'local' | 'session'): StoreType {
  return scope === 'local' ? localStorage : sessionStorage;
}

function readBlob(scope: 'local' | 'session'): Record<string, unknown> {
  const store = getStore(scope);
  const key = scope === 'local' ? LOCAL_BLOB : SESSION_BLOB;
  try {
    const raw = store.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeBlob(scope: 'local' | 'session', data: Record<string, unknown>) {
  const store = getStore(scope);
  const key = scope === 'local' ? LOCAL_BLOB : SESSION_BLOB;
  try {
    store.setItem(key, JSON.stringify(data));
  } catch {
    /* quota exceeded or private mode — silently fail */
  }
}

export function getLocal<T>(key: string, fallback: T): T {
  const data = readBlob('local');
  return (data[key] as T) ?? fallback;
}

export function setLocal(key: string, value: unknown) {
  const data = readBlob('local');
  data[key] = value;
  writeBlob('local', data);
}

export function removeLocal(key: string) {
  const data = readBlob('local');
  delete data[key];
  writeBlob('local', data);
}

export function getSession<T>(key: string, fallback: T): T {
  const data = readBlob('session');
  return (data[key] as T) ?? fallback;
}

export function setSession(key: string, value: unknown) {
  const data = readBlob('session');
  data[key] = value;
  writeBlob('session', data);
}

export function removeSession(key: string) {
  const data = readBlob('session');
  delete data[key];
  writeBlob('session', data);
}

export function clearLocal() {
  try {
    localStorage.removeItem(LOCAL_BLOB);
  } catch {
    /* noop */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_BLOB);
  } catch {
    /* noop */
  }
}

export function clearAll() {
  clearLocal();
  clearSession();
}
