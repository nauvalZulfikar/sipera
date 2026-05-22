import { useEffect, useState } from 'react';
import type { LoginResponse } from './api.js';

const STORAGE_KEY = 'sipera_user';

export function saveUser(u: LoginResponse): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
}

export function loadUser(): LoginResponse | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LoginResponse;
  } catch {
    return null;
  }
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useUser(): {
  user: LoginResponse | null;
  setUser: (u: LoginResponse | null) => void;
} {
  const [user, setUserState] = useState<LoginResponse | null>(() => loadUser());

  useEffect(() => {
    function onStorage() {
      setUserState(loadUser());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function setUser(u: LoginResponse | null): void {
    if (u) saveUser(u);
    else clearUser();
    setUserState(u);
  }

  return { user, setUser };
}
