/**
 * Lightweight metrics registry — Prometheus text format.
 * Setiap service register Counter/Histogram lokal, expose lewat /metrics endpoint.
 *
 * Production scale-up: ganti dengan OpenTelemetry SDK + push ke Prometheus/Tempo.
 * Saat itu interface ini tetap, cuma implementasi yang swap.
 */

type LabelMap = Record<string, string>;

interface CounterState {
  name: string;
  help: string;
  values: Map<string, number>;
}

interface HistogramState {
  name: string;
  help: string;
  buckets: number[];
  /** key = label hash; value = { bucket counts, sum, count } */
  observations: Map<string, { bucketCounts: number[]; sum: number; count: number }>;
}

export class MetricsRegistry {
  private counters = new Map<string, CounterState>();
  private histograms = new Map<string, HistogramState>();

  counter(name: string, help: string): Counter {
    let s = this.counters.get(name);
    if (!s) {
      s = { name, help, values: new Map() };
      this.counters.set(name, s);
    }
    return new Counter(s);
  }

  histogram(
    name: string,
    help: string,
    buckets: number[] = [5, 10, 50, 100, 500, 1000, 5000],
  ): Histogram {
    let s = this.histograms.get(name);
    if (!s) {
      s = { name, help, buckets, observations: new Map() };
      this.histograms.set(name, s);
    }
    return new Histogram(s);
  }

  /** Render Prometheus exposition format. */
  render(): string {
    const lines: string[] = [];
    for (const c of this.counters.values()) {
      lines.push(`# HELP ${c.name} ${c.help}`);
      lines.push(`# TYPE ${c.name} counter`);
      for (const [labelKey, value] of c.values) {
        lines.push(`${c.name}${labelKey} ${value}`);
      }
    }
    for (const h of this.histograms.values()) {
      lines.push(`# HELP ${h.name} ${h.help}`);
      lines.push(`# TYPE ${h.name} histogram`);
      for (const [labelKey, obs] of h.observations) {
        let cumulative = 0;
        for (let i = 0; i < h.buckets.length; i++) {
          cumulative += obs.bucketCounts[i] ?? 0;
          const le = h.buckets[i];
          const inner = labelKey ? labelKey.replace(/\}$/, `,le="${le}"}`) : `{le="${le}"}`;
          lines.push(`${h.name}_bucket${inner} ${cumulative}`);
        }
        const infInner = labelKey ? labelKey.replace(/\}$/, `,le="+Inf"}`) : `{le="+Inf"}`;
        lines.push(`${h.name}_bucket${infInner} ${obs.count}`);
        lines.push(`${h.name}_sum${labelKey} ${obs.sum}`);
        lines.push(`${h.name}_count${labelKey} ${obs.count}`);
      }
    }
    return lines.join('\n') + '\n';
  }
}

export class Counter {
  constructor(private readonly state: CounterState) {}

  inc(labels: LabelMap = {}, value = 1): void {
    const key = renderLabels(labels);
    const cur = this.state.values.get(key) ?? 0;
    this.state.values.set(key, cur + value);
  }
}

export class Histogram {
  constructor(private readonly state: HistogramState) {}

  observe(value: number, labels: LabelMap = {}): void {
    const key = renderLabels(labels);
    let obs = this.state.observations.get(key);
    if (!obs) {
      obs = {
        bucketCounts: new Array<number>(this.state.buckets.length).fill(0),
        sum: 0,
        count: 0,
      };
      this.state.observations.set(key, obs);
    }
    obs.sum += value;
    obs.count++;
    for (let i = 0; i < this.state.buckets.length; i++) {
      const bucket = this.state.buckets[i];
      if (bucket !== undefined && value <= bucket) {
        obs.bucketCounts[i] = (obs.bucketCounts[i] ?? 0) + 1;
        return;
      }
    }
  }
}

function renderLabels(labels: LabelMap): string {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  const pairs = keys.map((k) => `${k}="${escape(labels[k] ?? '')}"`);
  return `{${pairs.join(',')}}`;
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/** Singleton registry per-process. */
const _registry = new MetricsRegistry();
export function getMetrics(): MetricsRegistry {
  return _registry;
}
