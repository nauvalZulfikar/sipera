/**
 * Bonus: bikin OpenAPI 3.1 spec dari recordings.
 * Setiap endpoint dapet contoh request + response.
 * Tim FE bisa pakai spec ini buat auto-gen TS client via openapi-typescript-codegen.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Recording } from '../recorder/types.js';

interface PathItem {
  [method: string]: {
    summary: string;
    requestBody?: {
      content: { 'application/json': { example: unknown } };
    };
    responses: {
      [status: string]: {
        description: string;
        content?: { 'application/json': { example: unknown } };
      };
    };
  };
}

export async function generateOpenApi(
  inputDir: string,
  outputFile: string,
  meta: { title: string; version: string } = { title: 'Sipera API', version: '1.0.0' },
): Promise<{ paths: number; endpoints: number }> {
  const files = (await readdir(inputDir)).filter((f) => f.endsWith('.json'));
  const recordings: Recording[] = [];
  for (const f of files) {
    const raw = await readFile(join(inputDir, f), 'utf8');
    recordings.push(JSON.parse(raw) as Recording);
  }

  const paths: Record<string, PathItem> = {};
  for (const r of recordings) {
    const path = normalizePath(r.request.path);
    const method = r.request.method.toLowerCase();
    if (!paths[path]) paths[path] = {};
    if (!paths[path][method]) {
      paths[path][method] = {
        summary: `${r.request.method} ${path}`,
        responses: {},
      };
    }
    const item = paths[path][method];
    if (r.request.body && !item.requestBody) {
      item.requestBody = { content: { 'application/json': { example: r.request.body } } };
    }
    const statusKey = String(r.response.status);
    if (!item.responses[statusKey]) {
      item.responses[statusKey] = {
        description: `HTTP ${statusKey}`,
        content: { 'application/json': { example: r.response.body } },
      };
    }
  }

  const spec = {
    openapi: '3.1.0',
    info: { title: meta.title, version: meta.version },
    paths,
  };
  await writeFile(outputFile, JSON.stringify(spec, null, 2));
  let endpointCount = 0;
  for (const p of Object.values(paths)) endpointCount += Object.keys(p).length;
  return { paths: Object.keys(paths).length, endpoints: endpointCount };
}

function normalizePath(path: string): string {
  return path.replace(/\/\d+/g, '/{id}').replace(/\/[0-9a-f-]{32,36}/gi, '/{uuid}');
}
