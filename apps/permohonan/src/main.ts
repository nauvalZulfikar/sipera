import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  getPrisma,
  PemohonRepository,
  KuasaRepository,
  PerusahaanRepository,
  LahanRepository,
  PenguasaanRepository,
  registerActivityLog,
} from '@sipera/data-access';
import { PermohonanService, InMemoryPermohonanRepo } from './permohonan.service.js';
import { EventBus } from './events/event-bus.js';
import { registerSubEntityRoutes } from './sub-entities/routes.js';
import { RevisiService, InMemoryRevisiRepo } from './revisi/revisi.service.js';

const createSchema = z.object({
  pemohonId: z.number().int().positive(),
  namaPemohon: z.string().min(1).max(255),
  jenisIzin: z.enum(['KKPR', 'PMP-UMKM']),
});

const actionSchema = z.object({
  action: z.enum([
    'mulai-verifikasi',
    'setujui',
    'tolak',
    'minta-revisi',
    'submit-revisi',
    'selesaikan',
    'expire',
  ]),
  catatan: z.string().optional(),
});

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const repo = new InMemoryPermohonanRepo();
  const bus = new EventBus();
  const svc = new PermohonanService(repo, bus);

  // Phase C2: auto-log every mutating request ke admin service
  registerActivityLog(app, { serviceName: 'permohonan' });

  // Phase C1: revisi orchestrator
  const revisiRepo = new InMemoryRevisiRepo();
  const revisiSvc = new RevisiService({
    repo: revisiRepo,
    triggerStateMachine: async (id, _catatan) => {
      const r = await svc.act(id, 'submit-revisi');
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    },
  });

  // Wire: emit setiap event ke Notification + Document + Audit services.
  const NOTIF_URL = process.env.NOTIFICATION_URL ?? 'http://localhost:4007';
  const DOC_URL = process.env.DOCUMENT_URL ?? 'http://localhost:4006';
  const ADMIN_URL = process.env.ADMIN_URL ?? 'http://localhost:4013';

  async function dispatchNotif(event: string, to: string, vars: Record<string, string>) {
    try {
      await fetch(`${NOTIF_URL}/dispatch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event,
          to,
          channels: ['sms', 'inapp'],
          variables: vars,
          locale: 'id',
        }),
      });
    } catch (err) {
      app.log.warn({ err }, 'notif dispatch failed');
    }
  }

  async function logAudit(actor: string, action: string, resource: string) {
    try {
      await fetch(`${ADMIN_URL}/audit`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actor, action, resource }),
      });
    } catch (err) {
      app.log.warn({ err }, 'audit log failed');
    }
  }

  type EventPayload = { nomor?: string; namaPemohon?: string; catatan?: string };
  function vars(p: EventPayload): Record<string, string> {
    return {
      nomorPermohonan: p.nomor ?? '',
      namaPemohon: p.namaPemohon ?? '',
      ...(p.catatan ? { catatanRevisi: p.catatan } : {}),
    };
  }

  bus.on<EventPayload>('PermohonanCreated', async (e) => {
    app.log.info({ event: e }, 'created');
    await dispatchNotif('permohonan.created', String(e.permohonanId), vars(e.payload));
    await logAudit('system', 'permohonan.create', `permohonan/${e.permohonanId}`);
  });
  bus.on<EventPayload>('PermohonanApproved', async (e) => {
    app.log.info({ event: e }, 'approved');
    await dispatchNotif('permohonan.approved', String(e.permohonanId), vars(e.payload));
    await logAudit('system', 'permohonan.approve', `permohonan/${e.permohonanId}`);
    // Trigger PDF KRK generation
    try {
      await fetch(`${DOC_URL}/krk/render`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nomorPermohonan: e.payload.nomor,
          namaPemohon: e.payload.namaPemohon,
          alamatPemohon: '-',
          jenisIzin: 'KKPR',
          lokasiLahan: '-',
          luasLahan: 0,
          zonaTerkait: [],
          kbliList: [],
          tanggalDisetujui: new Date().toLocaleDateString('id-ID'),
          ditandatanganiOleh: 'Kepala Dinas Tata Ruang',
        }),
      });
    } catch (err) {
      app.log.warn({ err }, 'PDF render failed');
    }
  });
  bus.on<EventPayload>('PermohonanRejected', async (e) => {
    await dispatchNotif('permohonan.rejected', String(e.permohonanId), vars(e.payload));
    await logAudit('system', 'permohonan.reject', `permohonan/${e.permohonanId}`);
  });
  bus.on<EventPayload>('PermohonanRevisiRequested', async (e) => {
    await dispatchNotif('permohonan.revisi', String(e.permohonanId), vars(e.payload));
    await logAudit('system', 'permohonan.revisi', `permohonan/${e.permohonanId}`);
  });

  app.get('/_health', () => ({ status: 'ok', service: 'permohonan' }));

  app.post('/permohonan', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const p = await svc.create(parsed.data);
    reply.code(201);
    return p;
  });

  app.get('/permohonan', async (req) => {
    const q = req.query as Record<string, string>;
    type Status =
      | 'Baru'
      | 'Verifikasi'
      | 'Revisi'
      | 'Disetujui'
      | 'Ditolak'
      | 'Selesai'
      | 'Kadaluarsa';
    const list = await svc.list({
      ...(q.status ? { status: q.status as Status } : {}),
      ...(q.pemohonId ? { pemohonId: Number(q.pemohonId) } : {}),
    });
    return { data: list };
  });

  app.get<{ Params: { id: string } }>('/permohonan/:id', async (req, reply) => {
    const p = await svc.findById(req.params.id);
    if (!p) {
      reply.code(404);
      return { error: 'not_found' };
    }
    return { ...p, availableActions: svc.availableActions(p.status) };
  });

  app.post<{ Params: { id: string } }>('/permohonan/:id/action', async (req, reply) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const result = await svc.act(req.params.id, parsed.data.action, {
      ...(parsed.data.catatan ? { catatan: parsed.data.catatan } : {}),
    });
    if (!result.ok) {
      reply.code(409);
      return { error: result.error };
    }
    return result.permohonan;
  });

  // Phase C1: revisi flow endpoints
  const revisiSubmitSchema = z.object({
    catatanPerbaikan: z.string().min(5).max(2000),
    replacementFiles: z
      .array(
        z.object({
          slot: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number().int().positive(),
          storageKey: z.string(),
          sha256: z.string(),
          replacesId: z.number().int().positive().optional(),
        }),
      )
      .min(1),
  });

  app.put<{ Params: { id: string } }>('/permohonan/:id/revisi', async (req, reply) => {
    const parsed = revisiSubmitSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const actor = String(req.headers['x-user'] ?? 'warga');
    const result = await revisiSvc.submitRevisi(
      { permohonanId: req.params.id, ...parsed.data },
      actor,
    );
    if (!result.ok) {
      reply.code(409);
      return { error: result.error };
    }
    return result;
  });

  app.get<{ Params: { id: string } }>('/permohonan/:id/revisi/history', async (req) => {
    return { data: await revisiSvc.listHistory(req.params.id) };
  });

  // Phase A2: register CRUD endpoints untuk sub-entities (pemohon/kuasa/perusahaan/lahan/penguasaan)
  if (process.env.ENABLE_SUB_ENTITIES !== 'false') {
    try {
      const prisma = getPrisma();
      registerSubEntityRoutes(app, {
        pemohon: new PemohonRepository(prisma),
        kuasa: new KuasaRepository(prisma),
        perusahaan: new PerusahaanRepository(prisma),
        lahan: new LahanRepository(prisma),
        penguasaan: new PenguasaanRepository(prisma),
        bus,
      });
      app.log.info('sub-entity routes registered');
    } catch (err) {
      app.log.warn({ err }, 'sub-entity routes skipped (DB not available)');
    }
  }

  // Scheduler: cek permohonan kadaluarsa setiap N detik (default 1 jam)
  const EXPIRE_DAYS = Number(process.env.EXPIRE_DAYS ?? 30);
  const SCHEDULER_INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS ?? 3600_000);

  async function expireStaleRequests() {
    const all = await svc.list();
    const now = Date.now();
    const cutoffMs = EXPIRE_DAYS * 86400_000;
    let expired = 0;
    for (const p of all) {
      const age = now - new Date(p.updatedAt).getTime();
      if (age > cutoffMs && !['Selesai', 'Ditolak', 'Kadaluarsa'].includes(p.status)) {
        const r = await svc.act(p.id, 'expire');
        if (r.ok) expired++;
      }
    }
    if (expired > 0) app.log.info({ expired }, 'auto-expired stale permohonan');
  }

  setInterval(() => {
    void expireStaleRequests().catch((err: unknown) => app.log.warn({ err }, 'scheduler error'));
  }, SCHEDULER_INTERVAL_MS);

  const port = Number(process.env.PORT ?? 4009);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port, expireDays: EXPIRE_DAYS }, 'permohonan module listening');
}

main().catch((err: unknown) => {
  console.error('permohonan startup failed:', err);
  process.exit(1);
});
