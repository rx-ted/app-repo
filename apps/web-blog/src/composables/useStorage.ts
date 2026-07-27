import {
  getLocal,
  setLocal,
  removeLocal,
  getSession as rawGetSession,
  setSession as rawSetSession,
  removeSession as rawRemoveSession,
} from '@/utils/storage';

export function useStorage() {
  function get<T = string>(key: string, fallback: T): T {
    return getLocal(key, fallback);
  }

  function set<T>(key: string, value: T) {
    setLocal(key, value);
  }

  function remove(key: string) {
    removeLocal(key);
  }

  function getSession<T = string>(key: string, fallback: T): T {
    return rawGetSession(key, fallback);
  }

  function setSession(key: string, value: unknown) {
    rawSetSession(key, value);
  }

  function removeSession(key: string) {
    rawRemoveSession(key);
  }

  return { get, set, remove, getSession, setSession, removeSession };
}
