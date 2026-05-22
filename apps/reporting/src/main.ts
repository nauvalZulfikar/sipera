import Fastify from 'fastify';
import cors from '@fastify/cors';
import { summarize, toCsv, type PermohonanLike } from './aggregations.js';

const PERMOHONAN_URL = process.env.PERMOHONAN_URL ?? 'http://localhost:4009';

async function fetchPermohonan(): Promise<PermohonanLike[]> {
  const res = await fetch(`${PERMOHONAN_URL}/permohonan`);
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const json = (await res.json()) as { data: PermohonanLike[] };
  return json.data;
}

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  app.get('/_health', () => ({ status: 'ok', service: 'reporting' }));

  app.get('/reports/summary', async (_req, reply) => {
    try {
      const list = await fetchPermohonan();
      return summarize(list);
    } catch (err) {
      reply.code(502);
      return { error: 'upstream_failed', message: err instanceof Error ? err.message : 'unknown' };
    }
  });

  app.get('/reports/export.csv', async (_req, reply) => {
    try {
      const list = await fetchPermohonan();
      const csv = toCsv(list);
      reply.header('content-type', 'text/csv; charset=utf-8');
      reply.header('content-disposition', 'attachment; filename="permohonan.csv"');
      return csv;
    } catch (err) {
      reply.code(502);
      return { error: 'upstream_failed', message: err instanceof Error ? err.message : 'unknown' };
    }
  });

  const port = Number(process.env.PORT ?? 4012);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'reporting module listening');
}

main().catch((err: unknown) => {
  console.error('reporting startup failed:', err);
  process.exit(1);
});
