import type { IncomingMessage } from 'node:http';

/**
 * Fixed-window in-memory rate limiter untuk gateway.
 *
 * Sengaja in-memory (cukup utk satu instance gateway). Kalau nanti gateway
 * di-scale horizontal, pindahkan state-nya ke Redis dengan antarmuka yang sama.
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Detik sampai window reset (hanya relevan saat allowed=false). */
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** Ubah string seperti "1 minute" / "30 seconds" jadi milidetik. Default 60_000. */
export function parseWindowMs(window: string): number {
  const match = /^(\d+)\s*(ms|millisecond|second|minute|hour)s?$/.exec(window.trim());
  if (!match) return 60_000;
  const n = Number(match[1]);
  switch (match[2]) {
    case 'ms':
    case 'millisecond':
      return n;
    case 'second':
      return n * 1_000;
    case 'minute':
      return n * 60_000;
    case 'hour':
      return n * 3_600_000;
    default:
      return 60_000;
  }
}

export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  /** Disuntik saat test; default Date.now. */
  now?: () => number;
}): RateLimiter {
  const now = opts.now ?? ((): number => Date.now());
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string): RateLimitResult {
      const t = now();

      // Sapu entri kedaluwarsa sesekali biar Map gak tumbuh tanpa batas.
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) {
          if (b.resetAt <= t) buckets.delete(k);
        }
      }

      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        buckets.set(key, { count: 1, resetAt: t + opts.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (bucket.count >= opts.max) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - t) / 1_000) };
      }
      bucket.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}

/**
 * Ambil IP klien. Di belakang nginx, `x-forwarded-for` berisi IP asli di hop
 * pertama. Fallback ke socket address.
 */
export function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  if (raw) {
    const first = raw.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}
