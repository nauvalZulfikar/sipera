import { describe, expect, it } from 'vitest';
import { renderKrkPdf } from './krk-pdf.js';

const sample = {
  nomorPermohonan: 'KKPR-2026-TEST',
  namaPemohon: 'Budi Santoso',
  alamatPemohon: 'Jl. Asia Afrika 1',
  jenisIzin: 'KKPR',
  lokasiLahan: 'Jl. Soreang 10',
  luasLahan: 500,
  zonaTerkait: ['R-2', 'K-3'],
  kbliList: [{ kode: '41011', judul: 'Konstruksi Gedung' }],
  tanggalDisetujui: '22 Mei 2026',
  ditandatanganiOleh: 'Kepala Dinas',
};

describe('renderKrkPdf', () => {
  it('produces valid PDF buffer with %PDF header', async () => {
    const buf = await renderKrkPdf(sample);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('contains EOF marker', async () => {
    const buf = await renderKrkPdf(sample);
    const tail = buf.subarray(buf.length - 20).toString();
    expect(tail).toContain('%%EOF');
  });

  it('produces consistent size for same input (signature embedded)', async () => {
    const buf1 = await renderKrkPdf(sample);
    const buf2 = await renderKrkPdf(sample);
    // PDFs have CreationDate timestamps that differ, but body should be similar size
    const sizeDiff = Math.abs(buf1.length - buf2.length);
    expect(sizeDiff).toBeLessThan(100); // bytes
  });

  it('different input produces different size', async () => {
    const buf1 = await renderKrkPdf(sample);
    const buf2 = await renderKrkPdf({
      ...sample,
      kbliList: [...sample.kbliList, { kode: '47111', judul: 'Perdagangan Eceran di Minimarket' }],
    });
    expect(buf2.length).toBeGreaterThan(buf1.length);
  });
});
