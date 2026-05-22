/**
 * PostGIS-backed zona intersection. Pakai raw SQL via Prisma karena Geometry
 * column gak first-class di Prisma schema.
 *
 * Auto-fallback ke mock kalau:
 * - DB tidak available, atau
 * - Tabel rdtr_poly kosong (belum di-import shapefile)
 */
import type { PrismaClient } from '@sipera/data-access';
import type { Polygon } from './mock-zona.js';
import { intersectZona as intersectMock, type MockZona } from './mock-zona.js';

export interface PostgisZonaService {
  intersect(polygon: Polygon): Promise<MockZona[]>;
  isUsingRealData(): Promise<boolean>;
}

interface RawZonaRow {
  id: number;
  zona_code: string;
  zona_name: string;
  bbox: string;
}

export class HybridZonaService implements PostgisZonaService {
  private dataAvailable: boolean | null = null;

  constructor(private readonly prisma: PrismaClient | null) {}

  async isUsingRealData(): Promise<boolean> {
    if (this.dataAvailable !== null) return this.dataAvailable;
    if (!this.prisma) {
      this.dataAvailable = false;
      return false;
    }
    try {
      const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM rdtr_poly
      `;
      const count = Number(rows[0]?.count ?? 0);
      this.dataAvailable = count > 0;
      return this.dataAvailable;
    } catch {
      this.dataAvailable = false;
      return false;
    }
  }

  async intersect(polygon: Polygon): Promise<MockZona[]> {
    const useReal = await this.isUsingRealData();
    if (!useReal || !this.prisma) {
      return intersectMock(polygon);
    }

    // Build GeoJSON polygon string
    if (polygon.coordinates.length < 3) return [];
    // Auto-close ring jika belum
    const ring = [...polygon.coordinates];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
      ring.push(first);
    }
    const geojson = JSON.stringify({ type: 'Polygon', coordinates: [ring] });

    try {
      const rows = await this.prisma.$queryRaw<RawZonaRow[]>`
        SELECT
          id,
          zona_code,
          zona_name,
          ST_AsGeoJSON(ST_Envelope(ST_Collect(geom))) as bbox
        FROM rdtr_poly
        WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326))
        GROUP BY id, zona_code, zona_name
      `;

      return rows.map((r) => {
        const bbox = parseBboxFromGeoJson(r.bbox);
        return {
          id: r.id,
          code: r.zona_code,
          name: r.zona_name,
          bbox,
        };
      });
    } catch (err) {
      console.warn('[spatial] postgis query failed, falling back to mock:', err);
      return intersectMock(polygon);
    }
  }

  /** Untuk testing/dev: force refresh cache flag. */
  invalidateCache(): void {
    this.dataAvailable = null;
  }
}

function parseBboxFromGeoJson(geojson: string): [number, number, number, number] {
  try {
    const g = JSON.parse(geojson) as { coordinates: [number, number][][] };
    const ring = g.coordinates[0];
    if (!ring || ring.length === 0) return [0, 0, 0, 0];
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [minLng, minLat, maxLng, maxLat];
  } catch {
    return [0, 0, 0, 0];
  }
}
