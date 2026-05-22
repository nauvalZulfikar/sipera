import { describe, expect, it } from 'vitest';
import { MetricsRegistry } from './metrics.js';

describe('MetricsRegistry', () => {
  it('counter increments + renders Prometheus format', () => {
    const r = new MetricsRegistry();
    const c = r.counter('http_requests_total', 'total reqs');
    c.inc({ service: 'identity', status: '200' });
    c.inc({ service: 'identity', status: '200' });
    c.inc({ service: 'identity', status: '500' });
    const text = r.render();
    expect(text).toContain('# TYPE http_requests_total counter');
    expect(text).toContain('http_requests_total{service="identity",status="200"} 2');
    expect(text).toContain('http_requests_total{service="identity",status="500"} 1');
  });

  it('histogram observes + renders buckets', () => {
    const r = new MetricsRegistry();
    const h = r.histogram('lat_ms', 'latency', [10, 100, 1000]);
    h.observe(5);
    h.observe(50);
    h.observe(500);
    h.observe(5000);
    const text = r.render();
    expect(text).toContain('lat_ms_count 4');
    expect(text).toContain('lat_ms_sum 5555');
    expect(text).toContain('lat_ms_bucket{le="+Inf"} 4');
  });

  it('labels escape special chars', () => {
    const r = new MetricsRegistry();
    const c = r.counter('x', 'h');
    c.inc({ path: 'with "quote"' });
    expect(r.render()).toContain('with \\"quote\\"');
  });
});
