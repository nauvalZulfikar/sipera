import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as undiciRequest } from 'undici';
import { loadConfig, type GatewayConfig } from './config.js';
import { matchRoute, resolveUpstream } from './routing.js';
import { isAuthorized } from './auth.js';
import { clientIp, createRateLimiter, parseWindowMs, type RateLimiter } from './rate-limit.js';

interface GatewayHandle {
  port: number;
  close: () => Promise<void>;
}

export async function startGateway(): Promise<GatewayHandle> {
  const config = loadConfig();
  const limiter = createRateLimiter({
    max: config.rateLimit.max,
    windowMs: parseWindowMs(config.rateLimit.timeWindow),
  });
  const server = createServer((req, res) => {
    void handleRequest(req, res, config, limiter).catch((err: unknown) => {
      console.error('[gateway] handler error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'gateway_error', message: String(err) }));
      } else {
        res.end();
      }
    });
  });

  await new Promise<void>((resolve) =>
    server.listen(config.port, '0.0.0.0', () => {
      resolve();
    }),
  );

  console.log(`[gateway] listening :${config.port}, ${config.routes.length} routes mounted`);

  return {
    port: config.port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: GatewayConfig,
  limiter: RateLimiter,
): Promise<void> {
  const url = req.url ?? '/';
  const path = url.split('?')[0] ?? '/';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    setCors(res, req, config);
    res.end();
    return;
  }
  setCors(res, req, config);

  if (path === '/_health') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', service: 'api-gateway' }));
    return;
  }
  if (path === '/_routes') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        routes: config.routes.map((r) => ({
          pattern: r.pattern,
          flag: process.env[r.flagEnv] ?? 'legacy',
          upstream: resolveUpstream(config, r, process.env).name,
        })),
      }),
    );
    return;
  }

  const rule = matchRoute(config.routes, path);
  if (!rule) {
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'no_route', path }));
    return;
  }

  // Rate-limit per IP (fixed window). Cegah brute-force login & abuse.
  const limit = limiter.check(clientIp(req));
  if (!limit.allowed) {
    res.statusCode = 429;
    res.setHeader('content-type', 'application/json');
    res.setHeader('retry-after', String(limit.retryAfterSeconds));
    res.end(JSON.stringify({ error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds }));
    return;
  }

  // Gerbang auth: route ber-`requireAuth` wajib bawa Bearer JWT valid.
  if (rule.requireAuth && !isAuthorized(req.headers['authorization'], config.jwtSecret)) {
    res.statusCode = 401;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  const upstream = resolveUpstream(config, rule, process.env);
  // Buang prefix bila route minta (mis. `/rdtr/intersect` → `/intersect`).
  const forwardUrl =
    rule.stripPrefix && url.startsWith(rule.stripPrefix)
      ? url.slice(rule.stripPrefix.length) || '/'
      : url;
  const targetUrl = `${upstream.url}${forwardUrl}`;
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers[key] = value;
    else if (Array.isArray(value)) headers[key] = value.join(', ');
  }
  delete headers['host'];
  delete headers['content-length'];
  headers['x-gateway-upstream'] = upstream.name;

  const method = (req.method ?? 'GET') as 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';

  // Read incoming body into Buffer (undici v7 prefers concrete bytes over raw IncomingMessage)
  let bodyBuf: Buffer | null = null;
  if (hasBody) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    bodyBuf = chunks.length > 0 ? Buffer.concat(chunks) : null;
  }

  const upstreamRes = await undiciRequest(targetUrl, {
    method,
    headers,
    body: bodyBuf,
  });

  res.statusCode = upstreamRes.statusCode;
  for (const [key, value] of Object.entries(upstreamRes.headers)) {
    if (key === 'content-encoding' || key === 'transfer-encoding' || key === 'content-length') {
      continue;
    }
    if (typeof value === 'string') res.setHeader(key, value);
    else if (Array.isArray(value)) res.setHeader(key, value);
  }
  const buf = Buffer.from(await upstreamRes.body.arrayBuffer());
  res.end(buf);
}

function setCors(res: ServerResponse, req: IncomingMessage, config: GatewayConfig): void {
  const origin = req.headers.origin;
  if (origin && config.cors.origin.includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'origin');
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
    res.setHeader('access-control-allow-headers', 'authorization,content-type,x-trace-id');
  }
}
