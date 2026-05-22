import { describe, expect, it } from 'vitest';
import { HybridZonaService } from './postgis-zona.js';

describe('HybridZonaService (no prisma → mock fallback)', () => {
  it('returns false for isUsingRealData when prisma null', async () => {
    const s = new HybridZonaService(null);
    expect(await s.isUsingRealData()).toBe(false);
  });

  it('falls back to mock intersect when prisma null', async () => {
    const s = new HybridZonaService(null);
    const result = await s.intersect({
      coordinates: [
        [107.55, -6.95],
        [107.56, -6.95],
        [107.56, -6.94],
        [107.55, -6.94],
      ],
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.code).toBeTruthy();
  });

  it('rejects polygon < 3 points', async () => {
    const s = new HybridZonaService(null);
    expect(await s.intersect({ coordinates: [[107.6, -6.9]] })).toHaveLength(0);
  });
});
