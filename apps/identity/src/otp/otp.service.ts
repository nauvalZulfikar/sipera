import { randomInt } from 'node:crypto';
import type { OtpDeliveryProvider } from './providers.js';

export interface OtpStore {
  /** Simpan OTP dengan TTL detik. */
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  /** Hitung jumlah generate dalam window detik (untuk rate-limit). */
  incrementCounter(key: string, ttlSeconds: number): Promise<number>;
}

/** In-memory implementation untuk dev/test. Production pakai RedisOtpStore. */
export class InMemoryOtpStore implements OtpStore {
  private data = new Map<string, { value: string; expiresAt: number }>();

  set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.data.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    const entry = this.data.get(key);
    if (!entry) return Promise.resolve(null);
    if (entry.expiresAt < Date.now()) {
      this.data.delete(key);
      return Promise.resolve(null);
    }
    return Promise.resolve(entry.value);
  }

  delete(key: string): Promise<void> {
    this.data.delete(key);
    return Promise.resolve();
  }

  incrementCounter(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.data.get(key);
    const current = entry && entry.expiresAt > Date.now() ? Number(entry.value) : 0;
    const next = current + 1;
    this.data.set(key, { value: String(next), expiresAt: Date.now() + ttlSeconds * 1000 });
    return Promise.resolve(next);
  }
}

export interface OtpServiceDeps {
  store: OtpStore;
  provider: OtpDeliveryProvider;
  /** Length OTP digit, default 6. */
  digits?: number;
  /** TTL OTP detik, default 300 (5 menit). */
  ttlSeconds?: number;
  /** Max request per nomor per window (window default 1 jam). */
  maxRequestsPerHour?: number;
}

export interface GenerateInput {
  noTelp: string;
  /** Login | Register | ResetPassword */
  purpose: string;
}

export type GenerateResult =
  | { ok: true; ttlSeconds: number }
  | { ok: false; code: 'rate_limit_exceeded'; retryAfterSeconds: number };

export type ValidateResult = { ok: true } | { ok: false; code: 'expired_or_invalid' };

export class OtpService {
  private digits: number;
  private ttlSeconds: number;
  private maxRequestsPerHour: number;

  constructor(private readonly deps: OtpServiceDeps) {
    this.digits = deps.digits ?? 6;
    this.ttlSeconds = deps.ttlSeconds ?? 300;
    this.maxRequestsPerHour = deps.maxRequestsPerHour ?? 5;
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const counterKey = `otp:counter:${input.noTelp}:${input.purpose}`;
    const count = await this.deps.store.incrementCounter(counterKey, 3600);
    if (count > this.maxRequestsPerHour) {
      return { ok: false, code: 'rate_limit_exceeded', retryAfterSeconds: 3600 };
    }

    const code = randomDigits(this.digits);
    const key = otpKey(input.noTelp, input.purpose);
    await this.deps.store.set(key, code, this.ttlSeconds);
    await this.deps.provider.send(input.noTelp, code, input.purpose);
    return { ok: true, ttlSeconds: this.ttlSeconds };
  }

  async validate(noTelp: string, purpose: string, code: string): Promise<ValidateResult> {
    const key = otpKey(noTelp, purpose);
    const stored = await this.deps.store.get(key);
    if (!stored || stored !== code) {
      return { ok: false, code: 'expired_or_invalid' };
    }
    await this.deps.store.delete(key);
    return { ok: true };
  }
}

function otpKey(noTelp: string, purpose: string): string {
  return `otp:${noTelp}:${purpose}`;
}

function randomDigits(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += String(randomInt(0, 10));
  }
  return out;
}
