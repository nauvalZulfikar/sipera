import type { FastifyInstance } from 'fastify';
import { getMetrics } from './metrics.js';

/**
 * Pasang metrics instrumentation di Fastify:
 * - Counter `http_requests_total{method,route,status}`
 * - Histogram `http_request_duration_ms{method,route,status}`
 * - Endpoint GET /metrics (Prometheus format)
 */
export function registerObservability(app: FastifyInstance, serviceName: string): void {
  const metrics = getMetrics();
  const reqCounter = metrics.counter('http_requests_total', 'Total HTTP requests');
  const durationHist = metrics.histogram(
    'http_request_duration_ms',
    'HTTP request duration ms',
    [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  );

  app.addHook('onResponse', (req, reply, done) => {
    const route = req.routeOptions?.url ?? req.url.split('?')[0] ?? 'unknown';
    const labels = {
      service: serviceName,
      method: req.method,
      route,
      status: String(reply.statusCode),
    };
    reqCounter.inc(labels);
    durationHist.observe(reply.elapsedTime, labels);
    done();
  });

  app.get('/metrics', async (_req, reply) => {
    reply.header('content-type', 'text/plain; version=0.0.4');
    return metrics.render();
  });
}
