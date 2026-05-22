import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  PemohonRepository,
  KuasaRepository,
  PerusahaanRepository,
  LahanRepository,
  PenguasaanRepository,
} from './sub-entity.repository.js';

function mockPrisma() {
  const mkTable = () => ({
    create: vi
      .fn()
      .mockImplementation(({ data }: { data: unknown }) =>
        Promise.resolve({ id: 1, ...(data as object) }),
      ),
    update: vi
      .fn()
      .mockImplementation(({ where, data }: { where: { id: number }; data: unknown }) =>
        Promise.resolve({ id: where.id, ...(data as object) }),
      ),
    delete: vi.fn().mockResolvedValue(undefined),
    findUnique: vi
      .fn()
      .mockImplementation(({ where }: { where: { id: number } }) =>
        Promise.resolve({ id: where.id, nama: 'mock' }),
      ),
    findMany: vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
  });
  return {
    pemohon: mkTable(),
    kuasa: mkTable(),
    perusahaan: mkTable(),
    lahan: mkTable(),
    penguasaan: mkTable(),
  } as unknown as PrismaClient;
}

describe('PemohonRepository', () => {
  it('CRUD round-trip', async () => {
    const p = mockPrisma();
    const repo = new PemohonRepository(p);
    const created = await repo.create({
      permohonanId: 'perm-1',
      nama: 'Budi',
      nik: '1234567890123456',
      noTelp: '081',
      alamat: 'Jl A',
      rt: '01',
      rw: '02',
    } as never);
    expect(created.id).toBe(1);
    await repo.update(1, { nama: 'Budi 2' } as never);
    expect(p.pemohon.update).toHaveBeenCalled();
    await repo.delete(1);
    expect(p.pemohon.delete).toHaveBeenCalled();
    const list = await repo.listByPermohonan('perm-1');
    expect(list).toHaveLength(2);
    expect(p.pemohon.findMany).toHaveBeenCalledWith({
      where: { permohonanId: 'perm-1' },
      orderBy: { id: 'asc' },
    });
  });
});

describe('Other sub-entity repos (smoke)', () => {
  it.each([
    ['kuasa', KuasaRepository],
    ['perusahaan', PerusahaanRepository],
    ['lahan', LahanRepository],
    ['penguasaan', PenguasaanRepository],
  ] as const)('%s.listByPermohonan filters by permohonanId', async (name, RepoCls) => {
    const p = mockPrisma();
    const repo = new RepoCls(p);
    const list = await repo.listByPermohonan('perm-X');
    expect(list).toHaveLength(2);
    const table = (p as unknown as Record<string, { findMany: ReturnType<typeof vi.fn> }>)[name];
    expect(table?.findMany).toHaveBeenCalledWith({
      where: { permohonanId: 'perm-X' },
      orderBy: { id: 'asc' },
    });
  });

  it.each([
    ['kuasa', KuasaRepository],
    ['perusahaan', PerusahaanRepository],
    ['lahan', LahanRepository],
    ['penguasaan', PenguasaanRepository],
  ] as const)('%s.findById queries by id', async (name, RepoCls) => {
    const p = mockPrisma();
    const repo = new RepoCls(p);
    const r = await repo.findById(42);
    expect(r?.id).toBe(42);
    const table = (p as unknown as Record<string, { findUnique: ReturnType<typeof vi.fn> }>)[name];
    expect(table?.findUnique).toHaveBeenCalledWith({ where: { id: 42 } });
  });
});
