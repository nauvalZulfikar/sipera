/**
 * Aggregation engine. Input: list permohonan dari permohonan-module.
 * Output: agregat siap-render (chart, table, export).
 */

export interface PermohonanLike {
  id: string;
  nomor: string;
  pemohonId: number;
  namaPemohon: string;
  status: string;
  jenisIzin: string;
  createdAt: string;
  updatedAt: string;
}

export interface CountByStatus {
  status: string;
  total: number;
  pct: number;
}

export interface DailyTrend {
  date: string;
  count: number;
}

export interface ReportSummary {
  total: number;
  byStatus: CountByStatus[];
  byJenis: { jenis: string; total: number }[];
  daily: DailyTrend[];
  avgProcessingDays: number;
}

export function summarize(list: PermohonanLike[]): ReportSummary {
  const total = list.length;
  const statusMap = new Map<string, number>();
  const jenisMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  let totalProcessingMs = 0;
  let completedCount = 0;

  for (const p of list) {
    statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);
    jenisMap.set(p.jenisIzin, (jenisMap.get(p.jenisIzin) ?? 0) + 1);
    const date = p.createdAt.slice(0, 10);
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
    if (['Disetujui', 'Ditolak', 'Selesai'].includes(p.status)) {
      totalProcessingMs += new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime();
      completedCount++;
    }
  }

  const byStatus: CountByStatus[] = [...statusMap.entries()]
    .map(([status, n]) => ({
      status,
      total: n,
      pct: total > 0 ? Math.round((n / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const byJenis = [...jenisMap.entries()]
    .map(([jenis, n]) => ({ jenis, total: n }))
    .sort((a, b) => b.total - a.total);

  const daily: DailyTrend[] = [...dailyMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const avgProcessingDays =
    completedCount > 0
      ? Math.round((totalProcessingMs / completedCount / 86400000) * 100) / 100
      : 0;

  return { total, byStatus, byJenis, daily, avgProcessingDays };
}

/** CSV export. RFC 4180 compliant (quote escape). */
export function toCsv(list: PermohonanLike[]): string {
  const headers = ['nomor', 'namaPemohon', 'jenisIzin', 'status', 'createdAt', 'updatedAt'];
  const lines = [headers.join(',')];
  for (const p of list) {
    lines.push(
      [
        csvCell(p.nomor),
        csvCell(p.namaPemohon),
        csvCell(p.jenisIzin),
        csvCell(p.status),
        csvCell(p.createdAt),
        csvCell(p.updatedAt),
      ].join(','),
    );
  }
  return lines.join('\n');
}

function csvCell(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
