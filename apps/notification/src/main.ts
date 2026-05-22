import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { NotificationQueue } from './queue/queue.js';
import {
  ConsoleSmsChannel,
  ConsoleEmailChannel,
  WebSocketChannel,
} from './channels/implementations.js';
import { NotificationService } from './notification.service.js';
import { availableTemplates } from './templates/templates.js';
import { NotificationWsServer } from './websocket/ws-server.js';

const dispatchSchema = z.object({
  event: z.string().min(1),
  to: z.string().min(1),
  channels: z.array(z.enum(['sms', 'email', 'websocket', 'inapp'])).min(1),
  variables: z.record(z.string()).optional(),
  locale: z.enum(['id', 'en']).optional(),
});

async function main() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: true });

  const queue = new NotificationQueue();
  const wsServer = new NotificationWsServer();
  queue.registerChannel(new ConsoleSmsChannel());
  queue.registerChannel(new ConsoleEmailChannel());
  queue.registerChannel(
    new WebSocketChannel((userId, event, data) => {
      wsServer.pushTo(userId, { event, data });
    }),
  );

  const svc = new NotificationService(queue);

  app.get('/_health', () => ({ status: 'ok', service: 'notification' }));

  app.get('/templates', () => ({ data: availableTemplates() }));

  app.get('/ws/stats', () => wsServer.stats());

  app.post('/dispatch', async (req, reply) => {
    const parsed = dispatchSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'validation_error', issues: parsed.error.issues };
    }
    const result = svc.dispatch({
      event: parsed.data.event,
      to: parsed.data.to,
      channels: parsed.data.channels,
      ...(parsed.data.variables ? { variables: parsed.data.variables } : {}),
      ...(parsed.data.locale ? { locale: parsed.data.locale } : {}),
    });
    reply.code(202);
    return result;
  });

  app.get('/results', () => ({
    results: queue.getResults().map((r) => ({
      jobId: r.job.id,
      channel: r.job.channel,
      to: r.job.payload.to,
      ok: r.result.ok,
      providerId: r.result.providerId,
      error: r.result.error,
      attempts: r.job.attempts,
    })),
  }));

  const port = Number(process.env.PORT ?? 4007);
  await app.listen({ port, host: '0.0.0.0' });

  // Attach WebSocket to underlying HTTP server (Fastify exposes `server`).
  wsServer.attach(app.server, '/ws/notifikasi');

  app.log.info({ port, ws: '/ws/notifikasi' }, 'notification module listening');
}

main().catch((err: unknown) => {
  console.error('notification startup failed:', err);
  process.exit(1);
});
