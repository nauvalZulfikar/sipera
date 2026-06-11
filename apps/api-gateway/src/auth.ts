import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifikasi Bearer JWT yang diterbitkan modul identity.
 *
 * Identity menandatangani token dengan `jsonwebtoken` HS256. Di gateway kita
 * verifikasi pakai `node:crypto` saja (tanpa dependency tambahan) supaya
 * lockfile & attack-surface tetap minimal. Yang dicek:
 *   1. format `header.payload.signature`
 *   2. algoritma di header HARUS HS256 (tolak `none` / algoritma lain — cegah alg-confusion)
 *   3. tanda tangan HMAC-SHA256 cocok (constant-time compare)
 *   4. belum lewat `exp` (kalau ada)
 *
 * Return true HANYA kalau header `Authorization: Bearer <token>` valid.
 */
export function isAuthorized(authHeader: string | string[] | undefined, secret: string): boolean {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header || !header.startsWith('Bearer ')) return false;

  const token = header.slice('Bearer '.length).trim();
  return verifyHs256(token, secret);
}

function verifyHs256(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  // 1. Header harus deklarasi HS256 — tolak `none`/RS256 dsb (alg-confusion).
  const head = decodeJson(headerB64);
  if (!head || head['typ'] !== 'JWT' || head['alg'] !== 'HS256') return false;

  // 2. Tanda tangan harus cocok (constant-time).
  const expected = createHmac('sha256', secret).update(`${headerB64}.${payloadB64}`).digest();
  const given = base64UrlToBuffer(signatureB64);
  if (!given || given.length !== expected.length) return false;
  if (!timingSafeEqual(given, expected)) return false;

  // 3. Masa berlaku (jwt `exp` dalam detik sejak epoch).
  const payload = decodeJson(payloadB64);
  if (!payload) return false;
  if (typeof payload['exp'] === 'number' && payload['exp'] * 1000 <= currentTimeMs()) {
    return false;
  }

  return true;
}

function decodeJson(segment: string): Record<string, unknown> | null {
  const buf = base64UrlToBuffer(segment);
  if (!buf) return null;
  try {
    const parsed: unknown = JSON.parse(buf.toString('utf8'));
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function base64UrlToBuffer(value: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  return Buffer.from(value, 'base64url');
}

// Dipisah agar gampang di-mock saat test masa-berlaku token.
function currentTimeMs(): number {
  return Date.now();
}
