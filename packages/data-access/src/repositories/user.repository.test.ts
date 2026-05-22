import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { UserRepository } from './user.repository.js';

function mockPrisma(): PrismaClient {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe('UserRepository', () => {
  it('findByNoTelp queries by unique no_telp', async () => {
    const p = mockPrisma();
    const sample = { id: 1, nama: 'A', noTelp: '081', role: 'admin' };
    vi.mocked(p.user.findUnique).mockResolvedValue(sample as never);
    const repo = new UserRepository(p);
    const u = await repo.findByNoTelp('081');
    expect(p.user.findUnique).toHaveBeenCalledWith({ where: { noTelp: '081' } });
    expect(u).toEqual(sample);
  });

  it('listActive filters by deletedAt null and applies pagination', async () => {
    const p = mockPrisma();
    vi.mocked(p.user.findMany).mockResolvedValue([]);
    const repo = new UserRepository(p);
    await repo.listActive({ skip: 10, take: 5, role: 'pemohon' });
    expect(p.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, role: 'pemohon' },
      skip: 10,
      take: 5,
      orderBy: { id: 'asc' },
    });
  });

  it('softDelete sets deletedAt and status', async () => {
    const p = mockPrisma();
    const before = Date.now();
    vi.mocked(p.user.update).mockResolvedValue({ id: 42 } as never);
    const repo = new UserRepository(p);
    await repo.softDelete(42);
    const call = vi.mocked(p.user.update).mock.calls[0]?.[0] as {
      data: { deletedAt: Date; status: string };
    };
    expect(call.data.status).toBe('deleted');
    expect(call.data.deletedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('countActive applies role filter', async () => {
    const p = mockPrisma();
    vi.mocked(p.user.count).mockResolvedValue(7);
    const repo = new UserRepository(p);
    const n = await repo.countActive({ role: 'admin' });
    expect(p.user.count).toHaveBeenCalledWith({ where: { deletedAt: null, role: 'admin' } });
    expect(n).toBe(7);
  });
});
