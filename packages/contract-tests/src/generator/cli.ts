import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Recording } from '../recorder/types.js';

const INPUT_DIR = process.env.GEN_INPUT ?? './recordings/raw';
const OUTPUT_DIR = process.env.GEN_OUTPUT ?? './generated';

type Bucket = Map<string, Recording[]>;

function bucketByEndpoint(recs: Recording[]): Bucket {
  const m: Bucket = new Map();
  for (const r of recs) {
    const key = `${r.request.method} ${normalizePath(r.request.path)}`;
    const arr = m.get(key) ?? [];
    arr.push(r);
    m.set(key, arr);
  }
  return m;
}

/** Generalize numeric IDs in path to :id for grouping similar endpoints. */
function normalizePath(path: string): string {
  return path.replace(/\/\d+/g, '/:id').replace(/\/[0-9a-f-]{32,36}/gi, '/:uuid');
}

function moduleFromPath(path: string): string {
  const seg = path.split('/').filter(Boolean)[0] ?? 'root';
  return seg.replace(/[^a-z0-9]/gi, '-');
}

function generateSpec(endpoint: string, recordings: Recording[]): string {
  const sample = recordings[0];
  if (!sample) return '';
  const target = process.env.TARGET_BASE_URL ?? 'http://localhost:3001';

  const cases = recordings.slice(0, 20).map((r, i) => {
    const reqBody = r.request.body === null ? 'undefined' : JSON.stringify(r.request.body, null, 2);
    const expectedStatus = r.response.status;
    return `  it('case ${i + 1}: returns ${expectedStatus}', async () => {
    const res = await fetch('${target}${r.request.path}', {
      method: '${r.request.method}',
      headers: { 'content-type': 'application/json' },
      ${r.request.body !== null ? `body: JSON.stringify(${reqBody}),` : ''}
    });
    expect(res.status).toBe(${expectedStatus});
  });`;
  });

  return `import { describe, it, expect } from 'vitest';

// AUTO-GENERATED from ${recordings.length} recording(s) — do not hand-edit.
// Endpoint: ${endpoint}

describe('contract: ${endpoint}', () => {
${cases.join('\n\n')}
});
`;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  let files: string[];
  try {
    files = (await readdir(INPUT_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    console.warn(`[gen] no recordings found in ${INPUT_DIR} — nothing to do`);
    return;
  }

  const recordings: Recording[] = [];
  for (const f of files) {
    const raw = await readFile(join(INPUT_DIR, f), 'utf8');
    recordings.push(JSON.parse(raw) as Recording);
  }

  const buckets = bucketByEndpoint(recordings);
  const moduleFiles: Map<string, string[]> = new Map();

  for (const [endpoint, recs] of buckets) {
    const path = endpoint.split(' ')[1] ?? '/';
    const mod = moduleFromPath(path);
    const safeName = endpoint
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const content = generateSpec(endpoint, recs);
    const arr = moduleFiles.get(mod) ?? [];
    arr.push(safeName);
    moduleFiles.set(mod, arr);
    await mkdir(join(OUTPUT_DIR, mod), { recursive: true });
    await writeFile(join(OUTPUT_DIR, mod, `${safeName}.contract.spec.ts`), content);
  }

  let total = 0;
  for (const recs of buckets.values()) total += recs.length;
  console.log(
    `[gen] ${files.length} recordings → ${buckets.size} endpoints → ${moduleFiles.size} modules (avg ${(total / buckets.size).toFixed(1)} cases/endpoint)`,
  );
}

await main();
