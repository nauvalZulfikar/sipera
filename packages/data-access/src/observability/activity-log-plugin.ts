import type { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Activity log middleware. Auto-capture setiap mutating request (POST/PUT/PATCH/DELETE)
 * dan push ke admin /audit service async. Tidak nge-block response.
 *
 * Header X-User dipakai sebagai actor (kalau ada). Default: 'anonymous'.
 */

export interface ActivityLogConfig {
  /** Service name (mis. 'permohonan', 'identity'). */
  serviceName: string;
  /** URL admin /audit endpoint. Default: env ADMIN_URL atau http://localhost:4013. */
  adminUrl?: string;
  /** Skip path patterns (regex). Default: /_health, /_metrics. */
  skipPatterns?: RegExp[];
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function registerActivityLog(app: FastifyInstance, config: ActivityLogConfig): void {
  const adminUrl = config.adminUrl ?? process.env.ADMIN_URL ?? 'http://localhost:4013';
  const skipPatterns = config.skipPatterns ?? [/^\/_/, /\/metrics$/];

  app.addHook('onResponse', (req, reply, done) => {
    void postAudit(req, reply.statusCode, adminUrl, config.serviceName, skipPatterns).catch(
      (err: unknown) => app.log.warn({ err }, 'activity log push failed'),
    );
    done();
  });
}

async function postAudit(
  req: FastifyRequest,
  status: number,
  adminUrl: string,
  serviceName: string,
  skipPatterns: RegExp[],
): Promise<void> {
  if (!MUTATING_METHODS.has(req.method)) return;
  const path = req.url.split('?')[0] ?? '/';
  if (skipPatterns.some((p) => p.test(path))) return;
  if (status >= 400) return; // only log successful mutations

  const actor = String(req.headers['x-user'] ?? 'anonymous');
  const ip = req.headers['x-forwarded-for'] ?? req.ip;
  const resource = `${serviceName}${path}`;
  const action = `${serviceName}.${req.method.toLowerCase()}`;

  try {
    await fetch(`${adminUrl}/audit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actor,
        action,
        resource,
        ip: typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : undefined,
        meta: { status, method: req.method },
      }),
      signal: AbortSignal.timeout(2000), // jangan block response > 2s
    });
  } catch {
    // silent fail — observability shouldn't break app
  }
}
