import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { DokumenPendukungRepository, DOKUMEN_SLOTS } from './dokumen-pendukung.repository.js';

function mockPrisma(rows: { id: number; slot: string; createdAt: Date }[] = []) {
  return {
    dokumenPendukung: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue(rows),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as PrismaClient;
}

describe('DokumenPendukungRepository', () => {
  it('DOKUMEN_SLOTS contains expected slots', () => {
    expect(DOKUMEN_SLOTS).toContain('KTP');
    expect(DOKUMEN_SLOTS).toContain('KK');
    expect(DOKUMEN_SLOTS).toContain('SHM');
    expect(DOKUMEN_SLOTS).toContain('NIB_OSS');
  });

  it('listByPermohonan filters by permohonanId only when no slot', async () => {
    const p = mockPrisma();
    const repo = new DokumenPendukungRepository(p);
    await repo.listByPermohonan('perm-1');
    expect(p.dokumenPendukung.findMany).toHaveBeenCalledWith({
      where: { permohonanId: 'perm-1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('listByPermohonan filters by slot when provided', async () => {
    const p = mockPrisma();
    const repo = new DokumenPendukungRepository(p);
    await repo.listByPermohonan('perm-1', 'KTP');
    expect(p.dokumenPendukung.findMany).toHaveBeenCalledWith({
      where: { permohonanId: 'perm-1', slot: 'KTP' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('latestPerSlot dedupes by slot, keeps newest first', async () => {
    const now = new Date();
    const old = new Date(now.getTime() - 86400000);
    const p = mockPrisma([
      { id: 3, slot: 'KTP', createdAt: now },
      { id: 2, slot: 'KTP', createdAt: old },
      { id: 1, slot: 'KK', createdAt: now },
    ]);
    const repo = new DokumenPendukungRepository(p);
    const latest = await repo.latestPerSlot('perm-1');
    expect(latest).toHaveLength(2);
    expect(latest[0]?.id).toBe(3); // KTP latest
    expect(latest[1]?.id).toBe(1); // KK
  });
});
