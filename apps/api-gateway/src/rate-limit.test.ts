import { describe, expect, it } from 'vitest';
import { createRateLimiter, parseWindowMs } from './rate-limit.js';

describe('parseWindowMs', () => {
  it('parses common units', () => {
    expect(parseWindowMs('1 minute')).toBe(60_000);
    expect(parseWindowMs('30 seconds')).toBe(30_000);
    expect(parseWindowMs('2 hours')).toBe(7_200_000);
    expect(parseWindowMs('500 ms')).toBe(500);
  });

  it('falls back to 60s on garbage input', () => {
    expect(parseWindowMs('banana')).toBe(60_000);
  });
});

describe('createRateLimiter', () => {
  it('allows up to max then blocks within the window', () => {
    const t = 1_000;
    const rl = createRateLimiter({ max: 3, windowMs: 60_000, now: () => t });

    expect(rl.check('ip-a').allowed).toBe(true);
    expect(rl.check('ip-a').allowed).toBe(true);
    expect(rl.check('ip-a').allowed).toBe(true);
    const blocked = rl.check('ip-a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('isolates counts per key', () => {
    const t = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1_000, now: () => t });
    expect(rl.check('ip-a').allowed).toBe(true);
    expect(rl.check('ip-a').allowed).toBe(false);
    expect(rl.check('ip-b').allowed).toBe(true);
  });

  it('resets after the window elapses', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 1, windowMs: 1_000, now: () => t });
    expect(rl.check('ip-a').allowed).toBe(true);
    expect(rl.check('ip-a').allowed).toBe(false);
    t = 1_001;
    expect(rl.check('ip-a').allowed).toBe(true);
  });
});
