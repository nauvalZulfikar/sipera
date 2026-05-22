import { describe, expect, it } from 'vitest';
import { renderKrkHtml } from './krk-renderer.js';

const sample = {
  nomorPermohonan: 'KKPR-2026-00001',
  namaPemohon: 'Budi Santoso',
  alamatPemohon: 'Jl. Asia Afrika 1, Bandung',
  jenisIzin: 'KKPR',
  lokasiLahan: 'Jl. Soreang 10',
  luasLahan: 500,
  zonaTerkait: ['Perumahan R-2', 'Perdagangan K-3'],
  kbliList: [{ kode: '41011', judul: 'Konstruksi Gedung Tinggal' }],
  tanggalDisetujui: '22 Mei 2026',
  ditandatanganiOleh: 'Kepala Dinas Tata Ruang',
};

describe('renderKrkHtml', () => {
  it('renders nomor permohonan in title and heading', () => {
    const html = renderKrkHtml(sample);
    expect(html).toContain('KKPR-2026-00001');
    expect(html).toContain('Keterangan Rencana Kota');
  });

  it('lists all zona', () => {
    const html = renderKrkHtml(sample);
    expect(html).toContain('Perumahan R-2');
    expect(html).toContain('Perdagangan K-3');
  });

  it('lists all KBLI', () => {
    const html = renderKrkHtml(sample);
    expect(html).toContain('41011');
    expect(html).toContain('Konstruksi Gedung Tinggal');
  });

  it('escapes HTML special chars', () => {
    const evil = { ...sample, namaPemohon: '<script>alert(1)</script>' };
    const html = renderKrkHtml(evil);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders luas with unit', () => {
    const html = renderKrkHtml(sample);
    expect(html).toContain('500 m²');
  });
});
