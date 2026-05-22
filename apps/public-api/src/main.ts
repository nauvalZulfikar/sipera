import Fastify, { type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { OAuthStore, WebhookStore } from './oauth.js';

const tokenSchema = z.object({
  grant_type: z.literal('client_credentials'),
  client_id: z.string(),
  client_secret: z.string(),
});

const subSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

const clientRegSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
});

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const oauth = new OAuthStore();
  const webhooks = new WebhookStore();

  app.get('/_health', () => ({ status: 'ok', service: 'public-api' }));

  // OAuth client registration (di production: admin-only via dashboard developer)
  app.post('/v1/admin/clients', async (req, reply) => {
    const parsed = clientRegSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const c = oauth.registerClient(parsed.data.name, parsed.data.scopes);
    reply.code(201);
    return c;
  });

  // OAuth token endpoint (RFC 6749 §4.4)
  app.post('/v1/oauth/token', async (req, reply) => {
    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid_request' };
    }
    const t = oauth.issueToken(parsed.data.client_id, parsed.data.client_secret);
    if (!t) {
      reply.code(401);
      return { error: 'invalid_client' };
    }
    return {
      access_token: t.token,
      token_type: 'Bearer',
      expires_in: Math.floor((t.expiresAt - Date.now()) / 1000),
      scope: t.scopes.join(' '),
    };
  });

  // Require scope helper
  function requireScope(
    req: FastifyRequest,
    scope: string,
  ): { ok: true } | { ok: false; error: string } {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { ok: false, error: 'missing_token' };
    const token = auth.slice(7);
    const at = oauth.verifyToken(token, scope);
    if (!at) return { ok: false, error: 'invalid_or_insufficient_scope' };
    return { ok: true };
  }

  // Sample public endpoint: list permohonan
  app.get('/v1/permohonan', async (req, reply) => {
    const check = requireScope(req, 'permohonan:read');
    if (!check.ok) {
      reply.code(401);
      return { error: check.error };
    }
    // Proxy to permohonan service
    const upstream = process.env.PERMOHONAN_URL ?? 'http://localhost:4009';
    const res = await fetch(`${upstream}/permohonan`);
    return (await res.json()) as unknown;
  });

  // Webhook subscriptions
  app.post('/v1/webhooks', async (req, reply) => {
    const check = requireScope(req, 'webhook:manage');
    if (!check.ok) {
      reply.code(401);
      return { error: check.error };
    }
    const parsed = subSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error' };
    }
    const auth = req.headers.authorization!.slice(7);
    const at = oauth.verifyToken(auth)!;
    const sub = webhooks.subscribe(at.clientId, parsed.data.url, parsed.data.events);
    reply.code(201);
    return sub;
  });

  app.get('/v1/webhooks', async (req, reply) => {
    const check = requireScope(req, 'webhook:manage');
    if (!check.ok) {
      reply.code(401);
      return { error: check.error };
    }
    const auth = req.headers.authorization!.slice(7);
    const at = oauth.verifyToken(auth)!;
    return { data: webhooks.list(at.clientId) };
  });

  // Trigger webhook delivery (untuk demo / admin-side)
  app.post('/v1/admin/webhooks/trigger', async (req) => {
    const body = req.body as { event: string; payload: unknown };
    const r = await webhooks.deliver(body.event, body.payload);
    return r;
  });

  const port = Number(process.env.PORT ?? 4018);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'public-api module listening');
}

main().catch((err: unknown) => {
  console.error('public-api startup failed:', err);
  process.exit(1);
});
