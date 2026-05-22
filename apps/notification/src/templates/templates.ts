/**
 * i18n templates. Key = `<event>.<channel>.<locale>`.
 * Body pakai `{{var}}` placeholder yang di-replace pakai variables dari payload.
 */

const TEMPLATES: Record<string, { subject?: string; body: string }> = {
  // Permohonan
  'permohonan.created.sms.id': {
    body: 'Sipera: Permohonan {{nomorPermohonan}} berhasil dibuat. Cek status di sipera.bandung.go.id',
  },
  'permohonan.created.email.id': {
    subject: 'Permohonan {{nomorPermohonan}} diterima',
    body: 'Halo {{namaPemohon}},\n\nPermohonan KKPR/PMP UMKM dengan nomor {{nomorPermohonan}} telah kami terima dan akan kami review.\n\nTerima kasih.',
  },
  'permohonan.approved.sms.id': {
    body: 'Sipera: Permohonan {{nomorPermohonan}} DISETUJUI. Dokumen KRK siap diunduh di portal.',
  },
  'permohonan.approved.email.id': {
    subject: 'Permohonan {{nomorPermohonan}} disetujui',
    body: `<html><body style="font-family:system-ui,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f8fafc">
<div style="background:white;padding:32px;border-radius:8px">
<h2 style="color:#16a34a;margin:0 0 16px">✅ Permohonan Disetujui</h2>
<p>Halo <strong>{{namaPemohon}}</strong>,</p>
<p>Kabar baik! Permohonan dengan nomor <strong style="background:#dbeafe;padding:4px 8px;border-radius:4px">{{nomorPermohonan}}</strong> telah <strong style="color:#16a34a">DISETUJUI</strong>.</p>
<p>Dokumen Keterangan Rencana Kota (KRK) siap diunduh di portal:</p>
<p style="text-align:center;margin:24px 0">
<a href="https://sipera.bandung.go.id/permohonan/{{nomorPermohonan}}" style="background:#1e3a8a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Lihat & Download Dokumen</a>
</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
<p style="color:#64748b;font-size:12px">Pemerintah Kota Bandung · Dinas Tata Ruang<br>Email ini dikirim otomatis. Jangan reply.</p>
</div></body></html>`,
  },
  'permohonan.revisi.sms.id': {
    body: 'Sipera: Permohonan {{nomorPermohonan}} butuh revisi. Cek catatan di portal.',
  },
  'permohonan.revisi.email.id': {
    subject: 'Permohonan {{nomorPermohonan}} butuh revisi',
    body: 'Halo {{namaPemohon}},\n\nPermohonan {{nomorPermohonan}} butuh revisi:\n{{catatanRevisi}}\n\nMohon diperbaiki dan submit ulang.',
  },
  // Auth
  'auth.otp.sms.id': {
    body: 'Sipera: Kode {{purpose}} Anda adalah {{code}}. Berlaku 5 menit. Jangan dibagikan.',
  },
};

export function renderTemplate(
  key: string,
  variables: Record<string, string> = {},
): { subject?: string; body: string } | null {
  const tmpl = TEMPLATES[key];
  if (!tmpl) return null;
  return {
    ...(tmpl.subject ? { subject: interpolate(tmpl.subject, variables) } : {}),
    body: interpolate(tmpl.body, variables),
  };
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

export function availableTemplates(): string[] {
  return Object.keys(TEMPLATES);
}
