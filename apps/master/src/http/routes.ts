import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { WilayahService } from '../wilayah/wilayah.service.js';
import type { KbliService } from '../kbli/kbli.service.js';

export interface RouteDeps {
  wilayah: WilayahService;
  kbli: KbliService;
}

const idParam = z.object({ id: z.coerce.number().int().positive() });
const upsertKbliSchema = z.object({
  kode: z.string().min(2).max(10),
  judul: z.string().min(1).max(255),
});

export function registerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  app.get('/_health', () => ({ status: 'ok', service: 'master' }));

  // Wilayah (kecamatan + kelurahan)
  app.get('/wilayah/kecamatan', async (req) => {
    const cityId = Number((req.query as Record<string, string>).city_id ?? 1);
    return deps.wilayah.listKecamatan(cityId);
  });

  app.get<{ Params: { kecamatanId: string } }>(
    '/wilayah/kecamatan/:kecamatanId/desa',
    async (req) => {
      const id = Number(req.params.kecamatanId);
      return deps.wilayah.listKelurahan(id);
    },
  );

  // KBLI
  app.get('/kbli', async (req) => {
    const q = req.query as Record<string, string>;
    return deps.kbli.list({
      ...(q.search ? { search: q.search } : {}),
      ...(q.page ? { page: Number(q.page) } : {}),
      ...(q.per_page ? { perPage: Number(q.per_page) } : {}),
    });
  });

  app.get<{ Params: { id: string } }>('/kbli/:id', async (req, reply) => {
    const parsed = idParam.safeParse(req.params);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid_id' };
    }
    // We're looking up by kode-string vendor-style; for numeric id use repository directly.
    const kode = req.params.id;
    const r = await deps.kbli.findByKode(kode);
    if (!r) {
      reply.code(404);
      return { error: 'not_found' };
    }
    return r;
  });

  app.post('/kbli', async (req, reply) => {
    const parsed = upsertKbliSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    reply.code(201);
    return deps.kbli.upsert(parsed.data.kode, parsed.data.judul);
  });

  app.post('/kbli/bulk-import', async (req, reply) => {
    const body = req.body as { csv?: string };
    if (!body.csv) {
      reply.code(400);
      return { error: 'csv_required' };
    }
    return deps.kbli.bulkImportCsv(body.csv);
  });
}
