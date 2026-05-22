/**
 * Seed rules ITBX — diambil dari `itbx.ts` hardcoded rules.
 * Run sekali via `POST /admin/itbx/seed` untuk populate DB awal.
 */
import type { ItbxStatus } from './itbx.js';

interface SeedRule {
  zonaPrefix: string;
  kbliPrefix: string;
  status: ItbxStatus;
}

const seed: SeedRule[] = [
  // ZONA PERUMAHAN
  { zonaPrefix: 'R-', kbliPrefix: '41', status: 'I' },
  { zonaPrefix: 'R-', kbliPrefix: '47', status: 'T' },
  { zonaPrefix: 'R-', kbliPrefix: '56', status: 'T' },
  { zonaPrefix: 'R-', kbliPrefix: '10', status: 'X' },
  { zonaPrefix: 'R-', kbliPrefix: '14', status: 'X' },
  { zonaPrefix: 'R-', kbliPrefix: '20', status: 'X' },
  { zonaPrefix: 'R-', kbliPrefix: '25', status: 'X' },
  { zonaPrefix: 'R-', kbliPrefix: '85', status: 'B' },
  { zonaPrefix: 'R-', kbliPrefix: '86', status: 'B' },
  // ZONA PERDAGANGAN
  { zonaPrefix: 'K-', kbliPrefix: '47', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '56', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '55', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '45', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '85', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '86', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '41', status: 'I' },
  { zonaPrefix: 'K-', kbliPrefix: '10', status: 'T' },
  { zonaPrefix: 'K-', kbliPrefix: '20', status: 'X' },
  { zonaPrefix: 'K-', kbliPrefix: '25', status: 'X' },
  // ZONA INDUSTRI
  { zonaPrefix: 'I-', kbliPrefix: '10', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '14', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '20', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '25', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '41', status: 'I' },
  { zonaPrefix: 'I-', kbliPrefix: '47', status: 'B' },
  { zonaPrefix: 'I-', kbliPrefix: '85', status: 'X' },
  { zonaPrefix: 'I-', kbliPrefix: '86', status: 'X' },
  // ZONA HIJAU / LINDUNG — semua dilarang
  { zonaPrefix: 'RTH-', kbliPrefix: '', status: 'X' },
  { zonaPrefix: 'HL', kbliPrefix: '', status: 'X' },
  { zonaPrefix: 'PS-', kbliPrefix: '', status: 'X' },
  { zonaPrefix: 'CB', kbliPrefix: '', status: 'X' },
  // ZONA PERTANIAN
  { zonaPrefix: 'P-', kbliPrefix: '10', status: 'B' },
  { zonaPrefix: 'P-', kbliPrefix: '41', status: 'B' },
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

export default seed;
