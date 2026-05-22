import { open as openShapefile } from 'shapefile';
import { Client } from 'pg';

/**
 * Generic shapefile → PostGIS importer.
 *
 * Usage (CLI):
 *   tsx src/importer/cli.ts --file rdtr-bandung.shp --table rdtr_poly \\
 *     --zona-field ZONA_CODE --name-field ZONA_NAME --source bappeda-2024
 *
 * Schema target:
 *   CREATE TABLE rdtr_poly (
 *     id SERIAL PRIMARY KEY,
 *     zona_code VARCHAR(20) NOT NULL,
 *     zona_name VARCHAR(255) NOT NULL,
 *     source_dataset VARCHAR(100),
 *     meta TEXT,
 *     geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
 *     created_at TIMESTAMP DEFAULT NOW(),
 *     updated_at TIMESTAMP DEFAULT NOW()
 *   );
 *   CREATE INDEX rdtr_poly_geom_idx ON rdtr_poly USING GIST(geom);
 *   CREATE INDEX rdtr_poly_zona_idx ON rdtr_poly (zona_code);
 */

export interface ImportOptions {
  shpPath: string;
  databaseUrl: string;
  tableName: string;
  zonaCodeField: string;
  zonaNameField: string;
  sourceDataset: string;
  /** Truncate table dulu sebelum import. */
  truncate?: boolean;
  /** Batch size insert. Default 500. */
  batchSize?: number;
}

export interface ImportResult {
  totalFeatures: number;
  inserted: number;
  skipped: number;
  errors: { feature: number; reason: string }[];
  durationMs: number;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

export async function importShapefile(opts: ImportOptions): Promise<ImportResult> {
  const start = Date.now();
  const client = new Client({ connectionString: opts.databaseUrl });
  await client.connect();
  try {
    // Pastikan tabel + PostGIS extension ready
    await ensureSchema(client, opts.tableName);

    if (opts.truncate) {
      await client.query(`TRUNCATE TABLE ${opts.tableName}`);
    }

    let totalFeatures = 0;
    let inserted = 0;
    let skipped = 0;
    const errors: { feature: number; reason: string }[] = [];
    const batch: { code: string; name: string; geojson: string }[] = [];
    const batchSize = opts.batchSize ?? 500;

    const source = await openShapefile(opts.shpPath);
    while (true) {
      const result = (await source.read()) as { done: boolean; value: GeoJsonFeature | null };
      if (result.done) break;
      totalFeatures++;
      const feature = result.value;
      if (!feature || !feature.geometry) {
        skipped++;
        continue;
      }
      const props = feature.properties;
      const code = String(props[opts.zonaCodeField] ?? '').trim();
      const name = String(props[opts.zonaNameField] ?? code).trim();
      if (!code) {
        errors.push({ feature: totalFeatures, reason: `missing field "${opts.zonaCodeField}"` });
        skipped++;
        continue;
      }
      // PostGIS dapat GeoJSON via ST_GeomFromGeoJSON, supports Polygon/MultiPolygon
      batch.push({ code, name, geojson: JSON.stringify(feature.geometry) });
      if (batch.length >= batchSize) {
        inserted += await flushBatch(client, opts.tableName, batch, opts.sourceDataset);
        batch.length = 0;
      }
    }
    if (batch.length > 0) {
      inserted += await flushBatch(client, opts.tableName, batch, opts.sourceDataset);
    }

    return { totalFeatures, inserted, skipped, errors, durationMs: Date.now() - start };
  } finally {
    await client.end();
  }
}

async function ensureSchema(client: Client, tableName: string): Promise<void> {
  await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${tableName} (
      id SERIAL PRIMARY KEY,
      zona_code VARCHAR(20) NOT NULL,
      zona_name VARCHAR(255) NOT NULL,
      source_dataset VARCHAR(100),
      meta TEXT,
      geom GEOMETRY(MultiPolygon, 4326),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${tableName}_geom_idx ON ${tableName} USING GIST(geom)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${tableName}_zona_idx ON ${tableName} (zona_code)`,
  );
}

async function flushBatch(
  client: Client,
  tableName: string,
  batch: { code: string; name: string; geojson: string }[],
  source: string,
): Promise<number> {
  if (batch.length === 0) return 0;
  // Single multi-row insert dengan ST_Multi(ST_GeomFromGeoJSON())
  const values: string[] = [];
  const params: unknown[] = [];
  batch.forEach((b, i) => {
    const off = i * 4;
    values.push(
      `($${off + 1}, $${off + 2}, $${off + 3}, ST_Multi(ST_GeomFromGeoJSON($${off + 4})))`,
    );
    params.push(b.code, b.name, source, b.geojson);
  });
  const sql = `INSERT INTO ${tableName} (zona_code, zona_name, source_dataset, geom) VALUES ${values.join(',')}`;
  await client.query(sql, params);
  return batch.length;
}
