import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { request as undiciRequest } from 'undici';
import { redactBody, redactHeaders } from './redact.js';
import type { Recording, RecorderConfig } from './types.js';

const DEFAULT_CONFIG: RecorderConfig = {
  upstreamUrl: process.env.RECORDER_UPSTREAM ?? 'http://localhost:3001',
  outputDir: process.env.RECORDER_OUTPUT ?? './recordings/raw',
  port: Number(process.env.RECORDER_PORT ?? 5050),
  redactHeaders: ['authorization', 'cookie', 'set-cookie', 'x-api-key'],
  redactBodyFields: ['password', 'otp_code', 'api_token', 'token', 'secret'],
};

export async function createRecorder(config: RecorderConfig = DEFAULT_CONFIG) {
  await mkdir(config.outputDir, { recursive: true });
  const app = Fastify({ logger: false, bodyLimit: 50 * 1024 * 1024 });

  app.addContentTypeParser('*', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.all('/*', async (req: FastifyRequest, reply: FastifyReply) => {
    const start = performance.now();
    const upstreamPath = req.url;
    const targetUrl = `${config.upstreamUrl}${upstreamPath}`;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers[key] = value;
      else if (Array.isArray(value)) headers[key] = value.join(', ');
    }
    delete headers['host'];
    delete headers['content-length'];

    const body = (req.body as Buffer | undefined) ?? null;
    const upstream = await undiciRequest(targetUrl, {
      method: req.method as 'GET',
      headers,
      body,
    });

    const respBuf = Buffer.from(await upstream.body.arrayBuffer());
    const respHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(upstream.headers)) {
      if (typeof value === 'string') respHeaders[key] = value;
      else if (Array.isArray(value)) respHeaders[key] = value.join(', ');
    }
    const durationMs = Math.round(performance.now() - start);

    const recording: Recording = {
      id: randomUUID(),
      recordedAt: new Date().toISOString(),
      request: {
        method: req.method,
        path: upstreamPath.split('?')[0] ?? upstreamPath,
        query: req.query as Record<string, string>,
        headers: redactHeaders(headers, config.redactHeaders),
        body: parseJsonSafe(req.body as Buffer | undefined, config.redactBodyFields),
      },
      response: {
        status: upstream.statusCode,
        headers: redactHeaders(respHeaders, config.redactHeaders),
        body: parseJsonSafe(respBuf, config.redactBodyFields),
        durationMs,
      },
    };

    const file = join(config.outputDir, `${recording.id}.json`);
    await writeFile(file, JSON.stringify(recording, null, 2));

    reply.code(upstream.statusCode);
    for (const [key, value] of Object.entries(respHeaders)) {
      if (key === 'content-encoding' || key === 'transfer-encoding') continue;
      reply.header(key, value);
    }
    return respBuf;
  });

  return {
    start: async () => {
      await app.listen({ port: config.port, host: '0.0.0.0' });
      console.log(`[recorder] listening :${config.port} → ${config.upstreamUrl}`);
      console.log(`[recorder] writing → ${config.outputDir}`);
    },
    stop: () => app.close(),
  };
}

function parseJsonSafe(buf: Buffer | undefined, redactFields: string[]): unknown {
  if (!buf || buf.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(buf.toString('utf8'));
    return redactBody(parsed, redactFields);
  } catch {
    return buf.toString('utf8').slice(0, 500);
  }
}

// Entrypoint detection: tsx runs us as the main module. Compare normalized paths.
function isMain(): boolean {
  const arg = process.argv[1];
  if (!arg) return false;
  const urlPath = decodeURIComponent(new URL(import.meta.url).pathname.replace(/^\//, ''));
  const argNorm = arg.replace(/\\/g, '/');
  const urlNorm = urlPath.replace(/\\/g, '/');
  return urlNorm.toLowerCase() === argNorm.toLowerCase();
}

if (isMain()) {
  const r = await createRecorder();
  await r.start();
}
