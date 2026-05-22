import { describe, expect, it } from 'vitest';
import { intersectZona, MOCK_ZONA, type Polygon } from './mock-zona.js';
import { checkItbx, checkMultiple, summarizeDecision } from './itbx.js';

describe('intersectZona', () => {
  it('finds zona that overlaps polygon bbox', () => {
    const polygon: Polygon = {
      coordinates: [
        [107.55, -6.95],
        [107.56, -6.95],
        [107.56, -6.94],
        [107.55, -6.94],
      ],
    };
    const out = intersectZona(polygon);
    expect(out.length).toBeGreaterThan(0);
    expect(out.find((z) => z.code === 'R-1')).toBeDefined();
  });

  it('returns empty for polygon outside Bandung', () => {
    const polygon: Polygon = {
      coordinates: [
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
      ],
    };
    expect(intersectZona(polygon)).toHaveLength(0);
  });

  it('rejects degenerate polygon (<3 points)', () => {
    expect(intersectZona({ coordinates: [[107.6, -6.9]] })).toHaveLength(0);
  });
});

describe('checkItbx', () => {
  it('konstruksi rumah di zona perumahan = Diizinkan', () => {
    expect(checkItbx('R-2', '41011')).toBe('I');
  });

  it('industri kimia di perumahan = X', () => {
    expect(checkItbx('R-1', '20111')).toBe('X');
  });

  it('warung makan di zona komersial = I', () => {
    expect(checkItbx('K-2', '56101')).toBe('I');
  });

  it('semua aktivitas di RTH = X', () => {
    expect(checkItbx('RTH-1', '41011')).toBe('X');
    expect(checkItbx('RTH-2', '47111')).toBe('X');
  });

  it('toko eceran di perumahan = T (terbatas)', () => {
    expect(checkItbx('R-3', '47211')).toBe('T');
  });

  it('default fallback = B (bersyarat) untuk kombinasi tak terdaftar', () => {
    expect(checkItbx('XX-99', '99999')).toBe('B');
  });
});

describe('summarizeDecision', () => {
  it('APPROVE jika semua diizinkan', () => {
    const r = checkMultiple(['R-2', 'K-1'], ['41011']);
    const d = summarizeDecision(r);
    expect(d.decision).toBe('APPROVE');
  });

  it('REJECT jika ada satu X', () => {
    const r = checkMultiple(['R-2', 'RTH-1'], ['41011']);
    const d = summarizeDecision(r);
    expect(d.decision).toBe('REJECT');
    expect(d.reasoning).toContain('RTH-1');
  });

  it('CONDITIONAL jika ada T/B tanpa X', () => {
    const r = checkMultiple(['R-2'], ['47111']);
    const d = summarizeDecision(r);
    expect(d.decision).toBe('CONDITIONAL');
  });
});

describe('MOCK_ZONA', () => {
  it('memiliki beragam tipe zona', () => {
    const codes = MOCK_ZONA.map((z) => z.code);
    expect(codes.some((c) => c.startsWith('R-'))).toBe(true);
    expect(codes.some((c) => c.startsWith('K-'))).toBe(true);
    expect(codes.some((c) => c.startsWith('I-'))).toBe(true);
    expect(codes.some((c) => c.startsWith('RTH-'))).toBe(true);
  });
});
