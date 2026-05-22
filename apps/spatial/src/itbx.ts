/**
 * Matriks ITBX (Izin/Terbatas/Bersyarat/X-tidak-diizinkan).
 * Per kombinasi (kode zona × prefix KBLI 2-digit) → status izin.
 *
 * Data nyata diambil dari Perda RDTR Kota Bandung — sini cuma sample subset
 * yang mewakili pattern umum, supaya FE+permohonan bisa develop & test.
 */

export type ItbxStatus = 'I' | 'T' | 'B' | 'X';

export const ITBX_LABEL: Record<ItbxStatus, string> = {
  I: 'Diizinkan',
  T: 'Terbatas',
  B: 'Bersyarat',
  X: 'Tidak Diizinkan',
};

interface ItbxRule {
  zonaPrefix: string;
  kbliPrefix: string;
  status: ItbxStatus;
}

const RULES: ItbxRule[] = [
  // ZONA PERUMAHAN
  { zonaPrefix: 'R-', kbliPrefix: '41', status: 'I' }, // konstruksi gedung tinggal
  { zonaPrefix: 'R-', kbliPrefix: '47', status: 'T' }, // perdagangan eceran (kecil ok)
  { zonaPrefix: 'R-', kbliPrefix: '56', status: 'T' }, // F&B (kecil ok)
  { zonaPrefix: 'R-', kbliPrefix: '10', status: 'X' }, // industri makanan dilarang
  { zonaPrefix: 'R-', kbliPrefix: '14', status: 'X' }, // industri tekstil dilarang
  { zonaPrefix: 'R-', kbliPrefix: '20', status: 'X' }, // industri kimia dilarang
  { zonaPrefix: 'R-', kbliPrefix: '25', status: 'X' }, // industri logam dilarang
  { zonaPrefix: 'R-', kbliPrefix: '85', status: 'B' }, // pendidikan: bersyarat ada izin
  { zonaPrefix: 'R-', kbliPrefix: '86', status: 'B' }, // kesehatan: bersyarat

  // ZONA PERDAGANGAN
  { zonaPrefix: 'K-', kbliPrefix: '47', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '56', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '55', status: 'I' }, // hotel
  { zonaPrefix: 'K-', kbliPrefix: '45', status: 'I' }, // perdagangan mobil
  { zonaPrefix: 'K-', kbliPrefix: '85', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '86', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '41', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '10', status: 'T' }, // industri rumahan ok
  { zonaPrefix: 'K-', kbliPrefix: '20', status: 'X' },
  { zonaPrefix: 'K-', kbliPrefix: '25', status: 'X' },

  // ZONA INDUSTRI
  { zonaPrefix: 'I-', kbliPrefix: '10', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '14', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '20', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '25', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '41', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '47', status: 'B' }, // toko di kawasan industri: bersyarat
  { zonaPrefix: 'I-', kbliPrefix: '85', status: 'X' }, // sekolah di industri: dilarang
  { zonaPrefix: 'I-', kbliPrefix: '86', status: 'X' }, // RS di industri: dilarang

  // ZONA HIJAU / LINDUNG
  { zonaPrefix: 'RTH-', kbliPrefix: '', status: 'X' }, // semua dilarang di RTH
  { zonaPrefix: 'HL', kbliPrefix: '', status: 'X' },
  { zonaPrefix: 'PS-', kbliPrefix: '', status: 'X' },
  { zonaPrefix: 'CB', kbliPrefix: '', status: 'X' },

  // ZONA PERTANIAN
  { zonaPrefix: 'P-', kbliPrefix: '10', status: 'B' },
  { zonaPrefix: 'P-', kbliPrefix: '41', status: 'B' }, // bangun rumah di sawah: bersyarat
  { zonaPrefix: 'P-', kbliPrefix: '47', status: 'X' },
  { zonaPrefix: 'P-', kbliPrefix: '20', status: 'X' },

  // SARANA UMUM
  { zonaPrefix: 'SPU-', kbliPrefix: '85', status: 'I' },
  { zonaPrefix: 'SPU-', kbliPrefix: '86', status: 'I' },
  { zonaPrefix: 'SPU-', kbliPrefix: '47', status: 'B' },
  { zonaPrefix: 'SPU-', kbliPrefix: '10', status: 'X' },

  // KANTOR
  { zonaPrefix: 'KT-', kbliPrefix: '47', status: 'B' },
  { zonaPrefix: 'KT-', kbliPrefix: '56', status: 'T' },
  { zonaPrefix: 'KT-', kbliPrefix: '10', status: 'X' },
];

export function checkItbx(zonaCode: string, kbliCode: string): ItbxStatus {
  const kbliPrefix = kbliCode.slice(0, 2);
  // Cari rule yang paling spesifik (zona + kbli match).
  for (const rule of RULES) {
    if (zonaCode.startsWith(rule.zonaPrefix)) {
      if (rule.kbliPrefix === '' || kbliPrefix === rule.kbliPrefix) {
        return rule.status;
      }
    }
  }
  // Default: kalau gak ada rule, conservative → bersyarat
  return 'B';
}

export interface ItbxResult {
  zona: string;
  kbli: string;
  status: ItbxStatus;
  label: string;
}

export function checkMultiple(zonaCodes: string[], kbliCodes: string[]): ItbxResult[] {
  const out: ItbxResult[] = [];
  for (const zona of zonaCodes) {
    for (const kbli of kbliCodes) {
      const status = checkItbx(zona, kbli);
      out.push({ zona, kbli, status, label: ITBX_LABEL[status] });
    }
  }
  return out;
}

/** Kesimpulan keseluruhan: kalau ada X → tolak, kalau ada B/T → conditional, kalau semua I → approve. */
export function summarizeDecision(results: ItbxResult[]): {
  decision: 'APPROVE' | 'CONDITIONAL' | 'REJECT';
  reasoning: string;
} {
  if (results.length === 0) return { decision: 'CONDITIONAL', reasoning: 'no zona/kbli data' };
  if (results.some((r) => r.status === 'X')) {
    const blocked = results.filter((r) => r.status === 'X');
    return {
      decision: 'REJECT',
      reasoning: `Ditolak: ${blocked.map((b) => `${b.kbli} di zona ${b.zona} = ${b.label}`).join('; ')}`,
    };
  }
  if (results.some((r) => r.status === 'B' || r.status === 'T')) {
    const conditional = results.filter((r) => r.status === 'B' || r.status === 'T');
    return {
      decision: 'CONDITIONAL',
      reasoning: `Bersyarat: ${conditional.map((c) => `${c.kbli} di zona ${c.zona} = ${c.label}`).join('; ')}`,
    };
  }
  return { decision: 'APPROVE', reasoning: 'Semua kombinasi diizinkan' };
}
