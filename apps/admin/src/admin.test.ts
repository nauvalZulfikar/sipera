import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SettingsStore } from './settings.js';
import { AuditStore } from './audit.js';

describe('SettingsStore', () => {
  let dir: string;
  let store: SettingsStore;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'sipera-admin-'));
    store = new SettingsStore(join(dir, 'settings.json'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('seeds defaults on first read', async () => {
    const list = await store.list();
    expect(list.length).toBeGreaterThan(0);
    expect(list.find((s) => s.key === 'otp.ttl_seconds')?.value).toBe('300');
  });

  it('set persists and round-trips through file', async () => {
    await store.set('test.flag', 'on', 'admin');
    const fresh = new SettingsStore(join(dir, 'settings.json'));
    expect((await fresh.get('test.flag'))?.value).toBe('on');
  });
});

describe('AuditStore', () => {
  it('logs and queries by actor', () => {
    const a = new AuditStore();
    a.log({ actor: 'admin', action: 'permohonan.approve', resource: 'permohonan/1' });
    a.log({ actor: 'admin', action: 'setting.update', resource: 'setting/x' });
    a.log({ actor: 'warga', action: 'permohonan.create', resource: 'permohonan/2' });
    expect(a.query({ actor: 'admin' })).toHaveLength(2);
    expect(a.query({ actor: 'warga' })).toHaveLength(1);
  });

  it('filters by action prefix', () => {
    const a = new AuditStore();
    a.log({ actor: 'x', action: 'permohonan.approve', resource: 'p/1' });
    a.log({ actor: 'x', action: 'permohonan.reject', resource: 'p/2' });
    a.log({ actor: 'x', action: 'setting.update', resource: 's/1' });
    expect(a.query({ action: 'permohonan' })).toHaveLength(2);
  });

  it('caps at maxEntries (ring buffer)', () => {
    const a = new AuditStore(3);
    for (let i = 0; i < 10; i++) a.log({ actor: 'x', action: 'a', resource: 'r' });
    expect(a.count()).toBe(3);
  });

  it('returns most recent first', () => {
    const a = new AuditStore();
    a.log({ actor: 'first', action: 'a', resource: 'r' });
    a.log({ actor: 'second', action: 'a', resource: 'r' });
    const r = a.query({ limit: 10 });
    expect(r[0]?.actor).toBe('second');
  });
});
