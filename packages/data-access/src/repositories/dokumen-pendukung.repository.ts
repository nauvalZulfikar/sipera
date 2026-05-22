import type { PrismaClient, DokumenPendukung, Prisma } from '@prisma/client';

/** Whitelist slot dokumen pendukung. Match dengan UI wizard. */
export const DOKUMEN_SLOTS = [
  'KTP',
  'KK',
  'SHM',
  'AJB',
  'NIB_OSS',
  'FOTO_LOKASI',
  'IZIN_LAINNYA',
  'REVISI',
] as const;

export type DokumenSlot = (typeof DOKUMEN_SLOTS)[number];

export interface IDokumenPendukungRepository {
  create(input: Prisma.DokumenPendukungCreateInput): Promise<DokumenPendukung>;
  findById(id: number): Promise<DokumenPendukung | null>;
  listByPermohonan(permohonanId: string, slot?: DokumenSlot): Promise<DokumenPendukung[]>;
  /** Latest version per slot (untuk revisi flow). */
  latestPerSlot(permohonanId: string): Promise<DokumenPendukung[]>;
  delete(id: number): Promise<void>;
}

export class DokumenPendukungRepository implements IDokumenPendukungRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(input: Prisma.DokumenPendukungCreateInput): Promise<DokumenPendukung> {
    return this.prisma.dokumenPendukung.create({ data: input });
  }

  findById(id: number): Promise<DokumenPendukung | null> {
    return this.prisma.dokumenPendukung.findUnique({ where: { id } });
  }

  listByPermohonan(permohonanId: string, slot?: DokumenSlot): Promise<DokumenPendukung[]> {
    return this.prisma.dokumenPendukung.findMany({
      where: { permohonanId, ...(slot ? { slot } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Latest version per slot. Untuk revisi: kalau user upload ulang KTP,
   * yang terbaru jadi "current", yang lama tetap di DB sebagai history.
   */
  async latestPerSlot(permohonanId: string): Promise<DokumenPendukung[]> {
    const all = await this.prisma.dokumenPendukung.findMany({
      where: { permohonanId },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const out: DokumenPendukung[] = [];
    for (const d of all) {
      if (seen.has(d.slot)) continue;
      seen.add(d.slot);
      out.push(d);
    }
    return out;
  }

  async delete(id: number): Promise<void> {
    await this.prisma.dokumenPendukung.delete({ where: { id } });
  }
}
