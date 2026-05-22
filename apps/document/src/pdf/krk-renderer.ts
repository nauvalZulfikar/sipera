/**
 * KRK PDF generator. Versi v1: pakai HTML→string sederhana, masih plain text.
 * Production: swap dengan Puppeteer (render Handlebars template ke HTML, lalu print-to-PDF).
 * Untuk Phase 6 v1, kita hasilkan HTML siap-print + return sebagai application/pdf
 * via library ringan (pdfkit) atau placeholder text.
 */

export interface KrkData {
  nomorPermohonan: string;
  namaPemohon: string;
  alamatPemohon: string;
  jenisIzin: string;
  lokasiLahan: string;
  luasLahan: number;
  zonaTerkait: string[];
  kbliList: { kode: string; judul: string }[];
  tanggalDisetujui: string;
  ditandatanganiOleh: string;
}

/**
 * Render KRK ke HTML. Untuk diubah ke PDF, pipe ke Puppeteer.page.pdf().
 * V1: return HTML string. Frontend bisa print-to-PDF lewat browser.
 */
export function renderKrkHtml(data: KrkData): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>KRK ${escape(data.nomorPermohonan)}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; color: #000; }
  h1 { text-align: center; font-size: 14pt; text-transform: uppercase; margin-bottom: 4px; }
  h2 { text-align: center; font-size: 12pt; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td, th { padding: 6px 8px; vertical-align: top; }
  .label { width: 35%; font-weight: bold; }
  .footer { margin-top: 60px; text-align: right; }
  ul { margin: 4px 0; padding-left: 20px; }
</style>
</head>
<body>
<h1>Keterangan Rencana Kota (KRK)</h1>
<h2>Pemerintah Kota Bandung — Dinas Tata Ruang</h2>
<p style="text-align:center"><strong>Nomor: ${escape(data.nomorPermohonan)}</strong></p>
<hr>
<table>
  <tr><td class="label">Nama Pemohon</td><td>: ${escape(data.namaPemohon)}</td></tr>
  <tr><td class="label">Alamat Pemohon</td><td>: ${escape(data.alamatPemohon)}</td></tr>
  <tr><td class="label">Jenis Izin</td><td>: ${escape(data.jenisIzin)}</td></tr>
  <tr><td class="label">Lokasi Lahan</td><td>: ${escape(data.lokasiLahan)}</td></tr>
  <tr><td class="label">Luas Lahan</td><td>: ${data.luasLahan} m²</td></tr>
  <tr><td class="label">Zona RDTR Terkait</td>
      <td>: <ul>${data.zonaTerkait.map((z) => `<li>${escape(z)}</li>`).join('')}</ul></td></tr>
  <tr><td class="label">KBLI Dimohon</td>
      <td>: <ul>${data.kbliList.map((k) => `<li><strong>${escape(k.kode)}</strong> — ${escape(k.judul)}</li>`).join('')}</ul></td></tr>
</table>
<p>Berdasarkan analisis terhadap Peraturan Daerah RDTR Kota Bandung yang berlaku, permohonan tersebut <strong>DISETUJUI</strong> dengan ketentuan teknis yang melekat pada dokumen ini.</p>
<div class="footer">
  Bandung, ${escape(data.tanggalDisetujui)}<br>
  <em>${escape(data.ditandatanganiOleh)}</em><br><br><br>
  <strong>(Tanda tangan elektronik)</strong>
</div>
</body>
</html>`;
}

function escape(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
