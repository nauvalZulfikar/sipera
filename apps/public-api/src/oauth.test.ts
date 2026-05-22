import { describe, expect, it, vi } from 'vitest';
import { OAuthStore, WebhookStore } from './oauth.js';

describe('OAuthStore', () => {
  it('registers client + issues token', () => {
    const o = new OAuthStore();
    const c = o.registerClient('test-app', ['permohonan:read']);
    expect(c.clientId).toMatch(/^cli_/);
    expect(c.clientSecret).toMatch(/^sec_/);
    const t = o.issueToken(c.clientId, c.clientSecret);
    expect(t).not.toBeNull();
    expect(t?.token).toMatch(/^tok_/);
  });

  it('rejects wrong secret', () => {
    const o = new OAuthStore();
    const c = o.registerClient('x', ['s']);
    expect(o.issueToken(c.clientId, 'wrong')).toBeNull();
  });

  it('verifyToken with required scope', () => {
    const o = new OAuthStore();
    const c = o.registerClient('x', ['permohonan:read']);
    const t = o.issueToken(c.clientId, c.clientSecret)!;
    expect(o.verifyToken(t.token, 'permohonan:read')).not.toBeNull();
    expect(o.verifyToken(t.token, 'permohonan:write')).toBeNull();
  });

  it('expired token rejected', () => {
    vi.useFakeTimers();
    const o = new OAuthStore();
    const c = o.registerClient('x', ['s']);
    const t = o.issueToken(c.clientId, c.clientSecret)!;
    expect(o.verifyToken(t.token)).not.toBeNull();
    vi.setSystemTime(Date.now() + 3700 * 1000);
    expect(o.verifyToken(t.token)).toBeNull();
    vi.useRealTimers();
  });
});

describe('WebhookStore', () => {
  it('subscribe + list', () => {
    const w = new WebhookStore();
    const s = w.subscribe('cli_1', 'https://example.com/hook', ['permohonan.approved']);
    expect(s.secret).toMatch(/^whs_/);
    expect(w.list('cli_1')).toHaveLength(1);
    expect(w.list('cli_2')).toHaveLength(0);
  });

  it('unsubscribe', () => {
    const w = new WebhookStore();
    const s = w.subscribe('cli_1', 'https://example.com', ['*']);
    expect(w.unsubscribe(s.id)).toBe(true);
    expect(w.list('cli_1')).toHaveLength(0);
  });
});
