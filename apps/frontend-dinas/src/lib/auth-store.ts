import { useSyncExternalStore } from 'react';
import type { LoginResponse } from './api.js';

const STORAGE_KEY = 'sipera_user';

function read(): LoginResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function saveUser(u: LoginResponse): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
}

export function loadUser(): LoginResponse | null {
  return read();
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Single shared store so EVERY useUser() consumer re-renders on login/logout.
// The previous per-component useState meant the App shell never saw the
// AdminLoginPage's setUser → stayed on the login screen until reload.
let current: LoginResponse | null = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  function onStorage(): void {
    current = read();
    cb();
  }
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function setUser(u: LoginResponse | null): void {
  if (u) saveUser(u);
  else clearUser();
  current = u;
  emit();
}

export function useUser(): {
  user: LoginResponse | null;
  setUser: (u: LoginResponse | null) => void;
} {
  const user = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
  return { user, setUser };
}
