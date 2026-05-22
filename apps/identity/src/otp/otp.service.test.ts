import { describe, expect, it, vi } from 'vitest';
import { InMemoryOtpStore, OtpService } from './otp.service.js';
import type { OtpDeliveryProvider } from './providers.js';

function mockProvider(): OtpDeliveryProvider {
  return { name: 'mock', send: vi.fn().mockResolvedValue(undefined) };
}

describe('InMemoryOtpStore', () => {
  it('set + get round-trip', async () => {
    const s = new InMemoryOtpStore();
    await s.set('k', '123', 60);
    expect(await s.get('k')).toBe('123');
  });

  it('expires after ttl', async () => {
    const s = new InMemoryOtpStore();
    await s.set('k', '123', -1);
    expect(await s.get('k')).toBeNull();
  });

  it('increments counter', async () => {
    const s = new InMemoryOtpStore();
    expect(await s.incrementCounter('c', 60)).toBe(1);
    expect(await s.incrementCounter('c', 60)).toBe(2);
    expect(await s.incrementCounter('c', 60)).toBe(3);
  });
});

describe('OtpService.generate', () => {
  it('returns ok and calls provider', async () => {
    const provider = mockProvider();
    const svc = new OtpService({ store: new InMemoryOtpStore(), provider });
    const r = await svc.generate({ noTelp: '081', purpose: 'Login' });
    expect(r.ok).toBe(true);
    expect(provider.send).toHaveBeenCalledOnce();
  });

  it('rate-limits after maxRequestsPerHour', async () => {
    const provider = mockProvider();
    const svc = new OtpService({
      store: new InMemoryOtpStore(),
      provider,
      maxRequestsPerHour: 2,
    });
    expect((await svc.generate({ noTelp: '081', purpose: 'Login' })).ok).toBe(true);
    expect((await svc.generate({ noTelp: '081', purpose: 'Login' })).ok).toBe(true);
    const third = await svc.generate({ noTelp: '081', purpose: 'Login' });
    expect(third.ok).toBe(false);
    if (!third.ok) expect(third.code).toBe('rate_limit_exceeded');
  });
});

describe('OtpService.validate', () => {
  it('returns ok when code matches and consumes the OTP', async () => {
    const store = new InMemoryOtpStore();
    const svc = new OtpService({ store, provider: mockProvider() });
    await svc.generate({ noTelp: '081', purpose: 'Login' });
    const code = await store.get('otp:081:Login');
    expect(code).not.toBeNull();
    const r = await svc.validate('081', 'Login', code as string);
    expect(r.ok).toBe(true);
    // OTP one-time use
    const again = await svc.validate('081', 'Login', code as string);
    expect(again.ok).toBe(false);
  });

  it('rejects wrong code', async () => {
    const svc = new OtpService({ store: new InMemoryOtpStore(), provider: mockProvider() });
    await svc.generate({ noTelp: '081', purpose: 'Login' });
    const r = await svc.validate('081', 'Login', '000000');
    expect(r.ok).toBe(false);
  });
});
