/**
 * Mock zona data. Replace dengan PostGIS query saat shapefile RDTR dari Bappeda dapet.
 * Untuk dev: hardcoded polygon di Bandung dengan zona berbeda.
 */

export interface MockZona {
  id: number;
  code: string;
  name: string;
  /** Bounding box [minLng, minLat, maxLng, maxLat] (WGS84) */
  bbox: [number, number, number, number];
}

/** Bandung area: ~107.5–107.7 lng, -7.0 to -6.85 lat. */
export const MOCK_ZONA: MockZona[] = [
  // Perumahan
  { id: 1, code: 'R-1', name: 'Perumahan Kepadatan Tinggi', bbox: [107.55, -6.95, 107.6, -6.9] },
  { id: 2, code: 'R-2', name: 'Perumahan Kepadatan Sedang', bbox: [107.6, -6.95, 107.65, -6.9] },
  { id: 3, code: 'R-3', name: 'Perumahan Kepadatan Rendah', bbox: [107.65, -6.95, 107.7, -6.9] },
  // Komersial
  { id: 10, code: 'K-1', name: 'Perdagangan Skala Kota', bbox: [107.6, -6.92, 107.62, -6.9] }, // pusat kota
  { id: 11, code: 'K-2', name: 'Perdagangan Skala BWK', bbox: [107.58, -6.95, 107.6, -6.92] },
  {
    id: 12,
    code: 'K-3',
    name: 'Perdagangan Skala Lingkungan',
    bbox: [107.62, -6.97, 107.65, -6.95],
  },
  // Industri
  { id: 20, code: 'I-1', name: 'Industri Kecil', bbox: [107.55, -7.0, 107.6, -6.98] },
  { id: 21, code: 'I-2', name: 'Industri Sedang', bbox: [107.5, -7.0, 107.55, -6.98] },
  // RTH
  { id: 30, code: 'RTH-1', name: 'Taman Kota', bbox: [107.605, -6.91, 107.615, -6.905] }, // sample tiny
  { id: 31, code: 'RTH-2', name: 'Taman Lingkungan', bbox: [107.66, -6.93, 107.665, -6.925] },
  // Pertanian
  { id: 40, code: 'P-1', name: 'Sawah', bbox: [107.68, -6.97, 107.7, -6.95] },
  // SPU
  { id: 50, code: 'SPU-1', name: 'Pendidikan', bbox: [107.59, -6.93, 107.6, -6.92] },
  { id: 51, code: 'SPU-2', name: 'Kesehatan', bbox: [107.61, -6.95, 107.62, -6.94] },
];

export interface Polygon {
  /** Array koordinat [[lng, lat], ...] */
  coordinates: [number, number][];
}

/** Intersect polygon dengan zona via bbox overlap (simplification — production: ST_Intersects). */
export function intersectZona(polygon: Polygon): MockZona[] {
  if (polygon.coordinates.length < 3) return [];
  const [minLng, minLat, maxLng, maxLat] = computeBbox(polygon.coordinates);
  return MOCK_ZONA.filter((z) => bboxOverlap(z.bbox, [minLng, minLat, maxLng, maxLat]));
}

export function getZonaByCode(code: string): MockZona | undefined {
  return MOCK_ZONA.find((z) => z.code === code);
}

function computeBbox(coords: [number, number][]): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

function bboxOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean {
  return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}
