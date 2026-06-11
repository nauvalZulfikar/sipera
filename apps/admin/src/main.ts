import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { SettingsStore } from './settings.js';
import { AuditStore } from './audit.js';

const setSchema = z.object({ value: z.string().min(1).max(1000) });
const auditSchema = z.object({
  actor: z.string(),
  action: z.string(),
  resource: z.string(),
  ip: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const settings = new SettingsStore(process.env.SETTINGS_FILE ?? './.data/settings.json');
  const audit = new AuditStore(Number(process.env.AUDIT_MAX ?? 10000));

  app.get('/_health', () => ({ status: 'ok', service: 'admin' }));

  // Settings
  app.get('/settings', async () => ({ data: await settings.list() }));

  app.get<{ Params: { key: string } }>('/settings/:key', async (req, reply) => {
    const s = await settings.get(req.params.key);
    if (!s) {
      reply.code(404);
      return { error: 'not_found' };
    }
    return s;
  });

  app.put<{ Params: { key: string } }>('/settings/:key', async (req, reply) => {
    const parsed = setSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const actor = String(req.headers['x-user'] ?? 'unknown');
    const s = await settings.set(req.params.key, parsed.data.value, actor);
    audit.log({
      actor,
      action: 'setting.update',
      resource: `setting/${req.params.key}`,
      meta: { value: parsed.data.value },
    });
    return s;
  });

  // Audit log
  app.post('/audit', async (req, reply) => {
    const parsed = auditSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error' };
    }
    const e = audit.log({
      actor: parsed.data.actor,
      action: parsed.data.action,
      resource: parsed.data.resource,
      ...(parsed.data.ip ? { ip: parsed.data.ip } : {}),
      ...(parsed.data.meta ? { meta: parsed.data.meta } : {}),
    });
    reply.code(201);
    return e;
  });

  app.get('/audit', (req) => {
    const q = req.query as Record<string, string>;
    return {
      data: audit.query({
        ...(q.actor ? { actor: q.actor } : {}),
        ...(q.action ? { action: q.action } : {}),
        ...(q.resource ? { resource: q.resource } : {}),
        ...(q.from ? { from: q.from } : {}),
        ...(q.to ? { to: q.to } : {}),
        ...(q.limit ? { limit: Number(q.limit) } : {}),
      }),
      total: audit.count(),
    };
  });

  const port = Number(process.env.PORT ?? 4013);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'admin module listening');
}

main().catch((err: unknown) => {
  console.error('admin startup failed:', err);
  process.exit(1);
});
