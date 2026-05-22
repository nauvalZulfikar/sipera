import Fastify from 'fastify';
import cors from '@fastify/cors';
import { randomUUID } from 'node:crypto';
import { getPrisma, DokumenPendukungRepository } from '@sipera/data-access';
import { LocalFileStorage } from './storage/storage.js';
import { renderKrkHtml, type KrkData } from './pdf/krk-renderer.js';
import { renderKrkPdf } from './pdf/krk-pdf.js';
import { registerDokumenRoutes } from './dokumen-pendukung/routes.js';

async function main() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 50 * 1024 * 1024,
  });
  await app.register(cors, { origin: true });

  // Raw buffer parser for file upload
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error);
    }
  });

  const storage = new LocalFileStorage(process.env.STORAGE_ROOT ?? './.storage');
  app.log.info({ storage: storage.name }, 'storage backend');

  app.get('/_health', () => ({ status: 'ok', service: 'document' }));

  // Upload file
  app.post('/files', async (req, reply) => {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      reply.code(400);
      return { error: 'empty_body' };
    }
    const mime = req.headers['content-type'] ?? 'application/octet-stream';
    const key = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.bin`;
    const stored = await storage.put(
      key,
      body,
      String(mime).split(';')[0] ?? 'application/octet-stream',
    );
    reply.code(201);
    return stored;
  });

  // Download file
  app.get<{ Params: { '*': string } }>('/files/*', async (req, reply) => {
    const key = req.params['*'];
    const meta = await storage.stat(key);
    if (!meta) {
      reply.code(404);
      return { error: 'not_found' };
    }
    const data = await storage.get(key);
    if (!data) {
      reply.code(404);
      return { error: 'not_found' };
    }
    reply.header('content-type', meta.mimeType);
    reply.header('content-length', meta.size);
    reply.header('x-sha256', meta.sha256);
    return data;
  });

  // Generate PDF/HTML KRK
  app.post('/krk/render', async (req, reply) => {
    const data = req.body as KrkData;
    if (!data || !data.nomorPermohonan) {
      reply.code(400);
      return { error: 'invalid_payload' };
    }
    const html = renderKrkHtml(data);
    const key = `krk/${data.nomorPermohonan}.html`;
    await storage.put(key, Buffer.from(html), 'text/html');
    reply.header('x-rendered-key', key);
    reply.header('content-type', 'text/html');
    return html;
  });

  app.get<{ Params: { nomor: string } }>('/krk/:nomor', async (req, reply) => {
    const data = await storage.get(`krk/${req.params.nomor}.html`);
    if (!data) {
      reply.code(404);
      return { error: 'not_found' };
    }
    reply.header('content-type', 'text/html');
    return data;
  });

  // Phase B1: dokumen pendukung CRUD per-permohonan (butuh DB)
  if (process.env.ENABLE_DOKUMEN_PENDUKUNG !== 'false') {
    try {
      const prisma = getPrisma();
      const repo = new DokumenPendukungRepository(prisma);
      registerDokumenRoutes(app, { repo, storage });
      app.log.info('dokumen-pendukung routes registered');
    } catch (err) {
      app.log.warn({ err }, 'dokumen-pendukung routes skipped (DB not available)');
    }
  }

  // Phase B2: PDF KRK styled (pdfkit)
  app.post<{ Body: KrkData }>('/krk/pdf', async (req, reply) => {
    const data = req.body;
    if (!data?.nomorPermohonan) {
      reply.code(400);
      return { error: 'invalid_payload' };
    }
    const pdfBuf = await renderKrkPdf(data);
    const key = `krk/${data.nomorPermohonan}.pdf`;
    await storage.put(key, pdfBuf, 'application/pdf');
    reply.header('x-rendered-key', key);
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="KRK-${data.nomorPermohonan}.pdf"`);
    return pdfBuf;
  });

  app.get<{ Params: { nomor: string } }>('/krk/pdf/:nomor', async (req, reply) => {
    const data = await storage.get(`krk/${req.params.nomor}.pdf`);
    if (!data) {
      reply.code(404);
      return { error: 'not_found' };
    }
    reply.header('content-type', 'application/pdf');
    reply.header('content-disposition', `inline; filename="KRK-${req.params.nomor}.pdf"`);
    return data;
  });

  const port = Number(process.env.PORT ?? 4006);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'document module listening');
}

main().catch((err: unknown) => {
  console.error('document startup failed:', err);
  process.exit(1);
});
