import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { MOCK_ZONA } from './mock-zona.js';
import { summarizeDecision, ITBX_LABEL } from './itbx.js';
import { HybridZonaService } from './postgis-zona.js';
import { HybridItbxService } from './db-itbx.js';
import type { PrismaClient } from '@sipera/data-access';

const intersectSchema = z.object({
  polygon: z.object({
    coordinates: z
      .array(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]))
      .min(3),
  }),
  kbliCodes: z.array(z.string()).optional(),
});

const itbxRuleSchema = z.object({
  zonaPrefix: z.string().min(1).max(20),
  kbliPrefix: z.string().max(10),
  status: z.enum(['I', 'T', 'B', 'X']),
  catatan: z.string().optional(),
  priority: z.number().int().default(0),
});

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  // Lazy-load Prisma. Kalau DB gak available, fallback ke pure mock mode.
  let prisma: PrismaClient | null = null;
  try {
    const { getPrisma } = await import('@sipera/data-access');
    prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    app.log.warn('DB unavailable — running in pure-mock mode');
    prisma = null;
  }

  const zonaService = new HybridZonaService(prisma);
  const itbxService = new HybridItbxService(prisma);

  app.get('/_health', async () => {
    const realData = await zonaService.isUsingRealData();
    return {
      status: 'ok',
      service: 'spatial',
      mode: realData ? 'postgis' : 'mock',
    };
  });

  app.get('/zona', async () => {
    const realData = await zonaService.isUsingRealData();
    return {
      data: MOCK_ZONA,
      mode: realData ? 'postgis-available' : 'mock-only',
      note: realData
        ? 'Real RDTR data imported. Intersect endpoint uses PostGIS.'
        : 'Mock data — import shapefile via apps/spatial/src/importer/cli.ts',
    };
  });

  app.post('/intersect', async (req, reply) => {
    const parsed = intersectSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const zonas = await zonaService.intersect(parsed.data.polygon);

    type ItbxStatusLetter = 'I' | 'T' | 'B' | 'X';
    type ItbxResultExt = {
      zona: string;
      kbli: string;
      status: ItbxStatusLetter;
      label: string;
      catatan?: string;
    };
    let itbx: ItbxResultExt[] | undefined;
    let decision: ReturnType<typeof summarizeDecision> | undefined;

    if (parsed.data.kbliCodes && parsed.data.kbliCodes.length > 0) {
      itbx = [];
      for (const zona of zonas) {
        for (const kbli of parsed.data.kbliCodes) {
          const res = await itbxService.checkItbx(zona.code, kbli);
          itbx.push({
            zona: zona.code,
            kbli,
            status: res.status,
            label: res.label,
            ...(res.catatan ? { catatan: res.catatan } : {}),
          });
        }
      }
      decision = summarizeDecision(itbx);
    }

    return {
      zonas,
      ...(itbx ? { itbx } : {}),
      ...(decision ? { decision } : {}),
      source: (await zonaService.isUsingRealData()) ? 'postgis' : 'mock',
    };
  });

  app.get('/itbx-labels', () => ({ data: ITBX_LABEL }));

  // ITBX matrix admin endpoints
  app.get('/itbx/rules', async () => {
    return { data: await itbxService.listRules() };
  });

  app.post('/itbx/rules', async (req, reply) => {
    if (!prisma) {
      reply.code(503);
      return { error: 'db_unavailable' };
    }
    const parsed = itbxRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const actor = String(req.headers['x-user'] ?? 'admin');
    const row = await prisma.itbxMatrix.upsert({
      where: {
        zonaPrefix_kbliPrefix: {
          zonaPrefix: parsed.data.zonaPrefix,
          kbliPrefix: parsed.data.kbliPrefix,
        },
      },
      create: {
        zonaPrefix: parsed.data.zonaPrefix,
        kbliPrefix: parsed.data.kbliPrefix,
        status: parsed.data.status,
        ...(parsed.data.catatan ? { catatan: parsed.data.catatan } : {}),
        priority: parsed.data.priority,
        updatedBy: actor,
      },
      update: {
        status: parsed.data.status,
        ...(parsed.data.catatan ? { catatan: parsed.data.catatan } : {}),
        priority: parsed.data.priority,
        updatedBy: actor,
      },
    });
    itbxService.invalidateCache();
    reply.code(201);
    return row;
  });

  app.post('/itbx/seed', async (req, reply) => {
    const actor = String(req.headers['x-user'] ?? 'system');
    const result = await itbxService.seedFromStatic(actor);
    reply.code(201);
    return result;
  });

  const port = Number(process.env.PORT ?? 4008);
  await app.listen({ port, host: '0.0.0.0' });
  const realData = await zonaService.isUsingRealData();
  app.log.info(
    { port, mode: realData ? 'postgis' : 'mock' },
    `spatial module listening (${realData ? 'REAL DATA' : 'MOCK MODE'})`,
  );
}

main().catch((err: unknown) => {
  console.error('spatial startup failed:', err);
  process.exit(1);
});
