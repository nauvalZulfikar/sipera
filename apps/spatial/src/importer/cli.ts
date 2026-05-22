#!/usr/bin/env node
import { importShapefile, type ImportOptions } from './shapefile-importer.js';

function parseArgs(): ImportOptions & { help?: boolean } {
  const args = process.argv.slice(2);
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--truncate') {
      out.truncate = true;
      continue;
    }
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return {
    shpPath: String(out.file ?? ''),
    databaseUrl: String(out['database-url'] ?? process.env.DATABASE_URL ?? ''),
    tableName: String(out.table ?? 'rdtr_poly'),
    zonaCodeField: String(out['zona-field'] ?? 'ZONA'),
    zonaNameField: String(out['name-field'] ?? out['zona-field'] ?? 'ZONA'),
    sourceDataset: String(out.source ?? 'bappeda'),
    truncate: out.truncate === true,
    help: out.help === true,
  };
}

function printHelp(): void {
  console.log(`
Sipera RDTR Shapefile Importer
==============================

Usage:
  tsx src/importer/cli.ts --file <path/to/rdtr.shp> [options]

Required:
  --file <path>          Path ke file .shp (sibling .dbf, .prj wajib ada di folder yang sama)
  --database-url <url>   Postgres connection string (or env DATABASE_URL)

Options:
  --table <name>         Target table (default: rdtr_poly)
  --zona-field <field>   Atribut DBF buat kode zona (default: ZONA)
  --name-field <field>   Atribut DBF buat nama zona (default: same as zona-field)
  --source <id>          Identifier dataset (default: bappeda)
  --truncate             Hapus data lama dulu sebelum import
  --help                 Show this message

Example (after Bappeda kirim shapefile):
  DATABASE_URL="postgresql://sipera:sipera@localhost:5532/sipera" \\
    tsx src/importer/cli.ts \\
      --file ./rdtr-bandung-2024.shp \\
      --zona-field ZONA_CODE \\
      --name-field ZONA_NAME \\
      --source bappeda-2024 \\
      --truncate

Pre-flight check:
  - File harus shapefile (.shp + .dbf + .prj sibling)
  - SRS harus WGS84 (EPSG:4326) atau bakal di-reproject manual
  - PostGIS extension auto-installed kalau belum ada
  - Tabel + GIST index auto-created
`);
}

async function main(): Promise<void> {
  const opts = parseArgs();
  if (opts.help || !opts.shpPath || !opts.databaseUrl) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }

  console.log(`[import] file: ${opts.shpPath}`);
  console.log(`[import] table: ${opts.tableName}`);
  console.log(`[import] zona field: ${opts.zonaCodeField}`);
  console.log(`[import] truncate: ${opts.truncate ? 'yes' : 'no'}`);

  const result = await importShapefile(opts);
  console.log(`\n[import] DONE in ${result.durationMs}ms`);
  console.log(`  Total features: ${result.totalFeatures}`);
  console.log(`  Inserted:       ${result.inserted}`);
  console.log(`  Skipped:        ${result.skipped}`);
  if (result.errors.length > 0) {
    console.log(`  Errors:         ${result.errors.length}`);
    for (const e of result.errors.slice(0, 10)) {
      console.log(`    feature #${e.feature}: ${e.reason}`);
    }
  }
}

main().catch((err: unknown) => {
  console.error('import failed:', err);
  process.exit(1);
});
