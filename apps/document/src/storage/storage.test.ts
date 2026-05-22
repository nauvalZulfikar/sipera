import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalFileStorage } from './storage.js';

describe('LocalFileStorage', () => {
  let tmp: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'sipera-doc-'));
    storage = new LocalFileStorage(tmp);
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('put + get round-trip preserves bytes', async () => {
    const data = Buffer.from('hello world');
    const meta = await storage.put('test/file.txt', data, 'text/plain');
    expect(meta.size).toBe(11);
    expect(meta.sha256).toMatch(/^[a-f0-9]{64}$/);
    const got = await storage.get('test/file.txt');
    expect(got?.toString()).toBe('hello world');
  });

  it('returns null for missing file', async () => {
    expect(await storage.get('missing.txt')).toBeNull();
    expect(await storage.stat('missing.txt')).toBeNull();
  });

  it('delete removes file', async () => {
    await storage.put('a.txt', Buffer.from('a'), 'text/plain');
    await storage.delete('a.txt');
    expect(await storage.get('a.txt')).toBeNull();
  });

  it('large file (1MB) round-trip preserves SHA256', async () => {
    const data = Buffer.alloc(1024 * 1024);
    for (let i = 0; i < data.length; i++) data[i] = i % 256;
    const meta = await storage.put('big.bin', data, 'application/octet-stream');
    const back = await storage.get('big.bin');
    expect(back?.length).toBe(data.length);
    expect(back?.equals(data)).toBe(true);
    // Recompute sha to confirm
    const { createHash } = await import('node:crypto');
    const actualSha = createHash('sha256')
      .update(back as Buffer)
      .digest('hex');
    expect(actualSha).toBe(meta.sha256);
  });
});
