/** Thin API client untuk backend gateway. */
/// <reference types="vite/client" />
import { setUser } from './auth-store.js';
const BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://localhost:5200';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
  ) {
    super(`API ${status}`);
  }
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  const init: RequestInit = { method: opts.method ?? 'GET', headers };
  if (opts.body) init.body = JSON.stringify(opts.body);
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  const json: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // A 401 on an authenticated request means the session token expired or is
    // invalid. Drop the session so the app falls back to the login screen
    // instead of showing the user a raw "API 401" banner on the dashboard.
    // The login call itself (/auth/*) is exempt — its 401 is wrong-credentials.
    if (res.status === 401 && opts.token && !path.startsWith('/auth/')) {
      setUser(null);
    }
    throw new ApiError(res.status, json);
  }
  return json as T;
}

export interface LoginResponse {
  id: number;
  nama: string;
  no_telp: string;
  role: string;
  instansi: string | null;
  foto: string | null;
  api_token: string;
}

export const auth = {
  login: (noTelp: string, password: string) =>
    api<LoginResponse>('/auth/login', { method: 'POST', body: { no_telp: noTelp, password } }),
  generateOtp: (noTelp: string, purpose: 'Login' | 'Register' = 'Login') =>
    api<{ sent: boolean; ttlSeconds: number }>('/auth/otp/generate', {
      method: 'POST',
      body: { no_telp: noTelp, purpose },
    }),
  validateOtp: (noTelp: string, code: string, purpose: 'Login' | 'Register' = 'Login') =>
    api<{ valid: boolean }>('/auth/otp/validate', {
      method: 'POST',
      body: { no_telp: noTelp, code, purpose },
    }),
};

export interface Permohonan {
  id: string;
  nomor: string;
  namaPemohon: string;
  status: string;
  jenisIzin: string;
  catatanRevisi: string[];
  createdAt: string;
  updatedAt: string;
  availableActions?: string[];
}

export const permohonan = {
  list: (token: string) => api<{ data: Permohonan[] }>('/permohonan', { token }),
  byId: (id: string, token: string) => api<Permohonan>(`/permohonan/${id}`, { token }),
  create: (
    input: { pemohonId: number; namaPemohon: string; jenisIzin: 'KKPR' | 'PMP-UMKM' },
    token: string,
  ) => api<Permohonan>('/permohonan', { method: 'POST', body: input, token }),
};
