import type {
  NotificationChannel,
  NotificationPayload,
  DeliveryResult,
} from '../channels/types.js';

export interface QueueJob {
  id: string;
  channel: NotificationChannel['name'];
  payload: NotificationPayload;
  attempts: number;
  enqueuedAt: number;
}

/**
 * Simple in-memory queue dengan retry. Production swap dengan BullMQ (Redis-backed).
 * Interface dibikin mirip BullMQ supaya migrasi nanti gampang.
 */
export class NotificationQueue {
  private jobs: QueueJob[] = [];
  private channels = new Map<NotificationChannel['name'], NotificationChannel>();
  private results: { job: QueueJob; result: DeliveryResult }[] = [];
  private processing = false;
  private maxAttempts = 3;

  registerChannel(ch: NotificationChannel): void {
    this.channels.set(ch.name, ch);
  }

  enqueue(channel: NotificationChannel['name'], payload: NotificationPayload): string {
    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.jobs.push({ id, channel, payload, attempts: 0, enqueuedAt: Date.now() });
    void this.process();
    return id;
  }

  /** Drain queue — return saat semua job selesai. */
  async drain(): Promise<void> {
    while (this.jobs.length > 0 || this.processing) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  getResults(): readonly { job: QueueJob; result: DeliveryResult }[] {
    return this.results;
  }

  private async process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      while (this.jobs.length > 0) {
        const job = this.jobs.shift();
        if (!job) break;
        const ch = this.channels.get(job.channel);
        if (!ch) {
          this.results.push({
            job,
            result: { ok: false, error: `unknown channel: ${job.channel}` },
          });
          continue;
        }
        job.attempts++;
        try {
          const result = await ch.send(job.payload);
          if (result.ok) {
            this.results.push({ job, result });
          } else if (job.attempts < this.maxAttempts) {
            this.jobs.push(job);
          } else {
            this.results.push({ job, result });
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          if (job.attempts < this.maxAttempts) {
            this.jobs.push(job);
          } else {
            this.results.push({ job, result: { ok: false, error } });
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
