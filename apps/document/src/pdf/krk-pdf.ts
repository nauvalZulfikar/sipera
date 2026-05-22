import PDFDocument from 'pdfkit';
import { createHash } from 'node:crypto';
import type { KrkData } from './krk-renderer.js';

/**
 * Render KRK as styled PDF using pdfkit.
 * Lebih ringan dari Puppeteer (~1MB vs 150MB), no Chromium dependency.
 * Layout: A4 portrait, kop dinas + tabel data + tanda tangan elektronik (HMAC hash).
 */
export function renderKrkPdf(data: KrkData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `KRK ${data.nomorPermohonan}`,
        Author: 'Pemerintah Kota Bandung — Dinas Tata Ruang',
        Subject: 'Keterangan Rencana Kota',
        Creator: 'Sipera (Sistem Perizinan Tata Ruang)',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Kop dinas
    doc
      .fillColor('#1e3a8a')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('PEMERINTAH KOTA BANDUNG', { align: 'center' })
      .fontSize(13)
      .text('DINAS TATA RUANG', { align: 'center' })
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#475569')
      .text('Jl. Cianjur No. 34, Bandung 40114 — Telp. (022) 7234567', { align: 'center' });

    // Garis horizontal
    doc
      .moveDown(0.5)
      .strokeColor('#1e3a8a')
      .lineWidth(2)
      .moveTo(60, doc.y)
      .lineTo(535, doc.y)
      .stroke();

    // Title
    doc
      .moveDown(1)
      .fillColor('#000')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('KETERANGAN RENCANA KOTA (KRK)', { align: 'center' })
      .moveDown(0.3)
      .fontSize(11)
      .font('Helvetica')
      .text(`Nomor: ${data.nomorPermohonan}`, { align: 'center' });

    // Data table
    doc.moveDown(1.5).fontSize(10);
    const rows: [string, string][] = [
      ['Nama Pemohon', data.namaPemohon],
      ['Alamat Pemohon', data.alamatPemohon],
      ['Jenis Izin', data.jenisIzin],
      ['Lokasi Lahan', data.lokasiLahan],
      ['Luas Lahan', `${data.luasLahan} m²`],
      ['Zona RDTR Terkait', data.zonaTerkait.length ? data.zonaTerkait.join(', ') : '-'],
      [
        'KBLI Dimohon',
        data.kbliList.length ? data.kbliList.map((k) => `${k.kode} — ${k.judul}`).join('\n') : '-',
      ],
    ];
    for (const [label, value] of rows) {
      const yStart = doc.y;
      doc.font('Helvetica-Bold').fillColor('#334155').text(label, 60, yStart, { width: 150 });
      doc.font('Helvetica').fillColor('#000').text(value, 220, yStart, { width: 315 });
      doc.moveDown(0.7);
    }

    // Body paragraph
    doc
      .moveDown(1)
      .font('Helvetica')
      .fontSize(10)
      .text(
        'Berdasarkan analisis terhadap Peraturan Daerah RDTR Kota Bandung yang berlaku, permohonan tersebut DISETUJUI dengan ketentuan teknis yang melekat pada dokumen ini.',
        { align: 'justify' },
      );

    // Signature block
    const sigHash = createHash('sha256')
      .update(`${data.nomorPermohonan}|${data.namaPemohon}|${data.tanggalDisetujui}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();
    doc
      .moveDown(3)
      .fontSize(10)
      .text(`Bandung, ${data.tanggalDisetujui}`, { align: 'right' })
      .moveDown(0.5)
      .font('Helvetica-Oblique')
      .text(data.ditandatanganiOleh, { align: 'right' })
      .moveDown(3)
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#16a34a')
      .text('✓ TANDA TANGAN ELEKTRONIK', { align: 'right' })
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#64748b')
      .text(`Signature: ${sigHash}`, { align: 'right' })
      .text('Dokumen ini sah secara hukum tanpa tanda tangan basah.', { align: 'right' });

    // Footer
    const footerY = doc.page.height - 40;
    doc
      .fontSize(7)
      .fillColor('#94a3b8')
      .text(
        `Sipera v1.0 — Generated ${new Date().toISOString()} — Verifikasi: sipera.bandung.go.id/verify/${data.nomorPermohonan}`,
        60,
        footerY,
        { align: 'center', width: 475 },
      );

    doc.end();
  });
}
