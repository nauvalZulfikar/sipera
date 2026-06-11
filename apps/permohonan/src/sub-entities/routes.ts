import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  PemohonRepository,
  KuasaRepository,
  PerusahaanRepository,
  LahanRepository,
  PenguasaanRepository,
} from '@sipera/data-access';
import type { EventBus } from '../events/event-bus.js';

const pemohonSchema = z.object({
  permohonanId: z.string().min(1),
  nama: z.string().min(1).max(255),
  nik: z.string().regex(/^\d{16}$/),
  npwp: z.string().optional(),
  email: z.string().email().optional(),
  noTelp: z.string().min(8).max(20),
  alamat: z.string().min(1),
  rt: z.string().max(10),
  rw: z.string().max(10),
  pekerjaan: z.string().optional(),
  kecamatanId: z.number().int().optional(),
  desaId: z.number().int().optional(),
  jenisPengajuan: z.enum(['langsung', 'dikuasakan']).default('langsung'),
});

const kuasaSchema = z.object({
  permohonanId: z.string().min(1),
  nama: z.string().min(1).max(255),
  nik: z.string().regex(/^\d{16}$/),
  alamat: z.string().min(1),
  noTelp: z.string().min(8).max(20),
  email: z.string().email().optional(),
  noSuratKuasa: z.string().optional(),
  fileSuratKuasa: z.string().optional(),
});

const perusahaanSchema = z.object({
  permohonanId: z.string().min(1),
  nama: z.string().min(1).max(255),
  npwp: z.string().optional(),
  nibOss: z.string().optional(),
  alamat: z.string().min(1),
  kbliKode: z.string().optional(),
  namaUsaha: z.string().optional(),
  jenisKepemilikan: z.string().optional(),
});

const lahanSchema = z.object({
  permohonanId: z.string().min(1),
  lokasi: z.string().min(1),
  rt: z.string().max(10),
  rw: z.string().max(10),
  kecamatanId: z.number().int().optional(),
  kelurahanId: z.number().int().optional(),
  luas: z.number().positive(),
  nomorSuratTanah: z.string().optional(),
  kondisiLahan: z.string().optional(),
  peruntukan: z.string().optional(),
  polygonGeojson: z.string().optional(),
});

const penguasaanSchema = z.object({
  permohonanId: z.string().min(1),
  jenisHak: z.string().min(1).max(50),
  nomorBukti: z.string().optional(),
  tanggalBukti: z.string().datetime().optional(),
  alamatPemilik: z.string().optional(),
  namaPemilik: z.string().optional(),
  kecamatanId: z.number().int().optional(),
  desaId: z.number().int().optional(),
});

export interface SubEntityDeps {
  pemohon: PemohonRepository;
  kuasa: KuasaRepository;
  perusahaan: PerusahaanRepository;
  lahan: LahanRepository;
  penguasaan: PenguasaanRepository;
  bus: EventBus;
}

/**
 * Generic factory to register CRUD + list-by-permohonan for one sub-entity.
 * Emits domain event `<EntityName>Created` / `Updated` / `Deleted` for downstream consumers.
 */
interface AnyRepo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(input: any): Promise<{ id: number }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(id: number, input: any): Promise<{ id: number }>;
  delete(id: number): Promise<void>;
  findById(id: number): Promise<unknown>;
  listByPermohonan(permohonanId: string): Promise<unknown[]>;
}

function registerSubEntity(
  app: FastifyInstance,
  basePath: string,
  schema: z.ZodTypeAny,
  repo: AnyRepo,
  bus: EventBus,
  entityName: string,
): void {
  app.post(basePath, async (req, reply) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const created = await repo.create(parsed.data);
    await bus.emit({
      type: 'PermohonanCreated', // reuse type space; consumers filter by payload
      permohonanId: (parsed.data as { permohonanId: string }).permohonanId,
      timestamp: new Date().toISOString(),
      payload: { entity: entityName, action: 'created', id: created.id },
    });
    reply.code(201);
    return created;
  });

  app.put<{ Params: { id: string } }>(`${basePath}/:id`, async (req, reply) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      reply.code(400);
      return { error: 'invalid_id' };
    }
    const existing = await repo.findById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'not_found' };
    }
    const updated = await repo.update(id, req.body);
    return updated;
  });

  app.delete<{ Params: { id: string } }>(`${basePath}/:id`, async (req, reply) => {
    const id = Number(req.params.id);
    const existing = await repo.findById(id);
    if (!existing) {
      reply.code(404);
      return { error: 'not_found' };
    }
    await repo.delete(id);
    reply.code(204);
    return null;
  });

  app.get<{ Params: { id: string } }>(`${basePath}/:id`, async (req, reply) => {
    const id = Number(req.params.id);
    const r = await repo.findById(id);
    if (!r) {
      reply.code(404);
      return { error: 'not_found' };
    }
    return r;
  });

  app.get<{ Params: { permohonanId: string } }>(
    `/permohonan/:permohonanId${basePath}`,
    async (req) => {
      return { data: await repo.listByPermohonan(req.params.permohonanId) };
    },
  );
}

export function registerSubEntityRoutes(app: FastifyInstance, deps: SubEntityDeps): void {
  registerSubEntity(app, '/pemohon', pemohonSchema, deps.pemohon, deps.bus, 'pemohon');
  registerSubEntity(app, '/kuasa', kuasaSchema, deps.kuasa, deps.bus, 'kuasa');
  registerSubEntity(app, '/perusahaan', perusahaanSchema, deps.perusahaan, deps.bus, 'perusahaan');
  registerSubEntity(app, '/lahan', lahanSchema, deps.lahan, deps.bus, 'lahan');
  registerSubEntity(app, '/penguasaan', penguasaanSchema, deps.penguasaan, deps.bus, 'penguasaan');
}
