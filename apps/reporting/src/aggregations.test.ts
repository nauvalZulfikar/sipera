import { describe, expect, it } from 'vitest';
import { summarize, toCsv, type PermohonanLike } from './aggregations.js';

const samples: PermohonanLike[] = [
  {
    id: '1',
    nomor: 'P-001',
    pemohonId: 1,
    namaPemohon: 'A',
    status: 'Baru',
    jenisIzin: 'KKPR',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-20T10:00:00.000Z',
  },
  {
    id: '2',
    nomor: 'P-002',
    pemohonId: 1,
    namaPemohon: 'B',
    status: 'Disetujui',
    jenisIzin: 'KKPR',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
  },
  {
    id: '3',
    nomor: 'P-003',
    pemohonId: 2,
    namaPemohon: 'C',
    status: 'Disetujui',
    jenisIzin: 'PMP-UMKM',
    createdAt: '2026-05-21T10:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
  },
];

describe('summarize', () => {
  it('counts total + by status with percentages', () => {
    const r = summarize(samples);
    expect(r.total).toBe(3);
    const approved = r.byStatus.find((s) => s.status === 'Disetujui');
    expect(approved?.total).toBe(2);
    expect(approved?.pct).toBeCloseTo(66.7, 1);
  });

  it('computes by jenis', () => {
    const r = summarize(samples);
    const kkpr = r.byJenis.find((j) => j.jenis === 'KKPR');
    expect(kkpr?.total).toBe(2);
  });

  it('aggregates daily trend', () => {
    const r = summarize(samples);
    expect(r.daily.find((d) => d.date === '2026-05-20')?.count).toBe(2);
    expect(r.daily.find((d) => d.date === '2026-05-21')?.count).toBe(1);
  });

  it('computes average processing days for completed', () => {
    const r = summarize(samples);
    // 2 day + 1 day = avg 1.5 days
    expect(r.avgProcessingDays).toBeCloseTo(1.5, 1);
  });

  it('handles empty input', () => {
    const r = summarize([]);
    expect(r.total).toBe(0);
    expect(r.avgProcessingDays).toBe(0);
  });
});

describe('toCsv', () => {
  it('escapes commas and quotes', () => {
    const csv = toCsv([
      {
        id: '1',
        nomor: 'P,001',
        pemohonId: 1,
        namaPemohon: 'A "quote" B',
        status: 'Baru',
        jenisIzin: 'KKPR',
        createdAt: '2026',
        updatedAt: '2026',
      },
    ]);
    expect(csv).toContain('"P,001"');
    expect(csv).toContain('"A ""quote"" B"');
  });

  it('produces header row + data row', () => {
    const csv = toCsv([samples[0]!]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('nomor,namaPemohon,jenisIzin,status,createdAt,updatedAt');
    expect(lines).toHaveLength(2);
  });
});
