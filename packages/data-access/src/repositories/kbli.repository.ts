import type { Kbli, PrismaClient } from '@prisma/client';

export interface IKbliRepository {
  list(opts?: { skip?: number; take?: number; search?: string }): Promise<Kbli[]>;
  count(opts?: { search?: string }): Promise<number>;
  findByKode(kode: string): Promise<Kbli | null>;
  upsert(kode: string, judul: string): Promise<Kbli>;
}

export class KbliRepository implements IKbliRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(opts: { skip?: number; take?: number; search?: string } = {}): Promise<Kbli[]> {
    const where = opts.search
      ? {
          OR: [
            { kode: { contains: opts.search, mode: 'insensitive' as const } },
            { judul: { contains: opts.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    return this.prisma.kbli.findMany({
      where,
      skip: opts.skip ?? 0,
      take: opts.take ?? 50,
      orderBy: { kode: 'asc' },
    });
  }

  async count(opts: { search?: string } = {}): Promise<number> {
    const where = opts.search
      ? {
          OR: [
            { kode: { contains: opts.search, mode: 'insensitive' as const } },
            { judul: { contains: opts.search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    return this.prisma.kbli.count({ where });
  }

  async findByKode(kode: string): Promise<Kbli | null> {
    return this.prisma.kbli.findUnique({ where: { kode } });
  }

  async upsert(kode: string, judul: string): Promise<Kbli> {
    return this.prisma.kbli.upsert({
      where: { kode },
      create: { kode, judul },
      update: { judul },
    });
  }
}
