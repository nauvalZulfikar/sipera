import { describe, expect, it, vi } from 'vitest';
import type { IKbliRepository } from '@sipera/data-access';
import { KbliService } from './kbli.service.js';

function mockRepo(over: Partial<IKbliRepository> = {}): IKbliRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findByKode: vi.fn().mockResolvedValue(null),
    upsert: vi
      .fn()
      .mockImplementation((kode: string, judul: string) =>
        Promise.resolve({ id: 1, kode, judul, createdAt: new Date(), updatedAt: new Date() }),
      ),
    ...over,
  };
}

describe('KbliService.list', () => {
  it('returns paginated meta', async () => {
    const repo = mockRepo({
      list: vi.fn().mockResolvedValue([{ id: 1, kode: '41011', judul: 'X' }]),
      count: vi.fn().mockResolvedValue(42),
    });
    const svc = new KbliService(repo);
    const r = await svc.list({ page: 2, perPage: 10 });
    expect(r.meta).toEqual({ page: 2, perPage: 10, total: 42 });
    expect(r.data).toHaveLength(1);
    expect(repo.list).toHaveBeenCalledWith({ skip: 10, take: 10 });
  });

  it('clamps perPage to max 200', async () => {
    const repo = mockRepo();
    const svc = new KbliService(repo);
    await svc.list({ perPage: 9999 });
    expect(repo.list).toHaveBeenCalledWith({ skip: 0, take: 200 });
  });
});

describe('KbliService.bulkImportCsv', () => {
  it('inserts new rows and counts inserted', async () => {
    const repo = mockRepo();
    const svc = new KbliService(repo);
    const csv = '41011,Konstruksi Gedung\n47111,Minimarket';
    const r = await svc.bulkImportCsv(csv);
    expect(r.inserted).toBe(2);
    expect(r.updated).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it('detects updates vs inserts', async () => {
    let existing: { id: number; kode: string; judul: string } | null = null;
    const repo = mockRepo({
      findByKode: vi.fn().mockImplementation(() => Promise.resolve(existing)),
    });
    const svc = new KbliService(repo);
    existing = null;
    await svc.bulkImportCsv('41011,A');
    existing = { id: 1, kode: '41011', judul: 'X' };
    const r = await svc.bulkImportCsv('41011,B');
    expect(r.updated).toBe(1);
    expect(r.inserted).toBe(0);
  });

  it('rejects invalid format', async () => {
    const repo = mockRepo();
    const svc = new KbliService(repo);
    const csv = 'oneonly\nABC,judul\n41011,valid';
    const r = await svc.bulkImportCsv(csv);
    expect(r.errors).toHaveLength(2);
    expect(r.inserted).toBe(1);
  });

  it('handles quoted CSV with commas inside', async () => {
    const repo = mockRepo();
    const svc = new KbliService(repo);
    const csv = '41011,"Industri, Konstruksi & Lainnya"';
    const r = await svc.bulkImportCsv(csv);
    expect(r.inserted).toBe(1);
    expect(repo.upsert).toHaveBeenCalledWith('41011', 'Industri, Konstruksi & Lainnya');
  });
});
