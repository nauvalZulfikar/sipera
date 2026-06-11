import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import type { DokumenPendukungRepository } from '@sipera/data-access';
import { DOKUMEN_SLOTS, type DokumenSlot } from '@sipera/data-access';
import type { FileStorage } from '../storage/storage.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface DokumenRouteDeps {
  repo: DokumenPendukungRepository;
  storage: FileStorage;
}

export function registerDokumenRoutes(app: FastifyInstance, deps: DokumenRouteDeps): void {
  /**
   * Upload dokumen pendukung untuk satu permohonan + slot tertentu.
   * Body: raw bytes (Content-Type sesuai file).
   * Header X-Slot: KTP/KK/SHM/NIB_OSS/dst.
   * Header X-FileName: nama file asli.
   * Query ?replacesId=NNN: untuk revisi (versi pengganti).
   */
  app.post<{ Params: { permohonanId: string } }>(
    '/permohonan/:permohonanId/dokumen',
    async (req, reply) => {
      const slot = String(req.headers['x-slot'] ?? '').toUpperCase();
      if (!DOKUMEN_SLOTS.includes(slot as DokumenSlot)) {
        reply.code(400);
        return { error: 'invalid_slot', allowed: DOKUMEN_SLOTS };
      }

      const body = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) {
        reply.code(400);
        return { error: 'empty_body' };
      }
      if (body.length > MAX_SIZE_BYTES) {
        reply.code(413);
        return { error: 'too_large', maxBytes: MAX_SIZE_BYTES };
      }

      const mime = String(req.headers['content-type'] ?? 'application/octet-stream')
        .split(';')[0]!
        .trim()
        .toLowerCase();
      if (!ALLOWED_MIME.has(mime)) {
        reply.code(415);
        return { error: 'unsupported_media_type', allowed: [...ALLOWED_MIME] };
      }

      const fileName = String(req.headers['x-filename'] ?? `upload-${Date.now()}`);
      const storageKey = `permohonan/${req.params.permohonanId}/${slot}/${randomUUID()}`;
      const stored = await deps.storage.put(storageKey, body, mime);
      const replacesId = req.query ? Number((req.query as Record<string, string>).replacesId) : NaN;

      const row = await deps.repo.create({
        permohonanId: req.params.permohonanId,
        slot,
        fileName,
        storageKey: stored.key,
        mimeType: mime,
        sizeBytes: body.length,
        sha256: stored.sha256,
        uploadedBy: String(req.headers['x-user'] ?? 'unknown'),
        ...(Number.isInteger(replacesId) && replacesId > 0 ? { replacesId } : {}),
      });
      reply.code(201);
      return row;
    },
  );

  /**
   * List semua dokumen per permohonan. Default: latest per slot.
   * ?all=1 untuk dapet history lengkap.
   * ?slot=KTP untuk filter satu slot.
   */
  app.get<{ Params: { permohonanId: string } }>(
    '/permohonan/:permohonanId/dokumen',
    async (req) => {
      const q = req.query as { all?: string; slot?: string };
      if (q.all === '1') {
        return {
          data: await deps.repo.listByPermohonan(
            req.params.permohonanId,
            (q.slot as DokumenSlot | undefined) ?? undefined,
          ),
        };
      }
      return { data: await deps.repo.latestPerSlot(req.params.permohonanId) };
    },
  );

  /**
   * Download single dokumen by id.
   */
  app.get<{ Params: { id: string } }>('/dokumen/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const meta = await deps.repo.findById(id);
    if (!meta) {
      reply.code(404);
      return { error: 'not_found' };
    }
    const data = await deps.storage.get(meta.storageKey);
    if (!data) {
      reply.code(404);
      return { error: 'file_missing' };
    }
    // Integrity check
    const actualSha = createHash('sha256').update(data).digest('hex');
    if (actualSha !== meta.sha256) {
      reply.code(500);
      return { error: 'integrity_failed' };
    }
    reply.header('content-type', meta.mimeType);
    reply.header('content-length', meta.sizeBytes);
    reply.header('content-disposition', `attachment; filename="${meta.fileName}"`);
    reply.header('x-sha256', meta.sha256);
    return data;
  });

  /**
   * Delete dokumen by id.
   */
  app.delete<{ Params: { id: string } }>('/dokumen/:id', async (req, reply) => {
    const id = Number(req.params.id);
    const meta = await deps.repo.findById(id);
    if (!meta) {
      reply.code(404);
      return { error: 'not_found' };
    }
    await deps.storage.delete(meta.storageKey);
    await deps.repo.delete(id);
    reply.code(204);
    return null;
  });
}
