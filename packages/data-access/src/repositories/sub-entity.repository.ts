import type {
  PrismaClient,
  Pemohon,
  Kuasa,
  Perusahaan,
  Lahan,
  Penguasaan,
  Prisma,
} from '@prisma/client';

/**
 * Generic per-permohonan sub-entity repository.
 * Each sub-entity (pemohon, kuasa, perusahaan, lahan, penguasaan) follows the same pattern:
 * - one (or many) record per permohonanId
 * - CRUD by id, list by permohonanId
 */
export interface SubEntityRepository<T, CreateInput, UpdateInput> {
  create(input: CreateInput): Promise<T>;
  update(id: number, input: UpdateInput): Promise<T>;
  delete(id: number): Promise<void>;
  findById(id: number): Promise<T | null>;
  listByPermohonan(permohonanId: string): Promise<T[]>;
}

export class PemohonRepository implements SubEntityRepository<
  Pemohon,
  Prisma.PemohonCreateInput,
  Prisma.PemohonUpdateInput
> {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: Prisma.PemohonCreateInput) {
    return this.prisma.pemohon.create({ data: input });
  }
  update(id: number, input: Prisma.PemohonUpdateInput) {
    return this.prisma.pemohon.update({ where: { id }, data: input });
  }
  async delete(id: number) {
    await this.prisma.pemohon.delete({ where: { id } });
  }
  findById(id: number) {
    return this.prisma.pemohon.findUnique({ where: { id } });
  }
  listByPermohonan(permohonanId: string) {
    return this.prisma.pemohon.findMany({ where: { permohonanId }, orderBy: { id: 'asc' } });
  }
}

export class KuasaRepository implements SubEntityRepository<
  Kuasa,
  Prisma.KuasaCreateInput,
  Prisma.KuasaUpdateInput
> {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: Prisma.KuasaCreateInput) {
    return this.prisma.kuasa.create({ data: input });
  }
  update(id: number, input: Prisma.KuasaUpdateInput) {
    return this.prisma.kuasa.update({ where: { id }, data: input });
  }
  async delete(id: number) {
    await this.prisma.kuasa.delete({ where: { id } });
  }
  findById(id: number) {
    return this.prisma.kuasa.findUnique({ where: { id } });
  }
  listByPermohonan(permohonanId: string) {
    return this.prisma.kuasa.findMany({ where: { permohonanId }, orderBy: { id: 'asc' } });
  }
}

export class PerusahaanRepository implements SubEntityRepository<
  Perusahaan,
  Prisma.PerusahaanCreateInput,
  Prisma.PerusahaanUpdateInput
> {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: Prisma.PerusahaanCreateInput) {
    return this.prisma.perusahaan.create({ data: input });
  }
  update(id: number, input: Prisma.PerusahaanUpdateInput) {
    return this.prisma.perusahaan.update({ where: { id }, data: input });
  }
  async delete(id: number) {
    await this.prisma.perusahaan.delete({ where: { id } });
  }
  findById(id: number) {
    return this.prisma.perusahaan.findUnique({ where: { id } });
  }
  listByPermohonan(permohonanId: string) {
    return this.prisma.perusahaan.findMany({ where: { permohonanId }, orderBy: { id: 'asc' } });
  }
}

export class LahanRepository implements SubEntityRepository<
  Lahan,
  Prisma.LahanCreateInput,
  Prisma.LahanUpdateInput
> {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: Prisma.LahanCreateInput) {
    return this.prisma.lahan.create({ data: input });
  }
  update(id: number, input: Prisma.LahanUpdateInput) {
    return this.prisma.lahan.update({ where: { id }, data: input });
  }
  async delete(id: number) {
    await this.prisma.lahan.delete({ where: { id } });
  }
  findById(id: number) {
    return this.prisma.lahan.findUnique({ where: { id } });
  }
  listByPermohonan(permohonanId: string) {
    return this.prisma.lahan.findMany({ where: { permohonanId }, orderBy: { id: 'asc' } });
  }
}

export class PenguasaanRepository implements SubEntityRepository<
  Penguasaan,
  Prisma.PenguasaanCreateInput,
  Prisma.PenguasaanUpdateInput
> {
  constructor(private readonly prisma: PrismaClient) {}
  create(input: Prisma.PenguasaanCreateInput) {
    return this.prisma.penguasaan.create({ data: input });
  }
  update(id: number, input: Prisma.PenguasaanUpdateInput) {
    return this.prisma.penguasaan.update({ where: { id }, data: input });
  }
  async delete(id: number) {
    await this.prisma.penguasaan.delete({ where: { id } });
  }
  findById(id: number) {
    return this.prisma.penguasaan.findUnique({ where: { id } });
  }
  listByPermohonan(permohonanId: string) {
    return this.prisma.penguasaan.findMany({ where: { permohonanId }, orderBy: { id: 'asc' } });
  }
}
