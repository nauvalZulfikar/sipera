import type { IKbliRepository } from '@sipera/data-access';

export interface KbliDto {
  id: number;
  kode: string;
  judul: string;
}

export interface ListKbliQuery {
  search?: string;
  page?: number;
  perPage?: number;
}

export class KbliService {
  constructor(private readonly repo: IKbliRepository) {}

  async list(q: ListKbliQuery = {}): Promise<{
    data: KbliDto[];
    meta: { page: number; perPage: number; total: number };
  }> {
    const page = Math.max(1, q.page ?? 1);
    const perPage = Math.min(200, Math.max(1, q.perPage ?? 50));
    const skip = (page - 1) * perPage;
    const [rows, total] = await Promise.all([
      this.repo.list({ skip, take: perPage, ...(q.search ? { search: q.search } : {}) }),
      this.repo.count(q.search ? { search: q.search } : {}),
    ]);
    return {
      data: rows.map((r) => ({ id: r.id, kode: r.kode, judul: r.judul })),
      meta: { page, perPage, total },
    };
  }

  async findByKode(kode: string): Promise<KbliDto | null> {
    const r = await this.repo.findByKode(kode);
    return r ? { id: r.id, kode: r.kode, judul: r.judul } : null;
  }

  async upsert(kode: string, judul: string): Promise<KbliDto> {
    const r = await this.repo.upsert(kode, judul);
    return { id: r.id, kode: r.kode, judul: r.judul };
  }

  /**
   * Bulk import dari CSV. Format per baris: "kode,judul".
   * Return jumlah yang berhasil & error per baris.
   */
  async bulkImportCsv(
    csvContent: string,
  ): Promise<{ inserted: number; updated: number; errors: { line: number; reason: string }[] }> {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let inserted = 0;
    let updated = 0;
    const errors: { line: number; reason: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = parseCsvLine(line);
      if (parts.length < 2) {
        errors.push({ line: i + 1, reason: 'expected 2 columns: kode, judul' });
        continue;
      }
      const kode = parts[0]?.trim();
      const judul = parts[1]?.trim();
      if (!kode || !judul) {
        errors.push({ line: i + 1, reason: 'empty kode or judul' });
        continue;
      }
      if (!/^\d{2,10}$/.test(kode)) {
        errors.push({ line: i + 1, reason: `invalid kode format: ${kode}` });
        continue;
      }
      const existing = await this.repo.findByKode(kode);
      await this.repo.upsert(kode, judul);
      if (existing) updated++;
      else inserted++;
    }
    return { inserted, updated, errors };
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') {
        result.push(cur);
        cur = '';
      } else cur += c;
    }
  }
  result.push(cur);
  return result;
}
