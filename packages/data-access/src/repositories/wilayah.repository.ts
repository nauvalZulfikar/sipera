import type { PrismaClient, Wilayah, Kelurahan } from '@prisma/client';

export interface IWilayahRepository {
  listKecamatan(cityId: number): Promise<Wilayah[]>;
  listKelurahan(kecamatanId: number): Promise<Kelurahan[]>;
  findKecamatanById(id: number): Promise<Wilayah | null>;
}

export class WilayahRepository implements IWilayahRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listKecamatan(cityId: number): Promise<Wilayah[]> {
    return this.prisma.wilayah.findMany({
      where: { cityId },
      orderBy: { nama: 'asc' },
    });
  }

  async listKelurahan(kecamatanId: number): Promise<Kelurahan[]> {
    return this.prisma.kelurahan.findMany({
      where: { wilayahId: kecamatanId },
      orderBy: { nama: 'asc' },
    });
  }

  async findKecamatanById(id: number): Promise<Wilayah | null> {
    return this.prisma.wilayah.findUnique({ where: { id } });
  }
}
